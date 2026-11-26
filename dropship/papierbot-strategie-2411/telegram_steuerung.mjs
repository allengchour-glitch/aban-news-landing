// Telegram-Steuerung (Long-Polling). Nimmt NUR Nachrichten aus dem Chat mit der Nummer TG_CHAT an. Kein Schluessel der Boerse, keine Orders.
// Umgebung: TG_TOKEN (Bot-Token), TG_CHAT (deine Chat-Nummer). Aufruf: node telegram_steuerung.mjs <ordner>
import fs from 'node:fs';
import { antwort } from './steuerung.mjs';
export async function verarbeite(updates, chat, dir, senden, jetzt = Date.now()) {
  let off = null;
  for (const u of updates) {
    off = u.update_id + 1;
    const m = u.message; if (!m || String(m.chat?.id) !== String(chat) || String(m.from?.id) !== String(chat) || typeof m.text !== 'string') continue; // nur privater Chat des Besitzers
    await senden(antwort(m.text, dir, jetzt));
  }
  return off;
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const dir = process.argv[2] || '.', T = process.env.TG_TOKEN, C = process.env.TG_CHAT;
  if (!T || !C) { console.error('TG_TOKEN und TG_CHAT fehlen'); process.exit(1); }
  const api = (m, b) => fetch(`https://api.telegram.org/bot${T}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
  const of = `${dir}/tg_offset.json`; let offset = 0; try { offset = JSON.parse(fs.readFileSync(of, 'utf8')).offset || 0; } catch {}
  for (;;) {
    try {
      const r = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
      if (r.ok && r.result.length) { const n = await verarbeite(r.result, C, dir, t => api('sendMessage', { chat_id: C, text: t })); if (n) { offset = n; fs.writeFileSync(of, JSON.stringify({ offset })); } }
    } catch (e) { console.error('Fehler', String(e.message).replace(T, '***')); await new Promise(r => setTimeout(r, 5000)); }
  }
}
