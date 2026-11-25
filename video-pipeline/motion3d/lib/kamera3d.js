// kamera3d.js — Kamera als reine Funktion der Zeit: Einstellungen mit Schlüsseln, weiche Fahrten, Handkamera-Rauschen, harte Schnitte.
// Aufbau: einstellungen = [{ t0, t1, ease, shake, keys: [{ u, p:[x,y,z], z:[x,y,z], fov, roll }] }]  (u von 0 bis 1 innerhalb der Einstellung)
const glatt = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const sanft = (x) => { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 2.2); };   // schnell an, langsam aus (Kran)
const lerp = (a, b, w) => a + (b - a) * w;
const lerp3 = (a, b, w) => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)];
const EASES = { glatt, sanft, linear: (x) => Math.min(1, Math.max(0, x)) };

export function kamera(einstellungen) {
  const liste = [...einstellungen].sort((a, b) => a.t0 - b.t0);
  return {
    /** Liefert { p, z, fov, roll, nr } für die Zeit t (Sekunden). */
    bei(t) {
      let nr = liste.findIndex((e) => t >= e.t0 && t < e.t1); if (nr < 0) nr = t < liste[0].t0 ? 0 : liste.length - 1;
      const e = liste[nr], u = Math.min(1, Math.max(0, (t - e.t0) / (e.t1 - e.t0)));
      const k = e.keys; let i = 0; while (i < k.length - 2 && u >= k[i + 1].u) i++;
      const a = k[i], b = k[i + 1] || k[i], w = b.u > a.u ? (EASES[e.ease || 'glatt'])((u - a.u) / (b.u - a.u)) : 0;
      const p = lerp3(a.p, b.p, w), z = lerp3(a.z, b.z, w), fov = lerp(a.fov ?? 35, b.fov ?? 35, w), roll = lerp(a.roll ?? 0, b.roll ?? 0, w);
      // Handkamera: ein paar langsame, nicht ganz harmonische Schwingungen (Position, Blickpunkt, leichte Rollbewegung)
      const s = e.shake ?? 0.012, q = t * 1.0;
      const rx = Math.sin(q * 1.37 + 0.6) + 0.6 * Math.sin(q * 2.91 + 2.0), ry = Math.sin(q * 1.13 + 1.9) + 0.6 * Math.sin(q * 3.37 + 0.4), rz = Math.sin(q * 0.97 + 4.1) + 0.5 * Math.sin(q * 2.53 + 1.1);
      return { nr, u, fov, roll: roll + s * 0.5 * Math.sin(q * 0.8 + 3.0), p: [p[0] + s * rx * 4, p[1] + s * ry * 3, p[2] + s * rz * 4], z: [z[0] + s * ry * 3, z[1] + s * rx * 2, z[2] + s * rz * 3] };
    }
  };
}
