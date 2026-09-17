/**
 * pinterest_boards_anlegen.mjs — legt die fehlenden Boards ueber Pinterests eigenen
 * Weg an: Profilseite → «+» → «Pinnwand» → Name → Erstellen.
 *
 * ⚠️ WARUM NEU (17.09.2026): Die erste Fassung rief `/board-create/` auf — diese Adresse
 * gibt es nicht. Pinterest leitete auf den Feed um und zeigte «Wir konnten diese Idee
 * nicht finden!»; das Skript meldete daraufhin sechsmal «kein Namensfeld gefunden».
 * Die Meldung war richtig und die Ursache eine geratene URL. **Eine Adresse, die man
 * nicht gemessen hat, ist eine Vermutung** — hier wird jetzt der Weg genommen, der im
 * Screenshot sichtbar ist.
 *
 * ⚠️⚠️ EIN BOARD JE LAUF (17.09., nach zwei Abbruechen mit Stand «laufend»).
 * Die erste Fassung wollte alle sechs in einem Durchgang anlegen: sechs Dialoge, sechs
 * Wartezeiten, dazwischen Seitenladen. Beide Laeufe starben mittendrin, ohne Quittung.
 * Der Agent laeuft im 5-Minuten-Takt — **eine Arbeit, die innerhalb eines Takts fertig
 * werden MUSS, muss klein genug sein, um innerhalb eines Takts fertig zu werden.** Die
 * Loesung ist nicht ein groesseres Zeitlimit, sondern eine kleinere Einheit: dieser Lauf
 * legt GENAU EIN fehlendes Board an und hoert auf. Sechs Auftraege, sechs kurze Laeufe.
 * Idempotent bleibt es ohnehin — jeder Lauf liest vorher, was schon da ist.
 *
 * ⚠️ ERST EINE PROBE, DANN DER REST. Das erste Board wird angelegt und danach
 * NACHGELESEN, ob es wirklich auf dem Konto steht. Nur wenn das belegt ist, laufen die
 * uebrigen fuenf. Sonst waeren es sechs Fehlversuche — oder, schlimmer, sechs Dubletten,
 * falls das Anlegen klappt und nur das Erkennen scheitert (CLAUDE.md Regel 2).
 */
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';
const NUTZER = 'luxestyleCH';
const SOLL = ['Herrenmode Schweiz', 'Schmuck & Accessoires', 'Sommerkleider & Damenmode 2026',
              'Wellness & Beauty', 'Home & Geschenkideen', 'Schuhe & Sandalen'];

