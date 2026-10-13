#!/usr/bin/env node
/**
 * luxe_auftrag_runner.mjs — führt Browser-Aufträge aus, die als JSON im Repo liegen.
 *
 * Läuft auf dem Hetzner-Server (46.225.75.125), aufgerufen vom systemd-Timer
 * luxe-agent.timer. Holt den Auftragsbranch, arbeitet auftraege/offen/*.json ab,
 * legt Ergebnisse nach auftraege/erledigt/ + auftraege/ergebnis/ und pusht zurück.
 * Seit 13.10.2026 laufen alle neuen Bilder durch die BILDER-WEICHE (unten): Bilder aus
 * angemeldeten Diensten bleiben auf dem Server, andere kommen als JPEG ≤ 200 KB ins Repo.
 *
 * ⛔ SICHERHEIT: Es wird NIE Shell- oder JS-Code aus der Auftragsdatei ausgeführt.
 *    Erlaubt sind ausschliesslich die Arten in ARTEN, und ein "skript"-Auftrag darf nur
 *    eine Datei aus automation/browser/ starten, die im Repo steht (Basename, kein Pfad).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ist_anmeldeseite, hat_ziel_erreicht, ist_wandtext, ist_fehlerseite } from './anmelde_erkennung.mjs';
import { fuehre_wartung_aus, ist_erlaubt, AKTIONEN } from './wartung.mjs';

const REPO    = process.env.LUXE_REPO    || '/opt/abannews';
const PROFIL  = process.env.LUXE_PROFIL  || '/var/lib/luxe-agent/chrome-profil';
const OFFEN   = path.join(REPO, 'auftraege/offen');
const FERTIG  = path.join(REPO, 'auftraege/erledigt');
const ERGEBNIS= path.join(REPO, 'auftraege/ergebnis');

const ARTEN = new Set(['screenshot', 'seite_text', 'skript', 'wartung']);

function sicherer_name(s) {               // gegen ../../etc/passwd und Leerzeichen-Tricks
  return typeof s === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(s) && !s.startsWith('.');
}

/**
 * Prueft einen Auftrag, BEVOR er geclaimt wird.
 *
 * Gefunden im Testlauf 17.09.: ein Auftrag mit unbekannter Art wurde erst
 * geclaimt (Quittung geschrieben, committet, gepusht) und dann verworfen. Das
 * verschwendet nicht nur einen Commit — es verschiebt die Fehlermeldung hinter
 * einen Schritt, der selbst scheitern kann, und dann sieht niemand den echten
 * Grund. Erst pruefen, dann festhalten, dann handeln.
 */
