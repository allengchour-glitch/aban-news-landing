#!/usr/bin/env node
/* tiktok-oauth-paste.mjs - PC-OAuth OHNE localhost-Server, OHNE Portal-Aenderung.
 * Nutzt die schon registrierte Redirect https://luxestyle.ch/ . Du fuegst den Code von Hand ein.
 * Schreibt TT_* in luxe-secrets.ps1 (merge, andere Secrets bleiben). Token bleibt LOKAL.
 *
 * ENV (vom .bat abgefragt): TT_CLIENT_KEY, TT_CLIENT_SECRET
 *   (Sandbox: KEY=sbawgg40q8nkfuwl5k + Sandbox-Secret. Nach Audit: Production-KEY/Secret.)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const KEY = process.env.TT_CLIENT_KEY || '';
const SECRET = process.env.TT_CLIENT_SECRET || '';
const REDIRECT = process.env.TT_REDIRECT || 'https://luxestyle.ch/';
const SCOPES = 'user.info.basic,video.upload,video.publish';
if (!KEY || !SECRET) { console.error('TT_CLIENT_KEY und TT_CLIENT_SECRET noetig.'); process.exit(1); }

const state = crypto.randomBytes(8).toString('hex');
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
const authUrl = 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({
  client_key: KEY, scope: SCOPES, response_type: 'code', redirect_uri: REDIRECT,
  state, code_challenge: codeChallenge, code_challenge_method: 'S256',
});

console.log('\n=== TikTok OAuth (Paste-Weg) ===');
console.log('1) Diese URL im Browser oeffnen (bei TikTok eingeloggt):\n');
console.log(authUrl + '\n');
console.log('2) "Autorisieren" -> du landest auf https://luxestyle.ch/?code=...');
console.log('3) Die GANZE Adresse (oder nur den code=Wert) hier einfuegen + Enter:\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('code/URL: ', async (ans) => {
  rl.close();
  let code = ans.trim();
  const m = code.match(/[?&]code=([^&\s]+)/);
  if (m) code = m[1];
  code = decodeURIComponent(code);
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: KEY, client_secret: SECRET, code,
      grant_type: 'authorization_code', redirect_uri: REDIRECT, code_verifier: codeVerifier }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) { console.error('\nFEHLER:', JSON.stringify(j).slice(0, 300)); process.exit(1); }

  // In luxe-secrets.ps1 mergen (andere Secrets behalten)
  const sp = path.join(os.homedir(), 'luxe-secrets.ps1');
  let ex = ''; try { ex = fs.readFileSync(sp, 'utf8'); } catch {}
  const kept = ex.split(/\r?\n/).filter(l => !/\$env:TT_(ACCESS_TOKEN|REFRESH_TOKEN|CLIENT_KEY|CLIENT_SECRET)\b/.test(l));
  const block = `$env:TT_CLIENT_KEY    = "${KEY}"\n$env:TT_CLIENT_SECRET = "${SECRET}"\n` +
    `$env:TT_ACCESS_TOKEN  = "${j.access_token}"\n$env:TT_REFRESH_TOKEN = "${j.refresh_token}"\n`;
  fs.writeFileSync(sp, (kept.join('\n').trim() + '\n' + block).replace(/^\n+/, ''));
  console.log('\nERFOLG! Tokens gespeichert in:', sp);
  console.log('open_id:', j.open_id, '| scope:', j.scope, '| refresh gueltig', j.refresh_expires_in, 's');
  console.log('\nJetzt postet der Giga-/Autobot per API. (Re-run SUPERBOT-SETUP.bat fuer Giga-Bot.)');
  process.exit(0);
});
