/* motion.js — winziger Helfer für zeitgesteuerte Szenen (Web Animations API).
 *
 * Idee: Jede Bewegung bekommt eine ABSOLUTE Startzeit t (Sekunden) und Dauer d.
 * Der Renderer (render.mjs) pausiert danach alle Animationen und setzt pro Bild
 * currentTime = Zeit. So ist jedes Bild exakt reproduzierbar (kein Echtzeit-Ruckeln).
 *
 * Regeln fürs Schreiben von Szenen:
 *  - Alles, was sich bewegt, läuft über M.at / M.stagger / M.loop (nie setTimeout, nie requestAnimationFrame).
 *  - fill:'both' ist eingebaut: vor dem Start gilt der erste, nach dem Ende der letzte Keyframe.
 *  - Am Ende die Gesamtdauer melden: M.fertig(35)
 */
(function () {
  const EASE = {
    out: 'cubic-bezier(.22,1,.36,1)',      // schnell los, weich aus: Standard für Einblenden
    inOut: 'cubic-bezier(.65,0,.35,1)',    // weich an und ab: Kamerafahrten, Sonnenlauf
    back: 'cubic-bezier(.34,1.56,.64,1)',  // Überschwingen: «Pop», wachsende Dinge
    linear: 'linear'
  };

  // Seed-Zufall, damit «zufällige» Positionen bei jedem Lauf gleich sind
  function rnd(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(id) { return typeof id === 'string' ? document.querySelector(id) : id; }

  // Eine Animation: Keyframes ab Sekunde t über d Sekunden.
  // Optionen: t, d, ease, n (Wiederholungen), fill (Vorgabe 'both'), whole (Easing über die GANZE Kette statt je Abschnitt).
  // FALLE: Zwei Animationen auf derselben Eigenschaft: die spätere bekommt fill:'forwards', sonst überschreibt ihr
  // «backwards»-Füllwert die frühere schon vor ihrem eigenen Start.
  // Bei mehr als 2 Keyframes gilt das Easing je Abschnitt (wie in Animationsprogrammen), ausser whole:true.
  function at(target, keyframes, o) {
    const e = el(target);
    if (!e) throw new Error('Motion.at: Element nicht gefunden: ' + target);
    const ease = o.ease || EASE.out;
    const seg = keyframes.length > 2 && !o.whole;
    const kfs = seg ? keyframes.map(function (k) { return k.easing ? k : Object.assign({}, k, { easing: ease }); }) : keyframes;
    const anim = e.animate(kfs, {
      delay: Math.round((o.t || 0) * 1000),
      duration: Math.max(1, Math.round((o.d || 1) * 1000)),
      easing: seg ? 'linear' : ease,
      fill: o.fill || 'both',
      iterations: o.n || 1
    });
    // Beendete Animationen darf der Browser sonst als «ersetzt» entfernen; dann liesse sich die Zeit nicht mehr zurückspulen
    // und ein Bild hinge von der Reihenfolge der Aufrufe ab. persist() verhindert das.
    if (anim.persist) anim.persist();
    return anim;
  }

  // Staffelung: gleiche Bewegung, jedes Element gap Sekunden später
  function stagger(targets, keyframes, o) {
    const list = typeof targets === 'string' ? Array.from(document.querySelectorAll(targets)) : Array.from(targets);
    return list.map(function (e, i) { return at(e, keyframes, Object.assign({}, o, { t: (o.t || 0) + i * (o.gap || 0.1) })); });
  }

  // Endlosbewegung (Wippen, Wolken) — der Renderer setzt auch hier currentTime, bleibt deterministisch
  function loop(target, keyframes, o) {
    return at(target, keyframes, Object.assign({ fill: 'forwards' }, o, { n: (o && o.n) || Infinity, ease: (o && o.ease) || EASE.inOut }));
  }

  // Ein- und Ausblenden in einem Aufruf: sichtbar von t0 bis t1
  function fenster(target, t0, t1, fade) {
    fade = fade || 0.6;
    return at(target, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: fade / (t1 - t0) },
      { opacity: 1, offset: 1 - fade / (t1 - t0) }, { opacity: 0, offset: 1 }], { t: t0, d: t1 - t0, ease: EASE.linear });
  }

  // SVG-Element bauen
  function svg(tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  // Pfad «zeichnen»: nutzt stroke-dasharray/-offset
  function zeichnen(path, o) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    return at(path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], o);
  }

  function fertig(sekunden) { window.__duration = sekunden; window.__fertig = true; }

  window.Motion = { EASE: EASE, rnd: rnd, at: at, stagger: stagger, loop: loop, fenster: fenster, svg: svg, zeichnen: zeichnen, fertig: fertig };
})();
