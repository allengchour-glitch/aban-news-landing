/* stickman.js — wiederverwendbares Strichmännchen für motion.js (deterministisch, nur Motion.at/loop).
 *
 *   const pia = Stickman(parentSvgGroup, { x: 540, y: 1480, s: 1.3, schleife: '#e76f51' });
 *   pia.pose(1.0, 'jubeln', .6);        // ab Sekunde 1.0 in 0.6 s in die Pose
 *   pia.gehen(2.0, 3.0, { dx: 400 });   // 3 s gehen, dabei 400 px nach rechts
 *   pia.mund(2.0, 'lachen');            // Gesicht: 'ruhig' | 'lachen' | 'sorge'
 *
 * Koordinaten: Ursprung = Standpunkt (Füsse), Figur ca. 290 Einheiten hoch (s skaliert).
 * Winkel in Grad, 0 = Glied hängt nach unten; positiv dreht ZUR BILDSCHIRM-LINKEN (hoch = 180 über links),
 * negativ zur rechten Seite. Linker Arm/Bein = Bildschirm-links.
 *
 * REGEL: Bewegungen derselben Figur (pose/gehen/winken/ruehren/huepfen) stehen in zeitlicher Reihenfolge und überlappen nicht;
 * Gesichtswechsel (mund) dürfen zeitgleich beginnen, aber nie rückwärts. Sonst bricht die Funktion mit einem Fehler ab
 * (sonst würden sich Überblendungen überschreiben, siehe LERNEN-2).
 */
