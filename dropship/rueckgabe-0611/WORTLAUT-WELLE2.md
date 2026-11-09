# Rückgabe-Texte Welle 2: neuer Wortlaut zur Freigabe (09.11.2026)

Regel (wie bei Printful, Besitzer 06.11.): Selbst gestaltete Artikel werden erst nach der Bestellung nach deinem Entwurf gedruckt. Keine Rückgabe und kein Umtausch aus Meinungsänderung oder falscher Grössen-/Farbwahl. Bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust gibt es Ersatz oder Erstattung (Meldung innert 30 Tagen nach Erhalt, bei nicht angekommenem Paket bis 30 Tage nach dem voraussichtlichen Lieferdatum, an info@luxestyle.ch mit Bestellnummer und Foto). Gesetzliche Mängelrechte bleiben unberührt. Alle anderen Produkte: 30 Tage Rückgabe wie bisher.

Der Trockenlauf vom 09.11. (Shop frisch gelesen) findet alle 14 Ziele unverändert vor: 14 zu ändern, 0 Probleme. Nichts ist geschrieben.


## theme_json: templates/cart.json

**G9 Theme Warenkorb Vertrauensliste** (templates/cart.json :: /sections/lux_cart_trust/settings/custom_liquid)

Vorher: [Weiche] ↩️ 30 Tage Rückgaberecht
[Weiche] ✔️ Ersatz bei Druckfehlern (selbst gestaltete Artikel)
[Weiche] ↩️ 30 Tage Rückgaberecht · selbst gestaltete Artikel: ✔️ Ersatz bei Druckfehlern
[Weiche]

