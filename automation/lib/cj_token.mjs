/**
 * CJ-Zugangsmarke holen und auf der Platte zwischenspeichern.
 *
 * WARUM (gemessen 24.10.2026): `authentication/getAccessToken` darf nur **alle fünf Minuten**
 * gerufen werden. Danach antwortet CJ mit `16900202`, und das sieht aus wie ein kaputter
 * Zugang, ist aber nur eine Drosselung. Mehrere Läufe hintereinander — genau das, was ein
 * Trockenlauf-vor-Scharflauf erzeugt — laufen ohne Zwischenspeicher zuverlässig hinein.
 *
 * Die Marke gilt laut Antwort rund 15 Tage. Zwischengespeichert wird sie mit ihrem
 * Ablaufzeitpunkt und einem Sicherheitsabstand; eine abgelaufene Marke wird verworfen, nicht
 * geraten. Lässt sich die Datei nicht lesen oder schreiben, läuft alles weiter — der
 * Zwischenspeicher ist eine Abkürzung, keine Bedingung.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { cjFetch } from './cj_fetch.mjs';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const PUFFER_MS = 5 * 60 * 1000;

export async function cjToken({ email = process.env.CJ_EMAIL, key = process.env.CJ_API_KEY,
  cache = process.env.CJ_TOKEN_CACHE || '/tmp/cj_token.json', jetzt = Date.now() } = {}) {
  if (!email || !key) return '';
  try {
    const d = JSON.parse(await readFile(cache, 'utf8'));
    if (d?.token && Number(d.exp) - PUFFER_MS > jetzt) return d.token;
  } catch { /* kein Zwischenspeicher: normal holen */ }

  const r = await cjFetch(`${BASE}/authentication/getAccessToken`, {
    context: 'CJ-Anmeldung', headers: { 'Content-Type': 'application/json' },
    init: { method: 'POST', body: JSON.stringify({ email, password: key }) },
  });
  const token = r?.data?.accessToken || '';
  const exp = Date.parse(r?.data?.accessTokenExpiryDate || '') || (jetzt + 24 * 3600 * 1000);
  if (token) { try { await writeFile(cache, JSON.stringify({ token, exp })); } catch { /* egal */ } }
  return token;
}
