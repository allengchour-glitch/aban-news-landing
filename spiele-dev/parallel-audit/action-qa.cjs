/* Gezielte Action-QA: echte Header, Test-Hooks nur in Browser-Antworten.
   ACTION_BASE_URL=http://127.0.0.1:8112 PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/parallel-audit/action-qa.cjs
   ACTION_SOURCE_ROOT=/tmp/action-before prüft die gesicherten Vorher-Dateien; keine CSP-Ausnahme. */
const { chromium } = require(
  process.env.ACTION_PLAYWRIGHT ||
    process.env.PLAYWRIGHT_MODULE ||
    "playwright",
);
const fs = require("node:fs"),
  path = require("node:path");
const root = process.env.ACTION_SOURCE_ROOT || path.resolve(__dirname, "../..");
const base = process.env.ACTION_BASE_URL || "http://127.0.0.1:8112";
const out = process.env.ACTION_OUTPUT || "/tmp/action-qa";
fs.mkdirSync(out, { recursive: true });
const hooks = {
  jump: `window.__action={start:()=>startGame(false),state:()=>({x:PL[0].x,y:PL[0].y,vx:PL[0].vx,elapsed,inp:JSON.parse(JSON.stringify(inp)),paused:typeof paused==='undefined'?null:paused,platform:PLAT.filter(p=>p.mv).map(p=>({x:p.x,y:p.y}))}),noRender:()=>{renderer.render=()=>{};if(previewR)previewR.render=()=>{};}};`,
  racer: `window.__action={start:()=>{start();spawnD=coinSpawnD=1e9;},roadAt:d=>{dist=d;speed=0;},road:()=>{var sets=[tiles,leftRail,rightRail,vergeL,vergeR,edgeL,edgeR,midLine],off=[0,-HALF-0.3,HALF+0.3,-HALF-0.3-VW/2,HALF+0.3+VW/2,-HALF+0.35,HALF-0.35,0];return {dist,back:Math.max.apply(null,tiles.map(m=>m.position.z))+SP/2,cameraZ:camera.position.z,front:Math.min.apply(null,tiles.map(m=>m.position.z))-SP/2,gaps:tiles.slice(1).some((m,i)=>Math.abs(tiles[i].position.z-m.position.z-SP)>1e-8),aligned:sets.every((a,k)=>a.length===tiles.length&&a.every((m,i)=>Math.abs(m.position.z-tiles[i].position.z)<1e-8&&Math.abs(m.position.x-centerX(dist-m.position.z)-off[k])<1e-8)),marks:midLine.every(m=>m.visible===(Math.round((dist-m.position.z)/SP)%2===0))};},state:()=>({dist,shipX,offset:shipX-centerX(dist),keyL,keyR,brake,steer,paused}),noRender:()=>renderer.render=()=>{}};`,
  dungeon: `window.__action={start,state:()=>({running,px,py,pz,vy,runT,keys:JSON.parse(JSON.stringify(keys)),jHeld,jBuf,paused:typeof paused==='undefined'?null:paused}),rain:()=>{fallGems.length=0;var m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),M(0xffffff));m.position.y=20;fallGems.push({m,vy:0});},rainY:()=>fallGems[0].m.position.y,noRender:()=>renderer.render=()=>{}};`,
  survivor: `window.__action={start,state:()=>({x:player.position.x,z:player.position.z,t:S.t,keys:JSON.parse(JSON.stringify(keys)),paused,musicPaused:MUS.paused,buildMenuOpen,phase:S.buildPhase}),openBuild:()=>{enterBuildPhase();openBuildMenu();},noRender:()=>renderer.render=()=>{}};`,
};
let failures = 0,
  checks = 0;
