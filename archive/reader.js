/* aban news — Lese-Erlebnis für Archiv-Ausgaben.
 * Vanilla JS, keine Abhängigkeiten, kein Tracking, CSP-konform (externe Datei).
 * Fügt hinzu: (1) Lesefortschritts-Balken, (2) automatisches Inhaltsverzeichnis,
 * (3) „Mehr zum Thema" — verwandte Ausgaben aus archive/topics.json.
 * Greift nur auf Archiv-Ausgaben (article.issue + .issue-body) — sonst no-op.
 */
(function () {
  'use strict';
  var body = document.querySelector('.issue-body');
  var article = document.querySelector('article.issue');
  if (!body || !article) return;

  /* ---------- 1) Lesefortschritt ---------- */
  var bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  function onScroll() {
    var top = article.offsetTop;
    var h = article.offsetHeight - window.innerHeight;
    var p = h > 0 ? (window.scrollY - top) / h : 0;
    bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 2) Inhaltsverzeichnis ---------- */
  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
  }
  var heads = Array.prototype.slice.call(body.querySelectorAll('h2'));
  if (heads.length >= 3) {
    var nav = document.createElement('nav');
    nav.className = 'issue-toc';
    nav.setAttribute('aria-label', 'Inhalt dieser Ausgabe');
    var html = '<p class="issue-toc-h">Inhalt</p><ol>';
    heads.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent) || ('s' + Math.random().toString(36).slice(2, 7));
      html += '<li><a href="#' + h.id + '">' + h.textContent.replace(/[<>]/g, '') + '</a></li>';
    });
    html += '</ol>';
    nav.innerHTML = html;
    body.insertBefore(nav, body.firstChild);
  }

  /* ---------- Teilen ---------- */
  (function () {
    var url = location.href.split('#')[0];
    var title = (document.title || '').replace(/\s*\|\s*aban news\s*$/, '');
    var u = encodeURIComponent(url), t = encodeURIComponent(title);
    var share = document.createElement('div');
    share.className = 'issue-share';
    share.innerHTML =
      '<span class="is-l">Teilen:</span>' +
      '<a class="is-b" target="_blank" rel="noopener" aria-label="Auf X teilen" href="https://twitter.com/intent/tweet?url=' + u + '&text=' + t + '">𝕏</a>' +
      '<a class="is-b" target="_blank" rel="noopener" aria-label="Auf LinkedIn teilen" href="https://www.linkedin.com/sharing/share-offsite/?url=' + u + '">in</a>' +
      '<a class="is-b" target="_blank" rel="noopener" aria-label="Per WhatsApp teilen" href="https://wa.me/?text=' + t + '%20' + u + '">WA</a>' +
      '<button type="button" class="is-b is-copy" aria-label="Link kopieren">Link</button>';
    var copyBtn = share.querySelector('.is-copy');
    copyBtn.addEventListener('click', function () {
      var done = function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = '✓'; copyBtn.classList.add('copied');
        setTimeout(function () { copyBtn.textContent = old; copyBtn.classList.remove('copied'); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
    var pager = article.querySelector('.pager') || document.querySelector('.pager');
    if (pager && pager.parentNode) pager.parentNode.insertBefore(share, pager);
    else article.appendChild(share);
  })();

  /* ---------- 3) Mehr zum Thema (verwandte Ausgaben) ---------- */
  var path = location.pathname.replace(/index\.html$/, '');
  fetch('/archive/topics.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (data) {
    var issues = data.issues || {};
    var freq = data.freq || {};
    var me = issues[path] || issues[location.pathname];
    if (!me || !me.t || !me.t.length) return;
    var mine = me.t;
    var scored = [];
    Object.keys(issues).forEach(function (url) {
      if (url === path || url === location.pathname) return;
      var o = issues[url];
      if (o.kind === 'probe') return;
      var s = 0, shared = 0;
      (o.t || []).forEach(function (t) {
        if (mine.indexOf(t) !== -1) { s += 1 / (freq[t] || 1); shared++; }
      });
      if (shared > 0) scored.push({ url: url, o: o, s: s });
    });
    if (!scored.length) return;
    scored.sort(function (a, b) { return b.s - a.s || (a.o.date < b.o.date ? 1 : -1); });
    var top = scored.slice(0, 4);

    var sec = document.createElement('section');
    sec.className = 'issue-related';
    var h = '<h2>Mehr zum Thema</h2><div class="related-grid">';
    top.forEach(function (x) {
      h += '<a class="related-card" href="' + x.url + '">' +
        '<span class="rc-num">Ausgabe ' + (x.o.num || '') + '</span>' +
        '<span class="rc-title">' + (x.o.title || '').replace(/[<>]/g, '') + '</span>' +
        '<span class="rc-prev">' + (x.o.preview || '').replace(/[<>]/g, '').slice(0, 110) + '…</span></a>';
    });
    h += '</div>';
    // Dossier-Hinweis, falls die Ausgabe in einem Dossier steckt
    if (me.dossiers && me.dossiers.length) {
      var labels = {
        'ki-werkzeugkasten': '🧰 Der KI-Werkzeugkasten',
        'ki-datenschutz-dach': '🔒 KI & Datenschutz im DACH-Raum',
        'ki-prompts-die-funktionieren': '💡 Prompts, die funktionieren',
        'anti-hype-reality-checks': '🔍 Anti-Hype & Reality-Checks'
      };
      h += '<p class="related-dossier">Teil des Dossiers: ';
      h += me.dossiers.map(function (d) {
        return '<a href="/dossier/' + d + '.html">' + (labels[d] || d) + '</a>';
      }).join(' · ');
      h += '</p>';
    }
    sec.innerHTML = h;
    var pager = article.querySelector('.pager') || document.querySelector('.pager');
    if (pager && pager.parentNode) pager.parentNode.insertBefore(sec, pager);
    else article.appendChild(sec);
  }).catch(function () {});
})();
