/* aban KI-Studio — Pro-Tools. CSP-safe, kein Tracking.
   Lizenzschlüssel lokal (localStorage), KI läuft serverseitig über die Edge-Funktionen. */
(function () {
  'use strict';
  var KEY = 'aban_pro_key';
  var key = '';
  try { key = localStorage.getItem(KEY) || ''; } catch (e) {}

  var EN = (document.documentElement.lang || 'de').slice(0, 2) === 'en';
  var T = EN ? {
    active: 'Active', inactive: 'Locked', unlock: 'Unlock', invalid: 'Key invalid or expired.',
    saved: 'Pro unlocked — tools are live.', enterKey: 'Enter your Pro key above first.',
    working: 'Working …', off: 'Pro AI is not active yet (admin setup pending).',
    proReq: 'This needs an active aban Pro key.', rate: 'Too many requests — wait a moment.',
    err: 'Something went wrong. Try again.', empty: 'No input.', soon: 'Checkout starts soon — join the list.'
  } : {
    active: 'Aktiv', inactive: 'Gesperrt', unlock: 'Freischalten', invalid: 'Schlüssel ungültig oder abgelaufen.',
    saved: 'Pro freigeschaltet — die Tools laufen live.', enterKey: 'Erst oben deinen Pro-Schlüssel eingeben.',
    working: 'Arbeite …', off: 'Pro-KI ist noch nicht aktiv (Admin-Setup ausstehend).',
    proReq: 'Dafür braucht es einen aktiven aban-Pro-Schlüssel.', rate: 'Zu viele Anfragen — kurz warten.',
    err: 'Etwas ist schiefgelaufen. Bitte nochmal.', empty: 'Keine Eingabe.', soon: 'Checkout startet in Kürze — trag dich auf die Liste.'
  };

  function $(id) { return document.getElementById(id); }

  // ---------- Kauf-Links aus pay-config ----------
  (function wireBuy() {
    var pay = window.ABAN_PAY || {};
    var m = pay.PRO_MONTHLY_URL || '', y = pay.PRO_YEARLY_URL || '';
    [['proBuyMonthly', m], ['proBuyMonthly2', m], ['proBuyYearly', y]].forEach(function (p) {
      var el = $(p[0]); if (el && p[1]) el.href = p[1];
    });
    if (!m) { var note = $('proSetupNote'); if (note) note.textContent = T.soon; }
  })();

  // ---------- Freischalten ----------
  var statusEl = $('proStatus'), titleEl = $('unlockTitle'), subEl = $('unlockSub'), input = $('proKey');

  function setUnlocked(on) {
    if (statusEl) { statusEl.hidden = false; statusEl.textContent = on ? '✓ ' + T.active : T.inactive;
      statusEl.className = 'ustate ' + (on ? 'on' : 'off'); }
    var tools = document.querySelectorAll('.tool');
    Array.prototype.forEach.call(tools, function (t) {
      t.setAttribute('data-locked', on ? '0' : '1');
      var lock = t.querySelector('[data-lock]'); if (lock) lock.style.display = on ? 'none' : 'block';
    });
    if (on && titleEl) { titleEl.textContent = '✓ ' + T.active; if (subEl) subEl.textContent = T.saved; }
    if (!on) { var b = $('yearlyBonus'); if (b) b.hidden = true; }
  }

  // Jahres-Abo schaltet Extras frei (Bonus-Bibliothek + Tier-Anzeige).
  function applyTier(tier) {
    var bonus = $('yearlyBonus');
    if (bonus) bonus.hidden = (tier !== 'yearly');
    if (tier && statusEl) {
      var lbl = tier === 'yearly' ? (EN ? 'Yearly ★' : 'Jahr ★') : (EN ? 'Monthly' : 'Monat');
      statusEl.textContent = '✓ ' + T.active + ' · ' + lbl;
    }
  }

  function validate(k, quiet) {
    k = (k || '').trim();
    if (!k) return;
    var btn = $('proUnlock'); if (btn && !quiet) { btn.disabled = true; btn.textContent = T.working; }
    fetch('/api/pro-validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: k })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.valid) {
        key = k; try { localStorage.setItem(KEY, k); } catch (e) {}
        setUnlocked(true);
        applyTier(d.tier);
      } else {
        setUnlocked(false);
        if (!quiet && subEl) subEl.textContent = T.invalid;
      }
    }).catch(function () { if (!quiet && subEl) subEl.textContent = T.err; })
      .finally(function () { if (btn) { btn.disabled = false; btn.textContent = T.unlock; } });
  }

  var unlockBtn = $('proUnlock');
  if (unlockBtn) unlockBtn.addEventListener('click', function () { validate(input && input.value, false); });
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') validate(input.value, false); });
  // gespeicherten Schlüssel still prüfen
  if (key) { if (input) input.value = key; validate(key, true); }

  // ---------- Tools ----------
  function post(url, body) {
    // Sprache mitsenden → die Engine antwortet auf der Seitensprache (DE/EN).
    var payload = body || {};
    if (payload.lang == null) payload.lang = EN ? 'en' : 'de';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pro-Key': key || '' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); });
  }
  function errText(status, d) {
    var e = d && d.error;
    if (status === 503 || e === 'ai_off' || e === 'llm_off') return T.off;
    if (status === 402 || e === 'pro_required') return T.proReq;
    if (status === 429 || e === 'rate_limited') return T.rate;
    if (e === 'no_question' || e === 'empty') return T.empty;
    return T.err;
  }
  function show(outId, text) { var o = $(outId); if (o) { o.textContent = text; o.className = 'out show'; } }
  function run(toolId, btn, outId, fn) {
    var tool = $(toolId);
    if (!key || (tool && tool.getAttribute('data-locked') === '1')) {
      show(outId, T.enterKey); if (input) input.focus(); return;
    }
    var label = btn.textContent; btn.disabled = true; btn.textContent = T.working;
    show(outId, T.working);
    fn().then(function (res) {
      if (res.status >= 200 && res.status < 300) show(outId, res.text || '');
      else show(outId, errText(res.status, res.d));
    }).catch(function () { show(outId, T.err); })
      .finally(function () { btn.disabled = false; btn.textContent = label; });
  }

  function val(id) { var e = $(id); return e ? e.value.trim() : ''; }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.run') : null;
    if (!btn) return;
    var tool = btn.getAttribute('data-tool');

    if (tool === 'chat') {
      run('toolChat', btn, 'outChat', function () {
        return post('/api/chat', { q: val('chatQ'), context: [] })
          .then(function (r) { return { status: r.status, d: r.d, text: r.d && r.d.answer }; });
      });
    } else if (tool === 'generate') {
      run('toolGen', btn, 'outGen', function () {
        return post('/api/generate', {
          kind: val('genKind') || 'text', branche: val('genBranche'), ziel: val('genZiel'),
          ton: val('genTon'), zielgruppe: val('genZg'), laenge: ($('genLen') ? $('genLen').value : '')
        }).then(function (r) { return { status: r.status, d: r.d, text: r.d && r.d.text }; });
      });
    } else if (tool === 'hype') {
      run('toolHype', btn, 'outHype', function () {
        return post('/api/hype-check', { text: val('hypeText'), action: 'rewrite' })
          .then(function (r) {
            var t = r.d && (r.d.aiRewrite || r.d.ruleRewrite) || '';
            if (r.d && r.d.proRequired) t = T.proReq;
            return { status: r.status, d: r.d, text: t };
          });
      });
    } else if (tool === 'aeo') {
      run('toolAeo', btn, 'outAeo', function () {
        return post('/api/ki-erwaehnung', { firma: val('aeoFirma'), branche: val('aeoBranche'), input: val('aeoBranche') })
          .then(function (r) {
            var d = r.d || {}, t = d.kiCheck || '';
            if (!t && d.proRequired) t = T.proReq;
            if (!t && Array.isArray(d.massnahmen)) t = d.massnahmen.slice(0, 6).map(function (m) { return '• ' + m; }).join('\n');
            if (!t && Array.isArray(d.suggestions)) t = d.suggestions.slice(0, 6).map(function (m) { return '• ' + m; }).join('\n');
            return { status: r.status, d: d, text: t || T.err };
          });
      });
    } else if (tool === 'translate') {
      run('toolTranslate', btn, 'outTr', function () {
        return post('/api/generate', { kind: 'translate', text: val('trText'), ziel: val('trZiel') || (EN ? 'German, natural' : 'Englisch, natürlich') })
          .then(function (r) { return { status: r.status, d: r.d, text: r.d && r.d.text }; });
      });
    } else if (tool === 'prompt') {
      run('toolPrompt', btn, 'outPr', function () {
        return post('/api/generate', { kind: 'prompt', text: val('prText') })
          .then(function (r) { return { status: r.status, d: r.d, text: r.d && r.d.text }; });
      });
    } else if (tool === 'brief') {
      run('toolBrief', btn, 'outBrief', function () {
        return marketSummary().then(function (txt) {
          if (!txt) return { status: 200, d: {}, text: T.err };
          return post('/api/generate', { kind: 'marketbrief', text: txt })
            .then(function (r) { return { status: r.status, d: r.d, text: r.d && r.d.text }; });
        });
      });
    }
  });

  // Kompaktes Markt-Datenpaket aus /data/markets.json (für das Markt-Briefing).
  function marketSummary() {
    return fetch('/data/markets.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
      .then(function (d) {
        var as = (d.assets || []).filter(function (a) { return typeof a.change_24h === 'number'; });
        if (!as.length) return '';
        as.sort(function (x, y) { return y.change_24h - x.change_24h; });
        function line(a) { return a.name + ' (' + a.symbol + '): ' + (a.change_24h >= 0 ? '+' : '') + a.change_24h.toFixed(2) + '% / 24h, Sentiment ' + (a.sentiment || 'neutral'); }
        var top = as.slice(0, 4).map(line);
        var bottom = as.slice(-4).reverse().map(line);
        return 'Stand: ' + (d.fetched_at || d.last_updated || '') + '\nGrößte Gewinner:\n' + top.join('\n') + '\nGrößte Verlierer:\n' + bottom.join('\n');
      }).catch(function () { return ''; });
  }

  // „Beispiel"-Button (Anfänger): füllt Branche + Ziel je nach Art mit einem Muster.
  var EX_DE = {
    text: ['Handwerksbetrieb', 'Begrüßungstext für unsere neue Website-Startseite'],
    email: ['Steuerberatung', 'Mandanten freundlich an fehlende Belege für 2025 erinnern'],
    social: ['Fotograf', 'Herbst-Familienshootings, Termine ab Oktober'],
    product: ['Onlineshop Haushalt', 'wiederverwendbare Bienenwachstücher, 3er-Set'],
    blog: ['Physiotherapie', 'Rückenschmerzen im Homeoffice vermeiden'],
    faq: ['Hundeschule', 'Welpen-Gruppenkurs für Anfänger'],
    jobad: ['Bäckerei', 'Verkäufer:in in Teilzeit (m/w/d)'],
    slogan: ['Bio-Café', 'regionaler Kaffee, fair und frisch'],
    summary: ['', '[Hier deinen langen Text zum Zusammenfassen einfügen]'],
    plan: ['Immobilienmakler', 'mehr Zeit für Kundengespräche gewinnen'],
    contentplan: ['Yoga-Studio', 'neue Einsteiger:innen gewinnen'],
    emailserie: ['Coaching', 'neue Newsletter-Abonnenten herzlich begrüßen'],
    newsletter: ['Webdesign-Agentur', 'Tipp: schnellere Website ohne Technik-Kauderwelsch'],
    ad: ['Zahnarztpraxis', 'neue Patient:innen für professionelle Zahnreinigung'],
    seo: ['Reinigungsfirma', 'Büroreinigung in Bern — Seite soll besser gefunden werden'],
    slogan: ['Bio-Café', 'regionaler Kaffee, fair und frisch'],
    landing: ['Online-Kurs', 'Excel-Grundkurs für kleine Betriebe'],
    script: ['Friseursalon', 'vorher/nachher einer Typveränderung'],
    press: ['Handwerksbäckerei', 'Eröffnung der zweiten Filiale'],
    angebot: ['Maler-Betrieb', 'Innenanstrich 3-Zimmer-Wohnung'],
    review: ['Restaurant', '[Bewertung des Gasts hier einfügen, z. B. „Essen super, Service langsam"]'],
    anleitung: ['Onlineshop', 'Retoure korrekt bearbeiten'],
    ideas: ['Fitnessstudio', 'Mitglieder im Winter halten']
  };
  var EX_EN = {
    text: ['Trade business', 'Welcome text for our new website homepage'],
    email: ['Tax advisory', 'Kindly remind a client about missing receipts for 2025'],
    social: ['Photographer', 'Autumn family shoots, dates from October'],
    product: ['Home goods shop', 'reusable beeswax wraps, set of 3'],
    blog: ['Physiotherapy', 'Avoiding back pain while working from home'],
    faq: ['Dog school', 'Puppy group class for beginners'],
    jobad: ['Bakery', 'Part-time sales assistant'],
    slogan: ['Organic café', 'regional coffee, fair and fresh'],
    summary: ['', '[Paste the long text you want summarized here]'],
    plan: ['Real estate agent', 'free up more time for client conversations'],
    contentplan: ['Yoga studio', 'attract new beginners'],
    emailserie: ['Coaching', 'warmly welcome new newsletter subscribers'],
    newsletter: ['Web design agency', 'Tip: a faster website without the tech jargon'],
    ad: ['Dental practice', 'attract new patients for professional teeth cleaning'],
    seo: ['Cleaning company', 'office cleaning in Bern — page should rank better'],
    slogan: ['Organic café', 'regional coffee, fair and fresh'],
    landing: ['Online course', 'Excel basics course for small businesses'],
    script: ['Hair salon', 'before/after of a restyle'],
    press: ['Craft bakery', 'opening of the second location'],
    angebot: ['Painting business', 'interior painting of a 3-room flat'],
    review: ['Restaurant', '[Paste the customer review here, e.g. "Great food, slow service"]'],
    anleitung: ['Online shop', 'process a return correctly'],
    ideas: ['Gym', 'keep members engaged through winter']
  };
  var geBtn = $('genExample');
  if (geBtn) geBtn.addEventListener('click', function () {
    var k = val('genKind') || 'text';
    var ex = (EN ? EX_EN : EX_DE)[k] || (EN ? EX_EN : EX_DE).text;
    if ($('genBranche')) $('genBranche').value = ex[0];
    if ($('genZiel')) $('genZiel').value = ex[1];
  });

  // Gratis-Mini-Test (ohne Pro-Schlüssel) → /api/demo
  var demoBtn = $('demoRun');
  if (demoBtn) demoBtn.addEventListener('click', function () {
    var out = $('demoOut'), msg = $('demoMsg');
    var body = { kind: (val('demoKind') || 'email'), branche: val('demoBranche'), ziel: val('demoZiel'), lang: EN ? 'en' : 'de' };
    demoBtn.disabled = true; var old = demoBtn.textContent; demoBtn.textContent = T.working; if (msg) msg.textContent = '';
    fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
      .then(function (o) {
        if (o.s === 200 && o.d && o.d.text) {
          if (out) { out.textContent = o.d.text; out.hidden = false; out.className = 'out show'; }
          var up = $('demoUpsell'); if (up) up.hidden = false;
        } else if (o.s === 429 && o.d && o.d.upsell) {
          if (msg) msg.textContent = EN ? 'Free limit reached — get Pro for unlimited.' : 'Gratis-Limit erreicht — mit Pro unbegrenzt.';
          var up2 = $('demoUpsell'); if (up2) up2.hidden = false;
        } else if (o.s === 503) { if (msg) msg.textContent = T.off; }
        else { if (msg) msg.textContent = T.err; }
      }).catch(function () { if (msg) msg.textContent = T.err; })
      .finally(function () { demoBtn.disabled = false; demoBtn.textContent = old; });
  });

  // Jahres-Bonus: Vorlagen kopieren
  document.addEventListener('click', function (ev) {
    var c = ev.target.closest ? ev.target.closest('.tplcopy') : null;
    if (!c) return;
    var box = c.parentNode.querySelector('[data-tpl]');
    var txt = box ? box.textContent : '';
    if (txt && navigator.clipboard) navigator.clipboard.writeText(txt).then(function () {
      var o = c.textContent; c.textContent = EN ? 'Copied ✓' : 'Kopiert ✓';
      setTimeout(function () { c.textContent = o; }, 1500);
    });
  });

  // Start: gesperrt anzeigen, bis validiert
  setUnlocked(false);
})();
