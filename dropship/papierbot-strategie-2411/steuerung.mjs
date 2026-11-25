// Handy-Steuerung der Papier-Bots ueber Telegram-Befehle (nur Spielgeld, keine Boersenschluessel, keine Orders).
// Reine Logik ohne Netz: antwort(text, dir, jetzt) -> Antworttext. Dateien: steuerung.json (Pausen, offene Rueckfrage), ledger-*.json.
import fs from 'node:fs';
export const BOTS = ['btc-trend', 'korb', 'donchian', 'momentum', 'rueckkehr'];
const ALIAS = { btc: 'btc-trend', bitcoin: 'btc-trend', trend: 'btc-trend', ausbruch: 'donchian', rueckkehr: 'rueckkehr', mittel: 'rueckkehr' };
const NAMEN = { 'btc-trend': 'Bitcoin-Trend', korb: 'Korb', donchian: 'Ausbruch', momentum: 'Momentum', rueckkehr: 'Rueckkehr' };
const FRIST_MS = 5 * 60 * 1000;
export const botName = s => { const k = String(s || '').toLowerCase().replace(/^\/+/, '').trim(); return BOTS.includes(k) ? k : ALIAS[k] || null; };
const lade = (f, init) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return init; } };
const schreibe = (f, o) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o, null, 1)); fs.renameSync(t, f); };
const wert = l => (l.history?.length ? l.history.at(-1).equity : l.cash) ?? 0;
const fmt = (x, d = 2) => Number(x).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d });
function zeile(k, dir, pausiert) {
  const l = lade(`${dir}/ledger-${k}.json`, null);
  if (!l) return `${NAMEN[k]}: noch kein Ledger${pausiert ? ' (pausiert)' : ''}`;
  const s = l.start || 1000, w = wert(l), p = (w / s - 1) * 100;
  const pos = l.btc > 0 ? 'Bitcoin' : l.hold && Object.keys(l.hold).length ? Object.keys(l.hold).map(c => c.replace('USDT', '')).join(',') : 'Cash';
  return `${NAMEN[k]}${pausiert ? ' [PAUSE]' : ''}: ${fmt(w)} (${p >= 0 ? '+' : ''}${fmt(p, 1)} %), ${pos}, ${l.trades || 0} Trades, Gebuehren ${fmt(l.fees || 0)}`;
}
export function antwort(text, dir, jetzt = Date.now()) {
  const sf = `${dir}/steuerung.json`, st = lade(sf, { pausiert: [] });
  const [cmd0, arg] = String(text || '').trim().split(/\s+/); const cmd = (cmd0 || '').toLowerCase().replace(/@.*$/, '');
  if (cmd === '/status' || cmd === '/start') {
    const z = BOTS.map(k => zeile(k, dir, st.pausiert.includes(k)));
    const tot = BOTS.reduce((a, k) => { const l = lade(`${dir}/ledger-${k}.json`, null); return a + (l ? wert(l) : 0); }, 0);
    return `Papier-Bots (nur Spielgeld)\n${z.join('\n')}\nGesamt ${fmt(tot)}`;
  }
  if (cmd === '/pause' || cmd === '/weiter') {
    if (!arg) return `Welcher Bot? Beispiel: ${cmd} korb\nBots: ${BOTS.join(', ')}`;
    const alle = arg.toLowerCase() === 'alle', ziel = alle ? BOTS : [botName(arg)];
    if (!ziel[0]) return `Unbekannter Bot: ${arg}\nBots: ${BOTS.join(', ')}, alle`;
    const set = new Set(st.pausiert); for (const k of ziel) cmd === '/pause' ? set.add(k) : set.delete(k);
    schreibe(sf, { ...st, pausiert: [...set] });
    return cmd === '/pause' ? `Pausiert: ${ziel.map(k => NAMEN[k]).join(', ')}. Heute und an den folgenden Tagen kein Handel, bis /weiter. Offene Positionen bleiben stehen.` : `Wieder aktiv: ${ziel.map(k => NAMEN[k]).join(', ')}. Der naechste Tageslauf handelt wieder.`;
  }
  if (cmd === '/reset') {
    const k = botName(arg); if (!k) return `Welcher Bot? Beispiel: /reset donchian\nBots: ${BOTS.join(', ')}`;
    schreibe(sf, { ...st, reset: { bot: k, bis: jetzt + FRIST_MS } });
    return `Reset ${NAMEN[k]}: Ledger wird gesichert und der Bot startet mit 1000 Papier-USDT neu. Zum Bestaetigen innerhalb von 5 Minuten: /ja`;
  }
  if (cmd === '/ja') {
    const r = st.reset; if (!r || r.bis < jetzt) { if (r) schreibe(sf, { ...st, reset: undefined }); return 'Keine offene Rueckfrage (oder abgelaufen). Zuerst /reset <bot>.'; }
    const f = `${dir}/ledger-${r.bot}.json`;
    if (fs.existsSync(f)) fs.renameSync(f, `${f}.alt-${new Date(jetzt).toISOString().replace(/[:.]/g, '-')}`);
    schreibe(sf, { ...st, reset: undefined });
    return `${NAMEN[r.bot]} zurueckgesetzt. Altes Ledger gesichert (Endung .alt-...). Neues Ledger mit 1000 entsteht beim naechsten Tageslauf.`;
  }
  if (cmd === '/nein') { if (st.reset) schreibe(sf, { ...st, reset: undefined }); return 'Abgebrochen.'; }
  return 'Befehle:\n/status  Stand aller Bots\n/pause <bot|alle>  kein Handel mehr\n/weiter <bot|alle>  wieder handeln\n/reset <bot>  neu mit 1000 (mit /ja bestaetigen)\n/nein  Rueckfrage abbrechen\nBots: ' + BOTS.join(', ') + '\nNur Papiergeld, keine echten Orders.';
}
