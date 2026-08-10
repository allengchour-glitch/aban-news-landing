#!/usr/bin/env node
/* ig_dubletten.mjs — findet doppelte Instagram-Beiträge und löscht sie auf Wunsch.
 *
 * WARUM ES DIESES WERKZEUG BRAUCHT
 * Der Shop hat mehrfach denselben Beitrag zweimal veröffentlicht (User-Meldungen 07-12, 07-14,
 * 07-23, 07-24, 07-26). Die Ursachen sind im Projekt-Gedächtnis aufgearbeitet und die Poster
 * inzwischen mit fünf Schichten abgesichert (Lock, Claim-vor-Post, Inhalts-Sperre,
 * Live-IG-Abgleich, gemeinsamer Lockfile). Was fehlte: ein Werkzeug, das die BEREITS
 * entstandenen Doppelposts sauber findet und entfernt.
 *
 * ERKENNUNG — nach Beweiskraft getrennt, weil Löschen unumkehrbar ist:
 *   STARK (löschbar):  gleiche Medien-Datei (`media_url`-Basename) — derselbe Upload
 *                      gleiche Produkt-URL in der Caption — dasselbe Produkt beworben
 *   SCHWACH (nur Bericht): gleiche ersten drei Caption-Wörter — trifft dasselbe Produkt auch
 *                      bei anderem Bild (die 07-24-Lücke), kann aber auch zwei verschiedene
 *                      Artikel derselben Reihe erwischen. Wird NIE automatisch gelöscht.
 *
 * SICHERHEITSREGELN (bewusst streng, Löschen ist unumkehrbar):
 *   • Der ÄLTESTE Beitrag einer Gruppe bleibt IMMER stehen — er trägt die Interaktionen.
 *   • Beiträge mit mindestens MIN_VIEWS Aufrufen (Standard 500) werden NIE gelöscht,
 *     auch wenn sie Dubletten sind. Reichweite ist wertvoller als Ordnung.
 *   • Ohne `--loeschen` wird nichts angefasst; der Bericht ist die Voreinstellung.
 *
 * ⚠️ AUSFÜHRUNG: Aus der Cloud-Sitzung heraus ist das Löschen veröffentlichter Beiträge
 * gesperrt (dokumentiert 2026-07-28). Dieses Skript ist dafür gebaut, LOKAL oder über den
 * PC-Claude zu laufen. Es braucht ein gültiges Meta-Token mit `instagram_basic` und
 * `instagram_content_publish`.
 *
 * ENV:  META_ACCESS_TOKEN, IG_USER_ID   [MIN_VIEWS=500] [LIMIT=100]
 * Lauf: node automation/ig_dubletten.mjs            → nur Bericht
 *       node automation/ig_dubletten.mjs --loeschen → löscht die markierten Beiträge
 */
const TOKEN = (process.env.META_ACCESS_TOKEN || '').trim();
const IGID  = (process.env.IG_USER_ID || '').trim();
const MIN_VIEWS = parseInt(process.env.MIN_VIEWS || '500', 10);
const LIMIT = parseInt(process.env.LIMIT || '100', 10);
const LOESCHEN = process.argv.includes('--loeschen');

if (!TOKEN || !IGID) {
  console.log('META_ACCESS_TOKEN oder IG_USER_ID fehlt → No-op.');
  console.log('Beides steht nach einem Container-Neustart nicht mehr zur Verfügung und muss');
  console.log('vom Betreiber neu gesetzt werden (Graph-Explorer-Token → Seiten-Token).');
  process.exit(0);
}

const api = async (pfad, opts = {}) => {
  const url = `https://graph.facebook.com/v21.0/${pfad}${pfad.includes('?') ? '&' : '?'}access_token=${TOKEN}`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      if (j && !j.error) return j;
      if (j?.error?.code === 4 || j?.error?.code === 17) { await new Promise(s => setTimeout(s, 5000)); continue; }
      return j;
    } catch { await new Promise(s => setTimeout(s, 3000)); }
  }
  return {};
};

