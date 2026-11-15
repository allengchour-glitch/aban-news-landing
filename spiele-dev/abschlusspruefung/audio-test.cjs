// Echte Chromium-WebAudio-Prüfung, ohne Lautsprecher oder Mikrofon.
// Aufruf: PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/abschlusspruefung/audio-test.cjs
// --probe: Befunde ausgeben, ohne bei erwarteten Regressionen abzubrechen.
// AUDIO_QA_JSON=/tmp/datei.json speichert zusätzlich die vollständigen Messdaten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/tmp/aban-browsers';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/aban-games-audit/node_modules/playwright');
const base = process.env.AUDIO_QA_URL || 'http://127.0.0.1:8113';
const result = { zeit: new Date().toISOString(), url: base, checks: [], grenzen: 'Chromium headless; keine Hörprobe, kein Mikrofon, keine Aussage über subjektive Klangqualität.' };
const check = (name, ok, details) => result.checks.push({ name, ok: !!ok, details });

async function offline(page) {
  return page.evaluate(async () => {
    const { FlightAudio } = await import('/js/neon-flug/audio.mjs');
    const renders = {};
    async function render(name, settings, schedule, seconds = 4, enabled = true) {
      const ctx = new OfflineAudioContext(1, Math.ceil(seconds * 48000), 48000);
      const audio = new FlightAudio(settings);
      const Native = window.AudioContext;
      // unlock() selbst baut Master/Kompressor; kein nachgebauter Mixer.
      window.AudioContext = function () { return ctx; };
      try { audio.unlock(); } finally { window.AudioContext = Native; }
      // Offline-Kontexte sind vor startRendering() suspended. Nur Status/Uhr
      // für das synchrone Scheduling adaptieren; alle DSP-Knoten bleiben echt.
      Object.defineProperty(ctx, 'state', { value: 'running' });
      Object.defineProperty(ctx, 'currentTime', { value: 0, writable: true });
      audio.enabled = enabled;
      schedule(audio, ctx);
      const buffer = await ctx.startRendering();
      const data = buffer.getChannelData(0);
      let peak = 0, sum = 0, nonzero = 0, clipped = 0;
      for (const sample of data) {
        if (!Number.isFinite(sample)) throw Error(`${name}: ungültiges Sample`);
        peak = Math.max(peak, Math.abs(sample));
        sum += sample * sample;
        if (sample !== 0) nonzero++;
        if (Math.abs(sample) >= 1) clipped++;
      }
      return renders[name] = { peak, rms: Math.sqrt(sum / data.length), nonzero, clipped, samples: data.length, sampleRate: buffer.sampleRate };
    }
    await render('tone0', { music: 0, effects: 0 }, a => a.tone(440, .3, 0), 1);
    for (const volume of [.03, .06, .12])
      await render(`tone${volume}`, { music: 0, effects: 0 }, a => a.tone(440, .3, volume), 1);
    for (const kind of ['ring', 'hit', 'dash', 'rescue', 'win']) {
      for (const volume of [0, 55, 100])
        await render(`${kind}${volume}`, { music: 0, effects: volume }, a => a.effect(kind));
    }
    const score = (a, c, effects) => {
      const kinds = ['ring', 'hit', 'dash', 'rescue', 'win'];
      for (let beat = 0; beat < 64; beat++) {
        c.currentTime = a.next;
        // next wird aus demselben Wert berechnet; keine Zeitraffer-Simulation.
        a.update(true, 0);
        if (effects && beat % 2 === 0) a.effect(kinds[(beat / 2) % kinds.length]);
      }
    };
    await render('music0', { music: 0, effects: 55 }, (a, c) => score(a, c, false), 30);
    await render('music35', { music: 35, effects: 0 }, (a, c) => score(a, c, false), 30);
    await render('music100', { music: 100, effects: 0 }, (a, c) => score(a, c, false), 30);
    await render('mixDefault', { music: 35, effects: 55 }, (a, c) => score(a, c, true), 30);
    await render('mix100', { music: 100, effects: 100 }, (a, c) => score(a, c, true), 30);
    await render('both0', { music: 0, effects: 0 }, (a, c) => score(a, c, true), 30);
    await render('disabled', { music: 100, effects: 100 }, (a, c) => score(a, c, true), 30, false);
    await render('inactive', { music: 100, effects: 100 }, a => a.update(false, 0));
    await render('effectsOnly', { music: 0, effects: 55 }, a => { a.update(true, 0); a.effect('dash'); });
    return renders;
  });
}

