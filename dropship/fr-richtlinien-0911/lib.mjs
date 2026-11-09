// Französische Fassung der Shop-Richtlinien: reine Logik (ohne Netz), vom Lauf und vom Test benutzt.
// Methode: Die deutsche Richtlinie wird in ihre Textblöcke (h2, h3, p, li) zerlegt; jeder Block bekommt seinen
// französischen Inhalt. Das Gerüst (Block-Tags, Attribute, Leerraum, ol/ul) bleibt unverändert deutsch/gleich.
// Jeder Eintrag trägt einen Anker (Textanfang des deutschen Blocks): so fällt eine Verschiebung sofort auf.

/** Zerlegt HTML in Textblöcke. Jeder Block: { voll, open, inner, close, start, end }. */
export function bloecke(html) {
  const re = /(<(h2|h3|p|li)\b[^>]*>)([\s\S]*?)(<\/\2>)/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push({ voll: m[0], open: m[1], tag: m[2], inner: m[3], close: m[4], start: m.index, end: m.index + m[0].length });
  return out;
}

/** Reiner Text eines Blocks (ohne Tags, ohne Entitäten für geschütztes Leerzeichen, Leerraum zusammengefasst). */
export function textOhneTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Setzt die französischen Blöcke in das deutsche Gerüst ein. eintraege: [{ a: Anker, fr: Inhalt }] in Blockreihenfolge. */
export function uebersetzeBody(de, eintraege) {
  const bl = bloecke(de);
  const probleme = [];
  if (bl.length !== eintraege.length) probleme.push({ art: 'anzahl', de: bl.length, fr: eintraege.length });
  let out = '';
  let pos = 0;
  bl.forEach((b, i) => {
    out += de.slice(pos, b.start);
    pos = b.end;
    const e = eintraege[i];
    if (!e || typeof e.fr !== 'string' || !e.fr.trim()) { probleme.push({ art: 'ohne-uebersetzung', i }); out += b.voll; return; }
    const t = textOhneTags(b.inner);
    if (!t.startsWith(e.a)) probleme.push({ art: 'anker', i, erwartet: e.a, ist: t.slice(0, 50) });
    const lead = b.inner.match(/^\s*/)[0];
    const trail = b.inner.slice(lead.length).match(/\s*$/)[0];
    out += b.open + lead + e.fr.trim() + trail + b.close;
  });
  out += de.slice(pos);
  return { out, probleme };
}

/** Die Tags eines Blocks (Namen und Attribute) in Reihenfolge. */
export function inlineTags(inner) {
  return [...inner.matchAll(/<[^>]+>/g)].map((m) => m[0].replace(/\s+/g, ' '));
}

/** Erwarteter französischer Tag zu einem deutschen: interne Links bekommen /fr vorangestellt. */
export function erwartetFr(tag) {
  return tag.replace(/href="\/(policies|pages|collections|products)\//g, 'href="/fr/$1/');
}

function ziffern(html) {
  return (textOhneTags(html).match(/\d+/g) || []).sort();
}

/** Deutsche Wörter, die in einem französischen Text nichts verloren haben (Rest-Prüfung). */
const DEUTSCH = /\b(und|der|die|das|ist|nicht|für|mit|bei|wir|dein|deine|deinen|deiner|ein|eine|auf|oder|wenn|dir|dich|ihr|euch|sind|wird|werden|kann|kannst|noch|nur|auch|aber|bitte|Werktage|Rückgabe|Versand|Lieferung|Artikel|Bestellung|Tagen|Erhalt)\b/;
export function restDeutsch(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  const treffer = [];
  for (const zeile of text.split(/(?<=[.!?:;])\s+|\s{2,}/)) {
    const m = zeile.match(DEUTSCH);
    if (m) treffer.push(zeile.trim().slice(0, 90) + '  ← ' + m[1]);
  }
  return treffer;
}

/** Prüft die französische Fassung gegen das deutsche Original. Leere Liste = in Ordnung. */
export function pruefe(de, fr) {
  const f = [];
  const a = bloecke(de), b = bloecke(fr);
  if (a.length !== b.length) { f.push(`Blockzahl ${a.length} gegen ${b.length}`); return f; }
  // Gerüst: alles ausserhalb der Blockinhalte muss gleich sein
  const geruest = (h) => h.replace(/(<(h2|h3|p|li)\b[^>]*>)([\s\S]*?)(<\/\2>)/g, '$1§$4');
  if (geruest(de) !== geruest(fr)) f.push('Gerüst (Block-Tags, Attribute, Leerraum ausserhalb der Blöcke) weicht ab');
  a.forEach((x, i) => {
    // Tags im Block: gleiche Folge, interne Links mit /fr
    const ta = inlineTags(x.inner).map(erwartetFr);
    const tb = inlineTags(b[i].inner);
    if (JSON.stringify(ta) !== JSON.stringify(tb)) f.push(`Block ${i}: Tag-Folge weicht ab (${ta.join('')} gegen ${tb.join('')})`.slice(0, 220));
  });
  const za = ziffern(de), zb = ziffern(fr);
  if (JSON.stringify(za) !== JSON.stringify(zb)) f.push(`Zahlen weichen ab: ${za.filter((z, i) => z !== zb[i]).slice(0, 5).join(',')} gegen ${zb.filter((z, i) => z !== za[i]).slice(0, 5).join(',')}`);
  const rest = restDeutsch(fr);
  if (rest.length) f.push(`Deutsch im französischen Text: ${rest.slice(0, 3).join(' | ')}`);
  if (/\b7\s*(jours|Tage)/.test(fr)) f.push('Eine 7-Tage-Frist steht noch im Text');
  for (const m of fr.matchAll(/href="(\/[^"]*)"/g)) if (/^\/(policies|pages|collections|products)\//.test(m[1])) f.push(`Interner Link ohne /fr: ${m[1]}`);
  return f;
}