const grund = s => (s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const normen = s => [grund(s).replace(/&/g, 'und').replace(/[^a-z0-9]/g, ''),
                     grund(s).replace(/&/g, '').replace(/[^a-z0-9]/g, '')];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const bilder = [], schritte = [];
  const seite = await ctx.newPage();
  const schuss = async (name) => {
    const d = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: d, fullPage: false });
    bilder.push(path.relative(REPO, d));
  };

  /** Liest die Board-Namen aus der Reiterleiste der Profilseite. */
  async function vorhandene() {
    await seite.goto(`${HOST}/${NUTZER}/_saved/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(4500);
    if (ist_anmeldeseite(seite.url())) {
      const e = new Error(`nicht angemeldet — ${seite.url()}`); e.nichtAngemeldet = true; throw e;
    }
    // Zwei Quellen, damit eine leere Antwort nicht als «keine Boards» durchgeht:
    // die Adressen der Board-Links UND die sichtbaren Namen der Reiterleiste.
    const adressen = await seite.$$eval('a[href]', (as, n) => [...new Set(as
      .map(a => a.getAttribute('href') || '')
      .filter(h => h.toLowerCase().startsWith('/' + n + '/'))
      .map(h => decodeURIComponent(h.split('/').filter(Boolean)[1] || ''))
      .filter(h => h && !h.startsWith('_')))], NUTZER.toLowerCase());
    const namen = await seite.$$eval('[role="tab"],nav a,nav div',
      els => els.map(e => (e.innerText || '').trim()).filter(t => t && t.length < 40));
    return { adressen, namen, alle: new Set([...adressen, ...namen].flatMap(normen)) };
  }

  /** EIN Board anlegen. Gibt zurueck, wie weit es kam — nie stillschweigend. */
  async function anlegen(name, marke) {
   try {
    const plus = seite.locator(
      '[aria-label*="erstell" i],[aria-label*="create" i],[aria-label*="hinzuf" i],'
      + 'button:has-text("Erstellen"),div[role="button"]:has-text("Erstellen")');
    if (!(await plus.count())) return `kein «+»/«Erstellen» auf der Profilseite gefunden`;
    await plus.first().click({ timeout: 15000 }).catch(() => {});
    await seite.waitForTimeout(2500);
    await schuss(`${marke}-a-menu`);

    // Im Menue «Pinnwand»/«Board» waehlen — sofern es ein Menue gibt.
    const pinnwand = seite.locator('[role="menuitem"],a,button,div[role="button"]')
      .filter({ hasText: /^\s*(Pinnwand|Board)\s*$/i });
    if (await pinnwand.count()) {
      await pinnwand.first().click({ timeout: 15000 }).catch(() => {});
      await seite.waitForTimeout(2500);
    }
    const feld = seite.locator('input[type="text"]:visible,input[name="name"]:visible,'
                             + 'input[placeholder*="Name" i],input[id*="name" i]');
    if (!(await feld.count())) { await schuss(`${marke}-b-kein-feld`); return 'kein Namensfeld im Dialog'; }
    await feld.first().fill(name);
    await seite.waitForTimeout(1200);
    await schuss(`${marke}-c-gefuellt`);
    // ⚠️ 17.09., Auftrag 19: hier lief der Klick in die Zeitgrenze. Der Knopf WURDE
    // gefunden, war aber nicht klickbar — in Pinterests Dialog liegen mehrere Treffer,
    // und der erste ist verdeckt oder noch inaktiv. Drei Aenderungen daraus:
    // (1) nur SICHTBARE Knoepfe INNERHALB des Dialogs, (2) vorher `isEnabled` fragen,
    // (3) Eingabetaste als Rueckfallweg — Pinterests Dialog sendet auch damit ab.
    // Und: ein fehlgeschlagener Klick darf das Skript nicht abbrechen, sonst fehlt die
    // Auskunft, wie weit es kam (Auftrag 19 endete auf «fehler» statt mit Bericht).
    const dialog = seite.locator('[role="dialog"]');
    const imDialog = (await dialog.count()) ? dialog.first() : seite.locator('body');
    const knopf = imDialog.locator('button:visible,div[role="button"]:visible')
      .filter({ hasText: /^\s*(Erstellen|Create|Fertig|Done|Weiter)\s*$/i });
    const n = await knopf.count();
    let geklickt = false;
    for (let i = 0; i < n && !geklickt; i++) {
      const k = knopf.nth(i);
      if (!(await k.isEnabled().catch(() => false))) continue;
      geklickt = await k.click({ timeout: 8000 }).then(() => true).catch(() => false);
    }
    if (!geklickt) {
      // Rueckfallweg: Eingabetaste im Namensfeld.
      await feld.first().press('Enter').catch(() => {});
      schritte.push(`${marke}: Erstellen-Knopf nicht klickbar (${n} Treffer) → Eingabetaste`);
    }
    await seite.waitForTimeout(7000);
    await schuss(`${marke}-d-nachher`);
    return null;                                   // null = kein Hinderungsgrund
   } catch (e) {
     if (e.nichtAngemeldet) throw e;
     return `abgebrochen: ${String(e.message).slice(0, 120)}`;
   }
  }

  const ergebnis = { angelegt: [], vorhanden: [], offen: [], schritte, bilder };
  try {
    let stand = await vorhandene();
    await schuss('0-profil');
    schritte.push(`vorhanden: ${[...new Set([...stand.adressen])].join(', ') || '—'}`);

    const fehlt = SOLL.filter(n => !normen(n).some(k => stand.alle.has(k)));
    ergebnis.vorhanden = SOLL.filter(n => normen(n).some(k => stand.alle.has(k)));
    if (!fehlt.length) { schritte.push('alle sechs existieren schon'); return ergebnis; }

    // ── Probe: das erste fehlende Board, dann nachlesen ──────────────────────
    const erstes = fehlt[0];
    const hindernis = await anlegen(erstes, 'probe');
    stand = await vorhandene();
    const probe_da = normen(erstes).some(k => stand.alle.has(k));
    schritte.push(`Probe «${erstes}»: ${hindernis || 'durchgelaufen'} → auf dem Konto: ${probe_da}`);
    if (!probe_da) {
      ergebnis.offen = fehlt.map(n => `${n} (Probe schlug fehl: ${hindernis || 'angelegt, aber nicht gefunden'})`);
      return ergebnis;                             // NICHT fuenfmal denselben Fehler wiederholen
    }
    ergebnis.angelegt.push(erstes);
    ergebnis.noch_fehlend = fehlt.slice(1);
    schritte.push(fehlt.length > 1
      ? `Schluss fuer diesen Lauf — noch offen: ${fehlt.slice(1).join(', ')}`
      : 'das war das letzte');

    // Schlusskontrolle am Konto, nicht am eigenen Zaehler.
    stand = await vorhandene();
    ergebnis.bestaetigt = SOLL.filter(n => normen(n).some(k => stand.alle.has(k)));
    return ergebnis;
  } finally { await seite.close().catch(() => {}); }
}
