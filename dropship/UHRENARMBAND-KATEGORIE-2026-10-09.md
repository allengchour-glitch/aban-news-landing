# Uhrenarmbänder standen bei Google als «Uhren» (09.10.2026, Verbesserungsrunde 12:27 UTC)

## Gemessen

- **Neuimporte der letzten 4 h** (40 Stück): Alle haben 3 Bilder. «Edelstahl-Uhrarmband mit Drachendesign» und
  «Uhrarmband aus Stahl mit Doppeldiamant-Shell» stehen aber bei Google auf **«Watches»**.
- **Katalog** (Export 09:17 UTC): 43 Titel mit Kopfwort Uhren-/Uhrarmband, davon **28 bei Google «Watches»**, 10 richtig auf
  «Watch Bands». Beispiele: «Uhrenarmband aus Edelstahl, dreireihig», «Leder-Uhrenarmband im Vintage-Stil».
- **Ursache** in `automation/uhren_fein.py` (täglich im Aufseher seit 07.10.):
  - Regel 1 erkennt Armbänder nur mit «… **für** … Watch».
  - Regel 4 (`uhren`) trifft «**Uhren**armband», die Kompositum-Falle aus Regel 9b. Die 28 galten damit als «stimmt» und
    blieben bei den Uhren.
  - Jeder neue CJ-Import mit diesem Kopfwort landete dauerhaft dort.
- Der Lauf fasst nur Produkte an, die schon unter «Watches» stehen. Richtig eingeordnete Armbänder hat er also nicht
  zurückgedreht.

## Getan

Neue Regel vor den übrigen (`BAND`, `BAND_ZUBEHOER`, `BAND_WERKZEUG`, `UHR_SONST`):

| Titel | Google |
|---|---|
| Kopfwort Uhren-/Uhrarmband | Watch Bands (Shopify aa-6-10-1) |
| Federsteg / Verbindungssteg / Positionierungsperlen / Uhrenarmband-Zubehör | Watch Accessories |
| Werkzeug / Schraubenzieher / Zange | bleibt (kein Urteil) |
| «Herrenuhr mit Uhrenarmband», «Smartwatch mit Ersatz-Uhrenarmband» (Uhrwort ausserhalb des Kompositums) | weiter zu den Uhr-Regeln |

- **15 neue Kanarien**, gesamt **39/39**. Der erste Lauf fand selbst noch einen Fehler: «Smartwatch» hat vor «watch» keine
  Wortgrenze.
- **SCHARF 45 / 0 Fehler** (über `shopify_schranke.sh`):

| Ziel | Anzahl | Was |
|---|---|---|
| Watch Bands | 33 | darunter 5 Neuimporte von heute |
| Watch Accessories | 2 | Steg und Perlen |
| Watches | 10 | Neuimporte, nur Shopify-Klasse feiner (Smart Watches / Watches) |

- **Zurückgelesen 10/10** (Google und Shopify).
- **Wächter:** Der bestehende Tageslauf `uhren_fein.py` im Aufseher-Block GKU trägt die Regel jetzt. Er erfasst jeden neuen
  Import, der von der CJ-Gruppe als «Watches» kommt, spätestens am nächsten Tag.

## Offen

Übersetzungsreste in Titeln, gemessen im Google-Kanal:

| Rest | Titel | Beispiel |
|---|---|---|
| «Hooded» | 9 | «Hooded Pullover Sweater für Damen» |
| «Romper» | 6 | — |
| «Cowhide» | 16 | «Cowhides Messenger-Tasche» |
| «Shell» | 15 | — |
| «Plus Size» | 15 | — |
| «Sommer-Rompel» | Neuimport | — |
| «Halbbereiz-Hooded Sweatshirt» | Neuimport | — |

Dafür ist der KI-Titelwächter zuständig. Er ruht ohne Kontingent (OpenAI leer, Groq erschöpft). Ein festes Glossar wäre die
nächste Klasse, mit Kanarien gegen «Slim Fit» und «High-Top», die im Deutschen üblich sind.

## Lehre

**Eine Regel, die «stimmt» meldet, kann einen Fehler festschreiben.** `uhren_fein` zählte 28 Armbänder als «stimmt», weil
seine eigene Uhren-Regel das Kompositum «Uhrenarmband» als Uhr las. Kanarien brauchen deshalb immer auch das
Kompositum, in dem das Wort der Regel nur ein Bestandteil ist.
