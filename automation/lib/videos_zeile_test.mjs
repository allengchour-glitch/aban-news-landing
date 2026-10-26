/** Test der reinen Funktionen der Video-Zeile (kein Netz; fetch wird nachgebaut).
 *  Lauf: /opt/node22/bin/node automation/lib/videos_zeile_test.mjs */
import {
  erkenneUrl, youtubeVideoId, youtubeVorschau, kanalId, parseQuellen, saubererTitel, tiktokDatum,
  eintragAusTiktok, parseYoutubeFeed, eintragAusYoutubeVideo, dublettenSchluessel, baueListe,
  pruefeListe, darfSchreiben, metafieldsSetEingabe, holeMitGeduld, sammle, xmlText,
  MAX_EINTRAEGE, NAMESPACE, KEY,
} from './videos_zeile.mjs';

let fehler = 0;
const pruef = (name, ist, soll) => {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
  else console.log(`ok   ${name}`);
};
// TikTok-IDs tragen die Sekunden seit 1970 in den oberen Bits: hier gebaut, nicht geraten.
const ttId = (iso) => String(BigInt(Math.floor(Date.parse(iso) / 1000)) << 32n);
const ttUrl = (iso, user = 'luxestyle.ch') => `https://www.tiktok.com/@${user}/video/${ttId(iso)}`;

// ── 1. Adressen erkennen ──
pruef('TikTok www', erkenneUrl('https://www.tiktok.com/@luxestyle.ch/video/7501234567890123456')?.plattform, 'tiktok');
pruef('TikTok Kurzlink vm', erkenneUrl('https://vm.tiktok.com/ZMabc123/')?.plattform, 'tiktok');
pruef('TikTok: Parameter und Anker fliegen raus',
  erkenneUrl('https://www.tiktok.com/@luxestyle.ch/video/7501234567890123456?_r=1&_t=abc#x')?.url,
  'https://www.tiktok.com/@luxestyle.ch/video/7501234567890123456');
