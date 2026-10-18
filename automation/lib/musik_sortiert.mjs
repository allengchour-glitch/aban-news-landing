/* musik_sortiert.mjs — die Poster nehmen nicht blind das nächste ready-Reel, sondern eines, dessen Musik gerade NICHT lief.
 *
 * Betreiber 18.10.2026 («immer das gleiche ist nervend»). Messung (Wiederholungs-Audit, Metricool-Planer ⨝ social/_musik_verlauf.txt,
 * 99 veröffentlichte Videos): 29 % tragen ein Stück, das schon unter den 3 davor lief, auf TikTok 43 %; 25 identische (Stück,
 * Fenster)-Paare innerhalb von 24 h. Die Poster kannten die Musik der Reels nicht.
 *
 * Regel (Strafpunkte, kleinster zuerst, stabil — die bisherige Reihenfolge samt Saison-Vorrang bleibt, wo nichts anliegt):
 *   100  dasselbe Stück wie das zuletzt gepostete Reel (egal welches Netz — dasselbe Publikum sieht alle Netze)
 *    50  Stück unter den letzten 2 dieses Netzes
 *    20  dasselbe (Stück, Fenster)-Paar (Einstieg ±9 s) in den letzten 14 Tagen
 * Nur die ersten `FENSTER_KANDIDATEN` Reels der Reihe werden umgeordnet; Reels ohne Verlaufszeile (alt, ChatGPT, Montage) sind neutral.
 * «gepostet» = Zeilen der Queue mit Status posted* (posted_at = Zeitpunkt der PLANUNG; der 7-Tage-Planer plant zeitlich vorwärts,
 * die Reihenfolge entspricht also der Veröffentlichung). Bei jedem Fehler: Reihenfolge unverändert.
 */
import fs from 'node:fs';

export const FENSTER_KANDIDATEN = 15, PAAR_ABSTAND_S = 9, PAAR_TAGE = 14;

/** social/_musik_verlauf.txt → Map(reelId → {datei, start}); spätere Zeilen überschreiben frühere (Neu-Rendern). */
export function verlaufLesen(pfad = 'social/_musik_verlauf.txt') {
  const m = new Map();
  try {
    for (const z of fs.readFileSync(pfad, 'utf8').split('\n')) {
      const f = z.split('\t');
      if (f.length < 5 || !f[1] || !f[4]) continue;
      m.set(f[4].trim(), { datei: f[1].trim(), start: parseFloat(f[2]) || 0 });
    }
  } catch { /* ohne Verlauf: neutral */ }
  return m;
}

/**
 * @param reihe   Array von Queue-Zeilen (wird IN PLACE umgeordnet)
 * @param o       { id(r)->string, gepostet:[{id,netz,t}] (alle Netze), netz, verlauf:Map, jetztMs }
 * @returns       { bewegt:boolean, info:string }
 */
export function musikSortieren(reihe, o) {
  const { id, gepostet, netz, verlauf, jetztMs = Date.now() } = o;
  try {
    if (!reihe.length || !verlauf || !verlauf.size) return { bewegt: false, info: 'ohne Verlauf' };
    const post = [...gepostet].sort((a, b) => a.t - b.t).map(g => ({ ...g, m: verlauf.get(g.id) })).filter(g => g.m);
    if (!post.length) return { bewegt: false, info: 'keine gepostete Musik bekannt' };
    const letztes = post[post.length - 1].m.datei;
    const letzte2Netz = new Set(post.filter(g => g.netz === netz).slice(-2).map(g => g.m.datei));
    const paare = post.filter(g => jetztMs - g.t <= PAAR_TAGE * 864e5).map(g => g.m);
    const strafe = r => {
      const m = verlauf.get(id(r));
      if (!m) return 0;
      let s = 0;
      if (m.datei === letztes) s += 100;
      if (letzte2Netz.has(m.datei)) s += 50;
      if (paare.some(p => p.datei === m.datei && Math.abs(p.start - m.start) < PAAR_ABSTAND_S)) s += 20;
      return s;
    };
    const kopf = reihe.slice(0, FENSTER_KANDIDATEN), rest = reihe.slice(FENSTER_KANDIDATEN);
    const bew = kopf.map((r, i) => ({ r, i, s: strafe(r) }));
    bew.sort((a, b) => (a.s - b.s) || (a.i - b.i));   // stabil
    const neu = bew.map(b => b.r), bewegt = neu.some((r, i) => r !== kopf[i]);
    if (bewegt) reihe.splice(0, reihe.length, ...neu, ...rest);
    const erster = bew[0];
    return { bewegt, info: `Musik-Sortierung (${netz}): letztes Stück ${letztes}${bewegt ? `, erstes Reel jetzt ${id(erster.r)} (Strafe ${erster.s}, vorher Platz ${erster.i + 1})` : ', Reihenfolge unverändert'}` };
  } catch (e) { return { bewegt: false, info: 'Musik-Sortierung übersprungen: ' + String(e.message || e).slice(0, 100) }; }
}