// Caption-Signatur: ohne Hashtags, Links, Emoji und Satzzeichen. Zwei Beiträge über dasselbe
// Produkt sollen dieselbe Signatur ergeben, auch wenn Bild und Hashtags abweichen.
const signatur = (s = '') => s
  .replace(/#[^\s#]+/g, ' ')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
  .toLowerCase()
  .replace(/[^a-zäöüß0-9]+/g, ' ')
  .trim()
  .slice(0, 45);

const dateiname = (u = '') => {
  try { return new URL(u).pathname.split('/').pop().split('.')[0].slice(0, 40); }
  catch { return ''; }
};

const produktLink = (s = '') => (s.match(/luxestyle\.ch\/products\/([a-z0-9-]+)/i) || [])[1] || '';

(async () => {
  let posts = [], next = `${IGID}/media?fields=id,caption,media_url,permalink,timestamp,media_type,like_count,comments_count&limit=50`;
  while (next && posts.length < LIMIT) {
    const j = await api(next);
    if (!j.data) { console.log('Abruf fehlgeschlagen:', JSON.stringify(j).slice(0, 200)); break; }
    posts.push(...j.data);
    next = j.paging?.next ? j.paging.next.split('/v21.0/')[1] : null;
  }
  console.log(`Beiträge geladen: ${posts.length}`);
  if (!posts.length) return;

  // Gruppieren: ein Beitrag kann über mehrere Merkmale zusammenfallen, deshalb Union-Find-artig
  // über einen gemeinsamen Schlüssel je Merkmal.
  // STARK vs. SCHWACH — Löschen ist unumkehrbar, deshalb wird getrennt:
  //   stark  = gleiche Mediendatei ODER gleicher Produkt-Link → eindeutig derselbe Beitrag
  //   schwach= gleicher Anfang der Caption → oft, aber nicht immer dieselbe Ware
  // Der Selbsttest zeigte, warum die reine Zeichen-Signatur nicht genügt: «Ring-Set Eternità ✨
  // Jetzt bei LuxeStyle — CHF 35.90» und «Ring-Set Eternità 💍 stapelbar — jetzt entdecken!»
  // beschreiben dasselbe Produkt, laufen aber nach 16 Zeichen auseinander. Die ersten drei
  // Wörter treffen beide — sind dafür aber zu grob, um blind zu löschen. Schwache Treffer
  // werden deshalb nur GEMELDET.
  const gruppen = new Map();
  const wortSig = s => signatur(s).split(' ').filter(Boolean).slice(0, 3).join(' ');
  const schluessel = p => {
    const k = [];
    const d = dateiname(p.media_url); if (d) k.push('datei:' + d);
    const l = produktLink(p.caption); if (l) k.push('link:' + l);
    const w = wortSig(p.caption);     if (w.split(' ').length >= 3) k.push('text:' + w);
    return k;
  };
  for (const p of posts) for (const k of schluessel(p)) {
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(p);
  }

  const gesehen = new Set(); const dubletten = [];
  for (const [k, g] of gruppen) {
    if (g.length < 2) continue;
    const ids = g.map(p => p.id).sort().join('|');
    if (gesehen.has(ids)) continue;      // dieselbe Gruppe über mehrere Merkmale gefunden
    gesehen.add(ids);
    g.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));   // ältester zuerst
    const art = k.startsWith('text:') ? 'schwach' : 'stark';
    dubletten.push({ merkmal: k.split(':')[0], art, behalten: g[0], weg: g.slice(1) });
  }

  if (!dubletten.length) { console.log('Keine Doppelposts gefunden.'); return; }

  console.log(`\nDubletten-Gruppen: ${dubletten.length}`);
  let geloescht = 0, geschont = 0;
  for (const d of dubletten) {
    console.log(`\n▸ ${d.art === 'stark' ? '🔴 STARK' : '🟡 schwach'} (${d.merkmal}) · behalten: ${d.behalten.timestamp?.slice(0, 10)} ${d.behalten.permalink}`);
    console.log(`  «${(d.behalten.caption || '').replace(/\n/g, ' ').slice(0, 70)}»`);
    for (const p of d.weg) {
      // Reichweite prüfen — vielgesehene Beiträge bleiben, auch als Dublette.
      const ins = await api(`${p.id}/insights?metric=impressions,reach`);
      const werte = (ins.data || []).map(x => x.values?.[0]?.value || 0);
      const views = Math.max(0, ...werte, p.like_count || 0);
      if (views >= MIN_VIEWS) {
        geschont++;
        console.log(`  🛡️  ${p.timestamp?.slice(0, 10)} bleibt (${views} Aufrufe ≥ ${MIN_VIEWS}) ${p.permalink}`);
        continue;
      }
      if (d.art !== 'stark') {
        // Nur Caption-Ähnlichkeit: zu unsicher für automatisches Löschen. Der Betreiber
        // entscheidet — die Permalinks stehen hier.
        console.log(`  🟡 prüfen: ${p.timestamp?.slice(0, 10)} (${views} Aufrufe) ${p.permalink}`);
        continue;
      }
      if (!LOESCHEN) {
        console.log(`  ⛔ würde löschen: ${p.timestamp?.slice(0, 10)} (${views} Aufrufe) ${p.permalink}`);
        continue;
      }
      const r = await api(p.id, { method: 'DELETE' });
      if (r?.success || r?.error === undefined) { geloescht++; console.log(`  🗑️  gelöscht: ${p.permalink}`); }
      else console.log(`  ⚠️ Löschen fehlgeschlagen: ${JSON.stringify(r).slice(0, 120)}`);
      await new Promise(s => setTimeout(s, 1500));
    }
  }
  console.log(`\n${LOESCHEN ? 'FERTIG' : '(Bericht — nichts gelöscht)'}: ${geloescht} gelöscht, ${geschont} wegen Reichweite geschont.`);
  console.log('🟡-Einträge sind nur Verdachtsfälle (Caption-Ähnlichkeit) und werden NIE automatisch gelöscht.');
  if (!LOESCHEN) console.log('Zum Ausführen erneut starten mit:  node automation/ig_dubletten.mjs --loeschen');
})();
