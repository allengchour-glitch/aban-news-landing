# Wie „nach KI gemacht" sieht die Webseite aus? — gemessen, nicht geschätzt

> Auftrag des Users (2026-09-05): „verbessere die Webseite mehr und optisch, zu fest
> KI gemacht." Ein Eindruck lässt sich nicht abarbeiten. Deshalb zählt
> `tools/ki_look.py` die Muster, die ihn erzeugen — über alle 1134 Seiten.

## Stand 2026-09-07

Zwei Zählungen mit verschiedenem Umfang — beide stehen hier, damit niemand sie
verwechselt: `ki_look.py` misst die 1134 Seiten im Wurzelverzeichnis,
`textbausteine.py` zusätzlich die Unterordner (`vergleich/`, `maerkte/`, …).

| Muster | Beginn 2026-09-07 | jetzt |
|---|---:|---:|
| Hype-Floskeln (Wurzel + Unterordner) | 1627 | **716** |
| davon Abzeichen „Branchen-Guide · ehrlich, ohne Hype" | 308 Seiten | **0** |
| Farbverläufe | 1111 | **438** |
| Verschiedene Eckenradien | 30 | **3** |
| Durchschlag der klebenden Kopfleiste (Startseite) | 2,78 | **0,00** |
| Emoji in H1 | 11 | 10 (alle auf Spielseiten — kein Befund) |

⚠️ Zwei Zeilen aus früheren Fassungen dieser Tabelle sind bewusst weg: „Textbausteine
gesamt" zählte „ehrlich" und „Auf einen Blick" mit (beides keine Floskeln, s. u.), und
„Kästen ≥ 14 px" zählte nach der Radien-Leiter die Verbesserung als Fehler. Wer alte
Zahlen vergleicht, vergleicht andere Definitionen.

## Was gemacht wurde

