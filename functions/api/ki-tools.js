// Cloudflare Pages Function — GET /api/ki-tools
// Daten-API zum KI-Tools-Datensatz DACH.
//   - Offen: ?sample (Standard) -> 30 Tools, gratis, CORS. Lead-Gen / Entwickler-Vorschau.
//   - Voll:  ?full mit Header "X-API-Key" -> kompletter Datensatz, NUR wenn der Key passt
//            UND die Volldaten als KV-Binding DATENSATZ_KV hinterlegt sind.
//
// WARUM KV statt eingebettet: Dieses Repo ist oeffentlich. Der volle Datensatz darf
// deshalb NICHT im committeten Code stehen (sonst waere das bezahlte CSV-Produkt frei
// einsehbar). Die Volldaten legst du in einen Cloudflare-KV-Store (Key "datensatz"),
// den Zugriffs-Key in die Env-Var DATENSATZ_API_KEY. Solange beides fehlt, antwortet
// der Voll-Endpoint mit 402 + Kauf-Hinweis. Das Sample bleibt immer offen.
//
// Ehrlich: Die Daten sind aus oeffentlichen Quellen aggregiert; der Key kauft Bequemlichkeit,
// Updates und Support, kein Staatsgeheimnis. Preise/Wertungen sind bewusst NICHT enthalten.

