// Zwei eigene Clients über die öffentlichen Vermittler, ohne TLS-/CSP-Ausnahmen.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"),
  path = require("node:path");
const out = process.env.FINAL_REPORT_DIR || "/tmp/aban-abschluss";
const base = process.env.NEON_TEST_URL || "http://127.0.0.1:8113";
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const r = {
    base,
    public: true,
    tlsVerification: true,
    checks: [],
    errors: [],
    requests: [],
  };
  try {
    const c = await b.newContext({ viewport: { width: 844, height: 390 } }),
      a = await c.newPage(),
      d = await c.newPage();
    for (const p of [a, d]) {
      p.on("pageerror", (e) => r.errors.push(e.message));
      p.on("requestfailed", (q) => {
        if (/peerjs/.test(q.url()))
          r.requests.push({
            host: new URL(q.url()).hostname,
            error: q.failure()?.errorText,
          });
      });
      p.on("console", (m) => {
        if (m.type() === "error")
          r.errors.push(
            m.text().replace(/([?&](?:token|key|id)=)[^&\s]+/g, "$1[redacted]"),
          );
      });
    }
    await a.goto(base + "/neon-flug?debug=1");
    await a.locator("#hostBtn").click();
    const code = await a.locator("#roomCode").innerText();
    await d.goto(base + "/neon-flug?debug=1");
    await d.locator("#joinToggle").click();
    await d.locator("#roomInput").fill(code);
    await d.locator("#joinForm button").click();
    try {
      await a.waitForFunction(
        () => __flight.role().connected && __flight.role().hello,
        null,
        { timeout: 26000 },
      );
      await d.waitForFunction(
        () => __flight.role().connected && __flight.role().hello,
        null,
        { timeout: 5000 },
      );
      r.connected = true;
      await a.locator("#readyBtn").click();
      await d.locator("#readyBtn").click();
      r.sharedBriefing =
        (await a.locator("#launchBtn").isVisible()) &&
        (await d.locator("#launchBtn").isVisible());
    } catch (e) {
      r.connected = false;
      r.failure = e.name;
    }
    r.status = await a.locator("#lobbyStatus").innerText();
    r.guestStatus = await d.locator("#lobbyStatus").innerText();
    r.checks.push({
      name: "Zwei echte Clients über öffentliche Vermittlung verbunden",
      ok: !!r.connected,
    });
    r.result = r.connected
      ? "PASS"
      : r.errors.some((e) => /ERR_CERT_AUTHORITY_INVALID/.test(e))
        ? "BLOCKIERT_TLS_UMGEBUNG"
        : "NICHT_BESTANDEN";
  } finally {
    await b.close();
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "oeffentlicher-koop.json"),
      JSON.stringify(r, null, 2),
    );
  }
  console.log(JSON.stringify(r));
  if (!r.connected) process.exitCode = 2;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
