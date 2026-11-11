# Google-Korrekturpläne einspielen (`anwenden.mjs`)

Stand 11.11.2026. Das Werkzeug spielt die Korrekturpläne aus `gmc1111/korr/alle_plaene.json` sicher in den Shop ein.
Je Produkt: neue Bilder hochladen, Varianten neu binden, Titel, Beschreibung und SEO setzen, Optionswerte umbenennen,
Metafelder setzen oder löschen, alte Medien lösen, Reihenfolge setzen, alles frisch zurücklesen.
**Vorgabe ist der Trockenlauf.** Bisher lief das Werkzeug nur als Trockenlauf gegen den echten Shop (siehe «Gemessen»).

## Dateien

| Datei | Inhalt |
|---|---|
| `anwenden.mjs` | Werkzeug (Kommandozeile und `lauf(cfg, io)` für Tests) |
| `anwenden_test.mjs` | Tests mit einer Attrappe der Admin-API, kein Netz |
| `mutationsprobe.mjs` | 61 absichtliche Fehler im Werkzeug, jeder muss einen Test rot machen |
| `sicherung.json` | entsteht beim ersten LIVE-Lauf (je Handle ein Eintrag) |
| `ledger.txt` | entsteht beim ersten LIVE-Lauf (eine Zeile je Produkt und Lauf) |

Andere Dateien in diesem Ordner (`yoga_*.py`, `uhr/`, `lies_desc.mjs`) stammen aus anderen Arbeiten und gehören nicht zum Werkzeug.

## Aufruf

```
cd /tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/gkorr_werkzeug
/opt/node22/bin/node anwenden.mjs                                   # Trockenlauf, alle Pläne
NUR=<handle> /opt/node22/bin/node anwenden.mjs                      # Trockenlauf, ein Produkt
LIVE=1 NUR=<handle,...> /opt/node22/bin/node anwenden.mjs           # schreibt (NUR ist Pflicht)
ZURUECK=1 NUR=<handle> /opt/node22/bin/node anwenden.mjs            # zeigt die Rücknahme
ZURUECK=1 LIVE=1 NUR=<handle> /opt/node22/bin/node anwenden.mjs     # nimmt aus der Sicherung zurück
```

Weitere Schalter: `PLAENE=` (Vorgabe `…/gmc1111/korr/alle_plaene.json`), `SICHERUNG=` (Vorgabe `…/gkorr_werkzeug/sicherung.json`),
`LEDGER=` (Vorgabe `…/gkorr_werkzeug/ledger.txt`), `GK_ZEIT=<Faktor>` für alle Wartezeiten (bei `LIVE=1` nur ab 1, sonst Exit 2),
`ZURUECK_FREMD=1` (Rücknahme überschreibt bewusst fremde Änderungen, siehe «Rücknahme»), `SHOPIFY_API` (Vorgabe `2026-10`).
**Die Sicherung liegt im Scratch-Ordner dieser Sitzung.** Nach jedem LIVE-Lauf `sicherung.json` und `ledger.txt` an einen
dauerhaften Ort kopieren: geht die Sicherung nach einem Teil-Lauf verloren, ist keine vollständige Rücknahme mehr möglich
(ein erneuter Lauf blockiert dann, statt doppelt hochzuladen, siehe «Vorprüfung»).
Zugang über `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` (Client-Credentials-Grant, Token je Lauf neu).
Empfehlung: zuerst `NUR=<handle>` als Trockenlauf, dann dasselbe mit `LIVE=1`, ein Produkt nach dem anderen.

## Plan-Form (wie das Werkzeug sie liest)

- `position` ist die **Endstelle** in der Galerie. Freie Stellen füllen die bleibenden alten Medien in ihrer alten Reihenfolge.
  Beispiel Kariertes Set: Hauptbild alt an 0, neue Bilder an 2, 5, 7, die übrigen fünf alten Medien an 1, 3, 4, 6, 8.
  Beispiel Küchenhelfer: das Video bleibt hinten an Stelle 11.
- `hauptbild` ist eine lokale Datei aus `neue_bilder` (dann muss sie `position` 0 haben) oder eine `media_id`, die bleibt
  (dann darf kein neues Bild `position` 0 haben). Das Hauptbild ist danach das erste Medium (`featuredMedia`).