const SAMPLE = [
{
"name": "Accountable",
"bereiche": "Buchhaltung",
"eu_hosting": "ja",
"offizielle_url": "https://www.accountable.de/"
},
{
"name": "ActiveCampaign",
"bereiche": "Newsletter & E-Mail",
"eu_hosting": "nein",
"offizielle_url": "https://www.activecampaign.com/"
},
{
"name": "Activepieces",
"bereiche": "Automatisierung",
"eu_hosting": "unbekannt",
"offizielle_url": "https://www.activepieces.com/"
},
{
"name": "Ada",
"bereiche": "Chatbot & Kundenservice",
"eu_hosting": "unbekannt",
"offizielle_url": "https://www.ada.cx/"
},
{
"name": "AdCreative.ai",
"bereiche": "Marketing-AI | Design | Image-Gen",
"eu_hosting": "unbekannt",
"offizielle_url": "https://www.adcreative.ai"
},
{
"name": "Adobe Firefly",
"bereiche": "Image-Gen | Design",
"eu_hosting": "unbekannt",
"offizielle_url": "https://firefly.adobe.com"
},
{
"name": "Adobe Firefly / Premiere",
"bereiche": "Video",
"eu_hosting": "unbekannt",
"offizielle_url": "https://www.adobe.com/products/firefly.html"
},
{
"name": "Agicap",
"bereiche": "Buchhaltung",
"eu_hosting": "ja",
"offizielle_url": "https://agicap.com/de/"
},
{
"name": "Ahrefs",
"bereiche": "SEO",
"eu_hosting": "unbekannt",
"offizielle_url": "https://ahrefs.com"
},
{
"name": "Aider",
"bereiche": "Coding",
"eu_hosting": "unbekannt",
"offizielle_url": "https://aider.chat"
},
{
"name": "AIVA",
"bereiche": "Musik",
"eu_hosting": "ja",
"offizielle_url": "https://www.aiva.ai/"
},
{
"name": "Albato",
"bereiche": "Automatisierung",
"eu_hosting": "unbekannt",
"offizielle_url": "https://albato.com/"
},
{
"name": "Aleph Alpha (Pharia)",
"bereiche": "AI-Chat | API | Compliance-DACH",
"eu_hosting": "unbekannt",
"offizielle_url": "https://aleph-alpha.com"
},
{
"name": "Amberscript",
"bereiche": "Voice & Transkription",
"eu_hosting": "ja",
"offizielle_url": "https://www.amberscript.com/de/"
},
{
"name": "Anyword",
"bereiche": "Marketing-AI | Writing",
"eu_hosting": "unbekannt",
"offizielle_url": "https://anyword.com"
},
{
"name": "Apify",
"bereiche": "Scraping",
"eu_hosting": "unbekannt",
"offizielle_url": "https://apify.com"
},
{
"name": "Apollo.io",
"bereiche": "Sales",
"eu_hosting": "unbekannt",
"offizielle_url": "https://apollo.io"
},
{
"name": "Arc Search",
"bereiche": "Search",
"eu_hosting": "unbekannt",
"offizielle_url": "https://arc.net"
},
{
"name": "AssemblyAI",
"bereiche": "Voice & Transkription",
"eu_hosting": "nein",
"offizielle_url": "https://www.assemblyai.com/"
},
{
"name": "aTrain",
"bereiche": "Voice & Transkription",
"eu_hosting": "ja",
"offizielle_url": "https://github.com/JuergenFleiss/aTrain"
},
{
"name": "BigBuy",
"bereiche": "Dropshipping",
"eu_hosting": "ja",
"offizielle_url": "https://www.bigbuy.eu/"
},
{
"name": "Billomat",
"bereiche": "Buchhaltung",
"eu_hosting": "ja",
"offizielle_url": "https://www.billomat.com/"
},
{
"name": "Brandsdistribution",
"bereiche": "Dropshipping",
"eu_hosting": "ja",
"offizielle_url": "https://www.brandsdistribution.com/"
},
{
"name": "Brevo",
"bereiche": "Newsletter & E-Mail",
"eu_hosting": "ja",
"offizielle_url": "https://www.brevo.com/de/"
},
{
"name": "BRYTER",
"bereiche": "Automatisierung",
"eu_hosting": "ja",
"offizielle_url": "https://www.bryter.com/de/"
},
{
"name": "BuchhaltungsButler",
"bereiche": "Buchhaltung",
"eu_hosting": "ja",
"offizielle_url": "https://www.buchhaltungsbutler.de/"
},
{
"name": "Camunda",
"bereiche": "Automatisierung",
"eu_hosting": "ja",
"offizielle_url": "https://camunda.com/de/"
},
{
"name": "Candis",
"bereiche": "Buchhaltung",
"eu_hosting": "ja",
"offizielle_url": "https://www.candis.io/"
},
{
"name": "CleverReach",
"bereiche": "Newsletter & E-Mail",
"eu_hosting": "ja",
"offizielle_url": "https://www.cleverreach.com/de/"
},
{
"name": "Cognigy",
"bereiche": "Chatbot & Kundenservice",
"eu_hosting": "ja",
"offizielle_url": "https://www.cognigy.com/de"
}
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};
const BASE = { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" };

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { ...BASE, ...extra } });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const wantFull = url.searchParams.has("full");
  const meta = {
    quelle: "aban news — abannews.com",
    lizenz: "Sample frei nutzbar mit Quellenangabe. Voller Datensatz: Einzelplatz, keine Weiterverbreitung.",
    spalten: ["name", "bereiche", "eu_hosting", "offizielle_url"],
    hinweis: "Keine erfundenen Preise/Wertungen. eu_hosting: ja/nein/unbekannt.",
  };

  if (!wantFull) {
    return json({
      ok: true, modus: "sample", anzahl: SAMPLE.length,
      voller_datensatz: "https://abannews.com/ki-tools-datensatz.html",
      meta, tools: SAMPLE,
    });
  }

  // Voll-Zugang: Key UND KV noetig.
  const key = request.headers.get("X-API-Key") || url.searchParams.get("key") || "";
  if (!env || !env.DATENSATZ_API_KEY) {
    return json({ ok: false, modus: "full", fehler: "Voll-API noch nicht aktiviert.",
      kaufen: "https://abannews.com/ki-tools-datensatz.html" }, 402);
  }
  if (key !== env.DATENSATZ_API_KEY) {
    return json({ ok: false, fehler: "Ungueltiger oder fehlender X-API-Key.",
      kaufen: "https://abannews.com/ki-tools-datensatz.html" }, 401);
  }
  if (!env.DATENSATZ_KV) {
    return json({ ok: false, fehler: "Volldaten nicht hinterlegt (KV-Binding DATENSATZ_KV fehlt).",
      hinweis: "Datensatz-JSON als KV-Key 'datensatz' hochladen." }, 503);
  }
  const raw = await env.DATENSATZ_KV.get("datensatz");
  if (!raw) {
    return json({ ok: false, fehler: "KV-Key 'datensatz' leer." }, 503);
  }
  let tools;
  try { tools = JSON.parse(raw); } catch { return json({ ok: false, fehler: "KV-Daten kein JSON." }, 500); }
  return json({ ok: true, modus: "full", anzahl: Array.isArray(tools) ? tools.length : undefined,
    meta, tools }, 200, { "Cache-Control": "no-store" });
}