async function instrument(page) {
  await page.addInitScript(() => {
    const qa = window.__audioQA = { contexts: [], events: [] };
    const gains = new WeakMap();
    const values = new WeakMap();
    const gainOf = new WeakMap();
    const ramp = AudioParam.prototype.linearRampToValueAtTime;
    const set = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function (value, time) {
      values.set(this, value);
      return set.call(this, value, time);
    };
    AudioParam.prototype.linearRampToValueAtTime = function (value, time) {
      gains.set(this, value);
      return ramp.call(this, value, time);
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target, ...rest) {
      if (this instanceof OscillatorNode && target instanceof GainNode) gainOf.set(this, target);
      if (target === this.context.destination && !this.__qaTap) {
        this.__qaTap = true;
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 2048;
        connect.call(this, analyser);
        const sink = this.context.createGain();
        sink.gain.value = 0;
        connect.call(analyser, sink);
        connect.call(sink, target);
        this.context.__qaAnalyser = analyser;
      }
      return connect.call(this, target, ...rest);
    };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); qa.contexts.push(this); }
      createOscillator() {
        const osc = super.createOscillator();
        const start = osc.start.bind(osc), stop = osc.stop.bind(osc);
        let event;
        osc.start = (time = 0) => {
          event = { frequency: values.get(osc.frequency), start: time, volume: gains.get(gainOf.get(osc)?.gain), type: osc.type };
          qa.events.push(event);
          return start(time);
        };
        osc.stop = time => { if (event) event.duration = time - event.start - .05; return stop(time); };
        return osc;
      }
    };
  });
}