(function () {
  const M = window.Motion;
  if (!M) throw new Error('stickman.js braucht motion.js (zuerst laden)');
  const STRICH = '#22303c', HAUT = '#fffdf7';

  const POSEN = {
    //            Arm links: oben, Unterarm | Arm rechts: oben, Unterarm | Bein links, Knie | Bein rechts, Knie
    ruhig:   { aLo: 10,  aLu: 6,    aRo: -10,  aRu: -6,    bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    jubeln:  { aLo: 155, aLu: 12,   aRo: -155, aRu: -12,   bLo: 6,  bLu: 0,  bRo: -6, bRu: 0 },
    zeigen:  { aLo: 10,  aLu: 6,    aRo: -95,  aRu: -4,    bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    denken:  { aLo: 12,  aLu: 8,    aRo: -35,  aRu: -150,  bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    kochen:  { aLo: 20,  aLu: 40,   aRo: -50,  aRu: -70,   bLo: 3,  bLu: 0,  bRo: -3, bRu: 0 },
    winken:  { aLo: 10,  aLu: 6,    aRo: -150, aRu: -10,   bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    offen:   { aLo: 60,  aLu: 10,   aRo: -60,  aRu: -10,   bLo: 4,  bLu: 0,  bRo: -4, bRu: 0 }
  };

  function Stickman(parent, o) {
    o = o || {};
    const x = o.x || 0, y = o.y || 0, s = o.s || 1, schleife = o.schleife || '#e76f51';
    const g = (p, a) => M.svg('g', a || {}, p);
    const dick = o.strich || 13;
    const linie = (p, x1, y1, x2, y2, w) => M.svg('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: STRICH, 'stroke-width': w || dick, 'stroke-linecap': 'round' }, p);

    const root = g(parent, { transform: `translate(${x},${y}) scale(${s})` });
    const schatten = g(root);                      // Bodenschatten: folgt der Figur nur seitwärts
    M.svg('ellipse', { cx: 0, cy: 3, rx: 74, ry: 13, fill: 'rgba(34,48,60,.16)' }, schatten);
    const mover = g(root);                         // Verschiebung beim Gehen
    const beine = g(mover);
    const koerper = g(mover);                      // Rumpf, Kopf, Arme (atmet)

    /* ---- Gelenke: je eine Gruppe, die um ihren Ursprung (0,0) dreht ---- */
    const gelenke = {};
    function gelenk(name, parentEl, px, py, start) {
      const wrap = g(parentEl, { transform: `translate(${px},${py})` });
      const dreh = g(wrap);
      gelenke[name] = { el: dreh, cur: start, wrap: wrap };
      return gelenke[name];
    }
    function glied(j, laenge, ende) {   // Linie nach unten + Anschluss für das nächste Gelenk
      linie(j.el, 0, 0, 0, laenge);
      if (ende) M.svg('circle', { cx: 0, cy: laenge, r: ende + 2, fill: HAUT, stroke: STRICH, 'stroke-width': 8 }, j.el);
      return j;
    }
    const P0 = POSEN.ruhig;
    // Beine (Hüfte y = -140)
    const bLo = gelenk('bLo', beine, -14, -140, P0.bLo); glied(bLo, 70);
    const bLu = gelenk('bLu', bLo.el, 0, 70, P0.bLu);    glied(bLu, 70); linie(bLu.el, 0, 70, -20, 70, dick - 1);
    const bRo = gelenk('bRo', beine, 14, -140, P0.bRo);  glied(bRo, 70);
    const bRu = gelenk('bRu', bRo.el, 0, 70, P0.bRu);    glied(bRu, 70); linie(bRu.el, 0, 70, 20, 70, dick - 1);
    // Rumpf
    linie(koerper, 0, -215, 0, -140, dick + 2);
    // Arme (Schulter y = -205)
    const aLo = gelenk('aLo', koerper, -4, -205, P0.aLo); glied(aLo, 56);
    const aLu = gelenk('aLu', aLo.el, 0, 56, P0.aLu);     glied(aLu, 54, 8);
    const aRo = gelenk('aRo', koerper, 4, -205, P0.aRo);  glied(aRo, 56);
    const aRu = gelenk('aRu', aRo.el, 0, 56, P0.aRu);     glied(aRu, 54, 8);
    // Kopf
    const kopf = g(koerper);
    M.svg('circle', { cx: 0, cy: -257, r: 37, fill: HAUT, stroke: STRICH, 'stroke-width': 10 }, kopf);
    M.svg('circle', { cx: -23, cy: -250, r: 7.5, fill: '#ff8f7a', opacity: .45 }, kopf);   // Wangen
    M.svg('circle', { cx: 23, cy: -250, r: 7.5, fill: '#ff8f7a', opacity: .45 }, kopf);
    const augen = g(kopf);
    M.svg('ellipse', { cx: -12, cy: -262, rx: 4.4, ry: 5.2, fill: STRICH }, augen);
    M.svg('ellipse', { cx: 12, cy: -262, rx: 4.4, ry: 5.2, fill: STRICH }, augen);
    augen.style.transformBox = 'fill-box'; augen.style.transformOrigin = '50% 50%';
    // Blinzeln alle 3.4 s (Perioden, deterministisch)
    M.at(augen, [{ transform: 'scaleY(1)', offset: 0 }, { transform: 'scaleY(1)', offset: .92 }, { transform: 'scaleY(.08)', offset: .955 }, { transform: 'scaleY(1)', offset: 1 }], { t: 0, d: 3.4, n: Infinity, ease: M.EASE.linear, fill: 'forwards' });
    const brauVar = {
      ruhig: M.svg('path', { d: 'M-21 -278 Q-13 -283 -5 -279 M5 -279 Q13 -283 21 -278', fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf),
      sorge: M.svg('path', { d: 'M-21 -274 L-5 -283 M21 -274 L5 -283', fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf)
    };
    const brauCur = { ruhig: 1, sorge: 0 };
    Object.keys(brauVar).forEach((k) => { brauVar[k].style.opacity = brauCur[k]; });
    const mundVar = {
      ruhig: M.svg('path', { d: 'M-10 -245 Q0 -241 10 -245', fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf),
      lachen: M.svg('path', { d: 'M-15 -249 Q0 -227 15 -249 Z', fill: '#fff', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, kopf),
      sorge: M.svg('path', { d: 'M-11 -240 Q0 -251 11 -240', fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf)
    };
    const mundCur = { ruhig: 1, lachen: 0, sorge: 0 };
    Object.keys(mundVar).forEach((k) => { mundVar[k].style.opacity = mundCur[k]; });
    // Schleife (Pias Erkennungszeichen)
    const sch = g(kopf, { transform: 'translate(-27,-292)' });
    M.svg('ellipse', { cx: -9, cy: 0, rx: 11, ry: 6, fill: schleife, stroke: STRICH, 'stroke-width': 3, transform: 'rotate(-25 -9 0)' }, sch);
    M.svg('ellipse', { cx: 9, cy: 0, rx: 11, ry: 6, fill: schleife, stroke: STRICH, 'stroke-width': 3, transform: 'rotate(25 9 0)' }, sch);
    M.svg('circle', { cx: 0, cy: 0, r: 5, fill: schleife, stroke: STRICH, 'stroke-width': 3 }, sch);

    /* ---- Zeitführung ---- */
    let letzteZeit = 0, letzterMund = 0, posX = 0, posY = 0;   // Ende der letzten Bewegung / Zeit des letzten Gesichtswechsels
    function ordnung(t, was) {
      if (was === 'mund') {
        if (t < letzterMund - 1e-6) throw new Error(`Stickman.mund: Zeit ${t} liegt vor dem letzten Gesichtswechsel (${letzterMund}).`);
        return;
      }
      if (t < letzteZeit - 1e-6) throw new Error(`Stickman.${was}: Zeit ${t} liegt vor dem Ende der letzten Bewegung (${letzteZeit}). Bewegungen in zeitlicher Reihenfolge schreiben, ohne Überlappung.`);
    }
    // Basis: jedes Gelenk startet in der ruhigen Pose (hält bis zur ersten Änderung)
    Object.keys(gelenke).forEach((k) => {
      M.at(gelenke[k].el, [{ transform: `rotate(${gelenke[k].cur}deg)` }, { transform: `rotate(${gelenke[k].cur}deg)` }], { t: 0, d: .001, ease: M.EASE.linear });
    });
    // Atmen: Rumpf hebt und senkt sich leicht (Perioden 2.4 s, endlos)
    M.loop(koerper, [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { t: 0, d: 2.4 });

    function drehen(name, t, d, nach, ease) {
      const j = gelenke[name];
      M.at(j.el, [{ transform: `rotate(${j.cur}deg)` }, { transform: `rotate(${nach}deg)` }], { t: t, d: Math.max(d, .001), ease: ease || M.EASE.inOut, fill: 'forwards' });
      j.cur = nach;
    }
    function zyklus(name, t, d, per, amp, gegen) {   // Pendeln um den aktuellen Wert, endet wieder dort
      const j = gelenke[name], n = Math.max(1, Math.round(d / per)), a = gegen ? -amp : amp;
      M.at(j.el, [{ transform: `rotate(${j.cur}deg)` }, { transform: `rotate(${j.cur + a}deg)` }, { transform: `rotate(${j.cur}deg)` }, { transform: `rotate(${j.cur - a}deg)` }, { transform: `rotate(${j.cur}deg)` }],
        { t: t, d: per, n: n, ease: M.EASE.inOut, fill: 'forwards' });
    }
    function verschieben(t, d, dx, dy, ease) {
      if (!dx && !dy) return;
      M.at(mover, [{ transform: `translate(${posX}px,${posY}px)` }, { transform: `translate(${posX + dx}px,${posY + dy}px)` }], { t: t, d: Math.max(d, .001), ease: ease || M.EASE.linear, fill: 'forwards' });
      M.at(schatten, [{ transform: `translateX(${posX}px)` }, { transform: `translateX(${posX + dx}px)` }], { t: t, d: Math.max(d, .001), ease: ease || M.EASE.linear, fill: 'forwards' });
      posX += dx; posY += dy;
    }

    const api = {
      root: root, kopf: kopf, koerper: koerper,
      /* statische Pose mit Übergang */
      pose: function (t, name, d) {
        ordnung(t, 'pose'); const p = POSEN[name]; if (!p) throw new Error('Stickman.pose: unbekannte Pose ' + name);
        Object.keys(p).forEach((k) => drehen(k, t, d === undefined ? .5 : d, p[k]));
        letzteZeit = t + (d === undefined ? .5 : d); return api;
      },
      /* Gehen auf der Stelle oder mit Verschiebung dx/dy (px in Szenenkoordinaten, vor Skalierung durch s: Einheiten der Figur) */
      gehen: function (t, d, opt) {
        ordnung(t, 'gehen'); opt = opt || {}; const per = opt.per || .7;
        zyklus('bLo', t, d, per, 28, false); zyklus('bRo', t, d, per, 28, true);
        zyklus('aLo', t, d, per, 22, true); zyklus('aRo', t, d, per, 22, false);
        verschieben(t, d, opt.dx || 0, opt.dy || 0);
        letzteZeit = t + d; return api;
      },
      /* Winken: rechter Unterarm pendelt (Pose 'winken' vorher setzen) */
      winken: function (t, d) {
        ordnung(t, 'winken'); zyklus('aRu', t, d, .5, 28, false); letzteZeit = t + d; return api;
      },
      /* Rühren/Kochen: Unterarm pendelt */
      ruehren: function (t, d) {
        ordnung(t, 'ruehren'); zyklus('aRu', t, d, .6, 18, false); letzteZeit = t + d; return api;
      },
      /* Gesicht wechseln */
      mund: function (t, name) {
        ordnung(t, 'mund'); if (!mundVar[name]) throw new Error('Stickman.mund: unbekannt ' + name);
        Object.keys(mundVar).forEach((k) => {
          const ziel = k === name ? 1 : 0;
          M.at(mundVar[k], [{ opacity: mundCur[k] }, { opacity: ziel }], { t: t, d: .08, ease: M.EASE.linear, fill: 'forwards' });
          mundCur[k] = ziel;
        });
        const bz = name === 'sorge' ? 'sorge' : 'ruhig';
        Object.keys(brauVar).forEach((k) => {
          const ziel = k === bz ? 1 : 0;
          M.at(brauVar[k], [{ opacity: brauCur[k] }, { opacity: ziel }], { t: t, d: .08, ease: M.EASE.linear, fill: 'forwards' });
          brauCur[k] = ziel;
        });
        letzterMund = t; return api;
      },
      /* kleine Hüpfer (Freude) */
      huepfen: function (t, d) {
        ordnung(t, 'huepfen'); const n = Math.max(1, Math.round(d / .5));
        M.at(mover, [{ transform: `translate(${posX}px,${posY}px)` }, { transform: `translate(${posX}px,${posY - 26}px)` }, { transform: `translate(${posX}px,${posY}px)` }],
          { t: t, d: .5, n: n, ease: M.EASE.out, fill: 'forwards' });
        M.at(schatten, [{ transform: `translateX(${posX}px) scale(1)` }, { transform: `translateX(${posX}px) scale(.78)` }, { transform: `translateX(${posX}px) scale(1)` }],
          { t: t, d: .5, n: n, ease: M.EASE.out, fill: 'forwards' });
        letzteZeit = t + d; return api;
      }
    };
    return api;
  }

  window.Stickman = Stickman;
})();
