# «Selbst gestalten»: Material- und Faserangaben nach dem Audit angeglichen (LIVE 04.11.2026)

**Auslöser:** Audit «Selbst gestalten» (Besitzer 03./04.11.: «such Fehler bei Selbst gestalten, agiere wie ein Mensch»). Prüfer fanden Textstellen, die dem Printful-Katalog widersprechen.

**Geändert (7 Produkte, nur Beschreibungstext, Preise, Varianten, Bilder, Titel unverändert):**
- Sport-BH, Yoga-Leggings, Badeanzug (Allover): «75 % recycelter Polyester, 25 % Elasthan» → «78 % Polyester, 22 % Elasthan» (kein «recycelt», Zusammensetzung nach Printful), «82/18» → «84/16» (Lettland), Stoffgewicht 225 → 290 g/m².
- Bio-Jutebeutel: «3/1 Cord» → «3/1-Köper (Twill)», Materialzeile ohne «Cord».
- Dad-Cap: «Chino-Cord» → «Chino-Baumwollköper», Materialzeile «Baumwolle».
- Kuscheldecke: «Fleece» → «Stoff mit seidigem Griff, 100 % Polyester». Strandtuch: «Mikrofaser» → «Frottee, Rückseite 50 % Baumwolle, 50 % Polyester» (jeweils nach dem Printful-Katalogtext).

**Wie:** `korrigieren.mjs` (Trockenlauf Vorgabe, `LIVE=1` schreibt). Je Ersetzung muss die alte Zeichenkette genau einmal vorkommen, sonst bricht das Produkt ab. Die Texte tragen vor `%` ein schmales Leerzeichen (U+202F): die Muster sind darauf eingestellt. Sicherung des alten Textes je Produkt in `vorher/<handle>.html`, jedes Produkt nach dem Schreiben frisch gelesen.

**Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/pod-text-0411/korrigieren.mjs` stellt die Texte aus `vorher/` wieder her.

**Offen (Besitzer-Entscheide, nicht geändert):** Rückseitendruck (Printful +5,95 USD), Farbauswahl (Shirt nur 3 von 84), Druckfläche nur «Vorne» quadratisch, widersprüchliche Lieferzeiten bei Kleid und Boardshorts, «30 Tage Rückgabe» gegen den Ausschluss individuell gedruckter Ware, Jogginghose (zwei Beindateien gegen eine Editorfläche). Details im Audit-Bericht dieser Sitzung.
