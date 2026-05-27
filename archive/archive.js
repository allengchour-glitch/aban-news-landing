/* aban news Archive — client-side filter & search
 * Vanilla JS only, no deps, no tracking.
 */
(function () {
  'use strict';

  var grid = document.getElementById('arc-grid');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.arc-card'));
  var q = document.getElementById('q');
  var topic = document.getElementById('topic');
  var kind = document.getElementById('kind');
  var monthSel = document.getElementById('month');
  var clear = document.getElementById('clear-filters');
  var visCount = document.getElementById('visible-count');
  var empty = document.getElementById('arc-empty');

  // Build month list
  var monthsMap = {};
  cards.forEach(function (c) {
    var d = c.getAttribute('data-date'); // YYYY-MM-DD
    var key = d.substring(0, 7);
    monthsMap[key] = true;
  });
  var months = Object.keys(monthsMap).sort().reverse();
  var monthLabels = {
    '01':'Januar','02':'Februar','03':'März','04':'April','05':'Mai','06':'Juni',
    '07':'Juli','08':'August','09':'September','10':'Oktober','11':'November','12':'Dezember'
  };
  months.forEach(function (m) {
    var opt = document.createElement('option');
    opt.value = m;
    var parts = m.split('-');
    opt.textContent = monthLabels[parts[1]] + ' ' + parts[0];
    monthSel.appendChild(opt);
  });

  function tokenize(s) {
    return s.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function apply() {
    var qv = tokenize(q.value || '');
    var tv = (topic.value || '').toLowerCase();
    var kv = (kind.value || '').toLowerCase();
    var mv = (monthSel.value || '');
    var visible = 0;

    cards.forEach(function (c) {
      var blob = c.getAttribute('data-search') || '';
      var ct = c.getAttribute('data-topics') || '';
      var ck = c.getAttribute('data-kind') || '';
      var cd = c.getAttribute('data-date') || '';

      var matchesQ = qv.length === 0 || qv.every(function (t) { return blob.indexOf(t) !== -1; });
      var matchesT = !tv || ct.indexOf(tv) !== -1;
      var matchesK = !kv || ck === kv;
      var matchesM = !mv || cd.substring(0, 7) === mv;

      var show = matchesQ && matchesT && matchesK && matchesM;
      c.hidden = !show;
      if (show) visible++;
    });

    visCount.textContent = visible;
    empty.hidden = visible !== 0;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  q.addEventListener('input', debounce(apply, 80));
  topic.addEventListener('change', apply);
  kind.addEventListener('change', apply);
  monthSel.addEventListener('change', apply);
  clear.addEventListener('click', function () {
    q.value = ''; topic.value = ''; kind.value = ''; monthSel.value = '';
    apply();
    q.focus();
  });

  // Sync state from URL hash (?q=foo&topic=Tools)
  try {
    var qs = new URLSearchParams(window.location.search);
    if (qs.get('q')) q.value = qs.get('q');
    if (qs.get('topic')) topic.value = qs.get('topic');
    if (qs.get('kind')) kind.value = qs.get('kind');
    if (qs.get('month')) monthSel.value = qs.get('month');
    apply();
  } catch (e) {}
})();