async function ui(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await instrument(page);
  const response = await page.goto(`${base}/neon-flug.html?debug=1`, { waitUntil: 'domcontentloaded' });
  result.headers = await response.allHeaders();
  check('Echte CSP und Permissions-Policy', response.status() === 200 && !!result.headers['content-security-policy'] && result.headers['permissions-policy']?.includes('microphone=()'));
  await page.locator('#trainingBtn').waitFor();
  const snapshot = () => page.evaluate(() => ({
    contexts: __audioQA.contexts.length,
    state: __audioQA.contexts[0]?.state,
    time: __audioQA.contexts[0]?.currentTime,
    events: __audioQA.events.length,
    label: document.querySelector('#soundBtn').getAttribute('aria-label'),
    phase: window.__flight?.state().phase,
  }));
  const sample = () => page.evaluate(async () => {
    const c = __audioQA.contexts[0], analyser = c.__qaAnalyser;
    let peak = 0, sum = 0, samples = 0;
    for (let n = 0; n < 12; n++) {
      await new Promise(resolve => setTimeout(resolve, 25));
      const data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      for (const x of data) { peak = Math.max(peak, Math.abs(x)); sum += x*x; samples++; }
    }
    return { state: c.state, time: c.currentTime, peak, rms: Math.sqrt(sum/samples) };
  });
  const waitState = state => page.waitForFunction(state => __audioQA.contexts[0].state === state, state);
  const takeEvents = () => page.evaluate(() => __audioQA.events.splice(0));
  const categorize = events => ({
    music: events.filter(e => [.85, 1.3, 2.5].some(d => Math.abs(e.duration-d) < 1e-6)),
    effects: events.filter(e => ![.85, 1.3, 2.5].some(d => Math.abs(e.duration-d) < 1e-6)),
  });
  const settings = async (music, effects) => {
    await page.locator('#settingsBtn').click();
    for (const [id, value] of [['musicVolume', music], ['effectsVolume', effects]]) {
      await page.locator(`#${id}`).focus();
      await page.keyboard.press('Home');
      for (let i = 0; i < value; i++) await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator(`#${id}`).inputValue(), String(value));
    }
    await page.locator('#settings button.primary').click();
  };
  check('Kein Autoplay vor Interaktion', (await snapshot()).contexts === 0, await snapshot());
  await page.locator('#trainingBtn').click();
  await page.locator('#launchBtn').click();
  await page.waitForTimeout(100);
  check('Training bleibt ohne Ton-Aktivierung stumm', (await snapshot()).events === 0 && (await snapshot()).label === 'Ton einschalten', await snapshot());
  await page.locator('#soundBtn').click();
  await waitState('running');
  result.ui = { aktiv: await sample() };
  check('Ton per UI aktiviert, Signal vorhanden', result.ui.aktiv.peak > 1e-5 && (await snapshot()).label === 'Ton ausschalten', result.ui.aktiv);
  await page.locator('#pauseBtn').click();
  await waitState('suspended');
  const paused = await snapshot();
  await page.waitForTimeout(200);
  check('Pause friert Audio-Uhr ein', (await snapshot()).time === paused.time && (await snapshot()).events === paused.events, { before: paused, after: await snapshot() });
  await page.locator('#resumeBtn').click();
  await waitState('running');
  result.ui.weiter = await sample();
  check('Fortsetzen liefert wieder Signal', result.ui.weiter.peak > 1e-5, result.ui.weiter);

  await settings(0, 100);
  await takeEvents();
  await page.locator('#resumeBtn').click();
  await page.locator('#dashBtn').click();
  await page.waitForTimeout(650);
  result.ui.nurEffekte = categorize(await takeEvents());
  check('UI Musik=0: keine neuen Musik-Oszillatoren, Dash bleibt aktiv', result.ui.nurEffekte.music.length === 0 && result.ui.nurEffekte.effects.some(e => e.volume > 0 && Math.abs(e.duration-.2) < 1e-6), result.ui.nurEffekte);
  await settings(100, 0);
  // Cooldown im echten Spiel verstreichen lassen, keine Debug-Zustandsänderung.
  await page.locator('#resumeBtn').click();
  await page.locator('#dashBtn').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#dashBtn').disabled);
  await takeEvents();
  await page.locator('#dashBtn').click();
  await page.waitForTimeout(650);
  result.ui.nurMusik = categorize(await takeEvents());
  check('UI Effekte=0: kein Dash-Oszillator, Musik bleibt aktiv', result.ui.nurMusik.effects.length === 0 && result.ui.nurMusik.music.some(e => e.volume > 0), result.ui.nurMusik);

  await page.locator('#soundBtn').click();
  await waitState('suspended');
  const muted = await snapshot();
  await page.waitForTimeout(100);
  check('Globales Mute stoppt Audio-Uhr', (await snapshot()).time === muted.time && muted.label === 'Ton einschalten', { before: muted, after: await snapshot() });
  await page.waitForFunction(() => !document.querySelector('#dashBtn').disabled);
  await page.locator('#dashBtn').click();
  await page.waitForTimeout(80);
  result.ui.muteNachDash = await snapshot();
  // Analyser-Inhalt bei suspend ist eingefroren und KEIN ausgehendes Signal.
  if (result.ui.muteNachDash.state === 'running') result.ui.muteNachDashSignal = await sample();
  check('Dash hebt Mute nicht auf', result.ui.muteNachDash.state === 'suspended', result.ui.muteNachDash);
  await page.locator('#pauseBtn').click();
  await waitState('suspended');
  await page.locator('#resumeBtn').click();
  await page.waitForTimeout(80);
  result.ui.muteNachWeiter = await snapshot();
  check('Fortsetzen hebt Mute nicht auf', result.ui.muteNachWeiter.state === 'suspended', result.ui.muteNachWeiter);
  await page.locator('#soundBtn').click();
  await waitState('running');
  check('Explizites Entstummen funktioniert', (await sample()).peak > 1e-5);
  await page.locator('#pauseBtn').click();
  await page.locator('#pauseScreen .exitBtn').click();
  await waitState('suspended');
  check('Flug verlassen suspendiert Audio', (await snapshot()).state === 'suspended');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#settingsBtn').click();
  check('Lautstärken bleiben nach Reload erhalten; Ton startet AUS', await page.locator('#musicVolume').inputValue() === '100' && await page.locator('#effectsVolume').inputValue() === '0' && (await snapshot()).contexts === 0 && (await snapshot()).label === 'Ton einschalten');
  check('Keine JavaScript-Laufzeitfehler', errors.length === 0, errors);
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    result.browser = browser.version();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const sourceFile = path.resolve(__dirname, '../../js/neon-flug/audio.mjs');
    const served = await context.request.get(`${base}/js/neon-flug/audio.mjs`);
    const hash = data => createHash('sha256').update(data).digest('hex');
    result.source = { file: sourceFile, localSHA256: hash(fs.readFileSync(sourceFile)), servedSHA256: hash(await served.body()) };
    check('Port 8113 liefert die geprüfte lokale Audio-Datei', served.status() === 200 && result.source.localSHA256 === result.source.servedSHA256, result.source);
    await ui(page);
    result.offline = await offline(page);
    const o = result.offline;
    for (const name of ['tone0', 'ring0', 'hit0', 'dash0', 'rescue0', 'win0', 'music0', 'both0', 'disabled', 'inactive'])
      check(`Offline ${name}: exakt stumm`, o[name].peak === 0 && o[name].rms === 0, o[name]);
    check('Messgerät: positives Signal und steigende Lautstärke', o['tone0.03'].rms > 0 && o['tone0.06'].rms > o['tone0.03'].rms && o['tone0.12'].rms > o['tone0.06'].rms);
    check('Getrennte Kanäle: Musik=0 verändert Dash nicht', Math.abs(o.effectsOnly.peak-o.dash55.peak) < 1e-10 && Math.abs(o.effectsOnly.rms-o.dash55.rms) < 1e-10, { effectsOnly: o.effectsOnly, dash: o.dash55 });
    check('Musik 100 stärker als 35', o.music100.rms > o.music35.rms && o.music35.rms > 0);
    for (const kind of ['ring', 'hit', 'dash', 'rescue', 'win'])
      check(`Offline ${kind}: positives Signal, 100 stärker als 55`, o[`${kind}55`].rms > 0 && o[`${kind}100`].rms > o[`${kind}55`].rms && o[`${kind}100`].peak < 1);
    for (const name of ['mixDefault', 'mix100'])
      check(`Offline ${name}: Signal ohne Samples >= 1`, o[name].rms > 0 && o[name].peak < 1 && o[name].clipped === 0, o[name]);
  } catch (error) {
    check('Testausführung vollständig', false, error.stack);
  } finally {
    await browser?.close();
  }
  result.ok = result.checks.every(c => c.ok);
  if (process.env.AUDIO_QA_JSON) fs.writeFileSync(process.env.AUDIO_QA_JSON, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  console.log(`${result.checks.filter(c => c.ok).length} ok, ${result.checks.filter(c => !c.ok).length} Fehler; Ende: ${result.ok ? 'alle Prüfungen abgeschlossen' : 'fehlgeschlagene Prüfungen oben'}`);
  if (!result.ok && !process.argv.includes('--probe')) process.exitCode = 1;
})();
