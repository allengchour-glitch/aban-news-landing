// Tests für die französischen Menü-/Sammlungstitel (reine Logik, kein Netz).
import { planTitel, woerterbuchLaden } from './apply_titel.mjs';
let ok = 0, bad = 0;
const t = (n, c) => { if (c) ok++; else { bad++; console.log('FEHLT:', n); } };

const W = { Uhren: 'Montres', Hunde: 'Chiens' };
const res = [
  { resourceId: 'a', translatableContent: [{ key: 'title', value: 'Uhren', digest: 'd1' }], translations: [] },
  { resourceId: 'b', translatableContent: [{ key: 'title', value: 'Hunde', digest: 'd2' }], translations: [{ key: 'title', value: 'Chiens!' }] },
  { resourceId: 'c', translatableContent: [{ key: 'title', value: 'Unbekannt', digest: 'd3' }], translations: [] },
  { resourceId: 'd', translatableContent: [{ key: 'handle', value: 'x', digest: 'd4' }], translations: [] },
];
const p = planTitel(res, W);
t('ein Eintrag im Plan', p.plan.length === 1 && p.plan[0].id === 'a' && p.plan[0].fr === 'Montres' && p.plan[0].digest === 'd1');
t('vorhandene Übersetzung wird nie überschrieben', p.schonFr === 1 && !p.plan.some((x) => x.id === 'b'));
t('fehlender Wörterbuch-Eintrag wird gemeldet', p.ohneEintrag.length === 1 && p.ohneEintrag[0][0] === 'Unbekannt');
t('Ressource ohne Titel wird gezählt', p.ohneTitel === 1);
t('leere französische Übersetzung zählt als fehlend', planTitel([{ resourceId: 'e', translatableContent: [{ key: 'title', value: 'Uhren', digest: 'x' }], translations: [{ key: 'title', value: '' }] }], W).plan.length === 1);

const WB = await woerterbuchLaden();
const eintraege = Object.entries(WB);
t('Wörterbuch hat mindestens 670 Einträge', eintraege.length >= 670);
// Titel, die im Französischen genauso heissen (Fremdwörter, Eigennamen, Jahreszahlen)
const gleichErlaubt = new Set(['Jeans', 'Shorts', 'Gaming & VR', 'Diamond Painting', 'Camping', 'Waagen', 'Capes & Ponchos', 'Skateschuhe', 'Blazer', 'Halloween 2026', 'Black Friday & Cyber Week', 'Audio', 'Yoga', 'Fitness', 'Loungewear', 'Puzzles', 'PlayStation (PS4/PS5)', 'Nintendo & Switch', 'Halloween', 'Black Friday', 'Cardigans', 'Headsets', 'Mascara', 'Woks']);
const DEUTSCH = /\b(und|der|die|das|für|mit|bei|nicht|auch|oder|ein|eine)\b/i;
for (const [de, fr] of eintraege) {
  if (!fr || !fr.trim()) { t(`leer: ${de}`, false); continue; }
  if (fr === de && !gleichErlaubt.has(de)) t(`unverändert: ${de}`, false);
  if (DEUTSCH.test(fr)) t(`deutsches Wort in «${fr}»`, false);
  if (/[äöüß]/.test(fr)) t(`Umlaut/ß in «${fr}»`, false);
  if (fr !== fr.trim() || /\s{2,}/.test(fr)) t(`Leerzeichen in «${fr}»`, false);
  if (/&amp;|<|>/.test(fr)) t(`HTML in «${fr}»`, false);
  const emojiDe = (de.match(/\p{Extended_Pictographic}/gu) || []).length, emojiFr = (fr.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (emojiDe !== emojiFr) t(`Emoji ungleich: ${de}`, false);
  if ((de.match(/&/g) || []).length !== (fr.match(/&/g) || []).length && !/ & /.test(de + fr)) t(`&-Zahl ungleich: ${de}`, false);
}
console.log(`${ok} Prüfungen bestanden${bad ? `, ${bad} FEHLGESCHLAGEN` : ''}`);
process.exit(bad ? 1 : 0);
