# Dünne Texte — Prüferbefunde abgearbeitet (05.10.2026, 03:30–05:10 UTC)

Anlass: Prüferbefunde Index 5 (alle hoch/mittel) + FIX-12H-PLAN Punkt 13. Die Wache `automation/produkttext_duenn.py` war mit
`dropship/_duenne_texte_angehalten` angehalten, weil ihre Tore Lücken hatten (Diamant/Varianten/Material/Müllnamen). KI-Kontingente
leer → alle Texte und Urteile von Hand (Kontaktbogen 46 Hauptbilder, 2 Bögen, gelesen).

## Vorher (gemessen 03:30 UTC)
- `NACHPRUEFEN=1` (neue Tore, Live-Stand): **60 Ledger-Handles gelesen, 58 mit Treffern** — darunter 16× «SEO-Titel alt», 9× Wahlwörter
  bei Einzelvariante (Flipflops, Sonnenbrille, Hundenapf, Nickel-Akku, Herz-Link, Gepäcktasche, Lederschuhe, Augen-Massager, Diamant-Tropfen),
  4× Edelstein-Wort ohne Beleg (Herz-Link, Diamant-Tropfen, Gold-Diamanten-Haarspange, Herz-Link-Titel), 1× Material-Widerspruch
  (Leder-Tote: Text «Rindleder», Block «Kunststoff»), 2× «Man kann», 5× Englisch (Rubber, Studs, casuales, Crushed, shaped), 1× Zielgruppe
  «18 bis 59 Jahren», 1× Frosch nach Titelkorrektur, 12× «noch dünn».
- Relaunch-Schleife `scratchpad/schleife.sh` (PID 15144) lief noch und hätte die Wache alle 15 Min trotz Marke neu gestartet → beendet.
- Titel-Ledger trug eine Fremdzeile im gid-Format (Häkelnadel-Set) und keine Kopfzeile.

## Getan
1. **Tore repariert** (`automation/produkttext_duenn.py`, +302/−22 Zeilen, Docstring-Nachtrag «05.10.»):
   VARIANTEN (Wahlwerte nur aus Shopify-Optionen; Einzelvariante = kein Wahl-/Verfügbarkeitswort) · EDELSTEIN (Diamant/Brillant/Saphir/
   Rubin/925 nur bei Echt-Beleg, auch im Titel) · MATERIAL-Widerspruch Fliesstext ↔ Faktenblock + CJ-Name ↔ materialNameEn (dann keine
   Material-Zeile) · MÜLLQUELLE (productNameEn «12», Alt-Zeile «12 Grösse») · EINHEIT (Zahl+Einheit nur mit gleicher Einheit in der Quelle;
   Bereiche «41–50 cm», «40+5CM» werden gelesen) · ZIELGRUPPE · «Man kann» · NEGATIVQUELLE (Wörter des alten, falschen Titels, Material-
   und Farbwörter ausgenommen) · MIN_W 70 bei < 6 Quellenzeilen · ANSPRUCH + wetterbeständig/stabil/Messungen · WIRK + Hautproblem/
   Hautbarriere/Augenpflege · ENGLISCH + shaped/crushed/inlaid/top-grain/cowhide. Nebenbei behobene Fallen: `PU` traf «Pullover»
   (Kurzcodes jetzt exakt), Satzende-Tor hielt trennbare Verben («hängst … auf.») für Satzbruch, CJ-«key: value»-Zeilen ohne Ziffer
   («Material: Canvas», «Outsole: Rubber») fehlten als Quelle, `glass` traf «Sunglasses». Synonyme silver/golden/pearl/rubber/foam/ni-mh.
   **Selbsttest `--test`: 14/14 Kanarienvögel richtig.** Bild-Urteile vom Kontaktbogen 04.10. liegen jetzt im Repo
   (`dropship/_duenne_texte_bildurteile.json`, 118), Standardquelle des Skripts.
