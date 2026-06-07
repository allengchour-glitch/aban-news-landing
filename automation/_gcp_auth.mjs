/* LuxeStyle — _gcp_auth.mjs
 * Holt ein OAuth2-Access-Token für die Google-Cloud-/Vertex-AI-APIs aus einem
 * Service-Account-JSON (GitHub-Secret GCP_SA_KEY). Reines Node (node:crypto), keine Dependencies.
 *
 * GCP_SA_KEY darf roh-JSON ODER base64-kodiertes JSON sein.
 * Verwendung:
 *   import { getAccessToken, getServiceAccount } from './_gcp_auth.mjs';
 *   const token = await getAccessToken();   // null, wenn kein Key gesetzt
 */
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export function getServiceAccount() {
  const raw = process.env.GCP_SA_KEY || '';
  if (!raw.trim()) return null;
  let txt = raw.trim();
  // base64? (kein '{' am Anfang) → dekodieren
  if (!txt.startsWith('{')) {
    try { txt = Buffer.from(txt, 'base64').toString('utf8'); } catch { /* ignore */ }
  }
  try {
    const sa = JSON.parse(txt);
    if (sa.client_email && sa.private_key) return sa;
  } catch (e) {
    console.error('GCP_SA_KEY ist kein gültiges JSON:', e.message);
  }
  return null;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** OAuth2-Access-Token via JWT-Bearer-Grant. Gibt null zurück, wenn kein/ungültiger Key. */
export async function getAccessToken() {
  const sa = getServiceAccount();
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = { iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = b64url(signer.sign(sa.private_key));
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    console.error('GCP-Token-Fehler:', res.status, JSON.stringify(j));
    return null;
  }
  return j.access_token;
}
