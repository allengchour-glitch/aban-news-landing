# Katalog-Qualitäts-Runde (autonom) — Stand 2026-05-30

> Auftrag: „denke dir verbesserung aus … 10 agenten für 1 stunde". Volle Autonomie.
> Scope: nur Produktdaten/-status/-metadaten. Live-Theme bleibt gesperrt & unberührt.

## Diagnose (Audit-Agent, alle 1.156 aktiven Produkte gescannt)
| Befund | Anzahl |
|--------|-------:|
| Aktive Produkte | 1.156 |
| **Ohne Bild** (leere Kacheln im Shop) | **783** (68 %) |
| Fake-Streichpreis (compareAt ≈ Preis × 1,3) | 722 |
| davon krumme Fantasie-MSRP (z.B. 51.87, 337.87) | 464 |
| bildlos **und** fake-Preis (auto-generierte Müll-Linie) | 721 |
| `cj-real` (echte CJ-Produkte) unter den Bildlosen | **0** ✓ |
| Spam-Doppelwort-Titel | 24 (16 davon in der Müll-Linie) |

**Kernproblem:** 68 % des „aktiven" Katalogs war eine auto-generierte Linie ohne Bild,
mit Fantasie-Streichpreisen und Keyword-Spam-Texten („Premium-Designer / Premium-Boutique-
Geschenkbox", Titel wie „Yoga-Decke Designer Boutique Boutique"). Keiner deiner 8 echten
CJ-Produkte betroffen.

## Phase 1 — Bildlose Müll-Produkte archiviert ✅
- **783 bildlose Aktiv-Produkte → ARCHIVED** (3 parallele Agenten, 16 Batches à 50, **0 Fehler**).
- `cj-real` ausgenommen (waren ohnehin alle bebildert).
- **Ergebnis verifiziert:** aktiv **1.156 → 373** (alle mit Bild), archiviert 4.132 → **4.915**, draft 0.
- Fast das ganze Fake-Preis-Problem gleich miterledigt: 721 der 722 Fake-Preise waren genau
  diese Bildlosen. Das **eine** bildbehaftete Fake-Preis-Produkt (Foam-Roller) manuell gefixt:
  Streichpreis 71.37 entfernt + Spam-Text neu geschrieben.
- **Reversibel:** alle 783 IDs in `dropship/assets/archived-active-imageless-ids.jsonl`.
- **Rescue-Kandidaten:** 62 bildlose, aber als Hausmarke gedachte „Luxe…"-Produkte
  (LuxePods, LuxeRest, LuxeGlow, Self-Care-Bundles) in
  `dropship/assets/rescue-candidates-add-images.jsonl` — falls du sie willst: Bilder
  ergänzen, dann reaktiviere ich sie + schreibe echte Texte.

## Phase 2 — Body-Texte der 373 behaltenen Produkte ✅
Recon-Scan aller 373: Katalog **erstaunlich sauber** — nur **3 Ausreißer** (Verkaufs-/
Popularitäts-Behauptungen im Body), alle umgeschrieben:
- Smaragd-Anhänger: „Vogue-bestätigter Top-Trend 2026" raus.
- Top-3-Bundle: „beliebteste/meistgekaufte Bestseller"-Framing entschärft + „LuxeStyle CH" → „LuxeStyle".
- Geburtsstein-Kette: Bullet „Geschenk-Bestseller" → echte Produkt-Eigenschaft.
Kein „Premium"-Stuffing, keine zu dünnen Texte, kein Markt-Framing mehr.

## Phase 3 — Bild-Alt-Texte ✅
- Recon: **237 Produkte / 929 Bilder** ohne Alt-Text (v.a. ältere Importe; neue CJ-Produkte hatten schon gute).
- Alle **929 Bilder** per `fileUpdate` (5 Batches à ≤200) mit `altText = Produkttitel` versehen, **0 Fehler**.
- Verifiziert: durchgängige Alt-Abdeckung (Video-Medien korrekt ausgelassen).
- Nutzen: Google-Bildersuche + Barrierefreiheit/Screenreader.

## ✅ ENDSTAND Verbesserungs-Runde
| Maßnahme | Ergebnis |
|----------|----------|
| Bildlose Müll-Produkte archiviert | 783 → aktiv **1156→373**, alle mit Bild |
| Fake-Streichpreise (×1,3) | weg (721 mitarchiviert + 1 manuell) |
| Body-Text-Müll | 3 Ausreißer umgeschrieben |
| Fehlende Bild-Alt-Texte | 929 gesetzt |
| Agenten-Läufe | Audit + 3 Archiver + Body-Recon + Alt-Recon + Alt-Fixer = 7, **0 echte Fehler** |

## Offen (du / niedrige Prio)
- **Shop-Name „LuxeStyle CH" → „LuxeStyle"** (Einstellungen → Allgemein) — wirkt auf Logo + Browser-Titel.
  Kein Admin-API-Mutation dafür; nur Settings-UI.
- 62 **Rescue-Kandidaten** (Hausmarke „Luxe…" ohne Bild): Bilder liefern → ich reaktiviere + betexte.
- Kosmetik (sehr niedrig): ein paar alte, vorbestehende Alt-Texte enthalten noch „LuxeStyle CH" /
  fehlende Umlaute; nicht kundenrelevant.
