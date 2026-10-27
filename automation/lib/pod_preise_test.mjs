// Tests für die Preisregel der «Selbst gestalten»-Varianten (kein Netz). Lauf: /opt/node22/bin/node automation/lib/pod_preise_test.mjs
// Jedes Beispiel ist unten VON HAND gerechnet (in Rappen); die Zahlen stehen in den Kommentaren, nicht aus dem Code abgeleitet.
import { REGEL, endpreis, nettoBeiPreis, usdZuRp, richtwertRp, erloesRp, gebuehrRp, nettoRp } from './pod_preise.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wirft = (n, f, teil) => { let m = ''; try { f(); } catch (e) { m = String(e.message); } ist(n, m.includes(teil), true); };
const kurz = (r) => [r.ok, r.preisChf, r.nettoChf, r.bindend];

// ── Bausteine
ist('Konstanten der Regel', [REGEL.usdChf, REGEL.faktor, REGEL.aufschlagFix, REGEL.nettoMin, REGEL.gebuehrProzent, REGEL.gebuehrFix, REGEL.kundenVersand, REGEL.gratisAb, REGEL.maxPreis],
  [0.90, 2.3, 12, 12, 0.034, 0.30, 7, 50, 149.90]);
ist('USD → Rappen: 13.53 × 0.90 = 12.177 → 1218', usdZuRp(13.53), 1218);
ist('USD → Rappen: 11.44 × 0.90 = 10.296 → 1030', usdZuRp(11.44), 1030);
ist('USD → Rappen: 8.00 × 0.90 = 7.20 → 720', usdZuRp(8), 720);
ist('USD → Rappen: 0 Versand ist erlaubt', usdZuRp(0), 0);
ist('Richtwert 720 Rp: max(720×2.3 = 1656, 720+1200 = 1920) = 1920', richtwertRp(720), 1920);
ist('Richtwert 2200 Rp: max(5060, 3400) = 5060', richtwertRp(2200), 5060);
ist('Erlös unter der Schwelle: 4990 + 700', erloesRp(4990), 5690);
ist('Erlös ab der Schwelle: 5000 → kein Versandbeitrag', erloesRp(5000), 5000);
ist('Erlös knapp darunter: 4990 → mit Versandbeitrag', erloesRp(4990) > erloesRp(5090), true);
ist('Gebühr auf 3590 Rp: round(122.06) + 30 = 152', gebuehrRp(3590), 152);
ist('Gebühr auf 2690 Rp: round(91.46) + 30 = 121', gebuehrRp(2690), 121);
ist('Netto bei Preis 2890, Einkauf 1218, Versand 900: 3590 − 152 − 1218 − 900 = 1320', nettoRp(2890, 1218, 900), 1320);

// ── Sechs von Hand gerechnete Endpreise
// 1) Poster Glanz 30×40 (Printful 6875): Einkauf 13.53 USD → 1218 Rp, Versand 10.00 USD → 900 Rp.
//    Richtwert = max(2801.4, 2418) = 2801.4 → erster X.90 darüber: 2890. Erlös 3590, Gebühr 152, Netto 3590−152−1218−900 = 1320 ≥ 1200 → 28.90.
ist('Beispiel 1: Richtwert bindet', kurz(endpreis({ einkaufUsd: 13.53, versandUsd: 10 })), [true, 28.90, 13.20, 'richtwert']);
// 2) Billiges Teil, teurer Versand: Einkauf 8.00 → 720, Versand 11.00 → 990. Richtwert = max(1656, 1920) = 1920 → 1990.
//    Netto: 1990: 2690−121−720−990 = 859 ✗ · 2090: 2790−125−1710 = 955 ✗ · 2190: 2890−128−1710 = 1052 ✗ · 2290: 2990−132−1710 = 1148 ✗
//    2390: Erlös 3090, Gebühr round(105.06)+30 = 135, Netto 3090−135−1710 = 1245 ≥ 1200 → 23.90 (der Nettogewinn hebt den Preis an).
ist('Beispiel 2: der Mindest-Nettogewinn bindet', kurz(endpreis({ einkaufUsd: 8, versandUsd: 11 })), [true, 23.90, 12.45, 'netto']);
// 3) Gildan 5000 S (Printful 11576): Einkauf 9.44 → 850, Versand 10.50 → 945. Richtwert max(1955, 2050) = 2050 → 2090 (Netto 870 ✗), 2190 (967 ✗),
//    2290 (1063 ✗), 2390 (1160 ✗), 2490: Erlös 3190, Gebühr round(108.46)+30 = 138, Netto 3190−138−850−945 = 1257 → 24.90.
ist('Beispiel 3: T-Shirt, vier Stufen höher als der Richtwert', kurz(endpreis({ einkaufUsd: 9.44, versandUsd: 10.5 })), [true, 24.90, 12.57, 'netto']);
// 4) Schwelle 50: Einkauf 24.44 → 2200, Versand 11.11 → 1000. Richtwert 5060 > 4990 → 5090. Ab 50 kein Versandbeitrag: Erlös 5090,
//    Gebühr round(173.06)+30 = 203, Netto 5090−203−2200−1000 = 1687 → 50.90.
ist('Beispiel 4: Richtwert knapp über der Gratisversand-Schwelle', kurz(endpreis({ einkaufUsd: 24.44, versandUsd: 11.11 })), [true, 50.90, 16.87, 'richtwert']);
// 5) Knapp unter der Schwelle: Einkauf 23.89 → 2150, Versand 11.11 → 1000. Richtwert 4945 → 4990. Erlös 4990+700 = 5690, Gebühr round(193.46)+30 = 223,
//    Netto 5690−223−2150−1000 = 2317 → 49.90 (der Kunde zahlt hier 7 Versand obendrauf).
ist('Beispiel 5: 49.90 mit Versandbeitrag', kurz(endpreis({ einkaufUsd: 23.89, versandUsd: 11.11 })), [true, 49.90, 23.17, 'richtwert']);
// 6) Richtwert genau 21.00 (Einkauf 10.00 USD → 900 Rp, Faktor-Weg 2070, Fix-Weg 2100): der alte Weg ceil(21)−0.10 ergäbe 20.90 UNTER dem Richtwert.
//    Hier: 2190. Versand 5.00 → 450: Erlös 2890, Gebühr 98+30 = 128, Netto 2890−128−900−450 = 1412 → 21.90.
ist('Beispiel 6: Richtwert 21.00 → 21.90 (printful_reprice würde 20.90 setzen)', kurz(endpreis({ einkaufUsd: 10, versandUsd: 5 })), [true, 21.90, 14.12, 'richtwert']);
// 7) Versand 0 ist zulässig (z. B. Printful liefert 0): Einkauf 10.00 → 900, Versand 0: Netto bei 2190 = 2890−128−900 = 1862.
ist('Beispiel 7: Versand 0', kurz(endpreis({ einkaufUsd: 10, versandUsd: 0 })), [true, 21.90, 18.62, 'richtwert']);
// 8) Leinwand 28×40 Zoll (Printful 19321): Einkauf 68.34 → round(6150.6) = 6151, Versand 57.00 → 5130. Richtwert 6151×2.3 = 14147.3 → 14190.
//    Erlös 14190 (kein Beitrag), Gebühr round(482.46)+30 = 512, Netto 14190−512−6151−5130 = 2397 → 141.90 ≤ 149.90.
ist('Beispiel 8: grosse Leinwand bleibt knapp unter der Grenze', kurz(endpreis({ einkaufUsd: 68.34, versandUsd: 57 })), [true, 141.90, 23.97, 'richtwert']);
// 9) Über der Grenze: Einkauf 120 USD → 10800 Rp, Richtwert 24840 → kein Preis ≤ 14990.
{ const r = endpreis({ einkaufUsd: 120, versandUsd: 40 });
  ist('Beispiel 9: über 149.90 → keine Variante', [r.ok, r.preisChf, r.nettoChf, r.bindend, /149\.90/.test(r.grund)], [false, null, null, 'keiner', true]); }

