// GET /api/etsy-auth — startet die einmalige Etsy-Anmeldung (OAuth 2.0 mit PKCE, wie Etsy es verlangt).
// Env (Cloudflare Pages): ETSY_API_KEY = "keystring:shared_secret". Redirect-URI muss in der Etsy-App eingetragen sein:
// https://abannews.com/api/etsy-callback (oder ETSY_REDIRECT_URI).
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function onRequestGet({ request, env }) {
  const key = (env.ETSY_API_KEY || "").split(":")[0];
  if (!key) return new Response("ETSY_API_KEY fehlt im Pages-Projekt.", { status: 503 });
  const redirect = env.ETSY_REDIRECT_URI || new URL("/api/etsy-callback", request.url).toString();
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const ziel = new URL("https://www.etsy.com/oauth/connect");
  for (const [k, v] of Object.entries({ response_type: "code", redirect_uri: redirect, scope: "listings_w listings_r shops_r",
    client_id: key, state, code_challenge: challenge, code_challenge_method: "S256" })) ziel.searchParams.set(k, v);
  const cookie = (n, v) => `${n}=${v}; Path=/api/etsy-callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`;
  const h = new Headers({ Location: ziel.toString(), "Cache-Control": "no-store" });
  h.append("Set-Cookie", cookie("etsy_v", verifier));
  h.append("Set-Cookie", cookie("etsy_s", state));
  return new Response(null, { status: 302, headers: h });
}
