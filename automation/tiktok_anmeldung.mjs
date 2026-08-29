#!/usr/bin/env node
/* TikTok-Anmeldung in zwei Schritten — ohne lokalen Server.
 *
 * WARUM: `tiktok-oauth.mjs` startet einen Webserver auf Port 8723 und muss deshalb auf dem
 * Rechner des Betreibers laufen. Diese Fassung braucht keinen Server: TikTok hängt den Code an
 * die Weiterleitungs-URL, und die steht im Browser in der Adresszeile — auch wenn dort nichts
 * lauscht und der Browser eine Fehlerseite zeigt. Der Code lässt sich also einfach kopieren.
 * Damit wird aus einem Skript-Lauf ein Klick plus ein Einfügen, und der Austausch passiert hier.
 *
 * PKCE ist Pflicht (TikTok-Fehler 10007 ohne). ⚠️ Und zwar HEX-SHA256 des Verifiers, nicht das
 * sonst übliche base64url — das steht so im Repo seit dem 18.08. und kostete damals einen Anlauf.
 *
 * Der Verifier gehört zum Code: Der Austausch klappt nur mit demselben. Er wird deshalb im
 * Tresor abgelegt (Shop-Metafeld), damit Schritt 2 auch aus einer anderen Sitzung gelingt —
 * /tmp überlebt den Snapshot-Rewind nicht.
 *
 *   node automation/tiktok_anmeldung.mjs start          → Link zeigen
 *   node automation/tiktok_anmeldung.mjs fertig <code>  → Code eintauschen, Token in den Tresor
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const REDIRECT = process.env.TT_REDIRECT || 'http://localhost:8723/callback';
const SCOPES = 'user.info.basic,video.upload,video.publish';

function creds() {
  for (const p of ['/tmp/tt_creds.env']) {
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    const k = /TT_CLIENT_KEY=(\S+)/.exec(t)?.[1];
    const s = /TT_CLIENT_SECRET=(\S+)/.exec(t)?.[1];
    if (k && s) return { k, s };
  }
  // Aus dem Tresor nachladen, falls /tmp nach einem Rewind leer ist.
  try {
    execFileSync('python3', ['automation/tresor.py', 'env', 'tiktok', '/tmp/tt_creds.env'], { stdio: 'ignore' });
    const t = fs.readFileSync('/tmp/tt_creds.env', 'utf8');
    return { k: /TT_CLIENT_KEY=(\S+)/.exec(t)?.[1], s: /TT_CLIENT_SECRET=(\S+)/.exec(t)?.[1] };
  } catch { return {}; }
}

function tresorSetzen(...paare) {
  execFileSync('python3', ['automation/tresor.py', 'setzen', 'tiktok', ...paare], { stdio: 'inherit' });
}
function tresorHolen(schluessel) {
  try {
    const aus = execFileSync('python3', ['automation/tresor.py', 'holen', 'tiktok'], { encoding: 'utf8' });
    return new RegExp('^' + schluessel + '=(.*)$', 'm').exec(aus)?.[1] || null;
  } catch { return null; }
}

const { k: KEY, s: SECRET } = creds();
if (!KEY || !SECRET) { console.error('TT_CLIENT_KEY/SECRET fehlen — weder /tmp noch Tresor.'); process.exit(1); }

const befehl = process.argv[2];

if (befehl === 'start') {
  const verifier = crypto.randomBytes(32).toString('hex');
  const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
  const state = crypto.randomBytes(8).toString('hex');
  tresorSetzen(`TT_PKCE_VERIFIER=${verifier}`, `TT_PKCE_STATE=${state}`);
  const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
  u.searchParams.set('client_key', KEY);
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', REDIRECT);
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  console.log('\n1. Diesen Link im Browser öffnen (als @luxestyle.ch angemeldet):\n');
  console.log(u.toString());
  console.log('\n2. Zustimmen. Der Browser landet auf einer Fehlerseite — das ist richtig,');
  console.log('   dort lauscht nichts. Der Code steht in der ADRESSZEILE nach «code=».');
  console.log('   Alles bis zum nächsten «&» kopieren (das Ende «*1» gehört dazu).\n');
  console.log('3. Zurückmelden. Der Austausch passiert dann hier.\n');
  process.exit(0);
}

if (befehl === 'fertig') {
  const code = decodeURIComponent(process.argv[3] || '');
  if (!code) { console.error('Kein Code übergeben.'); process.exit(1); }
  const verifier = tresorHolen('TT_PKCE_VERIFIER');
  if (!verifier) { console.error('Kein Verifier im Tresor — zuerst «start» laufen lassen.'); process.exit(1); }
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: KEY, client_secret: SECRET, code,
      grant_type: 'authorization_code', redirect_uri: REDIRECT, code_verifier: verifier,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.refresh_token) {
    console.error('Austausch fehlgeschlagen:', JSON.stringify(j).slice(0, 400));
    console.error('\n⚠️ Ein Code ist EINMALIG und nur Minuten gültig. Bei «invalid_grant»');
    console.error('   einfach «start» erneut laufen lassen und frisch anmelden.');
    process.exit(1);
  }
  tresorSetzen(`TT_REFRESH_TOKEN=${j.refresh_token}`, `TT_OPEN_ID=${j.open_id || ''}`);
  console.log(`\n✅ Refresh-Token im Tresor gespeichert (gültig ${Math.round((j.refresh_expires_in || 0) / 86400)} Tage).`);
  console.log('   Ab jetzt kann tiktok_reel_post.mjs ohne weitere Anmeldung posten.\n');
  process.exit(0);
}

console.log('Nutzung: tiktok_anmeldung.mjs start   |   tiktok_anmeldung.mjs fertig <code>');
