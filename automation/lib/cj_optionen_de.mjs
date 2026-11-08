/**
 * Konservative Uebersetzung sichtbarer CJ-Farbwerte.
 *
 * Ein unbekannter Lieferantenwert wird nie unveraendert in Shopify uebernommen. Damit kann ein
 * deutscher Titel nicht neben englischen Variantenwerten wie "Light Blue" oder "As shown"
 * erscheinen. Neue Werte muessen zuerst hier mit eindeutiger Uebersetzung aufgenommen werden.
 */
const FARBEN = new Map(Object.entries({
  apricot: 'Aprikose', beige: 'Beige', black: 'Schwarz', blue: 'Blau', brown: 'Braun',
  burgundy: 'Bordeaux', camel: 'Camel', champagne: 'Champagner', coffee: 'Kaffeebraun',
  cream: 'Creme', cyan: 'Türkis', gold: 'Gold', gray: 'Grau', grey: 'Grau', green: 'Grün',
  ivory: 'Elfenbein', khaki: 'Khaki', lavender: 'Lavendel', lilac: 'Flieder', mint: 'Mintgrün',
  multicolor: 'Bunt', multi: 'Bunt', navy: 'Marineblau', nude: 'Nude', orange: 'Orange',
  pink: 'Rosa', purple: 'Lila', red: 'Rot', rose: 'Rosé', silver: 'Silber', standard: 'Standard',
  transparent: 'Transparent', turquoise: 'Türkis', violet: 'Violett', white: 'Weiss', yellow: 'Gelb',
  'army green': 'Armeegrün', 'dark blue': 'Dunkelblau', 'dark brown': 'Dunkelbraun',
  'dark green': 'Dunkelgrün', 'dark grey': 'Dunkelgrau', 'dark gray': 'Dunkelgrau',
  'dark pink': 'Dunkelrosa', 'deep blue': 'Dunkelblau', 'fluorescent green': 'Neongrün',
  'hot pink': 'Pink', 'light blue': 'Hellblau', 'light green': 'Hellgrün',
  'light grey': 'Hellgrau', 'light gray': 'Hellgrau', 'light pink': 'Rosa',
  'light purple': 'Helllila', 'light yellow': 'Hellgelb', 'navy blue': 'Marineblau',
  'rose gold': 'Roségold', rosegold: 'Roségold', 'rose red': 'Rosarot',
  'sky blue': 'Himmelblau', 'wine red': 'Weinrot',
}));

const DEUTSCHE_WERTE = new Map([...new Set(FARBEN.values())]
  .map(wert => [wert.toLocaleLowerCase('de-CH'), wert]));

function norm(value) {
  return String(value ?? '').normalize('NFKC').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function einzeln(value) {
  const text = norm(value);
  if (!text) return null;
  const key = text.toLocaleLowerCase('de-CH');
  return FARBEN.get(key) || DEUTSCHE_WERTE.get(key) || null;
}

export function uebersetzeCjFarbe(value) {
  const roh = String(value ?? '').trim();
  if (!roh) return { status: 'BLOCKED', grund: 'Farbwert fehlt' };
  const direkt = einzeln(roh);
  if (direkt) return { status: 'OK', wert: direkt };

  const teile = roh.split(/\s*(?:\/|\+|&|,)\s*/).filter(Boolean);
  if (teile.length > 1) {
    const uebersetzt = teile.map(einzeln);
    if (uebersetzt.every(Boolean)) return { status: 'OK', wert: uebersetzt.join(' / ') };
  }
  return { status: 'BLOCKED', grund: `unbekannter sichtbarer CJ-Farbwert: ${roh.slice(0, 80)}` };
}

export function uebersetzeCjGroesse(value) {
  const roh = String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!roh) return { status: 'BLOCKED', grund: 'Grössenwert fehlt' };
  const key = roh.toUpperCase().replace(/[ _-]+/g, '');
  if (['ONESIZE', 'FREESIZE', 'F', 'EINHEIT', 'EINHEITSGRÖSSE', 'EINHEITSGROESSE'].includes(key)) {
    return { status: 'OK', wert: 'Einheitsgrösse' };
  }
  if (/^(?:XS|S|M|L|XL|XXL|XXXL|[2-6]XL)$/.test(key)) return { status: 'OK', wert: key };
  if (/^\d{1,3}$/.test(key)) return { status: 'OK', wert: key };
  const eu = roh.toUpperCase().match(/^(EU|US|UK)\s*(\d{1,3})$/);
  if (eu) return { status: 'OK', wert: `${eu[1]} ${eu[2]}` };
  return { status: 'BLOCKED', grund: `unbekannter sichtbarer CJ-Grössenwert: ${roh.slice(0, 80)}` };
}