function pruefe(auftrag) {
  const art = auftrag.typ;
  if (!ARTEN.has(art)) throw new Error(`unbekannte Auftragsart: ${art}`);
  if (art === 'screenshot' || art === 'seite_text') {
    if (!/^https:\/\//.test(auftrag.url || '')) throw new Error('url fehlt oder ist nicht https');
    return;
  }
  if (art === 'wartung') {
    // Nur ein NAME aus der festen Liste — nie ein Befehl, nie ein Argument.
    // Siehe server/wartung.mjs, Kopfkommentar: das Repo ist oeffentlich.
    if (!ist_erlaubt(auftrag.aktion))
      throw new Error(`Wartungsaktion nicht erlaubt: ${auftrag.aktion} — erlaubt: `
                      + Object.keys(AKTIONEN).join(', '));
    return;
  }
  if (!sicherer_name(auftrag.skript) || !auftrag.skript.endsWith('.mjs'))
    throw new Error('skript muss ein Basename wie "merchant_pruefen.mjs" sein');
  const pfad = path.join(REPO, 'automation/browser', auftrag.skript);
  if (!fs.existsSync(pfad)) throw new Error(`skript nicht im Repo: ${pfad}`);
}

async function fuehre_aus(auftrag, ctx) {
  const art = auftrag.typ;

  if (art === 'screenshot' || art === 'seite_text') {
    const seite = await ctx.newPage();
    try {
      // 77 % unserer Besucherinnen sind auf dem Handy — deshalb muss eine
      // Handy-Breite moeglich sein. (Das ist die Breite, keine Geraete-Emulation:
      // die Kennung bleibt Desktop. Horizon entscheidet ueber CSS, das genuegt.)
      if (auftrag.mobil) await seite.setViewportSize({ width: 390, height: 844 });
      // ⚠️ 17.09.2026, erster echter Lauf auf dem Server: mit `networkidle` lief der
      // Startseiten-Screenshot in die Zeitgrenze. Ein Shop mit Tracking- und
      // Chat-Skripten wird NIE netzwerkstill — `networkidle` wartet damit auf einen
      // Zustand, der nicht eintritt. `load` plus kurzes Nachsetzen genügt für ein
      // Bild und für den Text.
      const antwort = await seite.goto(auftrag.url, { waitUntil: 'load', timeout: 60000 });
      await seite.waitForTimeout(2500);
      const ziel = seite.url();
      // ⚠️ VIERTE Schicht (18.09.2026, aus dem CJ-Fehlbefund in Auftrag 32): keine der
      // drei Fragen oben liest den HTTP-Status. Eine 404 hat keine Anmeldemaske, liegt
      // auf demselben Gastgeber und ist keine Bot-Wand — sie kam hier also als «ok»
      // durch, und ein Screenshot einer Fehlerseite sieht in der Quittung aus wie ein
      // Screenshot der Seite. Manche Anwendungen (CJ) antworten dabei sogar mit 200 und
      // leiten nur die ADRESSE auf /404; deshalb pruefen wir beides.
      const kaputt = ist_fehlerseite(antwort ? antwort.status() : null, ziel);
      if (kaputt) {
        const e = new Error(`${kaputt} — es gibt dort keine Seite, ein Bild davon beweist nichts`);
        e.umgeleitet = true;
        throw e;
      }
      if (ist_anmeldeseite(ziel)) {
        const e = new Error(`nicht angemeldet — umgeleitet auf ${ziel}`);
        e.nichtAngemeldet = true;
        throw e;
      }
      // ⚠️ 17.09.2026, zweite Lehre aus den ersten echten Laeufen: die Frage
      // «ist das eine Anmeldemaske?» genuegt NICHT. Auftrag 03 landete auf einer
      // Bot-Pruefseite, Auftrag 06 auf Googles Einwilligungswand mit «Sign in» —
      // beide sind keine Anmeldemasken, beide bekamen «ok», und beide Quittungen
      // sahen aus wie Erfolg. Deshalb hier eine zweite, unabhaengige Frage:
      // BIN ICH ANGEKOMMEN? Wechselt der Gastgeber oder steht eine Zwischenseite
      // im Weg, ist das Ergebnis wertlos und muss als solches gemeldet werden.
      if (!hat_ziel_erreicht(auftrag.url, ziel)) {
        const e = new Error(`Ziel nicht erreicht — aus ${auftrag.url} wurde ${ziel}`);
        e.umgeleitet = true;
        throw e;
      }
      // ⚠️ Dritte Schicht (17.09., Auftrag 09): Cloudflare behaelt die URL. Auftrag 09
      // war die Gegenprobe zu 03 — mit Ziel-Pruefung — und meldete wieder «ok», weil
      // die Adresse stimmte. Im Bild stand nur «Deine Verbindung muss verifiziert
      // werden». Eine Adresspruefung kann das nie sehen; deshalb wird hier der TEXT
      // gefragt, und zwar fuer Bild-Auftraege genauso wie fuer Text-Auftraege.
      const seitentext = await seite.evaluate(() => document.body.innerText.slice(0, 20000))
                                    .catch(() => '');
      if (ist_wandtext(seitentext)) {
        const e = new Error(`Bot-Wand statt Inhalt auf ${ziel}: ${seitentext.trim().slice(0, 120)}`);
        e.umgeleitet = true;
        throw e;
      }
      const status = antwort ? antwort.status() : null;
      if (art === 'seite_text') return { ziel, status, text: seitentext };
      const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
      await seite.screenshot({ path: datei, fullPage: !!auftrag.ganze_seite });
      return { ziel, status, mobil: !!auftrag.mobil, datei: path.relative(REPO, datei) };
    } finally { await seite.close(); }
  }

  // art === 'wartung': feste Liste in server/wartung.mjs, kein Browser noetig.
  if (art === 'wartung') return fuehre_wartung_aus(auftrag.aktion);

  // art === 'skript': nur ein Modul aus automation/browser/, das im Repo steht (pruefe())
  const pfad = path.join(REPO, 'automation/browser', auftrag.skript);
  const modul = await import(`file://${pfad}`);
  if (typeof modul.default !== 'function') throw new Error('skript exportiert kein default()');
  return await modul.default({ ctx, auftrag, REPO, ERGEBNIS });
}

// ── BILDER-WEICHE (Anfang) ── server/bilder_weiche.test.mjs schneidet GENAU diesen Block heraus.
/**
 * BILDER-WEICHE — 13.10.2026, Plan «Hetzner auf Maximum», Schritt 11.
 *
 * ⚠️ GEMESSEN 13.10.2026: In auftraege/ergebnis/ liegen 366 PNG (81 MB). 280 davon
 * kommen aus angemeldeten Sitzungen: Pinterest (185 Pin-Bilder, dazu Boards und Profil),
 * CJ-Konsole, Shopify-Admin, Merchant Center und TikTok. Seit 06.10. kamen allein 99
 * Pinterest-Pin-Bilder dazu. Das Repo ist ÖFFENTLICH (gh api: visibility public), und der
 * Starter /usr/local/bin/luxe-auftrag committet ALLES, was unter auftraege/ liegt. Ein
 * Bild aus einer angemeldeten Sitzung zeigt, was nur der Betreiber sehen soll: Kontoname,
 * Menüs, im Admin vielleicht Kundendaten. Einmal gepusht, bleibt es im Verlauf.
 *
 * Die Regel gilt an EINER Stelle und für jede Auftragsart, also auch für Skripte, die
 * ihre Bilder selbst nach ERGEBNIS schreiben (das tun 18 von 25 in automation/browser/):
 *   - Bild aus einem angemeldeten Dienst → bleibt auf dem Server (BILDER_SERVER). Ins
 *     Repo kommt nur die Text-Quittung, mit dem Server-Pfad statt des Bildes.
 *   - anderes Bild → als JPEG ≤ 200 KB ins Repo (Einzelbilder waren bis 3,7 MB gross).
 *   - ÖFFENTLICH ist nur, was unten ausdrücklich steht; alles andere gilt als angemeldet
 *     (fail-closed). Der Browser trägt EIN Profil mit allen Anmeldungen, also ist jede
 *     Seite eines dieser Dienste eine angemeldete Seite. Ein neues Skript für einen neuen
 *     Dienst ist damit ohne weiteres Zutun geschützt.
 *   - Lässt sich ein öffentliches Bild nicht unter 200 KB bringen, bleibt es ebenfalls
 *     auf dem Server. Lieber ein Bild weniger im Repo als ein zu grosses.
 *
 * ⛔ Bestehende Dateien fasst die Weiche NICHT an. Sie sieht nur Bilder, die während
 * DIESES Auftrags neu entstanden sind (Vorher-Liste), und reste_sichern() nur Bilder,
 * die git noch nicht kennt. Videos (mp4) und JSON-Ergebnisse gehen unverändert ins Repo,
 * denn der Reel-Motor braucht die mp4 aus cj_quellvideo_holen.
 */
const BILDER_SERVER  = process.env.LUXE_BILDER_SERVER || '/var/lib/luxe-agent/ergebnis-angemeldet';
const BILD_MAX_BYTES = 200 * 1024;
const IST_BILD       = /\.(png|jpe?g|webp|gif|bmp)$/i;
// Öffentlich ist nur unser Laden von aussen. Pfade, die in ein Konto führen, sind es auch dort nicht.
const OEFFENTLICHE_HOSTS  = new Set(['luxestyle.ch', 'www.luxestyle.ch']);
const KONTO_PFAD          = /^\/(admin|account|accounts|login|checkouts?)(\/|$)/i;
// Nur diese Skripte besuchen ausschliesslich öffentliche Seiten (storefront_wahrheit liest
// luxestyle.ch von der echten Besucher-IP). Ein neues Skript gilt zuerst als angemeldet.
const OEFFENTLICHE_SKRIPTE = new Set(['storefront_wahrheit.mjs']);
// Bilder, die die Weiche in DIESEM Lauf fürs Repo freigegeben hat. Alles andere, was git
// noch nicht kennt, räumt reste_sichern() auf den Server.
const FREIGEGEBEN = new Set();

function ist_oeffentlich(auftrag) {
  if (!auftrag || typeof auftrag !== 'object') return false;
  if (auftrag.typ === 'skript') return OEFFENTLICHE_SKRIPTE.has(auftrag.skript);
  if (auftrag.typ === 'screenshot' || auftrag.typ === 'seite_text') {
    let u;
    try { u = new URL(auftrag.url); } catch { return false; }
    return u.protocol === 'https:' && OEFFENTLICHE_HOSTS.has(u.hostname.toLowerCase())
        && !KONTO_PFAD.test(u.pathname);
  }
  return false;                      // wartung und alles Unbekannte: fail-closed
}

function bilder_jetzt() {
  try { return new Set(fs.readdirSync(ERGEBNIS).filter(f => IST_BILD.test(f))); }
  catch { return new Set(); }
}

/** Verschiebt ein Bild nach BILDER_SERVER (nur root lesbar) und liefert den neuen Pfad. */
function auf_server_legen(datei) {
  fs.mkdirSync(BILDER_SERVER, { recursive: true, mode: 0o700 });
  let ziel = path.join(BILDER_SERVER, path.basename(datei));
  // Nie ein älteres Server-Bild überschreiben (gleiche Auftrags-ID, zweiter Lauf).
  if (fs.existsSync(ziel)) ziel = path.join(BILDER_SERVER, `${Date.now()}-${path.basename(datei)}`);
  try { fs.renameSync(datei, ziel); }
  catch (e) {
    if (e.code !== 'EXDEV') throw e;   // anderes Dateisystem: kopieren, dann entfernen
    fs.copyFileSync(datei, ziel);
    fs.unlinkSync(datei);
  }
  return ziel;
}

/** Freier JPEG-Name neben dem Original, ohne ein vorhandenes Bild zu überschreiben. */
function jpeg_name(name) {
  const stamm = name.replace(IST_BILD, '');
  for (const n of [`${stamm}.jpg`, `${stamm}-klein.jpg`, `${stamm}-klein2.jpg`]) {
    if (n === name || !fs.existsSync(path.join(ERGEBNIS, n))) return n;
  }
  return null;
}

/**
 * Verkleinert ein Bild im Browser zu JPEG ≤ maxBytes (Canvas). Bewusst ohne neue Pakete:
 * Chromium ist auf dem Server ohnehin da, sharp oder ImageMagick sind es nicht sicher.
 * Liefert einen Buffer oder null.
 */
async function verkleinere_jpeg(ctx, datei, maxBytes) {
  const roh = fs.readFileSync(datei);
  if (roh.length > 40 * 1024 * 1024) return null;
  const art = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp', gif: 'gif', bmp: 'bmp' }[
    path.extname(datei).slice(1).toLowerCase()] || 'png';
  const seite = await ctx.newPage();
  try {
    const url = await seite.evaluate(async ({ src, max }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w0 = img.naturalWidth, h0 = img.naturalHeight;
      let s = Math.min(1, 16000 / Math.max(w0, h0, 1));   // Canvas-Grenze von Chromium
      for (let runde = 0; runde < 10; runde++) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w0 * s));
        c.height = Math.max(1, Math.round(h0 * s));
        const g = c.getContext('2d');
        g.fillStyle = '#fff';                              // JPEG kennt keine Transparenz
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.82, 0.7, 0.55, 0.4]) {
          const u = c.toDataURL('image/jpeg', q);
          if (Math.floor((u.length - u.indexOf(',') - 1) * 3 / 4) <= max) return u;
        }
        s *= 0.75;
      }
      return null;
    }, { src: `data:image/${art};base64,${roh.toString('base64')}`, max: maxBytes });
    return url ? Buffer.from(url.slice(url.indexOf(',') + 1), 'base64') : null;
  } finally { await seite.close().catch(() => {}); }
}

