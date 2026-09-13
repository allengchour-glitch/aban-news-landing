#!/usr/bin/env node
/**
 * yt_lernen.mjs — holt die auswertbaren Teile einer YouTube-Seite: Titel, Kanal, Datum,
 * Aufrufe und die vollstaendige Beschreibung samt Kapitelmarken.
 *
 *   node tools/yt_lernen.mjs --selbsttest
 *   node tools/yt_lernen.mjs <videoId|url> [...]        kurz
 *   node tools/yt_lernen.mjs --voll <videoId|url> [...] mit ganzer Beschreibung
 *
 * WARUM (2026-09-13 teuer gelernt): **Transkripte gibt YouTube aus diesem Container nicht
 * mehr heraus.** `captionTracks` steht zwar im HTML, aber der `timedtext`-Abruf liefert
 * HTTP 200 mit **0 Bytes** — in jedem Format (srv1, vtt, json3, tlang). Die Innertube-API
 * antwortet `UNPLAYABLE` (WEB) bzw. `FAILED_PRECONDITION` (ANDROID); YouTube verlangt ein
 * PO-Token. Und **`WebFetch` auf eine YouTube-Seite ist nutzlos** — es kommt nur die leere
 * Hülle der Anwendung zurück, keine Videodaten.
 *
 * WAS STATTDESSEN GEHT: die Seite per `fetch` mit Browser-Kennung holen (rund 1,3 MB HTML)
 * und `shortDescription` herausschneiden. Bei diesen Kanaelen stehen dort die **Kapitelmarken**
 * mit Minutenangaben — das ist fast so gut wie ein Transkript und kostet ein Tausendstel.
 *
 * ⚠️ Eine Antwort unter 50 000 Bytes ist KEINE Videoseite (Einwilligungs- oder Fehlerseite).
 *    Das Werkzeug meldet das, statt leere Felder als Ergebnis auszugeben.
 */

const KOPF = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'accept-language': 'de-CH,de;q=0.9,en;q=0.8',
  // Ohne diesen Keks liefert YouTube eine Einwilligungsseite, die GROESSER als 50 000 Bytes
  // ist und den Titel „Like this video?" traegt — 2026-09-13 in die Falle getreten.
  cookie: 'CONSENT=YES+cb; SOCS=CAI',
};

export function videoId(s) {
  const m = String(s).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(s).trim()) ? String(s).trim() : null);
}

