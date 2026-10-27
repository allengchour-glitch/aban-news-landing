// Tests für den reinen Plan der Lieferzeit-Korrektur (kein Netz). Die Texte sind die echten Live-Texte vom 27.10.2026.
import { planeText, ALT, ALT_PROFIL, NEU } from './lieferzeit_fortura.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };

const KOPF = '<p>Herzförmige Tasche braun Bayern</p><h4>Details</h4><ul>\n<li>\n<strong>Marke:</strong> Haus Huberts</li>\n</ul><h4>Warum bei LuxeStyle kaufen?</h4><ul>\n';
const REST = '\n\n<li>↩️ 30 Tage Rückgaberecht</li>\n<li>🔒 Kauf auf Rechnung mit Klarna · TWINT · Karten · PayPal · Apple Pay</li>\n<li>💬 Schweizer Support: info@luxestyle.ch</li>\n</ul><!-- ls-xsell-v1 --><p><strong>🛍️ Das könnte dir auch gefallen:</strong> <a href="/collections/damen-mode">Damenmode</a></p>';
const alt = `${KOPF}<li>🇨🇭 ${ALT}</li>${REST}`;

const p = planeText(alt);
ist('Fortura-Text wird ersetzt', p.art, 'ersetzen');
ist('Nur der eine Satz ändert sich: Rückweg ergibt den Originaltext', p.neu.replace(NEU, ALT), alt);
ist('Neuer Satz steht genau einmal, alter nicht mehr', [p.neu.split(NEU).length - 1, p.neu.includes('1–2 Werktagen')], [1, false]);
ist('Der neue Satz enthält keine Zahlenspanne', /\d\s*[–-]\s*\d/.test(NEU), false);
ist('Der neue Satz verweist auf Artikel und Kasse', /beim Artikel und in der Kasse/.test(NEU), true);
ist('Idempotent: auf dem Ergebnis ist nichts mehr zu tun', planeText(p.neu).art, 'sauber');
ist('Text ohne Lieferzeit (Draft ohne Block) → sauber', planeText('<p>Kleid</p><h4>Details</h4>').art, 'sauber');
ist('Leer / null / undefined → sauber', [planeText('').art, planeText(null).art, planeText(undefined).art], ['sauber', 'sauber', 'sauber']);

// Das «$» im Ersatz darf nicht als Muster gelten (replace mit Funktion)
ist('Ersetzen mit «$&» im Rest des Textes bleibt unverändert', planeText(alt + '<p>Preis $& $1</p>').neu.endsWith('<p>Preis $& $1</p>'), true);

// Gegenproben: nichts schreiben
ist('Gegenprobe: derselbe Satz zweimal → Sonderfall', planeText(alt + `<li>${ALT}</li>`).art, 'sonderfall');
ist('Gegenprobe: zweite Kurz-Zusage im Text → Sonderfall', planeText(`${alt}<p>Wir liefern in 1–2 Werktagen.</p>`).art, 'sonderfall');
ist('Gegenprobe: «ein bis zwei Werktagen» → Sonderfall', planeText(`${alt}<p>Du hast es in ein bis zwei Werktagen.</p>`).art, 'sonderfall');
ist('Gegenprobe: andere Kurz-Zusage OHNE den Importer-Satz → Sonderfall', planeText('<p>Lieferung in nur 1–2 Werktagen</p>').art, 'sonderfall');
ist('Gegenprobe: abweichender Wortlaut «Versand aus der Schweiz» → Sonderfall', planeText('<li>🇨🇭 <strong>Versand aus der Schweiz</strong> – Lieferung in nur 2 Werktagen (DPD)</li>').art, 'sonderfall');
ist('Gegenprobe: 1–2 mit Bindestrich/HTML-Entity wird erkannt', [planeText('<p>1-2 Werktage</p>').art, planeText('<p>1&ndash;2 Werktage</p>').art], ['sonderfall', 'sonderfall']);

// Gegenproben: Zahlen, die KEINE Lieferzusage sind, blockieren nicht
ist('Gegenprobe: «11–25 Werktage» ist keine Kurz-Zusage', planeText('<p>Lieferung 11–25 Werktage</p>').art, 'sauber');
ist('Gegenprobe: eine andere «2–3 Werktage»-Angabe (nicht der Importer-Satz) bleibt sauber', planeText('<p>Lieferung meist 2–3 Werktage</p>').art, 'sauber');

// Der neue Importer-Satz (seit 13.10.) ist ausserhalb des Profils «CH-Lager» ebenso falsch: Seite und Kasse zeigen dort das lange Datum.
const profilSatz = '<li>🇨🇭 <strong>Versand ab Schweizer Lager</strong> mit DPD, meist in 2–3 Werktagen bei dir</li>';
const alt2 = `${KOPF}${profilSatz}${REST}`;
const p2 = planeText(alt2);
ist('Importer-Satz «meist in 2–3 Werktagen bei dir» wird ausserhalb des Profils ersetzt', p2.art, 'ersetzen');
ist('Rückweg ergibt den Originaltext (2–3)', p2.neu.replace(NEU, ALT_PROFIL), alt2);
ist('Ergebnis aus dem 2–3-Satz ist idempotent', planeText(p2.neu).art, 'sauber');
ist('Beide Sätze im selben Text → Sonderfall', planeText(`${alt}${profilSatz}`).art, 'sonderfall');
ist('Leerzeichen zwischen den Listenpunkten (Megafon-Fall) ändert nichts', planeText('<ul>\n<li>🇨🇭 <strong>Versand ab Schweizer Lager</strong> mit DPD, meist in 2–3 Werktagen bei dir</li> <li>↩️ 30 Tage Rückgaberecht</li>\n</ul>').art, 'ersetzen');
ist('Gegenprobe: Satz mit anderer Zahl «meist in 3–4 Werktagen» ist unbekannt → bleibt sauber (nicht raten)', planeText('<li><strong>Versand ab Schweizer Lager</strong> mit DPD, meist in 3–4 Werktagen bei dir</li>').art, 'sauber');
ist('Gegenprobe: «Grösse 1–2 Jahre» ist kein Werktag', planeText('<p>Für Kinder von 1–2 Jahren</p>').art, 'sauber');
ist('Gegenprobe: «Set aus 1–2 Teilen» ist kein Tag', planeText('<p>Set aus 1–2 Teilen</p>').art, 'sauber');
ist('Gegenprobe: «Durchmesser 11–2» wird nicht als 1–2 gelesen', planeText('<p>Mass 11–2 Tage</p>').art, 'sauber');

console.log(`${ok} ok, ${fehl} Fehler`);
if (fehl) process.exit(1);