2. **NACHPRUEFEN-Modus** (`NACHPRUEFEN=1`): liest alle Handles aus Text- und Titel-Ledger live, Alt-Text aus dem Ledger als Quelle, CJ nur
   aus dem Cache, schickt den Live-Fliesstext durch die Tore, meldet zusätzlich «SEO-Titel alt» (seo.title ≠ Titel; `null` = Titel).
   Schreibt nichts. Exit 0 = 0 Tor-Treffer.
3. **39 Live-Texte von Hand neu geschrieben** (80–125 Wörter, du-Form, nur belegte Fakten; Gewichte nur im Faktenblock) — jeder Text
   vor dem Schreiben durch die neuen Tore (0 Treffer), dann `productUpdate` mit Rücklesen; Ledger `_duenne_texte_ledger.tsv` (alt/neu).
   Genannte Klassen: Leder-Tote (Material-Zeile + Leder-Aussage raus, Titel neu), Herz-Link (Strass statt Diamant, keine Längen),
   Flipflops/Sonnenbrille/Hundenapf/Nickel/Herz-Link/Gepäcktasche/Augen-Massager (keine Wahlversprechen), Laufschuh (Titel «Hohe
   Schnürschuhe mit Riemen, schwarz», keine «Grösse 12»), Haarspange (Bär, Titanlegierung), Adler (Kunstharz, Solarleuchte + Stab aus
   CJ-Lieferumfang), Schönheitsmaske (3/7 Lichtfarben, Netz/Akku, keine mm, kein «Hautprobleme»), Rubber/Studs/Wallet/Stroller/
   Crushed/shaped, «Man kann» (Set, Tee-Ei), Grammatik (Hundenapf, Leopard-Kleid, Augen-Massager, Fiat-Hülle, Bierbecher «sorgt dafür»).
4. **11 Titel korrigiert** (Edelstein-/Material-/Objektwort unbelegt): Diamant-Tropfen → «Vintage-Ohrhänger mit farbigen Steinen und
   Perle, goldfarben»; Gold-Diamanten Haarspange → «… mit Strass-Sternen · 3 Stück»; Herz-Schmuck-Link → «Herz-Gliederkette mit Strass,
   10 mm»; Keramik-Perlenkette → «Perlenkette mit Blüten und Seestern-Anhänger, goldfarben»; Laufschuh → «Hohe Schnürschuhe mit Riemen,
   schwarz»; Leder-Tote → «Handtasche mit Schulterriemen und Reissverschluss, braun»; Leder-Unterarmtasche → «Gesteppte Unterarmtasche
   mit Kettengurt, schwarz»; Schutzcover → «Schutzhülle für Fiat-Schlüssel mit 3 Tasten»; Schwarze Lederschuhe → «Schwarze Schnürschuhe
   mit Blockabsatz für Frauen»; Vintag-Ohrstecker → «Vintage-Ohrstecker mit Zirkonia-Besatz, silberfarben»; Grauer Tuchbeutel →
   «Laptop-Hülle mit Klappe, grau». Ledger `_duenne_texte_titel_ledger.tsv` (jetzt mit Kopfzeile; Fremdzeile → `_titel_pruefer_2026-10-05.tsv`).
5. **SEO beide Felder nachgezogen**: 16 umbenannte Produkte vom 04.10. + alle 39 Textprodukte = **55 Produkte** (`_duenne_texte_seo_ledger.tsv`,
   alt/neu). Raucherware behält die Form «(18+) | LuxeStyle». Shopify speichert seo.title == Titel als `null` (3 Fälle, Titel > 56 Zeichen).
