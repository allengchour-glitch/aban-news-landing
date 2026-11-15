// Echte Header, echte Frames und Modell-Blobs; keine Browser-Sicherheitsumgehung.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"),
  path = require("path");
const origin = process.env.GAMES_TEST_URL || "http://127.0.0.1:8112";
(async () => {
  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const checks = [];
  const check = (name, ok) => {
    checks.push({ name, ok: !!ok });
    if (!ok) throw Error(name);
  };
  try {
    const context = await browser.newContext({
      viewport: { width: 800, height: 450 },
      permissions: ["microphone"],
    });
    const p = await context.newPage();
    const violations = [];
    const collection = await context.request.get(origin + "/minispiele/");
    check(
      "Lokale Spieleübersicht öffnet die Minispiele-Sammlung",
      collection.ok() && (await collection.text()).includes("<title>"),
    );
    await p.goto(origin + "/lebenspfad");
    await p.evaluate(() => {
      window.auditViolations = [];
      addEventListener("securitypolicyviolation", (e) =>
        auditViolations.push({
          directive: e.effectiveDirective,
          blocked: e.blockedURI,
        }),
      );
    });
    const childReady = await p.evaluate(async () => {
      const frame = document.createElement("iframe");
      frame.id = "audit-minigame";
      frame.src = "/minispiele/punkte-jagd.html";
      document.body.append(frame);
      await new Promise((resolve) => (frame.onload = resolve));
      try {
        return frame.contentDocument?.title || null;
      } catch {
        return null;
      }
    });
    check(
      "Lebenspfad darf echtes Punkte-Jagd-Minispiel einbetten",
      /Punkte.Jagd/.test(childReady || ""),
    );
    check(
      "Lokaler Modell-Blob ist lesbar",
      await p.evaluate(async () => {
        const url = URL.createObjectURL(new Blob(["modell-test"]));
        try {
          return (await (await fetch(url)).text()) === "modell-test";
        } catch {
          return false;
        } finally {
          URL.revokeObjectURL(url);
        }
      }),
    );
    check(
      "Eingebettete Modelltextur lädt als echtes Blob-Bild",
      await p.evaluate(
        () =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(
              new Blob(
                [
                  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
                ],
                { type: "image/svg+xml" },
              ),
            );
            const image = new Image();
            const done = (ok) => {
              URL.revokeObjectURL(url);
              resolve(ok);
            };
            image.onload = () => done(image.naturalWidth === 4);
            image.onerror = () => done(false);
            image.src = url;
          }),
      ),
    );
    check(
      "Sprachchat erhält nur nach Browserfreigabe einen Test-Audiotrack",
      await p.evaluate(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          const ok = stream.getAudioTracks().length === 1;
          stream.getTracks().forEach((t) => t.stop());
          return ok;
        } catch {
          return false;
        }
      }),
    );
    violations.push(...(await p.evaluate(() => auditViolations)));
    check(
      "Keine CSP-Blockade der geprüften Einbettung/Blob-Abrufe",
      violations.length === 0,
    );
    // Header beider URL-Formen prüfen, damit der Hosting-Alias keinen Fehler versteckt.
    const embedded = [
      "neon-flug",
      "neon-park",
      "neon-dungeon",
      "neon-jump",
      "neon-racer",
      "neon-survivor",
      "neon-zusammen",
    ];
    for (const game of embedded)
      for (const suffix of ["", ".html"]) {
        const response = await context.request.get(
          origin + "/" + game + suffix,
        );
        const headers = response.headers();
        check(
          `${game}${suffix}: nur eigener Ursprung darf einbetten`,
          response.ok() &&
            headers["x-frame-options"] === "SAMEORIGIN" &&
            headers["content-security-policy"].includes(
              "frame-ancestors 'self'",
            ),
        );
      }
    await p.goto(origin + "/neon-wildnis");
    const station = await p.evaluate(async () => {
      const frame = document.createElement("iframe");
      frame.src = "/neon-jump?station=1";
      document.body.append(frame);
      await new Promise((resolve) => (frame.onload = resolve));
      try {
        return {
          title: frame.contentDocument?.title,
          path: frame.contentWindow?.location.pathname,
        };
      } catch {
        return null;
      }
    });
    check(
      "Wildnis lädt echte Sprung-Station ohne Wildnis-Weiterleitung",
      station?.path === "/neon-jump" && !!station.title,
    );
    for (const route of ["/impressum.html", "/wort-des-tages.html"]) {
      const headers = (await context.request.get(origin + route)).headers();
      check(
        `${route}: globale Einbettungs- und Mikrofonbeschränkung erhalten`,
        headers["x-frame-options"] === "DENY" &&
          headers["content-security-policy"].includes(
            "frame-ancestors 'none'",
          ) &&
          headers["permissions-policy"].includes("microphone=()"),
      );
    }
    const directory = process.env.GAMES_REPORT_DIR || "/tmp/aban-parallel-qa";
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "headers-results.json"),
      JSON.stringify(
        {
          checks,
          violations,
          microphone:
            "Nur synthetisches Chromium-Testgerät; keine reale Aufnahme",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ checks, violations }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