- `metafelder` mit `namespace` `global` und `key` `title_tag` / `description_tag` gehen als `productUpdate seo{title description}`
  (Hinweis im Plan Kariertes Set). Andere `global`-Schlüssel lehnt das Werkzeug ab.
- Metafeld mit `neu` `""` heisst **löschen** (`metafieldsDelete`), nicht leer schreiben (Hinweis im Plan der Armbanduhr).
  Metafeld mit `alt` `""` heisst: darf vorher nicht existieren (wird angelegt, die Rücknahme löscht es wieder).
- `aus_media_id` ist nur Herkunft; sie muss am Produkt existieren.
- `kontaktbogen`, `grund_falls_nicht`, `offen` werden gelesen, aber nicht ausgeführt. `machbar: false` heisst: nicht anfassen.

## html_paare: Entscheid zum Vergleich

**Verglichen wird wörtlich gegen `descriptionHtml`, so wie die Admin-API es liefert. Nichts wird ent- oder maskiert.**
Grund: Shopify liefert ein Text-Zeichen «<» in der Beschreibung als `&lt;` (Beispiel Weste, Paar 4:
`<li>Körperlänge: Regulär (50cm &lt; Länge ≤ 65cm)</li>`). Ein Paar mit `&lt;` trifft also genau diese Stelle, ein Paar
mit «<» trifft sie nicht. Ein Umrechnen würde Tags und Text vermischen und könnte an einer falschen Stelle ersetzen.
GEMESSEN 11.11. 21:47 und 21:51 UTC (Trockenlauf am echten Shop): alle 30 Paare der 7 Pläne treffen wörtlich genau 1-mal,
auch das Weste-Paar mit `&lt;`.

Regeln:
- Jedes `alt` muss im Ausgangstext genau 1-mal vorkommen **und** im Zwischenstand nach den vorigen Paaren genau 1-mal.
  Gezählt werden auch überlappende Vorkommen («ab ab» kommt in «ab ab ab» 2-mal vor; Gegenprüfung 11.11.).
- Trifft ein Paar 0-mal, sucht das Werkzeug die Schreibweise mit «<»/«&lt;» (und `&amp;`) vertauscht und nennt sie als Hinweis
  («in anderer Schreibweise 1× vorhanden»). Angewendet wird sie nie.
- `neu` wird wörtlich eingesetzt (keine `$&`-Muster von `String.replace`).
- Das Ziel wird immer aus dem **gesicherten** Ausgangstext gerechnet. Darum wirkt ein Paar, dessen `neu` das `alt` enthält
  (Weste Paar 4), auch beim zweiten Lauf nicht doppelt. Ist die Beschreibung weder Ausgangstext noch Ziel, bricht das Produkt ab.
- Tests: `beschreibungAnwenden: wörtlich, genau 1, Reihenfolge, Schreibweise`, `html-Paar 0 Treffer`, `2 Treffer`,
  `html-Paar mit «<» statt «&lt;»`.

## Vorprüfung (vor jedem Schreiben, frisch gelesen)

Ein Produkt wird nicht angefasst (Exit 3, Ledger-Zeile `ABGELEHNT`), wenn eines davon fehlt:
jede `media_id` (zu lösen, `aus_media_id`, Hauptbild) existiert am Produkt · jedes html-Paar genau 1 Treffer · jede Option
und jeder alte Optionswert existiert, der neue Wert noch nicht · jedes Metafeld hat den alten Wert und den Typ des Plans
(oder ist schon neu) · jede lokale Datei existiert, ist JPEG oder PNG (am Inhalt erkannt, nicht an der Endung), quadratisch,
mindestens 700 px, hat die Masse aus dem Plan · jede geplante Variante existiert · nach dem Plan hat **jede** Variante ein Bild,
das nicht gelöst wird · mindestens 3 Bilder bleiben (Videos zählen nicht) · keine unbekannten Medien seit der Sicherung ·
keine Variante seit der Sicherung fremd geändert · lokale Datei seit dem Hochladen unverändert (sha256) ·
kein Bild einer früheren Fassung des Plans hängt noch am Produkt (dann zuerst zurücknehmen) ·
ohne Sicherung: kein Medium mit dem Alt-Text **und** dem Dateinamen eines Plan-Bildes am Produkt (verlorene Sicherung nach einem
Teil-Lauf; sonst würde doppelt hochgeladen) · SEO-Beschreibung ohne die Null-Regel des SEO-Titels.
Die Form des Plans selbst (doppelte Positionen, Variante bei zwei Bildern, doppelter Alt-Text, `treffer` ≠ 1, unbekannte
Felder) prüft `planPruefen` vor jedem Lesen: Exit 2.

