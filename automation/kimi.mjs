/* kimi.mjs — Helper für die Kimi/Moonshot-API (kimi-k2). Key aus /tmp/kimi_key (NIE committen!).
 * Nutzung als Modul: import { kimi } from './kimi.mjs'; const txt = await kimi(system, user, {json:true});
 * Oder CLI: node automation/kimi.mjs "<system>" "<user>"
 */
import fs from 'node:fs';
const KEY = (process.env.KIMI_KEY || (fs.existsSync('/tmp/kimi_key') ? fs.readFileSync('/tmp/kimi_key','utf8').trim() : '')).trim();
const EP = 'https://api.moonshot.ai/v1/chat/completions';
const MODEL = process.env.KIMI_MODEL || 'kimi-k3';   // k3 liefert sauberen content (k2.6 war Reasoning-Modus → Antwort nur in reasoning_content)

export async function kimi(system, user, opts = {}) {
  if (!KEY) throw new Error('Kein Kimi-Key (/tmp/kimi_key)');
  const body = {
    model: MODEL, temperature: 1,
    max_tokens: opts.max_tokens || 2000,
    messages: [ system && { role:'system', content:system }, { role:'user', content:user } ].filter(Boolean),
  };
  if (opts.json) body.response_format = { type: 'json_object' };
  for (let a = 0; a < 3; a++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), opts.timeout || 180000);
    try {
      const r = await fetch(EP, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${KEY}` }, body: JSON.stringify(body), signal: ctrl.signal });
      clearTimeout(to);
      const j = await r.json();
      const msg = j.choices?.[0]?.message;
      // kimi-k2.6 ist ein Reasoning-Modell: echte Antwort in content, Denken in reasoning_content (Fallback)
      const content = (msg?.content && msg.content.trim()) ? msg.content : (msg?.reasoning_content || '');
      if (content && content.trim()) return content;
      if (j.error) { console.error('Kimi-Fehler:', j.error.message); if (a<2) { await new Promise(x=>setTimeout(x,3000)); continue; } return null; }
    } catch (e) { clearTimeout(to); console.error('Kimi-Timeout/Fehler, Versuch', a+1, e.message); }
    await new Promise(x=>setTimeout(x, 3000*(a+1)));
  }
  return null;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, sys, usr] = process.argv;
  const out = await kimi(sys || 'Du bist ein hilfreicher Assistent.', usr || 'Sag Hallo auf Schweizerdeutsch.', { json:false, max_tokens:1500 });
  console.log(out || '(keine Antwort)');
}
