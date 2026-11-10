# Chancen aus der Keywordliste: Prüfung am 10.11.2026 (im Shop nichts geändert)

Auftrag des Besitzers am 10.11. (nachts): «alles empfohlen, ich weiss nicht. entscheide du und mach.» Meine Auslegung (nicht bestätigt): die Chancen der neuen Keywordliste (`dropship/keywordliste-1011/README.md`) nur dann anfassen, wenn der Eingriff belegbar wahr ist und keine laufende Messung stört.

## Ergebnis in einem Satz
Alle vier Chancen bleiben bewusst unverändert. Jeder mögliche Eingriff hätte entweder die Messung vom 18.11. gestört oder etwas behauptet, das kein Datenblatt belegt. Es wurde nichts im Shop geschrieben.

## Entscheid je Chance
Messwerte: Search Console über OpenSEO, 04.10. bis 07.11.2026, siehe `CLAUDE.md` (Stand 09.11./10.11.) und `dropship/ranking-0911/gsc_basis_0911.json`.

**1. Familien- und Partner-Weihnachtspyjama** (Sammlung `weihnachtspyjama-familie`, Produkte `weihnachts-pyjama-sets-fur-die-ganze-familie-613100` und `weihnachts-pyjama-im-partnerlook-764352`; Sammlung Position 24,3 bei 327 Einblendungen). **Nicht angefasst.** Titel und Meta der beiden Produkte und der Sammlung wurden am 04.11. neu gesetzt (`dropship/seo-nahe-0411/README.md`); die Wirkung wird am 18.11. gemessen (Wecker `trig_01SDXKRsFJt9a4sBxM6WvutK`). Ein weiterer Eingriff vorher machte diese Messung wertlos. Der genaue Ausdruck «Familien-Weihnachtspyjama» steht schon im SEO-Titel der Sammlung («Familien-Weihnachtspyjama & Partnerlook | LuxeStyle CH»), also auf der Seite, die dafür ranken soll. Frisch gelesen am 10.11.: SEO-Titel und -Beschreibung der drei Seiten gesetzt, beide Produkte ACTIVE.

**2. Trinkbrunnen für Katzen** (rund 900 Einblendungen auf drei Seiten, Position 24 bis 49, 0 Klicks). **Nicht angefasst**, und die Seite `trinkbrunnen-fur-haustiere-411520` ist keine Chance, sondern ein Missverständnis:
- Das CJ-Datenblatt (gelesen am 10.11., `pid 1366573785234411520`, `productSku CJGY1025454`) beschreibt einen **schwimmenden Wassernapf** («Pet floating water bowl», 1,5 L, ABS und PP, schwimmende Platte bremst das Trinken, Überlaufschutz, Packliste «Water bowl ×1»). Keine Pumpe, kein Strom, kein Filter. Der Lieferantentitel nennt «Pet Fountain», das Produkt ist keiner.
- Nur der Handle (`trinkbrunnen-…`) lockt Suchanfragen nach Trinkbrunnen auf diese Seite. Titel («Anti-Schwapp-Wassernapf für Hund & Katze») und Meta sind ehrlich. Die Meta nennt «1,5 oder 2 Liter»: belegt, der Lieferant führt 1,5-L- und 2-L-Varianten (`CJGY102545423WD` und weitere «2L»).
- Das Produkt liegt in Napf-Sammlungen (`tier-naepfe`, `haustier-napf-futter` …), **nicht** in `trinkbrunnen-katzen`. Für «Trinkbrunnen Katze» ist die Sammlung `trinkbrunnen-katzen` (24 Produkte) die richtige Seite; sie bekam am 09.11. eine Kaufhilfe (`dropship/ranking-0911/README.md`). Den Napf auf «Trinkbrunnen» zu trimmen wäre irreführend und brächte enttäuschte Besucher. Der Handle bleibt (Umbenennen braucht eine Weiterleitung, Nutzen klein).

**3. Automatischer Futterspender für Katzen** (`futterautomat-fur-katze-527488`, CHF 96.90). **Nicht angefasst**, weil das Datenblatt zu dünn ist: CJ (`pid 1418384701726527488`, `productSku CJMY1224225`, gelesen am 10.11.) nennt nur «Material: stainless steel», «Features: automatic feeding», «Colour: White», 2 200 g, Eigenschaften «ELECTRONIC, OVERSIZE», Packliste «Pet smart feeder ×1». **Keine Angabe** zu Stromversorgung (Netzteil, Batterie, USB), Fassungsvermögen, Zeitplan oder App. Jede dieser Aussagen im Text wäre erfunden. Der heutige SEO-Text («mit Fütterungsfunktion … aus Edelstahl») ist wahr. Voraussetzung für mehr: Rückfrage bei CJ oder ein Muster. Der Lieferantentitel nennt «Timing»; der Beschreibungstext erklärt es nicht.

**4. «Selbst gestalten» (bedrucken 1 195, T-Shirt 953, Tasse 553 Einblendungen, Position 73 bis 87).** **Nicht angefasst.** Auf Platz 70 bis 90 ändert ein Text allein nichts; der Hebel sind Verweise von aussen und Vertrauen (nicht autonom lösbar, siehe `dropship/ranking-0911/README.md`).

## Wann sich das ändert
- **18.11.** (Wecker `trig_01SDXKRsFJt9a4sBxM6WvutK`): Search Console neu lesen, Sammlung und Produkte der Pyjama-Gruppe gegen die Basis vom 09.11. vergleichen. Bleibt die Sammlung hinter Platz 20, ist der nächste Schritt eine Verlinkung von stärkeren Seiten (Menü, Startseite), kein neuer Text.
- **02.12.**: zweite Messung.
- Futterspender: erst nach belegten Angaben (Rückfrage CJ).

## Lehren
1. **Ein Handle kann etwas versprechen, das das Produkt nicht ist.** Vor jedem Trimmen auf eine Suchanfrage das Datenblatt lesen: passt das Produkt zu dem, was die Anfrage will? Eine Seite mit Einblendungen für «Trinkbrunnen» ist keine Chance, wenn das Produkt ein Napf ist.
2. **CJ lesen ohne das Werkzeug `luxe_cj_product_read`:** es erlaubt eine Abfrage je Prozess und scheiterte hier an einem Netzfehler. Eigenes Skript mit `automation/lib/cj_token.mjs`: `product/query?pid=<pid>` oder `?productSku=<Produkt-SKU>`; `product/variant/query?productSku=<Produkt-SKU>` listet alle Varianten. `variantSku=` allein weist CJ ab (Code 1600300 «pid or productSku must be not empty»). Die Produkt-SKU ist meist die Varianten-SKU ohne die letzten vier Zeichen (`CJGY102545401AZ` gehört zu `CJGY1025454`). Zwischen den Abfragen mindestens 1,5 Sekunden Pause.
3. **«Nichts ändern» ist ein Ergebnis**, wenn die Gründe stehen und der nächste Messtermin feststeht.