## Reihenfolge beim Schreiben (LIVE)

0. Sicherung schreiben (nur beim ersten Lauf je Handle; der erste Stand gilt). Bei jedem LIVE-Lauf danach: Metafelder, die erst
   eine spätere Fassung des Plans nennt, mit ihrem heutigen Wert nachtragen (`nachgetragen`), und das Ziel dieses Laufs unter
   `ziel` festhalten (Titel, Beschreibung, SEO, Optionswerte, Metafelder; nur was der Plan ändert, zusammengeführt).
1. Neue Bilder: `stagedUploadsCreate`, Datei hochladen, Journal-Eintrag `ausstehend` mit den Medien davor, `productUpdate(media)`,
   neues Medium über Alt-Text + Vorher/Nachher erkennen, auf READY warten (bis 2 Minuten).
2. Varianten binden: alte Bindung lösen (`productVariantDetachMedia`), neues Bild anhängen (`productVariantAppendMedia`).
3. Titel, Beschreibung, SEO in einem `productUpdate`.
4. Optionswerte (`productOptionUpdate`, `LEAVE_AS_IS`).
5. Metafelder (`metafieldsSet`, `metafieldsDelete`).
6. Frisch lesen: hängt eine Variante noch an einem zu lösenden Bild oder trägt eine geplante Variante nicht ihr neues Bild,
   wird **nichts** gelöst (Abbruch). Sonst alte Medien lösen (`fileUpdate referencesToRemove`, die Datei bleibt unter Inhalt > Dateien).
7. Reihenfolge (`productReorderMedia`, Hintergrundauftrag, bis 60 s nachlesen; danach Abweichung, kein zweiter Auftrag).
8. Alles frisch zurücklesen (bis 6 Versuche): Titel, Beschreibung, SEO (mit der Null-Regel), Optionswerte, Metafelder, Galerie in
   genauer Reihenfolge, alle Medien READY, Hauptbild, Alt-Texte der neuen Bilder, jede Variantenbindung, gelöste Medien weg,
   gelöste Dateien noch vorhanden, Kernfelder unverändert (Handle, Status, Vendor, Produkttyp, Tags, Varianten, SKUs, Preise,
   Options-IDs). Jede Abweichung: Exit 5, Ledger-Zeile `ABWEICHUNG`.

## Kein Schritt wird blind wiederholt

- Jede Mutation geht genau einmal raus. Bei Fehler oder verlorener Antwort wird frisch gelesen; ist der Schritt erledigt, geht
  es weiter, sonst bricht das Produkt ab (Exit 4). Der nächste Lauf erkennt den Teilzustand und macht nur den Rest.
- Hochladen (Lehre Girlande): vor `productUpdate(media)` steht `ausstehend` mit der Medienliste davor in der Sicherung.
  Kommt eine Ausnahme zurück, wird nachgelesen: genau ein neues Medium mit dem Alt-Text, das vorher nicht da war, wird übernommen.
  Findet sich keines, bleibt der Eintrag `ausstehend`; der nächste Lauf übernimmt das Bild, wenn es inzwischen da ist, sonst
  blockiert er mit der Anweisung, im Admin zu prüfen und den Eintrag zu löschen. **Ein zweiter Upload passiert nie von selbst.**
  Eine klare Fehlermeldung von Shopify (`userErrors`) heisst «nicht angelegt» und erlaubt den Upload im nächsten Lauf.
- Scheitert das Lösen oder Anhängen einer Variantenbindung, bekommen Varianten ohne Bild ihr altes Bild zurück (Ausgleich), dann Abbruch.
- Die Kommandozeile wiederholt Lesen bei Netzfehler, 429, 5xx und Drosselung. Mutationen wiederholt sie nur bei 429 und
  «Throttled» (dann wurde nichts ausgeführt). Netzfehler, 5xx oder unlesbare Antwort bei einer Mutation gehen als
  mehrdeutiger Fehler an den Schritt, der durch Nachlesen klärt.
