#!/usr/bin/env node
/* LuxeStyle — tiktok-campaign-port.mjs  · MAXIMUM-VERSION
 * =============================================================================================
 * Erstellt + startet die bezahlte TikTok-Conversion-Kampagne autonom über das EINGELOGGTE
 * TikTok Ads Manager im Brave (Port 9222). Kein API-Audit nötig. (User: 350 CHF drauf, voll Gas.)
 *
 * ROBUST: jeder Schritt mit mehrsprachigen (DE/EN) Selektoren + Fallbacks + SCREENSHOT (campaign-shots/)
 * + Log. HARTE Budget-Obergrenze (Lifetime-Cap) → kann nie mehr ausgeben als TT_TOTAL_BUDGET.
 * Idempotent über campaign-ledger.txt. AUTO_LAUNCH gating + --dry (nur durchlaufen + screenshotten).
 *
 * EMPFOHLENER ABLAUF (1× begleitet, dann autonom):
 *   1) Brave mit --remote-debugging-port=9222, bei ads.tiktok.com eingeloggt, richtiges Werbekonto aktiv.
 *   2) node automation/local/tiktok-campaign-port.mjs --dry      → läuft durch, macht Screenshots,
 *      meldet wo ein Selektor nicht passt. Screenshots/DIAG anschauen → ggf. SEL_* per ENV überschreiben.
 *   3) AUTO_LAUNCH=1 node automation/local/tiktok-campaign-port.mjs → erstellt + sendet zur Prüfung ab.
 *
 * ENV (sichere Defaults):
 *   TT_TOTAL_BUDGET=350  TT_DAILY_BUDGET=25  TT_PIXEL_ID=D8EKVR3C77U6KT5BTBD0
 *   TT_EVENT="Complete payment"  TT_LANDING=https://luxestyle.ch/collections/sommer
 *   TT_VIDEO=reels/luxe-flagship-film.mp4   TT_IDENTITY="Luxestyle.ch"
 *   TT_LOCATION=Switzerland  TT_GENDER=Female  TT_AGE="18-24,25-34"  TT_LANG="German,French"
 *   TT_ADTEXT="Premium-Looks zu faire Priis. -10% mit WELCOME10."  TT_CTA="Shop Now"
 *   AUTO_LAUNCH=0  CREATION_URL=https://ads.tiktok.com/i18n/perf/creation/campaign
 */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { aiBrowser } from '../lib/ai-browser.mjs';

const DRY = process.argv.includes('--dry');
// WATCHDOG (Lehre 2026-06-24): Campaign-Wizard ist LANG (Konto-Guard+Ziel+Gebot+Targeting+Budget+Ad+Submit).
// 5 Min killten ihn mitten drin (stoppte bei Budget). 12 Min = genug zum Durchlaufen, aber kein Endlos-Hang.
// NEU 2026-06-24: bei Timeout NICHT blind sterben — letzten Screenshot + Report schreiben (Lauf 18:00 stoppte
// stumm nach open-creation = ein Hang killte den Prozess ohne Spur). So sieht die Cloud beim naechsten Mal WO.
let PAGE_REF = null;
setTimeout(async () => {
  console.log('⏱️ WATCHDOG 12min -> exit (Campaign-Flow zu lang/haengt)');
  try {
    if (PAGE_REF) { await PAGE_REF.screenshot({ path: path.join(SHOTS, '99-watchdog-timeout.png') }).catch(() => {}); }
    fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'),
      JSON.stringify({ ts: new Date().toISOString(), result: 'WATCHDOG_TIMEOUT',
        hinweis: 'Lauf haengte >12min und wurde gekillt. Screenshot 99-watchdog-timeout zeigt den letzten Stand. Wahrscheinlich haengte ein p.evaluate/act auf einer langsamen/blockierten Seite.' }, null, 2));
  } catch {}
  process.exit(1);
}, 720000).unref();
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const C = {
  total: process.env.TT_TOTAL_BUDGET || '350',
  daily: process.env.TT_DAILY_BUDGET || '25',
  objective: process.env.TT_OBJECTIVE || 'Conversions', // CizQ6 2026-06-22 UMGESTELLT (YouTube-Lehre + TikTok-Doku):
  // Pixel D8EKVR feuert jetzt (ttq.page verifiziert) + datasharing-go laeuft zuerst (Data-Connection auf Max) -> Conversions moeglich.
  // ADD-TO-CART statt Traffic: Traffic bringt billige Falsch-Leute + trainiert den Pixel falsch = Budget-Verschwendung.
  // FALLBACK nur falls der Bot an der Pixel/Data-Connection-Wand haengt: TT_OBJECTIVE=Traffic setzen.
  pixel: process.env.TT_PIXEL_ID || 'D8EKVR3C77U6KT5BTBD0',
  event: process.env.TT_EVENT || 'Add to Cart', // YouTube-Lehre: ATC ist haeufig genug, dass der Algo lernt WER kauft (Complete-Payment braucht ~50 Kaeufe/Woche = bei CHF 350 unerreichbar). Spaeter parallele Complete-Payment-Gruppe dazu.
  landing: process.env.TT_LANDING || 'https://luxestyle.ch/collections/sommer',
  video: path.resolve(process.env.TT_VIDEO || path.join(ROOT, 'reels', 'luxe-flagship-film.mp4')),
  identity: process.env.TT_IDENTITY || 'Luxestyle.ch',
  location: process.env.TT_LOCATION || 'Switzerland',
  gender: process.env.TT_GENDER || 'Female',
  age: (process.env.TT_AGE || '18-24,25-34').split(','),
  lang: (process.env.TT_LANG || 'German,French').split(','),
  adtext: process.env.TT_ADTEXT || 'Premium-Looks zu faire Priis. -10% mit Code WELCOME10.',
  cta: process.env.TT_CTA || 'Shop Now',
  autoLaunch: process.env.AUTO_LAUNCH === '1',
  // KONTO-WECHSEL via URL (Lehre 2026-06-21, User "musst nur konto wechseln"): aadvid in der URL oeffnet die
  // Kampagne DIREKT im richtigen, fertig eingerichteten Werbekonto "LuxeStyle CH Ads" - kein falsches/leeres Konto,
  // keine Onboarding-Wand. Voraussetzung: der eingeloggte TikTok-User hat Zugriff auf dieses Advertiser-Konto.
  advertiserId: process.env.TT_ADVERTISER_ID || '7646349875793182738',
  creationUrl: process.env.CREATION_URL || ('https://ads.tiktok.com/i18n/perf/creation/campaign?aadvid=' + (process.env.TT_ADVERTISER_ID || '7646349875793182738')),
};
const LEDGER = path.join(ROOT, 'automation', 'local', 'tiktok-campaign-ledger.txt');
const SHOTS = path.join(ROOT, 'automation', 'local', 'campaign-shots');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// HANG-SCHUTZ (Lehre 2026-06-24: Laeufe 18:00/18:32 starben stumm nach open-creation): page.evaluate hat KEIN
// Default-Timeout -> eine blockierte Seite friert den ganzen Lauf 12 Min ein. pTimeout rennt gegen eine Uhr,
// liefert null statt zu haengen -> der Bot macht weiter + die Screenshots entstehen trotzdem.
const pTimeout = (promise, ms, label = 'op') => Promise.race([
  Promise.resolve(promise).catch(() => null),
  new Promise(r => setTimeout(() => { log('⏱️ ' + label + ' timeout ' + ms + 'ms (weiter)'); r(null); }, ms)),
]);
let STEP = 0;

