/* stickman.js — Strichmännchen im Stil des Referenzvideos (The AI Blueprint): grosser runder weisser Kopf mit wildem,
 * gekritzeltem Haar, dünne Strichgliedmassen, grosse weisse Handschuh-Hände, schwarze Schuh-Klumpen, geflicktes Gewand.
 * Läuft über motion.js (deterministisch, nur Motion.at/loop).
 *
 *   const pia = Stickman(parentSvgGroup, { x: 540, y: 1560, s: 1.45, kleid: '#7aa64f' });
 *   pia.pose(1.0, 'jubeln', .6);        // ab Sekunde 1.0 in 0.6 s in die Pose
 *   pia.gehen(2.0, 3.0, { dx: 400 });   // 3 s gehen, dabei 400 Einheiten nach rechts
 *   pia.mund(2.0, 'lachen');            // Gesicht: 'ruhig' | 'lachen' | 'sorge'
 *
 * Koordinaten: Ursprung = Standpunkt (Füsse), Figur ca. 345 Einheiten hoch mit Haar (s skaliert).
 * Winkel in Grad, 0 = Glied hängt nach unten; positiv dreht zur BILDSCHIRM-LINKEN (hoch = 180 über links),
 * negativ zur rechten Seite. Linker Arm/Bein = Bildschirm-links.
 *
 * REGEL: Bewegungen derselben Figur (pose/gehen/winken/ruehren/huepfen) stehen in zeitlicher Reihenfolge und überlappen nicht;
 * Gesichtswechsel (mund) dürfen zeitgleich beginnen, aber nie rückwärts. Sonst bricht die Funktion mit einem Fehler ab
 * (sonst würden sich Überblendungen überschreiben, siehe LERNEN-2).
 */