- Ohne `LIVE=1` verweigert eine harte Sperre jede Mutation und jeden Upload, bevor ein Netzaufruf passiert.
- Eine Sperrdatei `sicherung.json.lock` verhindert zwei gleichzeitige LIVE-Läufe. Nach einem Absturz (kill) bleibt sie liegen und
  muss von Hand gelöscht werden.

## Sicherung, Journal, Ledger

`sicherung.json`, je Handle: `produkt` (id, handle, title, descriptionHtml, seo, featuredMedia), `optionen` (ids, Namen, alle
Werte mit ids), `metafelder` (Werte und Typ der Plan-Metafelder, `null` wenn nicht vorhanden), `medien` (id, Position, alt, Typ,
Status, url), `varianten` (id, sku, gebundene Medien), `bilder` (Journal je lokaler Datei: `status` ausstehend / nicht_angelegt /
fertig / zurueckgenommen, `vorher`, `neu`, `alt`, `sha256`, Zeit). Geschrieben über eine Zwischendatei und `rename`.

`ledger.txt`: `<ISO-Zeit> · <handle> · <ART> · <Detail>`. Arten: `GESCHRIEBEN_OK`, `SCHON_IM_SOLL`, `ABGELEHNT`, `NICHT_MACHBAR`,
`ABBRUCH`, `ABWEICHUNG`, `FEHLER`, `ZURUECK_OK`, `ZURUECK_SCHON`, `ZURUECK_ABWEICHUNG`, `ZURUECK_ABBRUCH`. Nur bei LIVE.

## Exit-Codes

0 ok · 1 unerwartet · 2 Aufruf oder Plan unbrauchbar (auch: LIVE ohne NUR, Sperrdatei) · 3 Vorprüfung blockiert ·
4 Abbruch beim Schreiben · 5 Abweichung beim Rücklesen · 6 Rücknahme fehlgeschlagen. Bei mehreren Produkten gilt der höchste.

## Rücknahme

Vor jedem Schreiben (auch im Trockenlauf) prüft die Rücknahme, dass jedes Feld den gesicherten Wert oder das `ziel` eines
Vorwärtslaufs trägt (Titel, Beschreibung, SEO, Optionswerte, Metafelder, Variantenliste, Variantenbilder: gesichert, leer oder ein
eigenes neues Bild). Hat jemand anderes etwas seither geändert (z. B. ein Nachtlauf die Beschreibung), bricht sie ab (Exit 6,
nichts geschrieben); `ZURUECK_FREMD=1` überschreibt bewusst. Ein «ausstehender» Upload, den die Rücknahme am Produkt findet,
bekommt seine ID ins Journal (`zurueckgenommen`), damit ein späterer Vorwärtslauf ihn wieder anhängt statt neu hochzuladen.
`ZURUECK=1 LIVE=1 NUR=<handle>`: gelöste alte Medien wieder anhängen (`fileUpdate referencesToAdd`, READY abwarten),
Variantenbindungen wie gesichert, Titel, Beschreibung und SEO zurück, Optionswerte zurück (über die Wert-ID), Metafelder zurück
(gesetzt oder gelöscht), die neuen Bilder vom Produkt lösen (nicht löschen; Journal `zurueckgenommen`), Reihenfolge wie
gesichert, frisch zurücklesen. Unbekannte Medien am Produkt oder verlorene Dateien: Abbruch (Exit 6), nichts angefasst.
Eine zweite Rücknahme findet alles im Soll und schreibt nichts. Ein späterer Vorwärtslauf hängt dieselben Dateien wieder an
(kein neuer Upload).

## Tests und Mutationsprobe

```
/opt/node22/bin/node anwenden_test.mjs        # GK_LAUT=1 zeigt jeden Testfall, GK_TEST=<Text> wählt aus
/opt/node22/bin/node mutationsprobe.mjs       # --muster prüft nur, ob jedes Muster genau 1× passt
```

