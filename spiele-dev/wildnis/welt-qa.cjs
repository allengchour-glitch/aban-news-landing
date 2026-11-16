/* Originale Weltgeneratoren mit echten lokalen GLBs; Rendern und Simulation werden nur in dieser Fixture angehalten.
   NW_HTML optional für Altstand, NW_EXPECT_MISMATCH=1 verlangt die rote Handy/Desktop-Gegenprobe. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.NW_BASE || "http://localhost:8170",
  out = process.env.NW_OUT || "/tmp/wildnis-welt";
const hook = `renderScene=function(){};var _worldStart=startGame;startGame=function(fresh){var r=_worldStart(fresh);paused=true;return r;};
var _worldLate=decorateWorldLate;decorateWorldLate=function(){try{return _worldLate.apply(this,arguments);}finally{window.__worldReady=true;}};
window.__worldFixture={seed:function(resume){NET_FORCE_SEED=resume?null:317151129;NET.on=!resume;NET.role='host';},read:function(){return {seed:SEED,mobile:IS_MOB,worldFull:typeof nwSharedWorld==='undefined'?null:nwSharedWorld,
 resources:resources.map(function(r){return {type:r.type,x:r.x,z:r.z,hp:r.maxhp};}),
 colliders:colliders.map(function(c){return {x:c.x,z:c.z,r:c.r,fade:c.fade};}),
 villages:villages.map(function(v){return {x:v.x,z:v.z};}),stations:stations.map(function(s){return {x:s.x,z:s.z,url:s.url};})};}};`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const report = {
    kind: "Zwei echte Browser-Weltgenerator-Fixtures; keine Netzverbindung und kein FPS-Test",
    cases: [],
    errors: [],
  };
  try {
    for (const cfg of [
      { mobile: false, resume: false },
      { mobile: true, resume: false },
    ].concat(process.env.NW_HTML ? [] : [{ mobile: true, resume: true }])) {
      const { mobile, resume } = cfg;
      const c = await browser.newContext({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 960, height: 640 },
        hasTouch: mobile,
        isMobile: mobile,
      });
      await c.addInitScript((resume) => {
        localStorage.clear();
        localStorage.setItem("nw_intro", "1");
        window.__qaWorldOnly = true;
        if (resume)
          localStorage.setItem(
            "nw_save1",
            JSON.stringify({ seed: 317151129, worldFull: true, px: 0, pz: 0 }),
          );
      }, resume);
      const p = await c.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.route("**/neon-wildnis.html*", async (r) => {
        const response = await r.fetch();
        let h = process.env.NW_HTML
          ? fs.readFileSync(process.env.NW_HTML, "utf8")
          : await response.text();
        h = h
          .replace("window.__nw={", hook + "window.__nw={")
          .replace(
            "if(!cv||!window.THREE||!THREE.GLTFLoader)return;",
            "if(window.__qaWorldOnly||!cv||!window.THREE||!THREE.GLTFLoader)return;",
          );
        await r.fulfill({ response, body: h });
      });
      await p.goto(base + "/neon-wildnis.html", {
        waitUntil: "domcontentloaded",
      });
      await p.waitForFunction(() => window.__worldFixture);
      await p.evaluate((resume) => __worldFixture.seed(resume), resume);
      await p.locator("#startBtn").click({ timeout: 60000 });
      await p.waitForFunction(() => window.__worldReady, null, {
        timeout: 120000,
      });
      report.cases.push(await p.evaluate(() => __worldFixture.read()));
      await c.close();
    }
    const a = report.cases[0],
      b = report.cases[1];
    report.matching = {};
    for (const key of ["resources", "colliders", "villages", "stations"])
      report.matching[key] = JSON.stringify(a[key]) === JSON.stringify(b[key]);
    report.matched = Object.values(report.matching).every(Boolean);
    if (report.cases[2]) {
      report.resumeMatching = {};
      for (const key of ["resources", "colliders", "villages", "stations"])
        report.resumeMatching[key] =
          JSON.stringify(a[key]) === JSON.stringify(report.cases[2][key]);
      assert(
        Object.values(report.resumeMatching).every(Boolean),
        "Gespeicherte gemeinsame Welt bleibt beim Solo-Fortsetzen vollständig",
      );
      assert.equal(report.cases[2].worldFull, true);
    }
    assert.equal(a.mobile, false);
    assert.equal(b.mobile, true);
    assert.deepEqual(report.errors, []);
    if (process.env.NW_EXPECT_MISMATCH === "1") {
      assert(!report.matched, "Gegenprobe muss verschiedene Welten erkennen");
      report.status = "mismatch-detected";
    } else {
      assert(report.matched, JSON.stringify(report.matching));
      report.status = "passed";
    }
  } catch (e) {
    report.status = "failed";
    report.failure = e.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(out, "ergebnis.json"),
      JSON.stringify(report, null, 2),
    );
    console.log({
      status: report.status,
      matching: report.matching,
      counts: report.cases.map((c) => ({
        mobile: c.mobile,
        resources: c.resources.length,
        colliders: c.colliders.length,
      })),
      failure: report.failure,
    });
    await browser.close();
  }
})();
