# Social-Queue: CH-Lager-Zusage «1–2 Werktage» umgeschrieben (13.10.2026, ~20:45 UTC)

## Befund (GEMESSEN 20:35 UTC)
Shop-Metafeld `luxestyle.social_queue` (28 Einträge, geschrieben von der Routine «Social-Redaktion» 04:00, gelesen
vom PC-Poster des Betreibers) trug in **allen 28** Einträgen (alle `chLager: true`):
- `lieferzeit`: «1-2 Werktage ab Schweizer Lager (Fortura)»
- TikTok: «Ab Schwiizer Lager – i 1–2 Wärchtäg bi dir.» (2× mit Zusatz «Original BRUDER.»)
- Instagram: «📦 Ab Schwiizer Lager · 1–2 Wärchtäg» (5× mit Zusatz «· Original HARIBO/BRUDER/Trolli/Swizzels»)

Seit 13.10. gilt: Die Kasse rechnet ab Schweizer Lager **meist 2–3 Werktage**, und nur bei Tag `profil-ch-lager`
(Versandprofil CH-Lager). CH-Lager-Ware ohne dieses Zeichen zeigt in der Kasse noch das lange Fenster.

## Vorher / nachher (GEMESSEN, Metafeld zurückgelesen, updatedAt 2026-10-13T20:45:08Z)
| Status    | Einträge | mit «1–2» vorher | nachher | davon mit `profil-ch-lager` |
|-----------|---------:|-----------------:|--------:|----------------------------:|
| bereit    | 9        | 9                | 0       | 4 (Perücke Hexe, Kostüm Kleines Monster, Hut Hexe Duvessa, Maske Killer) |
| pausiert  | 19       | 19               | 0       | 4 (Kostüm Zauberin, Haarige Tarantel, Body Clown, Mantel Dracula) |
| gepostet  | 0        | 0                | 0       | — |

- Geändert wurden genau die Felder `captionTiktok`, `captionInstagram`, `lieferzeit` (je 28×); Status, `regeln`,
  `hinweis` und alle übrigen Felder unverändert. Pausiert bleibt pausiert (nur Text korrigiert).
- `lieferzeit` nachher: 8× «meist 2–3 Werktage ab Schweizer Lager (Fortura)», 20× «ab Schweizer Lager, Lieferdatum
  steht beim Artikel und in der Kasse».
- Zusätze hinter der Zusage («Original BRUDER.» usw.) sind erhalten.
- Alttext je Feld (84 Zeilen, JSON-kodiert, mit Status und Profil-Entscheid): `dropship/_social_queue_zusage.tsv`.
  Rückweg: `alt_json` je (handle, feld) zurückschreiben.

## Kanon
| Fall | TikTok | Instagram | lieferzeit |
|---|---|---|---|
| mit `profil-ch-lager` | Ab Schwiizer Lager – meist i 2–3 Wärchtäg bi dir. | 📦 Ab Schwiizer Lager · meist 2–3 Wärchtäg | meist 2–3 Werktage ab Schweizer Lager (Fortura) |
| ohne | Ab Schwiizer Lager – s genaue Lieferdatum gsehsch bim Artikel. | 📦 Ab Schwiizer Lager · Lieferdatum bim Artikel | ab Schweizer Lager, Lieferdatum steht beim Artikel und in der Kasse |

## Wächter (dauerhaft)
`automation/social_queue_wache.py`, Regel 7 (`zusage_pass`):
- Kandidat: Status `bereit` oder `pausiert`, `chLager: true`, und «1–2 / 1-2 / 1 – 2 / 1—2 / ein(s)/eis bis zwei» +
  Tag-Einheit (Tag/Tage/Tagen/Täg, Werk-/Wärch-/Arbeits-). In Captions nur, wenn die Zeile von Lager/Lieferung/Versand/
  «bi dir»/📦 spricht («Antwort in 1–2 Tagen» bleibt). `gepostet` = Protokoll, nie angefasst.
- Zeichen `profil-ch-lager` wird live am Produkt gelesen; Produkt ohne `ch-lager` oder nicht vorhanden → nur melden
  (Regel 1/5 pausiert es). Unbekannte Satzform → nur melden, nie halb umschreiben.
- Ohne FIX: Meldung + Eintrag in `dropship/SOCIAL-QUEUE-WACHE.md`. Mit FIX=1: umschreiben, Alttext ins Ledger.
- Schreiben: `updatedAt` + `compareDigest` direkt vor dem Schreiben erneut lesen, bei Abweichung NICHT schreiben;
  `metafieldsSet` mit `compareDigest` (Shopify lehnt ab, falls die Routine 04:00 dazwischen schrieb). Gilt jetzt auch
  für die bisherigen Pausier-Schreibvorgänge der Wache.
- Selbsttest: `python3 automation/social_queue_wache.py --selbsttest` → 36/36 grün (11 positive, 7 negative Kanarien,
  6× Kanon idempotent, 8 Umschreib-Prüfungen, 4 Kandidaten-Prüfungen). Läuft ohne Netz/Token.
- Aufruf durch den Aufseher: `automation/fixer_keepalive.sh` Zeile 1945, alle 6 h (Log-Alter > 21600 s),
  `FIX=1 python3 automation/social_queue_wache.py` unter `flock /tmp/lock_social_queue_wache.lock`, Log
  `/tmp/social_queue_wache.log`. Der Lauf hier lief unter demselben Lock.

## Offen / Hinweise
- `regeln.lieferzeitRegel` und `regeln.umstellung2026-09-14` im selben Metafeld sagen weiter «1-2 Werktage» — nicht
  angefasst (Auftrag: nur Einträge). Falls die Routine diese Regeltexte liest, wäre das ein Rückfallweg (VERMUTUNG;
  laut Auftrag ist die Routine selbst schon umgestellt). Die Wache fängt jeden neuen 1–2-Eintrag ab dem nächsten
  6-h-Lauf ab.
- Einträge 09.10.–13.10. stehen noch auf `bereit`, obwohl ihr Datum vorbei ist — der PC-Poster hat seit dem 09.10.
  nichts als `gepostet` markiert (GEMESSEN: 0 Einträge `gepostet`); ob er postet, ist von hier nicht prüfbar.