/**
 * Schickt alle Bilder, die seit `vorher` in ERGEBNIS entstanden sind, durch die Weiche
 * und schreibt die Verweise in der Quittung um (alter Repo-Pfad → JPEG oder «server:…»).
 * `verkleinere(datei, maxBytes)` liefert einen JPEG-Buffer oder null.
 */
async function bilder_weichen(auftrag, vorher, quittung, verkleinere) {
  const neu = [...bilder_jetzt()].filter(f => !vorher.has(f)).sort();
  if (!neu.length) return quittung;
  const oeffentlich = ist_oeffentlich(auftrag);
  const ersatz = [];                                  // [alter Repo-Pfad, neuer Verweis]
  const bericht = { oeffentlich, im_repo: [], auf_server: [] };
  for (const name of neu) {
    const datei = path.join(ERGEBNIS, name);
    const alt = path.relative(REPO, datei);
    let bytes = 0;
    try { bytes = fs.statSync(datei).size; } catch { continue; }   // schon weg
    try {
      if (oeffentlich) {
        if (/\.jpe?g$/i.test(name) && bytes <= BILD_MAX_BYTES) {
          FREIGEGEBEN.add(name);
          bericht.im_repo.push({ datei: alt, bytes });
          continue;
        }
        let jpeg = null, grund = 'nicht unter 200 KB zu bringen';
        try { jpeg = await verkleinere(datei, BILD_MAX_BYTES); }
        catch (e) { grund = `Verkleinern fehlgeschlagen: ${String(e.message || e).slice(0, 80)}`; }
        const zielname = jpeg_name(name);
        if (zielname && Buffer.isBuffer(jpeg) && jpeg.length <= BILD_MAX_BYTES
            && jpeg[0] === 0xFF && jpeg[1] === 0xD8) {
          const ziel = path.join(ERGEBNIS, zielname);
          fs.writeFileSync(ziel, jpeg);
          if (ziel !== datei) fs.unlinkSync(datei);     // nur das NEUE Original dieses Auftrags
          FREIGEGEBEN.add(zielname);
          const neuRel = path.relative(REPO, ziel);
          bericht.im_repo.push({ datei: neuRel, bytes: jpeg.length, vorher_bytes: bytes });
          ersatz.push([alt, neuRel]);
          continue;
        }
        const ziel = auf_server_legen(datei);
        bericht.auf_server.push({ datei: ziel, bytes, grund });
        ersatz.push([alt, `server:${ziel}`]);
        continue;
      }
      const ziel = auf_server_legen(datei);
      bericht.auf_server.push({ datei: ziel, bytes });
      ersatz.push([alt, `server:${ziel}`]);
    } catch (e) {
      // Nichts freigeben, was nicht sauber durch die Weiche ging: reste_sichern() räumt
      // es nach diesem Auftrag auf den Server.
      bericht.fehler = `${name}: ${String(e.message || e).slice(0, 120)}`;
    }
  }
  // Die Text-Quittung zeigt auf das, was es wirklich gibt: erst absolute, dann relative Pfade.
  let text = JSON.stringify(quittung);
  const roh = s => JSON.stringify(s).slice(1, -1);
  for (const [a, b] of ersatz)
    for (const form of [path.join(REPO, a), a]) text = text.split(roh(form)).join(roh(b));
  const neue_quittung = JSON.parse(text);
  if (bericht.auf_server.length)
    bericht.hinweis = 'Bilder aus angemeldeten Diensten bleiben auf dem Server (Plan Hetzner '
                    + 'Schritt 11, 13.10.2026). Für den Inhalt als Text: Auftragsart seite_text.';
  neue_quittung.bilder_weiche = bericht;
  return neue_quittung;
}

