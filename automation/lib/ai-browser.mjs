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

export async function aiBrowser({ cdp = CDP } = {}) {
  // 1) Versuch: Stagehand (AI-Selektoren). Dynamischer Import -> kein harter Dependency-Zwang.
  try {
    const mod = await import('@browserbasehq/stagehand').catch(() => null);
    if (mod && (mod.Stagehand || mod.default)) {
      const Stagehand = mod.Stagehand || mod.default;
      const modelName = process.env.GROQ_API_KEY ? 'groq/llama-3.3-70b-versatile'
        : process.env.GEMINI_API_KEY ? 'google/gemini-2.0-flash' : undefined;
      const sh = new Stagehand({ env: 'LOCAL', localBrowserLaunchOptions: { cdpUrl: cdp }, modelName,
        modelClientOptions: { apiKey: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY } });
      await sh.init();
      const page = sh.page;
      return {
        mode: 'stagehand', sh, page,
        act: (instr) => page.act(instr),
        extract: (instr, schema) => page.extract(schema ? { instruction: instr, schema } : instr),
        observe: (instr) => page.observe(instr),
        close: () => sh.close().catch(() => {}),
      };
    }
  } catch (e) { console.log('Stagehand nicht nutzbar (' + String(e).slice(0, 60) + ') -> Playwright-Fallback.'); }

  // 2) Fallback: rohes Playwright ueber CDP (heutiger Weg) — Bots nutzen ihre eigenen Selektoren.
  const { chromium } = await import('playwright-core');
  const b = await chromium.connectOverCDP(cdp);
  const ctx = b.contexts()[0] || await b.newContext();
  const page = await ctx.newPage();
  return {
    mode: 'playwright', browser: b, page,
    act: async () => { throw new Error('act() braucht Stagehand — installiere @browserbasehq/stagehand'); },
    extract: async () => { throw new Error('extract() braucht Stagehand'); },
    observe: async () => [],
    close: () => page.close().catch(() => {}),
  };
}
