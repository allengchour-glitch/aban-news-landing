// Schreibt herren-bekleidung_urteile.json: mein Urteil über die fest gezogene Stichprobe (herren-bekleidung_stichproben.json).
// falsch = Produkt gehört NICHT in diese Kategorie. grenzfaelle = zähle ich bewusst NICHT als falsch (Titel lässt beide Lesarten zu).
import fs from 'fs';
const st = JSON.parse(fs.readFileSync('herren-bekleidung_stichproben.json', 'utf8'));
const falsch = {};        // titel-Teilstring -> Grund (derzeit keiner in der endgültigen Stichprobe)
const grenz = {
  'herren-hemden': { 'Herren Langarmshirt mit Mandarin-Kragen': 'Langarmshirt mit Kragenwort: Hemd und Langarmshirt gleichermassen plausibel', 'Langarm-Shirt mit Revers für Herren': 'Shirt mit Kragenwort: Hemd und Langarmshirt gleichermassen plausibel', 'Kultur-Shirt': 'Titel nennt selbst Freizeit- UND Businesshemd' },
  'herren-t-shirts': { 'Herren-Strandshirt mit UV-Schutz und Kapuze': 'Strandshirt mit Kapuze: auch Hoodie denkbar', 'Herren Sommer-Hundet-Shirt Grössen': 'Titel unklar (Übersetzungsfehler), Warenart Shirt' },
  'herren-anzuege-sakkos': { 'Vintage-Blazer-Shirt': 'Blazer-Shirt: Blazer oder Hemd', 'Herren Wolljacke Zweireiher': 'Zweireiher-Jacke: Sakko oder Jacke' },
  'herren-pullover-strick': { 'Herren Baumwoll-Pullover T-Shirt mit Struktur': 'Titel nennt Pullover UND T-Shirt', 'Herren-Rollkragen-Shirt mit Kristallknopf': 'Rollkragen-Shirt: Pullover oder Shirt' },
  'herren-hoodies-sweatshirts': { 'Travel Airbag Hoodie für Herren': 'Hoodie mit Airbag-Funktion: Kleidungsstück mit Zusatznutzen, Warenart bleibt Hoodie' },
};
const out = {};
for (const [h, v] of Object.entries(st)) {
  const sel = v.stichprobe;
  const f = {}, g = {};
  for (const x of sel) {
    for (const [t, grund] of Object.entries(falsch[h] || {})) if (x.titel.includes(t)) f[x.handle] = grund;
    for (const [t, grund] of Object.entries(grenz[h] || {})) if (x.titel.includes(t)) g[x.handle] = grund;
  }
  out[h] = { treffer: v.treffer, geprueft: sel.length, stichprobe_handles: sel.map(x => x.handle), falsch: f, grenzfaelle: g };
}
fs.writeFileSync('herren-bekleidung_urteile.json', JSON.stringify(out, null, 1));
for (const [h, v] of Object.entries(out)) console.log(h, v.treffer, 'geprueft', v.geprueft, 'falsch', Object.keys(v.falsch).length, 'grenz', Object.keys(v.grenzfaelle).length);
