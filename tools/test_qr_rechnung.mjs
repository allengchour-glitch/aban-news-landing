/* test_qr_rechnung.mjs — der Rechenkern der QR-Rechnung gegen die Beispiele des Standards.
 *   node tools/test_qr_rechnung.mjs
 * Referenzwerte: Swiss Payment Standards, Implementation Guidelines QR-Rechnung
 * (Beispiel Robert Schneider AG / Pia-Maria Rutschmann-Schnyder) und ISO 11649 (RF18539007547034). */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Q = require("../js/qr-rechnung.js");
let gut = 0, schlecht = 0;
const p = (name, ok, detail = "") => { console.log((ok ? "  ✓ " : "  ✗ ") + name + (ok || !detail ? "" : " — " + detail)); ok ? gut++ : schlecht++; };

console.log("IBAN:");
p("QR-IBAN aus dem Standard ist gültig", Q.ibanOk("CH44 3199 9123 0008 8901 2"));
p("… und wird als QR-IBAN erkannt (IID 31999)", Q.istQrIban("CH4431999123000889012"));
p("normale IBAN (Beispiel aus der CH-Doku) ist gültig", Q.ibanOk("CH93 0076 2011 6238 5295 7"));
p("… und ist KEINE QR-IBAN", !Q.istQrIban("CH9300762011623852957"));
p("GEGENPROBE: Zahlendreher fällt durch", !Q.ibanOk("CH93 0076 2011 6238 5295 8"));
p("GEGENPROBE: deutsche IBAN wird abgelehnt", !Q.ibanOk("DE89 3704 0044 0532 0130 00"));
p("Formatierung in Vierergruppen", Q.ibanFormat("CH4431999123000889012") === "CH44 3199 9123 0008 8901 2");

console.log("\nQR-Referenz (27 Stellen):");
p("Referenz aus dem Standard hat die richtige Prüfziffer", Q.qrrOk("21 00000 00003 13947 14300 09017"));
p("GEGENPROBE: eine Ziffer geändert → ungültig", !Q.qrrOk("210000000003139471430009018"));
p("Erzeugen ergänzt Nullen und Prüfziffer", Q.qrrOk(Q.qrrErzeugen("2026-001")) && Q.qrrErzeugen("2026001").length === 27);
p("Anzeigeformat 2 + 5er-Gruppen", Q.qrrFormat("210000000003139471430009017") === "21 00000 00003 13947 14300 09017");

console.log("\nCreditor Reference (RF):");
p("ISO-Beispiel RF18539007547034 ist gültig", Q.rfOk("RF18 5390 0754 7034"));
p("Erzeugen liefert dieselben Prüfziffern", Q.rfErzeugen("539007547034") === "RF18539007547034");
p("GEGENPROBE: falsche Prüfziffern", !Q.rfOk("RF19539007547034"));
p("Rechnungsnummer als RF-Referenz (2026-001 → alphanumerisch)", Q.rfOk(Q.rfErzeugen("2026-001")));

console.log("\nBetrag:");
p("1'949.75 → 1949.75", Q.betragNorm("1'949.75") === "1949.75");
p("1949,7 → 1949.70", Q.betragNorm("1949,7") === "1949.70");
p("leer bleibt leer (Betrag offen)", Q.betragNorm("") === "");
p("GEGENPROBE: 0 ist kein Betrag", Q.betragNorm("0") === null);
p("GEGENPROBE: drei Nachkommastellen", Q.betragNorm("1.005") === null);
p("Anzeige mit Tausender-Abstand", Q.betragAnzeige("1949.75") === "1 949.75");

console.log("\nNutzdaten (Beispiel aus dem Standard):");
const d = { iban: "CH44 3199 9123 0008 8901 2", name: "Robert Schneider AG", strasse: "Rue du Lac 1268", plzOrt: "2501 Biel",
  betrag: "1949.75", waehrung: "CHF", zahlerName: "Pia-Maria Rutschmann-Schnyder", zahlerStrasse: "Grosse Marktgasse 28",
  zahlerPlzOrt: "9400 Rorschach", refTyp: "QRR", referenz: "21 00000 00003 13947 14300 09017", mitteilung: "Auftrag vom 15.06.2020" };
const r = Q.payload(d);
p("Nutzdaten werden erzeugt", r.ok, JSON.stringify(r.fehler));
const soll = ["SPC","0200","1","CH4431999123000889012","K","Robert Schneider AG","Rue du Lac 1268","2501 Biel","","","CH",
  "","","","","","","","1949.75","CHF","K","Pia-Maria Rutschmann-Schnyder","Grosse Marktgasse 28","9400 Rorschach","","","CH",
  "QRR","210000000003139471430009017","Auftrag vom 15.06.2020","EPD"];
p("exakt 31 Zeilen, Feld für Feld wie im Standard", r.ok && r.text === soll.join("\n"),
  r.ok ? r.zeilen.map((z,i)=>z!==soll[i]?`Zeile ${i+1}: ${JSON.stringify(z)} statt ${JSON.stringify(soll[i])}`:"").filter(Boolean).join("; ") : "");
p("GEGENPROBE: QR-IBAN ohne QR-Referenz wird abgelehnt", !Q.payload({ ...d, refTyp: "NON", referenz: "" }).ok);
p("GEGENPROBE: normale IBAN mit QR-Referenz wird abgelehnt", !Q.payload({ ...d, iban: "CH9300762011623852957" }).ok);
p("normale IBAN + RF-Referenz geht", Q.payload({ ...d, iban: "CH9300762011623852957", refTyp: "SCOR", referenz: "RF18539007547034" }).ok);
p("normale IBAN ohne Referenz geht (NON)", Q.payload({ ...d, iban: "CH9300762011623852957", refTyp: "NON", referenz: "" }).ok);
p("ohne Zahler: sieben leere Zeilen", (() => { const x = Q.payload({ ...d, iban: "CH9300762011623852957", refTyp: "NON", zahlerName: "" }); return x.ok && x.zeilen.slice(20, 27).every(z => z === ""); })());
p("Zeilenumbruch in der Mitteilung wird entschärft", Q.payload({ ...d, mitteilung: "Zeile 1\nZeile 2" }).text.split("\n").length === 31);
p("GEGENPROBE: Betrag 0 wird abgelehnt", !Q.payload({ ...d, betrag: "0" }).ok);

console.log("\n" + "=".repeat(46) + `\n${gut} bestanden, ${schlecht} fehlgeschlagen.`);
process.exit(schlecht ? 1 : 0);
