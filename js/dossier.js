/* aban news — Dossier-Lesehilfen.
 * Vanilla JS, kein Tracking (nur localStorage auf dem eigenen Gerät), CSP-konform.
 * (1) Lesefortschritts-Balken, (2) „nach oben"-Knopf,
 * (3) „gelesen"-Markierung je Ausgabe der Leseroute + Zähler.
 * No-op auf Seiten ohne .route/Dossier-Struktur.
 */
(function () {
  'use strict';

  /* ---------- 1) Lesefortschritt ---------- */
  var bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  /* ---------- 2) Nach-oben-Knopf ---------- */
  var top = document.createElement('button');
  top.className = 'to-top';
  top.type = 'button';
  top.setAttribute('aria-label', 'Nach oben');
  top.innerHTML = '↑';
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(top);

  function onScroll() {
    var doc = document.documentElement;
    var h = doc.scrollHeight - window.innerHeight;
    var p = h > 0 ? window.scrollY / h : 0;
    bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    top.classList.toggle('show', window.scrollY > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 3) „gelesen"-Markierung (localStorage) ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.route li[data-url]'));
  if (!items.length) return;

  var KEY = 'aban_read_issues';
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  var state = load();

  // Zähler über der Liste
  var ol = items[0].parentNode;
  var counter = document.createElement('p');
  counter.className = 'read-counter';
  ol.parentNode.insertBefore(counter, ol);

  function refresh() {
    var done = 0;
    items.forEach(function (li) {
      var url = li.getAttribute('data-url');
      var read = !!state[url];
      li.classList.toggle('read', read);
      var btn = li.querySelector('.mark');
      if (btn) {
        btn.setAttribute('aria-pressed', read ? 'true' : 'false');
        btn.textContent = read ? '✓ gelesen' : '○ als gelesen markieren';
      }
      if (read) done++;
    });
    counter.textContent = done + ' von ' + items.length + ' Ausgaben gelesen';
  }

  items.forEach(function (li) {
    var btn = li.querySelector('.mark');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = li.getAttribute('data-url');
      if (state[url]) { delete state[url]; } else { state[url] = 1; }
      save(state);
      refresh();
    });
  });

  // Aktuelle Ausgabe automatisch als gelesen merken, wenn man von ihr zurückkommt:
  // wird die Ziel-URL in diesem Tab geöffnet, markiert reader.js sie nicht — daher
  // setzen wir den Status beim Klick auf den Titel-Link.
  items.forEach(function (li) {
    var a = li.querySelector('.t a');
    if (a) a.addEventListener('click', function () {
      state[li.getAttribute('data-url')] = 1; save(state);
    });
  });

  refresh();
})();
