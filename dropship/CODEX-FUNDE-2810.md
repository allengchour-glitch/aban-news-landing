# Codex-Zweitmeinung, Runde 2 (28.10.2026): bestätigte Funde

Codex (GPT-6 Astra, ChatGPT-Pro-Anmeldung des Besitzers) las je Ziel die Dateien in einem leeren Sandkasten (ohne Umgebung, ohne Schlüssel); jeder Fund wurde
danach am ECHTEN Code (`git archive` des angegebenen Stands) nachgestellt. Hier stehen nur die BESTÄTIGTEN Funde. Ein Fund der Modellfamilie bleibt eine Behauptung, bis er nachgestellt ist;
die Schwere stammt vom Nachsteller (teils gegen Codex herabgestuft, weil der Weg nur per Hand läuft).

Stand der Behebung: **alle offen** (Ausnahme: die Fortura-Härtung vom 28.10. ist die Folge der Runde 1). Limit der Anmeldung am 28.10. gegen 14:00 UTC erneut erreicht («try again at 5:20 PM»):
`google-feed` und `cj-reviews` ohne Abschlussbericht, werden nach 17:25 UTC wiederholt.

## pod-preise — 11 bestätigt von 14 (Codex-Tokens 33,060)

- **[wichtig]** Doppelter, bestätigter Printful-Auftrag, wenn das Markieren in Shopify scheitert oder abbricht (`automation/printful_sync.mjs:125`)
  Vorschlag: 1) tagOrder-Ergebnis auswerten (data.errors und userErrors) und bei Fehler laut abbrechen und Telegram melden. 2) Beim Anlegen external_id mitsenden (z. B. die Shopify-Bestellnummer) und vor dem POST GET /orders/@<external_id> prüfen; ob Printful doppelte external_id selbst ablehnt, ist nicht gemessen. 3) Alternativ…
- **[wichtig]** Offene Nicht-POD-Bestellungen verdrängen POD-Bestellungen aus den ersten MAX Treffern (keine Seitenblätterung) (`automation/printful_sync.mjs:97`)
  Vorschlag: Mit pageInfo{hasNextPage endCursor} und after: blättern, bis MAX POD-Bestellungen gefunden sind oder keine Seite mehr kommt. Alternativ Nicht-POD-Bestellungen nach der Prüfung mit einem Tag (z. B. printful-skip) markieren und aus der Abfrage ausschliessen.
- **[wichtig]** Bestellung mit nur unbekannter SKU: still übersprungen, ohne Tag und ohne Meldung, bei jedem Lauf wieder gelesen (`automation/printful_sync.mjs:111`)
  Vorschlag: Statt continue bei items.length==0 und needReview: Tag printful-review setzen und reviewMsg per Telegram melden (nicht in DRY).
- **[wichtig]** Fehler der Druckdatei-Prüfung (Gemini 429, leere Antwort, Bild-Download) geben die Produktion frei (`automation/printful_sync.mjs:64`)
  Vorschlag: In controlDesign: wenn !r.ok oder Text leer oder weder PASS noch FAIL -> {pass:false, reason:'Prüfung fehlgeschlagen (HTTP x)'}; auch im catch pass:false. Folge ist nur ein Entwurf mit printful-review, kein Schaden.
- **[wichtig]** Genau eine Platzierung überschreibt die gewünschte Seite; zwei Dateien können dieselbe Platzierung bekommen, ohne Review (`automation/lib/printful_platzierung.mjs:65`)
  Vorschlag: In entscheide: bei dr.length===1 gesichert nur, wenn s==='front' oder dr[0]==='back'; in platzierungenFuerDateien nach der Schleife prüfen, ob zwei Dateien denselben type haben, dann Hinweis und needReview.
- **[wichtig]** printful_reprice (alte Formel) ignoriert Printful-Versand und Gebühr und rundet unter den Richtwert (`automation/printful_reprice.mjs:52`)
  Vorschlag: printful_reprice auf pod_preise.endpreis() umstellen (Versand über Printful-Versandpreise holen) oder mindestens nur erhöhen, nie senken, und das Netto je Variante ausgeben und bei < 12 warnen.
- **[klein]** Varianten-SKU hat Vorrang vor der SKU der Bestellposition (`automation/printful_sync.mjs:106`)
  Vorschlag: Reihenfolge umkehren: li.sku zuerst, variant.sku als Rückfall; weichen beide ab, needReview setzen.
- **[klein]** lineItems(first:50) ohne Weiterblättern: Position 51 und mehr fehlen, Bestellung gilt als synchronisiert (`automation/printful_sync.mjs:79`)
  Vorschlag: lineItems(first:50){ pageInfo{hasNextPage} ... } abfragen und bei hasNextPage needReview setzen (oder blättern).
- **[klein]** printful_reprice: variants(first:100) ohne Weiterblättern, Varianten ab 101 bleiben still unverändert (`automation/printful_reprice.mjs:54`)
  Vorschlag: variants(first:100){ pageInfo{hasNextPage} ...} abfragen und bei hasNextPage weiterblättern oder zumindest eine Warnung ausgeben.
