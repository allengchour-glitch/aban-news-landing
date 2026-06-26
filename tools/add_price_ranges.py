#!/usr/bin/env python3
"""Adds Swiss CHF price range sections to top Kaufberater pages.
Idempotent: marker data-aban-prices.
"""
import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "data-aban-prices"

PRICE_DATA = {
    "kaffeemaschine": ("Kaffeemaschine", "CHF 30–80", "Einfache Filterkaffeemaschine oder Kapselmaschine.", "CHF 80–300", "Kaffeevollautomat Einsteiger oder Siebträger-Einsteiger — gutes Preis-Leistungs-Verhältnis.", "ab CHF 300", "Vollautomaten mit Mahlwerk und Milchsystem; hochwertige Siebträger für Espresso-Enthusiasten."),
    "fernseher": ("Fernseher", "CHF 200–500", "32–43 Zoll HD/FHD, gute Bild­qualität für das Gästezimmer oder Schlafzimmer.", "CHF 500–1500", "55–65 Zoll 4K OLED/QLED, Smart TV mit guter Audio-Ausstattung — ideal für das Wohnzimmer.", "ab CHF 1500", "65–85 Zoll OLED/Mini-LED 4K, Premium-Bild­qualität, Dolby Atmos — für Heimkino-Fans."),
    "staubsauger": ("Staubsauger", "CHF 50–150", "Beutelstaubsauger oder einfacher Akkusauger — bewährt und zuverlässig.", "CHF 150–400", "Beutellos mit gutem Saugsystem oder Qualitäts-Akkusauger (Dyson-Klasse Einstieg).", "ab CHF 400", "Top-Akkusauger (Dyson V15 etc.) oder Premium-Bodenstaubsauger mit HEPA-Filter."),
    "laptop": ("Laptop", "CHF 400–700", "Allrounder für Büro, Web, Studium — meist Intel Core i5 / Ryzen 5, 8 GB RAM, SSD 256 GB.", "CHF 700–1400", "Schneller Allrounder bis Multimedia-Laptop: schnelle CPU, 16 GB RAM, FullHD oder WQHD-Display.", "ab CHF 1400", "Premium-Ultrabooks (MacBook Pro, Dell XPS), Workstations oder Gaming-Laptops mit dedizierter GPU."),
    "sofa": ("Sofa", "CHF 300–800", "Funktionale Sofas von Möbelhändlern — gut für Gäste- oder Kinderzimmer.", "CHF 800–2000", "Stoffsofa oder Leder, verschiedene Konfigurations­möglichkeiten, IKEA- bis Mittelklasse-Qualität.", "ab CHF 2000", "Designermöbel, echtes Leder, Schweizer Qualität — langlebige Investition fürs Wohnzimmer."),
    "saugroboter": ("Saugroboter", "CHF 100–250", "Einfacher Saugroboter ohne Mapping — saugt zuverlässig, navigiert zufällig.", "CHF 250–600", "Mit Lasernavigation/Mapping, App-Steuerung, Zeitprogramme — ideal für regelmässigen Einsatz.", "ab CHF 600", "Kombiroboter (Saugen+Wischen) mit Selbstreinigung, KI-Navigation und Hinderniserkennung."),
    "handy": ("Handy / Smartphone", "CHF 200–400", "Solide Mittelklasse — gute Kamera, ausreichend Leistung für Apps, Social Media, Navigation.", "CHF 400–800", "Gutes Display, schnelle Kamera, längere Updates — z. B. iPhone SE / Galaxy A-Serie.", "ab CHF 800", "Flagship-Smartphones: iPhone 15 Pro, Samsung Galaxy S25 etc. — beste Kamera, Top-Performance."),
    "tablet": ("Tablet", "CHF 150–300", "Android-Tablets für Streaming, E-Books und einfache Apps.", "CHF 300–700", "iPad (Standard) oder gute Android-Tablets mit flüssigem Display und langer Software-Unterstützung.", "ab CHF 700", "iPad Pro / Samsung Galaxy Tab S — für professionelle Nutzung, Stift, externe Tastatur."),
    "waschmaschine": ("Waschmaschine", "CHF 400–700", "8–9 kg Fassungsvermögen, 1200–1400 U/Min, Energieeffizienz A — solide Basisausstattung.", "CHF 700–1200", "10–11 kg, Inverter-Motor, Energieeffizienz A+, spezielle Waschprogramme.", "ab CHF 1200", "Miele/Siemens/Bosch Premium: langjährige Garantie, leiser Betrieb, maximale Effizienz."),
    "kuehlschrank": ("Kühlschrank", "CHF 300–600", "Standkühlschrank 200–300 L Nutzvolumen, NoFrost oder statisch, Energieeffizienz F–E.", "CHF 600–1200", "300–400 L, NoFrost, Edelstahl-Optik, Energieeffizienz E–D — ideal für Familien.", "ab CHF 1200", "Side-by-Side oder French Door ab 500 L, Energieeffizienz C+, Profi-Marken (Liebherr, Miele)."),
    "bohrmaschine": ("Bohrmaschine", "CHF 50–120", "Einfache Bohrmaschine für gelegentliche Heimwerkerprojekte — reicht für Dübel und Regalaufhängung.", "CHF 120–300", "Akkubohrschrauber (18V) mit gutem Drehmoment — für regelmässiges Heimwerken und Eigenheimarbeiten.", "ab CHF 300", "Profi-Akkubohrschrauber (z. B. Bosch Professional, Makita) — für intensive und handwerkliche Nutzung."),
    "espressomaschine": ("Espressomaschine", "CHF 80–250", "Siebträger-Einsteiger oder gute Kapselmaschine — für erste Schritte.", "CHF 250–800", "Halbautomaten mit gutem Druck, manueller Milchschäumer — für Kaffee-Enthusiasten.", "ab CHF 800", "Hochdruck-Siebträger mit Dampflanze, PID-Temperatursteuerung — für Barista-Qualität zu Hause."),
}

