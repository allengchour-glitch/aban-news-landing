// Cloudflare Pages Function — GET /api/jobs?q=...&loc=...&tag=...&remote=1&page=1
// Aggregiert ECHTE Stellenanzeigen über offizielle, freie Job-APIs (legal) und gibt sie
// normalisiert + gefiltert zurück. Quelle: Arbeitnow (frei, kein Key). Links zeigen auf die
// Original-Anzeige (wie Google Jobs / Indeed). Ohne Netz: kleine Demo-Liste.
const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
function demo(q) {
  const base = q || "Stelle";
  return [1, 2, 3, 4, 5, 6].map((i) => ({
    title: base + " — Beispiel-Stelle " + i + " (Demo)", company: "Beispiel GmbH",
    location: "Berlin", remote: i % 2 === 0, tags: ["Demo"], types: ["Vollzeit"], url: "#", created: "",
  }));
}
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 60);
  const loc = (url.searchParams.get("loc") || "").trim().toLowerCase().slice(0, 40);
  const tag = (url.searchParams.get("tag") || "").trim().toLowerCase().slice(0, 40);
  const remoteOnly = url.searchParams.get("remote") === "1";
  const page = Math.min(Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1), 10);
  const filtering = !!(q || loc || tag || remoteOnly);
  try {
    // Beim Filtern mehrere Seiten holen (mehr Treffer), sonst nur die gewünschte Seite.
    const pages = filtering ? [1, 2, 3] : [page];
    let raw = [];
    for (const p of pages) {
      const r = await fetch("https://www.arbeitnow.com/api/job-board-api?page=" + p, {
        headers: { "User-Agent": "abannews-jobboard/1.0", "Accept": "application/json" },
        cf: { cacheTtl: 600, cacheEverything: true },
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (Array.isArray(d.data)) raw = raw.concat(d.data);
    }
    if (!raw.length) return json({ demo: true, reason: "empty", items: demo(q) });
    let items = raw.map((j) => ({
      title: j.title || "", company: j.company_name || "", location: j.location || "",
      remote: !!j.remote, tags: (j.tags || []).slice(0, 4), types: (j.job_types || []).slice(0, 3),
      url: j.url || "", created: j.created_at || "",
    }));
    if (q) items = items.filter((it) => (it.title + " " + it.company + " " + it.tags.join(" ")).toLowerCase().includes(q));
    if (loc) items = items.filter((it) => it.location.toLowerCase().includes(loc));
    if (tag) items = items.filter((it) => it.tags.join(" ").toLowerCase().includes(tag));
    if (remoteOnly) items = items.filter((it) => it.remote);
    // Duplikate (gleiche url) entfernen
    const seen = {}; items = items.filter((it) => (it.url && !seen[it.url]) ? (seen[it.url] = 1) : !it.url);
    return json({ demo: false, count: items.length, items: items.slice(0, 60), source: "Arbeitnow" });
  } catch (e) {
    return json({ demo: true, reason: "error", items: demo(q) });
  }
}
