#!/usr/bin/env node
/**
 * Kaufweg-Wächter: Produkt → Warenkorb → Versand nach Zürich → Kasse im Live-Shop, ohne Browser (Logik: automation/lib/kaufweg.mjs).
 * Läuft täglich in Actions (.github/workflows/kaufweg-waechter.yml). Nur lesend am Shop; es entsteht höchstens ein anonymer Warenkorb, der geleert wird.
 *
 * Ausgang: Exit 0 = kein Fehler gefunden (auch wenn Schritte «nicht messbar» waren: eine Drosselung ist kein kaputter Shop)
 *          Exit 1 = mindestens ein klarer Fehler → Telegram-Meldung (wenn TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID gesetzt)
 *
 * ENV (alles optional): BASEURL (https://luxestyle.ch) · KAUFWEG_PRODUKTE (Handles, Komma) · KAUFWEG_PFLICHT_ZAHLUNG (twint)
 *   KAUFWEG_VERSAND_MAX · KAUFWEG_PAUSE_MS · KAUFWEG_BASIS_MS · KAUFWEG_VERSUCHE (nur für Tests)
 *   DRY=1 → keine Telegram-Meldung · ALWAYS_NOTIFY=1 → auch bei «in Ordnung» melden · TELEGRAM_BASIS (https://api.telegram.org, nur für Tests)
 */
import { lauf, nachricht } from './lib/kaufweg.mjs';

const liste = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const zahl = (s) => (s === undefined || s === '' ? undefined : Number(s));

const erg = await lauf({
  basis: process.env.BASEURL || 'https://luxestyle.ch',
  handles: liste(process.env.KAUFWEG_PRODUKTE),
  pflichtZahlung: process.env.KAUFWEG_PFLICHT_ZAHLUNG ? liste(process.env.KAUFWEG_PFLICHT_ZAHLUNG) : undefined,
  versandMax: zahl(process.env.KAUFWEG_VERSAND_MAX),
  pauseMs: zahl(process.env.KAUFWEG_PAUSE_MS),
  basisMs: zahl(process.env.KAUFWEG_BASIS_MS),
  versuche: zahl(process.env.KAUFWEG_VERSUCHE),
});

const text = nachricht(erg);
console.log(text);
for (const s of erg.schritte) console.log(`  [${s.art}] ${s.name}${s.text ? ': ' + s.text : ''}`);

const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const melden = !erg.ok || process.env.ALWAYS_NOTIFY === '1';
if (process.env.DRY !== '1' && TG_T && TG_C && melden) {
  try {
    const r = await fetch(`${process.env.TELEGRAM_BASIS || 'https://api.telegram.org'}/bot${TG_T}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_C, text, disable_web_page_preview: true }),
    });
    console.log(r.ok ? 'Telegram gesendet.' : `Telegram: HTTP ${r.status}`);
  } catch (e) { console.error('Telegram-Fehler:', e.message); }
} else if (melden) {
  console.log('Keine Telegram-Meldung (DRY oder Zugangsdaten fehlen).');
}
process.exit(erg.ok ? 0 : 1);
