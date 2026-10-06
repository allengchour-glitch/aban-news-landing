/**
 * server_runner_bilanz.mjs — REIN LESEND: was erreichen die CJ-Runner auf dem Server? (06.10.2026)
 * Verdacht: dem Server fehlen GROQ/GEMINI-Schlüssel (/etc/luxe/secrets.env hat nur Shopify/CJ/Judge.me) → jedes Produkt kostet
 * product/query (10 CJ-Punkte) und endet in «skip(gemini)». Zählt je Runner-Log die Ergebniszeilen der letzten Läufe.
 *   { "id": "server-runner-bilanz", "typ": "skript", "skript": "server_runner_bilanz.mjs" }
 */
import { execSync } from 'node:child_process';
const sh = (c) => { try { return execSync(c, { encoding: 'utf8', timeout: 30000 }).trim(); } catch (e) { return ''; } };
export default async function () {
  const aus = {};
  for (const f of sh('ls /tmp/cj_runner*.log /tmp/cj_queue_runner.log 2>/dev/null').split('\n').filter(Boolean)) {
    const n = (m) => Number(sh(`tail -c 3000000 "${f}" | grep -ac "${m}"`) || 0);
    aus[f.replace('/tmp/', '')] = { groesse_mb: Math.round(Number(sh(`stat -c %s "${f}"`) || 0) / 1e6),
      skip_gemini: n('skip(gemini)'), angelegt: n('✅'), skip_gewicht: n('skip(gewicht)'), punkte_leer: n('Insufficient API points'),
      letzte: sh(`tail -c 3000000 "${f}" | grep -aE "skip\\(gemini\\)|✅|Insufficient" | tail -2 | cut -c1-120`) };
  }
  aus.ki_schluessel_env = ['GROQ_API_KEY', 'GROQ_API_KEY2', 'GROQ_API_KEY3', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY'].map(k => `${k}:${process.env[k] ? 'da' : 'fehlt'}`);
  aus.gemini_key_datei = sh('test -s /tmp/gemini_key && echo da || echo fehlt');
  return aus;
}
