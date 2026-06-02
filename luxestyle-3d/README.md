# LuxeStyle — 3D-Druck-Pipeline (personalisierte Geschenke + Flexi)

Werkzeuge und Gedächtnis für den Geschäftszweig „3D-Druck-Produkte" im Shop
**luxestyle.ch** (Shopify Basic, CHF, Schweiz). Selbst erzeugte Designs = null
Lizenzproblem. **Erst Sample, dann Shopify. Live schalten nur der Inhaber.**

## Generator-Baukasten

| Datei | Produkt |
|-------|---------|
| `keychain.scad` | Namens-Schlüsselanhänger |
| `nameplate.scad` | Namensschild (Tür / Schreibtisch) |
| `caketopper.scad` | Cake-Topper mit Wunschtext |
| `nametag_base.scad` | Grundplatte (ohne Text) für mehrfarbige Anhänger (X1C + AMS) |
| `animal.scad` | 8 Tier-Silhouetten (cat, bear, rabbit, fish, paw, dog, heart, star) |
| `flexi_chain.scad` | Print-in-Place Gliederkette (beweglich, in einem Stück) |
| `make.py` | erzeugt aus jedem Text eine druckfertige `.stl` |

### Benutzen
```bash
python3 make.py keychain  "Mia"
python3 make.py nameplate "Familie Müller"
python3 make.py caketopper "Happy Birthday"

openscad -o tier_cat.stl -D 'kind="cat"' animal.scad
openscad -o flexi_chain.stl flexi_chain.scad
```
Voraussetzung: OpenSCAD (https://openscad.org/downloads.html). Für Render/Mesh-Cleanup
zusätzlich Blender headless (siehe Lern-Memory).

---

## In-House drucken (Bambu Lab X1C + 2 AMS)

Eigener Drucker → Stückkosten in Rappen, kein Zoll (CH → CH), volle Kontrolle.
Craftcloud bleibt **Backup** bei Überlast.

**Mehrfarbig (AMS):** `nametag_base.scad` als Platte importieren → Bambu-Studio-Text-Werkzeug
für den Namen in zweiter Farbe → AMS druckt automatisch zweifarbig. Kostet Filament für
den Spülturm + etwas mehr Zeit.

---

## Flexi (print-in-place)

- **Eigene Flexi = sicher verkaufbar.** `flexi_chain.scad` ist der zuverlässige Start.
- **Fremde Flexi** (MakerWorld/Thingiverse) sind fast immer NonCommercial → **nicht
  verkaufbar**. Bearbeiten in Blender macht sie NICHT legal.
- **Echte Tier-Flexi** (Drache, Axolotl) → kommerzielle Lizenz (Cinderwing3D ~10 $/Mt)
  oder selbst in printpal.io bauen.
- Flexi braucht das richtige **Spaltmaß** → einmal auf dem X1C testen.

---

## Lern-Memory (Stand: Juni 2026)

Was in dieser Session gelernt/entschieden wurde — damit es nicht verloren geht:

**Werkzeuge im Container** (ephemer, pro Session neu via `apt`):
- `openscad` (parametrische STL + Renders), `blender` 4.0 headless + `xvfb`
  (Mesh-Reparatur/Cleanup von KI-Modellen, Format-Konvertierung, Renders).

**Flexi-Technik:**
- CGAL meldet `Volumes = Anzahl Glieder + 1` (Außenraum zählt mit).
  Geprüft `flexi_chain.scad`: `pitch` 11–11.5 → alle 6 Glieder getrennt UND verhakt
  (Volumes 7). Verhakt nur solange `pitch < 2*R - r` (= 13.8).
- Tuning: **verkleben → pitch erhöhen**; **fällt auseinander → pitch verringern**.
- Flexi braucht echten Test-Druck; am besten auf eigenem X1C (Toleranz steuerbar),
  über Craftcloud riskanter (Glieder können verkleben).
- Komplexe Tier-Flexi (Kater mit Beinen) ist schwer zu skripten → printpal/Lizenz.

**KI-3D (Meshy):**
- Erzeugt nur **statische** Meshes, **kein** Flexi (keine Gelenke).
- Meshes oft nicht druckbar → Blender-Cleanup (manifold) nötig.
- Sicherer ohne API-Key: Meshy-Download-Link schicken → hier per Skript verarbeiten.

**Recht / Lizenzen:**
- „Keine Lizenz" = automatisch verboten. Verkaufbar nur **CC0** oder **Commercial**.
- Fremde Produktfotos (MakerWorld) NICHT verwenden.

**Auto-Versand-Apps:**
- WAZP+ = fertiger Katalog (kein eigener STL-Upload, EU, hands-off).
- Shop3D / Slant3D = eigene STLs hochladen (Slant3D = USA → Zoll).
- Nur 1 Fulfiller pro Produkt. Personalisiertes bleibt manuell.

---

## Projekt-Gedächtnis

- **Markt:** Schweiz zuerst. EU/DACH später (GPSR, Einfuhr-MwSt/IOSS, EU-Widerruf).
- **Betreiber:** Allen Chour, Hühnerhubelstrasse 37, 3123 Belp, CH ·
  Einzelfirma, nicht im HR, nicht mehrwertsteuerpflichtig.
- **Recht:** 6 Shop-Texte geschrieben → in Shopify → Einstellungen → Richtlinien einfügen.
- **Drucker:** Bambu Lab X1C + 2 AMS. In-House = Hauptweg, Craftcloud = Backup.
- **Shopify (DRAFT, nichts live):** Tier-Schlüsselanhänger (8 Tiere × 6 Farben),
  Namens-Anhänger, Namensschild, Cake-Topper.
- **Social:** `posts.json` für `../social/post.py` (eigene LuxeStyle-Kanäle nutzen).
- **Bestehender Shop:** CJdropshipping-Artikel (Mode + Gadgets) — Sortiment unfokussiert.