pruef('YouTube watch', erkenneUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s')?.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
pruef('YouTube youtu.be', erkenneUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz')?.id, 'dQw4w9WgXcQ');
pruef('YouTube shorts bleibt shorts', erkenneUrl('https://www.youtube.com/shorts/abcdefghijk')?.url, 'https://www.youtube.com/shorts/abcdefghijk');
pruef('YouTube embed -> gleiche ID', youtubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');

// ── 2. GEGENPROBE: fremde und gefälschte Adressen werden abgelehnt ──
for (const [name, u] of [
  ['fremde Domain', 'https://evil.example.com/video/1'],
  ['Domain mit tiktok.com im Pfad', 'https://evil.example.com/tiktok.com/video/1'],
  ['tiktok.com als Unterdomain einer fremden', 'https://tiktok.com.evil.example/@a/video/75012345678901234'],
  ['ähnlicher Name', 'https://nottiktok.com/@a/video/75012345678901234'],
  ['http statt https', 'http://www.tiktok.com/@a/video/75012345678901234'],
  ['Zugangsdaten in der Adresse', 'https://www.tiktok.com@evil.example/@a/video/75012345678901234'],
  ['javascript:', 'javascript:alert(1)'],
  ['kein Text', 12345],
  ['leer', ''],
  ['TikTok-Startseite ist kein Video', 'https://www.tiktok.com/'],
  ['YouTube-Kanal ist kein Video', 'https://www.youtube.com/@luxestyle'],
  ['YouTube mit zu kurzer ID', 'https://www.youtube.com/watch?v=abc'],
  ['fremder Port', 'https://www.tiktok.com:8443/@a/video/75012345678901234'],
]) pruef(`abgelehnt: ${name}`, erkenneUrl(u), null);

// ── 3. Kanal-IDs ──
pruef('Kanal-ID', kanalId('UCabcdefghijklmnopqrstuv'), 'UCabcdefghijklmnopqrstuv');
pruef('Kanal-ID aus Kanaladresse', kanalId('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv'), 'UCabcdefghijklmnopqrstuv');
pruef('Kanal: @Handle ist nicht auflösbar', kanalId('https://www.youtube.com/@luxestyle'), null);
pruef('Kanal: zu kurze ID', kanalId('UCabc'), null);

// ── 4. Quellendatei ──
const q = parseQuellen({
  _hinweis: 'Konto https://www.tiktok.com/@luxestyle.ch', tiktok: [ttUrl('2026-10-01T00:00:00Z'), 'https://evil.example/x'],
  youtube: ['UCabcdefghijklmnopqrstuv', 'https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/@luxestyle'],
});
pruef('Quellen: gültige TikTok-Adresse', q.tiktok.length, 1);
pruef('Quellen: Kanal + Video', q.youtube.map((y) => y.art), ['kanal', 'video']);
pruef('Quellen: Ablehnungen genannt', q.abgelehnt.map((a) => a.quelle), ['https://evil.example/x', 'https://www.youtube.com/@luxestyle']);
pruef('Quellen: Kommentarfeld _hinweis wird nicht gelesen', q.abgelehnt.some((a) => a.quelle.includes('Konto')), false);
pruef('LEERE Quelle liefert leere Liste', parseQuellen({ _hinweis: 'x', tiktok: [], youtube: [] }), { tiktok: [], youtube: [], abgelehnt: [] });
pruef('Quelle fehlt ganz -> nichts, kein Absturz', parseQuellen({}).tiktok.length + parseQuellen({}).youtube.length, 0);
pruef('Quelle ist kein Objekt', parseQuellen(null).abgelehnt.length, 1);

// ── 5. Liste bilden ──
pruef('baueListe: leere Eingabe -> leere Liste', baueListe([]), []);
pruef('baueListe: keine Liste -> leere Liste', baueListe(null), []);
const d1 = { plattform: 'tiktok', titel: 'Eins', url: ttUrl('2026-10-01T00:00:00Z'), vorschau: 'https://x/1.jpg', datum: '2026-10-01T00:00:00Z' };
pruef('DOPPELTE Adresse kommt einmal', baueListe([d1, { ...d1, titel: 'Zwei' }]).map((e) => e.titel), ['Eins']);
pruef('dasselbe YouTube-Video unter zwei Adressen = einmal',
  baueListe([
    { plattform: 'youtube', titel: 'A', url: 'https://youtu.be/dQw4w9WgXcQ', vorschau: '' },
    { plattform: 'youtube', titel: 'B', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=9', vorschau: '' }]).length, 1);
pruef('TikTok mit Tracking-Parameter = dasselbe Video', dublettenSchluessel(d1.url + '?_r=1'), dublettenSchluessel(d1.url));
pruef('FREMDE Domain fliegt aus der Liste', baueListe([{ plattform: 'tiktok', titel: 'x', url: 'https://evil.example/a', vorschau: '' }]), []);
pruef('Plattform folgt der Adresse, nicht dem Feld',
  baueListe([{ plattform: 'youtube', titel: 'x', url: ttUrl('2026-10-01T00:00:00Z'), vorschau: '' }])[0].plattform, 'tiktok');
pruef('Vorschau nur über https', baueListe([{ ...d1, vorschau: 'http://x/1.jpg' }])[0].vorschau, '');
const reihe = baueListe([
  { plattform: 'tiktok', titel: 'alt', url: ttUrl('2026-01-05T00:00:00Z'), vorschau: '', datum: tiktokDatum(ttId('2026-01-05T00:00:00Z')) },
  { plattform: 'youtube', titel: 'neu', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', vorschau: '', datum: '2026-10-20T10:00:00Z' },
  { plattform: 'tiktok', titel: 'mitte', url: ttUrl('2026-06-05T00:00:00Z'), vorschau: '', datum: tiktokDatum(ttId('2026-06-05T00:00:00Z')) },
  { plattform: 'youtube', titel: 'ohneDatum', url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', vorschau: '' },
]).map((e) => e.titel);
pruef('NEUESTE zuerst (TikTok-Datum aus der ID, YouTube aus dem Feed), ohne Datum hinten', reihe, ['neu', 'mitte', 'alt', 'ohneDatum']);
const viele = Array.from({ length: 20 }, (_, i) => ({ plattform: 'youtube', titel: 't' + i, url: `https://www.youtube.com/watch?v=${String(i).padStart(11, 'x')}`, vorschau: '', datum: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() }));
pruef(`HÖCHSTENS ${MAX_EINTRAEGE} Einträge`, baueListe(viele).length, MAX_EINTRAEGE);
pruef('Höchstzahl lässt sich nicht über 12 heben', baueListe(viele, 99).length, MAX_EINTRAEGE);
pruef('Reihenfolge nach Kürzen: die neuesten bleiben', baueListe(viele)[0].titel, 't19');
pruef('Ausgabe trägt genau vier Felder', Object.keys(baueListe([d1])[0]), ['plattform', 'titel', 'url', 'vorschau']);
pruef('TikTok-Datum unplausibel (zu klein) -> null', tiktokDatum('12345678'), null);
pruef('TikTok-Datum aus ID', tiktokDatum(ttId('2026-06-05T00:00:00Z')), '2026-06-05T00:00:00.000Z');

// ── 6. Titel ──
pruef('Titel: HTML wird zu Text', saubererTitel('<b>Neu</b> im   Shop'), 'Neu im Shop');
pruef('Titel: Hashtag-Schwanz fällt weg', saubererTitel('Herbst-Looks #mode #herbst #luxestyle'), 'Herbst-Looks');
pruef('Titel: zwei Hashtags bleiben', saubererTitel('Look #mode #herbst'), 'Look #mode #herbst');
pruef('Titel: lang -> gekürzt mit Auslassung', saubererTitel('Wort '.repeat(60)).length <= 140 && saubererTitel('Wort '.repeat(60)).endsWith('…'), true);
pruef('Titel: leer -> Ersatz', saubererTitel('  ', 'Ersatz'), 'Ersatz');

// ── 7. oEmbed / Feed ──
const tt = eintragAusTiktok(ttUrl('2026-10-01T00:00:00Z'), { title: 'Schau mal #a #b #c', thumbnail_url: 'https://p16.tiktokcdn.com/x.jpeg' });
pruef('TikTok-Eintrag: Titel, Vorschau, Datum', [tt.titel, tt.vorschau, tt.datum], ['Schau mal', 'https://p16.tiktokcdn.com/x.jpeg', '2026-10-01T00:00:00.000Z']);
pruef('TikTok-Eintrag ohne Antwortfelder bekommt Ersatztitel', eintragAusTiktok(ttUrl('2026-10-01T00:00:00Z'), {}).titel, 'TikTok-Video von LuxeStyle');
pruef('TikTok-Eintrag: fremde Adresse -> null', eintragAusTiktok('https://evil.example/x', { title: 'x' }), null);
const xml = (n) => `<?xml version="1.0"?><feed xmlns:yt="y" xmlns:media="m">${Array.from({ length: n }, (_, i) => `
 <entry><id>yt:video:${String(i).padStart(11, 'a')}</id><yt:videoId>${String(i).padStart(11, 'a')}</yt:videoId>
 <title>Video &amp; Nr. ${i} &quot;neu&quot;</title><link rel="alternate" href="https://www.youtube.com/watch?v=${String(i).padStart(11, 'a')}"/>
 <published>2026-10-${String(1 + i).padStart(2, '0')}T08:00:00+00:00</published>
 <media:group><media:thumbnail url="https://i.ytimg.com/vi/${String(i).padStart(11, 'a')}/hqdefault.jpg" width="480" height="360"/></media:group></entry>`).join('')}</feed>`;
const f = parseYoutubeFeed(xml(9));
pruef('Feed: neueste 6 von 9', f.map((e) => e.titel.slice(0, 13)).slice(0, 2), ['Video & Nr. 8', 'Video & Nr. 7']);
pruef('Feed: genau 6 Einträge', f.length, 6);
pruef('Feed: Entitäten gelesen', f[0].titel, 'Video & Nr. 8 "neu"');
pruef('Feed: Vorschau aus dem Feed', f[0].vorschau, 'https://i.ytimg.com/vi/aaaaaaaaaa8/hqdefault.jpg');
pruef('Feed: leer / kaputt -> leere Liste, kein Absturz', [parseYoutubeFeed('').length, parseYoutubeFeed('<html>').length, parseYoutubeFeed(null).length], [0, 0, 0]);
pruef('Feed: Eintrag mit kaputter Video-ID wird übersprungen', parseYoutubeFeed('<entry><yt:videoId>kurz</yt:videoId><title>x</title></entry>').length, 0);
pruef('YouTube-Video ohne oEmbed: Vorschau aus der ID', eintragAusYoutubeVideo('https://youtu.be/dQw4w9WgXcQ', null).vorschau, 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
pruef('YouTube-Vorschau-Adresse', youtubeVorschau('abcdefghijk'), 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg');
pruef('xmlText: numerische Entität', xmlText('a&#38;b &#x26; c'), 'a&b & c');

// ── 8. Schreib-Sicherung ──
const gut = baueListe([d1]);
pruef('pruefeListe: gültige Liste', pruefeListe(gut).ok, true);
pruef('pruefeListe: fremde Adresse', pruefeListe([{ plattform: 'tiktok', titel: 'x', url: 'https://evil.example/a', vorschau: '' }]).ok, false);
pruef('pruefeListe: Plattform passt nicht zur Adresse', pruefeListe([{ ...gut[0], plattform: 'youtube' }]).ok, false);
pruef('pruefeListe: mehr als 12', pruefeListe(Array.from({ length: 13 }, () => gut[0])).ok, false);
pruef('pruefeListe: kein Titel', pruefeListe([{ ...gut[0], titel: '' }]).ok, false);
pruef('pruefeListe: Vorschau http', pruefeListe([{ ...gut[0], vorschau: 'http://x/y.jpg' }]).ok, false);
pruef('pruefeListe: keine Liste', pruefeListe({}).ok, false);
pruef('Schreiben: gute Liste ja', darfSchreiben(gut, { quellen: 2, ausgefallen: 1 }).ja, true);
pruef('Schreiben: LEERE Liste nein (würde die bisherige ersetzen)', darfSchreiben([], { quellen: 0 }).ja, false);
pruef('Schreiben: über die Hälfte der Quellen ausgefallen -> nein', darfSchreiben(gut, { quellen: 4, ausgefallen: 3 }).ja, false);
pruef('Schreiben: genau die Hälfte ausgefallen -> ja', darfSchreiben(gut, { quellen: 4, ausgefallen: 2 }).ja, true);
pruef('Schreiben: trotzdem erzwingt auch die leere Liste', darfSchreiben([], { trotzdem: true }).ja, true);
pruef('Schreiben: trotzdem hebelt die Gültigkeitsprüfung NICHT aus',
  darfSchreiben([{ plattform: 'tiktok', titel: 'x', url: 'https://evil.example/a', vorschau: '' }], { trotzdem: true }).ja, false);
const e = metafieldsSetEingabe('gid://shopify/Shop/1', gut)[0];
pruef('metafieldsSet: Namensraum, Schlüssel, Typ', [e.ownerId, e.namespace, e.key, e.type], ['gid://shopify/Shop/1', NAMESPACE, KEY, 'json']);
pruef('metafieldsSet: Wert ist die Liste als JSON-Text (verlustfrei)', JSON.parse(e.value), gut);

// ── 9. Netz: 429/5xx nachfassen, Fehler überspringen (fetch nachgebaut) ──
const antwort = (status, body = '') => ({ status, text: async () => body });
const keinWarten = () => Promise.resolve();
{
  let n = 0;
  const r = await holeMitGeduld('https://x/', { fetch: async () => (++n < 3 ? antwort(429) : antwort(200, 'ok')), warte: keinWarten });
  pruef('429 zweimal, dann 200: Erfolg nach 2 Nachfassungen', [r.ok, r.nachgefasst, n], [true, 2, 3]);
}
{
  let n = 0;
  const r = await holeMitGeduld('https://x/', { fetch: async () => (++n, antwort(404)), warte: keinWarten });
  pruef('404 wird NICHT nachgefasst', [r.ok, n], [false, 1]);
}
{
  let n = 0;
  const r = await holeMitGeduld('https://x/', { fetch: async () => (++n, antwort(503)), warte: keinWarten, versuche: 3 });
  pruef('503 dauerhaft: nach 3 Versuchen aufgegeben, mit Grund', [r.ok, n, r.fehler], [false, 3, 'HTTP 503']);
}
{
  const r = await holeMitGeduld('https://x/', { fetch: async () => { throw new Error('ECONNRESET'); }, warte: keinWarten, versuche: 2 });
  pruef('Netzfehler wird gemeldet, nicht geworfen', [r.ok, /ECONNRESET/.test(r.fehler)], [false, true]);
}
{
  // Ein Eintrag fällt aus (404), die anderen laufen weiter; ein Kanal-Feed und ein Einzelvideo kommen durch.
  const gutTt = ttUrl('2026-10-02T00:00:00Z'), kaputtTt = ttUrl('2026-10-03T00:00:00Z');
  const fetchFn = async (url) => {
    if (url.startsWith('https://www.tiktok.com/oembed')) {
      if (decodeURIComponent(url).includes(kaputtTt)) return antwort(404, 'nicht gefunden');
      return antwort(200, JSON.stringify({ title: 'Gutes Video', thumbnail_url: 'https://p16.tiktokcdn.com/a.jpeg' }));
    }
    if (url.startsWith('https://www.youtube.com/feeds/videos.xml')) return antwort(200, xml(3));
    if (url.startsWith('https://www.youtube.com/oembed')) return antwort(200, JSON.stringify({ title: 'Einzelvideo' }));
    return antwort(500);
  };
  const { liste, bericht } = await sammle({ tiktok: [gutTt, kaputtTt, 'https://evil.example/x'], youtube: ['UCabcdefghijklmnopqrstuv', 'https://youtu.be/dQw4w9WgXcQ'] }, { fetch: fetchFn, warte: keinWarten });
  pruef('sammle: ein 404 bricht den Lauf nicht ab', bericht.uebersprungen.map((u) => u.grund), ['HTTP 404']);
  pruef('sammle: der ausgefallene Eintrag wird genannt', bericht.uebersprungen[0].quelle, kaputtTt);
  pruef('sammle: die fremde Adresse steht bei den Abgelehnten', bericht.abgelehnt.map((a) => a.quelle), ['https://evil.example/x']);
  pruef('sammle: 1 + 3 + 1 Einträge, kaputter und fremder fehlen', liste.length, 5);
  pruef('sammle: neueste zuerst (Feed-Videos Oktober 2026 vor dem undatierten Einzelvideo)', liste[0].plattform + ':' + liste[liste.length - 1].titel, 'youtube:Einzelvideo');
  pruef('sammle: Ergebnis besteht die Schreib-Prüfung', pruefeListe(liste).ok, true);
  pruef('sammle: 1 von 4 echten Quellen ausgefallen -> Schreiben erlaubt', darfSchreiben(liste, { quellen: bericht.quellen, ausgefallen: bericht.ausgefallen }).ja, true);
}
{
  // YouTube-Einzelvideo: 404 bei oEmbed = Video gibt es nicht -> nicht in die Liste; 503 = Störung -> Video bleibt (Ersatztitel).
  const fn = (status) => async (url) => (url.startsWith('https://www.youtube.com/oembed') ? antwort(status, '') : antwort(500));
  const weg = await sammle({ youtube: ['https://youtu.be/00000000000'] }, { fetch: fn(404), warte: keinWarten });
  pruef('YouTube-Video 404: nicht in der Liste, im Bericht genannt', [weg.liste.length, weg.bericht.uebersprungen.length], [0, 1]);
  const stoerung = await sammle({ youtube: ['https://youtu.be/dQw4w9WgXcQ'] }, { fetch: fn(503), warte: keinWarten, versuche: 2 });
  pruef('YouTube-Video bei Störung (503): bleibt mit Ersatztitel', [stoerung.liste.length, stoerung.liste[0]?.titel], [1, 'YouTube-Video von LuxeStyle']);
}
{
  const { liste, bericht } = await sammle({ tiktok: [], youtube: [] }, { fetch: async () => { throw new Error('darf nicht gerufen werden'); } });
  pruef('sammle: leere Quelle -> leere Liste, kein Netzzugriff', [liste, bericht.quellen], [[], 0]);
}
{
  // Alle Quellen fallen aus (z. B. TikTok sperrt den Abruf): die Liste ist leer, das Schreiben wird verweigert.
  const { liste, bericht } = await sammle({ tiktok: [ttUrl('2026-10-02T00:00:00Z')], youtube: [] }, { fetch: async () => antwort(500), warte: keinWarten, versuche: 2 });
  pruef('sammle: alles fällt aus -> leere Liste', liste, []);
  pruef('sammle: alles fällt aus -> kein Schreiben', darfSchreiben(liste, { quellen: bericht.quellen, ausgefallen: bericht.ausgefallen }).ja, false);
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