`tools/textbausteine.py` entfernt **eine** Sache: die angehängte Floskel am Satzende
(„… mit dem Monitor dranbleiben — ehrlich, ohne Hype.") und den wortgleichen Zusatz im
Abzeichen über der Überschrift. 947 Stellen auf 597 Seiten.

Es **erfindet nichts** und schreibt keinen Satz um. Der Baustein bleibt, wo er die
Aussage trägt: in `<title>`, in Überschriften und mitten im Satz („KI für Fliesenleger
ohne Hype: konkrete Beispiele"). `tools/test_textbausteine.py` hält beide Richtungen
fest — 9 Fälle, darunter die zwei Fehler, die das Werkzeug in der Entwicklung machte:
der geschluckte Satzpunkt und der doppelte Punkt.

**13 Generatoren** wurden mitgeändert (`generate_sichtbarkeit_branchen.py`, die acht
`*-radar/generate.py`, `automation/build_themen.py`, `generate_angebote.py`,
`assistant/build_index.py`, `tools/build_kaufberater_hub.py`). Ohne das steht die
Floskel nach dem nächsten Generatorlauf wieder da — dieselbe Falle wie beim
„Frag aban"-Assistenten, der an drei Stellen eingebaut war.

## Was bewusst offen bleibt

- **Bild-Generatoren** (`gen_card.py`, `gen_chart.py`, `generate_branchen_og.py`,
  `generate_prompts_pdf.py`) setzen die Zeile als Markensignatur auf Grafiken. Dort ist
  sie ein Absender, kein Füllsatz — und ein Wechsel hiesse, tausende Bilder neu zu rendern.
- **72 Seiten** tragen danach immer noch mehr als ein „ohne Hype". Das sind Fälle für
  die Hand, nicht für die Maschine; das Werkzeug meldet die Zahl bei jedem Lauf.
- **Farbverläufe (1119) und runde Kästen (4119)** sind noch unangetastet. Sie sind das
  grössere Thema und brauchen eine Entscheidung über die Bausteine, keine Textersetzung.
- „ehrlich" (2255) ist kein Baustein im selben Sinn — das Wort steht meist in echten
  Sätzen. Erst zählen, wo es Floskel ist, dann anfassen.


## Nachtrag 2026-09-07 · Die klebende Kopfleiste war Glas, jetzt ist sie Fläche

Beim Durchblättern der Bildschirme (`tools/seiten_blick.mjs`) lief die Schlagzeile der
Startseite sichtbar durch die Navigation. Ursache: `header{background:rgba(255,250,242,
.85);backdrop-filter:blur(10px)}` — 15 % Transparenz, und ein 10-px-Weichzeichner ist
gegen eine 60-px-Schlagzeile nichts.

**Gemessen** mit `tools/kopfleiste.mjs`: zwei Aufnahmen derselben Leiste bei zwei
Scrollständen. Die Leiste zeigt beide Male dasselbe — jeder Unterschied kommt aus dem,
was durchscheint.

| | Durchschlag (mittlerer Pixelunterschied) |
|---|---:|
| vorher, 85 % deckend | 2.78 (Startseite), 3.54 (KI-Studio) |
| Zwischenschritt, 97 % | 0.53 / 3.54 |
| jetzt, deckende Fläche | **0.00 / 0.00** |

54 Seiten geändert. Der `backdrop-filter` ist mit weg: hinter einer deckenden Fläche
zeigt er nichts und kostet nur GPU.

> **Das Messgerät hat sich zuerst selbst widerlegt.** Der erste Entwurf schnitt die
> Leiste mit `page.screenshot({clip})` heraus — `clip` rechnet aber in DOKUMENT-, nicht
> in Bildschirmkoordinaten, also kam bei beiden Scrollständen derselbe Seitenkopf heraus
> und der Durchschlag war immer 0,00. Aufgefallen ist es nur, weil die eingebaute
> Gegenprobe (künstlich 50 % transparent) ebenfalls 0,00 lieferte und das Werkzeug
> daraufhin selbst „Gegenprobe gescheitert" meldete. Zweiter Fehler derselben Art: die
> Seite scrollt weich, ein fester Wartewert traf die Zielhöhe nicht — jetzt wird auf den
> tatsächlichen Scrollstand gewartet.

**Nebenbefund, behoben:** `ki-studio.html` und `ki-erwaehnungs-check.html` hatten ein
nicht geschlossenes `<span>` im Fussbereich — `html-validate` meldete 7 Folgefehler bis
hinunter zu `</html>`. Beide Seiten validieren jetzt ohne Befund.

## Was die Bildschirm-Messung sonst zeigt (`tools/seiten_blick.mjs`)

| Seite | Gerät | Bildschirmlängen | Karten | H2 | Knöpfe |
|---|---|---:|---:|---:|---:|
| index.html | Handy | **25,1** | 28 | 15 | 18 |
| index.html | Laptop | 15,9 | 28 | 15 | 18 |
| ki-fuer-fliesenleger.html | Handy | 9,5 | 0 | 15 | 3 |
| shop.html | Handy | 2,9 | 0 | 2 | 1 |

Die Startseite ist auf dem Handy **25 Bildschirme lang**, mit 15 Abschnitten und 28
Karten. Das ist die nächste Frage — und eine inhaltliche, keine technische: welche
Abschnitte tragen, und welche stehen nur da, weil man sie hinzufügen konnte. Die zählt
das Werkzeug, entscheiden muss es ein Mensch.


## Nachtrag 2026-09-07 · Dreissig Eckenradien wurden drei

Gezählt über alle Seiten und `css/*.css`: **30 verschiedene** Eckenradien in 32 092
Deklarationen — 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26,
28, 40, 99, 999 px. Niemand entscheidet dreissigmal verschieden. So etwas entsteht,
wenn jede Seite für sich gebaut wird, und genau das meint „zu fest KI gemacht":
nicht hässlich, sondern beliebig.

**Die Leiter** (`tools/ecken.py`, 15 907 Deklarationen auf 2 597 Dateien):

|  | wofür | aus |
|---:|---|---|
| **8 px** | kleine Flächen — Knöpfe, Felder, Chips, Bilder | 2–9 |
| **14 px** | Karten und Kästen | 10–40 |
| **999 px** | Pillen | 90+ |

Nicht angefasst: `%` (Kreise), `var()`/`em` (dort steckt eine Absicht dahinter) und
`border-radius:0` — eine Kante ist eine Entscheidung, keine Ungenauigkeit. Mehrwertige
Formen wie `12px 12px 0 0` behalten ihre Form, jeder Einzelwert kommt auf die Leiter.
`tools/test_ecken.py` hält das mit 13 Fällen fest.

**Ehrlich zum Ergebnis:** auf der Startseite sieht man den Unterschied kaum — dort
liefen die Radien schon über `var()` und Pillen. Der Gewinn liegt nicht im einzelnen
Bild, sondern darin, dass die nächste Seite eine Entscheidung erbt statt einen
Zufallswert. Gegengeprüft: `html-validate` über 25 geänderte Seiten meldet vorher wie
nachher dieselben 26 (vorbestehenden) Fehler.


### Und eine Kennzahl, die selbst falsch war

`ki_look.py` zählte „Kästen ≥ 14 px gerundet". Nach der Leiter stieg diese Zahl von
4119 auf 9591 — obwohl genau das die Verbesserung war: 14 px IST jetzt die gewählte
Karten-Sprosse. Ein Messgerät, das eine Entscheidung als Befund zählt, misst das
Falsche. Gezählt wird jetzt, was den Eindruck erzeugt: **wie viele verschiedene
Radien** überhaupt vorkommen (30 → 3) und wie viele höchstens auf einer Seite.


## Nachtrag 2026-09-07 · Flächen sind flach

1111 Farbverläufe auf 657 Seiten. Nachgesehen, was sie tun:

| Art | Zahl | Entscheidung |
|---|---:|---|
| Fläche mit zwei Stopps (Creme→Creme, Bernstein→Gelb) | 1230 | **eine Farbe** |
| Maske (`transparent`, `rgba(…,0)`) | 101 | bleibt — blendet den Rand der Laufschrift aus |
| Mehrstufig (3+ Stopps) | 376 | bleibt — dort IST der Verlauf das Motiv |
| Verlaufs-Schrift (`background-clip:text`) | 66 Dateien | ganz ausgelassen |

`tools/flaechen.py` hat 1001 Flächen-Verläufe auf 720 Dateien flachgelegt (Farbverläufe
gesamt **1111 → 438**). Ersetzt wird durch den ERSTEN Farbstopp — die Farbe, die die
Fläche ohnehin trägt.

**Sichtbar geprüft:** der Newsletter-Kasten war ein diagonaler Creme-nach-Weiss-Wisch
und ist jetzt eine gleichmässige Fläche (Aufnahmen des Elements vorher/nachher). Auf
zwei anderen Seiten war der Pixelunterschied exakt 0,000 — dort lagen die geänderten
Verläufe ausserhalb des Bildausschnitts. Erst der gezielte Element-Vergleich zeigt die
Wirkung; ein „kein Unterschied" auf einem beliebigen Ausschnitt beweist nichts.

> **Falle, vor dem Schreiben abgefangen:** `background-image` nimmt **keine Farbe** an.
> Hätte das Werkzeug dort ersetzt, wäre aus dem Verlauf eine ungültige Angabe geworden,
> die der Browser still verwirft — die Fläche wäre danach durchsichtig, ohne Fehlermeldung
> irgendwo. Dasselbe gilt für `mask-image`. Beide sind jetzt ausgenommen und als
> Testfälle festgehalten (`tools/test_flaechen.py`, 11 Fälle).


## Nachtrag 2026-09-07 · Die zweite Floskel-Familie — und zwei falsch gezählte Muster

„kein Hype" und „kein Buzzword-Bingo" hängen genauso am Satzende wie „ohne Hype".
Der Werbetext „kurz, ehrlich, kein Buzzword-Bingo" stand 143-mal wortgleich.
328 Stellen auf 264 Seiten entfernt (Hype-Floskeln gesamt 1044 → 716).

> **Beinahe-Schaden, im Diff gefangen:** Der erste Entwurf hatte den einfachen
> **Bindestrich** in der Trennzeichen-Auswahl. Aus „Mo bis Fr morgens, 3-5 Minuten,
> kein Hype." wurde damit **„Mo bis Fr morgens, 3."** — das Muster frass die
> Zahlenspanne mit. Aufgefallen beim Durchsehen des Diffs, nicht durch einen Test;
> die Änderung wurde zurückgenommen, das Muster auf Gedankenstrich und Mittelpunkt
> eingeengt (nie den Bindestrich), und der Fall steht jetzt als Testfall drin.
> **Lehre: bei Massenersetzungen den Diff lesen, nicht nur die Zahl.**

### Zwei Muster waren zu Unrecht in der Baustein-Liste

`ki_look.py` zählte „Auf einen Blick" (433) und „ehrlich" (2255) als Textbausteine.

- **„Auf einen Blick"** ist kein Füllsatz, sondern das **Label des Antwort-Kastens**
  oben auf jeder Ratgeberseite — ein Bauteil. Wer es entfernt, nimmt der Seite ihre
  Struktur, nicht ihre Floskel.
- **„ehrlich"** ist das Kernwort der Marke und steht meist in echten Sätzen.

Beide werden jetzt getrennt ausgewiesen statt mitgezählt. Damit fällt „Textbausteine
(alle)" von 3687 auf **717** — nicht weil Arbeit geschehen wäre, sondern weil vorher
Falsches mitgezählt wurde. Dieselbe Lehre wie bei „Kästen ≥ 14 px": ein Messgerät, das
Bauteile als Fehler zählt, treibt die Arbeit in die falsche Richtung.

## Nachtrag 2026-09-18 · Startseite: eine Frage, kein Blindfleck mehr — und ein 164-Link-Klumpen sortiert

User: „die Seite optimieren, nicht so KI-Style." Frischer Blick auf die Startseite (15
H2-Abschnitte, ~25 Bildschirme auf dem Handy). Erste Vermutung — vier redundante
KI-Tools-Werbeblöcke — hielt der Prüfung NICHT stand: alle vier sind inhaltlich
verschieden (B2B-Beratungsangebot, Live-Demo, bezahltes KI-Studio, Gratis-Tools-Kachel-
Liste). **Gelernt: Titel-Ähnlichkeit ist kein Beweis für Redundanz — erst den Inhalt
lesen.**

Zwei echte, belegte Funde stattdessen:

**1. Drei überlappende Kategorie-Reihen im selben Marktplatz-Block.** Eine „Beliebt:"-
Pillen-Reihe (Wohnung/Auto/Velo/Handy/Sofa/Job) stand direkt über einer fast identischen
Knopf-Reihe (Jobs/Auto/Immobilien/Angebote/Inserate) — dieselben Themen, zwei
verschiedene Bauteile, in derselben Bildschirmbreite. Die Pillen-Reihe entfernt: kein
Ziel verloren (dieselben Suchbegriffe funktionieren über das Suchfeld direkt darüber,
die Themen bleiben über die Knopf-Reihe erreichbar).

**2. Der Footer hatte eine Spalte „Mehr" mit 164 undifferenzierten Links** — Rechner,
KI-Tools, Themenseiten, Meta-Seiten, alle in einer einzigen Spalte ohne jede
Untergliederung. Das CSS-Grid war für 5 Spalten gebaut, nutzte aber nur 4 (eine
„Mehr"-Wand statt einer fünften Spalte). Aufgeteilt in zwei klar benannte, thematisch
saubere Spalten — **„KI, Geld & Themen"** (61 Links) und **„Rechner & Vorlagen"**
(103 Links) — Grid auf 6 Spalten erweitert (`1fr` ergänzt, Mobil-Breakpoint bei 860 px
bricht ohnehin auf 2 Spalten um, unverändert). Kein Link verloren: 164 → 61 + 103.

**Das ist der stärkste „sieht generiert aus"-Befund der ganzen bisherigen Prüfung** —
nicht Farbe, nicht Emoji, nicht Textbaustein, sondern eine über Monate gewachsene Liste,
der niemand je eine Struktur gegeben hat. Genau das Muster aus der Spiel-Runde
(„keine Entscheidung, nur Werkzeugkiste") — nur diesmal in einer Navigationsspalte statt
in Knopf-Farben.

**Bewusst nicht angefasst:** Die 15 Abschnitte selbst — nach vollständigem Lesen (nicht
nur Titel) erfüllt jeder eine eigene, unterscheidbare Funktion (Navigation, Marktplatz,
B2B-Leads, Live-Demo, Markt-News, bezahltes Produkt, Archiv, Gratis-Tools, Geld-Hub,
Premium-Vergleich, Beispiel-Ausgabe, FAQ, Sitemap). Die Seitenlänge (~25 Bildschirme)
ist damit keine Redundanz, sondern eine Reichweiten-Entscheidung über sechs verschiedene
Geschäftsfelder auf einer Seite — das zu kürzen hiesse, eines davon weniger sichtbar zu
machen. Blieb nach dieser Runde nahezu unverändert (25,0 statt 25,2 Bildschirme Handy) —
die Fixes waren Struktur, nicht Kürzung.

**Geprüft:** `html-validate index.html` ohne Befund (Exit 0) · `.footcols h4` per DOM-
Abfrage ausgelesen — exakt 5 Spaltentitel, korrekt benannt · Link-Gesamtzahl in
`.footcols` 188 (vorher 164 allein in „Mehr" + Rest) · Screenshot des Footers mit
deaktiviertem Sticky-Header (der erste Versuch zeigte ein Kompositions-Artefakt — die
fixierte Kopfleiste überlagerte den Screenshot, kein echter Seitenfehler, per
DOM-Abfrage widerlegt, dann sauber neu fotografiert).

**Nachtrag (gleicher Tag):** „Rechner & Vorlagen" (103 Links) war selbst noch eine
undifferenzierte Spalte. In 5 benannte Unter-Gruppen aufgeteilt (`.footcols .sub`-
Überschriften): Finanz & Business (36) · Schweiz-Rechner (10) · Entwickler & Text (32) ·
YouTube & Social (8) · Alltag & Gesundheit (17) — Summe 103, kein Link verloren.
Kategorisierung per Slug-Abgleich (Skript nicht committet, Einmal-Werkzeug); erste
Fassung verglich volle Hrefs (`x.html`) gegen nackte Slugs (`x`) und traf 0/103 — Fehler
lag am fehlenden `.html`-Suffix im Vergleich, nach Fix korrekt verteilt. `html-validate`
fand 4 `no-raw-characters`-Fehler (unescapte `&` in den neuen Zwischenüberschriften wie
„Finanz & Business") — auf `&amp;` korrigiert, danach 0 Fehler.

## Nachtrag 2026-09-22 · Zwei weitere Klumpen + ein handfester Beleg für „liest sich wie KI"

User: „die Seite mit Prompt verbessern" — auf Nachfrage („was genau?") kam „1 und 2":
sowohl eine echte Text-Qualitäts-Überarbeitung EINER Seite als auch die Struktur-
Aufräum-Methode (wie beim Footer) auf einer weiteren Seite fortsetzen.

**1. `ki-tool-vergleich.html`: 197 „X vs Y"-Links in einem einzigen `.hubgrid`, 0
Zwischenüberschriften.** Derselbe Fund wie beim Footer, nur diesmal in einer Produkt-
Vergleichsseite statt einer Navigationsspalte — alphabetisch nach erstem Tool-Namen
sortiert, keine thematische Gruppierung. Nach Thema in 16 benannte Gruppen aufgeteilt
(`<h2 class="hubcat">` + eigenes `.hubgrid` je Gruppe): Chatbots & Assistenten (25),
Coding- & Dev-Agenten (26), Bild-KI (26), Video- & Meeting-KI (26), Automation &
Workflows (19), KI-Infrastruktur & Modelle (19), Suchmaschinen-KI (10), Notiz- &
Wissens-Apps (12), Recherche & Wissenschaft (7), Sales/CRM & Support-KI (5), SEO- &
Content-Tools (4), Schreiben & Text-Korrektur (4), No-Code App-Builder (6), Sprach- &
Audio-KI (3), Präsentationen (2), KI-Sichtbarkeit & GEO-Tracking (3) — Summe 197,
gegengeprüft (kein Link verloren). Kategorisierung per Keyword-Zuordnung (Einmal-
Skript, nicht committet), 0 unmatched nach zwei Iterationen (erste Runde hatte eine
Substring-Kollision: „otter" traf auch „otterly" und ordnete die GEO-Tracking-Tools
AthenaHQ/Otterly/Profound fälschlich der Meeting-Notiz-Kategorie zu — mit
`otter.ai`/`otter-vs` statt nacktem `otter` behoben).

**2. `ki-fuer-steuerberater.html` (stellvertretend für 368 Seiten): der
`data-aban-deep`-Abschnitt ist unbearbeiteter Gemini-Rohtext — und der Bruch ist
messbar, nicht nur gefühlt.** Der Rest der Seite spricht durchgehend informell per „du"
(„In der Kanzlei zählt Haftung. Deshalb hier kein Versprechen …"). Der von
`automation/deepen_hubs_gemini.py` erzeugte Block wechselt mitten auf derselben Seite
unvermittelt zu förmlichem „Sie" und in den typischen KI-Textbaustein-Stil: „Stellen Sie
sich vor, ein KI-System liest …", „Ein weiteres Beispiel ist …", und FAQ-Antworten, die
nur die Frage umformulieren, statt sie zu beantworten. **368 Seiten** (`ki-fuer-*.html`)
tragen denselben `data-aban-deep`-Block. Auf `ki-fuer-steuerberater.html` konkret neu
geschrieben — gleiche Struktur (H2 + 2 Absätze, H2 „Häufige Fragen" + 3 Details), aber
konkrete Fakten statt Blabla (Beleg-OCR mit Abacus/Bexio/Banana, Halluzinations-Warnung
bei Rechtsrecherche, FAQ-Antworten, die tatsächlich etwas behaupten) und „du" statt
„Sie", passend zum Rest der Seite.

**Bewusst NICHT auf alle 368 Seiten ausgerollt** — das wäre eine Serien-Textänderung
ohne Einzelprüfung, genau das Risiko, das diese Session aus der „Massenersetzung ohne
Diff-Kontrolle"-Lehre (3.9.) kennt. Eine spätere Session kann `ki-fuer-steuerberater.html`
als Vorlage für Ton & Struktur nehmen und branchenweise von Hand oder gezielt per Prompt
nachziehen — nicht als Bulk-Replace.

**Geprüft:** `html-validate` auf beiden Seiten — alle verbleibenden Fehler per Diff
gegen die vorherige `git show HEAD:<datei>`-Fassung als bereits vorher vorhanden
verifiziert (`unique-landmark` auf beiden Seiten, `no-inline-style`/`long-title` auf
`ki-fuer-steuerberater.html` — keine neuen Fehler durch diese Änderung). Playwright-
DOM-Abfrage: `ki-tool-vergleich.html` zeigt 16 `.hubcat`-Überschriften und genau 197
`.hubgrid a`-Links; Screenshot der obersten und einer mittleren Gruppen-Grenze zeigt
sauberen Umbruch. `ki-fuer-steuerberater.html`: Screenshot des neuen Abschnitts zeigt
die 2 Absätze + 3 FAQ-Fragen wie erwartet gerendert.