SECTION_TMPL = """
<div class="price-ranges" data-aban-prices style="margin:22px 0 8px">
  <h2 style="font-size:1.3rem;margin-bottom:10px">Preisklassen in der Schweiz</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:10px">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #059669;border-radius:10px;padding:13px 14px">
      <strong style="color:#059669">💚 Budget · {b_range}</strong>
      <p style="font-size:.88rem;color:#374151;margin-top:4px">{b_text}</p>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #d97706;border-radius:10px;padding:13px 14px">
      <strong style="color:#d97706">🔶 Mittelklasse · {m_range}</strong>
      <p style="font-size:.88rem;color:#374151;margin-top:4px">{m_text}</p>
    </div>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-left:4px solid #7c3aed;border-radius:10px;padding:13px 14px">
      <strong style="color:#7c3aed">⭐ Premium · {p_range}</strong>
      <p style="font-size:.88rem;color:#374151;margin-top:4px">{p_text}</p>
    </div>
  </div>
</div>
"""


def process(path, key):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    if MARKER in html:
        return False, "skip"

    data = PRICE_DATA[key]
    _, b_range, b_text, m_range, m_text, p_range, p_text = data
    section = SECTION_TMPL.format(
        b_range=b_range, b_text=b_text,
        m_range=m_range, m_text=m_text,
        p_range=p_range, p_text=p_text,
    )

    # Insert before the FAQ h2
    target = re.search(r'<h2[^>]*>H.ufige Fragen</h2>', html)
    if not target:
        # fallback: before cta2
        target = re.search(r'<div class="cta2">', html)
    if not target:
        return False, "no-target"

    new_html = html[:target.start()] + section + html[target.start():]
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    return True, key


def main():
    done = skipped = errors = 0
    for key, data in PRICE_DATA.items():
        pattern = os.path.join(ROOT, f"{key}-kaufen-schweiz.html")
        matches = glob.glob(pattern)
        if not matches:
            print(f"  · {key}: not found")
            errors += 1
            continue
        for path in matches:
            ok, info = process(path, key)
            fname = os.path.basename(path)
            if ok:
                done += 1
                print(f"  ✓ {fname}")
            elif info == "skip":
                skipped += 1
            else:
                errors += 1
                print(f"  · {fname}: {info}")
    print(f"\n✅ {done} bearbeitet · {skipped} skip · {errors} Fehler")


if __name__ == "__main__":
    main()
