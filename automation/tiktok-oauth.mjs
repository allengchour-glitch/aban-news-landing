#!/usr/bin/env node
/* LuxeStyle — tiktok-oauth.mjs  (EINMALIGER Token-Helfer, LOKAL ausführen)
 *
 * Holt dir TT_ACCESS_TOKEN + TT_REFRESH_TOKEN über den TikTok-OAuth-Flow, OHNE dass du
 * Codes von Hand aus URLs kopieren musst. Startet einen kleinen lokalen Callback-Server,
 * öffnet die Login-URL, fängt den Code ab und tauscht ihn gegen die Tokens.
 *
 * ⚙️  EINMALIGE VORBEREITUNG in der TikTok-App (developers.tiktok.com → deine App „LuxeStyle Poster"):
 *   1. „Grundlegende Infos" → bei „Redirect URI" hinzufügen:  http://localhost:8723/callback
 *   2. „Branchenlösungen"/Products → „Login Kit" + „Content Posting API" hinzufügen.
 *   3. Scopes freischalten: user.info.basic, video.upload, video.publish
 *      (video.publish wird ggf. erst nach App-Review öffentlich — im Sandbox/SELF_ONLY reicht es zum Testen.)
 *
 * ▶️  AUSFÜHREN (lokal, NICHT in CI — Tokens NIE committen!):
 *      TT_CLIENT_KEY=xxx TT_CLIENT_SECRET=yyy node automation/tiktok-oauth.mjs
 *   Dann im Browser einloggen → das Skript druckt die zwei Tokens.
 *   Diese als GitHub-Secrets setzen: TT_ACCESS_TOKEN, TT_REFRESH_TOKEN
 *   (TT_CLIENT_KEY/TT_CLIENT_SECRET hast du schon gesetzt → Auto-Refresh läuft danach von selbst.)
 *
 * Node ≥18 (global fetch). Keine npm-Abhängigkeiten.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';

const KEY = process.env.TT_CLIENT_KEY || '';
const SECRET = process.env.TT_CLIENT_SECRET || '';
const PORT = parseInt(process.env.TT_OAUTH_PORT || '8723', 10);
const REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPES = 'user.info.basic,video.upload,video.publish';

if(!KEY || !SECRET){
  console.error('❌ Bitte TT_CLIENT_KEY und TT_CLIENT_SECRET als Umgebungsvariablen setzen:');
  console.error('   TT_CLIENT_KEY=xxx TT_CLIENT_SECRET=yyy node automation/tiktok-oauth.mjs');
  process.exit(1);
}

const state = Math.random().toString(36).slice(2);
// TikTok verlangt seit 2026 PKCE (errCode 10007 code_challenge ohne) — hex-SHA256 des Verifiers.
const verifier = crypto.randomBytes(32).toString('hex');
const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
const authUrl = 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({
  client_key: KEY,
  scope: SCOPES,
  response_type: 'code',
  redirect_uri: REDIRECT,
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
});

function open(url){
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${cmd} "${url}"`, () => {});
}

const server = http.createServer(async (req, res) => {
  if(!req.url.startsWith('/callback')){ res.writeHead(404); res.end(); return; }
  const u = new URL(req.url, REDIRECT);
  const code = u.searchParams.get('code');
  const err = u.searchParams.get('error');
  if(err || !code){
    res.writeHead(400, {'Content-Type':'text/html; charset=utf-8'});
    res.end(`<h2>❌ Kein Code erhalten: ${err || 'unbekannt'}</h2><p>Schliessen und erneut versuchen.</p>`);
    console.error('Fehler im Callback:', err || '(kein code)');
    return;
  }
  // Code → Tokens tauschen
  const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_key: KEY, client_secret: SECRET,
      code, grant_type: 'authorization_code', redirect_uri: REDIRECT,
      code_verifier: verifier,
    }),
  });
  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.access_token){
    res.writeHead(500, {'Content-Type':'text/html; charset=utf-8'});
    res.end(`<h2>❌ Token-Tausch fehlgeschlagen</h2><pre>${JSON.stringify(j,null,2)}</pre>`);
    console.error('Token-Tausch-Fehler:', r.status, JSON.stringify(j));
    server.close(); return;
  }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end('<h2>✅ Geschafft!</h2><p>Tokens stehen im Terminal. Du kannst dieses Fenster schliessen.</p>');
  console.log('\n✅ ERFOLG — diese zwei Werte als GitHub-Secrets setzen:\n');
  console.log('TT_ACCESS_TOKEN =', j.access_token);
  console.log('TT_REFRESH_TOKEN =', j.refresh_token);
  console.log('\n(open_id:', j.open_id, '· scope:', j.scope, '· access_token gültig', j.expires_in, 's,',
              'refresh_token gültig', j.refresh_expires_in, 's)\n');
  console.log('Danach: Repo → Settings → Secrets and variables → Actions → New repository secret.');
  setTimeout(()=>{ server.close(); process.exit(0); }, 500);
});

server.listen(PORT, () => {
  console.log('TikTok-OAuth-Helfer läuft. Öffne im Browser (falls er nicht automatisch aufgeht):\n');
  console.log(authUrl + '\n');
  console.log(`Warte auf Login-Callback auf ${REDIRECT} …`);
  open(authUrl);
});