export function selbsttest() {
  const T = 1_790_000_000_000, h = n => T - n * 3.6e6;
  const verlauf = new Map([['a', { datei: 'x.wav', start: 10 }], ['b', { datei: 'y.wav', start: 5 }], ['c', { datei: 'x.wav', start: 40 }],
    ['d', { datei: 'z.wav', start: 5 }], ['e', { datei: 'y.wav', start: 5 }], ['f', { datei: 'w.wav', start: 0 }]]);
  const zeile = i => ({ id: i }), id = r => r.id;
  const fehler = [];
  const t = (name, soll, ist) => { if (JSON.stringify(soll) !== JSON.stringify(ist)) fehler.push(`${name}: erwartet ${JSON.stringify(soll)}, gemessen ${JSON.stringify(ist)}`); };
  // zuletzt (alle Netze) lief x.wav; auf diesem Netz (tiktok) lief y.wav; Paar (y,5) vor 5 h
  const gp = [{ id: 'b', netz: 'tiktok', t: h(5) }, { id: 'a', netz: 'instagram', t: h(1) }];
  let r = ['a', 'c', 'b', 'd', 'f'].map(zeile);
  let o = musikSortieren(r, { id, gepostet: gp, netz: 'tiktok', verlauf, jetztMs: T });
  // a = x.wav@10 (100 + Paar 20) · c = x.wav@40 (100) · b = y.wav (50+20) · d,f = 0 → d, f vorn, dann b (70), c (100), a (120)
  t('Reihenfolge', ['d', 'f', 'b', 'c', 'a'], r.map(id)); t('bewegt', true, o.bewegt);
  // nichts gepostet → unverändert
  r = ['a', 'b'].map(zeile); o = musikSortieren(r, { id, gepostet: [], netz: 'tiktok', verlauf, jetztMs: T });
  t('leer', ['a', 'b'], r.map(id)); t('leer bewegt', false, o.bewegt);
  // Reel ohne Verlaufszeile ist neutral und behält seinen Platz vor Strafen
  r = ['unbekannt', 'a', 'd'].map(zeile); musikSortieren(r, { id, gepostet: gp, netz: 'tiktok', verlauf, jetztMs: T });
  t('neutral', ['unbekannt', 'd', 'a'], r.map(id));
  // Paar älter als 14 Tage zählt nicht
  r = ['e', 'f'].map(zeile); musikSortieren(r, { id, gepostet: [{ id: 'b', netz: 'instagram', t: h(15 * 24) }, { id: 'f', netz: 'instagram', t: h(1) }], netz: 'tiktok', verlauf, jetztMs: T });
  t('altes Paar', ['e', 'f'], r.map(id));
  // Fenster: nur die ersten 15 werden bewegt
  r = Array.from({ length: 20 }, (_, i) => zeile('n' + i)); r[15] = zeile('a');
  musikSortieren(r, { id, gepostet: gp, netz: 'tiktok', verlauf, jetztMs: T });
  t('Rest bleibt', 'a', r[15].id);
  // kaputte Eingabe → keine Ausnahme, keine Änderung
  r = ['a'].map(zeile); o = musikSortieren(r, { id, gepostet: null, netz: 'tiktok', verlauf, jetztMs: T });
  t('Fehler', false, o.bewegt);
  console.log('SELBSTTEST musik_sortiert:', fehler.length ? 'FEHLER ' + fehler.join('; ') : 'OK (6 Fälle)');
  return fehler.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--selbsttest')) process.exit(selbsttest());
