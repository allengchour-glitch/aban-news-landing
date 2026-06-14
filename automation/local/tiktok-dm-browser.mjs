#!/usr/bin/env node
/* LuxeStyle — tiktok-dm-browser.mjs  (EIGENSTÄNDIG, läuft am PC über Brave-CDP)
 * ---------------------------------------------------------------------------------
 * Beantwortet TikTok-Direktnachrichten OHNE API (TikTok hat KEINE DM-API — der einzige Weg
 * ist der eingeloggte Browser). Steuert dein Brave (Port 9222), liest offene Chats, erkennt
 * das Thema und antwortet herzlich (gleiche FAQ-Logik wie ig-dm-browser). Idempotent über
 * tiktok-dm-done.json. Sendet NUR Text, löscht/blockt nichts.
 *
 * START (PC-Claude „beantworte meine TikTok-DMs" ODER PowerShell):
 *   npm install playwright-core      # einmalig
 *   node automation/local/tiktok-dm-browser.mjs --dry   # ZUERST: nur zeigen, nichts senden
 *   node automation/local/tiktok-dm-browser.mjs         # echt, bis MAX
 *   MAX=20 node automation/local/tiktok-dm-browser.mjs
 *
 * ⚠️ TikTok ändert sein Web-DOM oft → beim ERSTEN Lauf immer --dry und prüfen, ob Chats/Feld
 *    erkannt werden; falls nicht, Selektoren unten (CHAT_SEL / BOX_SEL) anpassen.
 * SICHER: Cap (Default 12), Pausen 7–15 s, überspringt schon beantwortete Chats, unklar →
 *    freundliche Standard-Begrüssung (nie falsche Auskunft).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const MAX = Number(process.env.MAX || 12);
const DRY = process.argv.includes('--dry');
const DONE = path.join(process.cwd(), 'tiktok-dm-done.json');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));

// Themen-Erkennung + Antworten — identisch zu ig-dm-browser (CH-FAQ: gratis ab CHF 65, 30T Rückgabe, 8–14 Tage).
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
  retoure: 'Kei Stress 🤍 Du hesch 30 Täg Rückgaberächt. Schick üs eifach dini Bstellnummere, mir hälfed der grad wiiter ✨',
  bestellung: 'Hoi! 📦 Gib üs churz dini Bstellnummere, denn luege mir de Status. Versand wältwiit i. d. R. 8–14 Täg 🤍',
  versand: 'Hoi! 🤍 Versand wältwiit, gratis ab CHF 65 (Schwiiz) — Lieferig meist 8–14 Täg. Alles uf luxestyle.ch ✨',
  groesse: 'Hi! 👗 D Grössetabälle (i cm) staht direkt bim Produkt uf luxestyle.ch — säg üs susch, weles Teil! 🤍',
  design: 'So cool, dass di «Selbst gestalte» interessiert 🎨 Uf luxestyle.ch machsch dis eigete Design uf Shirt, Hoodie, Täsche oder Tasse — ohni Mindeschtmängi ✨',
  preis: 'Hoi! 💛 Mit Code WELCOME10 git’s –10% uf alles uf luxestyle.ch. Zahle bequem mit Charte, TWINT & meh ✨',
  verfueg: 'Hi! 🤍 Aktuelli Verfügbarkeit, Farbe & Grösse gsehsch live uf luxestyle.ch — säg gärn, weles Teil di interessiert ✨',
  danke: 'Merci dir vilmal 🤍 Das freut üs riesig! Lueg gärn wieder verbii — mit Code WELCOME10 git’s –10% uf luxestyle.ch ✨',
  welcome: 'Hoi! 🤍 Merci für dini Nachricht! Wie chöi mer der hälfe? Alli Looks findsch uf luxestyle.ch ✨ (–10% mit Code WELCOME10)',
};
const replyFor = t => { for (const [k, re] of TOPIC) if (re.test(t)) return REPLIES[k]; return REPLIES.welcome; };

const loadDone = () => { try { return new Set(JSON.parse(fs.readFileSync(DONE, 'utf8'))); } catch { return new Set(); } };
const saveDone = s => { try { fs.writeFileSync(DONE, JSON.stringify([...s].slice(-3000))); } catch (e) { log(e.message); } };

// TikTok-Web-Selektoren (best effort — bei DOM-Änderung hier anpassen):
const CHAT_SEL = '[data-e2e="chat-list-item"], div[class*="ChatItem"], a[href*="/messages?"]';
const MSG_SEL = '[data-e2e="chat-item"], div[class*="MessageBubble"], p[class*="Text"]';
const BOX_SEL = 'div[contenteditable="true"], [data-e2e="message-input-area"] div[contenteditable], textarea';

(async () => {
  log(`Start TikTok-DM-Browser ${DRY ? '(DRY)' : ''} — Cap ${MAX}.`);
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222'); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 starten + bei TikTok eingeloggt sein.'); process.exit(1); }
  const ctx = b.contexts()[0] || await b.newContext();
  const p = await ctx.newPage();
  await p.goto('https://www.tiktok.com/messages', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rnd(5000, 8000));

  const done = loadDone();
  const chats = await p.$$(CHAT_SEL).catch(() => []);
  log(`${chats.length} Chats sichtbar.${chats.length === 0 ? ' (Selektor evtl. anpassen — siehe CHAT_SEL)' : ''}`);
  if (chats.length === 0) {
    // DIAGNOSE: was sieht die Seite wirklich? → richtige Selektoren ableiten
    const d = await p.evaluate(() => {
      const e2e = {};
      document.querySelectorAll('[data-e2e]').forEach(el => { const k = el.getAttribute('data-e2e'); e2e[k] = (e2e[k] || 0) + 1; });
      return {
        url: location.href, title: document.title,
        e2e, editables: document.querySelectorAll('[contenteditable="true"]').length,
        textareas: document.querySelectorAll('textarea').length,
        iframes: document.querySelectorAll('iframe').length,
        bodyStart: (document.body.innerText || '').slice(0, 220).replace(/\s+/g, ' '),
      };
    }).catch(e => ({ err: e.message }));
    log('🔎 DIAG url:', d.url);
    log('🔎 DIAG title:', d.title);
    log('🔎 DIAG data-e2e:', JSON.stringify(d.e2e));
    log('🔎 DIAG editables:', d.editables, '· textareas:', d.textareas, '· iframes:', d.iframes);
    log('🔎 DIAG body:', d.bodyStart);
    await p.screenshot({ path: path.join(process.cwd(), 'tiktok-dm-diag.png') }).catch(() => {});
    log('🔎 Screenshot: tiktok-dm-diag.png');
  }
  let n = 0;
  for (let i = 0; i < chats.length && n < MAX; i++) {
    try {
      const chat = (await p.$$(CHAT_SEL))[i]; if (!chat) continue;
      await chat.click({ timeout: 5000 }).catch(() => {});
      await sleep(rnd(2500, 4500));
      const msgs = await p.$$eval(MSG_SEL, els => els.map(e => (e.innerText || '').trim()).filter(t => t && t.length < 600)).catch(() => []);
      const lastMsg = msgs.length ? msgs[msgs.length - 1] : '';
      const key = (lastMsg.slice(0, 50) || ('chat' + i));
      if (!lastMsg || done.has(key)) { log(`• Chat ${i}: nichts Neues / schon beantwortet`); continue; }
      const reply = replyFor(lastMsg);
      log(`• Chat ${i}: "${lastMsg.slice(0, 50)}" ⇒ ${DRY ? '[dry] ' : ''}"${reply.slice(0, 45)}…"`);
      if (!DRY) {
        const box = p.locator(BOX_SEL).last();
        if (await box.count().catch(() => 0)) {
          await box.click({ timeout: 4000 }).catch(() => {});
          await box.type(reply, { delay: 20 }).catch(() => {});
          await sleep(rnd(500, 1200));
          await p.keyboard.press('Enter').catch(() => {});
          n++;
        } else { log('   ⚠️ kein Nachrichtenfeld gefunden — übersprungen (BOX_SEL prüfen)'); }
      } else { n++; }
      done.add(key);
      await sleep(rnd(7000, 15000));
    } catch (e) { log(`• Chat ${i} Fehler:`, e.message); }
  }
  saveDone(done);
  log(`\nFertig: ${n} TikTok-DM${DRY ? ' (DRY)' : ''} beantwortet. State: tiktok-dm-done.json. Brave bleibt offen.`);
  process.exit(0);
})();
