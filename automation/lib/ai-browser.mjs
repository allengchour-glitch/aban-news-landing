/* LuxeStyle — ai-browser.mjs  ·  AI-Selektoren-Wrapper (Recherche 2026: Stagehand, MIT)
 * =============================================================================================
 * Macht Browser-Bots robust gegen UI-Aenderungen: statt fragiler CSS-Selektoren beschreibt man die
 * Aktion ("klick Veroeffentlichen") und ein LLM loest sie zur Laufzeit gegen den Accessibility-Tree.
 * Stagehand ist CDP-nativ -> haengt an das laufende Brave (Port 9222). Faellt sauber auf Playwright
 * zurueck, wenn Stagehand (noch) nicht installiert ist -> Bots brechen nie, migrieren schrittweise.
 *
 *   import { aiBrowser } from '../lib/ai-browser.mjs';
 *   const { mode, page, act, extract, close } = await aiBrowser();
 *   if (mode === 'stagehand') { await act('klicke den Button Veroeffentlichen'); }
 *   else { /* Fallback: page = Playwright-Page, eigene Selektoren *\/ }
 *
 * Aktivieren: am PC `npm i @browserbasehq/stagehand` + GROQ_API_KEY/GEMINI_API_KEY in luxe-secrets.ps1.
 */
const CDP = process.env.CDP_URL || 'http://localhost:9222';

let lastInitError = null; // letzter Stagehand-Init-Fehler (fuer Diagnose im Bot-Report)

export async function aiBrowser({ cdp = CDP } = {}) {
  lastInitError = null;
  // 1) Versuch: Stagehand (AI-Selektoren). Mehrere Modell-Configs durchprobieren (Gemini zuerst =
  //    nativ am robustesten in Stagehand; dann Groq). Echten Init-Fehler merken statt verschlucken.
  try {
    const mod = await import('@browserbasehq/stagehand').catch((e) => { lastInitError = 'import: ' + String(e).slice(0, 120); return null; });
    if (mod && (mod.Stagehand || mod.default)) {
      const Stagehand = mod.Stagehand || mod.default;
      // CDP-WS-Adresse aufloesen: Stagehand baut aus http://...:9222 sonst eine falsche WS-URL -> 404.
      // Brave/Chrome liefern unter /json/version die echte webSocketDebuggerUrl (ws://...).
      let cdpUrl = cdp;
      try {
        const base = cdp.replace(/\/$/, '');
        const r = await fetch(base + '/json/version');
        const j = await r.json();
        if (j && j.webSocketDebuggerUrl) { cdpUrl = j.webSocketDebuggerUrl; console.log('CDP-WS aufgeloest: ' + cdpUrl); }
      } catch (e) { console.log('CDP /json/version nicht erreichbar (' + String(e).slice(0, 50) + ') -> nutze ' + cdp); }
      const candidates = [];
      if (process.env.GEMINI_API_KEY) candidates.push({ modelName: 'google/gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY });
      if (process.env.GEMINI_API_KEY) candidates.push({ modelName: 'gemini-2.0-flash', apiKey: process.env.GEMINI_API_KEY });
      if (process.env.GROQ_API_KEY) candidates.push({ modelName: 'groq/llama-3.3-70b-versatile', apiKey: process.env.GROQ_API_KEY });
      for (const c of candidates) {
        try {
          const sh = new Stagehand({ env: 'LOCAL', localBrowserLaunchOptions: { cdpUrl }, modelName: c.modelName,
            modelClientOptions: { apiKey: c.apiKey }, verbose: 0 });
          await sh.init();
          await new Promise(r => setTimeout(r, 1500)); // sh.page populiert teils verzoegert nach init
          // Stagehand-Page (hat .act/.extract) lazy lesen — NICHT durch eine rohe Context-Page ersetzen
          // (die hat kein .act). Fuer goto/Screenshots/File-Input reicht eine rohe Page.
          const stPage = () => sh.page || sh.stagehandPage || (sh.context && sh.context.page) || null;
          let rawPage = stPage();
          if (!rawPage) {
            const ctx = sh.context || sh.stagehandContext;
            console.log('sh.page leer nach init; sh-Keys: ' + Object.keys(sh).join(','));
            if (ctx && typeof ctx.pages === 'function') {
              const pgs = ctx.pages();
              rawPage = pgs.find(p => { try { return /tiktok\.com/.test(p.url()); } catch { return false; } }) || pgs[0];
              if (!rawPage && ctx.newPage) rawPage = await ctx.newPage();
            }
          }
          if (!rawPage) { lastInitError = c.modelName + ' -> init ok, aber keine Page'; console.log(lastInitError); try { await sh.close(); } catch {} continue; }
          const actPage = () => { const sp = stPage(); return (sp && typeof sp.act === 'function') ? sp : (typeof rawPage.act === 'function' ? rawPage : null); };
          console.log('Stagehand aktiv mit Modell ' + c.modelName + (sh.page ? '' : ' (raw-Page fuer goto, sh.page lazy fuer act)'));
          // Diagnose, damit der Bot sie in den gepushten Report schreiben kann (sonst nur in der Konsole sichtbar).
          const diag = () => { let shKeys = ''; try { shKeys = Object.keys(sh).join(','); } catch {} let proto = ''; try { proto = Object.getOwnPropertyNames(Object.getPrototypeOf(sh) || {}).join(','); } catch {} return { model: c.modelName, hasShPage: !!sh.page, shPageType: typeof sh.page, rawHasAct: typeof rawPage.act, actReady: !!actPage(), shKeys, shProto: proto }; };
          return {
            mode: 'stagehand', model: c.modelName, sh, page: rawPage, diag,
            act: (instr) => { const ap = actPage(); if (!ap) throw new Error('Keine Stagehand-act-Page verfuegbar'); return ap.act(instr); },
            extract: (instr, schema) => { const ap = actPage() || rawPage; return ap.extract(schema ? { instruction: instr, schema } : instr); },
            observe: (instr) => { const ap = actPage() || rawPage; return ap.observe ? ap.observe(instr) : []; },
            close: () => sh.close().catch(() => {}),
          };
        } catch (e) {
          lastInitError = c.modelName + ' -> ' + String(e && e.message ? e.message : e).slice(0, 200);
          console.log('Stagehand init (' + c.modelName + ') fehlgeschlagen: ' + lastInitError);
        }
      }
    }
  } catch (e) { lastInitError = String(e && e.message ? e.message : e).slice(0, 200); console.log('Stagehand nicht nutzbar (' + lastInitError + ') -> Playwright-Fallback.'); }

  // 2) Fallback: rohes Playwright ueber CDP (heutiger Weg) — Bots nutzen ihre eigenen Selektoren.
  const { chromium } = await import('playwright-core');
  const b = await chromium.connectOverCDP(cdp);
  const ctx = b.contexts()[0] || await b.newContext();
  const page = await ctx.newPage();
  return {
    mode: 'playwright', browser: b, page, shError: lastInitError,
    act: async () => { throw new Error('act() braucht Stagehand — installiere @browserbasehq/stagehand'); },
    extract: async () => { throw new Error('extract() braucht Stagehand'); },
    observe: async () => [],
    close: () => page.close().catch(() => {}),
  };
}
