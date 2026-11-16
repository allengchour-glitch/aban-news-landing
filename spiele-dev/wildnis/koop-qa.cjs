/* Echte lokale WebRTC-Datenkanäle, BroadcastChannel-Signaling. Kein Internet-/NAT-Test.
   Weltgenerator/Spiel-/Netzlogik laufen; ausschließlich 3D-Zeichnen in der Fixture ausgesetzt. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.NW_BASE || "http://127.0.0.1:8170",
  out = process.env.NW_OUT || "/tmp/wildnis-koop";
const hook = `renderScene=function(){};window.__coopQA={state:function(){return {running:running,on:NET.on,mobile:IS_MOB,shared:nwSharedWorld,seed:SEED,code:NET.s&&NET.s.code,role:NET.role,status:NET.s&&NET.s.status,pos:{x:player.position.x,z:player.position.z},remote:{x:NET.rt.x,z:NET.rt.z},remoteHero:!!NET.remoteHero,structures:structures.map(function(s){return {type:s.type,x:s.x,z:s.z};})};},world:function(){return {resources:resources.map(function(r){return [r.type,r.x,r.z];}),colliders:colliders.map(function(c){return [c.x,c.z,c.r];}),villages:villages.map(function(v){return [v.x,v.z];}),stations:stations.map(function(s){return [s.x,s.z,s.url];})};}};`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const report = {
    kind: "Lokaler echter WebRTC-Koop; Zeichenpfad pausiert, keine echte Internetverbindung",
    checks: [],
    errors: [],
  };
  try {
    const context = await browser.newContext({
      viewport: { width: 960, height: 640 },
    });
    await context.addInitScript(() => {
      localStorage.setItem("nw_intro", "1");
      window.__qaPCs = [];
      const Native = window.RTCPeerConnection;
      window.RTCPeerConnection = new Proxy(Native, {
        construct(Target, args) {
          const pc = new Target(...args);
          window.__qaPCs.push(pc);
          return pc;
        },
      });
    });
    await context.route("**/neon-wildnis.html*", async (r) => {
      const response = await r.fetch();
      let h = await response.text();
      h = h
        .replace("window.__nw={", hook + "window.__nw={")
        .replace(
          "if(!cv||!window.THREE||!THREE.GLTFLoader)return;",
          "if(true)return;",
        );
      await r.fulfill({ response, body: h });
    });
    const host = await context.newPage(),
      guest = await context.newPage();
    for (const p of [host, guest])
      p.on("pageerror", (e) => report.errors.push(e.message));
    await guest.setViewportSize({ width: 390, height: 844 });
    const cdp = await context.newCDPSession(guest);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await host.goto(base + "/neon-wildnis.html?mp=local", {
      waitUntil: "domcontentloaded",
    });
    await host.waitForFunction(() => window.__coopQA);
    await host.locator("#coopBox summary").click();
    await host.locator("#coopHost").click();
    const room = (await host.evaluate(() => __coopQA.state())).code;
    assert(/^[A-Z]{4}$/.test(room));
    await guest.goto(base + "/neon-wildnis.html?mp=local", {
      waitUntil: "domcontentloaded",
    });
    await guest.waitForFunction(() => window.__coopQA);
    await guest.locator("#coopBox summary").click();
    await guest.locator("#coopCode").fill(room);
    await guest.locator("#coopJoin").click();
    for (const p of [host, guest])
      await p.waitForFunction(
        () =>
          window._nwSceneryReady &&
          __coopQA.state().on &&
          __coopQA.state().running,
        null,
        { timeout: 150000 },
      );
    const states = await Promise.all(
      [host, guest].map((p) => p.evaluate(() => __coopQA.state())),
    );
    report.initial = states;
    assert.equal(states[0].mobile, false);
    assert.equal(states[1].mobile, true);
    assert.equal(states[0].seed, states[1].seed);
    assert(states.every((s) => s.shared && s.status === "connected"));
    report.checks.push(
      "Privater Raum mit echten UI-Klicks, Desktop-Host und Touch-Gast verbunden",
    );
    const worlds = await Promise.all(
      [host, guest].map((p) => p.evaluate(() => __coopQA.world())),
    );
    assert.deepEqual(worlds[0], worlds[1]);
    report.worldHash = createHash("sha256")
      .update(JSON.stringify(worlds[0]))
      .digest("hex");
    report.checks.push(
      "Ressourcen, Collider, Dörfer und Stationen auf beiden verbundenen Geräten identisch",
    );
    await host.bringToFront();
    const before = await host.evaluate(() => __coopQA.state().pos);
    await host.keyboard.down("w");
    await host.waitForTimeout(450);
    await host.keyboard.up("w");
    await host.waitForTimeout(200);
    const after = await host.evaluate(() => __coopQA.state().pos);
    assert(Math.hypot(after.x - before.x, after.z - before.z) > 0.15);
    await guest.waitForFunction(
      (p) =>
        Math.hypot(
          __coopQA.state().remote.x - p.x,
          __coopQA.state().remote.z - p.z,
        ) < 0.15,
      after,
      { timeout: 15000 },
    );
    report.movement = {
      before,
      after,
      remote: (await guest.evaluate(() => __coopQA.state())).remote,
    };
    report.checks.push(
      "Echte W-Bewegung über schnellen Datenkanal beim Partner angekommen",
    );
    await host.evaluate(() => __nw.give("wood", 20));
    await host.locator("#bBuild").click();
    await host
      .locator("#buildMenu .bcard")
      .filter({ has: host.locator(".bn", { hasText: "Holz-Mauer" }) })
      .click();
    await host.waitForTimeout(150);
    await host.keyboard.press("Enter");
    await host.waitForFunction(() => __coopQA.state().structures.length === 1);
    await guest.waitForFunction(() => __coopQA.state().structures.length === 1);
    const builds = await Promise.all(
      [host, guest].map((p) =>
        p.evaluate(() => __coopQA.state().structures[0]),
      ),
    );
    assert.equal(builds[0].type, "wand");
    assert.equal(builds[1].type, "wand");
    assert(
      Math.hypot(builds[0].x - builds[1].x, builds[0].z - builds[1].z) < 0.11,
    );
    report.builds = builds;
    report.checks.push(
      "Mit gesetztem Materialvorrat per Baumenü/Enter platzierte Mauer zuverlässig bei beiden vorhanden",
    );
    report.channels = [];
    for (const p of [host, guest])
      report.channels.push(
        await p.evaluate(async () => {
          const result = [];
          for (const pc of __qaPCs) {
            const stats = await pc.getStats();
            const channels = [];
            stats.forEach((s) => {
              if (s.type === "data-channel")
                channels.push({
                  label: s.label,
                  state: s.state,
                  messagesSent: s.messagesSent,
                  messagesReceived: s.messagesReceived,
                });
            });
            result.push({
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              channels,
            });
          }
          return result;
        }),
      );
    assert(
      report.channels.every((a) =>
        a.some(
          (p) =>
            p.connectionState === "connected" &&
            p.channels.some(
              (c) => c.state === "open" && c.messagesReceived > 0,
            ),
        ),
      ),
    );
    report.checks.push(
      "Native RTCPeerConnection-Statistik bestätigt offene Datenkanäle und empfangene Nachrichten",
    );
    assert.deepEqual(report.errors, []);
    report.status = "passed";
  } catch (e) {
    report.status = "failed";
    report.failure = e.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(out, "ergebnis.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(report);
    await browser.close();
  }
})();
