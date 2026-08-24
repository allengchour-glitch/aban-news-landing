// Technik-Plausibilitaets-Wache fuer die CJ-Importer (24.08.2026, Audit-Befunde 2.2/2.6/2.7/2.8).
//
// Der Grind hat vier Beamer mit «4K» im Titel angelegt, deren eigener Text die native
// Aufloesung 720p/1080p nennt; eine Taschenlampe mit 99'000'000 Lumen; zwei Powerbanks
// mit 20'000 mAh im Titel und 10'000 im Text; eine 100'000-mAh-Powerbank (370 Wh —
// nicht auf CJ-ueblichen Transportwegen lieferbar). Titel und Text stehen im selben
// Google-Feed-Datensatz: der Widerspruch ist fuer Google maschinell lesbar
// (Misrepresentation-Klasse) — und Google ist der einzige Kanal mit Verkaeufen.
//
// Regeln (nur ANWENDEN, wenn beide Zahlen da sind — nichts erfinden):
//  1. Aufloesung: nennt der TEXT eine NATIVE Aufloesung, die niedriger ist als die im
//     TITEL, gewinnt die native (8K > 4K > 1080p/Full HD > 720p).
//  2. mAh: Titel-mAh != Text-mAh → die Text-Zahl gewinnt (Zellkapazitaet steht im
//     Marketing immer HOEHER als die abgebbare). mAh > 30'000 → Produkt VERWERFEN
//     (haette auch die 9-Mio-mAh-Powerbank vom 16.08. gestoppt).
//  3. Lumen > 20'000 → verwerfen; > 5'000 bei 3.7V/USB-Akku → verwerfen.
// Rueckgabe: {title, verwerfen, grund}
const RANG = { '8k': 4320, '4k': 2160, '1080p': 1080, 'full hd': 1080, '720p': 720, 'hd': 720 };

function aufloesungImTitel(t) {
  const m = t.match(/\b(8K|4K|1080p|720p|Full\s?HD)\b/i);
  return m ? m[1] : null;
}
function nativImText(html) {
  const txt = html.replace(/<[^>]+>/g, ' ');
  const m = txt.match(/nativ\w*[^.]{0,40}?\b(8K|4K|1080p|720p|Full\s?HD|1920\s?[x×]\s?1080|1280\s?[x×]\s?720)\b/i)
        || txt.match(/\b(1920\s?[x×]\s?1080|1280\s?[x×]\s?720)\b/);
  if (!m) return null;
  const v = m[1].toLowerCase().replace(/\s+/g, ' ');
  if (v.includes('1920')) return '1080p';
  if (v.includes('1280')) return '720p';
  return v;
}
const zahl = s => parseInt(String(s).replace(/['’  \s.]/g, ''), 10);

export function technikWache(title, html) {
  let t = title; const gruende = [];
  const txt = (html || '').replace(/<[^>]+>/g, ' ');

  // 1) Aufloesung
  const imTitel = aufloesungImTitel(t);
  if (imTitel) {
    const nat = nativImText(html || '');
    if (nat && (RANG[nat] || 0) < (RANG[imTitel.toLowerCase().replace(/\s+/g, ' ')] || 0)) {
      const ersatz = nat === '1080p' ? 'Full HD' : nat === '720p' ? '720p' : nat.toUpperCase();
      t = t.replace(/\b(8K|4K)\b\s*/i, '').replace(/\s{2,}/g, ' ').trim();
      if (!new RegExp(ersatz, 'i').test(t)) t = ersatz + ' ' + t;
      gruende.push(`aufloesung:${imTitel}->${nat}`);
    }
  }
  // 2) mAh
  const mT = t.match(/([\d'’ .]{4,9})\s*mAh/i);
  const mX = txt.match(/([\d'’ .]{4,9})\s*mAh/i);
  if (mT) {
    const a = zahl(mT[1]);
    if (a > 30000) return { title: t, verwerfen: true, grund: `mah-unplausibel:${a}` };
    if (mX) {
      const b = zahl(mX[1]);
      if (b > 30000) return { title: t, verwerfen: true, grund: `mah-unplausibel-text:${b}` };
      if (b && b < a) { t = t.replace(mT[0], mX[1] + ' mAh'); gruende.push(`mah:${a}->${b}`); }
    }
  } else if (mX && zahl(mX[1]) > 30000) {
    return { title: t, verwerfen: true, grund: `mah-unplausibel-text:${zahl(mX[1])}` };
  }
  // 3) Lumen
  const lu = (t + ' ' + txt).match(/([\d'’ .]{4,12})\s*Lumen/i);
  if (lu) {
    const l = zahl(lu[1]);
    if (l > 20000) return { title: t, verwerfen: true, grund: `lumen-unplausibel:${l}` };
    if (l > 5000 && /3[.,]7\s*V|USB-?[Aa]ufl|USB-?[Ll]ad/.test(txt)) {
      return { title: t, verwerfen: true, grund: `lumen-akku-unplausibel:${l}` };
    }
  }
  return { title: t, verwerfen: false, grund: gruende.join(',') };
}