/**
 * Letzte Sperre vor jedem Commit: Bilder in ERGEBNIS, die git noch nicht kennt und die die
 * Weiche nicht freigegeben hat, kommen auf den Server.
 *
 * Warum es das braucht: systemd beendet den Dienst nach TimeoutStartSec=900 auch mitten im
 * Auftrag (19./20.09.: zwei Storefront-Läufe blieben auf «laufend»). Dann liegen neue Bilder
 * unversioniert in ERGEBNIS, `git checkout -B` lässt sie liegen, und der Starter committet
 * sie beim nächsten Lauf mit `git add auftraege` an der Weiche vorbei, auch in einem Lauf
 * ohne Auftrag. Wem sie gehören, weiss dann niemand mehr, also fail-closed.
 * Bilder, die git schon kennt (die bestehenden 366), fasst sie nicht an.
 */
function reste_sichern() {
  let roh;
  try {
    roh = execFileSync('git', ['-C', REPO, 'ls-files', '--others', '--exclude-standard', '-z',
                               '--', path.relative(REPO, ERGEBNIS)],
                       { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch { return 0; }              // kein git oder kein Repo: lieber nichts anfassen
  let n = 0;
  for (const rel of roh.split('\0').filter(Boolean)) {
    const datei = path.join(REPO, rel);
    if (!IST_BILD.test(rel) || path.dirname(datei) !== ERGEBNIS) continue;
    if (FREIGEGEBEN.has(path.basename(rel))) continue;
    try { console.log(`· Bild ohne Freigabe auf den Server: ${rel} → ${auf_server_legen(datei)}`); n++; }
    catch (e) { console.log(`✗ ${rel} nicht verschoben: ${String(e.message || e).slice(0, 100)}`); }
  }
  return n;
}
// ── BILDER-WEICHE (Ende) ──

/**
 * WIEDERKEHRENDE AUFTRAEGE — der Agent legt sich selbst Arbeit an.
 *
 * ⚠️ Der Anlass, gemessen 18.09.2026: Der Agent wacht alle fuenf Minuten auf und hat
 * fast immer nichts zu tun (`grep wiederkehr|intervall|cron` ueber diese Datei -> 0
 * Treffer). Gleichzeitig ist er das EINZIGE ehrliche Fenster auf luxestyle.ch — unsere
 * Rechenzentrums-IP bekommt vom Shopify-Edge eine eigene, stundenalte Bot-Cache-Kopie
 * (19.08., zweimal an einem Tag belegt). Was er sieht, kann sonst niemand sehen.
 *
 * Und genau das hat es gekostet: Am 17.09. meldete der einzige Storefront-Lauf die
 * **Startseite als nicht erreichbar** (202 Zeichen, waehrend Kollektion und FAQ sauber
 * luden). Diese Messung steht seither allein da. **Eine Momentaufnahme ohne Wiederholung
 * beantwortet nicht, ob es ein Aussetzer war oder der Normalzustand.**
 *
 * ⚠️ DIE FALLE, gegen die das hier gebaut ist: Der Runner laeuft 288-mal am Tag. Eine
 * Faelligkeitspruefung, die sich irrt, legt 288 Auftraege an — dieselbe Klasse wie der
 * IG-Doppelpost (Regel 10). Deshalb entscheidet NICHT eine Uhrzeit, sondern die
 * ANWESENHEIT einer Datei mit Datum im Namen: `<id>-JJJJ-MM-TT.json`. Gesucht wird in
 * `offen/` UND in `erledigt/` — sonst legt der naechste Lauf im Fenster zwischen
 * Anlegen und Quittung ein zweites Mal an (TOCTOU, genau die Luecke vom 12.07.).
 */
const WIEDERKEHREND = path.join(REPO, 'auftraege/wiederkehrend');
function faellige_anlegen() {
  if (!fs.existsSync(WIEDERKEHREND)) return 0;
  fs.mkdirSync(OFFEN, { recursive: true });
  const heute = new Date().toISOString().slice(0, 10);
  let gelegt = 0;
  for (const datei of fs.readdirSync(WIEDERKEHREND).filter(f => f.endsWith('.json')).sort()) {
    let v;
    try { v = JSON.parse(fs.readFileSync(path.join(WIEDERKEHREND, datei), 'utf8')); }
    catch (e) { console.log(`✗ wiederkehrend/${datei}: kein gueltiges JSON — ${e.message}`); continue; }
    const id = sicherer_name(v.id) ? v.id : path.basename(datei, '.json');
    const alle_tage = Number.isInteger(v.alle_tage) && v.alle_tage > 0 ? v.alle_tage : 1;

    // Lief er in den letzten `alle_tage` Tagen schon? Entschieden an den Dateinamen,
    // die im Repo liegen und jeden Neustart ueberleben — nicht an einer lokalen Uhr.
    let schon = false;
    for (let i = 0; i < alle_tage && !schon; i++) {
      const tag = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const name = `${id}-${tag}.json`;
      if (fs.existsSync(path.join(FERTIG, name)) || fs.existsSync(path.join(OFFEN, name))) schon = true;
    }
    if (schon) continue;

    const auftrag = { ...(v.vorlage || {}), id: `${id}-${heute}`,
      warum: (v.warum || '') + ` [wiederkehrend, alle ${alle_tage} Tag(e)]` };
    fs.writeFileSync(path.join(OFFEN, `${id}-${heute}.json`), JSON.stringify(auftrag, null, 2));
    console.log(`+ faellig angelegt: ${id}-${heute}`);
    gelegt++;
  }
  return gelegt;
}
const neu_gelegt = faellige_anlegen();
// 13.10.2026 (Schritt 11): Reste eines abgebrochenen Laufs VOR dem frühen Ausstieg sichern,
// denn auch ein Lauf ohne Auftrag endet mit `git add auftraege` im Starter.
reste_sichern();

const offen = fs.existsSync(OFFEN)
  ? fs.readdirSync(OFFEN).filter(f => f.endsWith('.json')).sort()
  : [];

/**
 * Puls: ein Lebenszeichen, das NICHT davon abhaengt, dass Arbeit da war.
 *
 * ⚠️ GEMESSEN 18.09.2026: Die letzte Quittung war vom 17.09. 20:44, danach acht
 * Stunden Stille — und es war nicht entscheidbar, ob der Agent nichts zu tun hatte
 * oder nicht mehr laeuft. Denn genau hier stand `process.exit(0)`, sobald die
 * Warteschlange leer war: der haeufigste Lauf hinterliess gar nichts. Dazu kam
 * (grep ueber automation/ und tools/, 0 Treffer): dieser Agent stand in KEINER
 * Wacht-Liste. Das ist Lehre 0c wortwoertlich — wer bewacht DICH? — nur eine Ebene
 * hoeher: nicht ein Wächter ohne Wächter, sondern ein ganzer Server ohne einen.
 *
 * Deshalb schreibt jeder Lauf den Puls, BEVOR er ueber Arbeit entscheidet. Ein Lauf
 * ohne Arbeit ist die Regel, nicht die Ausnahme — und gerade dann ist der Puls die
 * einzige Information, die es gibt.
 *
 * Gepusht wird er nur stuendlich: alle 5 Minuten ein Commit waeren 288 am Tag, und
 * ein Signal, das im Laerm steht, liest niemand.
 *
 * ⚠️ GEMESSEN 21.09.2026 — genau das ist trotzdem passiert, und zwar 288 Mal am Tag:
 * 274 Agenten-Commits in 24 Stunden, **273 davon fassen NUR diese Datei an**, 248
 * unter der Meldung «Auftrag erledigt (Hetzner-Agent)» — bei genau EINEM Auftrag.
 * Der Grund lag nicht hier, sondern eine Schicht hoeher: der Starter
 * /usr/local/bin/luxe-auftrag (aus server/luxe-agent-setup.sh) committet und pusht
 * ALLES, was unter `auftraege/` schmutzig ist. Der Puls war nach jedem Lauf
 * schmutzig, also pushte der Starter ihn — die Stundenbremse hier lief ins Leere,
 * und die Historie behauptete 248 Mal Arbeit, die es nicht gab.
 *
 * **Eine Regel, die nur an EINER Stelle durchgesetzt wird, hebt die naechste Schicht
 * auf, die nichts von ihr weiss** (gleiche Klasse wie der Social-Stopp, der nur auf
 * einem Zweig lag, 17.09.). Deshalb wird die REPO-Datei jetzt nur noch angefasst,
 * wenn sie auch gepusht wird: dazwischen bleibt der Arbeitsbaum sauber, und der
 * Starter findet nichts zu committen. Den Stand zwischen zwei Pushes haelt eine
 * server-lokale Datei ausserhalb von `auftraege/` — dort sieht der Starter sie nicht.
 * Scheitert der Push, wird die Repo-Datei zurueckgesetzt: eine schmutzige Datei
 * waere sonst genau die Luecke, die wir gerade schliessen.
 */
const PULS = path.join(REPO, 'auftraege/_puls.json');
// Ausserhalb des Repos — der Starter prueft nur `git status auftraege` und sieht das hier nie.
const PULS_LOKAL = process.env.LUXE_PULS_LOKAL || '/tmp/luxe_puls_lokal.json';
const PUSH_ABSTAND_MS = 55 * 60 * 1000;

function schreibe_puls(zustand) {
  let gepusht = {};                      // Stand, den die Ampel im Repo sieht
  try { gepusht = JSON.parse(fs.readFileSync(PULS, 'utf8')); } catch {}
  let lokal = {};                        // Stand zwischen zwei Pushes
  try { lokal = JSON.parse(fs.readFileSync(PULS_LOKAL, 'utf8')); } catch {}
  const jetzt = new Date().toISOString();
  const puls = {
    letzter_lauf: jetzt,
    zustand,                                  // 'leer' | 'arbeitet' | 'fertig'
    offene_auftraege: offen.length,
    laeufe_seit_push: (lokal.laeufe_seit_push || 0) + 1,
    zuletzt_gepusht: gepusht.zuletzt_gepusht || null,
    hinweis: 'Geschrieben von server/luxe_auftrag_runner.mjs. Die REPO-Fassung wird nur '
           + 'beim stuendlichen Push angefasst (sonst committet der Starter sie alle 5 '
           + 'Minuten unter falschem Namen, gemessen 21.09.2026). Ist letzter_lauf aelter '
           + 'als 2 h, steht der Hetzner-Agent — die Ampel (automation/bot_puls.py) meldet das.',
  };
  // Der lokale Stand wird IMMER geschrieben: er ist auf dem Server die Wahrheit.
  try { fs.writeFileSync(PULS_LOKAL, JSON.stringify(puls, null, 2) + '\n'); } catch {}

  // Die Stundenfrage entscheidet sich am zuletzt GEPUSHTEN Stand, nie am lokalen.
  const letzterPush = gepusht.zuletzt_gepusht ? Date.parse(gepusht.zuletzt_gepusht) : 0;
  if (letzterPush && (Date.now() - letzterPush) <= PUSH_ABSTAND_MS) return;

  puls.zuletzt_gepusht = jetzt;
  puls.laeufe_seit_push = 0;
  const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { stdio: 'pipe' });
  try {
    fs.mkdirSync(path.dirname(PULS), { recursive: true });
    fs.writeFileSync(PULS, JSON.stringify(puls, null, 2) + '\n');
    git('add', 'auftraege/_puls.json');
    git('-c', 'user.name=luxe-agent', '-c', 'user.email=agent@luxestyle.ch',
        'commit', '-q', '-m', 'Bot-Puls [skip ci]');
    git('push', '-q', 'origin', `HEAD:${process.env.LUXE_BRANCH || 'claude/luxestyle-status-tztnn1'}`);
    try { fs.writeFileSync(PULS_LOKAL, JSON.stringify(puls, null, 2) + '\n'); } catch {}
  } catch (e) {
    // Ein Puls, der nicht gepusht werden kann, darf den Lauf nicht abbrechen — die
    // Arbeit ist wichtiger als ihr Protokoll. Beim naechsten Lauf ist er wieder faellig.
    // Wichtig: die Repo-Datei zuruecksetzen, sonst findet der Starter sie schmutzig
    // und pusht sie doch — genau die Luecke, die dieser Umbau schliesst.
    try { git('checkout', '--', 'auftraege/_puls.json'); } catch {}
    console.log(`· Puls nicht gepusht (${String(e.message||e).slice(0,100)})`);
  }
}

if (!offen.length) {
  schreibe_puls('leer');
  console.log('· keine offenen Aufträge (Puls geschrieben)');
  process.exit(0);
}
schreibe_puls('arbeitet');

fs.mkdirSync(FERTIG, { recursive: true });
fs.mkdirSync(ERGEBNIS, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFIL, {
  headless: true,
  // Auf dem Hetzner-Server installiert das Setup den passenden Chromium selbst.
  // LUXE_CHROME erlaubt einen vorhandenen Build (z. B. zum Testen in einer
  // Umgebung, deren Browser nicht zur Playwright-Version passt).
  ...(process.env.LUXE_CHROME ? { executablePath: process.env.LUXE_CHROME } : {}),
  args: ['--no-sandbox'],          // CDP wird BEWUSST nicht geöffnet (kein --remote-debugging-port)
  viewport: { width: 1440, height: 900 },
  locale: 'de-CH',
});

/**
 * Schreibt eine Quittung, loescht den offenen Auftrag und PUSHT das — bevor die
 * Nebenwirkung passiert.
 *
 * Warum: Der Runner setzt zu Beginn `git checkout -B` auf origin. Scheitert der
 * Push am Ende (Container weg, Netz weg), kommt die Auftragsdatei beim naechsten
 * Lauf ZURUECK und alles wird nochmal ausgefuehrt. Fuer einen Screenshot ist das
 * egal; fuer ein Skript, das ein Ticket absendet oder etwas anklickt, waere es ein
 * zweiter Vorgang, den niemand wollte. Das ist dieselbe Falle, die hier schon
 * IG-Doppelposts erzeugt hat (CLAUDE.md Regel 10).
 *
 * Regel: erst claimen und committen, DANN die Nebenwirkung — nie umgekehrt.
 * Gelingt der Push nicht, wird der Auftrag NICHT ausgefuehrt: unverrichtet ist
 * harmlos, doppelt ausgefuehrt nicht.
 */
function claim_und_push(auftrag, offenPfad) {
  const quittung = { ...auftrag, stand: 'laufend',
    hinweis: 'Vor der Ausfuehrung gesichert. Steht hier spaeter immer noch "laufend", '
           + 'ist der Lauf mittendrin gestorben — dann VON HAND pruefen, was passiert ist, '
           + 'und den Auftrag nicht einfach wiederholen.' };
  fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(quittung, null, 2));
  fs.unlinkSync(offenPfad);
  const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { stdio: 'pipe' });
  try {
    git('add', 'auftraege');
    git('-c', 'user.name=luxe-agent', '-c', 'user.email=agent@luxestyle.ch',
        'commit', '-q', '-m', `Auftrag ${auftrag.id} beginnt (Hetzner-Agent) [skip ci]`);
    git('push', '-q', 'origin', `HEAD:${process.env.LUXE_BRANCH || 'claude/luxestyle-status-tztnn1'}`);
    return true;
  } catch (e) {
    console.log(`· ${auftrag.id}: Claim konnte nicht gesichert werden (${String(e.message||e).slice(0,120)}) — NICHT ausgefuehrt, naechster Lauf versucht es erneut`);
    return false;
  }
}