Nach der Gegenprüfung (11.11. ca. 22:10 UTC): **388 Prüfungen in 54 Testfällen, alle grün; Mutationsprobe 61 von 61 erkannt**
(0 überlebt, 0 ungeklärt, 0 nicht anwendbar). Stand des Bauers davor: 336 Prüfungen in 44 Testfällen, alle grün (0,3 s). Abgedeckt u. a.: Trockenlauf schreibt
nichts (keine Mutation, kein Upload, keine Sicherung, kein Ledger, auch bei Ablehnung) · Vollauf mit Reihenfolge der Schritte und
Sicherung vor der ersten Mutation · zweiter Lauf idempotent (0 Mutationen) · html-Paar 0 und 2 Treffer · «<» statt «&lt;» ·
fehlende media_id und aus_media_id · Variante ohne Bild nach Plan · Datei nicht quadratisch, zu klein, fehlt, falsche Masse,
kein Bild · weniger als 3 Bilder · Option und Metafeld fremd · Netzfehler nach dem Anlegen (kein Doppel) und vor dem Anlegen
(nächster Lauf lädt nicht erneut hoch) · ausstehender Upload, der später erscheint, wird übernommen · verzögertes und nie
kommendes READY · Reihenfolge-Auftrag verzögert und nie · still ignoriertes Feld (Beschreibung, Titel, Metafeld, Alt-Text,
Option, SEO) · geänderte Kernfelder · gelöschte statt gelöste Datei · SEO-Titel gleich Produkttitel wird null · Ausgleich beim
Anhängen und Lösen · Rücknahme stellt alles her, zweite Rücknahme schreibt nichts, Rücknahme nach Abbruch · NUR fehlt bei LIVE
(auch über die Kommandozeile) · Planfehler, machbar false, Sperrdatei · Masse aller 36 echten Plan-Bilder und `planPruefen`
für alle 7 echten Pläne.

**Mutationsprobe** (Ausgangslage vorher grün): **47 von 47 erkannt, 0 überlebt, 0 ungeklärt, 0 nicht anwendbar.**
Der erste Durchgang ergab 44 von 47; drei Lücken wurden mit Tests geschlossen («$&»-Ersatz mit einem Muster, das sich bei
`String.replace` sichtbar unterscheidet; Ledger im Trockenlauf bei Ablehnung und «schon im Soll»; Rücknahme eines neu
angelegten Metafelds). «Erkannt» zählt nur ein Lauf mit Exit 1 und Zusammenfassungszeile; ein Absturz zählt als «ungeklärt».

## Gegenprüfung 11.11. (unabhängiger Prüfer, ca. 22:00 UTC)

Acht Funde, jeder mit eigenem Test nachgestellt (rot gegen die Fassung des Bauers), behoben, Tests P1 bis P8:
1. (mittel) Sicherung nach einem Teil-Lauf verloren (oder anderer `SICHERUNG=`-Pfad): der nächste Lauf nahm den halben Zustand als
   Ausgangsstand, lud alle Bilder **ein zweites Mal** hoch und meldete «NACHGELESEN OK» mit doppelten Bildern (P8).
2. (mittel) Rücknahme überschrieb fremde Änderungen seit dem Vorwärtslauf still (Beschreibung, Titel, Optionswert, Metafeld,
   Variantenbild) und meldete OK (P4, P4b, P4c).
3. (mittel) Plan nach dem ersten LIVE-Lauf um ein Metafeld erweitert: die Sicherung kannte es nicht, die Rücknahme meldete OK und
   liess es geändert (P2).
4. (klein) Plan nach dem LIVE-Lauf ohne ein Bild: das alte Bild galt als «eigenes», der Lauf ordnete um und endete mit Abweichung (P3).
5. (klein) Rücknahme nach einem «ausstehenden» Upload, der doch angekommen war: Journal blieb ohne ID, der nächste Vorwärtslauf
   blockierte dauerhaft; das Löschen des Eintrags hätte eine zweite Datei hochgeladen (P1).
6. (klein) «genau 1 Treffer» zählte nicht überlappend: «ab ab» in «ab ab ab» galt als eindeutig (P5). Die echten Pläne sind
   nicht betroffen (GEMESSEN an den 7 Beschreibungen).
7. (klein) SEO-Beschreibung wurde mit der Null-Regel des Titels verglichen (P6).
8. (klein) `LIVE=1` mit `GK_ZEIT` unter 1 kürzte alle Wartezeiten (P7).

