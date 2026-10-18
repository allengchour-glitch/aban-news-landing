/**
 * HTTP-Status einer Seite holen — mit Geduld, und 429 NICHT mit 404 verwechseln.
 *
 * WARUM (Lehre vom 04.10., die an einem Tag DREIMAL zugeschlagen hat): „HTTP 429 ist nicht 404."
 * Dreimal hätte ich gesunde Shop-Seiten für tot erklärt, weil der Rand-Cache gerade drosselte.
 * `site-health.mjs` wertete jeden Status ≠ 200 als Problem und hätte bei 404 sogar automatisch
 * publiziert — eine Drosselung sah damit wie ein kaputter Shop aus und löste einen Telegram-Alarm
 * (und eine unnötige Änderung am Shop) aus.
 *
 * Darum: bei 429, 5xx und Netzfehlern mit wachsender Pause nachfassen. Erst wenn der Status
 * MEHRMALS derselbe bleibt, gilt er. Zurück kommt der Status plus wie oft nachgefasst wurde.
 */
export async function statusMitGeduld(url, opt = {}) {
  const versuche = opt.versuche ?? 4;
  const basis = opt.basisMs ?? 1500;
  const fetchFn = opt.fetch ?? fetch;
  const warte = opt.warte ?? (ms => new Promise(r => setTimeout(r, ms)));
  const unsicher = (s) => s === 0 || s === 429 || s >= 500;
  let status = 0, nachgefasst = 0;
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetchFn(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(),
        { headers: { 'Cache-Control': 'no-cache' } });
      status = r.status;
    } catch { status = 0; }
    if (!unsicher(status)) return { status, nachgefasst, unsicher: false };
    if (i + 1 < versuche) { nachgefasst++; await warte(basis * 2 ** i); }
  }
  // Nach allen Versuchen weiter unsicher: das ist KEIN Befund, sondern „nicht messbar".
  return { status, nachgefasst, unsicher: true };
}
