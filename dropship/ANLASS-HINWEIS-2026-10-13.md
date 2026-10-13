# Halloween: Hinweis «Lieferung nach dem Anlass» + schneller Ausweg (Kauf-Strecke Klasse 3, 13.10.2026 abends)

## Befund vorher (GEMESSEN)
- CJ-Halloween-Ware zeigte «Lieferung voraussichtlich 28. Okt. – 11. Nov.» ohne ein Wort zu Halloween, ohne Link zur schnellen Ware.
- `anlass_lieferzeit_wache.py` meldete «alles rechtzeitig bis 29.10.» — sie fragte nach der KALIBRIERTEN Ankunft (12 WT), nicht
  nach dem, was Seite und Kasse anzeigen (bis 21 WT). Oben in /collections/halloween: 10 von 12 langsam (Profil «General»).
- `kostueme-ch-lager`: Platz 1 = CJ-Perücke aus Asien («Lockige Cosplay-Perücke …»), 5 CJ-Perücken drin (Regel ODER mit `peruecke`).
- Tag `halloween`: 258 Produkte, 225 aktiv, 99 im Google-Kanal (79 CJ, 19 CH-Lager, 1 sonst); 132 aktive ch-lager, davon 113 mit
  Profil «CH-Lager» + Zeichen `profil-ch-lager`, 19 ohne (alle im Google-Kanal → Stufe 1 liess sie aus).

## Rechnung (Kalibrierung `data/anlass_kollektionen.json`)
| Grösse | Regel | Halloween (Sa 31.10.) |
|---|---|---|
| Hinweis + Sortierung ab | erster Tag mit heute + 21 WT (Kassen-Zusage CJ: P1D + 19 T Transit + 1 nach 12 Uhr) > Anlass | Fr 02.10. |
| Kipptag «kommt erst nach» | erster Tag mit heute + 12 WT (kalibrierte Ankunft) > Anlass | **Do 15.10.** (Mi 14.10. + 12 WT = Fr 30.10.; Do 15.10. + 12 WT = Mo 02.11.) |
| Link «ab Schweizer Lager» bis | letzter Tag mit heute + 4 WT ≤ Anlass | Mo 26.10. (+ 4 WT = Fr 30.10.) |
| Weihnachten (Do 24.12.) | dieselbe Regel | Hinweis ab 26.11., Kipptag Mi 09.12. |

## Umgesetzt
- **(a)** Wache sortiert ab «Hinweis ab» (nicht erst ab Kipptag), schnell = Profil «CH-Lager». /collections/halloween: oben 12 = 12/12 im Profil (zurückgelesen).
- **(c/d)** Theme: neuer Block `lux_anlass_hinweis` direkt unter `lux_delivery` in templates/product.json (Backup
  `theme_backup/templates__product.json.vor-anlasshinweis-1013`, md5 61681116… → dfa6186a…). Liest Shop-Metafeld
  `luxe.anlass_hinweis` (JSON), das nur die Wache schreibt; ausserhalb aller Fenster gelöscht. Nie bei `profil-ch-lager`,
  `eu-lager`, Druck auf Bestellung. Texte: vor Kipptag «Lieferung vor Halloween (Sa, 31. Okt.) nicht garantiert – Direktversand aus Asien.»,
  ab Kipptag «Kommt erst nach Halloween (Sa, 31. Okt.) an …»; Link «Rechtzeitig: Halloween ab Schweizer Lager →» auf
  /collections/halloween (nur wenn dort oben 12/12 im Profil, sonst `kostueme-ch-lager`, sonst kein Link) + «bestellt bis Mo, 26. Okt., bei dir vor Halloween».
- **(e)** `kostueme-ch-lager`: `peruecke`/`kostuem-hut` aus der Regel, dafür Zeichen `kostuem-ch-zubehoer` (= ch-lager UND
  (peruecke ODER kostuem-hut), 353 gesetzt, Wache gleicht täglich ab). Mitglieder 1'693 → 1'688 (−5 CJ-Perücken), 0 ohne ch-lager,
  0 Regelbrecher, Platz 1 «Skelett Handschuhe mit LED» (CH-Lager). Kollektions-ID unverändert → Menü bleibt. Rückweg: Regel aus
  `dropship/_kollektion_regel_rueckweg.tsv`.
- **(f)** `ist_kostuem()` gegen 99 Google-Halloween-Produkte: 0 Treffer. Grenzfälle per Bild geprüft (Kopfschmuck/Mützen zählen
  nicht, Entscheid 23.09.) → 7 Kanarien (88 Kostüm-Kanarien, 0 Fehler).
- **(b)** siehe Nachtrag unten (Stufe 2 ab 14.10. 00:00 Schweizer Zeit).

## Wächter
`anlass_lieferzeit_wache.py` (täglich im Aufseher, SCHARF): Sortierung, Metafeld-Soll, prüft per Admin-API, dass der Block
(Marke LUX-ANLASS-HINWEIS + Metafeld-Zugriff + profil-ch-lager-Ausschluss) in der LIVE-Datei steht und das Metafeld aktuell
ist → `dropship/_anlass_hinweis.json` (`befunde`), Zeile «⚠️ ANLASS-HINWEIS: …». Zubehör-Zeichen für neue Fortura-Importe.

## Rückweg
Backup product.json zurückspielen; Metafeld löschen (`metafieldsDelete` luxe.anlass_hinweis) oder `hinweis_tag` aus der Tabelle
nehmen; Kollektionsregel aus `_kollektion_regel_rueckweg.tsv`.

## Prüfung (WebFetch 13.10. ~20:10 UTC)
- CJ «Gelber Leopard-Hoodie mit Teufelshörnern», «Vielseitiger Kürbis-Totenkopf Gürtel»: 28. Okt.–11. Nov. + Hinweis + Link /collections/halloween.
- CH-Lager «Kinderkostüm Cauldron Cutie Hexe», «Kostüm lila Hexe»: 16.–19. Okt., kein Hinweis.
- Aroma-Diffuser (kein Halloween): kein Hinweis; nirgends «Liquid error».
