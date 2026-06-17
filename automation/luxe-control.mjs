#!/usr/bin/env node
/* LuxeStyle — luxe-control.mjs  (CLOUD-STEUER-ZENTRALE — Claude steuert die ganze Maschine selbst)
 *
 * User 2026-06-17 „bou für di, dass du alles selber chasch stüre". EIN Befehl, mit dem die
 * Cloud-Session ALLE PC-/Browser-Aktionen über die Worker-Befehlsqueue auslöst (der PC-Listener
 * holt + führt aus) — ohne curl-Gebastel. Auch Status/Insights/Analyse abfragbar.
 *
 * Auth: WORKER-KEY NUR aus ENV LUXE_WORKER_KEY (NIE im Repo — öffentlich!). Worker-URL via ENV
 *       LUXE_WORKER oder Default (URL ist nicht geheim).
 *
 * Nutzung:
 *   LUXE_WORKER_KEY=… node automation/luxe-control.mjs <befehl>
 *   Befehle (PC-Queue):  tutti · anibis · tiktok · follower · all · deploy · campaign-dry ·
 *                        campaign-go · credits · ig-delete · engage
 *   Abfragen (sofort):   status · insights · replies · post (nächster IG/FB-Post)
 *   Mehrere:             node luxe-control.mjs deploy tutti anibis   (nacheinander queuen)
 */
const WORKER = process.env.LUXE_WORKER || 'https://luxe-poster.allengchour.workers.dev';
const KEY = process.env.LUXE_WORKER_KEY || '';
const args = process.argv.slice(2);
if (!KEY) { console.error('LUXE_WORKER_KEY fehlt (ENV) → kann nicht steuern.'); process.exit(1); }
if (!args.length) { console.error('Nutzung: node luxe-control.mjs <befehl> [..] (tutti|anibis|tiktok|deploy|campaign-dry|campaign-go|credits|status|insights|post)'); process.exit(1); }

// Befehl → Worker-Query
const QUERY = {
  status: 'status=1', insights: 'insights=1', replies: 'replies=1', post: '',
  // alles andere = PC-Queue-Befehl
};
const PC_CMDS = new Set(['tutti', 'anibis', 'tiktok', 'follower', 'all', 'deploy', 'campaign-dry', 'campaign-go', 'credits', 'ig-delete', 'engage']);
const u = (q) => `${WORKER}/?key=${encodeURIComponent(KEY)}${q ? '&' + q : ''}`;

(async () => {
  for (const a of args) {
    let q;
    if (a in QUERY) q = QUERY[a];
    else if (PC_CMDS.has(a)) q = 'cmd=' + encodeURIComponent(a);
    else { console.error(`?? unbekannter Befehl: ${a} (übersprungen)`); continue; }
    try {
      const r = await fetch(u(q), { signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      console.log(`[${a}] HTTP ${r.status}: ${t.slice(0, 240)}`);
    } catch (e) { console.error(`[${a}] Fehler: ${e.message}`); }
  }
})();
