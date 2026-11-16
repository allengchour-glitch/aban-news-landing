// Synthetische Arbeitsstände. Kein Abruf und keine Finanz- oder Kundendaten.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const jetzt=Date.parse('2026-11-16T12:00:00Z');
class Uhr extends Date { static now(){return jetzt;} }
const context={Date:Uhr,window:{KB3D:{}}};
vm.runInNewContext(fs.readFileSync(new URL('./kb3d-buero.js',import.meta.url),'utf8'),context);
const K=context.window.KB3D,lesen=K.monitorInhalt;
let n=0;
function test(name,fn){fn();n++;}
const datum='2026-11-16T11:00:00Z';
const zeile=(id,state,gemessen=datum)=>({id,name:id,state,gemessen,quelle:'Lokale Testquelle',naechster:'Testschritt prüfen'});
const daten=[zeile('gemeldet','gruen'),zeile('fehler','rot'),zeile('offen','gelb'),zeile('alt','alt'),zeile('ohne','gruen',''),zeile('zukunft','gruen','2026-11-17T00:00:00Z')];
test('Alle Kategorien bilden die geladenen Einträge vollständig ab',()=>{
 const m=lesen(daten,'alle',jetzt);assert.equal(m.anzahl,6);assert.deepEqual(JSON.parse(JSON.stringify(m.zahlen)),{gemeldet:1,aufmerksamkeit:2,veraltet:1,ohneZeit:2});assert.equal(Object.values(m.zahlen).reduce((a,b)=>a+b),6);
});
test('Prüfbedarf steht vor datierten grünen Meldungen',()=>assert.equal(lesen(daten,'alle',jetzt).zeilen.map(z=>z.id).join(','),'fehler,offen,alt,ohne,zukunft,gemeldet'));
for(const [filter,ids] of [['gemeldet','gemeldet'],['aufmerksamkeit','fehler,offen'],['veraltet','alt'],['ohneZeit','ohne,zukunft']])test('Filter '+filter,()=>assert.equal(lesen(daten,filter,jetzt).zeilen.map(z=>z.id).join(','),ids));
test('Eine undatierte rote Meldung bleibt ohne bestätigte Messzeit',()=>assert.equal(lesen([zeile('ohne','rot','')],'aufmerksamkeit',jetzt).zeilen.length,0));
test('Ein veralteter Befund zählt nicht zusätzlich als aktuelle Meldung',()=>assert.equal(lesen([zeile('alt','alt')],'gemeldet',jetzt).zeilen.length,0));
for(const filter of ['falsch','__proto__','constructor',null])test('Ungültiger Filter wird alle: '+filter,()=>{const m=lesen(daten,filter,jetzt);assert.equal(m.filter,'alle');assert.equal(m.zeilen.length,6);});
test('Fehlende Daten sind eine leere Liste',()=>{const m=lesen(null,'alle',jetzt);assert.equal(m.anzahl,0);assert.equal(m.zeilen.length,0);});
test('Quellen, nächste Schritte und Eingabereihenfolge bleiben unverändert',()=>{const vorher=JSON.stringify(daten);const m=lesen(daten,'alle',jetzt);assert.equal(JSON.stringify(daten),vorher);assert.equal(m.zeilen[0].quelle,'Lokale Testquelle');assert.equal(m.zeilen[0].naechster,'Testschritt prüfen');});
test('Journal enthält auch erfolgreiche Läufe mit noch offener Ergebnisprüfung',()=>{
 const m=K.arbeitsJournal({ents:[{...zeile('pruefung','gelb'),laufStatus:'completed',laufErgebnis:'success',laufEnde:datum}]});assert.equal(m.abgeschlossen.length,0);assert.equal(m.zeilen.length,1);assert.equal(lesen(m.zeilen,'aufmerksamkeit',jetzt).zeilen[0].id,'pruefung');
});
test('Journal verliert weder unbekannte noch fehlgeschlagene Einträge',()=>{
 const m=K.arbeitsJournal({ents:[zeile('unbekannt','gelb',''),{...zeile('fehlgeschlagen','rot'),laufStatus:'completed',laufErgebnis:'failure',laufEnde:datum}]});assert.equal(m.zeilen.length,2);assert.equal(lesen(m.zeilen,'ohneZeit',jetzt).zeilen[0].id,'unbekannt');assert.equal(lesen(m.zeilen,'aufmerksamkeit',jetzt).zeilen[0].id,'fehlgeschlagen');
});
test('Doppelte Lauf-ID wird auch in der Übersicht nur einmal gezählt',()=>{const m=K.arbeitsJournal({ents:[{...zeile('a','gruen'),laufId:'gleich'},{...zeile('b','gruen'),laufId:'gleich'}]});assert.equal(lesen(m.zeilen,'alle',jetzt).anzahl,1);});
console.log(`${n} ok, 0 Fehler`);
