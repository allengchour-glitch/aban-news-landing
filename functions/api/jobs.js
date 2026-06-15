// Cloudflare Pages Function — GET /api/jobs?q=...&loc=...&tag=...&remote=1&page=1
// Aggregiert ECHTE Stellenanzeigen aus MEHREREN offiziellen, freien Job-APIs (legal) und gibt sie
// normalisiert + gefiltert zurück. Quellen: Arbeitnow, Remotive, Jobicy, The Muse (alle frei, kein Key).
// Links zeigen IMMER auf die Original-Anzeige (Bewerbung beim Anbieter) — Pflicht laut deren Nutzung.
// Fällt eine Quelle aus, liefern die anderen weiter; fallen alle aus, kommt eine kleine Demo-Liste.
const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
function demo(q) {
  const base = q || "Stelle";
  return [1, 2, 3, 4, 5, 6].map((i) => ({
    title: base + " — Beispiel-Stelle " + i + " (Demo)", company: "Beispiel GmbH",
    location: "Berlin", remote: i % 2 === 0, tags: ["Demo"], types: ["Vollzeit"], url: "#", created: "", source: "Demo",
  }));
}
// Grobe Kategorie-Erkennung (für die Unterkategorie-Filter, quellenübergreifend einheitlich)
const CAT_KW = {
  "Software Development": ["developer", "entwickl", "software", "engineer", "programm", "devops", "data", "frontend", "backend", "fullstack"],
  "Sales": ["sales", "vertrieb", "account exec", "business development", "kundenberat"],
  "Marketing": ["marketing", "seo", "content", "social media", "growth", "brand"],
  "Administration": ["administration", "verwaltung", "office", "assistant", "assistenz", "sachbearbeit"],
  "Finance": ["finance", "finanz", "accountant", "buchhalt", "controlling", "tax", "steuer"],
  "Design": ["design", "ux", "ui", "grafik", "creative"],
  "Customer Service": ["customer", "support", "kundenservice", "kundenbetreuung", "service desk"],
  "Human Resources": ["human resources", "recruit", "personal", "talent acquisition"],
  "Engineering": ["mechanical", "electrical", "ingenieur", "construction", "manufacturing", "maschinen"],
};
function catOf(title, tags) {
  const hay = (String(title) + " " + (tags || []).join(" ")).toLowerCase();
  for (const c in CAT_KW) { if (CAT_KW[c].some((k) => hay.includes(k))) return c; }
  return "";
}
const norm = (s) => String(s == null ? "" : s).toLowerCase();
async function getJSON(url, headers) {
  const r = await fetch(url, { headers: { "User-Agent": "abannews-jobboard/1.0", "Accept": "application/json", ...(headers || {}) }, cf: { cacheTtl: 600, cacheEverything: true } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
// --- Quellen-Adapter: liefern je ein normalisiertes Array ---
async function srcArbeitnow(page) {
  const d = await getJSON("https://www.arbeitnow.com/api/job-board-api?page=" + page);
  return (d.data || []).map((j) => ({
    title: j.title || "", company: j.company_name || "", location: j.location || "",
    remote: !!j.remote, tags: (j.tags || []).slice(0, 4), types: (j.job_types || []).slice(0, 3),
    url: j.url || "", created: j.created_at ? (typeof j.created_at === "number" ? new Date(j.created_at * 1000).toISOString() : j.created_at) : "",
    source: "Arbeitnow",
  }));
}
// Mehrere Arbeitnow-Seiten parallel (grösserer DE/CH-Pool für Suchbegriffe wie „Pflege", „Verkauf")
async function srcArbeitnowMulti(pages) {
  const arr = await Promise.allSettled(pages.map((p) => srcArbeitnow(p)));
  let out = [];
  for (const s of arr) { if (s.status === "fulfilled" && Array.isArray(s.value)) out = out.concat(s.value); }
  return out;
}
async function srcRemotive(q) {
  const d = await getJSON("https://remotive.com/api/remote-jobs?limit=60" + (q ? "&search=" + encodeURIComponent(q) : ""));
  return (d.jobs || []).map((j) => ({
    title: j.title || "", company: j.company_name || "", location: j.candidate_required_location || "Remote",
    remote: true, tags: [j.category].filter(Boolean), types: (j.job_type ? [j.job_type] : []),
    url: j.url || "", created: j.publication_date || "", source: "Remotive",
  }));
}
async function srcJobicy() {
  const d = await getJSON("https://jobicy.com/api/v2/remote-jobs?count=50");
  return (d.jobs || []).map((j) => ({
    title: j.jobTitle || "", company: j.companyName || "", location: j.jobGeo || "Remote",
    remote: true, tags: (Array.isArray(j.jobIndustry) ? j.jobIndustry : [j.jobIndustry]).filter(Boolean).slice(0, 3),
    types: (Array.isArray(j.jobType) ? j.jobType : [j.jobType]).filter(Boolean).slice(0, 2),
    url: j.url || "", created: j.pubDate || "", source: "Jobicy",
  }));
}
async function srcMuse(page, q) {
  const d = await getJSON("https://www.themuse.com/api/public/jobs?page=" + page + (q ? "&q=" + encodeURIComponent(q) : ""));
  return (d.results || []).map((j) => {
    const loc = (j.locations || []).map((l) => l.name).filter(Boolean).join(", ");
    return {
      title: j.name || "", company: (j.company && j.company.name) || "", location: loc || "",
      remote: /remote|flexible/i.test(loc), tags: (j.categories || []).map((c) => c.name).slice(0, 3),
      types: j.type ? [j.type] : [], url: (j.refs && j.refs.landing_page) || "", created: j.publication_date || "",
      source: "The Muse",
    };
  });
}
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = norm(url.searchParams.get("q") || "").trim().slice(0, 60);
  const loc = norm(url.searchParams.get("loc") || "").trim().slice(0, 40);
  const tag = (url.searchParams.get("tag") || "").trim().slice(0, 40);
  const remoteOnly = url.searchParams.get("remote") === "1";
  const page = Math.min(Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1), 10);

  // Alle Quellen parallel; eine darf scheitern, ohne das Ganze zu kippen.
  // Bei der ersten Seite mehrere Arbeitnow-Seiten holen (breitere DE/CH-Abdeckung), sonst nur die angefragte.
  const jobs = [
    page === 1 ? srcArbeitnowMulti([1, 2, 3, 4]) : srcArbeitnow(page),
    srcMuse(page, q),
    page === 1 ? srcRemotive(q) : Promise.resolve([]),
    page === 1 ? srcJobicy() : Promise.resolve([]),
  ];
  const settled = await Promise.allSettled(jobs);
  let raw = [];
  const used = new Set();
  for (const s of settled) {
    if (s.status === "fulfilled" && Array.isArray(s.value) && s.value.length) {
      raw = raw.concat(s.value);
      if (s.value[0] && s.value[0].source) used.add(s.value[0].source);
    }
  }
  if (!raw.length) return json({ demo: true, reason: "empty", items: demo(q) });

  // Kategorie ableiten (für Unterkategorie-Filter)
  let items = raw.map((it) => ({ ...it, cat: catOf(it.title, it.tags) }));

  // Filter
  if (q) items = items.filter((it) => (norm(it.title) + " " + norm(it.company) + " " + norm((it.tags || []).join(" "))).includes(q));
  if (loc) items = items.filter((it) => norm(it.location).includes(loc));
  if (tag) {
    const t = norm(tag);
    items = items.filter((it) => norm(it.cat) === t || norm((it.tags || []).join(" ")).includes(t) || norm(it.title).includes(t));
  }
  if (remoteOnly) items = items.filter((it) => it.remote);

  // Duplikate (gleiche url) entfernen
  const seen = {}; items = items.filter((it) => (it.url && it.url !== "#" && !seen[it.url]) ? (seen[it.url] = 1) : false);

  // Neueste zuerst (Quellen mischen)
  items.sort((a, b) => (Date.parse(b.created) || 0) - (Date.parse(a.created) || 0));

  return json({ demo: false, count: items.length, items: items.slice(0, 90), sources: [...used], source: [...used].join(" · ") || "Partner-Jobbörsen" });
}
