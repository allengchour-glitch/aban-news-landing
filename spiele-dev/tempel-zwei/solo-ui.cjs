const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
let browser;
const checks = [],
  errors = [];
const OUT = __dirname + "/screens";
function check(name, ok, detail) {
  console.log((ok ? "PASS " : "FAIL ") + name);
  checks.push({ name, ok: !!ok, ...(detail ? { detail } : {}) });
  if (!ok) throw Error(name);
}
const wait = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 15000 });
const tp = (p, i, x, z) =>
  p.evaluate(({ i, x, z }) => __zs.tp(i, x, z), { i, x, z });
const state = (p) => p.evaluate(() => __zs.state());
async function cross(p, z) {
  await p.keyboard.down("w");
  try {
    await wait(p, (z) => __zs.state().a.z < z, z);
  } finally {
    await p.keyboard.up("w");
  }
}
(async () => {
  browser = await chromium.launch();
  const c = await browser.newContext({
    viewport: { width: 960, height: 540 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:8120/neon-zusammen.html?mp=local");
  await wait(p, () => window.__zs);
  await p.click("#tHostBtn");
  await p.click("#copyInvite");
  const link = await p.evaluate(() => navigator.clipboard.readText());
  check(
    "Kopierter Link enthält echten Code und erhält lokalen Testmodus",
    new URL(link).searchParams.get("raum") ===
      (await p.locator("#inviteCode").innerText()) &&
      new URL(link).searchParams.get("mp") === "local",
  );
  check(
    "Lobby wächst beim Warten scrollbar ab sichtbarem Titel",
    await p
      .locator("#entryTitle")
      .evaluate((e) => e.getBoundingClientRect().top >= 35),
  );
  await p.click("#cancelCoop");
  await p.click("#startBtn");
  check(
    "Abgebrochene Suche startet echten Solo-Modus",
    !(await state(p)).online,
  );
  await tp(p, 0, -6, -10);
  await tp(p, 1, 2, 2);
  await p.waitForTimeout(200);
  check("Solo braucht ebenfalls zwei Platten", !(await state(p)).gates[0]);
  await p.keyboard.press("q");
  await tp(p, 1, 6, -10);
  await wait(p, () => __zs.state().gates[0] && __zs.state().room === 2);
  check("Parken und Q-Wechsel lösen Raum 1", true);
  await p.keyboard.press("q");
  await cross(p, -17);
  check("Solo durchquert Tor 1", true);
  await tp(p, 0, -6, -25);
  await p.click("#bAct");
  await wait(p, () => !__zs.state().vines);
  await tp(p, 0, -6, -32);
  await p.keyboard.press("e");
  await p.keyboard.press("q");
  await tp(p, 1, 6, -29);
  await p.focus("#bAct");
  await p.keyboard.press("Space");
  check(
    "Eine native Leertaste am Aktionsknopf führt genau eine Aktion aus",
    (await state(p)).plant && !(await state(p)).levers[1],
  );
  await p.keyboard.press("e");
  await wait(p, () => __zs.state().gates[1] && __zs.state().room === 3);
  check("Beide Elementkräfte und Hebel im Solo aktivierbar", true);
  await p.keyboard.press("q");
  await tp(p, 0, -4, -38);
  await cross(p, -41);
  check("Solo durchquert Tor 2", true);
  await tp(p, 0, -6, -51);
  await tp(p, 1, 6, -51);
  await p.keyboard.press("e");
  await wait(p, () => __zs.state().sync[0] <= 0);
  check(
    "Solo kann Gleichklang nach abgelaufenem Impuls neu versuchen",
    !(await state(p)).gates[2],
  );
  await p.keyboard.press("e");
  await p.keyboard.press("q");
  await p.keyboard.press("e");
  await wait(p, () => __zs.state().gates[2] && __zs.state().room === 4);
  check(
    "E, Q, E mit zwei vorbereiteten Figuren löst das echte 1,2-s-Fenster",
    true,
  );
  await p.keyboard.press("q");
  await tp(p, 0, -4, -60);
  await cross(p, -63);
  check("Solo durchquert Tor 3", true);
  // Vorwärts gerichteter Strahl: nah am Wächter vor ihm stehen, Treffer erzwingen.
  await tp(p, 0, 0, -72);
  await tp(p, 1, 3, -66);
  await wait(p, () => __zs.state().a.z > -67);
  const hit = await state(p);
  check(
    "Wächter setzt nur zum Raum-4-Eingang zurück, drei Siegel bleiben offen",
    Math.abs(hit.a.z + 66.2) < 0.01 &&
      hit.gates.slice(0, 3).every(Boolean) &&
      hit.room === 4,
  );
  await p.screenshot({ path: OUT + "/after-solo-checkpoint.png" });
  await tp(p, 0, -7.6, -68.5);
  await tp(p, 1, 7, -81);
  await wait(p, () => __zs.state().blind);
  await p.keyboard.press("q");
  await p.keyboard.press("e");
  await wait(p, () => __zs.state().altW);
  await tp(p, 1, 0, -80.5);
  await p.keyboard.press("q");
  await tp(p, 0, -7, -81);
  await p.keyboard.press("e");
  await wait(p, () => __zs.state().g4);
  check(
    "Solo-Wächter mit hinterer Schattenplatte und Rollenwechsel lösbar",
    true,
  );
  await tp(p, 0, -4, -84);
  await cross(p, -87);
  check("Solo durchquert Tor 4", true);
  await tp(p, 0, -1, -93);
  await p.waitForTimeout(150);
  check("Solo-Sieg wartet auf die zweite Figur", !(await state(p)).won);
  await p.keyboard.press("q");
  await tp(p, 1, 1, -93);
  await wait(p, () => __zs.state().won);
  check("Vier Solo-Rätsel führen zum gemeinsamen Herz-Abschluss", true);
  await p.waitForTimeout(2300);
  await p.screenshot({ path: OUT + "/after-solo-victory.png" });
  await p.click("#startBtn");
  await wait(p, () => window.__zs && !__zs.state().running);
  check(
    "Nochmal führt in eine frische Lobby ohne alte Raum-Einladung",
    !new URL(p.url()).searchParams.has("raum"),
  );
  // Kleine Portrait- und Querformate: Ziele lassen Platz für Daumen und Figuren.
  const mc = await browser.newContext({
    viewport: { width: 360, height: 640 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const m = await mc.newPage();
  await m.goto("http://localhost:8120/neon-zusammen.html");
  await wait(m, () => window.__zs);
  await m.click("#startBtn");
  await m.waitForTimeout(300);
  await m.screenshot({ path: OUT + "/after-mobile-small.png" });
  check(
    "360×640: Aufgabenpanel liegt über den Figurenlabels",
    await m.evaluate(
      () =>
        document.getElementById("objective").getBoundingClientRect().bottom <
        document.getElementById("playerEmber").getBoundingClientRect().top,
    ),
  );
  await m.setViewportSize({ width: 844, height: 390 });
  await m.waitForTimeout(300);
  await m.screenshot({ path: OUT + "/after-mobile-landscape.png" });
  check(
    "844×390: Aufgabenpanel liegt zwischen den beiden Daumenbereichen",
    await m.evaluate(() => {
      const o = document.getElementById("objective").getBoundingClientRect(),
        s = document.getElementById("stick").getBoundingClientRect(),
        b = document.getElementById("bSwap").getBoundingClientRect();
      return (
        o.left > s.right + 8 && o.right < b.left - 8 && o.bottom < innerHeight
      );
    }),
  );
  await mc.close();
  const fallback = await c.newPage();
  await fallback.route("**/assets/tempel-zwei/cover-v1.webp", (r) => r.abort());
  await fallback.goto("http://localhost:8120/neon-zusammen.html");
  await wait(fallback, () => window.__zs);
  check(
    "Fehlendes Cover lässt sichtbare SVG-Illustration und Startknopf nutzbar",
    (await fallback.locator(".entry-art svg").isVisible()) &&
      (await fallback.locator("#startBtn").isVisible()),
  );
  await fallback.screenshot({ path: OUT + "/after-cover-fallback.png" });
  await fallback.close();
  check("Keine JavaScript-Fehler im Solo", errors.length === 0, errors);
  await browser.close();
  fs.writeFileSync(
    __dirname + "/solo-results.json",
    JSON.stringify(
      {
        environment:
          "Chromium, echte UI-Aktionen/Q-Wechsel; Positionsfixtures an Rätselobjekten, alle vier offenen Tore tatsächlich mit W durchquert; virtuelle Touch-Viewports.",
        checks,
        errors,
      },
      null,
      2,
    ),
  );
})().catch(async (e) => {
  console.error(e);
  fs.writeFileSync(
    __dirname + "/solo-results.json",
    JSON.stringify({ checks, errors, failure: e.message }, null, 2),
  );
  if (browser) await browser.close();
  process.exit(1);
});
