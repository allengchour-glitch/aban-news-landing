// Node-Test der generischen Portal-Engine: node functions/_portals.test.mjs
import {
  getPortals, portalsConfigured, importPortalsConfigured,
  crossPostToPortals, fromPortalItem, fetchPortalListings,
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

  console.log(`\n${fail ? "✗" : "✓"} ${pass} ok, ${fail} fehlgeschlagen`);
  if (fail) process.exit(1);
})();