// ── Der Preis endet immer auf .90 und die Regel gilt für ein ganzes Raster; die kleinere Stufe erfüllt sie nie (Minimalität), per Brute Force im Test
{
  let n = 0, schlecht = [];
  for (let ek = 4; ek <= 90; ek += 2.37) for (let vs = 0; vs <= 60; vs += 3.13) {
    const r = endpreis({ einkaufUsd: ek, versandUsd: vs });
    const e = Math.round(ek * 90 + 1e-9), v = Math.round(vs * 90 + 1e-9), rw = Math.max(e * 2.3, e + 1200);
    const erf = (pRp) => { const er = pRp + (pRp < 5000 ? 700 : 0); return pRp >= rw - 1e-9 && er - (Math.round(er * 0.034 + 1e-9) + 30) - e - v >= 1200; };
    let soll = null; for (let p = 90; p <= 14990; p += 100) if (erf(p)) { soll = p / 100; break; }
    n++;
    if (soll !== r.preisChf) schlecht.push([ek, vs, soll, r.preisChf]);
    if (r.ok && (Math.round(r.preisChf * 100) % 100 !== 90 || r.nettoChf < 12 || r.preisChf * 100 < rw - 1e-6)) schlecht.push(['Regel verletzt', ek, vs, r]);
  }
  ist(`Raster aus ${n} Kombinationen: Preis = kleinster X.90, der die Regel erfüllt`, schlecht.slice(0, 3), []);
}

// ── nettoBeiPreis (vorhandener Preis gegen die Regel): Hoodie S 38.90, Einkauf 19.17 USD → 1725 Rp, Versand 10.50 → 945
//    Erlös 3890+700 = 4590, Gebühr round(156.06)+30 = 186, Netto 4590−186−1725−945 = 1734
ist('Netto eines vorhandenen Preises', nettoBeiPreis({ preisChf: 38.90, einkaufUsd: 19.17, versandUsd: 10.5 }), 17.34);

// ── Eingaben
wirft('Einkauf 0 → Fehler', () => endpreis({ einkaufUsd: 0, versandUsd: 5 }), 'einkaufUsd');
wirft('Einkauf negativ → Fehler', () => endpreis({ einkaufUsd: -1, versandUsd: 5 }), 'einkaufUsd');
wirft('Versand fehlt → Fehler', () => endpreis({ einkaufUsd: 10 }), 'versandUsd');
wirft('Versand NaN → Fehler', () => endpreis({ einkaufUsd: 10, versandUsd: NaN }), 'versandUsd');
wirft('Einkauf als Text → Fehler', () => endpreis({ einkaufUsd: '10', versandUsd: 5 }), 'einkaufUsd');

// ── Eigene Regel (Parameter statt Konstanten): strengerer Nettogewinn hebt den Preis an
{
  const streng = { ...REGEL, nettoMin: 20 };
  const a = endpreis({ einkaufUsd: 13.53, versandUsd: 10 }), b = endpreis({ einkaufUsd: 13.53, versandUsd: 10 }, streng);
  ist('Netto-Mindestwert 20 statt 12 → höherer Preis', [b.preisChf > a.preisChf, b.nettoChf >= 20], [true, true]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
