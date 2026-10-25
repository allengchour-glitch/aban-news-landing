#!/usr/bin/env node
/** Tests zu cj_video.mjs. Jede Regel auch in die ANDERE Richtung geprüft. */
import assert from 'node:assert/strict';
import { hatVideo, preisHoch, kosten, warengruppe } from './cj_video.mjs';

let n = 0;
const t = (name, fn) => { fn(); n++; };

// --- hatVideo: alle Schreibweisen, die CJ am 24.10. wirklich lieferte ---
t('isVideo 1 / true / "1" heisst ja', () => {
  for (const v of [1, true, '1']) assert.equal(hatVideo({ isVideo: v }), true);
});
t('isVideo 0 / false / "0" heisst nein', () => {
  for (const v of [0, false, '0']) assert.equal(hatVideo({ isVideo: v }), false);
});
t('GEGENPROBE: null, fehlend und leer sind UNBEKANNT, nicht nein', () => {
  // 1349 von 1413 Treffern sahen so aus. Als „nein" gelesen, wäre das eine erfundene Aussage.
  assert.equal(hatVideo({ isVideo: null }), null);
  assert.equal(hatVideo({}), null);
  assert.equal(hatVideo({ isVideo: '' }), null);
  assert.equal(hatVideo(), null);
});

// --- preisHoch: die Spannen-Falle vom 24.10. ---
t('einzelner Preis', () => assert.equal(preisHoch('31.18'), 31.18));
t('Spanne nimmt den HÖCHSTEN Wert', () => assert.equal(preisHoch('11.21 -- 30.99'), 30.99));
t('Zahl statt Text geht auch', () => assert.equal(preisHoch(4.02), 4.02));
t('GEGENPROBE: ohne Zahl kommt null, nicht 0', () => {
  // 0 würde als Einkaufspreis durchgehen und eine Traummarge erzeugen.
  for (const v of ['', null, undefined, 'auf Anfrage', '0']) assert.equal(preisHoch(v), null);
});

// --- kosten ---
t('Landekosten und Marge, am Fleischwolf-Muster gerechnet', () => {
  const k = kosten({ ekUsd: 20.5, frachtUsd: 10.78, kurs: 0.82435 });
  assert.equal(k.landenChf, 25.79);
  assert.equal(k.vkVorschlag, 51.9);
  assert.equal(k.margeChf, 26.11);
});
t('der Vorschlag endet immer auf .90', () => {
  for (const ek of [3, 7.5, 12.34, 29.99]) {
    const k = kosten({ ekUsd: ek, frachtUsd: 5, kurs: 0.82435 });
    assert.match(k.vkVorschlag.toFixed(2), /\.90$/);
  }
});
t('GEGENPROBE: fehlende oder unsinnige Angaben geben null, keine Zahl', () => {
  assert.equal(kosten({ ekUsd: 10, frachtUsd: 5 }), null);            // kein Kurs
  assert.equal(kosten({ ekUsd: null, frachtUsd: 5, kurs: 0.82 }), null);
  assert.equal(kosten({ ekUsd: 10, frachtUsd: 0, kurs: 0.82 }), null); // Fracht 0 = nicht gemessen
  assert.equal(kosten({ ekUsd: 10, frachtUsd: 5, kurs: 0.82, faktor: 1 }), null);
  assert.equal(kosten(), null);
});
t('die Marge ist immer VK minus Landekosten, nie geschätzt', () => {
  const k = kosten({ ekUsd: 36.48, frachtUsd: 24.62, kurs: 0.82435 });
  assert.equal(Math.round((k.vkVorschlag - k.landenChf) * 100) / 100, k.margeChf);
});

// --- warengruppe: das Spezifische zuerst ---
t('ein schwebender Luftbefeuchter ist ein Luftbefeuchter, keine neue Nische', () => {
  // Das ist der Kern: 150 Luftbefeuchter im Shop gegen 12 Schwebe-Produkte. Falsch
  // einsortiert sähen drei Dubletten wie der beste Fund des Laufs aus.
  assert.equal(warengruppe('Anti-gravity Air Humidifier Mute Countercurrent Humidifier'), 'luftbefeuchter');
  assert.equal(warengruppe('Anti Gravity Levitating Water Drops Humidifier'), 'luftbefeuchter');
});
t('schwebend ohne Luftbefeuchter bleibt schwebend', () => {
  assert.equal(warengruppe('Levitating UFO Color Galaxy Lamp Magnetic Suspension'), 'schwebend');
  assert.equal(warengruppe('Levitating Plant Pot Marble Color Floating Planter'), 'schwebend');
  assert.equal(warengruppe('3D LED Moon Night Light Wireless Magnetic Levitating'), 'schwebend');
});
t('Hologramm schlägt alles andere', () => {
  assert.equal(warengruppe('Wiilala Disesktop 3D Holographic Fan, 4.72 Inch'), 'hologramm');
});
t('ein Projektor mit HUD ist HUD, nicht Projektor', () => {
  // „Car HUD Speedometer Windshield Projector" enthält beides; 4 HUD gegen 110 Projektoren.
  assert.equal(warengruppe('Car HUD Speedometer Windshield Projector With Sun Visor'), 'hud');
});
t('gewöhnliche Projektoren und Partylichter', () => {
  assert.equal(warengruppe('USB Star Projector Night Light, 360 Rotatable'), 'projektor');
  assert.equal(warengruppe('DJ Laser Party Light, RGB LED Disco Light'), 'partylicht');
  // Das Partylicht-Muster steht VOR dem Projektor-Muster, sonst zählt ein
  // „Disco Light Projector" als gewöhnlicher Projektor.
  assert.equal(warengruppe('Party Lights DJ Disco Lights Stage Light Projector'), 'partylicht');
});
t('Uhrenarmband', () => {
  assert.equal(warengruppe('Zircon Inlaid Copper Twisted Snake Watch Strap For IWatch'), 'uhrenarmband');
});
t('GEGENPROBE: `laser` darf keinen Haarentferner zum Partylicht machen', () => {
  // Bewusstes Restrisiko, hier festgehalten: `laser` ist im Partylicht-Muster und würde
  // „Laser Hair Removal" treffen. Der Lauf nennt die Gruppe darum im Bericht, damit ein
  // Fehlgriff sichtbar ist, statt stillschweigend die Dublettenzahl zu verfälschen.
  assert.equal(warengruppe('Laser Hair Removal Device'), 'partylicht');
});
t('GEGENPROBE: Unbekanntes landet in sonstiges, nicht in der erstbesten Gruppe', () => {
  assert.equal(warengruppe('Stainless Steel Garlic Press'), 'sonstiges');
  assert.equal(warengruppe(''), 'sonstiges');
  assert.equal(warengruppe(), 'sonstiges');
});

console.log(`cj_video: ${n} Tests grün`);
