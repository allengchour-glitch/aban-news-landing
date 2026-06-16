// Node-Test der generischen Portal-Engine: node functions/_portals.test.mjs
import {
  getPortals, portalsConfigured, importPortalsConfigured,
  crossPostToPortals, fromPortalItem, fetchPortalListings, toOpenImmoXml,
} from "./_portals.mjs";

let pass = 0, fail = 0;
function check(name, ok, got) { if (ok) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name + (got !== undefined ? "  -> " + JSON.stringify(got) : "")); } }

const orig = globalThis.fetch;

(async () => {
  console.log("Portal-Registry:");
  check("leer ohne env", getPortals({}).length === 0);
  check("nicht konfiguriert -> false", portalsConfigured({}) === false && importPortalsConfigured({}) === false);

  // Legacy-Comparis
  const legacy = getPortals({ COMPARIS_FEED_URL: "https://c/post", COMPARIS_IMPORT_URL: "https://c/feed", COMPARIS_API_KEY: "k" });
  check("legacy comparis erkannt", legacy.length === 1 && legacy[0].slug === "comparis", legacy);
  check("legacy feed+import+key", legacy[0].feedUrl === "https://c/post" && legacy[0].importUrl === "https://c/feed" && legacy[0].apiKey === "k");

  // Generische Liste + Merge
  const multi = getPortals({
    COMPARIS_IMPORT_URL: "https://c/feed",
    LISTING_PORTALS: JSON.stringify([
      { name: "Homegate", importUrl: "https://h/feed", feedUrl: "https://h/post", apiKey: "hk" },
      { name: "Anibis", importUrl: "https://a/feed" },
      { name: "comparis", feedUrl: "https://c/post" }, // merged in legacy-comparis
    ]),
  });
  check("3 portale (comparis gemerged)", multi.length === 3, multi.map((p) => p.slug));
  const cmp = multi.find((p) => p.slug === "comparis");
  check("comparis merge import+feed", cmp.importUrl === "https://c/feed" && cmp.feedUrl === "https://c/post", cmp);
  check("homegate vollständig", multi.find((p) => p.slug === "homegate").apiKey === "hk");
  check("export konfiguriert (homegate/comparis)", portalsConfigured(multi.length ? { LISTING_PORTALS: JSON.stringify([{ name: "X", feedUrl: "u" }]) } : {}) === true);
  check("kaputtes LISTING_PORTALS -> keine Exception", getPortals({ LISTING_PORTALS: "{nicht json" }).length === 0);

  // Mapping pro Portal
  const hi = fromPortalItem({ id: 7, title: "Wohnung", category: "Immobilien", location: { zip: "8001", city: "Zürich" }, price: "1500", permalink: "https://h/i/7" }, { name: "Homegate", slug: "homegate" });
  check("import id slug-präfix", hi.id === "homegate-7", hi.id);
  check("import source = portal-name", hi.source === "Homegate");
  check("import ort/plz/preis/url", hi.ort === "Zürich" && hi.plz === "8001" && hi.preis === "1500" && hi.url === "https://h/i/7");

  // Export an mehrere Portale
  console.log("\nExport (Cross-Post):");
  check("export no-op ohne config -> []", (await crossPostToPortals({ id: 1 }, {})).length === 0);
  let posted = [];
  globalThis.fetch = async (url, opt) => { posted.push(url); return new Response("", { status: 200 }); };
  const res = await crossPostToPortals({ id: 5, titel: "T", typ: "Angebot" }, {
    LISTING_PORTALS: JSON.stringify([{ name: "Homegate", feedUrl: "https://h/post" }, { name: "Anibis", feedUrl: "https://a/post" }]),
  });
  check("postet an beide feed-portale", res.length === 2 && res.every((r) => r.ok), res);
  check("zwei fetch-calls", posted.length === 2 && posted.includes("https://h/post") && posted.includes("https://a/post"));
  globalThis.fetch = async () => { throw new Error("net"); };
  const resErr = await crossPostToPortals({ id: 6 }, { COMPARIS_FEED_URL: "https://c/post" });
  check("export fetch-fehler wirft nicht", resErr.length === 1 && resErr[0].ok === false);

  // Import von mehreren Portalen
  console.log("\nImport (Pull + Merge):");
  check("import no-op ohne config -> []", (await fetchPortalListings({}, {})).length === 0);
  globalThis.fetch = async (url) => {
    if (String(url).includes("/h/")) return new Response(JSON.stringify([{ id: 1, title: "Wohnung", category: "Immobilien", description: "hell" }]), { status: 200 });
    return new Response(JSON.stringify({ items: [{ id: 2, title: "Velo", category: "Fahrrad", description: "rot" }] }), { status: 200 });
  };
  const env2 = { LISTING_PORTALS: JSON.stringify([{ name: "Homegate", importUrl: "https://h/feed" }, { name: "Anibis", importUrl: "https://a/feed" }]) };
  const all = await fetchPortalListings(env2, {});
  check("merged beide portale", all.length === 2 && all.some((x) => x.source === "Homegate") && all.some((x) => x.source === "Anibis"), all.map((x) => x.source));
  check("import filter kat", (await fetchPortalListings(env2, { kat: "Fahrrad" })).length === 1);
  check("import filter q", (await fetchPortalListings(env2, { q: "hell" })).length === 1);
  globalThis.fetch = async () => { throw new Error("net"); };
  check("import fetch-fehler -> []", (await fetchPortalListings(env2, {})).length === 0);
  globalThis.fetch = orig;

  // OpenImmo-Export (Homegate-Weg)
  console.log("\nOpenImmo (Homegate-Weg):");
  const xml = toOpenImmoXml(
    { id: 42, kat: "Immobilien", titel: "3.5 Zi Wohnung", beschreibung: "hell & ruhig", preis: "1850", ort: "Bern", plz: "3000", bild: "https://i/1.jpg", typ: "Angebot", created: 1700000000000 },
    { OPENIMMO_ANID: "aban-test", OPENIMMO_EMAIL: "k@aban.ch" }
  );
  check("openimmo wohlgeformter header", xml.startsWith("<?xml") && xml.includes("<openimmo>"));
  check("openimmo anid/titel/ort", xml.includes("aban-test") && xml.includes("3.5 Zi Wohnung") && xml.includes("<ort>Bern</ort>"));
  check("openimmo objektnr extern", xml.includes("<objektnr_extern>aban-42</objektnr_extern>"));
  check("openimmo miete default", xml.includes('MIETE_PACHT="1"') && xml.includes("<kaltmiete>1850</kaltmiete>"));
  check("openimmo bild als anhang", xml.includes("<pfad>https://i/1.jpg</pfad>"));
  const xmlKauf = toOpenImmoXml({ id: 1, titel: "Haus", preis: "CHF 950000" }, {});
  check("openimmo kauf erkannt", xmlKauf.includes('KAUF="1"') && xmlKauf.includes("<kaufpreis>950000</kaufpreis>"));
  check("openimmo escaped <&>", toOpenImmoXml({ id: 1, titel: "A & B <x>" }, {}).includes("A &amp; B &lt;x&gt;"));

  // Format-Routing + Kategorie-Filter
  console.log("\nFormat-Routing + Kategorie-Filter:");
  let sent = [];
  globalThis.fetch = async (url, opt) => { sent.push({ url, ct: opt.headers["Content-Type"], body: opt.body }); return new Response("", { status: 200 }); };
  const env3 = { LISTING_PORTALS: JSON.stringify([
    { name: "Homegate", feedUrl: "https://h/openimmo", format: "openimmo", categories: ["Immobilien"] },
    { name: "Anibis", feedUrl: "https://a/post" },
  ]) };
  const rImmo = await crossPostToPortals({ id: 9, kat: "Immobilien", titel: "Wohnung", preis: "1500" }, env3);
  check("immobilie -> beide portale", rImmo.length === 2 && rImmo.every((r) => r.ok), rImmo);
  check("homegate bekommt XML", sent.some((s) => s.url === "https://h/openimmo" && s.ct.includes("xml") && s.body.includes("<openimmo>")));
  check("anibis bekommt JSON", sent.some((s) => s.url === "https://a/post" && s.ct.includes("json")));
  sent = [];
  const rMoebel = await crossPostToPortals({ id: 10, kat: "Möbel", titel: "Sofa", preis: "200" }, env3);
  check("möbel -> homegate übersprungen (kategorie)", rMoebel.find((r) => r.portal === "Homegate").skipped === "category");
  check("möbel -> anibis trotzdem gepostet", rMoebel.find((r) => r.portal === "Anibis").ok === true && sent.length === 1);
  globalThis.fetch = orig;

  console.log(`\n${fail ? "✗" : "✓"} ${pass} ok, ${fail} fehlgeschlagen`);
  if (fail) process.exit(1);
})();