(function () {
  const M = window.Motion;
  if (!M) throw new Error('stickman.js braucht motion.js (zuerst laden)');
  const STRICH = '#1d1d22', HAUT = '#f9f7f1', HAAR = '#17171b';

  const POSEN = {
    //            Arm links: oben, Unterarm | Arm rechts: oben, Unterarm | Bein links, Knie | Bein rechts, Knie
    ruhig:   { aLo: 8,   aLu: 6,    aRo: -8,   aRu: -6,    bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    jubeln:  { aLo: 150, aLu: 14,   aRo: -150, aRu: -14,   bLo: 6,  bLu: 0,  bRo: -6, bRu: 0 },
    zeigen:  { aLo: 8,   aLu: 6,    aRo: -95,  aRu: -4,    bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    denken:  { aLo: 10,  aLu: 8,    aRo: -38,  aRu: -150,  bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    kochen:  { aLo: 18,  aLu: 36,   aRo: -48,  aRu: -66,   bLo: 3,  bLu: 0,  bRo: -3, bRu: 0 },
    winken:  { aLo: 8,   aLu: 6,    aRo: -150, aRu: -10,   bLo: 2,  bLu: 0,  bRo: -2, bRu: 0 },
    offen:   { aLo: 55,  aLu: 10,   aRo: -55,  aRu: -10,   bLo: 4,  bLu: 0,  bRo: -4, bRu: 0 }
  };

  function mischen(hex, ziel, anteil) {   // Farbe mit Weiss (255) oder Schwarz (0) mischen
    const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(v + (ziel - v) * anteil));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function verlaeufe(svg, kleid) {
    let defs = svg.querySelector('#sk-defs');
    if (!defs) {
      defs = M.svg('defs', { id: 'sk-defs' }, svg);
      const rad = (id, cx, cy, r, stops) => { const e = M.svg('radialGradient', { id: id, cx: cx, cy: cy, r: r }, defs); stops.forEach((st) => M.svg('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] === undefined ? 1 : st[2] }, e)); };
      rad('sk-kopf', '.64', '.28', '.9', [[0, '#ffffff'], [.45, '#f6f3ea'], [1, '#aaa38f']]);          // Kugelschattierung, Licht oben rechts
      rad('sk-hand', '.6', '.3', '.9', [[0, '#ffffff'], [.6, '#f3f0e6'], [1, '#bdb6a4']]);
      rad('sk-schuh', '.62', '.3', '.9', [[0, '#5a5a66'], [1, '#0e0e12']]);
      rad('sk-schatten', '.5', '.5', '.5', [[0, '#14141c', .42], [.6, '#14141c', .18], [1, '#14141c', 0]]);   // weicher Schlagschatten
    }
    if (kleid && !svg.querySelector('[id="sk-t-' + kleid.slice(1) + '"]')) {
      const l = M.svg('linearGradient', { id: 'sk-t-' + kleid.slice(1), x1: '0.15', y1: '0', x2: '0.95', y2: '1' }, defs);
      [[0, mischen(kleid, 255, .32)], [.45, kleid], [1, mischen(kleid, 0, .38)]].forEach((st) => M.svg('stop', { offset: st[0], 'stop-color': st[1] }, l));
    }
    return defs;
  }

  function Stickman(parent, o) {
    o = o || {};
    const x = o.x || 0, y = o.y || 0, s = o.s || 1, kleid = o.kleid || '#7aa64f', flicken = o.flicken || '#c9a05a';
    const g = (p, a) => M.svg('g', a || {}, p);
    const linie = (p, x1, y1, x2, y2, w) => M.svg('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: STRICH, 'stroke-width': w || 8, 'stroke-linecap': 'round' }, p);
    const glied = (p, x1, y1, x2, y2) => { linie(p, x1, y1, x2, y2, 8); M.svg('line', { x1: x1 + 2.2, y1: y1 + 2, x2: x2 + 2.2, y2: y2 - 2, stroke: 'rgba(255,255,255,.32)', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, p); };

    const root = g(parent, { transform: `translate(${x},${y}) scale(${s})` });
    const wurzel = parent.ownerSVGElement || parent;
    verlaeufe(wurzel, kleid);
    const licht = o.licht || '#ffe9b3';   // Farbe des Randlichts (Sonne/Feuer von rechts)
    const schatten = g(root);                      // Bodenschatten: folgt der Figur nur seitwärts
    M.svg('ellipse', { cx: -46, cy: 6, rx: 128, ry: 20, fill: 'url(#sk-schatten)' }, schatten);
    const mover = g(root);                         // Verschiebung beim Gehen
    const beine = g(mover);
    const koerper = g(mover);                      // Arme, Gewand, Kopf (atmet)

    /* ---- Gelenke: je eine Gruppe, die um ihren Ursprung (0,0) dreht ---- */
    const gelenke = {};
    function gelenk(name, parentEl, px, py, start) {
      const wrap = g(parentEl, { transform: `translate(${px},${py})` });
      const dreh = g(wrap);
      gelenke[name] = { el: dreh, cur: start };
      return gelenke[name];
    }
    function handschuh(j, laenge) {   // grosse weisse Handschuh-Hand am Ende des Unterarms
      const h = g(j.el, { transform: `translate(0,${laenge})` });
      M.svg('ellipse', { cx: -17, cy: 12, rx: 9, ry: 13, fill: 'url(#sk-hand)', stroke: STRICH, 'stroke-width': 5, transform: 'rotate(18 -17 12)' }, h);   // Daumen
      M.svg('ellipse', { cx: 0, cy: 22, rx: 19, ry: 23, fill: 'url(#sk-hand)', stroke: STRICH, 'stroke-width': 5 }, h);
      M.svg('path', { d: 'M-6 30 v12 M6 30 v12', stroke: STRICH, 'stroke-width': 3.5, 'stroke-linecap': 'round', fill: 'none' }, h);
    }
    function schuh(j, richtung) {
      M.svg('ellipse', { cx: richtung * 15, cy: 50, rx: 22, ry: 10, fill: 'url(#sk-schuh)' }, j.el);
    }
    const P0 = POSEN.ruhig;
    // Beine (Hüfte y = -98)
    const bLo = gelenk('bLo', beine, -17, -98, P0.bLo); glied(bLo.el, 0, 0, 0, 50);
    const bLu = gelenk('bLu', bLo.el, 0, 50, P0.bLu);   glied(bLu.el, 0, 0, 0, 44); schuh(bLu, -1);
    const bRo = gelenk('bRo', beine, 17, -98, P0.bRo);  glied(bRo.el, 0, 0, 0, 50);
    const bRu = gelenk('bRu', bRo.el, 0, 50, P0.bRu);   glied(bRu.el, 0, 0, 0, 44); schuh(bRu, 1);
    // Arme (Schulter y = -172, unter dem Gewand ansetzend)
    const aLo = gelenk('aLo', koerper, -30, -172, P0.aLo); glied(aLo.el, 0, 0, 0, 62);
    const aLu = gelenk('aLu', aLo.el, 0, 62, P0.aLu);      glied(aLu.el, 0, 0, 0, 58); handschuh(aLu, 58);
    const aRo = gelenk('aRo', koerper, 30, -172, P0.aRo);  glied(aRo.el, 0, 0, 0, 62);
    const aRu = gelenk('aRu', aRo.el, 0, 62, P0.aRu);      glied(aRu.el, 0, 0, 0, 58); handschuh(aRu, 58);
    // Gewand: schlichte Tunika mit ausgefranstem Saum und Flicken
    const tun = g(koerper);
    M.svg('path', { d: 'M-40 -184 Q0 -194 40 -184 L54 -96 l-10 12 l-10 -10 l-12 12 l-12 -12 l-12 12 l-12 -12 l-12 12 l-10 -10 l-10 10 Z', fill: 'url(#sk-t-' + kleid.slice(1) + ')', stroke: STRICH, 'stroke-width': 5, 'stroke-linejoin': 'round' }, tun);
    // Falten und Randlicht rechts (Licht von rechts oben)
    M.svg('path', { d: 'M-18 -178 q6 40 -4 74 M8 -176 q8 36 2 70 M26 -172 q4 30 -2 62', fill: 'none', stroke: 'rgba(0,0,0,.22)', 'stroke-width': 3, 'stroke-linecap': 'round' }, tun);
    M.svg('path', { d: 'M35 -176 L47 -100', fill: 'none', stroke: licht, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .6 }, tun);
    M.svg('ellipse', { cx: 0, cy: -184, rx: 44, ry: 11, fill: 'rgba(20,12,6,.28)' }, tun);   // Kinnschatten auf dem Gewand
    M.svg('rect', { x: -26, y: -150, width: 28, height: 26, rx: 4, fill: flicken, stroke: STRICH, 'stroke-width': 3.5, transform: 'rotate(-6 -12 -137)' }, tun);
    M.svg('path', { d: 'M-22 -146 h20 M-22 -138 h20 M-22 -130 h20', stroke: STRICH, 'stroke-width': 2, 'stroke-dasharray': '4 3', fill: 'none', opacity: .7, transform: 'rotate(-6 -12 -137)' }, tun);
    M.svg('circle', { cx: 22, cy: -118, r: 14, fill: flicken, stroke: STRICH, 'stroke-width': 3.5 }, tun);
    M.svg('path', { d: 'M12 -118 h20 M22 -128 v20', stroke: STRICH, 'stroke-width': 2, 'stroke-dasharray': '4 3', fill: 'none', opacity: .7 }, tun);
    // Kopf (gross, rund, doppelt gezogene Kontur wie gekritzelt)
    const kopf = g(koerper), HY = -245;
    M.svg('circle', { cx: 2, cy: HY - 1, r: 59, fill: 'none', stroke: STRICH, 'stroke-width': 2.5, opacity: .55 }, kopf);
    M.svg('circle', { cx: 0, cy: HY, r: 58, fill: 'url(#sk-kopf)', stroke: STRICH, 'stroke-width': 6 }, kopf);
    M.svg('path', { d: `M-40 ${HY + 40} A58 58 0 0 0 20 ${HY + 56}`, fill: 'none', stroke: 'rgba(70,55,35,.18)', 'stroke-width': 9, 'stroke-linecap': 'round' }, kopf);      // Eigenschatten unten links
    M.svg('path', { d: `M18 ${HY - 53} A55 55 0 0 1 52 ${HY - 14}`, fill: 'none', stroke: licht, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 }, kopf);   // Randlicht oben rechts
    // wildes Haar: Striche vom Scheitel nach aussen (Zufall mit festem Seed → bei jedem Lauf gleich)
    const rz = M.rnd(o.haarSeed || 21), haar = g(kopf);
    for (let i = 0; i < 21; i++) {
      const w = (-158 + i * (136 / 20) + (rz() - .5) * 6) * Math.PI / 180, r0 = 54, len = 16 + rz() * rz() * 52 + (i % 4 === 0 ? 22 : 0), kr = (rz() - .5) * 34;
      const x0 = Math.cos(w) * r0, y0 = HY + Math.sin(w) * r0, x1 = Math.cos(w + kr / 160) * (r0 + len), y1 = HY + Math.sin(w + kr / 160) * (r0 + len);
      M.svg('path', { d: `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${((x0 + x1) / 2 + kr).toFixed(1)} ${((y0 + y1) / 2 - kr / 2).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, fill: 'none', stroke: HAAR, 'stroke-width': (4.2 + rz() * 3).toFixed(1), 'stroke-linecap': 'round' }, haar);
    }
    for (let i = 0; i < 5; i++) {   // ein paar Strähnen über die Stirn
      const x0 = -34 + i * 17 + (rz() - .5) * 6;
      M.svg('path', { d: `M${x0.toFixed(1)} ${HY - 54} q${(rz() * 10 - 5).toFixed(1)} 12 ${(rz() * 14 - 7).toFixed(1)} ${(22 + rz() * 12).toFixed(1)}`, fill: 'none', stroke: HAAR, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, haar);
    }
    // Augen: offen (Punkte) oder froh (geschlossene Bögen), blinzeln alle 3.4 s
    const augenOffen = g(kopf);
    M.svg('ellipse', { cx: -21, cy: HY - 2, rx: 4.6, ry: 6.4, fill: STRICH }, augenOffen);
    M.svg('ellipse', { cx: 21, cy: HY - 2, rx: 4.6, ry: 6.4, fill: STRICH }, augenOffen);
    augenOffen.style.transformBox = 'fill-box'; augenOffen.style.transformOrigin = '50% 50%';
    M.at(augenOffen, [{ transform: 'scaleY(1)', offset: 0 }, { transform: 'scaleY(1)', offset: .92 }, { transform: 'scaleY(.08)', offset: .955 }, { transform: 'scaleY(1)', offset: 1 }], { t: 0, d: 3.4, n: Infinity, ease: M.EASE.linear, fill: 'forwards' });
    const augenFroh = M.svg('path', { d: `M-31 ${HY} q10 -12 20 0 M11 ${HY} q10 -12 20 0`, fill: 'none', stroke: STRICH, 'stroke-width': 5, 'stroke-linecap': 'round' }, kopf);
    const augCur = { offen: 1, froh: 0 };
    augenOffen.style.opacity = 1; augenFroh.style.opacity = 0;
    const brauVar = {
      ruhig: M.svg('path', { d: `M-34 ${HY - 22} q11 -7 22 -2 M12 ${HY - 24} q11 -5 22 2`, fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf),
      sorge: M.svg('path', { d: `M-34 ${HY - 17} l22 -11 M34 ${HY - 17} l-22 -11`, fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf)
    };
    const brauCur = { ruhig: 1, sorge: 0 };
    Object.keys(brauVar).forEach((k) => { brauVar[k].style.opacity = brauCur[k]; });
    const mundVar = {
      ruhig: M.svg('path', { d: `M-14 ${HY + 24} q14 7 28 0`, fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf),
      lachen: M.svg('path', { d: `M-19 ${HY + 20} q19 26 38 0 z`, fill: '#fff', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, kopf),
      sorge: M.svg('path', { d: `M-13 ${HY + 30} q13 -11 26 0`, fill: 'none', stroke: STRICH, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, kopf)
    };
    const mundCur = { ruhig: 1, lachen: 0, sorge: 0 };
    Object.keys(mundVar).forEach((k) => { mundVar[k].style.opacity = mundCur[k]; });

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
    // Atmen: Oberkörper hebt und senkt sich leicht (Perioden 2.4 s, endlos)
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
      /* Gehen auf der Stelle oder mit Verschiebung dx/dy (Einheiten der Figur, vor Skalierung durch s) */
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
      /* Gesicht wechseln: 'lachen' zeigt geschlossene frohe Augen, 'sorge' schräge Brauen */
      mund: function (t, name) {
        ordnung(t, 'mund'); if (!mundVar[name]) throw new Error('Stickman.mund: unbekannt ' + name);
        const fade = (el, von, ziel) => M.at(el, [{ opacity: von }, { opacity: ziel }], { t: t, d: .08, ease: M.EASE.linear, fill: 'forwards' });
        Object.keys(mundVar).forEach((k) => { const ziel = k === name ? 1 : 0; fade(mundVar[k], mundCur[k], ziel); mundCur[k] = ziel; });
        const bz = name === 'sorge' ? 'sorge' : 'ruhig';
        Object.keys(brauVar).forEach((k) => { const ziel = k === bz ? 1 : 0; fade(brauVar[k], brauCur[k], ziel); brauCur[k] = ziel; });
        const froh = name === 'lachen' ? 1 : 0;
        fade(augenFroh, augCur.froh, froh); fade(augenOffen, augCur.offen, 1 - froh); augCur.froh = froh; augCur.offen = 1 - froh;
        letzterMund = t; return api;
      },
      /* kleine Hüpfer (Freude) */
      huepfen: function (t, d) {
        ordnung(t, 'huepfen'); const n = Math.max(1, Math.round(d / .5));
        M.at(mover, [{ transform: `translate(${posX}px,${posY}px)` }, { transform: `translate(${posX}px,${posY - 30}px)` }, { transform: `translate(${posX}px,${posY}px)` }],
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
