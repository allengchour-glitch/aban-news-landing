# Optik-Politur «Webseite 1A» (LIVE 04.11.2026 ~13:35 UTC, Stufe 1)

Auftrag des Besitzers (04.11.): «solche wie das kleine verbesserung automatisch suchen und ergänzen bitte, so dass webseite 1A ist und nicht billig» (später: «perfekter lebende webseite»). Nicht angefasst, weil nicht Teil des Auftrags: Preise, Versandschwellen-Texte, Rabattcodes, AGB/Impressum/Datenschutz, Produkte und ihre Texte, Menüstruktur, Kategoriebilder, Social-Beiträge.

## Verfahren
Workflow `optik-suche` (`wf_fb10406e-0a1`): drei Sucher sahen den Live-Shop als Mensch an (Desktop 1440, Handy 390 mit Touch, Startseite · Kategorie/Produkt/Suche · Warenkorb/Inhaltsseiten/404/Typografie) und meldeten Funde; **jeder Fund wurde von einem zweiten, unabhängigen Prüfer selbst nachgestellt** (Playwright am Live-Shop, Fix per Style-Einschub im Browser, nichts geschrieben), oft mit einem besseren Fix als dem vorgeschlagenen. Eingebaut wurde nur, was nachgestellt, gemessen und umkehrbar ist. Rohberichte: Journal des Workflows (nicht im Repo).

## Stufe 1: was live ist (`apply.mjs`, Änderungen in `patches.mjs`)
| Fund | Wo | Wirkung (GEMESSEN vom Prüfer) |
|---|---|---|
| Newsletter-Popup erschien gleichzeitig mit dem eigenen Cookie-Hinweis (die Prüfung fragte nur nach einem Shopify-Banner, den es nicht gibt) | `sections/footer-group.json`, Block `custom_liquid_lxpopup` (3 Ersetzungen, +136 Byte) | Popup bleibt weg, solange der Hinweis offen ist, und kommt erst 8 s nach der Entscheidung (zwei Prüfer unabhängig; beim sofortigen Erscheinen nach dem Klick lag der erste Vorschlag zu knapp) |
| Handy-Menü: untere Leiste verdeckte die letzten Zeilen und die Sprach-/Währungswahl (der Vorschlag «nur Polster» liess 6 Untermenüs und das Sprachfeld verdeckt) | `assets/luxe-edit.css` (nur Startseite und `/fr`) | Leiste verschwindet bei offener Schublade, 24 px Luft am Ende: 0 von 19 Untermenüs verdeckt |
| «Mode im Detail» und «Mach es persönlich»: graue/helle Seitenstreifen um die Fotos | `assets/luxe-edit.css` | Foto 487×649 und Kollage 384×480 füllen ihre Fläche (Desktop 1440 live nachgemessen) |
| «Schmuck entdecken»/«Für dein Zuhause»: quadratische Fotos in zu flacher Box (Streifen bis 248 px), Zweier-Reihe 872 px hoch | `assets/luxe-edit.css` | Boxen quadratisch (421 und 302 px), Zweier-Reihe ab 1100 px als Querkarte (Foto links, Text rechts), Seite bei 1440 px −143 px; unter 1100 px quadratische Karten untereinander (+109 bis +257 px) |
| Hilfe-Knopf deckte am Seitenende drei von vier Social-Symbolen | `layout/theme.liquid`, Style-Block `lx-optik-0411` | 52 px Platz unter der Fusszeile statt Verschiebung: Symbole bei y 776, Knopf bei y 828 (live: alle anklickbar) |
| Ankündigungsleiste Handy: dreizeilige Texte mit Zeilenhöhe 12 px bei Schrift 12 px | gleicher Block | Zeilenhöhe 15,6 px, Leiste 67 → 66 px (live), Umbrüche unverändert |
| Karten mit adaptivem Bildformat (Ähnliche Produkte, Suche, Warenkorb-Empfehlungen, 404): Karten bis 745 px hoch mit Leerraum | gleicher Block | einheitlich 4:5 (live: alle Galerien 329 px, alle Karten 423 px) |
| Leere Sterne und «Noch keine Bewertungen» auf fast jeder Kartenzeile (Damen-Schuhe: 46 von 48) | gleicher Block | ausgeblendet (live 46 von 46 unsichtbar, die 2 bewerteten bleiben), Seite −6 % Desktop, −14 % Handy; Fortsetzung der Besitzer-Antwort 03.11. («leere Sterne ja»), erfunden wird nichts |
| Fusszeile: drei Überschriftstile, 15 Links einspaltig, 687 px hoch | gleicher Block | einheitlich Serif 24/500 (live), Linkliste zweispaltig, wenn die Spalte breit genug ist (`columns:150px 2`), Fusszeile 687 → 490 px |

## Live nachgemessen (04.11. 13:37–13:50 UTC, Playwright, Chromium)
Rücklesen aller drei Dateien GLEICH (md5 `3bc2da31…` Theme, `91cd0d7a…` CSS, `41781248…` Footer); Startseite, `/fr`, Kategorie, Produkt HTTP 200, 0 «Liquid error», 0 Seitenfehler; kein seitliches Scrollen (1440 und 390); Handy-Schublade: Leiste `display:none`, CHF/DE treffbar; Popup: 42 s lang Cookie-Hinweis offen und Popup zu, nach «Nur notwendige» Popup erst nach +11 s; `pruefen_live.mjs` (Rotation) weiter GLEICH.

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/optik-0411/apply.mjs` schreibt die Sicherungen (`sicherung/*.vor`) zurück, aber nur, wenn alle drei Dateien noch exakt dem eingespielten Stand entsprechen (sonst Exit 3: von Hand mit `zuruecknehmen()` aus `patches.mjs`, das die eingefügten Blöcke gezielt entfernt; offline gegen die Live-Dateien geprüft: Roundtrip byte-gleich).

## Bewusst offen / Grenzen
- Nur Chromium gemessen (kein Safari, Firefox, echtes iPhone); `:has()` wird für Menü-Leiste verwendet (ältere Browser: Verhalten wie bisher).
- Wer den Cookie-Hinweis nie beantwortet, sieht das Popup nie (so war es im Code von Anfang an beabsichtigt, vorher aber wirkungslos). Wirkung auf Newsletter-Anmeldungen **ungemessen**; die Klaviyo-Flows stehen seit 02.11. auf `draft` (Popup verspricht eine Mail).
- Auf der Handy-Startseite liegt der Hilfe-Knopf fast ganz hinter der unteren Leiste (nicht antippbar, Nebenbefund eines Prüfers, nicht geändert).
- Wirkung auf Verkäufe **ungemessen** (Kontrolle Mi 05.11., Mo 10.11.).
