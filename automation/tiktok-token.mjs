#!/usr/bin/env node
/**
 * tiktok-token.mjs — Tauscht einen TikTok-OAuth-`code` gegen Access-/Refresh-Token.
 * ------------------------------------------------------------------------------
 * KEIN lokaler Server nötig (anders als tiktok-oauth.mjs) → läuft in GitHub Actions,
 * damit du KEINEN Computer brauchst. Du loggst dich am Handy ein, kopierst den `code`
 * aus der Weiterleitungs-URL und der Workflow erledigt den Rest.
 *
 * SICHERHEIT (öffentliches Repo!): Die Tokens werden NIE in den Log geschrieben.
 *   Sie werden mit ::add-mask:: maskiert und nur an $GITHUB_OUTPUT übergeben, damit der
 *   nachgelagerte Step sie via `gh secret set` speichert.
 *
 * ENV: TT_CLIENT_KEY, TT_CLIENT_SECRET (Secrets) · TT_AUTH_CODE (der kopierte code) ·
 *      TT_REDIRECT_URI (muss exakt dem entsprechen, mit dem der code erzeugt wurde;
 *      Default http://localhost:8723/callback).
 */
import fs from 'node:fs';

const KEY = process.env.TT_CLIENT_KEY || '';
const SECRET = process.env.TT_CLIENT_SECRET || '';
let CODE = (process.env.TT_AUTH_CODE || '').trim();
const REDIRECT = process.env.TT_REDIRECT_URI || 'http://localhost:8723/callback';
const VERIFIER = (process.env.TT_CODE_VERIFIER || '').trim();   // PKCE: muss zum code_challenge des Login-Links passen

if(!KEY || !SECRET){ console.error('❌ TT_CLIENT_KEY und TT_CLIENT_SECRET fehlen (als Secrets setzen).'); process.exit(1); }
if(!CODE){ console.error('❌ TT_AUTH_CODE fehlt (den code aus der Weiterleitungs-URL einfügen).'); process.exit(1); }

// Bequemlichkeit: Falls jemand die GANZE Redirect-URL einfügt, den code automatisch rausziehen.
if(/[?&]code=/.test(CODE)){
  try { CODE = new URL(CODE).searchParams.get('code') || CODE; } catch {}
}
// TikTok hängt oft "*" oder URL-Encoding an den code → bereinigen.
CODE = decodeURIComponent(CODE).replace(/\*+$/,'').trim();

const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
  method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body: new URLSearchParams({
    client_key: KEY, client_secret: SECRET,
    code: CODE, grant_type:'authorization_code', redirect_uri: REDIRECT,
    ...(VERIFIER ? { code_verifier: VERIFIER } : {}),   // PKCE (TikTok-Desktop-App Pflicht)
  }),
});
const j = await r.json().catch(()=>({}));

if(!r.ok || !j.access_token){
  // Fehler-JSON enthält KEINEN gültigen Token → darf geloggt werden (hilft beim Debuggen).
  console.error('❌ Token-Tausch fehlgeschlagen:', r.status, JSON.stringify(j));
  console.error('Häufigste Ursache: redirect_uri stimmt nicht exakt mit der überein, mit der der code erzeugt wurde,');
  console.error('oder der code ist abgelaufen/schon benutzt (code ist nur ~Minuten gültig & einmalig).');
  process.exit(1);
}

// Tokens maskieren (gegen versehentliches Log-Leak) + nur an GITHUB_OUTPUT geben.
console.log(`::add-mask::${j.access_token}`);
console.log(`::add-mask::${j.refresh_token}`);
if(process.env.GITHUB_OUTPUT){
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `access_token=${j.access_token}\nrefresh_token=${j.refresh_token}\n`);
}
// Nur unkritische Infos sichtbar machen.
console.log('✅ Token-Tausch erfolgreich.');
console.log(`   open_id: ${j.open_id || '(n/a)'} · scope: ${j.scope || '(n/a)'}`);
console.log(`   access_token gültig ${j.expires_in||'?'}s · refresh_token gültig ${j.refresh_expires_in||'?'}s`);
