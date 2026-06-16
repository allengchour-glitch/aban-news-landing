// Node-Test des Comparis-Cross-Postings: node functions/_comparis.test.mjs
// Prüft Mapping, No-op ohne Config, und dass Fehler nie geworfen werden.
import {
  comparisConfigured, toComparisPayload, crossPostToComparis,
  comparisImportConfigured, fromComparisItem, fetchComparisListings,
} from "./_comparis.mjs";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

const ROW = {
  id: 42, typ: "Gesuch", kat: "Auto & Teile", titel: "VW Golf", beschreibung: "Guter Zustand, ab MFK",
  preis: "8500 CHF", zustand: "Gebraucht", plz: "3007", ort: "Bern", bild: "https://x/y.jpg",
  kontakt: "a@b.ch", created: 1700000000000,
};

async function run() {
  console.log("\nComparis-Cross-Post — Tests:");

  // 1) configured-Erkennung
  check("nicht konfiguriert ohne URL", comparisConfigured({}) === false);
  check("nicht konfiguriert bei env=undefined", comparisConfigured(undefined) === false);
  check("konfiguriert mit FEED_URL", comparisConfigured({ COMPARIS_FEED_URL: "https://c" }) === true);

  // 2) Mapping
  const p = toComparisPayload(ROW, { SITE_URL: "https://abannews.com/" });
  check("external_id präfixt id", p.external_id === "aban-42", p.external_id);
  check("Gesuch → wanted", p.type === "wanted", p.type);
  check("Angebot → offer", toComparisPayload({ ...ROW, typ: "Angebot" }).type === "offer");
  check("location split", p.location.zip === "3007" && p.location.city === "Bern");
  check("Bild → images-Array", Array.isArray(p.images) && p.images.length === 1);
  check("kein Bild → leeres images", toComparisPayload({ ...ROW, bild: "" }).images.length === 0);
  check("permalink ohne Doppel-Slash", p.permalink === "https://abannews.com/inserate.html#i42", p.permalink);
  check("published_at ISO", p.published_at === new Date(ROW.created).toISOString());

  // 3) No-op ohne Config — kein fetch, sauber übersprungen
  const skip = await crossPostToComparis(ROW, {});
  check("no-op ohne Config", skip.skipped === true && skip.reason === "not_configured");

  // 4) Erfolgreicher Push (gemocktes fetch)
  const orig = globalThis.fetch;
  let seen = null;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response("{}", { status: 200 }); };
  const okRes = await crossPostToComparis(ROW, { COMPARIS_FEED_URL: "https://c/api", COMPARIS_API_KEY: "K" });
  check("Push ok bei 200", okRes.ok === true && okRes.status === 200);
  check("ruft FEED_URL auf", seen && seen.url === "https://c/api");
  check("setzt Bearer-Auth", seen && seen.init.headers.Authorization === "Bearer K");
  check("Body ist gemapptes JSON", seen && JSON.parse(seen.init.body).external_id === "aban-42");

  // 5) fetch wirft → kein Throw, ok:false
  globalThis.fetch = async () => { throw new Error("boom"); };
  const errRes = await crossPostToComparis(ROW, { COMPARIS_FEED_URL: "https://c" });
  check("fetch-Fehler wirft nicht", errRes.ok === false && /boom/.test(errRes.error || ""));
  globalThis.fetch = orig;

  // ---- Import-Richtung ----
  console.log("\nComparis-Import — Tests:");
  check("import nicht konfiguriert ohne URL", comparisImportConfigured({}) === false);
  check("import konfiguriert mit IMPORT_URL", comparisImportConfigured({ COMPARIS_IMPORT_URL: "https://c" }) === true);

  const ci = fromComparisItem({
    external_id: "x9", type: "offer", category: "Möbel", title: "Sofa", description: "3-Sitzer",
    price: "200 CHF", condition: "Gebraucht", location: { zip: "8000", city: "Zürich" },
    images: ["https://i/1.jpg"], permalink: "https://comparis.ch/i/9", published_at: "2026-01-02T00:00:00.000Z",
  });
  check("import id präfixt cmp-", ci.id === "cmp-x9", ci.id);
  check("import offer → Angebot", ci.typ === "Angebot");
  check("import wanted → Gesuch", fromComparisItem({ type: "wanted" }).typ === "Gesuch");
  check("import location → ort/plz", ci.ort === "Zürich" && ci.plz === "8000");
  check("import status approved + source", ci.status === "approved" && ci.source === "comparis");
  check("import url aus permalink", ci.url === "https://comparis.ch/i/9");
  check("import created als ts", ci.created === new Date("2026-01-02T00:00:00.000Z").getTime());

  const noimp = await fetchComparisListings({}, {});
  check("import no-op ohne Config → []", Array.isArray(noimp) && noimp.length === 0);

  globalThis.fetch = async () => new Response(JSON.stringify({ items: [
    { id: 1, title: "Velo", category: "Fahrrad", description: "rot" },
    { id: 2, title: "Auto", category: "Auto & Teile", description: "blau" },
  ] }), { status: 200 });
  const imp = await fetchComparisListings({ COMPARIS_IMPORT_URL: "https://c" }, {});
  check("import lädt items", imp.length === 2 && imp[0].titel === "Velo");
  const impFilt = await fetchComparisListings({ COMPARIS_IMPORT_URL: "https://c" }, { kat: "Fahrrad" });
  check("import filtert nach kat", impFilt.length === 1 && impFilt[0].titel === "Velo");
  const impQ = await fetchComparisListings({ COMPARIS_IMPORT_URL: "https://c" }, { q: "blau" });
  check("import filtert nach q", impQ.length === 1 && impQ[0].titel === "Auto");

  globalThis.fetch = async () => { throw new Error("net"); };
  const impErr = await fetchComparisListings({ COMPARIS_IMPORT_URL: "https://c" }, {});
  check("import fetch-Fehler → []", Array.isArray(impErr) && impErr.length === 0);
  globalThis.fetch = orig;

  console.log(`\n${fail ? "✗" : "✓"} ${pass} ok, ${fail} fehlgeschlagen`);
  process.exit(fail ? 1 : 0);
}
run();
