// Vollständiges Chromium drosselt Hintergrund-Tabs. Zwei echte Fenster halten
// beide rAF-Schleifen aktiv; Transport und Spielcode bleiben unverändert.
module.exports = async function flightWindow(browser, context, anchor) {
  const cdp = await context.newCDPSession(anchor);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  const pending = context.waitForEvent("page");
  const browserCdp = await browser.newBrowserCDPSession();
  await browserCdp.send("Target.createTarget", {
    url: "about:blank",
    newWindow: true,
    browserContextId: targetInfo.browserContextId,
  });
  const page = await pending;
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  const peerCdp = await context.newCDPSession(page);
  await peerCdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await cdp.detach();
  await browserCdp.detach();
  await peerCdp.detach();
  return page;
};
