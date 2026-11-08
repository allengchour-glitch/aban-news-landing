// Aus den Teilpixel-Verschiebungen (fein_<ERG>.json) die wirksame Druckfläche je Modell rechnen (Hypothese: lineare Abbildung Editor -> Printful).
// Vorlage (GET /templates, in 3000-px-Vorlagenpixeln): 71 = 1006/530/1010x1346, 586 = 958/473/1074x1432, 456 = 930/409/1140x1520.
import { readFileSync, writeFileSync } from 'node:fs';
const HIER = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/v62/pixel/';
const ERG = process.env.ERG || 'ergebnis2';
const f = JSON.parse(readFileSync(HIER + `fein_${ERG}.json`, 'utf8'));
const k = 800 / 3000;
const V = { 71: { L: 1006, T: 530, W: 1010, H: 1346, top: 's71t', low: 's71l' }, 586: { L: 958, T: 473, W: 1074, H: 1432, top: 's586t', low: 's586l' }, 456: { L: 930, T: 409, W: 1140, H: 1520, top: 's456t', low: 's456l' } };
const aus = {};
for (const [m, v] of Object.entries(V)) {
  const a = f[v.top], b = f[v.low];
  const c1 = a.mitte[1], c2 = b.mitte[1], d1 = a.nurVerschiebung.dy, d2 = b.nurVerschiebung.dy;
  const sl = (d2 - d1) / (c2 - c1);              // Steigung: Massstabsfehler senkrecht
  const A = 1 + sl, B = d1 - sl * c1;            // y_printful = A * y_editor + B
  const Tn = A * v.T + B / k, Hn = A * v.H;
  const s = (a.mitMassstab.s + b.mitMassstab.s) / 2, dx = (a.mitMassstab.dx + b.mitMassstab.dx) / 2, cx = (a.mitte[0] + b.mitte[0]) / 2;
  const Wn = s * v.W, Ln = s * v.L + ((1 - s) * cx + dx) / k;
  const mm = (px, ref) => px / ref * 25.4 * (ref === v.W ? 12 : 16);   // Vorlagenpixel -> mm (Druckfläche 12 x 16 Zoll = W x H Vorlagenpixel)
  aus[m] = { vorlage: [v.L, v.T, v.W, v.H], wirksam: [Ln, Tn, Wn, Hn].map((x) => Math.round(x * 10) / 10), dT: Tn - v.T, dH: Hn - v.H, dW: Wn - v.W, dL: Ln - v.L,
    verschiebung_mockup_px: { oben: d1, unten: d2, dx }, steigung_senkrecht: sl, s_waagrecht: s,
    mm_oben: Math.round(mm(Tn - v.T, v.H) * 10) / 10, mm_hoehe_gesamt: Math.round(mm(Hn - v.H, v.H) * 10) / 10, mm_breite_gesamt: Math.round(mm(Wn - v.W, v.W) * 10) / 10 };
  console.log(m, JSON.stringify(aus[m]));
}
writeFileSync(HIER + `korrektur_${ERG}.json`, JSON.stringify(aus, null, 1));