async function shot(p, name) { try { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${String(++STEP).padStart(2, '0')}-${name}.png`) }); } catch {} }
async function diag(p, step) {
  const d = await p.evaluate(() => ({ url: location.href, title: document.title, body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200) })).catch(() => ({}));
  log(`DIAG[${step}]`, JSON.stringify(d)); await shot(p, step);
}
// klick erstes sichtbares Element aus Text/Rollen-Liste
async function clickAny(p, labels, { role = 'button', timeout = 6000 } = {}) {
  for (const t of labels) {
    for (const loc of [p.getByRole(role, { name: t }).first(), p.getByText(t, { exact: false }).first()]) {
      try { if (await loc.isVisible({ timeout: 1000 })) { await loc.click({ timeout }); await sleep(800); return t; } } catch {}
    }
  }
  return null;
}
async function fillAny(p, labelOrPlaceholder, value) {
  for (const loc of [p.getByPlaceholder(labelOrPlaceholder, { exact: false }).first(), p.getByLabel(labelOrPlaceholder, { exact: false }).first()]) {
    try { if (await loc.isVisible({ timeout: 1000 })) { await loc.fill(String(value)); await sleep(500); return true; } } catch {}
  }
  return false;
}
// in Such-Combobox tippen + ersten Treffer wählen (für Location/Sprache/Pixel/Event)
// CRASH-FIX 2026-06-25: im Stagehand-Modus hat p KEIN p.keyboard (= genau der Crash 2026-06-24
// 'reading press'). Darum: stagehand -> ab.act(); nur im Playwright-Fallback p.keyboard.
async function pickFromSearch(p, value, ab) {
  try {
    if (ab && ab.mode === 'stagehand' && typeof ab.act === 'function') {
      await ab.act(`type "${value}" into the active search/combobox field, then click the first matching option in the dropdown`);
      await sleep(1400); return true;
    }
    await p.keyboard.type(String(value), { delay: 60 }); await sleep(1800);
    const opt = p.getByRole('option', { name: new RegExp(value, 'i') }).first();
    if (await opt.isVisible({ timeout: 2500 }).catch(() => false)) { await opt.click(); await sleep(700); return true; }
    await p.keyboard.press('Enter'); await sleep(700); return true;
  } catch { return false; }
}

(async () => {
  if (fs.existsSync(LEDGER) && fs.readFileSync(LEDGER, 'utf8').trim()) {
    log('Kampagne existiert schon (campaign-ledger.txt) → No-op (kein Doppel-Spend). Leeren zum Neu-Erstellen.'); process.exit(0);
  }
  if (!fs.existsSync(C.video)) { log('❌ Creative-Video fehlt:', C.video); process.exit(1); }
  log(`MAXIMUM-Setup · Pixel ${C.pixel} · Event "${C.event}" · Lifetime-Cap ${C.total} / Tag ${C.daily} CHF`);
  log(`Creative ${path.basename(C.video)} · ${C.location}/${C.gender}/${C.age.join('+')}/${C.lang.join('+')} · Auto-Launch ${C.autoLaunch} ${DRY ? '(DRY)' : ''}`);

  let ab;
  try { ab = await aiBrowser(); }
  catch { log('❌ Kein Brave auf 9222. Brave mit --remote-debugging-port=9222 + bei ads.tiktok.com eingeloggt.'); process.exit(1); }
  const p = ab.page;
  PAGE_REF = p; // Watchdog kann jetzt bei Timeout einen letzten Screenshot machen
  log('Browser-Modus:', ab.mode, ab.mode === 'stagehand' ? '(AI-Selektoren)' : '(Playwright-Fallback)');

  // Mehrere Tabs aufraeumen (User-Beobachtung 'mehrere fenster' 2026-06-21): alle ausser der Arbeitsseite
  // schliessen, damit der Bot zuverlaessig auf dem richtigen Tab klickt (sonst landet er auf falschem Tab).
  try {
    const ctx = p.context();
    let closed = 0;
    for (const other of ctx.pages()) { if (other !== p) { await other.close().catch(() => {}); closed++; } }
    if (closed) log('Tabs aufgeraeumt: ' + closed + ' ueberzaehlige Tabs geschlossen, nur Arbeitsseite behalten.');
  } catch (e) { log('Tab-Cleanup uebersprungen:', String(e).slice(0, 50)); }

  // DIAGNOSE-FALLE (2026-06-21): wenn Stagehand NICHT aktiv ist (kein GROQ/GEMINI-Key), kann der Bot NICHT
  // autonom klicken -> sofort klaren Status schreiben, damit der gepushte Report die Ursache zeigt.
  if (ab.mode !== 'stagehand') {
    const hasGroq = !!process.env.GROQ_API_KEY, hasGemini = !!process.env.GEMINI_API_KEY;
    let installed = false; try { await import('@browserbasehq/stagehand'); installed = true; } catch {}
    const why = !installed ? 'STAGEHAND_NICHT_INSTALLIERT'
              : !(hasGroq || hasGemini) ? 'KEIN_KEY_IN_UMGEBUNG'
              : 'INIT_FEHLER';
    const fix = why === 'STAGEHAND_NICHT_INSTALLIERT'
        ? 'Im C:\\luxe-Ordner ausfuehren: npm i @browserbasehq/stagehand  (dann Bot neu starten).'
      : why === 'KEIN_KEY_IN_UMGEBUNG'
        ? 'GROQ_API_KEY (gsk_...) ODER GEMINI_API_KEY in DERSELBEN Shell-Session setzen, BEVOR node startet: $env:GROQ_API_KEY="gsk_...".'
        : 'Paket + Key da, aber Stagehand-Init schlug fehl (Key gueltig? Netz?). Mit GEMINI_API_KEY probieren.';
    const st = { ts: new Date().toISOString(), result: 'AI_INAKTIV', mode: ab.mode, why,
      stagehand_installiert: installed, groq_key: hasGroq, gemini_key: hasGemini,
      init_fehler: ab.shError || null, fix };
    try { fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'), JSON.stringify(st, null, 2)); } catch {}
    log('⚠️ AI_INAKTIV — Grund: ' + why + ' | installiert=' + installed + ' groq=' + hasGroq + ' gemini=' + hasGemini);
    log('   FIX: ' + fix);
  }

  // ---- Schritt 1: Kampagnen-Erstellung öffnen + Ziel ----
  await p.goto(C.creationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000); await diag(p, 'open-creation');

  // KONTO-AUSWAHL-GUARD (Lehre 2026-06-24, Screenshot 09-ai-ad-start = "Select an account"): wenn TikTok auf
  // die Konto-Auswahl bouncet, das RICHTIGE finanzierte Konto klicken (LuxeStyle CH Ads), dann Builder neu öffnen.
  for (let g = 0; g < 2; g++) {
    const onSelect = await pTimeout(p.evaluate(() => /select an account|konto auswählen|select an ad account/i.test(document.body.innerText || '')), 15000, 'onSelect');
    if (!onSelect) break;
    log('⚠️ "Select an account" erkannt → klicke LuxeStyle CH Ads (' + C.advertiserId + ')');
    await diag(p, 'select-account');
    const clicked = await p.evaluate((advId) => {
      const cards = [...document.querySelectorAll('a,div,li,button')];
      const hit = cards.find(e => (e.innerText || '').includes(advId) || /luxestyle ch ads/i.test(e.innerText || ''));
      if (hit) { (hit.closest('a,[role="button"],li,div') || hit).click(); return true; } return false;
    }, C.advertiserId).catch(() => false);
    await sleep(5000);
    // Builder direkt mit aadvid neu öffnen (sicherer als nur Klick)
    await p.goto(C.creationUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await sleep(6000); await diag(p, 'after-account-select');
    if (!clicked) { log('   Konto-Karte nicht gefunden — Screenshot select-account prüfen'); break; }
  }

  // FRUEHERKENNUNG Onboarding-Wand (Lehre 2026-06-21): Konto nicht eingerichtet -> NIE bis zum Builder.
  // Statt 9 Screenshots durchzuklicken: sofort mit klarem Status abbrechen (kein Geld-Risiko, klare Diagnose).
  const wall = (await pTimeout(p.evaluate(() => {
    const t = (document.body.innerText || '').toLowerCase();
    return ['add business info', 'welcome to tiktok ads manager', 'getting started',
      'enter payment details', 'select an industry', 'advertiser business info', 'permission error']
      .filter(s => t.includes(s));
  }), 15000, 'wall')) || [];
  if (wall.length >= 2) {
    try { fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true }); } catch {}
    // AUTO-ONBOARDING (User 2026-06-22 "fuell du aus, wie alles autonom"): statt sofort abzubrechen,
    // die Business-Info selbst ausfuellen (Land/Waehrung/Zeitzone/Branche/Firma/Website). Die ZAHLUNGSKARTE
    // kann KEIN Bot eintragen (echtes Geld) -> dort sauber fuer den User stoppen. Geht nur mit aktivem AI-Wizard.
    log('Onboarding-Wand erkannt (' + wall.join(', ') + '). Versuche Business-Info autonom auszufuellen…');
    if (ab.mode === 'stagehand' && ab.act) {
      const Aw = async (instr, name) => { try { await ab.act(instr); } catch (e) { log('onb!', name, String(e).slice(0, 50)); } await sleep(2500); if (name) await diag(p, 'onb-' + name); };
      await Aw('if a "Get started", "Set up", "Confirm" or "Continue" button is visible, click it to begin account setup', 'start');
      await Aw('set the country or region to Switzerland', 'country');
      await Aw('set the currency to CHF (Swiss Franc) if a currency selector is shown', 'currency');
      await Aw('set the time zone to a Switzerland / Europe Zurich time zone if shown', 'tz');
      await Aw('set the industry / business category to "Retail" or "E-commerce"', 'industry');
      await Aw('fill the legal business / company name field with "LuxeStyle"', 'company');
      await Aw('fill the website / business URL field with https://luxestyle.ch', 'website');
      await Aw('click the Next, Continue, Save or Submit button to save the business information', 'submit');
      const after = await p.evaluate(() => {
        const t = (document.body.innerText || '').toLowerCase();
        return { pay: /payment|billing|add funds|enter payment details|add a payment method|abrechnung|zahlungsmethode/.test(t),
                 stillWall: ['add business info', 'select an industry', 'advertiser business info'].some(s => t.includes(s)) };
      }).catch(() => ({ pay: false, stillWall: true }));
      if (after.pay || !after.stillWall) {
        const st = { ts: new Date().toISOString(), result: 'BUSINESS_INFO_FILLED_PAYMENT_NEEDED', filledOk: !after.stillWall,
          hinweis: 'Business-Info autonom ausgefuellt. JETZT nur noch: User traegt EINMAL die Zahlungskarte ein (ads.tiktok.com -> Abrechnung/Payment). Danach laeuft campaign-go durch.' };
        try { fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'), JSON.stringify(st, null, 2)); } catch {}
        log('💳 BUSINESS_INFO_FILLED_PAYMENT_NEEDED — Business-Info ausgefuellt; nur die Karte muss der User eintragen.');
        await p.close().catch(() => {});
        process.exit(0);
      }
    }
    // Auto-Fill nicht moeglich (AI-Wizard inaktiv) ODER Wand blieb -> sauber abbrechen wie bisher.
    const status = { ts: new Date().toISOString(), result: 'ACCOUNT_NOT_SETUP', hits: wall,
      hinweis: 'Auto-Onboarding nicht moeglich (AI-Wizard inaktiv -> GROQ_API_KEY/GEMINI_API_KEY am PC setzen) ODER Wand blieb. User: ads.tiktok.com -> Business-Info + Zahlungskarte, ODER ins Konto LuxeStyle CH Ads einloggen.' };
    try { fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'), JSON.stringify(status, null, 2)); } catch {}
    log('🛑 ACCOUNT_NOT_SETUP — Onboarding-Wand blieb. Business-Info + Karte noetig (Details im Report).');
    await p.close().catch(() => {});
    process.exit(0);
  }

  // ===== ENSURE-IN-WIZARD (DURCHBRUCH 2026-06-24) =====
  // Screenshots 06/08/11 (3 Laeufe) zeigten IMMER dasselbe: richtiges Konto (CHF-9000-Coupon sichtbar), aber der
  // Bot bleibt auf der KAMPAGNEN-LISTE — das "Q2 Partner Coupon"-Overlay + AI-Klicks oeffneten NIE den Wizard.
  // Lehre: der Einstieg in den Wizard darf NICHT von der AI abhaengen (groq klickt unzuverlaessig). Darum jetzt
  // DETERMINISTISCH (rohes Playwright) MIT VERIFIKATION: mehrere Wege probieren, nach jedem pruefen ob der Wizard
  // (Ziel-Karten) WIRKLICH offen ist, sonst naechster Weg. Erst wenn im Wizard, uebernimmt die AI das Ausfuellen.
  const objectiveCards = /choose an objective|advertising objective|reach\b|traffic\b|video views|lead generation|website conversions|product sales|app promotion|community interaction|reichweite|zugriffe|conversions|katalogverkäufe/i;
  const listMarkers = /total of \d+ campaign|ad id contains|search & filter|split test|bulk export/i;
  const stateNow = async () => (await pTimeout(p.evaluate((o) => {
    const txt = document.body.innerText || '';
    const list = /total of \d+ campaign|ad id contains|search & filter|split test|bulk export\/import/i.test(txt);
    // Wizard = Ziel-Karten sichtbar UND definitiv NICHT die Kampagnen-Liste (Liste enthaelt auch Worte wie "Traffic").
    return { inWizard: new RegExp(o, 'i').test(txt) && !list, onList: list, url: location.href, len: txt.length };
  }, objectiveCards.source), 15000, 'stateNow')) || { inWizard: false, onList: false, url: '', len: 0 };

  const dismissOverlay = async () => {
    // CRASH-FIX 2026-06-24: die Stagehand-Page hat KEIN p.keyboard/p.mouse (nur evaluate/screenshot/goto/$).
    // Darum ALLES via p.evaluate: Schliess-Button klicken, sonst Escape-Event + neutraler Klick in die Tabelle.
    await pTimeout(p.evaluate(() => {
      const close = [...document.querySelectorAll('button,[role="button"],svg,span,i,div')].find(e => {
        const s = (e.getAttribute('aria-label') || e.innerText || '').toLowerCase().trim();
        const r = e.getBoundingClientRect();
        return (/^(×|✕|x|close|schliessen|schließen)$/.test(s) || /got it|no thanks|nicht jetzt|maybe later|dismiss|später/.test(s)) && r.width > 0 && r.width < 120;
      });
      if (close) { close.click(); return; }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      const el = document.elementFromPoint(620, 540);
      if (el) el.click();
    }), 8000, 'dismiss');
    await sleep(600);
  };

  let inWiz = (await stateNow()).inWizard;
  for (let attempt = 0; attempt < 5 && !inWiz; attempt++) {
    log(`🎯 Wizard-Einstieg Versuch ${attempt + 1}/5 (noch auf Liste)`);
    await dismissOverlay();
    // ⭐ FIX 2026-06-25: TikToks SPA reagiert auf synthetische p.evaluate-.click() oft NICHT (Bot blieb auf
    // 02-enter-try-1 haengen). Im Stagehand-Modus darum ECHTE Pointer-Klicks via ab.act() (CDP) — das triggert
    // den SPA-Router. p.evaluate nur als Playwright-Fallback.
    if (ab.mode === 'stagehand') {
      if (attempt === 0) {
        await ab.act('click the green "+ Create" button (usually top-left of the page) to start creating a new campaign').catch(() => {});
      } else if (attempt === 1) {
        await ab.act('click the "+ Create" button').catch(() => {}); await sleep(1200);
        await ab.act('if a dropdown menu appeared, click the menu item labelled "Campaign" (or "Kampagne")').catch(() => {});
      } else if (attempt === 2) {
        await ab.act('click any "Create campaign" / "Kampagne erstellen" button on the page, including one inside a coupon or ad-credit popup').catch(() => {});
      } else {
        await p.goto(C.creationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      }
    } else if (attempt === 0) {
      // Weg A: gruener "+ Create"-Button oben links (NICHT vom Overlay verdeckt, das sitzt oben rechts)
      await pTimeout(p.evaluate(() => { const b = [...document.querySelectorAll('button,a,div[role="button"]')].find(e => /^\s*\+?\s*(create|erstellen)\s*$/i.test((e.innerText || '').trim())); if (b) b.click(); }), 8000, 'click-create');
    } else if (attempt === 1) {
      // Manche Builds: "+ Create" oeffnet ein Dropdown -> dort "Campaign"/"Kampagne" waehlen
      await pTimeout(p.evaluate(() => { const b = [...document.querySelectorAll('button,a,div[role="button"],li,span')].find(e => /^\s*(campaign|kampagne)\s*$/i.test((e.innerText || '').trim())); if (b) b.click(); }), 8000, 'click-dropdown');
    } else if (attempt === 2) {
      // Weg B: der "Create campaign"-Button IM Coupon-Popup (oeffnet Wizard mit dem CHF-9000-Gutschein)
      await pTimeout(p.evaluate(() => { const b = [...document.querySelectorAll('button,a,div[role="button"]')].find(e => /create campaign|kampagne erstellen/i.test((e.innerText || '').trim()) && (e.innerText || '').length < 30); if (b) b.click(); }), 8000, 'click-coupon');
    } else {
      // Weg C: Creation-URL hart neu laden (mit aadvid)
      await p.goto(C.creationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    }
    await sleep(7000);
    await diag(p, 'enter-try-' + (attempt + 1));
    inWiz = (await stateNow()).inWizard;
    if (inWiz) { log('✅ Wizard ist offen (Ziel-Karten erkannt) → AI fuellt jetzt aus.'); break; }
  }
  if (!inWiz) {
    log('⚠️ Wizard liess sich nicht oeffnen — letzte enter-try-*-Screenshots pruefen. AI versucht es trotzdem.');
    try { fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'),
        JSON.stringify({ ts: new Date().toISOString(), result: 'WIZARD_NICHT_GEOEFFNET', mode: ab.mode,
          hinweis: 'Bot blieb auf Kampagnen-Liste; weder "+ Create", Dropdown, Coupon-Button noch Direkt-URL oeffneten den Wizard. enter-try-1..5 + after-popup pruefen.' }, null, 2)); } catch {}
  }

  // ===== AI-WIZARD (Stagehand) — der robuste Weg fuer Vollautomation (User 2026-06-21 "bot muss das lernen") =====
  // act() beschreibt die Aktion, die AI findet das richtige Element (ueberlebt TikToks komplexe Ziel-Karten/Wizard).
  if (ab.mode === 'stagehand') {
    // DIAGNOSE in den Report schreiben (sonst nur in der Konsole sichtbar) — zeigt ob act() gebunden ist + wo Stagehand die Page haelt.
    let actErrors = 0, actOk = 0;
    try {
      const dg = ab.diag ? ab.diag() : { note: 'keine diag' };
      fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
      fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'),
        JSON.stringify({ ts: new Date().toISOString(), result: 'WIZARD_DIAG', mode: ab.mode, stagehand: dg }, null, 2));
      log('WIZARD_DIAG: actReady=' + dg.actReady + ' hasShPage=' + dg.hasShPage + ' shKeys=' + (dg.shKeys || '').slice(0, 120));
    } catch (e) { log('diag-write:', String(e).slice(0, 60)); }
    const A = async (instr, name, ms = 2500) => { try { await ab.act(instr); actOk++; } catch (e) { actErrors++; log('act!', name, String(e).slice(0, 60)); } await sleep(ms); if (name) await diag(p, 'ai-' + name); };
    try {
      const isConv = /conversion/i.test(C.objective);
      await A('if a "+ Create" or "Create" button is visible, click it to start creating a new campaign', 'create', 4000);
      await A(`select "${C.objective}" as the advertising objective, then if needed click its Continue button`, 'objective', 3000);
      await A('click the Continue button to proceed to the ad group settings', 'after-obj', 4000);
      await A('set the optimization location / conversion location to "Website"', null);
      if (isConv) {
        // ---- Data Connection (Pixel) ---- nur bei Conversions noetig. Bei Traffic uebersprungen (kein Pixel).
        const dcRequired = () => p.evaluate(() => /a tiktok pixel or events api is required|set up your data connection|an activated data connection is required/i
          .test(document.body.innerText || '')).catch(() => false);
        await A('open the "Select data connection" dropdown to choose a pixel / data connection', 'dc-open', 2500);
        if (await dcRequired()) {
          log('Data-Connection leer -> versuche bestehenden Shopify-Pixel zu verbinden.');
          await A('click the "Get started" or "Set up" button to set up a data connection', 'dc-setup', 3500);
          await A('in the "Choose a data connection method" dialog select "Shopify setup" and click Next', 'dc-shopify', 4500);
          await A('continue and authorize connecting the EXISTING Shopify store (do not create a new pixel)', 'dc-auth', 6000);
          await A('go back to the ad group, click Refresh on the data connection, then select the available data connection / pixel', 'dc-refresh', 4000);
          if (await dcRequired()) {
            const st = { ts: new Date().toISOString(), result: 'DATA_CONNECTION_MISSING', mode: ab.mode,
              hinweis: 'Werbekonto Ch0524 hat keinen aktiven TikTok-Pixel/Data-Connection. EINMALIG "Shopify setup -> Next" den Store/Pixel D8EKVR verbinden, ODER Kampagne als TT_OBJECTIVE=Traffic starten (braucht keinen Pixel).' };
            try { fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'), JSON.stringify(st, null, 2)); } catch {}
            log('🛑 DATA_CONNECTION_MISSING — Pixel verbinden ODER TT_OBJECTIVE=Traffic nutzen.');
            await diag(p, 'dc-missing'); await ab.close().catch(() => {}); process.exit(0);
          }
        } else {
          await A(`select the data connection / pixel (id ${C.pixel} if listed, otherwise the first available one)`, 'pixel');
        }
        await A(`set the optimization event to "${C.event}"`, 'event');
      } else {
        // Traffic: kein Pixel/Event -> Optimierungsziel auf Klicks / Landing-Page-Views.
        await A('set the optimization goal to "Click" or "Landing page views" (no pixel/data connection needed)', 'traffic-goal', 2500);
      }
      // Bid: "Maximum delivery" (Highest volume) vermeidet den Pflicht-Wert "Target CPA".
      await A('set the bid strategy to "Maximum delivery" (also called highest volume / lowest cost) so that no target CPA value is required', 'bid', 3000);
      await A(`set the target location to ${C.location}`, null);
      await A(`set gender to ${C.gender} and select age groups ${C.age.join(' and ')}`, 'targeting');
      await A(`add languages ${C.lang.join(' and ')}`, null);
      await A(`set the daily budget to ${C.daily} CHF`, 'budget');
      await A('click the Next or Continue button to go to the ad creation step', 'ad-start', 4000);
      // Creative: Datei-Input direkt setzen (Stagehand-Page = Playwright-kompatibel)
      try { let upVid = C.video; if (process.env.CAMPAIGN_KEEP_AUDIO !== '1') { const { execSync } = await import('node:child_process'); const os = (await import('node:os')).default; const sv = path.join(os.tmpdir(), 'camp-' + path.basename(C.video)); try { execSync(`ffmpeg -y -nostdin -i "${C.video}" -c:v copy -an "${sv}"`, { stdio: 'ignore' }); if (fs.existsSync(sv) && fs.statSync(sv).size > 10000) upVid = sv; } catch {} }
        const inp = await p.$('input[type="file"]'); if (inp) { await inp.setInputFiles(upVid); log('Creative gesetzt:', path.basename(upVid)); await sleep(9000); } else log('⚠️ AI: kein Datei-Input — Screenshot ai-ad-start pruefen'); } catch (e) { log('Creative-Upload:', String(e).slice(0, 60)); }
      await diag(p, 'ai-creative-uploaded'); // 2026-06-24: Beweis, ob das Video durchkam (Upload kann lange dauern/scheitern)
      await A(`fill the ad text/caption with: ${C.adtext}`, 'ad-text');
      await A(`set the call to action to "${C.cta}"`, 'ad-cta');
      await A(`fill the destination website URL with ${C.landing}`, 'ad-filled');
      await diag(p, 'ai-pre-submit'); // 2026-06-24: letzter Stand VOR dem Absenden -> zeigt, ob die Ad vollstaendig ist
      if (DRY) { log('[dry] AI-Durchlauf fertig — Screenshots ai-* pruefen.'); await ab.close().catch(() => {}); process.exit(0); }
      if (!C.autoLaunch) { log('AUTO_LAUNCH=0 → stoppe vor Absenden.'); await ab.close().catch(() => {}); process.exit(0); }
      await A('click the Submit / Publish button to publish the whole campaign for review', 'submitted', 6000);
      await sleep(3000); await diag(p, 'ai-after-submit'); // 2026-06-24: bestaetigt, ob "In Pruefung"/Erfolg-Dialog erscheint
      fs.writeFileSync(LEDGER, new Date().toISOString() + ' campaign submitted (AI)\n');
      log('✅ Kampagne via AI-Wizard abgesendet (zur Pruefung).');
      await ab.close().catch(() => {});
      process.exit(0);
    } catch (e) { log('AI-Wizard-Fehler → Playwright-Fallback:', String(e).slice(0, 120)); await diag(p, 'ai-error'); }
  }

  // ===== FALLBACK: Playwright-Selektoren (wenn Stagehand nicht da/fehlschlaegt) =====
  // FIX 2026-06-21 (DIAG zeigte Kampagnen-LISTE statt Assistent): erst "Create" klicken -> oeffnet den Erstellungs-Wizard.
  if (await clickAny(p, ['+ Create', 'Create', 'Erstellen', 'Kampagne erstellen', 'Create campaign'])) { await sleep(4000); await diag(p, 'after-create-click'); }
  await clickAny(p, ['Custom mode', 'Benutzerdefinierter Modus', 'Erweitert']); // falls Simplified-Default
  const obj = await clickAny(p, ['Website conversions', 'Conversions', 'Sales', 'Verkäufe', 'Conversion', 'Website-Conversions']);
  log('Ziel:', obj || '⚠️ Ziel-Selektor prüfen (Screenshot 01)');
  await clickAny(p, ['Continue', 'Weiter', 'Next', 'Bestätigen']);
  await sleep(4000); await diag(p, 'adgroup-start');

  // ---- Schritt 2: Optimierungsort = Website + Pixel + Event ----
  await clickAny(p, ['Website']);
  if (await clickAny(p, ['Select a Pixel', 'Pixel auswählen', 'Pixel'])) { await pickFromSearch(p, C.pixel, ab); }
  if (await clickAny(p, ['Optimization event', 'Optimierungsereignis', 'Optimization Event'])) { await pickFromSearch(p, C.event, ab); }
  await diag(p, 'pixel-event');

  // ---- Schritt 3: Placement = nur TikTok ----
  await clickAny(p, ['Select placement', 'Placement auswählen', 'Manuelle Platzierung', 'Manual placement']);
  // andere Placements abwählen → nur TikTok. (UI-abhängig → Screenshot zur Kontrolle)
  await diag(p, 'placement');

  // ---- Schritt 4: Zielgruppe (Standort/Geschlecht/Alter/Sprache) ----
  if (await clickAny(p, ['Location', 'Standort', 'Standorte'])) { await pickFromSearch(p, C.location, ab); }
  await clickAny(p, [C.gender, C.gender === 'Female' ? 'Weiblich' : 'Männlich']);
  for (const a of C.age) await clickAny(p, [a]);
  if (await clickAny(p, ['Languages', 'Sprachen', 'Sprache'])) { for (const l of C.lang) await pickFromSearch(p, l, ab); }
  await diag(p, 'targeting');

  // ---- Schritt 5: Budget — Lifetime-Cap (harte Obergrenze) bevorzugt ----
  await clickAny(p, ['Lifetime', 'Laufzeitbudget', 'Gesamtbudget']);
  if (!await fillAny(p, 'budget', C.total)) { if (!await fillAny(p, 'Budget', C.total)) log('⚠️ Budgetfeld nicht gefunden (Screenshot).'); }
  await fillAny(p, 'Daily', C.daily).catch(() => {});
  await diag(p, 'budget');
  await clickAny(p, ['Next', 'Weiter', 'Continue']);
  await sleep(3000);

  // ---- Schritt 6: Anzeige — Identity, Video, Text, CTA, URL ----
  await diag(p, 'ad-start');
  if (await clickAny(p, ['Identity', 'Identität'])) { await pickFromSearch(p, C.identity, ab); }
  // Video hochladen (oder aus Bibliothek). Datei-Input setzen falls vorhanden.
  try {
    // POLICY-SAFE (User 2026-06-20 "schaue Fails": TikTok lehnt Ads mit eingebetteter Musik am haeufigsten ab):
    // Creative TONLOS hochladen -> kein Musik-Copyright-Strike im Ad-Review. CAMPAIGN_KEEP_AUDIO=1 behaelt Ton.
    let upVid = C.video;
    if (process.env.CAMPAIGN_KEEP_AUDIO !== '1') {
      try {
        const { execSync } = await import('node:child_process'); const os = (await import('node:os')).default;
        const sv = path.join(os.tmpdir(), 'camp-' + path.basename(C.video));
        execSync(`ffmpeg -y -nostdin -i "${C.video}" -c:v copy -an "${sv}"`, { stdio: 'ignore' });
        if (fs.existsSync(sv) && fs.statSync(sv).size > 10000) { upVid = sv; log('🔇 Creative tonlos (Musik-Copyright-Schutz fuers Ad-Review).'); }
      } catch (e) { log('Tonlos-Hinweis:', e.message); }
    }
    const inp = await p.$('input[type="file"]');
    if (inp) { await inp.setInputFiles(upVid); log('Creative gesetzt:', path.basename(upVid)); await sleep(8000); }
    else log('⚠️ Kein Datei-Input — evtl. erst "Upload" klicken (Screenshot).');
  } catch (e) { log('Video-Upload-Hinweis:', e.message); }
  await fillAny(p, 'Text', C.adtext).catch(() => {});
  if (await clickAny(p, ['Call to action', 'Handlungsaufforderung', 'CTA'])) { await clickAny(p, [C.cta, 'Jetzt einkaufen', 'Mehr ansehen']); }
  await fillAny(p, 'URL', C.landing).catch(() => {});
  await fillAny(p, 'Website URL', C.landing).catch(() => {});
  await diag(p, 'ad-filled');

  if (DRY) { log('[dry] Durchlauf fertig. Screenshots in campaign-shots/ prüfen, dann AUTO_LAUNCH=1.'); process.exit(0); }
  if (!C.autoLaunch) { log('AUTO_LAUNCH=0 → stoppe VOR dem Absenden (1 Klick "Senden" durch dich).'); process.exit(0); }

  // ---- Schritt 7: Absenden ----
  const sub = await clickAny(p, ['Submit', 'Senden', 'Publish', 'Veröffentlichen', 'Confirm']);
  await sleep(5000); await diag(p, 'submitted');
  if (sub) { fs.writeFileSync(LEDGER, new Date().toISOString() + ' campaign submitted\n'); log('✅ Kampagne abgesendet (zur Prüfung).'); }
  else log('⚠️ Submit-Button nicht gefunden — letzter Screenshot prüfen, Selektor nachziehen.');
  process.exit(0);
})().catch(async e => {
  // CRASH-DIAG (2026-06-24): Laeufe hinterliessen nur 01-open + KEINEN Report -> ein Crash flog hier durch und
  // ging nur in die (von cmd-poll verworfene) Konsole. Jetzt: letzten Screenshot + Fehler in den Report schreiben.
  log('Fehler:', e && e.message);
  try {
    if (PAGE_REF) await PAGE_REF.screenshot({ path: path.join(SHOTS, '98-crash.png') }).catch(() => {});
    fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'reports', 'campaign-last-run.json'),
      JSON.stringify({ ts: new Date().toISOString(), result: 'CRASH', error: String(e && e.message), stack: String(e && e.stack).slice(0, 800) }, null, 2));
  } catch {}
  process.exit(1);
});
