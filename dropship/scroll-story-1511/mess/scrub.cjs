// Misst Suchzeit (currentTime setzen bis "seeked") beim Scrollbinden gegen Abspielen (verlorene Bilder).
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  const files = process.argv.slice(2);
  for (const drossel of [1, 4]) for (const f of files) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: drossel });
    await p.setContent('<video id=v muted playsinline style="width:1440px;height:1080px;object-fit:cover"></video>');
    const b64 = fs.readFileSync(f).toString('base64');
    const r = await p.evaluate(async ({ b64, modus }) => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const v = document.getElementById('v');
      v.src = URL.createObjectURL(new Blob([bin], { type: 'video/mp4' }));
      await new Promise(r => v.addEventListener('loadeddata', r, { once: true }));
      if (modus === 'spielen') {
        v.loop = true; await v.play(); await new Promise(r => setTimeout(r, 4000)); v.pause();
        const q = v.getVideoPlaybackQuality(); return { gesamt: q.totalVideoFrames, verloren: q.droppedVideoFrames };
      }
      const d = v.duration, zeiten = [];
      // 90 Schritte vorwärts in 1,5 s (wie zügiges Scrollen), dann 30 Sprünge rückwärts
      const ziele = []; for (let i = 0; i < 90; i++) ziele.push(d * i / 90); for (let i = 30; i > 0; i--) ziele.push(d * i / 31);
      for (const t of ziele) {
        const t0 = performance.now();
        await new Promise(r => { v.addEventListener('seeked', r, { once: true }); v.currentTime = t; });
        zeiten.push(performance.now() - t0);
      }
      zeiten.sort((a, b) => a - b);
      const q = k => zeiten[Math.floor(k * (zeiten.length - 1))];
      return { median: +q(0.5).toFixed(1), p90: +q(0.9).toFixed(1), max: +q(1).toFixed(1), ueber16: zeiten.filter(z => z > 16.7).length + '/' + zeiten.length };
    }, { b64, modus: process.env.MODUS || 'scrub' });
    console.log('CPU x' + drossel, path.basename(f), (fs.statSync(f).size / 1024).toFixed(0) + ' KB', JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
