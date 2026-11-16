/* LuxeStyle Scroll-Geschichte 2.0 (15.11.2026). Vanilla, ohne Bibliothek. Neue Datei.
   Ablauf: Bühne klebt (CSS sticky). Pro Kapitel ein stummes Video, das spielt, solange sein Kapitel aktiv ist.
   An die Scrollposition gebunden: der Hintergrund zoomt (1,24 bis 1,00) und schwenkt (Richtung wechselt je Kapitel),
   das nächste Kapitel schiebt sich als Vorhang von unten herein, das grosse Wort wächst ein, Text und Karte laufen gemeinsam.
   Jede Bewegung wird direkt als transform/opacity am Element gesetzt (keine geerbten Variablen: wenig Stilarbeit je Bild).
   Laden: vor der ersten Scrollbewegung nur das Poster von Kapitel 1 (im HTML), keine Video-Bytes.
   Danach: Video des aktiven Kapitels erst nach 300 ms Ruhe, Poster des nächsten, Video des nächsten erst wenn das aktive spielt;
   Videos weiter als ein Kapitel entfernt werden freigegeben.
   Rückfall: reduzierte Bewegung (auch wenn sie später eingeschaltet wird), Datensparmodus, Autoplay gesperrt, Fehler, zu langsam. */
(function () {
  'use strict';
  var BREIT = 750, FRIST = 9000, RUHE = 300;
  function klemme(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mm(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function feuer(el, name, detail) { try { el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail })); } catch (e) {} }
  var leerlauf = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 1500 }); } : function (f) { setTimeout(f, 200); };

  // Reine Rechnung (auch für Tests): r = Kapitel-Rechteck, vh = Fensterhöhe, i = Kapitelnummer.
  function werte(r, vh, i) {
    var t = (r.top + r.height / 2 - vh / 2) / vh;           // 0 = Kapitelmitte in Fenstermitte, >0 noch unten
    var k = klemme((vh - r.top) / (r.height + vh), 0, 1);   // 0 = kommt unten herein, 1 = oben hinaus
    var z = 1.24 - 0.24 * k;                                // Hintergrund fährt beim Scrollen heraus (1,24 bis 1,00)
    var rand = (z - 1) / (2 * z);                           // Spielraum je Seite: so weit darf das Bild wandern, ohne Rand
    var s = 1 - 2 * k;                                      // +1 bis -1 über das Kapitel
    var ty = -t * 0.32 * vh;                                // Text und Karte bleiben zurück (0,68-fache Geschwindigkeit)
    return {
      t: t, k: k, zoom: z,
      x: (i % 2 ? -1 : 1) * s * 0.85 * rand * 100,          // seitlicher Schwenk in %, Richtung wechselt je Kapitel
      y: s * 0.6 * rand * 100,
      auf: i === 0 ? 1 : klemme((0.92 * vh - r.top) / (0.62 * vh), 0, 1),   // Vorhang: 0 = unten, 1 = ganz offen
      textY: ty, karteY: ty,                                // gemeinsam: Karte und Text überdecken sich nie
      textO: t >= 0 ? klemme(1.75 - 1.9 * t, 0, 1) : klemme(1.45 - 2.4 * -t, 0, 1),   // nach oben schneller aus (Vorhang bleibt sauber)
      wortS: 1 + 0.25 * klemme(t, 0, 0.66) / 0.66           // grosses Wort wächst beim Hereinkommen von 1,25 auf 1,00
    };
  }
  function aktivIndex(rects, linie) {
    for (var i = 0; i < rects.length; i++) if (rects[i].top <= linie && rects[i].bottom > linie) return i;
    if (rects.length && rects[0].top > linie) return 0;
    return rects.length - 1;
  }
  // Welche Ebenen müssen gezeichnet werden? Sichtbar, wenn ihr Vorhang offen ist und die nächste sie noch nicht ganz verdeckt.
  function sichtbare(auf) {
    var s = [];
    for (var j = 0; j < auf.length; j++) s.push(auf[j] > 0 && !(j + 1 < auf.length && auf[j + 1] >= 1));
    return s;
  }

  function start(el) {
    if (el.__lxst) return;
    var st = { aus: [] };
    el.__lxst = st;
    function an(z, t, f, o) { z.addEventListener(t, f, o); st.aus.push(function () { z.removeEventListener(t, f, o); }); }
    var kapitel = [].slice.call(el.querySelectorAll('.lx-story__kapitel'));
    var ebenen = [].slice.call(el.querySelectorAll('.lx-story__ebene'));
    var punkte = [].slice.call(el.querySelectorAll('.lx-story__punkte a'));
    var pause = el.querySelector('.lx-story__pause');
    var balken = el.querySelector('.lx-story__fortschritt span');
    if (!kapitel.length || kapitel.length !== ebenen.length) return;

    var reduziert = mm('(prefers-reduced-motion: reduce)');
    var c = navigator.connection;
    var sparen = !!(c && (c.saveData || /^(slow-2g|2g)$/.test(c.effectiveType || '')));
    if (reduziert) { el.setAttribute('data-rueckfall', 'bewegung'); return; }
    el.classList.add('lx-story--js');
    if (sparen) el.setAttribute('data-rueckfall', 'daten');

    // Elemente je Kapitel einmal merken; zuletzt geschriebene Werte, damit nur Änderungen geschrieben werden.
    var teile = kapitel.map(function (k, j) {
      var e = ebenen[j];
      return { tx: k.querySelector('.lx-story__text'), wort: k.querySelector('.lx-story__wort'), ka: k.querySelector('.lx-story__karte'), eb: e, med: [].slice.call(e.querySelectorAll('img,video')), alt: {} };
    });
    function setze(t, el2, prop, wert) { if (el2 && t.alt[prop] !== wert) { t.alt[prop] = wert; el2.style[prop.split('|')[0]] = wert; } }

    function kopf() {
      // Klebende Kopfzeile des Themes: Vorfahr von #header-component mit position sticky/fixed.
      var e = document.getElementById('header-component'), b = -1;
      while (e && e !== document.body) { var cs = getComputedStyle(e); if (cs.position === 'sticky' || cs.position === 'fixed') { b = e.getBoundingClientRect().height + (parseFloat(cs.top) || 0); break; } e = e.parentElement; }
      if (b < 0) return;                                    // nicht gefunden: CSS-Vorgabe bleibt
      var alt = parseFloat(getComputedStyle(el).getPropertyValue('--lx-story-kopf')) || 0;
      if (Math.abs(alt - b) > 1.5) el.style.setProperty('--lx-story-kopf', Math.round(klemme(b, 0, 160)) + 'px');
    }

    var quer = mm('(min-width: ' + BREIT + 'px)');
    var aktiv = -1, gescrollt = window.pageYOffset > 0, nah = false, sichtbar = false, tick = false, angehalten = false, ende = false;
    var videos = ebenen.map(function (e) { return e.querySelector('video'); });
    var fristen = [], ruhe = 0, sprung = -1, sprungZeit = 0;   // sprung: Ziel eines Klicks auf einen Punkt, solange der Bildlauf unterwegs ist

    function posterLaden(i) {
      var e = ebenen[i]; if (!e) return;
      var s = e.querySelector('source[data-srcset]'), img = e.querySelector('img[data-src]');
      if (s) { s.setAttribute('srcset', s.getAttribute('data-srcset')); s.removeAttribute('data-srcset'); }
      if (img) { img.setAttribute('src', img.getAttribute('data-src')); img.removeAttribute('data-src'); }
    }
    function darfVideo() { return !sparen && !angehalten && gescrollt && nah && !el.hasAttribute('data-rueckfall'); }
    function videoLaden(i, abspielen) {
      var v = videos[i];
      if (!v || !darfVideo()) return;
      if (!v.getAttribute('src')) {
        v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
        v.preload = 'auto';
        v.src = v.getAttribute(quer ? 'data-vq' : 'data-vh');
        try { v.load(); } catch (e) {}
      }
      if (abspielen) spielen(i);
    }
    function spielen(i) {
      var v = videos[i];
      if (!v || !v.getAttribute('src') || !sichtbar || document.hidden || angehalten || i !== aktiv) return;
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function (f) { if (f && f.name === 'NotAllowedError') rueckfall('autoplay'); });
      if (!fristen[i] && v.readyState < 3) fristen[i] = setTimeout(function () { fristen[i] = 0; if (v.readyState < 3 && i === aktiv) { entladen(i); feuer(el, 'lx-story:langsam', { i: i }); } }, FRIST);
    }
    function entladen(i) { var v = videos[i]; if (!v) return; clearTimeout(fristen[i]); fristen[i] = 0; try { v.pause(); } catch (e) {} v.removeAttribute('data-spielt'); if (v.getAttribute('src')) { v.removeAttribute('src'); try { v.load(); } catch (e) {} } }
    function anhalten(i) { var v = videos[i]; if (v) { try { v.pause(); } catch (e) {} } clearTimeout(fristen[i]); fristen[i] = 0; }
    function rueckfall(grund) {
      if (el.hasAttribute('data-rueckfall')) return;
      el.setAttribute('data-rueckfall', grund);
      clearTimeout(ruhe);
      for (var i = 0; i < videos.length; i++) entladen(i);
      feuer(el, 'lx-story:fehler', { grund: grund });
    }
    videos.forEach(function (v, i) {
      if (!v) return;
      an(v, 'playing', function () {
        clearTimeout(fristen[i]); fristen[i] = 0;
        v.setAttribute('data-spielt', '');
        if (i === aktiv && videos[i + 1]) videoLaden(i + 1, false);   // nächstes vorladen, nur solange dieses Kapitel aktiv ist
        feuer(el, 'lx-story:spielt', { i: i });
      });
      an(v, 'error', function () { if (v.getAttribute('src')) { v.removeAttribute('data-spielt'); feuer(el, 'lx-story:fehler', { grund: 'fehler', i: i }); } });
    });

    function setzeAktiv(i) {
      if (i === aktiv) return;
      var alt = aktiv; aktiv = i;
      for (var j = 0; j < ebenen.length; j++) {
        if (j === i) ebenen[j].setAttribute('data-aktiv', ''); else ebenen[j].removeAttribute('data-aktiv');
        if (punkte[j]) { if (j === i) punkte[j].setAttribute('aria-current', 'step'); else punkte[j].removeAttribute('aria-current'); }
        if (Math.abs(j - i) > 1) entladen(j);              // weit entfernte Videos freigeben (Speicher)
      }
      posterLaden(i); posterLaden(i + 1);
      if (alt >= 0) anhalten(alt);
      if (i === sprung) sprung = -1;
      ruheStarten(i);                                       // schnelles Durchscrollen lädt keine Zwischenvideos
      el.setAttribute('data-kapitel', i);
      feuer(el, 'lx-story:kapitel', { kapitel: i });
    }

    // Video erst nach RUHE ms im selben Kapitel laden. Beim Ablauf die echte Lage frisch lesen: auf langsamen Geräten kann der
    // Zeitgeber vor dem nächsten Bild laufen, während die Seite schon weiter ist. Während eines Sprungs per Punkt (weicher
    // Bildlauf des Themes) die Zwischenkapitel überspringen; nach 3 s oder eigener Eingabe gilt wieder der Normalfall.
    function ruheStarten(i) {
      clearTimeout(ruhe);
      ruhe = setTimeout(function () {
        ruhe = 0;
        if (aktiv !== i) return;
        if (aktivIndex(kapitel.map(function (k) { return k.getBoundingClientRect(); }), (window.innerHeight || 1) * 0.55) !== i) { beimScrollen(); return; }
        if (sprung >= 0 && sprung !== i && Date.now() - sprungZeit < 3000) { ruheStarten(i); return; }
        sprung = -1;
        videoLaden(i, true);
      }, RUHE);
    }

    function zeichne() {
      tick = false;
      var vh = window.innerHeight || 1;
      var rects = kapitel.map(function (k) { return k.getBoundingClientRect(); });
      var i = aktivIndex(rects, vh * 0.55);
      if (gescrollt) setzeAktiv(i);                         // vorher bleibt Kapitel 1 (Poster im HTML) ohne Nachladen
      var sr = el.getBoundingClientRect(), weg = sr.height - vh;
      var g = klemme(weg > 0 ? -sr.top / weg : 0, 0, 1);
      if (balken) setze(teile[0], balken, 'transform|balken', 'scaleX(' + g.toFixed(4) + ')');
      var e2 = g >= 0.999;
      if (e2 !== ende) { ende = e2; el.toggleAttribute('data-ende', ende); }
      if (angehalten) return;
      var w = rects.map(function (r, j) { return werte(r, vh, j); });
      var sicht = sichtbare(w.map(function (x) { return x.auf; }));
      for (var j = 0; j < kapitel.length; j++) {
        var T = teile[j], x = w[j], r = rects[j];
        setze(T, T.eb, 'visibility|sicht', sicht[j] ? 'visible' : 'hidden');
        if (sicht[j]) {
          var off = ((1 - x.auf) * 100).toFixed(2);
          setze(T, T.eb, 'transform|eb', 'translate3d(0,' + off + '%,0)');
          var m = 'translate3d(0,-' + off + '%,0) scale(' + x.zoom.toFixed(4) + ') translate3d(' + x.x.toFixed(3) + '%,' + x.y.toFixed(3) + '%,0)';
          for (var q = 0; q < T.med.length; q++) setze(T, T.med[q], 'transform|m' + q, m);
        }
        if (r.bottom < -vh || r.top > 2 * vh) continue;     // Text nur für Kapitel in der Nähe rechnen
        setze(T, T.tx, 'transform|tx', 'translate3d(0,' + x.textY.toFixed(1) + 'px,0)');
        setze(T, T.tx, 'opacity|tx', x.textO.toFixed(3));
        setze(T, T.ka, 'transform|ka', 'translate3d(0,' + x.karteY.toFixed(1) + 'px,0)');
        setze(T, T.wort, 'transform|wort', 'scale(' + x.wortS.toFixed(4) + ')');
      }
    }
    function beimScrollen() { if (!tick) { tick = true; requestAnimationFrame(zeichne); } }
    function ersterScroll() {
      if (window.pageYOffset <= 0) return;
      gescrollt = true;
      window.removeEventListener('scroll', ersterScroll);
      beimScrollen();
    }
    if (!gescrollt) an(window, 'scroll', ersterScroll, { passive: true });
    an(window, 'scroll', beimScrollen, { passive: true });
    an(window, 'resize', function () {
      kopf();
      var q = mm('(min-width: ' + BREIT + 'px)');
      if (q !== quer) { quer = q; for (var i = 0; i < videos.length; i++) entladen(i); var a = aktiv; aktiv = -1; if (a >= 0) setzeAktiv(a); }
      beimScrollen();
    }, { passive: true });
    an(document, 'visibilitychange', function () { if (document.hidden) { if (aktiv >= 0) anhalten(aktiv); } else if (aktiv >= 0) spielen(aktiv); });
    // Reduzierte Bewegung, die später eingeschaltet wird: sofort anhalten (das CSS blendet die Bühne aus).
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var aufRed = function (e) { if (e.matches) { el.setAttribute('data-rueckfall', 'bewegung'); clearTimeout(ruhe); for (var i = 0; i < videos.length; i++) entladen(i); st.weg(); } };
      if (mq.addEventListener) an(mq, 'change', aufRed); else if (mq.addListener) { mq.addListener(aufRed); st.aus.push(function () { mq.removeListener(aufRed); }); }
    }

    // Tastatur: fokussierte Kaufkarte in die Kapitelmitte holen (dort ruht die Parallaxe, die Karte bleibt ganz im Bild).
    an(el, 'focusin', function (e) {
      var ka = e.target && e.target.closest && e.target.closest('.lx-story__karte');
      if (!ka) return;
      var fv = true; try { fv = ka.matches(':focus-visible'); } catch (x) {}
      if (!fv) return;
      var k = ka.closest('.lx-story__kapitel'); if (!k) return;
      var r = k.getBoundingClientRect(), vh = window.innerHeight || 1;
      window.scrollTo({ top: window.pageYOffset + r.top + r.height / 2 - vh / 2, behavior: 'auto' });
    });

    var nav = el.querySelector('.lx-story__punkte');
    if (nav) an(nav, 'click', function (e) { var a = e.target && e.target.closest && e.target.closest('a[data-i]'); if (a) { sprung = +a.getAttribute('data-i'); sprungZeit = Date.now(); } });
    var abbruch = function () { sprung = -1; };
    an(window, 'wheel', abbruch, { passive: true }); an(window, 'touchstart', abbruch, { passive: true }); an(window, 'keydown', abbruch);
    if (pause) {
      pause.hidden = false;
      an(pause, 'click', function () {
        angehalten = !angehalten;
        pause.setAttribute('aria-pressed', angehalten ? 'true' : 'false');
        var txt = pause.querySelector('.lx-story__pause-text'); if (txt) txt.textContent = pause.getAttribute(angehalten ? 'data-aus' : 'data-an');
        el.toggleAttribute('data-angehalten', angehalten);
        if (angehalten) { clearTimeout(ruhe); for (var i = 0; i < videos.length; i++) anhalten(i); }
        else { videoLaden(aktiv, true); beimScrollen(); }
      });
    }

    if ('IntersectionObserver' in window) {
      st.io1 = new IntersectionObserver(function (e) {
        nah = e[e.length - 1].isIntersecting;
        if (nah && aktiv >= 0 && gescrollt) videoLaden(aktiv, true);
      }, { rootMargin: '50% 0px' });
      st.io1.observe(el);
      st.io2 = new IntersectionObserver(function (e) {
        sichtbar = e[e.length - 1].isIntersecting;
        if (sichtbar) { if (aktiv >= 0) spielen(aktiv); } else if (aktiv >= 0) anhalten(aktiv);
      }, { threshold: [0] });
      st.io2.observe(el.querySelector('.lx-story__buehne'));
    } else { nah = true; sichtbar = true; }
    // Erste Messung erst im Leerlauf (oder beim ersten Scrollen): beim Laden der Seite keine zusätzliche Arbeit.
    leerlauf(function () { if (el.__lxst !== st) return; kopf(); beimScrollen(); });

    st.weg = function () {
      if (st.io1) st.io1.disconnect();
      if (st.io2) st.io2.disconnect();
      for (var i = 0; i < st.aus.length; i++) st.aus[i]();
      st.aus = [];
      clearTimeout(ruhe);
      for (var j = 0; j < videos.length; j++) anhalten(j);
    };
  }

  function alle(w) { var l = (w || document).querySelectorAll('[data-lx-story]'); for (var i = 0; i < l.length; i++) start(l[i]); }
  function weg(w) { var l = (w || document).querySelectorAll('[data-lx-story]'); for (var i = 0; i < l.length; i++) { var s = l[i].__lxst; if (s && s.weg) s.weg(); l[i].__lxst = null; } }
  document.addEventListener('shopify:section:load', function (e) { alle(e.target); });
  document.addEventListener('shopify:section:unload', function (e) { weg(e.target); });
  window.lxStory = { werte: werte, aktivIndex: aktivIndex, sichtbare: sichtbare, start: alle, weg: weg };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { alle(); }); else alle();
})();
