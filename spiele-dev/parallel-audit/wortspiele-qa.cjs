// Gezielte Browserprüfung beider Wortspiele gegen den Preview mit echten Headern.
// BASE_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/wortspiele-qa.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8112";
const out = process.env.WORT_QA_OUT || "/tmp/wortspiele-audit";
const root = path.resolve(__dirname, "../..");
const words = JSON.parse(
  fs
    .readFileSync(path.join(root, "wort-des-tages.html"), "utf8")
    .match(/var WORDS=(\[[^;]+\]);/)[1],
);
const puzzles = JSON.parse(
  fs
    .readFileSync(path.join(root, "wortbruecke.html"), "utf8")
    .match(/var P=(\[[\s\S]*?\n  \]);/)[1],
);
const day = Date.UTC(2026, 0, 1) / 864e5;
const observations = [];
let checks = 0;
function ok(condition, message) {
  assert.ok(condition, message);
  checks++;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const launchOptions = { headless: true };
  if (process.env.PW_CHROME)
    launchOptions.executablePath = process.env.PW_CHROME;
  const browser = await chromium.launch(launchOptions);
  try {
    const context = await browser.newContext({
      viewport: { width: 320, height: 540 },
      hasTouch: true,
      isMobile: true,
      timezoneId: "UTC",
    });
    const page = await context.newPage();
    const failures = [];
    page.on("pageerror", (e) => failures.push("JS: " + e.message));
    page.on("console", (m) => {
      if (m.type() === "error")
        failures.push("Konsole: " + m.text() + " [" + m.location().url + "]");
    });
    page.on("response", (r) => {
      if (r.status() >= 400)
        failures.push("HTTP " + r.status() + ": " + r.url());
    });
    page.on("requestfailed", (r) => {
      // Schnelle Tageswechsel können die noch laufende Favicon-Anfrage abbrechen.
      // Nur diesen Navigationsabbruch getrennt erfassen; HTTP-/CSP-Fehler bleiben hart.
      if (
        r.url() === base + "/favicon.svg" &&
        r.failure().errorText === "net::ERR_ABORTED"
      )
        observations.push("Favicon durch Navigation abgebrochen");
      else failures.push("Netz: " + r.url() + " " + r.failure().errorText);
    });
    const favicon = await context.request.get(base + "/favicon.svg");
    ok(
      favicon.status() === 200 &&
        (favicon.headers()["content-type"] || "").includes("image/svg"),
      "vorhandenes Favicon HTTP 200 / SVG",
    );
    await page.addInitScript(() => {
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        window.__csp.push(e.violatedDirective + ": " + e.blockedURI),
      );
    });
    await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") });
    async function visit(file) {
      if (page.url().startsWith(base)) {
        ok(
          (await page.evaluate(() => window.__csp)).length === 0,
          "keine CSP-Verstöße vor Navigation",
        );
      }
      const response = await page.goto(base + "/" + file);
      ok(response.ok(), file + ": HTTP erfolgreich");
      ok(
        !!response.headers()["content-security-policy"],
        file + ": echte CSP geliefert",
      );
    }
    async function fresh(file, seed = {}, date = "2026-01-01T12:00:00Z") {
      await page.clock.setSystemTime(new Date(date));
      await visit(file);
      await page.evaluate((seed) => {
        localStorage.clear();
        for (const [k, v] of Object.entries(seed))
          localStorage.setItem(k, JSON.stringify(v));
      }, seed);
      await page.reload();
    }
    const text = (selector) => page.locator(selector).textContent();
    const row = (i) => page.locator("#board .row").nth(i).textContent();
    const key = (letter) =>
      page
        .locator("#kb button")
        .filter({ hasText: new RegExp("^" + letter + "$") });
    async function noOverflow(note) {
      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      ok(
        dimensions.scroll === dimensions.width,
        note + ": kein horizontaler Überlauf",
      );
    }
    async function submit(word) {
      await page.keyboard.type(word);
      await page.keyboard.press("Enter");
    }

    await fresh("wort-des-tages.html");
    await noOverflow("Wort des Tages 320px");
    await key("T").tap();
    await page.keyboard.press("Enter");
    ok(
      (await row(0)) === "T",
      "Enter nach Touch fügt keinen zweiten Buchstaben ein",
    );
    await page.keyboard.press("Control+c");
    ok((await row(0)) === "T", "Browser-Tastenkürzel verändern Eingabe nicht");
    await page.keyboard.press("Backspace");
    ok((await row(0)) === "", "Rücktaste löscht");
    await submit("XXXXX");
    ok(
      (await text("#msg")) === "Nicht in der Wortliste",
      "ungültiges Wort wird erklärt",
    );
    ok(
      (await page.evaluate(
        () => JSON.parse(localStorage.aban_wdt).guesses.length,
      )) === 0,
      "ungültiges Wort verbraucht keinen Versuch",
    );
    for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");
    await page.keyboard.type("TA");
    await page.reload();
    ok((await row(0)) === "TA", "unfertige Eingabe überlebt Neuladen");
    await page.keyboard.type("SSE");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(900);
    const marks = await page
      .locator("#board .row")
      .first()
      .locator(".tile")
      .evaluateAll((ts) =>
        ts.map((t) => ["ok", "mid", "no"].find((c) => t.classList.contains(c))),
      );
    assert.deepEqual(marks, ["ok", "no", "ok", "no", "no"]);
    checks++;
    ok(
      (
        await page
          .locator("#board .row")
          .first()
          .locator(".tile")
          .nth(3)
          .getAttribute("aria-label")
      ).includes("nicht enthalten"),
      "Doppelbuchstabenwertung zugänglich beschriftet",
    );
    await page.reload();
    ok(
      (await row(0)) === "TASSE" && (await row(1)) === "",
      "abgegebener Versuch ohne Geistereingabe wiederhergestellt",
    );
    await submit("TISCH");
    await page.waitForTimeout(950);
    ok(await page.locator("#endcta").isVisible(), "Gewinn-Endzustand sichtbar");
    ok(
      (await text("#played")) === "1" && (await text("#winpct")) === "100%",
      "Gewinn einmal gezählt",
    );
    await page.locator("#sharebtn").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    await noOverflow("Wort des Tages Gewinn 320px");
    await page.screenshot({ path: path.join(out, "word-after-win.png") });
    await page.reload();
    ok(
      (await page.locator("#endcta").isVisible()) &&
        (await text("#played")) === "1",
      "Gewinn-Neuladen zählt nicht doppelt",
    );
    await page.keyboard.type("APFEL");
    ok((await row(2)) === "", "Eingabe nach Spielende gesperrt");
    await fresh("wort-des-tages.html");
    for (let i = 0; i < 6; i++) await submit("APFEL");
    await page.waitForTimeout(950);
    ok(
      (await text("#ctah")).includes("TISCH"),
      "sechster Fehlversuch zeigt Lösung",
    );
    ok(
      (await text("#played")) === "1" && (await text("#winpct")) === "0%",
      "Verlust einmal gezählt",
    );
    await page.reload();
    ok(
      (await page.locator("#endcta").isVisible()) &&
        (await text("#played")) === "1",
      "Verlust bleibt nach Neuladen erhalten",
    );
    await fresh("wort-des-tages.html", {
      aban_wdt: { day: 0, guesses: ["APFEL"], row: 0, done: false },
      aban_wdt_stats: { played: 7, wins: 4, streak: 3, lastDay: -1 },
    });
    ok(
      (await row(0)) === "APFEL" && (await text("#played")) === "7",
      "alter gültiger Spielstand und Statistik erhalten",
    );
    await fresh("wort-des-tages.html", {
      aban_wdt: { day: 0, guesses: Array(6).fill("APFEL"), done: false },
      aban_wdt_stats: null,
    });
    ok(
      (await page.locator("#endcta").isVisible()) &&
        (await text("#played")) === "0",
      "inkonsistentes Endflag und null-Statistik stürzen nicht ab",
    );
    await fresh("wort-des-tages.html", {
      aban_wdt_stats: { streak: 5, lastDay: -2 },
    });
    ok((await text("#streak")) === "0", "unterbrochene Serie zeigt null");
    await fresh("wort-des-tages.html", {
      aban_wdt: { day: -1, guesses: ["APFEL"], done: false },
      aban_wdt_stats: { played: 7, wins: 4 },
    });
    ok(
      (await row(0)) === "" && (await text("#played")) === "7",
      "neuer Tag setzt nur Rätsel zurück",
    );

    // Alle Tageslösungen sind gültig, erreichbar und mit bestehenden Saves kompatibel.
    ok(
      words.length === new Set(words).size &&
        words.every((w) => /^[A-Z]{5}$/.test(w)),
      "alle Tageswörter eindeutig und fünf Buchstaben",
    );
    for (let i = 0; i < words.length; i++) {
      await page.clock.setSystemTime(new Date(Date.UTC(2026, 0, 1 + i, 12)));
      await page.evaluate(
        ({ i, target }) =>
          localStorage.setItem(
            "aban_wdt",
            JSON.stringify({ day: i, guesses: [target], done: true }),
          ),
        { i, target: words[i] },
      );
      await visit("wort-des-tages.html");
      ok(
        (await text("#ctah")).includes("Stark"),
        "Tageswort " + i + " als gespeicherten Gewinn wiederhergestellt",
      );
    }
    observations.push(
      "Tageswörter: " + words.length + " / Brücken: " + puzzles.length,
    );

    await fresh("wortbruecke.html");
    const answer = puzzles[day % puzzles.length][1];
    await noOverflow("Wortbrücke 320px");
    ok(
      !!(await page.locator("#guess").getAttribute("aria-label")),
      "Eingabefeld hat Namen",
    );
    await page.locator("#go").tap();
    ok((await text("#tries")) === "0", "leere Eingabe zählt nicht");
    await page.locator("#hint").tap();
    const slots = await text("#slots");
    await page.locator("#guess").fill("FALSCH");
    await page.locator("#guess").press("Enter");
    ok(
      (await text("#tries")) === "1" && (await text("#hints")) === "1",
      "Enter zählt falschen Versuch einmal",
    );
    await page.locator("#guess").fill("HA");
    await page.reload();
    ok(
      (await text("#tries")) === "1" &&
        (await text("#hints")) === "1" &&
        (await text("#slots")) === slots &&
        (await page.locator("#guess").inputValue()) === "HA",
      "Versuche, Hinweis, Aufdeckung und Entwurf überleben Neuladen",
    );
    for (let i = 0; i < 12; i++) await page.locator("#hint").tap();
    ok(
      (await text("#hints")) === String(answer.length - 1),
      "Hinweise lassen letzten Buchstaben offen",
    );
    await page.locator("#guess").fill(answer.toLowerCase());
    await page.locator("#guess").press("Enter");
    ok(
      (await page.locator("#solved").isVisible()) &&
        !(await page.locator("#play").isVisible()),
      "Brücke Gewinn zeigt beide Komposita und sperrt Eingabe",
    );
    ok(
      (await text("#tries")) === "2" && (await text("#streak")) === "1",
      "Brücke zählt richtigen Versuch und Serie",
    );
    await noOverflow("Wortbrücke Gewinn 320px");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, "bridge-after-win.png") });
    await page.reload();
    ok(
      (await page.locator("#solved").isVisible()) &&
        (await text("#tries")) === "2" &&
        (await text("#streak")) === "1",
      "Brücke gelöstes Ergebnis bleibt exakt erhalten",
    );
    await fresh("wortbruecke.html", {
      aban_brk: { day, lastDay: day, streak: 9, lastTries: 4, lastHints: 2 },
    });
    ok(
      (await page.locator("#solved").isVisible()) &&
        (await text("#streak")) === "9" &&
        (await text("#tries")) === "4",
      "alter Brücken-Gewinn bleibt erhalten",
    );
    await fresh("wortbruecke.html", { aban_brk: null });
    ok(
      await page.locator("#play").isVisible(),
      "null-Brückenspielstand startet sicher",
    );
    await fresh("wortbruecke.html", {
      aban_brk: {
        day: day - 2,
        lastDay: day - 2,
        streak: 8,
        progress: { day: day - 1, tries: 5, hints: 2, revealed: 2 },
      },
    });
    ok(
      (await text("#streak")) === "0" && (await text("#tries")) === "0",
      "neuer Tag und unterbrochene Brücken-Serie korrekt",
    );

    // Jede der 33 Brücken wirklich über die Eingabe lösen, auch Umlaut-Umschriften.
    for (let i = 0; i < puzzles.length; i++) {
      const offset =
        (i - (day % puzzles.length) + puzzles.length) % puzzles.length;
      const date = new Date(Date.UTC(2026, 0, 1 + offset, 12));
      await fresh("wortbruecke.html", {}, date.toISOString());
      ok(
        (await text("#left")) === puzzles[i][0] &&
          (await text("#right")) === puzzles[i][2],
        "Brücke " + i + ": richtige Tagesauswahl",
      );
      const normalized = puzzles[i][1]
        .replace(/Ä/g, "AE")
        .replace(/Ö/g, "OE")
        .replace(/Ü/g, "UE")
        .toLowerCase();
      await page.locator("#guess").fill(normalized);
      await page.locator("#guess").press("Enter");
      ok(
        await page.locator("#solved").isVisible(),
        "Brücke " + i + ": Lösung akzeptiert",
      );
      await noOverflow("Brücke " + i + " Gewinn");
    }

    // Beide Teilen-Knöpfe reagieren auf Tastatur; verweigerte Zwischenablage bleibt ein UI-Fehler.
    for (const [file, selector] of [
      ["wort-des-tages.html", "#sharebtn"],
      ["wortbruecke.html", "#share"],
    ]) {
      const seed = file.startsWith("wort-des")
        ? { aban_wdt: { day: 0, guesses: ["TISCH"], done: true } }
        : {
            aban_brk: {
              day,
              lastDay: day,
              lastTries: 2,
              lastHints: 1,
              streak: 1,
            },
          };
      await fresh(file, seed);
      await page.evaluate(() => {
        Object.defineProperty(navigator, "share", {
          value: undefined,
          configurable: true,
        });
        Object.defineProperty(navigator, "clipboard", {
          value: {
            writeText: (text) => {
              window.__shared = text;
              return Promise.resolve();
            },
          },
          configurable: true,
        });
      });
      await page.locator(selector).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(30);
      ok(
        (await page.evaluate(() => window.__shared || "")).includes(file),
        file + ": Enter teilt Ergebnis",
      );
      ok(
        (await text("#msg")).includes("kopiert"),
        file + ": Kopieren bestätigt",
      );
      await page.evaluate(() => {
        navigator.clipboard.writeText = () =>
          Promise.reject(new Error("QA: verweigert"));
      });
      await page.locator(selector).click();
      await page.waitForTimeout(30);
      ok(
        (await text("#msg")).includes("nicht möglich"),
        file + ": Kopierfehler sichtbar",
      );
      ok(
        (await page.locator("#musBtn").getAttribute("aria-pressed")) ===
          "false",
        file + ": Musik standardmäßig aus",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(out, file.replace(".html", "-after-mobile.png")),
      });
      await page.setViewportSize({ width: 960, height: 540 });
      await noOverflow(file + " 960px");
      await page.screenshot({
        path: path.join(out, file.replace(".html", "-after-desktop.png")),
      });
      await page.setViewportSize({ width: 320, height: 540 });
    }
    // Fehlender Storage darf das Spielen nicht blockieren.
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("QA: kein Storage");
      };
      Storage.prototype.setItem = () => {
        throw new Error("QA: kein Storage");
      };
    });
    await page.clock.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    await visit("wort-des-tages.html");
    await submit("TISCH");
    await page.waitForTimeout(950);
    ok(await page.locator("#endcta").isVisible(), "Wort ohne Storage spielbar");
    await visit("wortbruecke.html");
    await page.locator("#guess").fill(answer);
    await page.locator("#go").tap();
    ok(
      await page.locator("#solved").isVisible(),
      "Brücke ohne Storage spielbar",
    );
    ok(
      (await page.evaluate(() => window.__csp)).length === 0,
      "keine CSP-Verstöße am Ende",
    );
    assert.deepEqual(failures, []);
    checks++;
    const summary = {
      result: "PASS",
      checks,
      base,
      viewport: "320×540 / 960×540",
      observations,
      runtimeConsoleNetworkErrors: failures,
    };
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
