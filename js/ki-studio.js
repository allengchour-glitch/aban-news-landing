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
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pro-Key': key || '' },
      body: JSON.stringify(body)
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
        return post('/api/generate', { kind: val('genKind') || 'text', branche: val('genBranche'), ziel: val('genZiel') })
          .then(function (r) { return { status: r.status, d: r.d, text: r.d && r.d.text }; });
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
    }
  });

  // Start: gesperrt anzeigen, bis validiert
  setUnlocked(false);
})();
