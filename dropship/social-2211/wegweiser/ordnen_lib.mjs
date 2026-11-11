// Reine Logik für ordnen.mjs (kein Netz, keine Dateien ausser dem Lesen der Pakete).
// Getrennt, damit die Attrappe sie ohne Shopify prüfen kann.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Datum in Schweizer Zeit als JJJJ-MM-TT.
export function tagInZuerich(d) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// Liest alle <ordner>/*/pack.json (eine Ebene tief, Ordner mit «_» am Anfang zählen nicht).
// Nur Pakete mit tag im Fenster [von, bis] zählen. Gibt Pakete und Hinweise zurück.
export function paketeLesen(fenster) {
  const pakete = [], hinweise = [];
  for (const f of fenster) {
    if (!existsSync(f.ordner)) { hinweise.push(`Ordner fehlt: ${f.ordner}`); continue; }
    const angelegt = new Set();
    const aj = join(f.ordner, 'angelegt.json');
    if (existsSync(aj)) {
      try { for (const e of JSON.parse(readFileSync(aj, 'utf8'))) if (e && e.status === 'angelegt' && e.handle) angelegt.add(e.handle); }
      catch { hinweise.push(`angelegt.json unlesbar: ${aj}`); }
    }
    for (const name of readdirSync(f.ordner).sort()) {
      if (name.startsWith('_') || name.startsWith('.')) continue;
      const dir = join(f.ordner, name);
      if (!statSync(dir).isDirectory()) continue;
      const pj = join(dir, 'pack.json');
      if (!existsSync(pj)) continue;
      let p;
      try { p = JSON.parse(readFileSync(pj, 'utf8')); } catch { hinweise.push(`pack.json unlesbar: ${pj}`); continue; }
      const tag = p.tag || (p.zeiten && Object.values(p.zeiten).map((z) => String(z).slice(0, 10)).sort()[0]);
      if (!tag || !p.handle) { hinweise.push(`pack.json ohne tag oder handle: ${pj}`); continue; }
      if (tag < f.von || tag > f.bis) { hinweise.push(`ausserhalb ${f.von} bis ${f.bis}: ${f.name}/${name} (tag ${tag})`); continue; }
      const zeiten = p.zeiten ? Object.values(p.zeiten).map((z) => Date.parse(z)).filter((x) => !Number.isNaN(x)) : [];
      pakete.push({
        quelle: `${f.name}/${name}`, tag, handle: p.handle, produkt_id: p.produkt_id || null,
        erste: zeiten.length ? Math.min(...zeiten) : Date.parse(tag + 'T00:00:00+01:00'),
        entwuerfe: angelegt.has(p.handle),
      });
    }
  }
  pakete.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : a.erste - b.erste || (a.handle < b.handle ? -1 : 1)));
  // Doppelte Handles: der früheste Termin gilt.
  const gesehen = new Set(), eindeutig = [];
  for (const p of pakete) {
    if (gesehen.has(p.handle)) { hinweise.push(`doppelt, späterer Termin übersprungen: ${p.quelle} (${p.tag})`); continue; }
    gesehen.add(p.handle); eindeutig.push(p);
  }
  return { pakete: eindeutig, hinweise };
}

// Soll-Reihenfolge: vorn die Liste `vorn` (IDs, schon sortiert), danach alle übrigen IDs in ihrer
// heutigen Reihenfolge. `aktuell` ist die frisch gelesene Reihenfolge.
export function sollBerechnen(aktuell, vorn) {
  const v = new Set(vorn);
  for (const id of vorn) if (!aktuell.includes(id)) throw new Error('vorn enthält ein Produkt, das nicht in der Sammlung steht: ' + id);
  if (v.size !== vorn.length) throw new Error('vorn enthält doppelte IDs');
  return [...vorn, ...aktuell.filter((id) => !v.has(id))];
}

// Wendet Züge an wie Shopify (Doku collectionReorderProducts, 2026): jeder Zug nacheinander,
// newPosition ist der nullbasierte Platz in der Liste zum Zeitpunkt des Zugs (Produkt erst
// herausnehmen, dann einfügen), ab der Länge der Liste kommt das Produkt ans Ende.
export function zuegeAnwenden(liste, zuege) {
  const l = [...liste];
  for (const z of zuege) {
    const i = l.indexOf(z.id);
    if (i < 0) throw new Error('Zug auf unbekanntes Produkt: ' + z.id);
    l.splice(i, 1);
    const p = Math.min(Number(z.newPosition), l.length);
    l.splice(p, 0, z.id);
  }
  return l;
}

// Längste aufsteigende Teilfolge (streng), gibt die Indizes in `seq` zurück.
function lisIndizes(seq) {
  const tails = [], tailIdx = [], prev = new Array(seq.length).fill(-1);
  for (let i = 0; i < seq.length; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < seq[i]) lo = m + 1; else hi = m; }
    tails[lo] = seq[i]; tailIdx[lo] = i; prev[i] = lo > 0 ? tailIdx[lo - 1] : -1;
  }
  const out = []; let k = tails.length ? tailIdx[tails.length - 1] : -1;
  while (k >= 0) { out.push(k); k = prev[k]; }
  return out.reverse();
}

// Nötige Züge von `aktuell` nach `soll` (gleiche Menge). Wer schon in richtiger Folge steht
// (längste gemeinsame Teilfolge), bleibt liegen; jedes andere Produkt kommt direkt hinter
// seinen Vorgänger im Soll. Anzahl Züge = n minus Länge der Teilfolge (das Minimum).
export function zuegeBerechnen(aktuell, soll) {
  if (aktuell.length !== soll.length || new Set(aktuell).size !== aktuell.length || new Set(soll).size !== soll.length)
    throw new Error('aktuell und soll sind keine Umordnung derselben Menge');
  const pos = new Map(soll.map((id, i) => [id, i]));
  for (const id of aktuell) if (!pos.has(id)) throw new Error('aktuell und soll sind keine Umordnung derselben Menge');
  const seq = aktuell.map((id) => pos.get(id));
  const bleibt = new Set(lisIndizes(seq).map((i) => aktuell[i]));
  const l = [...aktuell], zuege = [];
  for (let j = 0; j < soll.length; j++) {
    const id = soll[j];
    if (bleibt.has(id)) continue;
    l.splice(l.indexOf(id), 1);
    const np = j === 0 ? 0 : l.indexOf(soll[j - 1]) + 1;
    l.splice(np, 0, id);
    zuege.push({ id, newPosition: String(np) });
  }
  const probe = zuegeAnwenden(aktuell, zuege);
  if (probe.join(',') !== soll.join(',')) throw new Error('interne Prüfung: Züge ergeben nicht das Soll');
  return zuege;
}

// Erste abweichende Stellen zweier Reihenfolgen (für die Meldung).
export function abweichungen(ist, soll, max = 5) {
  const out = [];
  for (let i = 0; i < Math.max(ist.length, soll.length) && out.length < max; i++)
    if (ist[i] !== soll[i]) out.push({ platz: i + 1, ist: ist[i] || null, soll: soll[i] || null });
  return out;
}