for (const datei of offen) {
  const pfad = path.join(OFFEN, datei);
  let auftrag;
  try { auftrag = JSON.parse(fs.readFileSync(pfad, 'utf8')); }
  catch (e) {
    // Gefunden im Testlauf 17.09.: eine kaputte Datei blieb liegen und wurde ALLE
    // FUENF MINUTEN neu gemeldet — eine Fehlermeldung, die sich endlos wiederholt,
    // wird nach dem dritten Mal nicht mehr gelesen. Also Quittung und weg damit.
    const id = path.basename(datei, '.json');
    fs.writeFileSync(path.join(FERTIG, `${id}.json`), JSON.stringify(
      { id, stand: 'fehler', fehler: `kein gültiges JSON — ${e.message}` }, null, 2));
    fs.unlinkSync(pfad);
    console.log(`✗ ${datei}: kein gültiges JSON — ${e.message}`);
    continue;
  }
  auftrag.id = sicherer_name(auftrag.id) ? auftrag.id : path.basename(datei, '.json');

  // Nur lesende Arten duerfen gefahrlos wiederholt werden. Alles, was klicken oder
  // absenden kann, wird vorher gesichert.
  try { pruefe(auftrag); }
  catch (e) {
    fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(
      { ...auftrag, stand: 'fehler', fehler: String(e.message || e) }, null, 2));
    fs.unlinkSync(pfad);
    console.log(`✗ ${auftrag.id}: ${e.message}`);
    continue;
  }

  const nurLesend = auftrag.typ === 'screenshot' || auftrag.typ === 'seite_text';
  let geclaimt = false;
  if (!nurLesend) {
    if (!claim_und_push(auftrag, pfad)) continue;
    geclaimt = true;
  }

  // ⚠️ Zwei von drei Storefront-Laeufen (19./20.09.) blieben auf «laufend» stehen, und
  // es gab NICHTS, woran sich das Warum haette festmachen lassen — der Dienst ist
  // `Type=oneshot` mit `TimeoutStartSec=900`, also koennte systemd ihn erlegt haben,
  // aber das war Vermutung. Seit dem 20.09. macht der Storefront-Auftrag 9 Seitenabrufe
  // statt 3. Deshalb traegt jede Quittung jetzt ihre Dauer: beim naechsten Abbruch ist
  // die Frage «zu langsam oder woanders gestorben?» eine Messung statt einer Meinung.
  const begonnen = Date.now();
  const dauer = () => ({ begonnen: new Date(begonnen).toISOString(),
                         dauer_s: Math.round((Date.now() - begonnen) / 100) / 10 });
  const bilder_vorher = bilder_jetzt();           // Schritt 11: nur NEUE Bilder gehen durch die Weiche
  let quittung;
  try {
    const ergebnis = await fuehre_aus(auftrag, ctx);
    quittung = { ...auftrag, stand: 'ok', ...dauer(), ergebnis };
    console.log(`✓ ${auftrag.id} (${auftrag.typ})`);
  } catch (e) {
    // «nicht angemeldet» ist kein gewoehnlicher Fehler, sondern eine Aufgabe fuer
    // den Betreiber (Profil einmal einloggen) — deshalb ein eigener Stand.
    const stand = e.nichtAngemeldet ? 'nicht-angemeldet'
                : e.umgeleitet      ? 'umgeleitet'
                : 'fehler';
    // ⚠️ 17.09.2026, gelernt an Auftrag 27: hier stand nur die Fehlermeldung. Alles,
    // was der Lauf VORHER gemessen hatte (Boards, Schritte, Screenshots), war damit
    // weg — die Diagnose musste aus den Bilddateien rekonstruiert werden, und die
    // erste Erklaerung, auf die ich dabei kam, war die falsche. **Ein Fehlschlag
    // darf die Messungen nicht mitnehmen: das Wenige, was ein gescheiterter Lauf
    // gesehen hat, ist oft das Wertvollste, was er hinterlaesst.**
    quittung = { ...auftrag, stand, ...dauer(), fehler: String(e.message || e) };
    if (e.teilergebnis) quittung.teilergebnis = e.teilergebnis;
    console.log(`✗ ${auftrag.id}: ${quittung.fehler}`);
  }
  // 13.10.2026, Schritt 11: Bilder durch die Weiche, BEVOR die Quittung geschrieben und
  // (vom Starter oder vom nächsten Claim) committet wird; auch nach einem Fehlschlag.
  try { quittung = await bilder_weichen(auftrag, bilder_vorher, quittung,
                                        (d, m) => verkleinere_jpeg(ctx, d, m)); }
  catch (e) { quittung.bilder_weiche_fehler = String(e.message || e).slice(0, 200);
              console.log(`✗ ${auftrag.id}: Bilder-Weiche ${quittung.bilder_weiche_fehler}`); }
  reste_sichern();                                // was die Weiche nicht freigab, bleibt auf dem Server
  // Auch ein Fehlschlag bekommt eine Quittung — ein Automat, der still scheitert,
  // ist für den Betreiber dasselbe wie keiner.
  fs.writeFileSync(path.join(FERTIG, `${auftrag.id}.json`), JSON.stringify(quittung, null, 2));
  if (!geclaimt) fs.unlinkSync(pfad);
}

await ctx.close();
