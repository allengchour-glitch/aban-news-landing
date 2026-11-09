# Französisch Stufe 4: neun Servicepages (09.11.2026)

Besitzer 09.11. abends: «übersetzten franz.». Davor: Stufe 1 bis 3 am 08.11. (acht Seiten, Menüs, 1 498 Sammlungstitel, `dropship/fr-uebersetzung-0811/`) und am 09.11. 18:29 UTC die Richtlinien Rückgabe und AGB (`dropship/fr-richtlinien-0911/`).

**Auslegung (meine, nicht bestätigt):** die französische Sprache des Shops (veröffentlicht, `/fr/`) weiterführen: zuerst die Seiten, die eine Kaufentscheidung stützen (Rückgabe, Garantie, FAQ, Grössen), danach die übrigen Hilfeseiten. Für die grosse Menge (Produkte, Sammlungen, Artikel) geht Handarbeit nicht; dafür liegt der Auftrag für PC-Claude bereit (`dropship/BROWSER-BEFEHL-UEBERSETZEN-FR-0911.md`, Shopifys eigene App Translate & Adapt).

## Was LIVE ist (GEMESSEN)

Neun Seiten, je `title`, `body_html`, `meta_title`, `meta_description` in der Sprache `fr` (Läufe = Textstücke zwischen Block-Tags, siehe Methode):

| Seite (Handle) | Seiten-ID | Titel FR | Läufe | Zeichen DE → FR | geschrieben (UTC) |
|---|---|---|---|---|---|
| `rueckgabe` | 697899483521 | Retour et rétractation | 30 | 4 786 → 4 985 | 21:48:19 |
| `garantie` | 697899942273 | Garantie et retour · 30 jours | 31 | 5 267 → 5 524 | 21:48:20 |
| `faq` (mit FAQ-Daten) | 697899516289 | Questions fréquentes (FAQ) | 20 | 8 138 → 9 075 | 21:48:22 |
| `groessentabelle` | 697899975041 | Guide des tailles | 25 | 6 495 → 7 029 | 21:48:24 |
| `faq-versand-lieferung` | 699136541057 | Expédition et livraison – FAQ | 16 | 3 170 → 3 359 | 21:55:22 |
| `faq-zahlung-sicherheit` | 699136573825 | Paiement et sécurité – FAQ | 19 | 3 157 → 3 408 | 21:55:23 |
| `faq-rueckgabe-umtausch` | 699136606593 | Retour et échange – FAQ | 17 | 3 714 → 3 892 | 21:55:25 |
| `groessen-material-guide` | 699136672129 | Guide des tailles et des matériaux | 17 | 3 502 → 3 860 | 21:55:26 |
| `faq-schmuck-pflege-material` | 699136639361 | Entretien des bijoux et matériaux – FAQ | 19 | 3 450 → 3 650 | 21:55:28 |