/** JSON-Stringliteral aus dem Seitenquelltext entpacken (&, \n, Emoji …). */
export function entpacke(roh) {
  try { return JSON.parse('"' + roh.replace(/"/g, '\\"') + '"'); }
  catch { return roh; }
}

/**
 * Eine Videoseite erkennt man NICHT an ihrer Groesse. Die Einwilligungsseite ist ebenfalls
 * gross und faellt durch jede Laengenpruefung — sie traegt nur den Titel „Like this video?"
 * und hat weder Beschreibung noch Aufrufzahl. Darum wird auf die Felder geprueft, die eine
 * echte Videoseite haben MUSS.
 */
export function istVideoseite(html) {
  return /"shortDescription":"/.test(html) && /"viewCount":"\d+"/.test(html);
}

export function auswerten(html) {
  const g = (re) => { const m = html.match(re); return m ? m[1] : ''; };
  const beschreibung = entpacke(g(/"shortDescription":"([\s\S]*?)","isCrawlable"/));
  return {
    titel: entpacke(g(/"title":\{"simpleText":"(.*?)"/)) || entpacke(g(/<title>(.*?)<\/title>/)),
    kanal: entpacke(g(/"ownerChannelName":"(.*?)"/)),
    datum: (g(/"uploadDate":"(.*?)"/) || g(/"publishDate":"(.*?)"/)).slice(0, 10),
    aufrufe: Number(g(/"viewCount":"(\d+)"/) || 0),
    dauer_s: Number(g(/"lengthSeconds":"(\d+)"/) || 0),
    beschreibung,
    kapitel: [...beschreibung.matchAll(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.{3,90})$/gm)]
      .map(m => `${m[1]} ${m[2].trim()}`),
  };
}

async function hole(id) {
  const r = await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: KOPF });
  const html = await r.text();
  if (r.status === 429) {
    // 2026-09-13 gemessen: nach etwa einem Dutzend Abrufen drosselt YouTube. Die Antwort ist
    // dann trotzdem gross — darum den Statuscode nennen und NICHT als Inhalt auswerten.
    throw new Error(`HTTP 429 — YouTube drosselt. Spaeter erneut, weniger Abrufe am Stueck.`);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!istVideoseite(html)) {
    throw new Error(`keine Videoseite (${html.length} Bytes, Einwilligungs- oder Fehlerseite)`);
  }
  return html;
}

function selbsttest() {
  console.log('Selbsttest yt_lernen.mjs\n' + '-'.repeat(60));
  let fehler = 0;
  const p = (ok, was) => { console.log(`  ${ok ? 'OK ' : 'FEHLER'} ${was}`); fehler += ok ? 0 : 1; };

  p(videoId('https://www.youtube.com/watch?v=Ih5RapM8XKw') === 'Ih5RapM8XKw', 'ID aus voller Adresse');
  p(videoId('https://youtu.be/Ih5RapM8XKw?t=30') === 'Ih5RapM8XKw', 'ID aus Kurzadresse');
  p(videoId('Ih5RapM8XKw') === 'Ih5RapM8XKw', 'blosse ID');
  p(videoId('kein video') === null, 'Gegenprobe: Unsinn ergibt keine ID');

  const html = '"title":{"simpleText":"Test \\u0026 Co"},"ownerChannelName":"Kanal",' +
    '"uploadDate":"2026-07-13T08:00:06-07:00","viewCount":"106388","lengthSeconds":"420",' +
    '"shortDescription":"Erster Satz.\\n\\nChapters:\\n0:00 Intro\\n3:39 Kapitel zwei\\n12:05 Schluss","isCrawlable":true';
  const a = auswerten(html);
  p(a.titel === 'Test & Co', `Titel entpackt: ${a.titel}`);
  p(a.kanal === 'Kanal' && a.datum === '2026-07-13', `Kanal und Datum: ${a.kanal} ${a.datum}`);
  p(a.aufrufe === 106388 && a.dauer_s === 420, `Aufrufe und Dauer: ${a.aufrufe} / ${a.dauer_s}s`);
  p(a.kapitel.length === 3, `Kapitelmarken gefunden: ${a.kapitel.length}`);
  p(a.kapitel[1] === '3:39 Kapitel zwei', `zweite Marke: ${a.kapitel[1]}`);

  p(istVideoseite(html), 'echte Videoseite wird erkannt');
  p(!istVideoseite('<title>Like this video?</title>' + 'x'.repeat(80000)),
    'Gegenprobe: die grosse Einwilligungsseite gilt NICHT als Videoseite');
  p(!istVideoseite('"shortDescription":"da"'), 'Gegenprobe: Beschreibung allein reicht nicht');

  const leer = auswerten('"shortDescription":"Nur Text ohne Marken","isCrawlable"');
  p(leer.kapitel.length === 0, 'Gegenprobe: Beschreibung ohne Marken ergibt keine Kapitel');
  const falsch = auswerten('"shortDescription":"Preis 19:90 im Angebot","isCrawlable"');
  p(falsch.kapitel.length === 0, 'Gegenprobe: „19:90" mitten im Satz ist keine Kapitelmarke');

  console.log('-'.repeat(60));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selbsttest')) process.exit(selbsttest());
  const voll = argv.includes('--voll');
  for (const arg of argv.filter(a => !a.startsWith('--'))) {
    const id = videoId(arg);
    if (!id) { console.log(`\n${arg}\n  keine Video-ID erkennbar`); continue; }
    try {
      const a = auswerten(await hole(id));
      const min = Math.round(a.dauer_s / 60);
      console.log(`\n${'='.repeat(72)}\n${a.titel}`);
      console.log(`${a.kanal} · ${a.datum} · ${a.aufrufe.toLocaleString('de-CH')} Aufrufe · ${min} Min · ${id}`);
      if (a.kapitel.length) {
        console.log(`\nKapitel (${a.kapitel.length}):`);
        for (const k of a.kapitel) console.log('  ' + k);
      } else {
        console.log('\n(keine Kapitelmarken)');
      }
      if (voll) console.log('\nBeschreibung:\n' + a.beschreibung.slice(0, 2500));
    } catch (e) {
      console.log(`\n${id}\n  FEHLER: ${e.message}`);
    }
  }
}
