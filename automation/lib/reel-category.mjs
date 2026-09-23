// Kategorie-Erkennung + ausbalancierte Rotation + kategorie-Hashtags für Posts/Reels.
// Ziel: Reihenfolge durchmischen (Damen → Herren → Schmuck → Beauty → Gadget → …)
// statt klumpenweise eine Kategorie. Deterministisch (gleiche Eingabe → gleiche Reihenfolge),
// damit die Pointer-Rotation der Generatoren stabil weiterläuft.

// 23.09.2026 (Audit): 32 von 33 Reels mit #ootdschweiz/#fashionschweiz waren KEINE Mode —
// «Schale» traf /schal/, «Hundeführleine» und «Gemüseschneider» fielen in den Default 'mode'.
// Jetzt: Sachgruppen zuerst (Haustier, Küche, Fitness, Kinder, Wohnen), Wortgrenzen für Schal/Boot,
// Default 'allgemein' mit Sach-Tags statt Mode-Tags.
export function catKey(s){
  s = (s || '').toLowerCase();
  if (/hund|katze|haustier|welpe|\bpet\b|(?<!k)leine(?!n)|kratzbaum|futter|(?<!saug)napf|aquarium|vogel/.test(s)) return 'haustier';
  if (/sit-?up|fitness|yoga|hantel|widerstandsband|faszien|bauchtrainer|springseil|trainings?/.test(s)) return 'fitness';
  if (/küche|kueche|mixer|kaffee|\btee\b|matcha|entsafter|grill|messbecher|\btopf|pfanne|gemüse|gemuese|nudel|schäler|reibe|kochtopf|backform|brotdose|besteck|kocher|schneidebrett|geschirr/.test(s)) return 'kueche';
  if (/baby|kleinkind|kinder|spielzeug|puzzle|baustein|plüsch/.test(s)) return 'kinder';
  if (/herren|männer|menswear|\bmen\b/.test(s)) return 'herren';
  if (/sneaker|slides|sandal|(?<!hand)schuh|stiefel|\bboots?\b|loafer|pumps/.test(s)) return 'schuhe';
  if (/kette|ohrring|armreif|armband|\bring\b|schmuck|halskette|anhänger|moissanite|zirkonia/.test(s)) return 'schmuck';
  if (/serum|gua-?sha|creme|jade[- ]?roller|gua[- ]?sha|beauty|pflege|skincare|gesichtsmaske|haar|nagel|wimper|make-?up/.test(s)) return 'beauty';
  if (/tasche|\bbag\b|handtasche|crossbody|clutch|rucksack/.test(s)) return 'tasche';
  if (/kleid|\brock\b|dress|skirt|bluse/.test(s)) return 'kleid';
  if (/sonnenbrille|brille|\bhut\b|\bcap\b|gürtel|schal(?![et])|accessoire/.test(s)) return 'accessoire';
  if (/hose|jacke|mantel|hoodie|shirt|pullover|strick|jeans|blazer|weste|mütze|handschuh|damenmode/.test(s)) return 'mode';
  if (/lampe|licht|deko|vase|kerze|diffuser|kissen|decke|organizer|regal|aufbewahrung|\bhome\b|ständer|halter/.test(s)) return 'home';
  if (/gadget|tech|beamer|projektor|kopfhörer|lautsprecher|ladegerät|ladestation|kabel|usb|bluetooth|smart|kamera|drohne|tracker/.test(s)) return 'gadget';
  return 'allgemein';
}

// Kategorie-passende Hashtags (Reach-Tags vorne + Nischen-Tags).
export function tagsFor(s){
  const reach = '#schweiz #foryou #luxestyle';
  switch (catKey(s)) {
    case 'haustier':   return reach + ' #hund #haustier';
    case 'fitness':    return reach + ' #fitness #homeworkout';
    case 'kueche':     return reach + ' #küche #kochen';
    case 'kinder':     return reach + ' #kinder #familie';
    case 'herren':     return reach + ' #herrenmode #menstyle';
    case 'schuhe':     return reach + ' #sneaker #shoes';
    case 'schmuck':    return reach + ' #schmuck #jewelry';
    case 'beauty':     return reach + ' #skincare #selfcare';
    case 'home':       return reach + ' #zuhause #wohnen';
    case 'gadget':     return reach + ' #gadget #technik';
    case 'tasche':     return reach + ' #handtasche #bag';
    case 'kleid':      return reach + ' #kleid #damenmode';
    case 'accessoire': return reach + ' #accessoires #ootdschweiz';
    case 'mode':       return reach + ' #fashionschweiz #ootdschweiz';
    default:           return reach + ' #fundstück #alltag';
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
