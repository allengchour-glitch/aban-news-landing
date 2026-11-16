const fs = require("node:fs"),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.env.OUT || "/tmp/wildnis-blick",
  base = process.env.BASE || "http://127.0.0.1:8170";
const hook = `window.__nwView={stats:function(){var meshes=0,lights=0,casts=0;scene.traverse(function(o){if(o.isMesh){meshes++;if(o.castShadow)casts++;}if(o.isPointLight&&o.visible&&o.layers.test(camera.layers))lights++;});return {meshes:meshes,lights:lights,casts:casts,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,pixelRatio:renderer.getPixelRatio(),shadow:renderer.shadowMap.enabled,seed:SEED,resources:resources.length,colliders:colliders.length,villages:villages.length,stations:stations.length,gfx:__nw.gfx(),player:player.position.toArray()};},profile:function(){return new Promise(function(resolve){var ts=[],last=performance.now(),end=last+6000;function tick(now){ts.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else{var s=__nwView.stats();ts.sort(function(a,b){return a-b;});s.rafps=1000*ts.length/ts.reduce(function(a,b){return a+b;},0);s.median=ts[Math.floor(ts.length*.5)];s.p95=ts[Math.floor(ts.length*.95)];resolve(s);}}requestAnimationFrame(tick);});},showcase:function(){nwApplyGraphics('detail',false);},seed:function(){NET_FORCE_SEED=317151129;},pose:function(name){if(name==='nacht')__nw.night(true);else __nw.forceDay();if(name==='dorf')__nw.toVillage(0);else if(name==='weg')__nw.toRoad(0);else __nw.tp(0,0,0);}};var _viewDecor=decorateWorldLate;decorateWorldLate=function(){try{return _viewDecor.apply(this,arguments);}finally{window.__nwReady=true;}};`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const result = {
    sourceHash: require("node:crypto")
      .createHash("sha256")
      .update(
        fs.readFileSync(
          require("node:path").join(__dirname, "../../neon-wildnis.html"),
        ),
      )
      .digest("hex"),
    kind: "Feste Welt-/Kamerafixtures; Software-Rendering, kein physisches Handy",
    errors: [],
    views: [],
  };
  try {
    const ctx = await b.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false,
    });
    await ctx.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("nw_intro", "1");
    });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => result.errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") result.errors.push(m.text().slice(0, 200));
    });
    await p.route("**/neon-wildnis.html*", async (r) => {
      const a = await r.fetch(),
        h = await a.text();
      await r.fulfill({
        response: a,
        body: h.replace("window.__nw={", hook + "\nwindow.__nw={"),
      });
    });
    await p.goto(base + "/neon-wildnis.html", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await p.waitForFunction(() => window.__nwView);
    await p.evaluate(() => __nwView.seed());
    await p.locator("#startBtn").click({ timeout: 60000 });
    await p.waitForFunction(() => window.__nwReady, null, { timeout: 150000 });
    await p.evaluate(() => __nw.forceDay());
    await p.waitForTimeout(500);
    result.profile = await p.evaluate(() => __nwView.profile());
    await p.evaluate(() => __nwView.showcase());
    result.showcase =
      "Details, Renderverhältnis 1 und echte Schatten; Profil vorher auf Automatisch gemessen";
    for (const name of ["start", "dorf", "weg", "nacht"]) {
      await p.evaluate((name) => __nwView.pose(name), name);
      await p.waitForTimeout(700);
      await p.screenshot({ path: out + "/" + name + ".png", timeout: 60000 });
      result.views.push({
        name,
        stats: await p.evaluate(() => __nwView.stats()),
      });
    }
    result.passed = result.errors.length === 0;
  } catch (e) {
    result.passed = false;
    result.error = e.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(out + "/ergebnis.json", JSON.stringify(result, null, 2));
    console.log(result);
    await b.close();
  }
})();
