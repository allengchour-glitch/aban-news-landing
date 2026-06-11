// Kategorie-Erkennung + ausbalancierte Rotation für Posts/Reels.
// Ziel: Reihenfolge durchmischen (Damen → Herren → Schmuck → Beauty → Gadget → …)
// statt klumpenweise eine Kategorie. Deterministisch (gleiche Eingabe → gleiche Reihenfolge),
// damit die Pointer-Rotation der Generatoren stabil weiterläuft.

export function catKey(s){
  s = (s || '').toLowerCase();
  if (/herren|männer|menswear|\bmen\b/.test(s)) return 'herren';
  if (/sneaker|slides|sandal|schuh|stiefel|boot|loafer/.test(s)) return 'schuhe';
  if (/kette|ohrring|armreif|armband|\bring\b|schmuck|halskette|anhänger|moissanite|zirkonia/.test(s)) return 'schmuck';
  if (/serum|gua-?sha|creme|roller|beauty|pflege|skincare|maske/.test(s)) return 'beauty';
  if (/ständer|stander|halter|gadget|tech|lampe|deko|vase|kerze|organizer|\bhome\b/.test(s)) return 'gadget';
  if (/tasche|\bbag\b|handtasche|crossbody|clutch|rucksack/.test(s)) return 'tasche';
  if (/kleid|\brock\b|dress|skirt|bluse/.test(s)) return 'kleid';
  if (/sonnenbrille|brille|\bhut\b|\bcap\b|gürtel|schal|accessoire/.test(s)) return 'accessoire';
  return 'mode';
}

// Round-robin über die Kategorien → bunt durchmischte Reihenfolge.
export function balanceByCategory(items, keyFn){
  const groups = new Map();
  for (const it of items) {
    const k = catKey(keyFn(it));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const lists = [...groups.values()];
  const out = [];
  for (let added = true; added; ) {
    added = false;
    for (const l of lists) { const x = l.shift(); if (x !== undefined) { out.push(x); added = true; } }
  }
  return out;
}
