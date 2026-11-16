const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<video id=v></video>');
  const r = await p.evaluate(() => { const v = document.getElementById('v'); return ['video/mp4; codecs="avc1.640028"','video/mp4; codecs="avc1.4d401f"','video/webm; codecs="vp9"','video/mp4; codecs="av01.0.05M.08"'].map(t => t + ' => ' + v.canPlayType(t)); });
  console.log(r.join('\n'), b.version());
  await b.close();
})();