- **[klein]** printful_reprice zählt fehlgeschlagene Preisänderungen als angepasst, top-level errors werden verschluckt (`automation/printful_reprice.mjs:80`)
  Vorschlag: m.errors und userErrors prüfen, changes nur bei Erfolg erhöhen, Fehlerzähler ausgeben und bei Fehlern mit Exit-Code ≠ 0 enden.
- **[klein]** Eigener Fund: fehlgeschlagener Printful-Auftrag wird bei jedem Lauf erneut gesendet und gemeldet (`automation/printful_sync.mjs:126`)
  Vorschlag: Abfrage um -tag:printful-review ergänzen (Bestellung wird dann von Hand geprüft) oder einen Zähler/Backoff je Bestellung einführen.

## grind-preis — 4 bestätigt von 9 (Codex-Tokens 71261)

- **[klein]** CHF-Parser macht aus nicht unterstützten Zahlenformaten und Minusbeträgen plausible Marktpreise (`automation/lib/chf_preis.mjs:24`)
  Vorschlag: Zahl-Muster enger fassen: vorne (?<![\d.,'’\-−–]) statt (?<!\d), hinten (?!\d|[.,]\d) statt (?!\d). Nicht unterstützte Formate und Minusbeträge ergeben dann keinen Preis statt eines falschen.
- **[klein]** Marktvergleich entscheidet am schon auf zwei Stellen gerundeten Verhältnis (`automation/lib/chf_preis.mjs:61`)
  Vorschlag: Urteil am ungerundeten Verhältnis e/m fällen (roh >= obenRaus - 1e-9, roh < untenRaus - 1e-9); gerundeter faktor nur für die Anzeige. Test mit 124.5/100 und 89.5/100 ergänzen.
- **[klein]** Fracht-Linie wird nach dem Runden zu 0 USD, und eine sehr lange Ziffernfolge als Text wird zu Infinity (`automation/lib/cj_fracht.mjs:97`)
  Vorschlag: In linieLesen nach dem Runden 'if (!(preisUsd > 0)) return null;' (Linie ohne Preis zählt nie als Preis 0). In zahl() beim Text-Zweig 'const n = Number(x); return Number.isFinite(n) ? n : null;'. In landekostenChf das Ergebnis auf Endlichkeit prüfen.
- **[klein]** landekostenChf rundet halbe Rappen teils ab (1.005 -> 1.00, 1.015 -> 1.01, 1.255 -> 1.25) (`automation/lib/cj_fracht.mjs:62`)
  Vorschlag: const cent = n => Math.round((n + 1e-9) * 100) / 100; (wie runde2). Test mit einem Halbrappen ergänzen.

## rucksack — 10 bestätigt von 11 (Codex-Tokens 79,593)

- **[klein]** Wiederholung: von Hand ergänztes gefiltertes Kind mit gleicher GID wird still gelöscht (`automation/lib/rucksaecke_menue.mjs:173`)
  Vorschlag: In pruefeRucksack Z.173 `fremde` erweitern: (i.items||[]).filter((k,n,l) => !erlaubt.has(ziel(k)) || (k.tags||[]).length || l.findIndex(x => ziel(x) === ziel(k)) !== n); Test mit Zusatzkind auf erlaubter GID und tags ergänzen.
- **[klein]** handleVon() sucht /collections/<handle> irgendwo in der Adresse: fremder Link wird als alter Eintrag entfernt (`automation/lib/rucksaecke_menue.mjs:81`)
  Vorschlag: Regex verankern: /^(?:https?:\/\/(?:www\.)?(?:luxestyle\.ch|[a-z0-9-]+\.myshopify\.com))?(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/collections\/([a-z0-9-]+)(?:[/?#]|$)/i; Test: fremder Host und ?next=/collections/... liefern null.
- **[klein]** Exit 1 (Aufruffehler) trotz geschriebenem Menü, wenn die menuUpdate-Antwort verloren geht (`automation/rucksaecke_menue.mjs:92`)
  Vorschlag: menuUpdate-Aufruf in try/catch: bei Ausnahme (keine userErrors) den Nachlese-Zweig ab Z.95 trotzdem ausführen; bei Abweichung oder erneutem Fehler Exit 3 mit Hinweis auf die Sicherung statt Exit 1. Test: Attrappe wirft nach dem Übernehmen.
- **[klein]** Gruppenlauf: Ledger-Schreibfehler bricht nach Live-Änderung ab (Anlegen und Nachpublizieren) (`automation/schmuck_gruppen.mjs:119`)
  Vorschlag: Beide appendFileSync (Z.106, Z.119) in try/catch mit HINWEIS wie in rucksaecke_menue.mjs Z.107 (Hilfsfunktion ledgerSchreiben); Test: Gruppenlauf mit nicht beschreibbarem Ledger endet mit Exit 0 und Hinweis.
- **[klein]** Nachlesen und Aussenvergleich ignorieren tags: von Shopify verlorene Filter-Tags bleiben unbemerkt (`automation/lib/menue_plan.mjs:109`)
  Vorschlag: In flachMitZiel (nicht in flach) |${(i.tags||[]).join(',')} anfügen; Test: Nachlese-Attrappe löscht tags eines Eintrags ausserhalb der Köpfe -> Exit 3.
- **[klein]** Kontrolllesen vergleicht den Menü-Handle nicht (`automation/rucksaecke_menue.mjs:83`)
  Vorschlag: Z.83: `|| frisch.handle !== m.handle` in die Bedingung; Test: zweite Antwort mit anderem Handle -> Exit 4, nichts geschrieben.
- **[klein]** Sicherung kann überschrieben werden (Zeitstempelname ungeprüft, Prüfung und Schreiben nicht atomar) (`automation/rucksaecke_menue.mjs:89`)
  Vorschlag: writeFileSync(datei, daten, { flag: 'wx' }); bei EEXIST mit Zähler-Suffix erneut versuchen; Test mit festem jetzt() und drei Läufen.
- **[klein]** Restfenster zwischen Kontrolllesen und menuUpdate: Änderung dort geht verloren, auch aus der Sicherung (bekannte Grenze) (`automation/rucksaecke_menue.mjs:81`)
  Vorschlag: Nicht vollständig behebbar; kleinster Schritt: mkdirSync/writeFileSync der Sicherung VOR das Kontrolllesen ziehen (Sicherung aus erster Lesung, Vergleich bleibt), damit zwischen Kontrolllesen und menuUpdate keine Datei-E/A liegt; Grenze weiter dokumentieren.
- **[klein]** ERLAUBE_LUECKEN=1 bei Wiederholung entfernt einen funktionierenden Kopf samt Kindern, wenn dessen HTTP-Prüfung kurz scheitert (eigener Fund) (`automation/lib/rucksaecke_menue.mjs:110`)
  Vorschlag: In rucksackMenue einen vorhandenen Kopf mit gids[kopf]==null samt Kindern im Ast belassen und als «bleibt» melden (statt zu entfernen), oder ERLAUBE_LUECKEN dafür nicht gelten lassen.
- **[klein]** Testlücken (Mutationsprobe auf Kopie): Feldliste, gelesenes Menü und tiefe Änderung zwischen den Lesungen werden nicht geprüft (eigener Fund) (`automation/lib/rucksaecke_menue_test.mjs:197`)
  Vorschlag: Attrappe: Feldliste der Abfrage auf 'tags' und v.h === 'handle:main-menu' prüfen; Exit-4-Test zusätzlich mit Änderung in tieferer Ebene (Damen > erstes Kind: resourceId oder neuer Unterpunkt) und mit tags-Änderung.

## material — 14 bestätigt von 15 (Codex-Tokens 52,558)

- **[wichtig]** Schreiben ohne frisches Lesen und ohne compareDigest: veralteter Rohstand überschreibt inzwischen korrigierte Werte (`automation/material_nachtragen.mjs:94`)
  Vorschlag: Je Stapel vor metafieldsSet die aktuellen Werte frisch lesen (nodes(ids:[...]){... on Product{id m:metafield(namespace:"mm-google-shopping",key:"material"){value}}}) und nur schreiben, wenn der Ist-Wert dem Rohwert entspricht (leer bei Neu, 'alt' bei Übersetzung). Alternativ compareDigest mitsenden. LIVE=1 zusammen …
- **[wichtig]** Plandatei (Rückgängig-Beleg) wird von jedem Folgelauf, auch dem Trockenlauf, überschrieben (`automation/material_nachtragen.mjs:83`)
  Vorschlag: Plan nur bei LIVE=1 schreiben und nie eine vorhandene nicht-leere Plandatei überschreiben (Vorgabepfad mit Zeitstempel: /tmp/material_plan_<ISO>.jsonl). Nach dem Schreiben die TATSÄCHLICH geschriebenen Einträge (geschrieben[], mit alt) in eine eigene Undo-Datei schreiben.
- **[wichtig]** lederWert deutet Verneinung, «Leder-Optik» und Futterangabe als Beleg (`automation/lib/material.mjs:169`)
  Vorschlag: Vor dem Abgleich aus 'alles' Verneinungen ((ohne|kein\w*|nicht)\s+(pu[- ]?)?leder) und 'leder[- ]?(optik|look|imitat)' behandeln (letztere als Kunstleder), und wenn Echt- und PU-Hinweis zugleich vorkommen, null liefern.
- **[wichtig]** Klammern werden still entfernt: «Seide (Imitat)» → «Seide» (`automation/lib/material.mjs:78`)
  Vorschlag: Klammerinhalt nur verwerfen, wenn er auf einer kleinen Erlaubnisliste steht (z. B. 'dacron'), sonst return null.
- **[wichtig]** CJ-Pfad umgeht die Titanstahl-Sperre: «titanium steel» → «Titanstahl» (9 Live-Einträge) (`automation/lib/material.mjs:113`)
  Vorschlag: In pruefeWert: 'if (/titanstahl/i.test(wert)) return "Handelsname für Edelstahl"' (greift für alle Pfade, auch den Übersetzungspfad) oder den EN-Eintrag 'titanium steel' auf null setzen. Die 9 bereits geschriebenen Werte nachprüfen.
- **[wichtig]** Titelkonflikt-Prüfung übersieht Mischungen im Titel: «Baumwolle und Leinen», «Baumwolle und Seide» (`automation/lib/material.mjs:184`)
  Vorschlag: MISCH symmetrisch machen (baumwoll\w*[- ]?(?:und |&)?leinen) und allgemein: nennt der Titel zwei Stoffe mit Verbindung 'und|&|/' oder Bindestrich, müssen alle im Wert stehen; 'mit …'-Teile bleiben frei.
- **[klein]** Fehlerhafte metafieldsSet-Stapel: Überlebende werden als geschrieben gezählt, Exit 0 bei Fehlern und bei Abbruch (`automation/material_nachtragen.mjs:95`)
  Vorschlag: Bei jeder userError den ganzen Stapel als fehlgeschlagen zählen (fehler += stueck.length, nichts in geschrieben[]), und am Ende 'if (fehler) process.exitCode = 3' (auch nach dem Abbruch).
- **[klein]** Teilangaben als Kompositum («Baumwollfutter», «Metallrahmen») und Label «Main material» passieren die Teil-Sperre (`automation/lib/material.mjs:90`)
  Vorschlag: TEILWORT ohne führendes \b für Komposita (…(futter|sohle|rahmen|griff|gehäuse|bezug)\b) und 'Main material' aus dem Label-Regex in Z.144 streichen oder das Label gegen TEILWORT prüfen.
- **[klein]** Unvollständige Prozentangaben: englisch «5% cashmere» → «Kaschmir», deutsch mehrteilig ohne Summenprüfung (`automation/lib/material.mjs:131`)
  Vorschlag: In beiden Funktionen die Anteile summieren und bei Summe ungleich 100 (oder Einzelanteil unter 100) null liefern.
- **[klein]** «oder»/«or» wird wie «und» behandelt: Alternativen werden zur Kombination (`automation/lib/material.mjs:81`)
  Vorschlag: 'oder' und 'or' aus den Trennmustern entfernen: eine Angabe mit Alternative ergibt null.
- **[klein]** Widersprüchliche Textzeilen: verworfene Zeile zählt nicht, mehrdeutiger Text weicht auf CJ aus (`automation/lib/material.mjs:103`)
  Vorschlag: In materialAusText eine verworfene Material-Zeile als ungeklaert zählen, wenn andere gültig sind; in entscheide bei t.ungeklaert (mehrdeutig) nicht auf CJ ausweichen.
- **[klein]** Kunstleder-Sperre ignoriert cj.productProEn und cj.productPro (`automation/lib/material.mjs:196`)
  Vorschlag: cj?.productProEn und cj?.productPro in die 'alles'-Listen von pruefeWert und lederWert aufnehmen; im Übersetzungspfad cjL an pruefeWert übergeben.
- **[klein]** «PU» mitten in einer Liste wird nicht gesperrt (`automation/lib/material.mjs:194`)
  Vorschlag: Beide Muster durch /(^|, )pu(,|$)/i ersetzen.
- **[klein]** Gerätesperre prüft nur Einzelwerte: «Keramik, Metall» beim Lockenstab passiert (`automation/lib/material.mjs:201`)
  Vorschlag: In pruefeWert: wert.split(', ').every(t => GERAET_WERT.test(t)) statt GERAET_WERT.test(wert).

## fortura-engine-2 — 14 bestätigt von 16 (Codex-Tokens 64,870)

- **[wichtig]** Sperre schützt nur einen Rechner mit funktionierendem flock: ohne Sperre oder mit zweitem Rechner sind doppelte Lieferantenbestellungen weiter möglich (Codex: blocker) (`automation/fortura_bestell_engine.py:63`)
  Vorschlag: (1) Bei 'ohne' keinen Upload ausführen (nur Stufe 1) und eine ⚠️-Zeile «Sperre nicht möglich» ausgeben, statt still weiterzulaufen. (2) Für rechnerübergreifenden Schutz Shopify als gemeinsamen Zustand nutzen: das Feld `tags` in Q mitlesen, vor dem Upload `tagsAdd` «fortura-xml-LX<nr>» setzen und Bestellungen mit die…
- **[klein]** Verlorene Shopify-Antwort bucht eine Teillieferung doppelt: der gql-Helfer wiederholt die Mutation selbst (`automation/fortura_bestell_engine.py:143`)
  Vorschlag: Vor `fulfillmentCreate` die bestehenden Fulfillments der Bestellung lesen (`fulfillments{trackingInfo{number}}`) und bei gleicher Tracking-Nummer als erledigt behandeln. Dazu den Helfer um einen Parameter `versuche=1` für Mutationen erweitern.
- **[klein]** Nach «teilgeliefert» wird ein zweiter Lieferschein für den Rest ignoriert, Stufe 2 läuft dann nicht einmal mehr (`automation/fortura_bestell_engine.py:354`)
  Vorschlag: 'teilgeliefert' in das Tuple von Z.354 aufnehmen und in Z.531 ergänzen. Bereits gebuchte Lieferscheine über ihre doc_no (in t[4] vermerken) überspringen und `abgleich` gegen die noch offene Menge rechnen.
- **[klein]** norm_artnr streicht führende Nullen: «0123» und «123» sind derselbe Schlüssel (`automation/fortura_xml.py:160`)
  Vorschlag: `norm_artnr` nur Leerraum entfernen und gross schreiben, führende Nullen nicht streichen. Wo ein lockerer Treffer nötig ist, `gesucht` als Liste je Schlüssel führen statt als Dict.
- **[klein]** Internet_VE leer, 0, ungültig, negativ oder NaN gilt als bekannte VE 1: die Sperre «VE unbekannt» greift nicht (`automation/fortura_xml.py:192`)
  Vorschlag: Nur ganze Zahlen >= 1 als VE akzeptieren, alles andere (leer, 0, nicht parsebar) als `None` (unbekannt) liefern, sodass `bau_orders_xml` mit «VE unbekannt» ablehnt.
- **[klein]** Positionsschutz hat ein Loch: Fortura erst auf Positionsseite 2 wird ohne Warnung übersehen; Bestellseite 2 wird nur gemeldet (`automation/fortura_bestell_engine.py:460`)
  Vorschlag: Die `hasNextPage`-Prüfung der Positionen vor `if not pos: continue` ziehen und bei True Warnzeile/`gehalten` setzen. Für die Bestellliste mit `after:`-Cursor weiterblättern statt nur zu warnen.
- **[klein]** Nicht vollständig zugeteilte Liefermenge wird als «erfuellt» abgeschlossen (Abfrage nur first:10 Fulfillment-Orders) (`automation/fortura_bestell_engine.py:125`)
  Vorschlag: Nach der Schleife `if any(v > 0 for v in rest.values()): return False, 'Menge nicht vollständig zugeteilt'` (kein 'erfuellt') und `first` erhöhen.
- **[klein]** Bestandsverbrauch im Lauf entfällt, wenn der Upload als «unklar» oder «nicht zurücklesbar» endet (`automation/fortura_bestell_engine.py:310`)
  Vorschlag: Die Schleife über `verbraucht` direkt nach dem Aufruf von `fx.hochladen` ausführen, auch im `except`-Zweig, der «unklar» meldet, nicht erst nach dem Zurücklesen.
- **[klein]** Stornierte Bestellung mit irgendeiner Teilerstattung gilt als beendet: Dauerzeile «Kundin erstatten» verschwindet, Restbetrag ungeklärt (`automation/fortura_bestell_engine.py:413`)
  Vorschlag: Bei stornierten Bestellungen zusätzlich die Summe der REFUND-Beträge (`amountSet`) mit dem bezahlten Betrag vergleichen (oder `totalRefundedSet` >= `totalPriceSet`); bei Teilerstattung nicht beenden.
- **[klein]** Upload-Tor prüft den Shopify-Stand vom Laufanfang: Storno oder Adressänderung während des Feed-Abrufs (bis 80 s) werden nicht gesehen (`automation/fortura_bestell_engine.py:240`)
  Vorschlag: Direkt vor `schreibe(led)` und `fx.hochladen` die eine Bestellung per Name neu lesen (cancelledAt, closedAt, displayFulfillmentStatus, Positionen, Adresse) und gegen das Paket vergleichen.
- **[klein]** Fehlerfang liegt je Datei, nicht je Dokument: ein fehlerhaftes DOC blockiert die weiteren DOC derselben Lieferscheindatei dauerhaft (`automation/fortura_bestell_engine.py:341`)
  Vorschlag: try/except in die Schleife `for d in docs` verlegen und `menge_zahl` auf jede Ausnahme (OverflowError, InvalidOperation) mit None antworten lassen.
- **[klein]** Handbefehle --erneut/--bestellt/--geklaert laufen durch dieselbe Sperre: bei aktivem Stundenlauf tun sie nichts und melden Exit 0 (`automation/fortura_bestell_engine.py:1250`)
  Vorschlag: Bei Wartungsbefehlen blockierend sperren (`flock` ohne LOCK_NB, begrenzt auf ca. 130 s) oder bei belegter Sperre Exit-Code 2 liefern.
- **[klein]** Jeder flock-Fehler (ENOLCK, EOPNOTSUPP …) wird als «anderer Lauf aktiv» gelesen: die Engine tut dann dauerhaft nichts, Exit 0 (`automation/fortura_bestell_engine.py:69`)
  Vorschlag: Nur `BlockingIOError` (EWOULDBLOCK/EAGAIN) als «belegt» behandeln. Andere OSError wie bei 'ohne' behandeln, aber mit sichtbarer Warnzeile.
- **[klein]** Reihenfolge der Tore: liegt die Datei schon bei Fortura, kommen vorher noch Bestands-/VE-Tore mit falscher Anweisung (`automation/fortura_bestell_engine.py:288`)
  Vorschlag: Die Prüfung `name in vorhanden` (und den frisch gelesenen Ordner) direkt nach dem Paket- und Tor-Teil nach vorn ziehen, vor Bestand/VE: liegt die Datei da, sofort 'xml-hochgeladen'.

## cj-varianten — 7 bestätigt von 9 (Codex-Tokens 66,136)

- **[wichtig]** Preisbasis wird nach dem Stecker-Filter aus der ersten verbleibenden CJ-Variante genommen (nicht aus der Variante, auf der der Shop-Preis beruht) (`automation/cj_varianten_nachziehen.mjs:220`)
  Vorschlag: Basis aus der ungefilterten Liste als Untergrenze nehmen, wie die Importer: `const ekBasis = Math.min(...vsRoh.map(v => v.ek).filter(e => e > 0))` (statt `vs[0].ek`); dazu einen Test mit 'US EK 2 + EU EK 10' und einen mit 'erste Variante teurer als die zweite'.
- **[wichtig]** Bei unbekannten Basiskosten (unitCost leer) bekommen alle Varianten den Basispreis, auch wenn eine bei CJ ein Vielfaches kostet; kein Schutz vor dem Schreiben (`automation/lib/cj_varianten.mjs:275`)
  Vorschlag: In plane() nach der Preisschleife: `if (zeilen.some(z => z.einheitspreis) && zeilen.some(z => z.ek > ekBasis * 1.05)) return {handle, ergebnis:'UEBERSPRUNGEN', grund:'zurückgestellt-fähig: Kosten unbekannt, Preise nicht ableitbar'}`; EK null/''/0 vorher zu NaN machen (`const ek = Number(x) > 0 ? Number(x) : NaN`).
- **[wichtig]** Beim Anlegen der Auswahl wird die Ziel-SKU nicht auf Doppelvergabe bei anderen Produkten geprüft (nur im SKU-Pfad) (`automation/cj_varianten_nachziehen.mjs:275`)
  Vorschlag: Vor productSet je Variante-SKU `productVariants(first:5, query:"sku:…")` (wie SKU_DOPPELT, mehrere per OR) und bei Fremdtreffer 'zurückgestellt: SKU schon vergeben (handle)' statt Schreiben.
- **[klein]** Variante mit unbekannter Lieferbarkeit wird weggelassen, das Produkt aber endgültig als erledigt verbucht (Marker + GESCHRIEBEN, FORCE hilft nicht) (`automation/cj_varianten_nachziehen.mjs:215`)
  Vorschlag: Wenn eine Klasse 'unbekannt' wegen eines Fehlers (linien === null) ist: nicht schreiben, sondern 'UEBERSPRUNGEN · vorläufig: Fracht unbekannt' (20 Stunden), damit die nächste Nacht es mit voller Information noch einmal versucht.
- **[klein]** Tageslimit-Fehler (VARIANT_THROTTLE_EXCEEDED) geht verloren, wenn ihm eine sehr lange userError-Meldung vorausgeht (`automation/cj_varianten_nachziehen.mjs:290`)
  Vorschlag: In aufschreiben() vor dem Kürzen prüfen: `const voll = JSON.stringify(e); return {ok:false, fehler: voll.slice(0,600), limit: /VARIANT_THROTTLE|Daily variant creation limit/i.test(voll)}` und in Zeile 478 `w.limit` benutzen.
- **[klein]** Medium im Status PROCESSING wird beim Schreiben aus der Galerie entfernt, die Frischprüfung meldet es nicht (`automation/lib/varianten_sicherheit.mjs:63`)
  Vorschlag: In veraendertSeitPlan jedes Medium mit Status PROCESSING oder UPLOADED als Grund melden ('Medium in Verarbeitung', vorläufig, 20 Stunden), statt es stillschweigend wegzulassen.
- **[klein]** Frischlesen ist keine Sperre: zwei gleichzeitige Läufer können dasselbe Produkt zweimal schreiben bzw. dieselbe Ziel-SKU an zwei Produkte vergeben (`automation/cj_varianten_nachziehen.mjs:457`)
  Vorschlag: Kein Eingriff im Code nötig; als Betriebsregel festhalten: nie zwei Läufe auf dieselbe Liste. Wer härten will: Sperrdatei je Handle (`flock`) oder SKU-Prüfung nach dem Schreiben nachholen.

## google-feed — 10 bestätigt von 14 (Codex-Tokens 67,089, LIMIT ERREICHT, unvollständig)

- **[wichtig]** [Codex-Spur] Feed liest nur die ERSTE Variante: Verfügbarkeit, Preis und GTIN eines mehrvariantigen Produkts kommen von Variante 1 (`automation/autopilot/merchant_feed.mjs:81`)
  Vorschlag: Verfügbarkeit = irgendeine Variante lieferbar (`variants(first:100){availableForSale price}` oder `Product.totalInventory`/`tracksInventory` plus `availableForSale` auf Produktebene), Preis = Preis der Variante, die der Link öffnet; oder je Variante ein Feed-Item mit `item_group_id` und `?variant=`-Link.
- **[wichtig]** [Codex-Spur] Feed-ID = Handle ohne Längenprüfung: Handles über 50 Zeichen verletzen Googles ID-Grenze (`automation/lib/gmc_feed_item.mjs:93`)
  Vorschlag: In feedItem: `id.length > 50` -> stabile Kurz-ID (z. B. numerische Produkt-ID oder `handle.slice(0,41)+'-'+hash8`); alle Handles ≤ 50 unverändert lassen (Verlauf bei Google). Workflow-Prüfung um `awk 'length>…'` für `<g:id>` ergänzen.
- **[wichtig]** [Codex-Spur] GTIN-Prüfziffer wird nicht geprüft: ungültige und Platzhalter-Barcodes gehen als `<g:gtin>` an Google; der Test benutzt selbst eine ungültige GTIN (`automation/lib/gmc_feed_item.mjs:110`)
  Vorschlag: GS1-Modulo-10-Prüfung vor dem Senden, plus Ablehnung von Nur-Nullen/gleichen Ziffern; bei Ungültigkeit auf den `mpn`/`identifier_exists`-Zweig fallen. Test-Fixture auf eine gültige GTIN (z. B. 4006381333931) ändern und eine ungültige als Gegenprobe ergänzen.
- **[wichtig]** [Codex-Spur] Steuerzeichen in Titel/Beschreibung machen den Feed zu ungültigem XML; die Workflow-Prüfung stoppt dann den GANZEN Tagesfeed (`automation/lib/gmc_feed_item.mjs:44`)
  Vorschlag: In `escXml` (oder feld()) `.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,'')` und einzelne Surrogate entfernen; zusätzlich im Generator mitzählen, wie viele Werte bereinigt wurden.
- **[klein]** [Codex-Spur] Nicht im Onlineshop veröffentlichte Produkte (onlineStoreUrl = null) kommen mit erfundenem Link und «in stock» in den Feed (`automation/autopilot/merchant_feed.mjs:108`)
  Vorschlag: Statt Fallback das Produkt auslassen: `if (!x.onlineStoreUrl) { gruende.set('nicht im Onlineshop', …); continue; }` (oder in der Query `published_status:online_store` verwenden).
- **[klein]** [eigen] Umgebungsvariablen mit leerem Wert kippen Versandpreis auf 0.00 bzw. NaN und die Sortierung auf «rückwärts» (`automation/autopilot/merchant_feed.mjs:36`)
  Vorschlag: `const vp = process.env.VERSAND_PREIS; Number.isFinite(parseFloat(vp)) ? parseFloat(vp) : 7` und `REVERSE` nur bei '0'/'1' auswerten; im feedItem `Number.isFinite(+versandPreis)` verlangen.
- **[klein]** [Codex-Spur] Titel nur aus Leerzeichen besteht die Prüfung, der Eintrag erscheint OHNE Pflichtfeld `title` (`automation/lib/gmc_feed_item.mjs:67`)
  Vorschlag: In pruefeProdukt `String(p.titel ?? '').trim()` verwenden.
- **[klein]** [eigen] kuerzeTitel kappt mitten in einem Emoji-Paar: halbes Surrogat wird zu U+FFFD im Titel (`automation/lib/gmc_feed_item.mjs:50`)
  Vorschlag: Nach dem Schnitt `if (/[\uD800-\uDBFF]$/.test(s)) s = s.slice(0, -1)`.
- **[klein]** [Codex-Spur] Fortura-Planer erkennt Kurz-Zusagen in Entity-/Tag-Schreibweise nicht (&nbsp;, <strong>1–2</strong>): falsche Zusage bleibt stehen, Plan sagt «ersetzen» oder «sauber» (`automation/lieferzeit_fortura.mjs:45`)
  Vorschlag: Vor KURZ/MEIST/BEKANNT normalisieren: Tags entfernen, `&nbsp;`/`&#160;` und Entity-Striche decodieren (`t.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&#xA0;/gi,' ')`), dann prüfen; Tests für `&nbsp;` und `<strong>1–2</strong>` ergänzen.
- **[klein]** [eigen] Testlücken: merchant_feed.mjs hat keinen Test; die Tests bemerken keinen der obigen Fehler (`automation/lib/gmc_feed_item_test.mjs:43`)
  Vorschlag: Test mit lokaler fetch-Attrappe für merchant_feed.mjs (wie mock_feed_preload.mjs) und je eine Gegenprobe für Prüfziffer, ID>50, Steuerzeichen, Mehrvarianten, onlineStoreUrl=null, leere Umgebungsvariablen und `&nbsp;`-Zusagen aufnehmen.

## cj-reviews — 10 bestätigt von 13 (Codex-Tokens 18,482, LIMIT ERREICHT, unvollständig)

- **[wichtig]** Codex: Dublettenpruefung im Shop ist 'offen', wenn das Judge.me-Widget nicht lesbar ist (HTTP 429/5xx) - bei verlorenem Ledger entstehen Doppel (`automation/cj_reviews_import.mjs:183`)
  Vorschlag: jmProduktTexte bei Fehler null liefern; in der Schleife (Zeile 371) bei null das Produkt mit complete=false, fails++ abbrechen und NICHT senden. Dasselbe in jmAbgleich (dort 'uncertain' statt 'nicht gefunden' melden).
- **[klein]** Codex: Nur Seite 1 (30 Kommentare) wird gelesen; total wird ignoriert - Produkt mit guten Kommentaren auf Seite 2 gilt 60 Tage als 'CJ hat nichts' (`automation/cj_reviews_import.mjs:338`)
  Vorschlag: Nach Zeile 340: wenn Number(cr.data.total) > list.length und picked leer, Seite 2 (bis 3) nachladen; mindestens in diesem Fall merkeLeer NICHT aufrufen.
- **[klein]** Codex: Ledger-Schreibfehler nach erfolgreichem POST - Meldung '0 echte Reviews', Bewertung ist live, 'sending' wird nie selbst abgeglichen (`automation/cj_reviews_import.mjs:389`)
  Vorschlag: Zeile 389 und 404 in try/catch: bei Fehler 'BEWERTUNG LIVE, Ledger nicht geschrieben (key)' melden und sent++ zaehlen. Im 'sending'/'uncertain'-Zweig (Zeile 356) zuerst jmProduktTexte(pidNum,true) lesen und bei Treffer auf 'sent' setzen.
- **[klein]** Codex: Judge.me-Drosselung (HTTP 429) beim POST wird nicht behandelt - kein Retry-After, kein Abbruch, jede Bewertung 'failed', naechster Lauf wiederholt alles inkl. CJ-Punkten (`automation/cj_reviews_import.mjs:394`)
  Vorschlag: Bei Status 429: Retry-After (gedeckelt, z. B. 90 s) abwarten, einmal wiederholen, danach das Produkt abbrechen (break) und als nicht geprueft melden statt 'abgelehnt'.
- **[klein]** Codex: Nur die ERSTE Shopify-Variante bestimmt die CJ-Zuordnung - leere erste SKU ueberspringt das Produkt dauerhaft (`automation/cj_reviews_import.mjs:246`)
  Vorschlag: variants(first:10) abfragen und die erste SKU waehlen, die nicht leer und keine Fremd-SKU ist.
- **[klein]** Codex: Score ausserhalb 1..5 wird stumm auf 5 Sterne gekappt, Dezimalwerte unveraendert gesendet (`automation/cj_reviews_import.mjs:344`)
  Vorschlag: Filter auf Number.isInteger(s) && s >= MIN_SCORE && s <= 5; sonst auslassen und melden.
- **[klein]** Codex: Identischer Text eines ANDEREN Autors beim Produkt unterdrueckt eine echte CJ-Bewertung und wird als 'sent' verbucht (`automation/cj_reviews_import.mjs:371`)
  Vorschlag: Wegen geringer Schwere ggf. akzeptieren; sonst zusaetzlich Sterne vergleichen oder den Zustand 'dupe' statt 'sent' speichern.
- **[klein]** Eigener Fund: Zweite Dublettensicherung wirkt nur bei identischem Wortlaut - LLM-Uebersetzung formuliert beim Wiederholen anders (`automation/cj_reviews_import.mjs:372`)
  Vorschlag: Zusaetzlich den ORIGINAL-Kommentartext (vor Uebersetzung) oder einen Schluessel-Marker im Judge.me-Titel/Body-Kommentar mitsenden und dagegen abgleichen; oder Ledger-Verlust hart abfangen (Lauf bricht ab, wenn das Ledger nicht gelesen/commitet werden kann).
- **[klein]** Eigener Fund: DRY_RUN gilt nur bei exakt '1' - 'true', 'TRUE', 'yes' schreiben LIVE (`automation/cj_reviews_import.mjs:43`)
  Vorschlag: const DRY = /^(1|true|yes|ja)$/i.test(process.env.DRY_RUN || ''); noch sicherer: bei gesetztem, nicht '0'/'false' erkanntem Wert abbrechen (Exit 2).
- **[klein]** Eigener Fund: Uebersetzer-Antwort wird nur auf die Laenge geprueft - Nicht-Strings landen als Bewertungstext live ('[object Object]', '5') (`automation/lib/uebersetzen.mjs:28`)
  Vorschlag: In arrayAus: if (!arr.every(s => typeof s === 'string' && s.trim())) return null; (dann Rueckfall auf Original).
