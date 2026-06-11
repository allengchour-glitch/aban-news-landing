// Kategorie-Erkennung + ausbalancierte Rotation + kategorie-Hashtags für Posts/Reels.
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

// Kategorie-passende Hashtags (Reach-Tags vorne + Nischen-Tags).
export function tagsFor(s){
  const reach = '#schweiz #foryou #luxestyle';
  switch (catKey(s)) {
    case 'herren':     return reach + ' #herrenmode #menstyle';
    case 'schuhe':     return reach + ' #sneaker #shoes';
    case 'schmuck':    return reach + ' #schmuck #jewelry';
    case 'beauty':     return reach + ' #skincare #selfcare';
    case 'gadget':     return reach + ' #gadget #lifestyle';
    case 'tasche':     return reach + ' #handtasche #bag';
    case 'kleid':      return reach + ' #sommerkleid #damenmode';
    case 'accessoire': return reach + ' #accessoires #ootdschweiz';
    default:           return reach + ' #fashionschweiz #ootdschweiz';
  }
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