6. **Varianten-Entscheid (Prüfer: «DRAFT wie Pflegepuppe oder nachimportieren»)**: Der Bestellautomat wählt bei Einzelvarianten die
   CJ-Variante per Bildvergleich (`cj_variante_bild.py`, 72 % aller Einzelvarianten-Produkte) — das trägt bei Farbe/Stil, nicht bei
   Grösse, Kapazität, Buchstabe oder Armband-vs-Kette. **9 Produkte → DRAFT + Tags `variante-unklar`, `variante-unklar-2026-10-05`**
   (`dropship/_variante_unklar_2026-10-05.tsv`, Status alt/neu, Grund): Bändercollar (XS–XL), Plateau-Flipflops (36–41), Hohe Schnürschuhe
   (35–42, CJ nur Weiss, Bild schwarz), Schwarze Schnürschuhe (35–42), Weisse Bluse (S–2XL), Herz-Gliederkette (Armband/Kette/Set),
   Initial-Ring (26 Buchstaben), Nickel-Akku (1,5/2,0/3,0 A, Kompatibilität nur aus CJ-Name), Laptop-Hülle (14/16 Zoll, Preis CHF 103.90).
   Farb-/Stil-Varianten bleiben ACTIVE mit neutralem Text (Sonnenbrille, Augen-Massager, Gepäcktasche, Liebeshalskette, Kettchen …).
7. Marke `dropship/_duenne_texte_angehalten` **gelöscht** (Bedingung erfüllt) — der Aufseher-Lauf (fixer_keepalive Z. 1177) läuft wieder,
   sobald Groq Kontingent hat.

## Nachher (gemessen 05:05 UTC)
- `NACHPRUEFEN=1`: **60 gelesen · 0 Tor-Treffer · 12 noch dünn** (die 12 vom 04.10. umbenannten Produkte ohne Text — Sache des Tageslaufs).
- Text-Ledger: 48 Handles · 37 ACTIVE · 11 DRAFT (9 neu, 2 alt) · 46 mit ≥ 80 Wörtern.
- `python3 automation/produkttext_duenn.py --test`: 14/14.

## Offen
- 12 Produkte aus dem Titel-Ledger noch < 40 Wörter (Shisha-Set, Shisha Glasbasis, Charm-Anhänger, Poloshirt, Off-Shoulder-Kleid,
  Ohrhänger Kettenfransen, Haarspange Herz-Keks, Künstliche Nägel, Sternenhimmel-Projektor, Überwurf, Pantoletten ×2) — Tageslauf nach
  Groq-Reset; Plan-Kriterium «text_duenn Google-Ware = 0» damit noch nicht erfüllt (seo_voll_audit.py heute nicht neu gelaufen).
- Nach 16:00 UTC (CJ-Punkte): für die 9 DRAFT-Produkte CJ-Varianten nachimportieren (Grössen/Typen als Shopify-Optionen) und wieder ACTIVE;
  CJ-EK der Laptop-Hülle gegen CHF 103.90 (`preis_verlustschutz`); Laufschuh-Bild (schwarz) gegen CJ-Varianten (nur Weiss) prüfen —
  evtl. falsches Produkt verknüpft.
- Körperöl (`leichtes-korperol-…`): Text sauber, aber das Hauptbild trägt «REPAIRS SKIN BARRIER, SOOTHES SKIN» — Kosmetik-Werbeklasse
  für den Google-Kanal (Bildtausch-Klasse), nicht Teil dieses Bereichs.
- Zweitprüfer-Durchgang («ergibt jeder Satz Sinn?») im Skript bleibt ohne KI-Kontingent offen; die Hand-Texte wurden selbst gegengelesen
  (9 Nebensätze ohne Beleg nachträglich gestrichen: Band an der Maske, acht Ösen, flacher Boden, Druck «bleibt beim Spülen» …).

## Lehren
- Ein Tor, das nur «steht in irgendeiner Quelle» prüft, lässt Müllquellen durch («12», «Diamond-Inlaid», Zielgruppenfeld) — jede Quelle
  braucht ihre eigene Plausibilität (Länge, Einheit, Widerspruch zwischen Feldern).
- Titelkorrektur ohne SEO = halbe Korrektur; Shopify legt seo.title == Titel als `null` ab (kein Fehler).
- Einzelvariante ≠ unverkäuflich: Farbe entscheidet der Bildvergleich, Grösse/Kapazität/Typ kann kein Bild entscheiden → nur diese DRAFT.
