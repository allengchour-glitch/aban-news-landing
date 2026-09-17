# Pinterest — gemessener Stand, 17.09.2026

Alles hier ist **gemessen** über den angemeldeten Agenten-Browser auf dem Hetzner-Server
(Quittungen `auftraege/erledigt/15,16,19,23a–f,25,26,27,28,29`), nicht aus dem Gedächtnis.

## Der Kanal ist vollständig ausgeliefert — hier ist kein Hebel

Katalog-Diagnose `/business/catalogs/4844353693835/diagnosticsv2/`, beide Reiter:

| Reiter | Kennzahl | Wert | Anteil |
|---|---|---|---|
| Einpflegen | Erfolgreich | **431,36 Tsd.** | 99.99 % |
| Einpflegen | Fehlgeschlagen | **24** | 0.01 % |
| Einpflegen | Warnmeldungen | 202,41 Tsd. | 46.92 % |
| **Distribution** | **Genehmigt** | **438,94 Tsd.** | **100 %** |
| Distribution | Nicht genehmigt | **7** | 0.01 % |
| Distribution | Eingeschränkt (nur Anzeigen) | **0** | 0 % |

Die 24 Fehlschläge sind Bilder unter 75 px (Fehler 1400/1401, Häufigkeit 7/5/4), die 7 nicht
genehmigten sind **nicht vorrätige Produkte** — die einzige genannte Distributionsursache.

**Das ist die Antwort auf die Frage, die bei Google Merchant seit dem 10.07. offen ist.** Dort
stehen (Stand damals) 1'698 Produkte auf «Missing shipping info», und wir können es nicht
nachsehen, weil Google den Agenten-Browser nicht anmelden lässt. Pinterest lässt sich anmelden —
und sagt: 100 % genehmigt. **Der Pinterest-Katalog ist kein Engpass.** Wer hier Zeit investiert,
poliert einen Kanal, der schon vollständig ausgeliefert wird.

## Der CSV-Massen-Upload existiert auf diesem Konto nicht

Sieben Adressen abgetastet (Quittungen 25 und 29):

| Adresse | landet auf | Dateifelder | Massen-Einstieg |
|---|---|---|---|
| `/pin-builder/` | sich selbst | 1 (Bildfeld **eines** Pins) | keiner |
| `/pin-creation-tool/` | sich selbst | 1 | keiner |
| `/business/hub/` | sich selbst | 0 | keiner (nur Diagnose + Academy) |
| `/business/create/` | `/business/hub/` | 0 | keiner |
| `/bulk-create-pins/` | `/?show_error=true` | 0 | keiner |
| `/business/pins/` | `/?show_error=true` | 0 | keiner |
| `ads.pinterest.com` | Kampagnen-Bericht (Werbekonto 549770431724) | 0 | keiner |

`automation/browser/pinterest_bulk_upload.mjs` hat deshalb einen **harten Stopp**. Aufheben nur
mit einer GEMESSENEN Adresse in `dropship/_pinterest_massenweg_gefunden.txt` — die 117 Zeilen in
`dropship/pinterest_pins_upload.csv` liegen sonst verlockend herum und die nächste Sitzung
versucht es zum dritten Mal.

⚠️ Der Versuch vom 17.09. hat die CSV in das **Bildfeld eines einzelnen Pins** gehängt. Nur weil
eine Einführungstour («Tolle Pins leicht gemacht · 1 von 4») über der Seite lag und die
Schaltfläche blockierte, wurde kein Pin veröffentlicht, dessen Bild eine CSV-Datei ist.

## Was steht: sechs Boards

`herrenmode-schweiz`, `home-und-geschenkideen`, `schmuck-und-accessoires`,
`schuhe-und-sandalen`, `sommerkleider-und-damenmode`, `wellness-und-beauty` — je einer pro Lauf
angelegt (23a–f), doppelt bestätigt, keine Dubletten. ⚠️ Board-Handles rendern `&` teils als
`und`, teils gar nicht → beide Schreibweisen zulassen; Boards liegen unter `/{konto}/_saved/`,
nicht auf der Profilwurzel.

## Offen

- **Profilbeschreibung behauptet «Gratis-Versand ab CHF 65»** (Betreiber-Screenshot). Diese
  Schwelle wurde am **10.08.** aus dem Theme entfernt; live gilt 50 (bzw. 45 nach dem
  automatischen 2-Artikel-Rabatt). Die Angabe hat fünf Wochen auf einem öffentlichen Profil
  überlebt. **Eine Korrektur, die nur den Shop durchsucht, erreicht keinen Kanal.**
  → erst das Bearbeitungsformular MESSEN (Auftrag 30), dann ändern. Nicht raten: heute hat ein
  geratener Selektor beinahe eine CSV veröffentlicht.
- Die 117 geprüften Pins bleiben liegen. Sie wären Beiwerk zu einem Kanal mit 100 %
  Distribution; einzeln anzulegen wären ~117 Agenten-Läufe.
