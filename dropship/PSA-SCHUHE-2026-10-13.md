# Keine «Sicherheitsschuhe» ohne Prüfnorm (13.10.2026)

**Anlass:** Der Betreiber entschied am 13.10. «4 entscheide du sauber». Die Frage dazu kam aus der Verbesserungsrunde am Abend (Spur GSC, Punkt C8).

## Befund (GEMESSEN, Voll-Export + Admin-API)

- 134 aktive CJ-Schuhe stehen im Google-Kanal. Sie heissen «Sicherheitsschuhe», «Schutzschuhe», «Sicherheitsstiefel» oder «Sicherheits-Sneaker».
- Diese Bezeichnungen kommen 230-mal vor, verteilt auf Titel, Text und SEO.
- Eine Norm nennt **keiner**: Für EN ISO 20345, S1/S2/S3 gab es 0 Treffer in den Schuhtexten. Die S1/S3-Treffer stammten aus Lautsprechern, Bits und einem Modellauto. Ein Zertifikat hat ebenfalls keiner.
- «Sicherheitsschuh» bezeichnet persönliche Schutzausrüstung (PSA, Kategorie II). In der Schweiz gilt dafür die PSAV (SR 930.115), in der EU die Verordnung 2016/425, geprüft wird nach EN ISO 20345.
- Ohne Konformität ist die Bezeichnung ein Schutzversprechen, das niemand geprüft hat. Das ist ein UWG-Risiko, und im schlimmsten Fall verletzt sich jemand auf der Baustelle.

## Entscheid

**Variante A:**
- Die Bezeichnung wird zu «Arbeitsschuh», «Arbeitsstiefel» oder «Arbeits-Sneaker».
- Die Stahlkappe bleibt als Ausstattung erwähnt.
- Im Text kommt ein Hinweis dazu: «keine geprüfte persönliche Schutzausrüstung (PSA) nach EN ISO 20345».
- «europäische Stahlkappe» wird zu «Stahlkappe», denn «europäisch» klingt nach Norm.

**Verworfen, Variante B (Zertifikate bei CJ anfragen):** Das dauert, und ohne geprüfte Unterlagen bliebe die Bezeichnung trotzdem falsch.

## Umgesetzt

- **Werkzeug:** `automation/psa_schuhe_wache.py`
  - Kanarien 23/23
  - Trockenlauf
  - Ledger mit Altwerten in `dropship/_psa_schuhe_ledger.jsonl`
  - Rückweg mit `LAUF=… --zurueck`
- **Lauf 2026-10-13T1623Z:** 90 Produkte geschrieben, 1 Fehler.
  - Der Fehler war «Sicherheits-Arbeitsschuhe», eine Form, die keine Regel abdeckte.
  - Ich habe eine Regel und einen Kanarienvogel ergänzt.
  - Lauf 1627Z hat das letzte Produkt korrigiert.
- **Ergebnis:** Kein aktiver Schuhtitel trägt die Bezeichnung mehr.
- **Hinweis-Absatz:** Er ist mit `data-psa-hinweis` markiert und steht genau einmal je Produkt. Ein zweiter Lauf ändert nichts mehr (getestet).
- **Fehler, die der Trockenlauf aufgedeckt hat (alle vor dem Schreiben behoben):**

  | Vorher | Fehlerhaftes Ergebnis | Korrektur |
  |---|---|---|
  | «Arbeitssicherheitsschuhe» | «Arbeitsarbeitsschuhe» | eigene Regel |
  | «Arbeits- & Sicherheitsschuhe» | «Arbeits- & Arbeitsschuhe» | Regel für «& / und / + /» |
  | «Schutzschuhe für Fussverletzungen» | (Verbandsschuh, wäre falsch umbenannt worden) | Medizin-Ausnahme |
  | «Schutzschuhe für Senioren» | (Seniorenschuh, wäre falsch umbenannt worden) | Medizin-Ausnahme |
  | «Sicherheits-Halbschuhe» | wäre unverändert geblieben | eigene Regel |

- **Wächter:** täglich im Aufseher (`SCHARF=1`) über den Voll-Export. Damit sind neue Importe erfasst.

## Offen

- Die Suchbegriff-Kollektion `sicherheitsschuhe` (105 Produkte, Tag `such-sicherheitsschuhe`) und die SEO-Texte von `sub-wander-arbeitsschuhe` versprechen noch «Sicherheitsschuhe».
  - Plan: Titel «Arbeitsschuhe mit Stahlkappe» plus PSA-Hinweis, der Handle bleibt.
  - Die Datei `automation/data/suchbegriff_kollektionen.json` bearbeitet gerade die GSC-Gruppe der Umsetzung. Deshalb folgt das danach.
- Werbeaussagen wie «optimaler Schutz» und «maximale Sicherheit» bleiben im Lieferantentext stehen. Der Hinweis stellt klar, dass es keine PSA ist.