GEMESSEN 11.11. ca. 22:05 UTC (nur lesend, Admin-API 2026-10): `GkDateien` liefert angehängte Medien (Bild und Video) mit
`fileStatus READY` und `null` für eine unbekannte ID; die am 11.11. 15:26 UTC per `referencesToRemove` gelösten Bilder der
Plüschfiguren sind weiter als Datei da (READY). `GkMeta` liest die Metafelder der Armbanduhr. Alle Mutationsfelder im Schema
(Shopify-MCP `graphql_schema`) vorhanden, keines als abgekündigt gekennzeichnet. Trockenlauf nach den Behebungen: 7 von 7
bestehen, Ausgabe gleich wie `_trocken/lauf2.txt` (bis auf Zeit und Pfad).

## Gemessen am echten Shop (nur lesend)

Trockenlauf 11.11. 21:47 und 21:51 UTC (Admin-API 2026-10, nur Abfragen, keine Mutation): **7 von 7 Plänen bestehen die
Vorprüfung.** Gelesen: Gürtel 16 Varianten / 10 Medien, Weste 10 / 7, Kariertes Set 50 / 12, Yoga 21 / 15, Armbanduhr 6 / 11,
Smartwatch 6 / 11, Küchenhelfer 36 / 15. Geplant: 36 neue Bilder hochladen, 64 Medien lösen, 30 html-Paare, 26 Optionswerte,
2 Titel, 2 SEO-Blöcke, 3 Metafelder setzen, 1 löschen. Ausgabe: `_trocken/lauf1.txt`, `_trocken/lauf2.txt`.
Rücknahme-Trockenlauf (Weste): «keine Sicherung für dieses Produkt», Exit 0.

## Grenzen und Ungemessenes

- **Kein LIVE-Lauf bisher.** Folgendes Verhalten von Shopify ist im Werkzeug angenommen, aber nicht am echten Shop gemessen
  (Hypothesen): das neue Medium erscheint direkt nach `productUpdate(media)` in `product.media` mit dem Alt-Text;
  `productVariantAppendMedia` verlangt READY und eine Variante ohne Bild; `fileUpdate referencesToRemove` löst auch die
  Variantenbindung und lässt die Datei bestehen; `productReorderMedia` mit allen Medien in Zielreihenfolge ergibt genau diese
  Reihenfolge; HTTP 429 und «Throttled» heissen «nicht ausgeführt». Das Rücklesen meldet jede Abweichung davon.
  (Dass `referencesToRemove` die Datei bestehen lässt, ist seit dem Plüschfiguren-Lauf vom 11.11. GEMESSEN, siehe Gegenprüfung.)
- Ein Bild, das bei Shopify FAILED meldet, blockiert jeden weiteren Lauf (kein automatischer Neu-Upload): im Admin entfernen,
  den Journal-Eintrag löschen, dann neu starten.
- Ein Paar, dessen `neu` ein Text-«<» oder ein nacktes «&» enthält, speichert Shopify vermutlich maskiert: das Rücklesen meldet
  dann Abweichung (Exit 5). In den 7 echten Plänen kommt das nicht vor (GEMESSEN 11.11.).
- Die Mutationen sind nicht gegen den Shop ausgeführt. Ihre Felder sind mit dem Schema-Werkzeug (Shopify-MCP `graphql_schema`)
  nachgesehen: `productUpdate(product, media)`, `FileUpdateInput.referencesToAdd/referencesToRemove`, `productReorderMedia`
  (Payload `job`, `mediaUserErrors`), `productVariantDetachMedia` (Payload `userErrors`), `metafieldsDelete`, `productOptionUpdate`.
  Die Lese-Abfragen liefen am echten Shop.
- Mehr als 100 Medien oder 100 Varianten je Produkt: nicht unterstützt (Abbruch).
- Ändert sich ein Plan nach einem Teil-Lauf, blockiert das Werkzeug (Ziel ≠ Ist). Dann zuerst zurücknehmen.
- Nicht Teil des Werkzeugs (stehen in den «offen»-Notizen, sind Entscheide oder eigene Schritte): Alt-Texte der **bleibenden**
  Medien nachziehen (Kariertes Set, Armbanduhr), vendor «SKMEI» (Armbanduhr), Option aufteilen und age_group je Variante
  (Kariertes Set), productType, Aufnahme in den Kanal «Google & YouTube», Vermerk gegen das Wiederanfügen durch einen
  CJ-Abgleich (Smartwatch). Ob Google die neuen Bilder annimmt, ist ungemessen.