const results = { base, root, games: {} };
function check(ok, name, detail) {
  checks++;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${name}${detail ? " " + JSON.stringify(detail) : ""}`,
  );
}
function time(s) {
  return s.elapsed ?? s.dist ?? s.runT ?? s.t;
}
async function instrument(page, game) {
  await page.addInitScript(() => {
    window.__qa = {
      now: 0,
      queue: [],
      step(ms, n = 1) {
        for (let i = 0; i < n; i++) {
          this.now += ms;
          const q = this.queue.splice(0);
          q.forEach((fn) => fn(this.now));
        }
      },
    };
    performance.now = () => __qa.now;
    requestAnimationFrame = (fn) => (__qa.queue.push(fn), __qa.queue.length);
  });
  await page.route(`**/neon-${game}.html*`, async (route) => {
    const response = await route.fetch();
    let body = fs.readFileSync(path.join(root, `neon-${game}.html`), "utf8");
    const pos = body.lastIndexOf("})();");
    if (pos < 0) throw Error("IIFE fehlt");
    body = body.slice(0, pos) + hooks[game] + body.slice(pos);
    await route.fulfill({ response, body });
  });
}
async function racerHudRects(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 540 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  try {
    const page = await ctx.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ctx.addInitScript(() =>
      localStorage.setItem("nr_best", "999999999999999"),
    );
    // Eigener origin erlaubt die echte Station, ohne CSP-Ausnahme oder Wildnis-Welt zu laden.
    await page.goto(`${base}/neon-racer.html?station=1`, { waitUntil: "load" });
    await page.locator("#startBtn").click();
    check(
      (await page.locator("#best").textContent()) === "999999999999999",
      "racer HUD: großer gespeicherter Rekord geladen",
    );
    const cases = [];
    for (const station of [false, true]) {
      let frame = page;
      if (station) {
        await page.evaluate(() => {
          const f = document.createElement("iframe");
          f.id = "racerQaStation";
          f.style.cssText =
            "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100";
          f.src = "/neon-racer.html?station=1";
          document.body.appendChild(f);
        });
        const iframe = await page.waitForSelector("#racerQaStation");
        frame = await iframe.contentFrame();
        await frame.waitForSelector("#stationBack");
      }
      for (const width of [320, 360]) {
        await page.setViewportSize({ width, height: 540 });
        for (const large of [false, true]) {
          const state = await frame.evaluate((large) => {
            document.getElementById("coins").textContent = large
              ? "999999999999999"
              : "12";
            document.getElementById("dist").textContent = large
              ? "999999999999999"
              : "123";
            document.getElementById("best").textContent = large
              ? "999999999999999"
              : "1234";
            const ids = [
              "#spd",
              "#coinpanel",
              ".best",
              "#muteBtn",
              "#shieldwrap",
              "#pauseBtn",
            ];
            if (document.getElementById("stationBack"))
              ids.push("#stationBack");
            const rects = Object.fromEntries(
              ids.map((id) => {
                const e = document.querySelector(id),
                  r = e.getBoundingClientRect();
                return [
                  id,
                  {
                    left: r.left,
                    right: r.right,
                    top: r.top,
                    bottom: r.bottom,
                    width: r.width,
                    height: r.height,
                    overflow: e.scrollWidth > e.clientWidth + 1,
                  },
                ];
              }),
            );
            const overlaps = [];
            for (let i = 0; i < ids.length; i++)
              for (let j = i + 1; j < ids.length; j++) {
                const a = rects[ids[i]],
                  b = rects[ids[j]];
                if (
                  a.left < b.right - 0.5 &&
                  a.right > b.left + 0.5 &&
                  a.top < b.bottom - 0.5 &&
                  a.bottom > b.top + 0.5
                )
                  overlaps.push([ids[i], ids[j]]);
              }
            return { width: innerWidth, rects, overlaps };
          }, large);
          const label = `${station ? "Station" : "Direkt"} ${width}px ${large ? "große" : "kleine"} Zahlen`;
          check(
            state.overlaps.length === 0,
            `racer HUD: keine Überdeckung (${label})`,
            state.overlaps,
          );
          check(
            Object.values(state.rects).every(
              (r) =>
                r.width > 0 &&
                r.height > 0 &&
                r.left >= 0 &&
                r.right <= width &&
                r.top >= 0 &&
                r.bottom <= 540 &&
                !r.overflow,
            ),
            `racer HUD: Zahlen/Bedienung im Bild (${label})`,
            state.rects,
          );
          cases.push({ station, large, ...state });
          if (large)
            await page.screenshot({
              path: path.join(
                out,
                `racer-hud-${station ? "station" : "direct"}-${width}.png`,
              ),
            });
        }
      }
      if (station)
        await page.locator("#racerQaStation").evaluate((e) => e.remove());
    }
    check(errors.length === 0, "racer HUD: keine JS-Ausnahme", errors);
    results.games.racer.hud = cases;
  } finally {
    await ctx.close();
  }
}
async function main() {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    for (const game of Object.keys(hooks)) {
      const ctx = await browser.newContext({
        viewport: { width: 960, height: 540 },
      });
      try {
        const page = await ctx.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await instrument(page, game);
        await page.goto(`${base}/neon-${game}.html?station=1`, {
          waitUntil: "load",
        });
        await page.waitForFunction(() => window.__action);
        if (game === "dungeon") {
          await page.locator("#ov details").evaluate((e) => (e.open = true));
          await page.locator("#dCode").focus();
          await page.keyboard.press("Space");
          check(
            !(await page.evaluate(() => __action.state())).running,
            "dungeon: Raum-Eingabe startet kein Spiel",
          );
          await page.locator("#dCode").blur();
        }
        await page.evaluate(() => {
          __action.noRender();
          __action.start();
          __qa.step(1000 / 60, 2);
        });
        const r = {};
        if (game === "racer") {
          r.timing = {};
          for (const fps of [30, 60, 120])
            r.timing[fps] = await page.evaluate((fps) => {
              __action.start();
              __qa.step(1000 / fps, fps);
              return __action.state();
            }, fps);
          check(
            Object.values(r.timing).every((s) => Math.abs(s.offset) < 1e-8),
            "racer: Kurvenmitte bei 30/60/120 FPS",
            r.timing,
          );
          r.road = [];
          for (const distance of [
            0, 4.999, 5, 9.999, 10, 10.001, 249.999, 250, 1000,
          ])
            r.road.push(
              await page.evaluate((d) => {
                __action.roadAt(d);
                __qa.step(0);
                return __action.road();
              }, distance),
            );
          check(
            r.road.every((s) => s.back >= s.cameraZ + 5),
            "racer: Straße deckt Kamera hinten auch bei Segmentwechseln",
            r.road.map((s) => ({
              dist: s.dist,
              back: s.back,
              cameraZ: s.cameraZ,
            })),
          );
          check(
            r.road.every((s) => !s.gaps && s.aligned && s.front <= -240),
            "racer: zusammenhängende Straße/Schultern und ausgerichtete Kurvensegmente",
          );
          check(
            r.road.every((s) => s.marks),
            "racer: Mittellinien bleiben an absoluten Streckenabschnitten",
          );
          await page.evaluate(() => __action.start());
        }
        if (game === "dungeon") {
          r.rain = {};
          for (const fps of [30, 60, 120])
            r.rain[fps] = await page.evaluate((fps) => {
              __action.rain();
              __qa.step(1000 / fps, fps / 2);
              return __action.rainY();
            }, fps);
          check(
            Object.values(r.rain).every((y) => Math.abs(y - 11) < 1e-8),
            "dungeon: Regen nach 0,5s bei 30/60/120 FPS",
            r.rain,
          );
        }
        await page.keyboard.down("d");
        await page.evaluate(() => __qa.step(1000 / 60, 6));
        await page.evaluate(() => dispatchEvent(new Event("blur")));
        r.blur = await page.evaluate(() => __action.state());
        const clear =
          game === "jump"
            ? r.blur.inp.every((i) => !i.L && !i.R && !i.J)
            : game === "racer"
              ? !r.blur.keyR && !r.blur.keyL && !r.blur.brake
              : !Object.values(r.blur.keys).some(Boolean);
        check(clear, `${game}: Fokusverlust löscht Eingaben`);
        check(r.blur.paused === true, `${game}: Solo-Fokusverlust pausiert`);
        await page.keyboard.up("d");
        await page.evaluate(() => __qa.step(1000 / 60, 30));
        r.frozen = await page.evaluate(() => __action.state());
        check(
          time(r.frozen) === time(r.blur),
          `${game}: Pause stoppt Spielzeit/Strecke`,
        );
        if (game === "jump")
          check(
            JSON.stringify(r.frozen.platform) ===
              JSON.stringify(r.blur.platform),
            "jump: Plattformen stehen in Pause",
          );
        if (r.frozen.paused) await page.keyboard.press("Escape");
        await page.evaluate(() => __qa.step(1000 / 60, 3));
        r.resumed = await page.evaluate(() => __action.state());
        check(
          r.resumed.paused === false && time(r.resumed) > time(r.frozen),
          `${game}: Escape setzt fort`,
        );
        await page.keyboard.press("Escape");
        const beforeRepeat = await page.evaluate(() => __action.state());
        await page.evaluate(() =>
          dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", repeat: true }),
          ),
        );
        r.repeat = await page.evaluate(() => __action.state());
        check(
          r.repeat.paused === beforeRepeat.paused && r.repeat.paused === true,
          `${game}: Auto-Repeat setzt Pause nicht fort`,
        );
        if (game === "survivor") {
          check(r.repeat.musicPaused, "survivor: Musik pausiert");
          await page.evaluate(() => {
            __action.openBuild();
            document.getElementById("pauseBtn").click();
            __qa.step(1000 / 60);
          });
          r.build = await page.evaluate(() => __action.state());
          check(
            r.build.buildMenuOpen && r.build.paused,
            "survivor: Pause-Button startet nicht hinter Baumenü",
          );
          check(r.build.musicPaused, "survivor: Baumenü pausiert Musik");
        }
        check(errors.length === 0, `${game}: keine JS-Ausnahme`, errors);
        r.errors = errors;
        results.games[game] = r;
      } finally {
        await ctx.close();
      }
    }
    if (!process.env.ACTION_MECHANICS_ONLY) {
      // Unveränderte HTTP-Antworten: echter Renderer, CSP-/Netz-/GPU-Fehler und kleine Ansichten.
      for (const game of Object.keys(hooks)) {
        const ctx = await browser.newContext({
          viewport: { width: 360, height: 540 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 1,
        });
        try {
          const page = await ctx.newPage(),
            errors = [],
            consoleErrors = [],
            failed = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("console", (m) => {
            if (m.type() === "error") consoleErrors.push(m.text());
          });
          page.on("requestfailed", (r) =>
            failed.push({ url: r.url(), error: r.failure()?.errorText }),
          );
          await page.goto(`${base}/neon-${game}.html?station=1`, {
            waitUntil: "load",
          });
          const overlay = game === "dungeon" ? "#ov" : "#start";
          await page.waitForSelector(overlay);
          const titleTop = await page
            .locator(`${overlay} h1`)
            .evaluate((e) => e.getBoundingClientRect().top);
          check(titleTop >= 0, `${game}: mobiler Menütitel erreichbar`, {
            titleTop,
          });
          await page.locator("#startBtn").click();
          await page.waitForTimeout(650);
          if (game === "dungeon") {
            const overlap = await page.evaluate(() => {
              const a = document.getElementById("hint").getBoundingClientRect(),
                b = document.getElementById("bWpn").getBoundingClientRect();
              return (
                a.left < b.right &&
                a.right > b.left &&
                a.top < b.bottom &&
                a.bottom > b.top
              );
            });
            check(!overlap, "dungeon: Anleitung überlappt Waffenknopf nicht");
          }
          await page.screenshot({ path: path.join(out, `${game}-mobile.png`) });
          await page.locator("#pauseBtn").click();
          check(
            game === "survivor"
              ? (await page.locator("#pauseBtn").textContent()) === "▶"
              : await page.locator("#resumeBtn").isVisible(),
            `${game}: mobiler Pause-Knopf erreichbar`,
          );
          if (game !== "survivor") await page.locator("#resumeBtn").click();
          else await page.locator("#pauseBtn").click();
          check(
            errors.length === 0 &&
              consoleErrors.length === 0 &&
              failed.length === 0,
            `${game}: echter Render-/CSP-/Netz-Smoke`,
            { errors, consoleErrors, failed },
          );
          results.games[game].render = {
            errors,
            consoleErrors,
            failed,
            titleTop,
          };
        } finally {
          await ctx.close();
        }
      }
      await racerHudRects(browser);
      for (const game of ["abyss", "colossus", "duo"]) {
        const ctx = await browser.newContext({
          viewport: { width: 640, height: 360 },
        });
        try {
          const page = await ctx.newPage();
          await page.goto(`${base}/neon-${game}.html`, {
            waitUntil: "domcontentloaded",
          });
          check(
            (await page.locator("h1").textContent()).includes("Neon Wildnis"),
            `${game}: Weiterleitung nennt richtiges Ziel`,
          );
          check(
            (await page.locator(".box a").getAttribute("href")) ===
              "/neon-wildnis.html",
            `${game}: Link führt zur Wildnis`,
          );
          await page.waitForURL("**/neon-wildnis.html", {
            timeout: 6000,
            waitUntil: "commit",
          });
          check(true, `${game}: automatische Weiterleitung`);
        } finally {
          await ctx.close();
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify({ ...results, checks, failures }, null, 2),
    );
  }
  console.log(`${checks} Prüfungen, ${failures} Fehler`);
  if (failures) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
