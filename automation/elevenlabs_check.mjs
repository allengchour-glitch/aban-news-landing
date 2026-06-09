#!/usr/bin/env node
/* ElevenLabs-Kontingent prüfen — elevenlabs_check.mjs
 * Fragt das verbleibende Zeichen-Kontingent des ElevenLabs-Kontos ab und schreibt
 * eine kurze Übersicht (genutzt / Limit / verbleibend / Reset). Zweck: Guthaben im
 * Blick behalten, damit die Stimmen-Reels es nicht unbemerkt aufbrauchen.
 *
 * Key kommt aus dem CI-Secret (XI bevorzugt, sonst ELEVENLABS_API_KEY) — NIE im Repo.
 * No-op (kein Hard-Fail) ohne Key. Optional Telegram-Digest.
 * ENV: XI | ELEVENLABS_API_KEY (Pflicht für Live-Zahlen) · TELEGRAM_BOT_TOKEN/CHAT_ID (optional)
 */
const KEY = process.env.XI || process.env.ELEVENLABS_API_KEY || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

if (!KEY) { console.log('Kein ElevenLabs-Key (XI/ELEVENLABS_API_KEY) gesetzt → No-op.'); process.exit(0); }

const fmt = n => Number(n).toLocaleString('de-CH');

async function telegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, disable_web_page_preview: true }),
    });
  } catch {}
}

(async () => {
  let r, j;
  try {
    r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
    j = await r.json().catch(() => ({}));
  } catch (e) { console.error('Netzwerkfehler:', e.message); process.exit(0); }
  if (!r.ok) {
    console.error('ElevenLabs-API-Fehler:', r.status, JSON.stringify(j).slice(0, 200));
    process.exit(0);
  }

  const used = Number(j.character_count ?? 0);
  const limit = Number(j.character_limit ?? 0);
  const remaining = Math.max(0, limit - used);
  const pct = limit ? Math.round((used / limit) * 100) : 0;
  const tier = j.tier || j.subscription?.tier || 'unbekannt';
  const resetUnix = Number(j.next_character_count_reset_unix ?? 0);
  const reset = resetUnix ? new Date(resetUnix * 1000).toISOString().slice(0, 10) : 'n/a';

  const line = `ElevenLabs (${tier}): ${fmt(remaining)} von ${fmt(limit)} Zeichen frei `
    + `(${pct}% genutzt, ${fmt(used)} verbraucht) · Reset ${reset}`;
  console.log(line);
  // grobe Reichweiten-Schätzung: ~ein Stimmen-Reel ≈ 300–600 Zeichen Voiceover
  if (limit) console.log(`≈ ${Math.floor(remaining / 450)} Stimmen-Reels à ~450 Zeichen noch möglich.`);

  const warn = pct >= 80 ? '⚠️ ' : '';
  await telegram(`${warn}🔊 ${line}`);
})();
