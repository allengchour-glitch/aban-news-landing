// Tests der Stecker-Regeln. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
import { variantenUrteil, produktUrteil, istSteckdosenWare, NICHT_CH } from './stecker_bereinigen.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const v = (...w) => w;
ist('US-Variante fliegt', variantenUrteil(v('Schwarz-US')), 'weg');
ist('UK-Variante fliegt', variantenUrteil(v('Weiss UK-Stecker')), 'weg');
ist('AU/AUS fliegt', [variantenUrteil(v('Pink-AU')), variantenUrteil(v('White-AUS'))], ['weg', 'weg']);
ist('110 V fliegt', variantenUrteil(v('Schwarz-Gold-110 V US')), 'weg');
ist('US-Stecker ausgeschrieben', variantenUrteil(v('US-Stecker-Pink')), 'weg');
ist('Gegenprobe: EU bleibt', variantenUrteil(v('Weiss-EU')), 'bleibt');
ist('Gegenprobe: 220 V bleibt', variantenUrteil(v('Netzstecker-220 V')), 'bleibt');
ist('Gegenprobe: Set mit EU-Zusatz bleibt', variantenUrteil(v('Weiss-US+EU+AU+UK')), 'bleibt');
ist('Gegenprobe: Farbe ohne Steckerangabe bleibt', variantenUrteil(v('Hellgrün')), 'bleibt');
ist('Gegenprobe: deutsches «aus» (Holz) ist kein Stecker', variantenUrteil(v('Becher aus Keramik')), 'bleibt');
ist('Gegenprobe: «Plus»/«Bonus» enthalten us, aber kein eigenes Wort', variantenUrteil(v('Plus Bonus')), 'bleibt');
ist('Gegenprobe: USB bleibt', variantenUrteil(v('Schwarz-USB')), 'bleibt');
ist('Gegenprobe: Type C (USB) ist kein Stecker', variantenUrteil(v('Type C-10000 MA')), 'bleibt');
ist('NICHT_CH erkennt US/CN', NICHT_CH.test('White-US/CN'), true);
// Produktentscheid
ist('Produkt: nur die fremden Varianten fliegen', produktUrteil([{ id: 'a', werte: v('Schwarz-US') }, { id: 'b', werte: v('Schwarz-EU') }, { id: 'c', werte: v('Schwarz-UK') }]), { loeschen: ['a', 'c'], draft: false });
ist('Produkt: nur fremde Varianten → DRAFT, nichts löschen', produktUrteil([{ id: 'a', werte: v('Schwarz-US') }, { id: 'c', werte: v('Schwarz-UK') }]), { loeschen: [], draft: true });
ist('Produkt: nichts Fremdes → unberührt', produktUrteil([{ id: 'a', werte: v('Rot') }, { id: 'b', werte: v('Blau') }]), { loeschen: [], draft: false });
// Steckdosen-Ware
const P = (title, g = '') => ({ title, g });
ist('Steckdosenleiste → weg', istSteckdosenWare(P('Drehbare Steckdosenleiste', 'Electronics > Electronics Accessories > Power > Power Strips & Surge Suppressors')), true);
ist('Smart-Steckdose → weg', istSteckdosenWare(P('Smart Wifi Steckdose', 'Electronics > Electronics Accessories > Power > Power Outlets & Sockets')), true);
ist('Zeitschaltuhr-Steckdose → weg', istSteckdosenWare(P('Fernbedienbare Zeitschaltuhr-Steckdose')), true);
ist('Gegenprobe: Schutzdeckel für Steckdosen bleibt', istSteckdosenWare(P('Schutzdeckel für Steckdosen', 'Home & Garden > Baby & Toddler > Baby Safety > Baby Safety Locks & Guards')), false);
ist('Gegenprobe: Reiseadapter bleibt', istSteckdosenWare(P('PD 20W Universal Reiseadapter', 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers')), false);
ist('Gegenprobe: Steckdosen-Tester bleibt', istSteckdosenWare(P('Multifunktionaler Steckdosen-Tester mit Display', 'Hardware > Tools > Electrical Testing Tools')), false);
ist('Gegenprobe: Steckdosenleisten-Halterung bleibt', istSteckdosenWare(P('Magnetische Steckdosenleisten-Halterung', 'Home & Garden > Household Supplies > Storage & Organization')), false);
ist('Gegenprobe: USB-Ladegerät mit Euro-Stecker bleibt', istSteckdosenWare(P('USB-Ladegerät für Mobiltelefone (EU-Stecker)', 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers')), false);
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
