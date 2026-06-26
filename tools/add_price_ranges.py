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
    # 8 neue Kaufberater-Seiten (2026-06-26)
    "fitness-tracker": ("Fitness-Tracker", "CHF 30–80", "Einfaches Aktivitäts-Band: Schrittzähler, Schlaf, Herzfrequenz — gut für Einsteiger.", "CHF 80–200", "GPS, SpO2, ausführliche Gesundheitsdaten — z. B. Garmin Vivofit, Fitbit Charge.", "ab CHF 200", "Vollwertige Smartwatch mit EKG, Sturzerkennung, langer Akkulaufzeit (Garmin/Apple Watch Ultra)."),
    "gaming-maus": ("Gaming-Maus", "CHF 30–60", "Kabelgebundene Maus mit gutem Sensor — ideal für Einsteiger und Gelegenheits-Gamer.", "CHF 60–120", "Hochpräziser optischer Sensor, anpassbare Gewichte, RGB — für regelmässige Gamer.", "ab CHF 120", "Drahtlose Premium-Mäuse (Logitech G Pro X, Razer) mit Top-Sensor und minimalem Input-Lag."),
    "solaranlage": ("Solaranlage / PV-Anlage", "CHF 800–2000", "Balkonkraftwerk 300–600 W (Plug-in) — einfach, keine Monteur­kosten, schnell amortisiert.", "CHF 4000–10000", "Kleinanlage 5–10 kWp mit Wechselrichter, inkl. CH-Förderung EVS/Einmalvergütung.", "ab CHF 15000", "Grosse Aufdach-Anlage 15–30 kWp + Batteriespeicher — maximale Eigenstrom­nutzung."),
    "powerstation": ("Powerstation / Portable Powerstation", "CHF 150–400", "200–500 Wh Kapazität — reicht für Camping, Handy, Laptop, kleine Geräte.", "CHF 400–1000", "500–1500 Wh, 1000 W AC-Ausgang — für Kühlboxen, CPAP, E-Bike-Laden.", "ab CHF 1000", "1500–3000 Wh, 2000 W+, LFP-Akkus (lange Lebensdauer) — fürs Homeoffice oder als Notstrom."),
    "balkonkraftwerk": ("Balkonkraftwerk / Steckersolar", "CHF 300–500", "1 Modul ~300–400 Wp, Balkon-Halterung, Plug-and-Play bis 600 W CH-Limit.", "CHF 500–900", "2 Module 600–800 Wp, hochwertiger Mikrowechselrichter (Hoymiles/Deye), App-Monitoring.", "ab CHF 900", "2–4 Module mit Batteriespeicher-Option, optimaler Wirkungsgrad, professionelle Montage."),
    "induktionskochfeld": ("Induktionskochfeld", "CHF 50–150", "1–2 Kochzonen, Tischgerät — ideal für die kleine Küche oder als Ergänzung.", "CHF 150–500", "4 Kochzonen Einbau, 7200 W, Boost-Funktion, Touch-Steuerung — gute Allround-Wahl.", "ab CHF 500", "Flex-Induktion, Bridge-Funktion, TFT-Display, Autarkie-Zonen — Siemens, Miele, Gaggenau."),
    "gasgrill": ("Gasgrill", "CHF 150–350", "2 Brenner, Gusseisen- oder Edelstahlrost, kompakt — für Balkon und kleinen Garten.", "CHF 350–800", "3–4 Brenner, Seitenkocher, Deckel-Thermometer, gute Grillleistung — Weber Spirit etc.", "ab CHF 800", "6+ Brenner, Infrarot-Heckbrenner, Sear-Station, Premium-Edelstahl — Weber Genesis/Summit, Napoleon."),
    "rollator": ("Rollator", "CHF 80–150", "Leichter Faltrollator, 4 Räder, Sitzmöglichkeit — bewährt für gelegentliche Nutzung.", "CHF 150–300", "Aluminium, leichter, ergonomische Griffe, gute Räder für drinnen+draussen.", "ab CHF 300", "Premium-Rollator (Carbon/Titan), sehr leicht, indoor/outdoor, KVG-anerkannt — ggf. Kassenpflicht."),
    # weitere populäre Kategorien
    "airfryer": ("Airfryer / Heissluftfritteuse", "CHF 40–100", "2–3 L Kapazität, Einzel-Korb — ideal für 1–2 Personen.", "CHF 100–200", "4–6 L, voreingestellte Programme, schnelle Aufheizzeit — gute Allround-Wahl.", "ab CHF 200", "Dual-Zone, 8+ L, Rotisserie, Smart-Anbindung — für Familien und Vielköche."),
    "akkuschrauber": ("Akkuschrauber / Akkubohrschrauber", "CHF 40–100", "10,8–12 V, Starter-Set mit 1–2 Akkus — für einfache Heimwerk­projekte.", "CHF 100–250", "18 V, gutes Drehmoment, Bürstenloser Motor — für regelmässiges Arbeiten.", "ab CHF 250", "18 V Profi (Bosch Professional, Makita, Festool) — für intensive Nutzung, langer Akku."),
    "beamer": ("Beamer / Projektor", "CHF 100–300", "HD-Beamer, 2500–3000 ANSI-Lumen — gut für verdunkeltes Heimkino.", "CHF 300–800", "Full-HD, 3000–5000 Lumen, kurze Aufheizzeit, gute Farb­darstellung.", "ab CHF 800", "4K-Beamer oder Kurzdistanz-Projektor mit hoher Helligkeit — für helle Räume und Business."),
    "bluetooth-lautsprecher": ("Bluetooth-Lautsprecher", "CHF 30–80", "Kompakt, IPX5, 10–20 h Akku — für unterwegs und Alltag.", "CHF 80–200", "360°-Sound, höherer Wirkungsgrad, wasserdicht IPX7 — z. B. JBL Charge, UE Boom.", "ab CHF 200", "Premium-Klang (Bose SoundLink Max, Sonos), Stereo-Pairing, Outdoor-tauglich."),
    "buerostuhl": ("Bürostuhl", "CHF 80–200", "Verstellbarer Drehstuhl für gelegentliche Nutzung — ausreichend für Homeoffice-Einsteiger.", "CHF 200–600", "Lendenstütze, Armlehnen 4D, Mesh-Rücken, ergonomisch zertifiziert.", "ab CHF 600", "Ergonomie-Stuhl (Herman Miller Aeron, Humanscale) — für tägliches 8h+ Arbeiten."),
    "computer": ("Desktop-Computer / PC", "CHF 400–700", "Intel Core i5 / Ryzen 5, 8–16 GB RAM, SSD 512 GB — gut für Büro und Web.", "CHF 700–1400", "Schnellerer Prozessor, dedizierte GPU, 32 GB RAM — für Multimedia, leichtes Gaming.", "ab CHF 1400", "Workstation oder Gaming-PC mit RTX 4080/4090 — für 3D, Videobearbeitung, High-End-Gaming."),
    "drucker": ("Drucker", "CHF 50–120", "Tintenstrahldrucker für Gelegenheits-Nutzer — günstig in der Anschaffung.", "CHF 120–350", "Multifunktions-Tintenstrahler oder Laser für häufiges Drucken — besseres Preis-Seite-Verhältnis.", "ab CHF 350", "Farblaser-Profi oder Fotodrucker (Canon, Epson) — für hohes Druckaufkommen oder Fotos."),
    "e-reader": ("E-Reader / E-Book-Reader", "CHF 80–120", "6 Zoll, Wi-Fi, gute Beleuchtung — reicht für alle E-Books und PDFs.", "CHF 120–200", "Wasserdicht, Warm-Beleuchtung, 8–32 GB — z. B. Kindle Paperwhite.", "ab CHF 200", "Kindle Oasis / Kobo Elipsa — grösseres Display, Stylus-Unterstützung, Premium-Haptik."),
    "ebike": ("E-Bike / Elektrovelo", "CHF 1500–2500", "Einsteiger-E-Bike, einfacher Motor, Reichweite 40–60 km — für gelegentliche Ausfahrten.", "CHF 2500–4500", "Mittelmotor (Bosch/Shimano), 80–120 km Reichweite, gute Komponenten.", "ab CHF 4500", "Premium-E-Bike (Trek, Haibike, Riese & Müller), langer Akku, hochwertige Schaltung."),
    "kopfhoerer": ("Kopfhörer", "CHF 30–80", "In-Ear oder Over-Ear ohne ANC — gut für Alltag und Sport.", "CHF 80–250", "ANC, Bluetooth 5.0, 20–30 h Akku — z. B. Sony WH-1000XM4, Bose QC45.", "ab CHF 250", "Premium-ANC (Sony, Bose, Apple AirPods Max) oder audiophile Studiokopfhörer."),
    "monitor": ("Monitor / PC-Bildschirm", "CHF 120–250", "24–27 Zoll FHD IPS, 75 Hz — solide Basis für Büro und Alltag.", "CHF 250–600", "27–32 Zoll QHD, 144 Hz, IPS/VA — für Gamer und kreative Arbeit.", "ab CHF 600", "4K OLED, 240 Hz, Ultra-Wide — für professionelle Grafik oder High-End-Gaming."),
    "spielkonsole": ("Spielkonsole", "CHF 350–450", "PlayStation 5 / Xbox Series S — aktuelle Generation, grosse Spieleauswahl.", "CHF 450–600", "PS5 Digital + Zubehör, Xbox Series X, Nintendo Switch OLED.", "ab CHF 600", "Konsole + Extra-Controller + Headset + Spiele — vollständiges Gaming-Paket."),
    "geschirrspueler": ("Geschirrspüler", "CHF 400–700", "60 cm Standgerät, 12–14 Gedecke, Energieeffizienz A — solide Basisausstattung.", "CHF 700–1200", "14+ Gedecke, 45 dB Lärm, Zeolithe-Trocknung, Kurz­programm.", "ab CHF 1200", "Vollintegriert, 42 dB, Premium-Marken (Miele, Siemens), Dampf-Funktion."),
    "rasenmaeher": ("Rasenmäher / Mähroboter", "CHF 200–500", "Bis 300 m², einfache Begrenzungs­draht-Navigation — gut für kleine Gärten.", "CHF 500–1200", "Bis 1000 m², Kameranavigation oder GPS, App-Steuerung.", "ab CHF 1200", "Grosse Flächen bis 3000+ m², KI-Navigation ohne Begrenzungsdraht, Gardena/Husqvarna."),
    "kinderwagen": ("Kinderwagen", "CHF 200–500", "Leichter Buggy oder einfaches Kombi-System — gut für den Alltag.", "CHF 500–1000", "Kombi-Kinderwagen mit Babywanne, geländetauglich, gute Federung.", "ab CHF 1000", "Premium (Stokke, Bugaboo, Cybex) — Design, Langlebigkeit, Schweizer Qualitäts­anspruch."),
    "wasserkocher": ("Wasserkocher", "CHF 20–50", "1,5–1,7 L, einfaches Design, 2200 W — kocht schnell und zuverlässig.", "CHF 50–120", "Temperaturwahl (60–100 °C), Keep-Warm-Funktion — ideal für Tee-Liebhaber.", "ab CHF 120", "Premium-Designwasserkocher (KitchenAid, Smeg, Fellow Stagg) — Optik + Präzisions­temperatur."),
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