Nachher: [Weiche] ↩️ 30 Tage Rückgaberecht
[Weiche] ✔️ Selbst gestaltete Artikel: Ersatz bei Druckfehlern statt Rückgabe (Regeln (→ /policies/refund-policy#selbst-gestaltete-artikel))
[Weiche] ↩️ 30 Tage Rückgaberecht, ausser bei selbst gestalteten Artikeln: dort Ersatz bei Druckfehlern statt Rückgabe (Regeln (→ /policies/refund-policy#selbst-gestaltete-artikel))
[Weiche]


## theme_json: sections/header-group.json

**G10 Theme Ankündigungsleiste (jede Seite)** (sections/header-group.json :: /sections/header_announcements_9jGBFp/blocks/ls_announce_3/settings/text)

Vorher: ↩️ 30 Tage Rückgabe

Nachher: ↩️ 30 Tage Rückgabe (ausser selbst gestaltete Artikel)


## theme_json: sections/footer-group.json

**G11 Theme Fusszeile (jede Seite)** (sections/footer-group.json :: /sections/footer_m9NzUG/blocks/text_lx_kontakt/settings/text)

Vorher: 30 Tage Rückgabe (→ /policies/refund-policy)

Nachher: 30 Tage Rückgabe (ausser selbst gestaltete Artikel) (→ /policies/refund-policy)


## theme_json: templates/collection.json

**G12 Theme Sammlungsseite USP-Reihe** (templates/collection.json :: /sections/lux_usp_coll/settings/custom_liquid)

Vorher: 30 Tage Rückgabe

Nachher: [Weiche] Ersatz bei Druckfehlern[Weiche] 30 Tage Rückgabe (ausser selbst gestaltete Artikel)[Weiche] 30 Tage Rückgabe[Weiche]

**G13 Theme Sammlungsseite FAQ «Wie funktioniert die Rückgabe?»** (templates/collection.json :: /sections/lux_faq/settings/custom_liquid)

Vorher: Wir gewähren ein freiwilliges 30-Tage-Rückgaberecht. Eine kurze Nachricht an info@luxestyle.ch genügt.

Nachher: [Weiche] Selbst gestaltete Artikel werden erst nach deiner Bestellung für dich gedruckt und können nicht zurückgegeben oder umgetauscht werden. Bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust ersetzen wir sie oder erstatten dir den Kaufbetrag. Bitte melde dich innerhalb von 30 Tagen nach Erhalt (Paket nicht angekommen: bis 30 Tage nach dem voraussichtlichen Lieferdatum) unter info@luxestyle.ch, mit Bestellnummer und Foto. Deine gesetzlichen Rechte bei Mängeln bleiben unberührt. Alle Regeln und Ausnahmen (→ /policies/refund-policy#selbst-gestaltete-artikel)
[Weiche] Wir gewähren ein freiwilliges 30-Tage-Rückgaberecht, ausgenommen selbst gestaltete Artikel: Dort gibt es bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust Ersatz oder Erstattung (Regeln (→ /policies/refund-policy#selbst-gestaltete-artikel)). Eine kurze Nachricht an info@luxestyle.ch genügt.
[Weiche] Wir gewähren ein freiwilliges 30-Tage-Rückgaberecht. Eine kurze Nachricht an info@luxestyle.ch genügt.
[Weiche]


## theme_liquid: sections/lux-assistent.liquid

**G14 Theme Chat-Assistent Thema Rückgabe (Zeile 201)** (sections/lux-assistent.liquid Zeile 201)

Vorher: Ausgenommen sind z. B. geöffnete Hygieneartikel und personalisierte Artikel.

Nachher: Ausgenommen sind z. B. geöffnete Hygieneartikel sowie personalisierte und selbst gestaltete Artikel (dort gibt es bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust Ersatz oder Erstattung).

**G14 Theme Chat-Assistent Thema Defekt (Zeile 204, Frist)** (sections/lux-assistent.liquid Zeile 204)

Vorher: melde dich bitte innerhalb von 7 Tagen nach Erhalt unter '+MAIL+' – mit Bestellnummer

Nachher: melde dich bitte innerhalb von 7 Tagen nach Erhalt (bei selbst gestalteten Artikeln bitte innerhalb von 30 Tagen) unter '+MAIL+' – mit Bestellnummer

**G14 Theme Chat-Assistent Thema Defekt (Zeile 204, Widerspruch W6)** (sections/lux-assistent.liquid Zeile 204)

Vorher: Hast du selbst eine falsche Grösse oder Adresse gewählt? Dann gilt die 30-Tage-Rückgabe (Rücksendekosten trägst du).

Nachher: Hast du selbst eine falsche Grösse oder Adresse gewählt? Dann gilt bei normaler Ware die 30-Tage-Rückgabe (Rücksendekosten trägst du). Bei selbst gestalteten Artikeln gibt es dafür keine Rückgabe und keinen Umtausch.

**G14 Theme Chat-Assistent Thema Garantie (Zeile 207)** (sections/lux-assistent.liquid Zeile 207)

Vorher: melde dich bitte innerhalb von 7 Tagen nach Erhalt unter '+MAIL+' (Bestellnummer, Foto oder Video).

Nachher: melde dich bitte innerhalb von 7 Tagen nach Erhalt (bei selbst gestalteten Artikeln bitte innerhalb von 30 Tagen) unter '+MAIL+' (Bestellnummer, Foto oder Video).

**G14 Theme Chat-Assistent Thema Personalisiert (Zeile 219)** (sections/lux-assistent.liquid Zeile 219)

Vorher: Selbst gestaltete oder personalisierte Artikel sind von der Rückgabe ausgeschlossen, sofern kein Mangel vorliegt.

Nachher: Selbst gestaltete oder personalisierte Artikel sind von der Rückgabe ausgeschlossen, sofern kein Mangel vorliegt. Bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust ersetzen wir sie oder erstatten dir den Kaufbetrag. Bitte melde dich innerhalb von 30 Tagen nach Erhalt (Paket nicht angekommen: bis 30 Tage nach dem voraussichtlichen Lieferdatum). Deine gesetzlichen Rechte bei Mängeln bleiben unberührt.


## sammlung_beschreibung: selbst-gestalten-1

**G15 Sammlung «Selbst gestalten» Beschreibung** (descriptionHtml)

Vorher: Gestaltete Artikel sind von der Rückgabe ausgenommen, bei Druckfehlern gibt es Ersatz.

Nachher: Selbst gestaltete Artikel sind von der Rückgabe ausgenommen, bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust gibt es Ersatz oder Erstattung.


## richtlinie: refund-policy

**G16 Rückgaberichtlinie (Einleitung)** (body)

Vorher: Diese Regelung gilt für Lieferungen in die Schweiz und nach Liechtenstein.

Nachher: Diese Regelung gilt für Lieferungen in die Schweiz und nach Liechtenstein. Für selbst gestaltete Artikel gilt sie nicht: Dafür gelten die Regeln im Abschnitt «Selbst gestaltete Artikel (→ #selbst-gestaltete-artikel)» weiter unten.

**G16 Rückgaberichtlinie (Liechtenstein)** (body)

Vorher: bei einem Rücktritt erstatten wir auch die ursprünglichen Kosten der Standardlieferung.

Nachher: bei einem Rücktritt erstatten wir auch die ursprünglichen Kosten der Standardlieferung. Ausgenommen sind Artikel, die nach deinen Vorgaben angefertigt werden, zum Beispiel selbst gestaltete Artikel (Art. 19 Abs. 1 Bst. c FAGG, siehe Abschnitt «Selbst gestaltete Artikel»).

**G16 Rückgaberichtlinie (Defekte, Meldefrist)** (body)

Vorher: Melde dich in diesem Fall bitte innerhalb von 7 Tagen nach Erhalt unter info@luxestyle.ch (→ mailto:info@luxestyle.ch).

Nachher: Melde dich in diesem Fall bitte innerhalb von 7 Tagen nach Erhalt unter info@luxestyle.ch (→ mailto:info@luxestyle.ch). Für selbst gestaltete Artikel bitten wir um Meldung innerhalb von 30 Tagen und entscheiden nach der Prüfung zwischen Ersatz und Erstattung (siehe Abschnitt «Selbst gestaltete Artikel»; deine gesetzlichen Rechte bei Mängeln bleiben unberührt).

**G16 Rückgaberichtlinie (Ausschlussliste)** (body)

Vorher: Personalisierte, individuell angefertigte oder nach deinen Wünschen gestaltete Artikel (z. B. Gravuren, individuelle Anfertigungen).

Nachher: Personalisierte, individuell angefertigte oder nach deinen Wünschen gestaltete Artikel (z. B. Gravuren, individuelle Anfertigungen, selbst gestaltete Artikel; siehe Abschnitt «Selbst gestaltete Artikel»).

**G16 Rückgaberichtlinie (neuer Abschnitt)** (body)

Vorher: Fragen zu deiner Rückgabe?

Nachher: Selbst gestaltete Artikel (Druck auf Bestellung)
Für Artikel, die du im Editor mit eigenem Motiv, Foto oder Text gestaltest, gilt statt des 30-tägigen Rückgaberechts die folgende Regelung. Eine Kurzfassung steht auf jeder Produktseite dieser Artikel.
 Was ausgeschlossen ist. Selbst gestaltete Artikel werden erst nach deiner Bestellung nach deinem Entwurf gedruckt und lassen sich nicht weiterverkaufen. Darum nehmen wir sie nicht zurück und tauschen sie nicht um, wenn du deine Meinung änderst, der Artikel dir nicht gefällt oder du Grösse, Farbe, Motiv oder Text falsch gewählt hast. Miss vor der Bestellung nach der Grössentabelle nach und prüfe deinen Entwurf in der Vorschau.
 Was bei Mängeln gilt. Der Ausschluss gilt nicht bei Mängeln. Wir ersetzen den Artikel kostenlos oder erstatten dir den Kaufbetrag, wenn der Artikel (a) fehlerhaft gedruckt ist, etwa durch verzogenen Druck, falsche Platzierung oder Farben, die klar von deinem bestellten Entwurf abweichen, oder einen Herstellungsfehler hat, (b) beschädigt ankommt, auch durch den Transport, (c) falsch geliefert wurde (ein anderer Artikel oder eine andere Grösse als bestellt, erkennbar am Etikett) oder ein Teil fehlt, oder (d) auf dem Versand verloren geht.
 Frist. Bitte melde einen sichtbaren Mangel, zum Beispiel einen Fehldruck oder einen Transportschaden, innerhalb von 30 Tagen nach Erhalt. Einen Mangel, den du erst später entdeckst, zum Beispiel einen Druck, der sich bei normaler Pflege löst, melde bitte sofort nach der Entdeckung. Kommt dein Paket nicht an, warte nach dem voraussichtlichen Lieferdatum aus deiner Versandbestätigung bitte 3 Werktage ab und melde dich dann bis 30 Tage nach diesem Datum. Steht in der Versandbestätigung kein Lieferdatum, gilt das Ende der Lieferzeit, die auf der Produktseite und in der Versandrichtlinie genannt ist. In dieser Zeit können wir den Fall beim Hersteller geltend machen und dir schnell helfen.
 Nachweis. Schick uns die Bestellnummer, eine kurze Beschreibung und ein deutliches Foto des ganzen Artikels, bei Druckfehlern zusätzlich des betroffenen Bereichs. Bei einem falschen Artikel zeig den Lieferschein im selben Foto, bei fehlenden Teilen fotografiere Verpackung und Lieferschein. Ohne Foto können wir einen Mangel in der Regel nicht prüfen.
 Abhilfe. Nach der Prüfung entscheiden wir, ob wir den Artikel neu drucken und versenden oder dir den Kaufbetrag erstatten. Ein Ersatzartikel wird neu gedruckt, das braucht wieder Produktions- und Lieferzeit. Eine Erstattung geht auf dein ursprüngliches Zahlungsmittel. In der Regel musst du den Artikel nicht zurücksenden. Verlangen wir ausnahmsweise eine Rücksendung, nennen wir dir die Adresse und übernehmen die Kosten.
 Was kein Mangel ist. Nicht ersetzt oder erstattet werden: (a) falsche Wahl oder Eingabe von Grösse, Farbe, Motiv, Text oder Lieferadresse, (b) Nichtgefallen, (c) leichte Farb- und Detailabweichungen zwischen Bildschirm und Druck, (d) Schäden durch unsachgemässen Gebrauch oder durch Pflege entgegen den Pflegehinweisen auf dem Etikett oder der Produktseite. Wird dein Paket laut Sendungsverfolgung als zugestellt gemeldet und du hast es nicht erhalten, schau bitte zuerst bei Nachbarn und der Poststelle nach und melde dich bei uns: Wir prüfen den Fall, ein Ersatz ist in diesem Fall aber nicht zugesichert. Nicht zustellbare oder nicht abgeholte Sendungen regelt die Versandrichtlinie.
 Ablauf und Kontakt. Schreib an info@luxestyle.ch und setz die Bestellnummer in den Betreff. Wir antworten in der Regel innert 24 Stunden an Werktagen und nennen dir die Lösung: Ersatz oder Erstattung.
 Liechtenstein. Für Bestellungen nach Liechtenstein gilt das gesetzliche Rücktrittsrecht von 14 Tagen nach dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG) nicht für Artikel, die nach deinen Vorgaben angefertigt werden (Art. 19 Abs. 1 Bst. c FAGG), zum Beispiel mit deinem eigenen Motiv, Foto oder Text. Wir weisen dich vor der Bestellung im Kasten auf der Produktseite darauf hin.
 Gesetzliche Rechte. Deine gesetzlichen Rechte bei Mängeln bleiben von diesen Regeln unberührt.
Fragen zu deiner Rückgabe?


## richtlinie: terms-of-service

**G17 AGB §7 Rückgabe** (body)

Vorher: nach dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG).

Nachher: nach dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG). Für selbst gestaltete Artikel gelten die besonderen Regeln im Abschnitt «Selbst gestaltete Artikel» der Rückgaberichtlinie; für Artikel, die nach deinen Vorgaben angefertigt werden, besteht auch in Liechtenstein kein Rücktrittsrecht (Art. 19 Abs. 1 Bst. c FAGG).

**G17 AGB §8 Gewährleistung** (body)

Vorher: Bei Mängeln informiere uns bitte innerhalb von 7 Tagen ab Erhalt der Ware unter info@luxestyle.ch.

Nachher: Bei Mängeln informiere uns bitte innerhalb von 7 Tagen ab Erhalt der Ware unter info@luxestyle.ch. Bei selbst gestalteten Artikeln bitten wir um Meldung innerhalb von 30 Tagen ab Erhalt (bei einem Paket, das nicht ankommt: bis 30 Tage nach dem voraussichtlichen Lieferdatum). Einen Mangel, den du erst später entdeckst, bitten wir dich sofort nach der Entdeckung zu melden. Deine gesetzlichen Rechte bei Mängeln bleiben unberührt.


## seite_veroeffentlicht: rueckgabe

**G18 Seite Rückgabe & Widerruf (Tabelle)** (body)

Vorher: Gefällt mir nicht / Grösse falsch
Du (CHF 7–15)

Nachher: Gefällt mir nicht / Grösse falsch
Du (CHF 7–15). Nicht bei selbst gestalteten Artikeln: dort gibt es keine Rückgabe.

**G18 Seite Rückgabe & Widerruf (Ausgenommen)** (body)

Vorher: (z. B. eigene Designs, Gravur) und Verderbliches.

Nachher: (z. B. eigene Designs, Gravur) und Verderbliches. Für selbst gestaltete Artikel gelten eigene Regeln: Selbst gestaltete Artikel (→ /policies/refund-policy#selbst-gestaltete-artikel).

**G18 Seite Rückgabe & Widerruf (Umtausch)** (body)

Vorher: bestellst die gewünschte Grösse oder Farbe neu — so ist dein Wunschartikel gesichert, solange er verfügbar ist.

Nachher: bestellst die gewünschte Grösse oder Farbe neu — so ist dein Wunschartikel gesichert, solange er verfügbar ist. Das gilt nicht für selbst gestaltete Artikel: Sie werden für dich gedruckt und können nicht zurückgegeben oder umgetauscht werden.


## seite_veroeffentlicht: garantie

**G18 Seite Garantie & Rückgabe (Ausgenommen)** (body)

Vorher: Details: Rückgabe & Umtausch (→ /pages/rueckgabe).

Nachher: Details: Rückgabe & Umtausch (→ /pages/rueckgabe). Selbst gestaltete Artikel: Ersatz bei Druckfehlern statt Rückgabe (Regeln (→ /policies/refund-policy#selbst-gestaltete-artikel)).

**G18 Seite Garantie & Rückgabe (Frist)** (body)

Vorher: Schick uns innert 7 Tagen nach Erhalt ein Foto oder kurzes Video mit deiner Bestellnummer.

Nachher: Schick uns innert 7 Tagen nach Erhalt (bei selbst gestalteten Artikeln bitte innert 30 Tagen) ein Foto oder kurzes Video mit deiner Bestellnummer.

**G18 Seite Garantie & Rückgabe (Kopfzeile «für jede Bestellung»)** (body)

Vorher: Das hier gilt für jede Bestellung.

Nachher: Das hier gilt für jede Bestellung (Ausnahme: selbst gestaltete Artikel, siehe unten).

**G18 Seite Garantie & Rückgabe (du entscheidest)** (body)

Vorher: Antwort in der Regel innert 24 Stunden an Werktagen, mit Lösungsvorschlag: Ersatz oder Erstattung — du entscheidest

Nachher: Antwort in der Regel innert 24 Stunden an Werktagen, mit Lösungsvorschlag: Ersatz oder Erstattung — du entscheidest (bei selbst gestalteten Artikeln entscheiden wir nach der Prüfung zwischen Ersatz und Erstattung)


## seite_veroeffentlicht: faq-rueckgabe-umtausch

**G18 Seite FAQ Rückgabe & Umtausch (Ausnahmen)** (body)

Vorher: sofern das Siegel geöffnet oder die Personalisierung bereits ausgeführt wurde. Bei Fragen melde dich vorab gerne bei uns.

Nachher: sofern das Siegel geöffnet oder die Personalisierung bereits ausgeführt wurde. Selbst gestaltete Artikel sind immer ausgeschlossen, weil sie erst nach deiner Bestellung für dich gedruckt werden; bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust gibt es Ersatz oder Erstattung (Details (→ /policies/refund-policy#selbst-gestaltete-artikel)). Bei Fragen melde dich vorab gerne bei uns.


## seite_veroeffentlicht: fan-trikot-selbst-gestalten

**G18 Seite Fan-Trikot selbst gestalten** (body)

Vorher: 🚚 Gratis Versand ab CHF 50 · ↩️ 30 Tage Rückgabe aufs Sortiment.

Nachher: 🚚 Gratis Versand ab CHF 50 · ✔️ Ersatz bei Druckfehlern.


## seite_veroeffentlicht: groessentabelle

**G18 Seite Grössen-Guide (Ausnahme selbst gestaltet)** (body)

Vorher: wird eigens für dich gedruckt und lässt sich nicht weiterverkaufen — Umtausch und Rückgabe aus Meinungsänderung sind dort ausgeschlossen. Bei Druckfehlern, Beschädigung oder falscher Lieferung ersetzen wir selbstverständlich.

Nachher: wird eigens für dich gedruckt und lässt sich nicht weiterverkaufen. Darum sind Umtausch und Rückgabe aus Meinungsänderung dort ausgeschlossen. Bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust ersetzen wir den Artikel oder erstatten dir den Kaufbetrag. Bitte melde dich innerhalb von 30 Tagen nach Erhalt (Paket nicht angekommen: bis 30 Tage nach dem voraussichtlichen Lieferdatum); deine gesetzlichen Rechte bei Mängeln bleiben unberührt.


## blog_artikel: ratgeber/adventskalender-zum-befuellen-24-kleine-geschenke-ratgeber

**G22 Blog-Artikel «Adventskalender zum Befüllen» (Magnet-Karte)** (body)

Vorher: ist eine Rückgabe aus Meinungsänderung ausgeschlossen; bei Druckfehlern oder Beschädigung wird ersetzt.

Nachher: ist eine Rückgabe aus Meinungsänderung ausgeschlossen; bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust gibt es Ersatz oder Erstattung (Regeln: Selbst gestaltete Artikel (→ /policies/refund-policy#selbst-gestaltete-artikel)).
