#!/usr/bin/env node
/* LuxeStyle — ig-dm-browser.mjs  (EIGENSTÄNDIG, läuft am PC über Brave-CDP)
 * ---------------------------------------------------------------------------------
 * Beantwortet Instagram-DMs OHNE API (der Meta-API-Weg ist app-level blockiert →
 * bräuchte mehrtägiges App-Review für instagram_manage_messages). Steuert dein
 * eingeloggtes Brave (Port 9222), liest offene Konversationen, erkennt das Thema
 * und antwortet herzlich. State in `ig-dm-done.json` (idempotent).
 *
 * START (PC-Claude „beantworte meine Instagram-DMs" ODER PowerShell):
 *   npm install playwright-core      # einmalig
 *   node ig-dm-browser.mjs           # beantwortet bis MAX neue DMs
 *   node ig-dm-browser.mjs --dry     # nur zeigen, was es schreiben WÜRDE (nichts senden)
 *   MAX=20 node ig-dm-browser.mjs    # Limit anpassen
 *
 * SICHER: Cap (Default 15), Pausen 6–14 s, überspringt schon beantwortete Threads,
 * unklare Nachrichten → freundliche Standard-Begrüssung (nie falsche Auskunft).
 * Sendet NUR Text. Löscht/blockiert nichts.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const MAX = Number(process.env.MAX || 15);
const DRY = process.argv.includes('--dry');
const DONE = path.join(process.cwd(), 'ig-dm-done.json');
const SHOTS = path.join(process.cwd(), 'ch-growth-screens');
fs.mkdirSync(SHOTS, { recursive: true });

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));

// Themen-Erkennung — identisch zur API-Version (automation/ig-dm-reply.mjs). Ehrlich: gratis ab CHF 50,
// 30 Tage Rückgabe, weltweiter Versand 8–14 Tage.
const TOPIC = [
  ['retoure', /rückgabe|ruckgabe|retoure|umtausch|zurückschick|garantie|reklamation|defekt|kaputt/i],
  ['bestellung', /bestellnummer|tracking|sendungs|wo ist mein|wo bleibt|status.*bestell|order|nicht erhalten/i],
  ['versand', /versand|liefer|wann.*komm|wie lange|paket|shipping|dauert/i],
  ['groesse', /grösse|groesse|size|passt|masse|maße|fällt.*aus/i],
  ['design', /selbst.*gestalt|eigenes design|gestalten|bedruck|drucken|print|individuell/i],
  ['preis', /preis|kostet|wie teuer|chf|rabatt|code|gutschein|zahlung|twint|bezahl/i],
  ['verfueg', /verfügbar|verfugbar|lager|ausverkauft|wieder.*da|noch da|vorrätig/i],
  ['danke', /danke|merci|vielen dank|mega|liebe.*es|😍/i],
];
const REPLIES = {
  retoure: 'Kein Stress 🤍 Du hast 30 Tage Rückgaberecht. Schreib uns einfach deine Bestellnummer, wir helfen dir sofort weiter ✨',
  bestellung: 'Hey! 📦 Gib uns kurz deine Bestellnummer durch, dann checken wir den Status. Versand weltweit dauert i. d. R. 8–14 Tage 🤍',
  versand: 'Hey! 🤍 Versand weltweit, gratis ab CHF 50 (Schweiz) — Lieferzeit meist 8–14 Tage. Alle Infos auf luxestyle.ch ✨',
  groesse: 'Hi! 👗 Die genaue Grössentabelle (in cm) steht direkt beim Produkt auf luxestyle.ch — sag uns sonst gern, welches Teil! 🤍',
  design: 'So cool, dass dich «Selbst gestalten» interessiert 🎨 Auf luxestyle.ch machst du dein eigenes Design auf Shirt, Hoodie, Täsche oder Tasse — ohne Mindestmenge ✨',
  preis: 'Hey! 💛 Mit Code WELCOME10 gibt’s –10% auf alles auf luxestyle.ch. Bezahlen bequem per Karte, TWINT & mehr ✨',
  verfueg: 'Hi! 🤍 Aktuelle Verfügbarkeit, Farben & Grössen siehst du live auf luxestyle.ch — sag gern, welches Teil dich interessiert ✨',
  danke: 'Merci dir vielmal 🤍 Das freut uns riesig! Schau gern wieder vorbei — mit Code WELCOME10 gibt’s –10% auf luxestyle.ch ✨',
  welcome: 'Hey! 🤍 Danke für deine Nachricht! Wie können wir dir helfen? Alle Looks findest du auf luxestyle.ch ✨ (–10% mit Code WELCOME10)',
};
const replyFor = t => { for (const [k, re] of TOPIC) if (re.test(t)) return REPLIES[k]; return REPLIES.welcome; };

const loadDone = () => { try { return new Set(JSON.parse(fs.readFileSync(DONE, 'utf8'))); } catch { return new Set(); } };
const saveDone = s => { try { fs.writeFileSync(DONE, JSON.stringify([...s].slice(-3000))); } catch (e) { log(e.message); } };

(async () => {
  log(`Start IG-DM-Browser ${DRY ? '(DRY)' : ''} — Cap ${MAX}.`);
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei Instagram eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  await p.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rnd(4000, 6500));

  const done = loadDone();
  // Thread-Links sammeln (oben = neueste). Ungelesene zuerst, aber wir gehen einfach der Reihe nach.
  const threadHrefs = await p.$$eval('a[href*="/direct/t/"]', els => [...new Set(els.map(e => e.getAttribute('href')))]).catch(() => []);
  log(`${threadHrefs.length} Konversationen sichtbar.`);
  let n = 0;
  for (const href of threadHrefs) {
    if (n >= MAX) break;
    const tid = (href.match(/\/direct\/t\/(\d+)/) || [])[1] || href;
    try {
      await p.goto('https://www.instagram.com' + href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(rnd(2500, 4500));
      // Letzte Nachrichten-Texte (Reihenfolge im DOM = chronologisch); letzte = unten
      const msgs = await p.$$eval('div[role="row"], div[dir="auto"]', els =>
        els.map(e => (e.innerText || '').trim()).filter(t => t && t.length < 600)
      ).catch(() => []);
      const lastMsg = msgs.length ? msgs[msgs.length - 1] : '';
      const key = tid + '|' + lastMsg.slice(0, 40);
      if (!lastMsg || done.has(key)) { log(`• ${tid.slice(-6)}: nichts Neues / schon beantwortet`); continue; }
      const reply = replyFor(lastMsg);
      log(`• ${tid.slice(-6)}: "${lastMsg.slice(0, 50)}" ⇒ ${DRY ? '[dry] ' : ''}"${reply.slice(0, 45)}…"`);
      if (!DRY) {
        const box = p.locator('textarea[placeholder], div[role="textbox"][contenteditable="true"], div[aria-label*="Nachricht"], div[aria-label*="Message"]').first();
        if (await box.count().catch(() => 0)) {
          await box.click({ timeout: 4000 }).catch(() => {});
          await box.type(reply, { delay: 18 }).catch(() => {});
          await sleep(rnd(500, 1100));
          await p.keyboard.press('Enter').catch(() => {});
          n++;
        } else { log('   ⚠️ kein Nachrichtenfeld gefunden — übersprungen'); }
      } else { n++; }
      done.add(key);
      await sleep(rnd(6000, 14000));
    } catch (e) { log(`• ${tid.slice(-6)} Fehler:`, e.message); }
  }
  saveDone(done);
  await p.screenshot({ path: path.join(SHOTS, 'ig-dm.png') }).catch(() => {});
  log(`\nFertig: ${n} DM${DRY ? ' (DRY)' : ''} beantwortet. State: ig-dm-done.json. Brave bleibt offen.`);
  process.exit(0);
})();
