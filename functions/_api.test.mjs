// Node-Test der gehärteten API: node functions/_api.test.mjs
// Ruft onRequestPost/onRequestOptions/onRequest mit gefälschten {request, env}-
// Kontexten direkt auf. Node 22 hat globale Request/Response/fetch.
// Der echte Claude-Pfad wird NICHT übers Netz aufgerufen — nur Fallback ohne
// Key sowie ein gemocktes globalThis.fetch für den Key-Pfad.
import { onRequest, onRequestPost, onRequestOptions } from "./api/hype-check.js";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

// --- Helfer zum Bauen von Requests / Kontexten ---
function req(method, { body, headers, contentType } = {}) {
  const h = new Headers(headers || {});
  if (contentType !== null && body !== undefined && !h.has("Content-Type")) {
    h.set("Content-Type", contentType || "application/json");
  }
  const init = { method, headers: h };
  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request("https://example.com/api/hype-check", init);
}
function ctx(method, opts, env = {}) {
  return { request: req(method, opts), env };
}
function hasSecurityHeaders(res) {
  return (
    res.headers.get("X-Content-Type-Options") === "nosniff" &&
    res.headers.get("Referrer-Policy") === "no-referrer" &&
    res.headers.get("Cache-Control") === "no-store"
  );
}

async function run() {
  // 1) analyze → 200 mit score/findings
  console.log("\nTest 1 — analyze:");
  {
    const res = await onRequestPost(ctx("POST", { body: { text: "Unsere revolutionäre Lösung ist ein Game-Changer!" } }));
    check("Status 200", res.status === 200, "status=" + res.status);
    const data = await res.json();
    check("hat score", typeof data.score === "number", "score=" + data.score);
    check("hat findings", Array.isArray(data.findings) && data.findings.length > 0);
    check("Security-Header gesetzt", hasSecurityHeaders(res));
    check("CORS gesetzt", res.headers.get("Access-Control-Allow-Origin") === "*");
  }

  // 2) rewrite ohne Key → Fallback
  console.log("\nTest 2 — rewrite ohne Key (Fallback):");
  {
    const res = await onRequestPost(ctx("POST", { body: { text: "Total mega revolutionärer Game-Changer!", action: "rewrite" } }, {}));
    check("Status 200", res.status === 200, "status=" + res.status);
    const data = await res.json();
    check("aiRewriteSource = fallback", data.aiRewriteSource === "fallback", "src=" + data.aiRewriteSource);
    check("aiRewrite vorhanden", typeof data.aiRewrite === "string" && data.aiRewrite.length > 0);
    check("kein aiRewriteError ohne Key", data.aiRewriteError === undefined);
  }

  // 3) bulk { texts: [...] } → results
  console.log("\nTest 3 — bulk:");
  {
    const res = await onRequestPost(ctx("POST", { body: { texts: ["Revolutionärer Game-Changer!", "Ich schreibe nüchtern und konkret."] } }));
    check("Status 200", res.status === 200, "status=" + res.status);
    const data = await res.json();
    check("count = 2", data.count === 2, "count=" + data.count);
    check("results Array", Array.isArray(data.results) && data.results.length === 2);
    check("result hat score", typeof data.results[0].score === "number");
    check("truncated false", data.truncated === false);
  }

  // 3b) bulk leere Liste → 400
  {
    const res = await onRequestPost(ctx("POST", { body: { texts: [] } }));
    check("leere Bulk-Liste → 400", res.status === 400, "status=" + res.status);
  }

  // 4) leerer Text → 400
  console.log("\nTest 4 — leerer Text:");
  {
    const res = await onRequestPost(ctx("POST", { body: { text: "   " } }));
    check("Status 400", res.status === 400, "status=" + res.status);
    const data = await res.json();
    check("error-Feld", typeof data.error === "string");
    check("Security-Header auch bei Fehler", hasSecurityHeaders(res));
  }

  // 5) kaputtes JSON → 400
  console.log("\nTest 5 — kaputtes JSON:");
  {
    const res = await onRequestPost(ctx("POST", { body: "{ not json", contentType: "application/json" }));
    check("Status 400", res.status === 400, "status=" + res.status);
    const data = await res.json();
    check("error = Ungültiger JSON-Body", /JSON/i.test(data.error || ""));
  }

  // 6) falsche Methode → 405 mit Allow
  console.log("\nTest 6 — falsche Methode (GET):");
  {
    const res = await onRequest(ctx("GET", {}));
    check("Status 405", res.status === 405, "status=" + res.status);
    check("Allow-Header POST, OPTIONS", res.headers.get("Allow") === "POST, OPTIONS", "allow=" + res.headers.get("Allow"));
    check("Security-Header bei 405", hasSecurityHeaders(res));
  }

  // 6b) onRequest leitet POST/OPTIONS korrekt weiter
  console.log("\nTest 6b — onRequest-Routing:");
  {
    const resPost = await onRequest(ctx("POST", { body: { text: "Game-Changer" } }));
    check("onRequest(POST) → 200", resPost.status === 200, "status=" + resPost.status);
    const resOpt = await onRequest(ctx("OPTIONS", {}));
    check("onRequest(OPTIONS) → 204", resOpt.status === 204, "status=" + resOpt.status);
  }

  // 7) falscher Content-Type → 415
  console.log("\nTest 7 — falscher Content-Type:");
  {
    const res = await onRequestPost(ctx("POST", { body: JSON.stringify({ text: "x" }), contentType: "text/plain" }));
    check("Status 415", res.status === 415, "status=" + res.status);
  }

  // 7b) fehlender Content-Type ist tolerant (kein 415)
  {
    const r = new Request("https://example.com/api/hype-check", { method: "POST", body: JSON.stringify({ text: "Revolutionärer Game-Changer" }) });
    // erzwingen, dass kein Content-Type gesetzt ist
    r.headers.delete("Content-Type");
    const res = await onRequestPost({ request: r, env: {} });
    check("fehlender Content-Type toleriert → 200", res.status === 200, "status=" + res.status);
  }

  // 8) zu großer Body (Content-Length) → 413
  console.log("\nTest 8 — zu großer Body:");
  {
    const r = new Request("https://example.com/api/hype-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": String(700 * 1024) },
      body: JSON.stringify({ text: "x" }),
    });
    const res = await onRequestPost({ request: r, env: {} });
    check("Status 413 via Content-Length", res.status === 413, "status=" + res.status);
  }
  // 8b) zu großer Body ohne Content-Length (tatsächliche Länge) → 413
  {
    const big = "a".repeat(610 * 1024);
    const res = await onRequestPost(ctx("POST", { body: JSON.stringify({ text: big }) }));
    check("Status 413 via Body-Länge", res.status === 413, "status=" + res.status);
  }

  // 9) OPTIONS → 204 mit Security-Headern
  console.log("\nTest 9 — OPTIONS preflight:");
  {
    const res = onRequestOptions();
    check("Status 204", res.status === 204, "status=" + res.status);
    check("CORS-Methoden", (res.headers.get("Access-Control-Allow-Methods") || "").includes("POST"));
    check("Security-Header", hasSecurityHeaders(res));
  }

  // 10) Claude-Pfad mit gemocktem fetch (Key gesetzt) → claude-Quelle, kein Key-Leak
  console.log("\nTest 10 — Claude-Pfad (gemockt):");
  {
    const realFetch = globalThis.fetch;
    let sawKey = null;
    globalThis.fetch = async (url, init) => {
      sawKey = init && init.headers && init.headers["x-api-key"];
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Nüchtern umgeschrieben." }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    };
    try {
      const res = await onRequestPost(ctx("POST", { body: { text: "Revolutionärer Game-Changer!", action: "rewrite" } }, { ANTHROPIC_API_KEY: "sk-test-secret-123456" }));
      const data = await res.json();
      check("aiRewriteSource = claude", data.aiRewriteSource === "claude", "src=" + data.aiRewriteSource);
      check("aiRewrite = Mock-Text", data.aiRewrite === "Nüchtern umgeschrieben.");
      check("Key wurde im Header gesendet", sawKey === "sk-test-secret-123456");
      const wholeBody = JSON.stringify(data);
      check("Key leakt NICHT in die Response", !wholeBody.includes("sk-test-secret-123456"));
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  // 11) Claude-Fehler (gemockter 500) → Fallback, Key leakt nicht in Error
  console.log("\nTest 11 — Claude-Fehler → Fallback ohne Key-Leak:");
  {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("server error", { status: 500 });
    try {
      const res = await onRequestPost(ctx("POST", { body: { text: "Revolutionärer Game-Changer!", action: "rewrite" } }, { ANTHROPIC_API_KEY: "sk-test-secret-123456" }));
      const data = await res.json();
      check("Fallback bei API-Fehler", data.aiRewriteSource === "fallback", "src=" + data.aiRewriteSource);
      check("aiRewriteError gesetzt", typeof data.aiRewriteError === "string");
      check("Key leakt NICHT in aiRewriteError", !String(data.aiRewriteError).includes("sk-test-secret-123456"));
      check("Key leakt NICHT in gesamter Response", !JSON.stringify(data).includes("sk-test-secret-123456"));
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  console.log("\n" + (fail === 0 ? "✅ ALLE TESTS BESTANDEN" : "❌ " + fail + " FEHLER") +
    "  (" + pass + " ok, " + fail + " fehlerhaft)");
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
