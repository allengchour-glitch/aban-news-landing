// Cloudflare Pages Function — GET /api/click-stats?key=...
// Gibt die aggregierten, anonymen Klick-Zähler als JSON zurück (für /klick-statistik.html).
// Geschützt durch Env CLICK_STATS_KEY: ohne gesetzten Key oder bei falschem Key → 404.
// Nur aggregierte Zahlen, keine Personendaten.

const H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });

export async function onRequestGet(context) {
  const { request, env } = context;
  const want = env.CLICK_STATS_KEY || "";
  const got = new URL(request.url).searchParams.get("key") || "";
  if (!want || got !== want) return new Response("Not found", { status: 404 });
  if (!env.CLICK_KV) return json({ ok: true, items: [], note: "CLICK_KV nicht gebunden" });
  const out = [];
  let cursor;
  try {
    do {
      const list = await env.CLICK_KV.list({ prefix: "c:", cursor });
      for (const k of list.keys) {
        const v = await env.CLICK_KV.get(k.name);
        const raw = k.name.slice(2);            // "c:" weg
        const bar = raw.indexOf("|");
        out.push({ path: raw.slice(0, bar), label: raw.slice(bar + 1), clicks: parseInt(v, 10) || 0 });
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
  } catch (e) { return json({ ok: false, error: "read failed" }, 502); }
  out.sort((a, b) => b.clicks - a.clicks);
  return json({ ok: true, total: out.reduce((s, x) => s + x.clicks, 0), items: out.slice(0, 500) });
}
