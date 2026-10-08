# Neuimporte auf groben Google-Oberklassen — Wächter mit gelernten Regeln + KI-Stufe (08.10.2026)

Verbesserungsrunde 08.10. 00:25 UTC (Plan-Tag 8).

## GEMESSEN
- 2'642 aktive Neuimporte seit 01.10.; **483 bei Google auf einer OBERKLASSE** (Klasse mit Unterklassen): Hardware > Tools 122,
  Pet Supplies 50, Party Supplies 32, Clothing 18, Lighting 17, Kitchen & Dining 16 … — Zulauf ~70/Tag (07.10.: 146).
  Die CJ-Gruppe stempelt nur den Korb. Alle 150 Neuimporte seit 07.10. 16:00 haben Google-Kategorie, ≥ 2 Bilder, 148/150 im
  Google-Kanal — das Problem ist allein die Grobheit.
- Die KI-Stufe `google_fein_ki.py` war ein **einmaliger Lauf** über einen festen Export vom 02.10. (fertig 05.10.: 792 von 2'890
  eingeordnet) — Neuimporte sah sie nie. Die Einzelurteile vom 07.10. (12'583) leerten den Bestand, verhinderten aber keinen Zulauf.
- Groq: `gpt-oss-20b` (Massen-Modell) Tageskontingent auf allen 3 Schlüsseln leer; `gpt-oss-120b`/`qwen3.8-27b` erreichbar,
  aber laut `zweitmodell.py` für Bestellungen (Bildvergleich) + SEO-Faktenprüfung reserviert.

## GETAN
1. **`automation/oberklasse_lernen.py`** — Regeln GELERNT aus 16'351 geprüften Urteilen vom 07.10.
   (`automation/data/oberklasse_training.jsonl`: Titel, alte Oberklasse, geprüfter Pfad oder «bleibt»).
   - Merkmal = **Kopfwort** der Ware (letztes Nomen VOR «mit/für/aus …», Bindestrich-Ketten → letzter Teil, Füllwörter raus)
     + Kompositum-Kopf («Hundepullover» → «pullover»). Gegenprobe 80/20: alle Titelwörter **92,1 %** → nur Nomen 93,0 % →
     Kopfwort **97,4 %** → + feste Bastelset-Regeln (Malen nach Zahlen, Diamond Painting, Kreuzstich) **98,0 %** → + Rückfall
     Kopfwort allein (nur wenn Ziel UNTER der heutigen Oberklasse) **97,7 %**. Schreibt nur bei ≥ 95 %.
   - Sperre: Kostüm/Tabak/Klinge/Erotik/Waffe; Shopify-Klasse aus Shopifys Zuordnung (+ `kategorie_fein.ZUSATZ`), geschützte
     Klassen (Drohnen, Kinderkleidung, 3D-Druck) bleiben.
   - SCHARF: **6 gesetzt, 0 Fehler, Rücklesen live 6/6** (Hundemantel/-pullover → Dog Apparel, Klemmbausteine, Kinderpyjama).
2. **Rest ohne Regel (416) → KI-Stufe:** `KI_EXPORT` legt ihn im Format von `google_fein_ki.py` ab; der Aufseher lässt die
   Zwei-Modell-Einigkeit (Gemini + Groq, nur Unterpfade der Oberklasse) mit dem Massen-Modell `gpt-oss-20b` darüber laufen.
   Probelauf 80 Stück (Reservemodell, ~4 Anfragen): einig 10 · uneinig 21 · «keiner passt besser» 49 — eng, aber sicher.
3. **Aufseher:** neuer Tagesblock «OBERKLASSE-NEUIMPORT» (`/tmp/oberklasse_lernen.log`, flock, `absturz_nachholen`).

## WIRKUNG / GRENZE (ehrlich)
Die gelernten Regeln treffen den langen Schwanz der Neuimporte kaum (6/442 in 14 Tagen): die Ware ist zu verschieden
(Zapfturm, Lamellenkamm, Schneekugel-Laterne). Die Arbeit macht die KI-Stufe — eng gefasst, nur bei Einigkeit. Wo beide
«keiner» sagen, bleibt grob richtig besser als fein falsch.

## OFFEN
- KI-Stufe wartet aufs Groq-Massenkontingent (`gpt-oss-20b`), läuft dann täglich selbst.
- Nachmessen 09.10.: Zahl der Neuimporte auf Oberklassen (Basis 483 seit 01.10.), Ledger `_google_fein_ki.tsv` (neue «ok»).