Messungen am 09.11.:
- **Rücklesen** direkt nach dem Schreiben: 9 von 9 GLEICH, keines veraltet (`outdated`).
- **Zweiter Trockenlauf 21:58 UTC** (frisch gelesen): Prüfung OK, «überschreibt: []» bei allen neun (Live-Übersetzung = Soll).
- **Storefront 21:59 bis 22:00 UTC** (`curl`, Browser-Kopf, 8 s Pause wegen HTTP 429): alle neun HTTP 200, `<html lang="fr">`, französischer `<title>`, kein `robots`-Meta (die Seiten sind indexierbar, `noindex` gilt nur für Produkt, Sammlung, Artikel, Blog auf `/fr/`), im Hauptteil 0 mal «7 jours» und 0 Treffer aus einer Liste deutscher Wörter (Wortliste, kein Sprachdetektor).
- **FAQ-Daten 22:03 UTC:** `/fr/pages/faq` liefert `FAQPage` mit `inLanguage` `fr-CH`, `@id` `…/fr/pages/faq#faq`, 8 Fragen, erste Frage französisch; `/pages/faq` (deutsch) unverändert: `de-CH`, 8 Fragen, Titel «FAQ – Häufige Fragen | LuxeStyle Schweiz».
- **Deutsche Originale unverändert:** geschrieben wird nur `locale: fr`; die Digests der deutschen Felder wurden vor jedem Schreiben frisch gelesen.
- **Leiste und Fusszeile:** der Übersetzungsdatensatz der Ankündigungsleiste lautet «30 jours de retour (sauf articles personnalisés) · 🔒 Paiement sécurisé et chiffré» und ist nicht veraltet; die Fusszeile «Contact» ist französisch. Das hat eine andere Sitzung am 09.11. 18:4x UTC erledigt (PR #3024, `dropship/fr-leiste-fusszeile-0911/`); die Notiz vom 09.11. nachmittags («FR-Leiste und -Fusszeile sagen weiter «30 jours de retour»») ist damit überholt. Gemessen am Datensatz, nicht am gerenderten Storefront-HTML.

## Methode (`fr_lib.py`)

Das deutsche HTML wird in **Läufe** zerlegt: zusammenhängender Text samt Inline-Tags (`a, strong, b, em, i, span, br, u, small, sup, sub, mark, code, abbr, wbr, s`) zwischen zwei Block-Tags. Nur der Inhalt der Läufe wird ersetzt; Gerüst, Attribute, Stile und Skripte bleiben Zeichen für Zeichen gleich (`style` und `script` sind undurchsichtig). Kurze Grössenkürzel und reine Zahlen (`S`, `XL`, `38/39`) sind keine Läufe.

Prüfung vor jedem Schreiben (`pruefe`): gleiche Laufzahl; gleiches Gerüst; gleiche Folge der Inline-Tags; interne Links auf Richtlinien, Seiten, Sammlungen, Produkte und Blogs tragen `/fr/`; gleiche Ziffernfolgen (Preise, Fristen, Masse); kein deutscher Restsatz (Wortliste); `title` und `meta_title` höchstens 70 Zeichen, `meta_description` 60 bis 170 Zeichen; bei der FAQ wird das `FAQPage`-JSON-LD fragenweise übersetzt (`inLanguage` `fr-CH`, `@id` mit `/fr/`), gültiges JSON und gleiche Fragenzahl werden geprüft.

Wortwahl (wie bei den Richtlinien): «vous»; retour et rétractation; adresse de retour; frais de retour; remboursement; moyen de paiement d'origine; articles personnalisés (impression à la commande); expédition directe (dropshipping); nLPD. Texte stehen in `seiten_fr.py` (`SEITEN`).

Aufruf (Vorgabe: Trockenlauf, schreibt nichts):

```
python3 dropship/fr-seiten-0911/apply.py --selbsttest            # 13 Prüfungen ohne Netz
python3 dropship/fr-seiten-0911/apply.py                         # Trockenlauf: baut, prüft, vergleicht mit dem Live-Stand
LIVE=1 python3 dropship/fr-seiten-0911/apply.py                  # schreiben, frisch zurücklesen, Ledger lauf/seiten_ledger.json
NUR=faq,garantie LIVE=1 python3 dropship/fr-seiten-0911/apply.py # begrenzen
ZURUECK=1 LIVE=1 python3 dropship/fr-seiten-0911/apply.py        # genau diese französischen Felder wieder entfernen
```

Die Zugangsdaten kommen aus den Umgebungsvariablen (`SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`) über `dropship/ranking-0911/apply_fristen.py`.

**Rücknahme:** die neun Seiten hatten vorher keinen französischen Text (Messung 09.11. 21:52 UTC aus `translatableResources`), `ZURUECK=1 LIVE=1` stellt diesen Stand her (`translationsRemove`, nur die vier Felder, nur Sprache `fr`).

## Stand der französischen Sprache (GEMESSEN 09.11. 22:02 UTC)

| Bereich | Stand |
|---|---|
| Menüs und Menü-Links | übersetzt (08.11.) |
| Sammlungstitel | 1 498 (98 %) übersetzt (08.11.) |
| Richtlinien Rückgabe, AGB | übersetzt (09.11. 18:29 UTC) |
| Theme-Texte | rund 94 % (Stichprobe 08.11.) |
| **Seiten** | **18 von 107 veröffentlichten Seiten mit französischem Text** (17 von Claude, dazu «Selbst gestalten»); 89 ohne (siehe unten); dazu 115 unveröffentlichte interne Seiten (irrelevant) |
| Produkte | 0 von 50 in der Stichprobe vom 08.11. (56 492 aktive Produkte) |
| Sammlungs-Beschreibungen und Meta-Texte | deutsch (rund 1 700 Sammlungen) |
| Blog-Artikel | deutsch (351) |

Die **89 übrigen Seiten**: 6 fremdsprachige (`about-us-en`, `why-luxestyle-en`, `a-propos-fr`, `chi-siamo-it`, `privacy-policy-en`, `refund-policy-en`) bleiben wie sie sind; 14 tragen `<style>`-Blöcke; 1 trägt ein Skript (kein JSON-LD); zusammen 2 480 Läufe und 302 643 Zeichen. Ohne die Fremdsprachigen und die Stilblock-Seiten: 75 Seiten mit 1 698 Läufen. Es sind überwiegend Ratgeber- und Landingtexte für deutschsprachige Leser; auf `/fr/` hat der Shop kaum Verkehr (in drei Monaten 1 Klick auf `/fr/`-Seiten, Messung 07.11.). Nutzen und Aufwand stehen dafür in keinem guten Verhältnis: nur auf Zuruf übersetzen.

## Plan für den Rest

1. **Produkte, Sammlungen, Blog-Artikel:** Translate & Adapt, gestartet von PC-Claude (Auftrag liegt bereit). Quelle für die Grenzen der App: Dritte (Shopify-Community), nicht an Shopifys Hilfe bestätigt: automatische Übersetzung für zwei Sprachen, rund 100 Millionen Zeichen im Jahr; für Französisch allein hochgerechnet rund 70 Millionen Zeichen (Schätzung, nicht gemessen). Erscheint ein Preis oder eine Obergrenze, hält PC-Claude an.
2. **Danach misst Claude** die Abdeckung je Typ (`translatableResources`, Anteil mit `fr` und nicht veraltet), sucht beschädigtes HTML (Stile, Skripte, strukturierte Daten, die Markierungsblöcke `<!-- ls-verwandt -->` und `<!-- gd2 -->` der Sammlungen) und stichprobt Produkte.
3. **`noindex` aufheben** erst, wenn mindestens 95 % übersetzt sind. Die Regel steht in `layout/theme.liquid` des Hauptthemes («LuxeStyle – Schrift und Banner 02.11.2026», `request.locale.primary == false` und Vorlage `product`, `collection`, `article` oder `blog`); einen Schalter je Ressource gibt es in Shopify nicht. Entwurf für später: ein Shop-Metafeld (zum Beispiel `luxe.fr_index`), das die Regel ein- und ausschaltet, statt jedes Mal das Theme zu bearbeiten.
4. **Offene Idee (nicht umgesetzt):** die 89 unübersetzten `/fr/pages/…`-Seiten tragen deutschen Text unter französischer Adresse und sind indexierbar (die Regel von 07.11. gilt für Seiten nicht). Eine Liste der übersetzten Seiten (Shop-Metafeld) könnte die übrigen auf `noindex` stellen. Wirkung auf die Suche unbekannt; Entscheid offen.

## Grenzen und Ungemessenes

- **Maschinell-redaktionell übersetzt** (von Claude), **keine muttersprachliche und keine juristische Gegenlesung**; bei Rückgabe, Garantie und FAQ-Antworten zu Fristen wäre sie sinnvoll (Hinweis wie bei den Richtlinien).
- Das Aussehen im Browser wurde **nicht gesichtet** (nur HTML gemessen); das Gerüst ist byte-gleich, französische Texte sind aber 4 bis 12 % länger (Zeilenumbrüche, Tabellenspalten bei den Grössen-Tabellen).
- **Mutationsprobe der Prüffunktionen nicht gefahren**; der Selbsttest deckt die Fehlerfälle Laufzahl, Inline-Tag, Link ohne `/fr`, Ziffer, deutscher Rest, JSON-LD-Sprache und Fragenzahl ab, nicht ein Gerüst, in das ein Lauf ein Block-Tag einschmuggelt.
- Indexierung der neuen französischen Seiten und Wirkung auf Verkäufe: **ungemessen**.

## Lehren

1. Eine Sprache ist erst fertig, wenn auch die strukturierten Daten übersetzt sind: das `FAQPage`-JSON-LD der FAQ trug sonst deutsche Fragen unter französischer Adresse.
2. Französische Meta-Beschreibungen werden leicht zu lang (Garantie 182 Zeichen beim ersten Entwurf, FAQ 179): die Längenprüfung hat sie vor dem Schreiben abgefangen.
3. Namen aus der GraphQL-Schnittstelle: `translatableResource(resourceId: "gid://shopify/Page/<id>")` (nicht `OnlineStorePage`), Aufzählung `PAGE` für `translatableResources`, die Übersetzungen heissen im Ergebnis `translations`.
4. Eine Notiz im Gedächtnis («Leiste sagt weiter 30 jours») war überholt: vor dem Weitergeben am Datensatz messen.
