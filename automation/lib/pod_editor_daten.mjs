// Produkt-HTML aus Shopify. Die Startreihenfolge entspricht karteLesen/vorschauLesen in V6.
function attribute(quelle) {
  const werte = Object.create(null);
  for (const m of quelle.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const wert = m[2] ?? m[3] ?? m[4] ?? '';
    werte[m[1].toLowerCase()] ??= wert.replace(/&(?:quot|apos|lt|gt|amp|#39|#34);/g,
      s => ({ '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&', '&#39;': "'", '&#34;': '"' })[s]);
  }
  return werte;
}

function editoren(html) {
  const liste = [], stapel = [], dokument = {};
  const teile = /<!--[\s\S]*?-->|<script\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/script\s*>|<(\/?div)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  for (const [, skript, inhalt, tag, text] of html.matchAll(teile)) {
    if (skript !== undefined) {
      const a = attribute(skript);
      for (const name of ['karte', 'vorschau']) {
        const hatId = a.id === 'lspod-' + name;
        if (hatId) dokument[name] ??= inhalt;
        const editor = stapel.at(-1);
        if (editor && (hatId || 'data-lspod-' + name in a)) editor.eingebettet[name] ??= inhalt;
      }
    } else if (tag?.toLowerCase() === 'div') {
      const a = attribute(text);
      if ((a.class || '').split(/\s+/).includes('lspod-designer-v6')) {
        const editor = { a, eingebettet: {} };
        liste.push(editor);
        stapel.push(editor);
      } else stapel.push(stapel.at(-1));
    } else if (tag) stapel.pop();
  }
  return { liste, dokument };
}

function zeichnbar(p) {
  const v = p?.vorlage;
  return typeof p?.id === 'string' && p.id.length > 0 && p.printfile?.breitePx > 0 && p.printfile.hoehePx > 0 &&
    v?.vorlageBreite > 0 && v.vorlageHoehe > 0 && v.flaecheBreite > 0 && v.flaecheHoehe > 0 &&
    Number.isFinite(v.flaecheLinks) && Number.isFinite(v.flaecheOben);
}

function modellkarte(k) {
  return k && k.modelle === undefined && (k.schema === undefined || k.schema === 1) &&
    Array.isArray(k.platzierungen) && k.platzierungen.some(zeichnbar);
}

function karteGueltig(k, variante) {
  if (!k || (k.schema !== undefined && k.schema !== 1)) return false;
  if (k.modelle === undefined) return Boolean(modellkarte(k));
  if (!k.modelle || typeof k.modelle !== 'object' || Array.isArray(k.modelle)) return false;
  const modelle = Object.entries(k.modelle);
  if (!modelle.length || !modelle.every(([id, m]) => modellkarte(m) &&
    (m.printfulProductId == null || String(m.printfulProductId) === id))) return false;
  const varianten = k.shop?.varianten || {};
  const passt = z => z?.pv != null && z.pv !== '' && Number.isFinite(Number(z.pv)) &&
    z.m != null && Object.hasOwn(k.modelle, z.m);
  return variante ? passt(varianten[variante]) : Object.values(varianten).some(passt);
}

function vorschauGueltig(v, modellId) {
  if (v?.schema !== 1 || !v.modelle || typeof v.modelle !== 'object' || Array.isArray(v.modelle)) return false;
  const modelle = modellId == null ? Object.values(v.modelle) : [v.modelle[modellId]];
  return modelle.some(m => ['flach', 'tasse', 'papier', 'keine'].includes(m?.adapter));
}

// Karten und Vorschauen sind öffentliche Editor-Dateien. Keine Shop-Zugangsdaten an diese Hosts senden.
async function leseDaten(adresse, holen) {
  const url = new URL(adresse, 'https://luxestyle.ch/products/');
  const host = url.hostname;
  const editorHost = ['abannews.com', 'www.abannews.com'].includes(host) && url.pathname.startsWith('/pod/v6/');
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      (!editorHost && !['luxestyle.ch', 'www.luxestyle.ch', 'cdn.shopify.com', 'au3j0y-hq.myshopify.com'].includes(host))) {
    throw new Error('unbekannte Datenquelle, manuell prüfen');
  }
  const r = await holen(url.href, {
    headers: { 'User-Agent': 'LuxeStyle-Editor-QA/1.0', Origin: 'https://luxestyle.ch', Referer: 'https://luxestyle.ch/' },
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function pruefeDaten(name, editor, dokument, holen, validiere) {
  const a = editor.a;
  const inline = editor.eingebettet[name] ?? dokument[name] ?? a['data-' + name];
  const url = a['data-' + name + '-url'];
  if (inline?.trim()) {
    try {
      const daten = JSON.parse(inline);
      if (validiere(daten)) return { daten };
      // Der Editor übernimmt lesbare Vorschaudaten vor der fachlichen Prüfung; dann folgt kein URL-Rückfall.
      if (name === 'vorschau' && daten) return { fehler: 'eingebettete Vorschaudaten ungültig' };
    } catch { /* Der Editor versucht danach die URL. */ }
  }
  if (url) {
    try {
      const daten = await leseDaten(url, holen);
      return validiere(daten) ? { daten } : { fehler: 'Schema oder Variantenbezug ungültig' };
    } catch (e) {
      return { fehler: e instanceof SyntaxError ? 'kein gültiges JSON' : e.message };
    }
  }
  if (inline?.trim()) return { fehler: 'eingebettete Daten ungültig' };
  if (name === 'karte' && a['data-karte-pflicht'] === '1') return { fehler: 'Pflichtkarte fehlt' };
  return {};
}

export async function pruefeEditor(html, holen = fetch) {
  const { liste, dokument } = editoren(html);
  const legacy = [...html.matchAll(/\bdata-img-(?:front|back)\s*=\s*(["'])([^"']+)\1/gi)].map(m => m[2]);
  const befunde = [];
  for (const url of new Set(legacy)) {
    if (url.includes('abannews.com')) { befunde.push('tote Domain ' + url.slice(0, 60)); continue; }
    try {
      const r = await holen(url, { method: 'HEAD' });
      if (r.status !== 200) befunde.push('HTTP ' + r.status + ' ' + url.slice(0, 70));
    } catch { befunde.push('FETCH-FEHLER ' + url.slice(0, 70)); }
  }
  for (const editor of liste) {
    const variante = editor.a['data-variant'];
    const karte = await pruefeDaten('karte', editor, dokument, holen, k => karteGueltig(k, variante));
    if (karte.fehler) befunde.push('V6-karte: ' + karte.fehler);
    const modell = karte.daten?.shop?.varianten?.[variante]?.m ?? karte.daten?.printfulProductId;
    const vorschau = await pruefeDaten('vorschau', editor, dokument, holen, v => vorschauGueltig(v, modell));
    if (vorschau.fehler) befunde.push('V6-vorschau: ' + vorschau.fehler);
  }
  const erkannt = liste.length > 0 || legacy.length > 0;
  if (erkannt && /\.js\?v=\d+\?v=/.test(html)) befunde.push('designer.js ?v=-Kette');
  return { erkannt, v6: liste.length > 0, befunde };
}
