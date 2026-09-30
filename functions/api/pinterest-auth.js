// GET /api/pinterest-auth — startet die einmalige Pinterest-Anmeldung für den Pin-Autopiloten (OAuth 2.0, Code-Flow).
// Env (Cloudflare Pages): ABAN_PINTEREST_APP_ID. Redirect-URI in der Pinterest-App eintragen:
// https://abannews.com/api/pinterest-callback (oder ABAN_PINTEREST_REDIRECT_URI).
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function onRequestGet({ request, env }) {
  if (!env.ABAN_PINTEREST_APP_ID) return new Response("ABAN_PINTEREST_APP_ID fehlt im Pages-Projekt.", { status: 503 });
  const redirect = env.ABAN_PINTEREST_REDIRECT_URI || new URL("/api/pinterest-callback", request.url).toString();
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const ziel = new URL("https://www.pinterest.com/oauth/");
  for (const [k, v] of Object.entries({ client_id: env.ABAN_PINTEREST_APP_ID, redirect_uri: redirect, response_type: "code",
    scope: "boards:read,boards:write,pins:read,pins:write,user_accounts:read", state })) ziel.searchParams.set(k, v);
  const h = new Headers({ Location: ziel.toString(), "Cache-Control": "no-store" });
  h.append("Set-Cookie", `pin_s=${state}; Path=/api/pinterest-callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null, { status: 302, headers: h });
}
