#!/usr/bin/env python3
"""Generates 8 new high-value Kaufberater pages for CH market."""
import os, json, html as htmllib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://abannews.com"
DATE = "2026-06-26"

PAGES = [
  {
    "slug": "fitness-tracker-kaufen-schweiz",
    "icon": "⌚",
    "h1": "Fitness-Tracker kaufen in der Schweiz",
    "title": "Fitness-Tracker kaufen Schweiz — Activity-Bands vergleichen | aban",
    "desc": "Fitness-Tracker kaufen in der Schweiz: Activity-Bands nach Herzfrequenz, Schlafanalyse, Akkulaufzeit und Wasserresistenz vergleichen.",
    "intro": "Schrittzähler, Herzfrequenz, Schlafanalyse: Ein guter Fitness-Tracker begleitet dich rund um die Uhr und gibt dir echte Daten über dein Wohlbefinden.",
    "q": "Fitness-Tracker",
    "ctaLabel": "Fitness-Tracker ansehen",
    "tips": [
      ("Display & Bedienung", "Ein lesbares Display und intuitive Bedienung entscheiden, ob du den Tracker täglich trägst — oder in der Schublade lässt."),
      ("Sensoren", "Herzfrequenz und SpO2 sind Standard; wer mehr will, achtet auf GPS, Hauttemperatur und Stressmonitoring."),
      ("Akkulaufzeit", "Je nach Nutzung: ohne GPS reichen 5–14 Tage, mit GPS oft nur 1–3 Tage. Wähle nach deinem Alltag."),
    ],
    "table": [
      ("ck0", "Display & Bedienung", "Lesbares Display, intuitive Bedienung — entscheidend für die tägliche Nutzung."),
      ("ck1", "Sensoren", "Herzfrequenz und SpO2 als Minimum; GPS, Stressmonitoring und Schlafanalyse als Plus."),
      ("ck2", "Akkulaufzeit", "Ohne GPS: 5–14 Tage; mit GPS: 1–3 Tage — je nach Nutzung wählen."),
    ],
    "faq": [
      ("Was ist der Unterschied zwischen Fitness-Tracker und Smartwatch?", "Fitness-Tracker fokussieren auf Gesundheitsdaten und haben eine längere Akkulaufzeit. Smartwatches bieten zusätzlich Apps, Benachrichtigungen und oft ein grösseres Display — dafür kürzere Laufzeit."),
      ("Welcher Fitness-Tracker ist wasserdicht?", "Die meisten aktuellen Modelle sind mind. 5 ATM (50 m) wasserdicht und taugen zum Schwimmen. Prüfe die Angabe vor dem Kauf — Duschen ist meist kein Problem, Tauchen nicht immer."),
      ("Wo vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle vergleichen — achte auf Sensor-Ausstattung und Kompatibilität mit iOS/Android."),
    ],
    "related": [
      ("/smartwatch-kaufen-schweiz.html", "Smartwatch"),
      ("/sport-kaufen-schweiz.html", "Sport"),
      ("/yoga-fitness-kaufen-schweiz.html", "Yoga &amp; Fitness"),
    ],
  },
  {
    "slug": "gaming-maus-kaufen-schweiz",
    "icon": "🖱️",
    "h1": "Gaming-Maus kaufen in der Schweiz",
    "title": "Gaming-Maus kaufen Schweiz — Präzision & DPI vergleichen | aban",
    "desc": "Gaming-Maus kaufen in der Schweiz: Optische und Laser-Mäuse nach DPI, Polling-Rate, Ergonomie und kabellos vs. kabelgebunden vergleichen.",
    "intro": "Präzision entscheidet: Eine gute Gaming-Maus verbessert deine Aim-Kontrolle spürbar. Hier die wichtigsten Kriterien im Überblick.",
    "q": "Gaming Maus",
    "ctaLabel": "Gaming-Mäuse ansehen",
    "tips": [
      ("DPI & Sensor", "Ein hochpräziser optischer Sensor (z. B. PMW-3395) mit einstellbarem DPI ist die Grundlage für genaues Zielen."),
      ("Kabellos vs. kabelgebunden", "Kabellose Top-Modelle haben praktisch keine Latenz mehr — dafür Akkumanagement und Mehrgewicht."),
      ("Ergonomie", "Griffstil (Palm, Claw, Fingertip) und Handgrösse bestimmen, welche Form langzeittauglich ist."),
    ],
    "table": [
      ("ck0", "DPI & Sensor", "Hochpräziser optischer Sensor, einstellbarer DPI-Bereich — Grundlage für genaues Zielen."),
      ("ck1", "Kabellos vs. kabelgebunden", "Kabellos = Bewegungsfreiheit; kabelgebunden = kein Akku, minimal leichter. Latenz ist bei beiden top."),
      ("ck2", "Ergonomie", "Griffstil (Palm/Claw/Fingertip) und Handgrösse bestimmen, welche Form passt."),
    ],
    "faq": [
      ("Wie viel DPI braucht man für Gaming?", "Für FPS-Spiele reichen oft 400–1600 DPI bei niedriger Maussensitivität im Spiel. Höhere DPI ist vor allem bei kleinen Mauspads sinnvoll. Wichtiger als die Zahl ist ein präziser Sensor."),
      ("Kabellos oder kabelgebunden?", "Moderne kabellose Gaming-Mäuse wie Logitech G Pro X Superlight haben praktisch keine messbare Latenz mehr. Kabelgebunden ist etwas günstiger und braucht kein Aufladen."),
      ("Wo Gaming-Mäuse vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen — achte auf Sensor, Gewicht und Ergonomie."),
    ],
    "related": [
      ("/gamingstuhl-kaufen-schweiz.html", "Gamingstuhl"),
      ("/monitor-kaufen-schweiz.html", "Monitor"),
      ("/laptop-kaufen-schweiz.html", "Laptop"),
    ],
  },
  {
    "slug": "solaranlage-kaufen-schweiz",
    "icon": "☀️",
    "h1": "Solaranlage kaufen in der Schweiz",
    "title": "Solaranlage kaufen Schweiz — PV-Anlage & Balkonkraftwerk | aban",
    "desc": "Solaranlage kaufen in der Schweiz: Photovoltaik-Anlagen, Balkonkraftwerke und Zubehör nach Leistung, Förderung und Eignung vergleichen.",
    "intro": "Sonne nutzen, Strom sparen: Von der kleinen Balkon-PV bis zur Dachanlage — hier findest du Solarprodukte für Eigenheime und Mietwohnungen.",
    "q": "Solaranlage",
    "ctaLabel": "Solarprodukte ansehen",
    "tips": [
      ("Leistung & Fläche", "Haupt-Kriterium: verfügbare Fläche und Ausrichtung (Südseite ideal). Für Balkone reichen 600–800 Watt-Anlagen."),
      ("Förderung Schweiz", "Bund und Kantone fördern PV mit Einmalvergütungen (EVS). Swissolar und METAS informieren über aktuelle Beiträge."),
      ("Balkonkraftwerk vs. Dachanlage", "Balkonkraftwerke (steckfertig, ≤600 W) brauchen keine Baubewilligung — ideal für Mieter. Dachanlagen erfordern Anmeldung und Elektriker."),
    ],
    "table": [
      ("ck0", "Leistung & Fläche", "Südausrichtung und genügend Fläche sind entscheidend — für Balkone reichen 600–800 W."),
      ("ck1", "Förderung Schweiz", "Bund und Kantone zahlen Einmalvergütungen (EVS) — vor dem Kauf Swissolar.ch prüfen."),
      ("ck2", "Balkonkraftwerk vs. Dachanlage", "Balkonkraftwerk: steckfertig, ≤600 W, keine Bewilligung; Dachanlage: grösser, anmeldepflichtig."),
    ],
    "faq": [
      ("Brauche ich eine Bewilligung für eine Solaranlage in der Schweiz?", "Dachanlagen auf Einfamilienhäusern sind in den meisten Kantonen anzeigepflichtig, aber bewilligungsfrei. Balkonkraftwerke bis 600 W gelten als Steckersolargeräte — einfach beim Netzbetreiber anmelden."),
      ("Wie viel Förderung gibt es in der Schweiz?", "Die Einmalvergütung (EVS/KEV) des Bundes beträgt je nach Anlage und Zeitpunkt mehrere Tausend Franken. Kantone wie Zürich, Bern oder Genf bieten zusätzliche Beiträge. Immer auf swissolar.ch prüfen."),
      ("Wo Solarprodukte vergleichen?", "In der Angebote-Suche findest du PV-Module, Wechselrichter und Balkonkraftwerke — Preise und Ausstattung vergleichen lohnt sich."),
    ],
    "related": [
      ("/balkonkraftwerk-kaufen-schweiz.html", "Balkonkraftwerk"),
      ("/powerstation-kaufen-schweiz.html", "Powerstation"),
      ("/werkzeug-kaufen-schweiz.html", "Werkzeug"),
    ],
  },
  {
    "slug": "powerstation-kaufen-schweiz",
    "icon": "🔋",
    "h1": "Powerstation kaufen in der Schweiz",
    "title": "Powerstation kaufen Schweiz — mobile Stromspeicher vergleichen | aban",
    "desc": "Powerstation kaufen in der Schweiz: Mobile Stromspeicher und Solargeneratoren nach Kapazität, Ausgangsleistung und Ladezeit vergleichen.",
    "intro": "Camping, Balkon-Solar oder Notstrom: Powerstations speichern Solarstrom oder Netzstrom und geben ihn sauber per USB, 230V und DC ab.",
    "q": "Powerstation",
    "ctaLabel": "Powerstations ansehen",
    "tips": [
      ("Kapazität (Wh)", "Je mehr Wh, desto länger die Versorgung. Für Camping mit Kühlbox rechne mind. 500 Wh — für Notstrom 1500 Wh+."),
      ("Ausgangsleistung (W)", "Bestimmt, welche Geräte gleichzeitig laufen dürfen. Sensitive Geräte wie CPAP oder Kühlbox brauchen oft 300–600 W."),
      ("Ladezeit & Solar-Eingang", "Schnellladen (AC) spart Zeit; MPPT-Solar-Eingang erhöht Effizienz beim Nachladen mit Solarmodulen."),
    ],
    "table": [
      ("ck0", "Kapazität (Wh)", "Mehr Wh = längere Versorgung. Camping: ab 500 Wh; Notstrom: ab 1500 Wh."),
      ("ck1", "Ausgangsleistung (W)", "Bestimmt welche Geräte laufen — Kühlbox, CPAP, Kaffeemaschine brauchen 300–600 W+."),
      ("ck2", "Ladezeit & Solar-Eingang", "AC-Schnellladen + MPPT-Solareingang = maximale Flexibilität beim Aufladen."),
    ],
    "faq": [
      ("Was ist eine Powerstation und wozu braucht man sie?", "Eine Powerstation ist ein tragbarer Akku-Speicher mit mehreren Ausgängen (USB, 230V, DC). Ideal für Camping, als Notstrom-Reserve oder zum Speichern von Solarstrom vom Balkonkraftwerk."),
      ("Welche Kapazität brauche ich?", "Für Handy + Laptop: 200–500 Wh. Für Kühlbox + Kleingeräte: 500–1000 Wh. Für Haushaltsgeräte als Notstrom: 1500 Wh+. Hersteller-Tools auf der Website helfen bei der Berechnung."),
      ("Wo Powerstations vergleichen?", "In der Angebote-Suche nach Preis und Kapazität vergleichen — achte auf Kapazität, Ausgangsleistung und Solar-Kompatibilität."),
    ],
    "related": [
      ("/solaranlage-kaufen-schweiz.html", "Solaranlage"),
      ("/balkonkraftwerk-kaufen-schweiz.html", "Balkonkraftwerk"),
      ("/outdoor-camping-kaufen-schweiz.html", "Outdoor &amp; Camping"),
    ],
  },
  {
    "slug": "balkonkraftwerk-kaufen-schweiz",
    "icon": "⚡",
    "h1": "Balkonkraftwerk kaufen in der Schweiz",
    "title": "Balkonkraftwerk kaufen Schweiz — Steckersolar vergleichen | aban",
    "desc": "Balkonkraftwerk kaufen in der Schweiz: Steckersolar-Anlagen bis 800 W nach Leistung, Wirkungsgrad und Montage für Balkon und Terrasse vergleichen.",
    "intro": "Strom selbst produzieren ohne Hauseigentümer: Ein Balkonkraftwerk steckst du einfach in die Steckdose — für Mieter ideal und in der Schweiz legal.",
    "q": "Balkonkraftwerk",
    "ctaLabel": "Balkonkraftwerke ansehen",
    "tips": [
      ("Leistung", "600–800 W sind in der Schweiz für Steckersolar üblich. Mit 600 W sparst du je nach Sonneneinfall 400–700 kWh/Jahr."),
      ("Montage", "Für Balkongeländer, Flachdach oder Wandmontage gibt es verschiedene Halterungen — prüfe Ausrichtung und Verschattung."),
      ("Anmeldung", "In der Schweiz meldest du das Balkonkraftwerk beim lokalen Netzbetreiber an. Das ist kostenlos und einfach."),
    ],
    "table": [
      ("ck0", "Leistung", "600–800 W = bis 700 kWh/Jahr Ersparnis, abhängig von Standort und Ausrichtung."),
      ("ck1", "Montage", "Balkon, Flachdach oder Wand — passende Halterung mitbestellen; Südausrichtung ist ideal."),
      ("ck2", "Anmeldung Schweiz", "Kostenlose Anmeldung beim lokalen Netzbetreiber — kein Elektriker zwingend nötig."),
    ],
    "faq": [
      ("Ist ein Balkonkraftwerk in der Schweiz legal?", "Ja. Balkonkraftwerke bis 600 W (ab 2024 in manchen Kantonen bis 800 W) sind in der Schweiz als Steckersolargeräte erlaubt. Die Anmeldung beim Netzbetreiber ist vorgeschrieben, aber einfach und kostenlos."),
      ("Wie viel spare ich mit einem Balkonkraftwerk?", "Bei 600 W und gutem Standort: 400–700 kWh/Jahr, was je nach Strompreis 100–200 CHF spart. Die Amortisation liegt meist bei 3–6 Jahren."),
      ("Brauche ich einen speziellen Zähler?", "Ältere Ferraris-Zähler können rückwärts laufen (nicht erlaubt) — prüfe beim Netzbetreiber. Moderne Zweirichtungszähler sind ideal."),
    ],
    "related": [
      ("/solaranlage-kaufen-schweiz.html", "Solaranlage"),
      ("/powerstation-kaufen-schweiz.html", "Powerstation"),
      ("/werkzeug-kaufen-schweiz.html", "Werkzeug"),
    ],
  },
  {
    "slug": "induktionskochfeld-kaufen-schweiz",
    "icon": "🍳",
    "h1": "Induktionskochfeld kaufen in der Schweiz",
    "title": "Induktionskochfeld kaufen Schweiz — Einbau & Tischgeräte | aban",
    "desc": "Induktionskochfeld kaufen in der Schweiz: Einbau-Induktionsherde und Tisch-Induktionskochplatten nach Kochzonen, Leistung und Schutzklasse vergleichen.",
    "intro": "Schnell, sicher und energieeffizient: Induktion erhitzt nur den Topf, nicht die Oberfläche. Hier findest du Einbau- und Tischgeräte für jeden Bedarf.",
    "q": "Induktionskochfeld",
    "ctaLabel": "Induktionskochfelder ansehen",
    "tips": [
      ("Einbau vs. Tisch", "Einbaufelder integrieren sich nahtlos in die Küche; Tisch-Induktionskochplatten sind flexibel und günstig — ideal für kleine Küchen oder als Erweiterung."),
      ("Kochzonen & Leistung", "2- und 4-Zonen-Felder sind Standard. Achte auf Gesamtleistung (7,2 kW+ für 4 Zonen) und Schnellheizfunktion (Booster)."),
      ("Topfkompatibilität", "Induktion braucht ferromagnetisches Kochgeschirr. Teste mit einem Magneten: Haftet er? Dann geht's."),
    ],
    "table": [
      ("ck0", "Einbau vs. Tisch", "Einbaufeld: fest in der Küche; Tischgerät: flexibel, günstiger und ohne Einbau."),
      ("ck1", "Kochzonen & Leistung", "4 Zonen Standard; Booster-Funktion und ≥7 kW Gesamtleistung sind empfehlenswert."),
      ("ck2", "Topfkompatibilität", "Ferromagnetisches Kochgeschirr nötig — Magnet-Test: haftet = geeignet."),
    ],
    "faq": [
      ("Welche Töpfe brauche ich für Induktion?", "Töpfe und Pfannen aus Gusseisen, Emaille oder magnetischem Edelstahl funktionieren auf Induktion. Reines Aluminium, Glas oder Kupfer ohne Eisenkern geht nicht. Magnethaftung = geeignet."),
      ("Ist Induktion schneller als Gas?", "Ja — Induktion erhitzt viel schneller als Gas oder Ceran, weil die Energie direkt in den Topf geht (kaum Verluste). Wasser kocht oft doppelt so schnell."),
      ("Wo Induktionskochfelder vergleichen?", "In der Angebote-Suche nach Preis filtern — auf Kochzonenzahl, Leistung und Schutzklasse (IPX4 für Spritzwasser) achten."),
    ],
    "related": [
      ("/kuechenmaschine-kaufen-schweiz.html", "Küchenmaschine"),
      ("/pfannen-kaufen-schweiz.html", "Pfannen"),
      ("/kueche-kaufen-schweiz.html", "Küche &amp; Haushalt"),
    ],
  },
  {
    "slug": "gasgrill-kaufen-schweiz",
    "icon": "🔥",
    "h1": "Gasgrill kaufen in der Schweiz",
    "title": "Gasgrill kaufen Schweiz — Grills vergleichen & kaufen | aban",
    "desc": "Gasgrill kaufen in der Schweiz: Gas-Grills nach Heizleistung, Anzahl Brenner, Deckel und Grillfläche für Balkon und Garten vergleichen.",
    "intro": "Sofort heiss, einfach zu reinigen und präzise regulierbar: Gasgrills sind die beliebteste Wahl für Schweizer Balkone und Gärten.",
    "q": "Gasgrill",
    "ctaLabel": "Gasgrills ansehen",
    "tips": [
      ("Brenner & Leistung", "Mehr Brenner = mehr Flexibilität (direkte und indirekte Hitze). Für 4–6 Personen empfehlen sich mind. 2–3 Brenner und 10 kW+."),
      ("Grillfläche", "Für Familien: mind. 50×40 cm Hauptgrillfläche. Zusätzliche Warmhalterost sind praktisch."),
      ("Deckel & Temperaturkontrolle", "Ein Deckel ermöglicht indirektes Grillen (wie Backofen) — für grössere Stücke und Pizza unverzichtbar."),
    ],
    "table": [
      ("ck0", "Brenner & Leistung", "2–3 Brenner, ≥10 kW Gesamtleistung — ideal für direkte und indirekte Hitze gleichzeitig."),
      ("ck1", "Grillfläche", "Für 4–6 Personen: mind. 50×40 cm Hauptfläche + Warmhalterost."),
      ("ck2", "Deckel & Temperaturkontrolle", "Deckel ermöglicht indirektes Grillen (150–250 °C) — für Braten, Pizza, Geflügel."),
    ],
    "faq": [
      ("Gasgrill oder Holzkohle?", "Gasgrill heizt schnell, ist einfach zu reinigen und regulierbar — ideal für den Alltag. Holzkohle gibt mehr Raucharoma, braucht aber 30–45 Minuten Vorlaufzeit."),
      ("Welches Gas brauche ich in der Schweiz?", "Propan (rotes Ventil) ist bei Schweizer Tanken erhältlich und eignet sich auch bei Kälte. Butan ist günstiger, wird aber unter 5 °C flüssig. Adaptor/Regler auf Schweizer Gasflasche achten."),
      ("Wo Gasgrills vergleichen?", "In der Angebote-Suche nach Preis filtern — auf Brenneranzahl, Grillfläche und Deckel achten."),
    ],
    "related": [
      ("/garten-kaufen-schweiz.html", "Garten &amp; Pflanzen"),
      ("/gartenliege-kaufen-schweiz.html", "Gartenliege"),
      ("/outdoor-camping-kaufen-schweiz.html", "Outdoor &amp; Camping"),
    ],
  },
  {
    "slug": "rollator-kaufen-schweiz",
    "icon": "🦽",
    "h1": "Rollator kaufen in der Schweiz",
    "title": "Rollator kaufen Schweiz — Gehhilfen vergleichen | aban",
    "desc": "Rollator kaufen in der Schweiz: Gehhilfen mit 2, 3 oder 4 Rädern nach Gewicht, Sitzfläche, Bremsen und Faltbarkeit vergleichen.",
    "intro": "Mehr Sicherheit beim Gehen — ein guter Rollator gibt Stabilität, Sitzpausen und entlastet Rücken und Gelenke bei jedem Schritt.",
    "q": "Rollator",
    "ctaLabel": "Rollatoren ansehen",
    "tips": [
      ("Rad-Grösse & Bodenbelag", "Kleine Räder (15 cm) für glatte Böden; grössere (20 cm+) für Kopfsteinpflaster und Unebenheiten draussen."),
      ("Gewicht & Faltbarkeit", "Leichte Aluminium-Rollatoren (6–8 kg) lassen sich gut falten und in den Kofferraum heben."),
      ("Sitzfläche & Bremsen", "Eine stabile Sitzmöglichkeit und zuverlässige Feststellbremsen sind Pflicht — prüfe vor dem Kauf die Bremskraft."),
    ],
    "table": [
      ("ck0", "Rad-Grösse & Bodenbelag", "Kleine Räder für innen; grosse Räder (≥20 cm) für Aussenbereich und Pflaster."),
      ("ck1", "Gewicht & Faltbarkeit", "Aluminium: 6–8 kg, leicht faltbar — ideal für Transport im Auto."),
      ("ck2", "Sitzfläche & Bremsen", "Stabile Sitzfläche und Feststellbremsen sind Pflicht — Probefahrt vor dem Kauf."),
    ],
    "faq": [
      ("Übernimmt die Krankenkasse Kosten für einen Rollator?", "In der Schweiz übernimmt die Grundversicherung (KVG) einen Teil der Kosten, wenn der Rollator ärztlich verordnet ist (Mittel- und Gegenständeliste, MiGeL). Prüfe mit der Arztpraxis und Krankenkasse vor dem Kauf."),
      ("Welcher Rollator für drinnen und draussen?", "Drinnen: schmaler 3-Rad-Rollator mit kleinen Rädern. Draussen: 4-Rad-Rollator mit grösseren Rädern und robustem Rahmen. Kombi-Modelle decken beides ab."),
      ("Wo Rollatoren vergleichen?", "In der Angebote-Suche nach Preis filtern und Modelle gegenüberstellen — achte auf Gewicht, Rad-Grösse und Feststellbremsen."),
    ],
    "related": [
      ("/wellness-massage-kaufen-schweiz.html", "Wellness &amp; Massage"),
      ("/bad-wellness-kaufen-schweiz.html", "Bad &amp; Wellness"),
      ("/sport-kaufen-schweiz.html", "Sport"),
    ],
  },
]

CSS_BASE = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#e6e1d6;--bg:#fffbf5;--card:#fff}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
a{color:var(--amber-dk)}
.wrap{max-width:760px;margin:0 auto;padding:0 18px}
.hero{background:linear-gradient(135deg,#1f2937,#3a2a12 55%,#b45309);color:#fff;position:relative;overflow:hidden}
.hero::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 20%,rgba(251,191,36,.25),transparent 45%),radial-gradient(circle at 8% 90%,rgba(217,119,6,.22),transparent 42%);pointer-events:none}
.hero .in{max-width:780px;margin:0 auto;padding:38px 18px 34px;position:relative;z-index:1}
.hero .ic{font-size:2rem;width:62px;height:62px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:18px;margin-bottom:8px}
.hero h1{font-size:clamp(1.6rem,4.5vw,2.1rem);margin:4px 0 8px;line-height:1.18}
.hero p{color:#f4e7d3;font-size:1.04rem;max-width:620px}
.hero .trust{margin-top:14px;display:flex;gap:8px 16px;flex-wrap:wrap;font-size:.82rem;color:#f4e7d3}
.hero .trust span{display:inline-flex;align-items:center;gap:5px}
.bigcta{display:inline-block;margin-top:16px;background:#fff;color:var(--amber-dk);border-radius:24px;padding:12px 24px;font-weight:800;font-size:1rem;box-shadow:0 10px 24px rgba(0,0,0,.18)}
.bigcta:hover{background:var(--cream)}
main{padding:26px 0 56px}
.tips{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:8px 0 26px}
.tip{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:12px;padding:14px 16px;transition:box-shadow .15s,transform .15s}
.tip:hover{box-shadow:0 8px 24px rgba(31,41,55,.09);transform:translateY(-1px)}
.tip h3{font-size:1.02rem;margin-bottom:3px}.tip p{font-size:.94rem;color:var(--ink2)}
h2{font-size:1.3rem;margin:24px 0 12px}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:10px;transition:border-color .15s}
details[open]{border-color:#dcc89c}
summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:10px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:var(--amber-dk);font-weight:800;font-size:1.1rem}
details[open] summary::after{content:"–"}
details p{margin-top:8px;color:var(--ink2);font-size:.95rem}
.cta2{text-align:center;background:var(--cream);border:1px solid #f3dca0;border-radius:14px;padding:22px;margin-top:26px}
.cta2 a{display:inline-block;background:var(--amber-dk);color:#fff;border-radius:24px;padding:12px 26px;font-weight:800;margin-top:8px}
.cta2 a:hover{background:#a04708}
.rel{margin-top:24px;font-size:.9rem;color:var(--muted)}
footer{border-top:1px solid var(--line);padding:20px 0;font-size:.8rem;color:var(--muted);text-align:center}
:focus-visible{outline:3px solid #b45309;outline-offset:2px;border-radius:4px}"""

CSS_TABLE = """.ctable{width:100%;border-collapse:collapse;margin:4px 0 20px;font-size:.91rem}.ctable th{background:#fff7ed;padding:9px 12px;border:1px solid #fed7aa;font-weight:700;text-align:left}.ctable td{padding:8px 12px;border:1px solid #e6e1d6;vertical-align:top}.ctable tr:nth-child(even) td{background:#fffbf5}.ctable .ck0{color:#059669;font-weight:700}.ctable .ck1{color:#d97706;font-weight:700}.ctable .ck2{color:#7c3aed;font-weight:700}"""

def h(t): return htmllib.escape(t)

def build_page(p):
    slug = p["slug"]
    canonical = f"{SITE}/{slug}.html"
    q = p["q"]
    q_enc = q.replace(" ", "+")

    faq_ld = [{"@type": "Question", "name": fq, "acceptedAnswer": {"@type": "Answer", "text": fa}} for fq, fa in p["faq"]]
    faq_json = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq_ld}, ensure_ascii=False)

    article_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": p["h1"],
        "datePublished": DATE,
        "dateModified": DATE,
        "author": {"@id": f"{SITE}/#person"},
        "publisher": {"@id": f"{SITE}/#org"},
        "mainEntityOfPage": canonical,
        "inLanguage": "de-CH",
        "speakable": {"@type": "SpeakableSpecification", "cssSelector": ["h1", ".answer-first"]}
    }
    article_json = json.dumps(article_ld, ensure_ascii=False)

    tips_html = "\n".join(
        f'    <div class="tip"><h3>{h(t)}</h3><p>{h(d)}</p></div>'
        for t, d in p["tips"]
    )

    table_rows = "\n".join(
        f'<tr><td class="{cls}">{h(label)}</td><td>{h(desc)}</td></tr>'
        for cls, label, desc in p["table"]
    )

    faq_html = "\n".join(
        f'    <details><summary>{h(q)}</summary><p>{h(a)}</p></details>'
        for q, a in p["faq"]
    )

    first_tip_text = p["tips"][0][1]

    related_links = " · ".join(
        f'<a href="{href}">{label}</a>'
        for href, label in p.get("related", [])
    )

    ebay_q = q.replace("&", "&amp;")

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{h(p["title"])}</title>
<meta name="description" content="{h(p["desc"])}">
<meta name="theme-color" content="#d97706">
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{h(p["h1"])}">
<meta property="og:description" content="{h(p["desc"])}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://abannews.com/og-image.png">
<script type="application/ld+json">{faq_json}</script>
<style>
{CSS_BASE}
</style>
<style data-aban-compare-css>{CSS_TABLE}</style>
<script type="application/ld+json" data-aban-article>{article_json}</script>
</head>
<body>
<nav class="abn-bc" style="max-width:760px;margin:0 auto;padding:9px 18px;font-size:.8rem;color:#6b7280" aria-label="Brotkrumen"><a href="/" style="color:#b45309">Start</a> › <a href="/marktplatz.html" style="color:#b45309">Marktplatz</a> › <span>{h(p["h1"])}</span></nav>
<header class="hero"><div class="in">
  <div class="ic">{p["icon"]}</div>
  <h1>{h(p["h1"])}</h1>
  <p>{h(p["intro"])}</p>
  <a class="bigcta" href="/angebote-suche.html?q={q_enc}">{h(p["ctaLabel"])} →</a>
  <div class="trust"><span>🇨🇭 Schweiz &amp; DACH</span><span>✓ kostenlos suchen</span><span>✓ direkt zum Anbieter</span></div>
</div></header>
<main><div class="wrap">
  <p class="answer-first" style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #d97706;border-radius:12px;padding:13px 16px;margin:0 0 18px;font-size:1.02rem"><strong>Auf einen Blick:</strong> {h(first_tip_text)}</p>
  <div class="tips">
{tips_html}
  </div>
<div class="compare-section" style="margin:18px 0 4px">
  <h2 style="margin-bottom:8px">Kaufkriterien im Überblick</h2>
  <table class="ctable" data-aban-compare><thead><tr><th>Kriterium</th><th>Was zählt beim Kauf</th></tr></thead><tbody>{table_rows}
</tbody></table>
</div>


  <h2 style="margin-top:26px">Häufige Fragen</h2>
{faq_html}
  <div class="cta2">
    <strong>Bereit zum Suchen?</strong><br>
    <a href="/angebote-suche.html?q={q_enc}">{h(p["ctaLabel"])} →</a>
  </div>

  <p class="rel" style="margin-top:6px;font-size:.82rem" data-aban-ebay-link><a href="/go/ebay?q={ebay_q}" rel="nofollow sponsored" style="color:var(--muted)">Preise auf eBay.ch prüfen →</a> <small style="color:#9ca3af">(Partner-Link)</small></p>
<div data-ad-slot="landing-mid" style="margin-top:18px"></div>
  <p class="rel">Mehr im <a href="/marktplatz.html">aban-Marktplatz</a>: Jobs, Fahrzeuge, Immobilien, Angebote &amp; Inserate für die Schweiz &amp; DACH. Oder gleich alles auf einmal in der <a href="/suche.html">Universal-Suche</a>.</p>
  {f'<p class="rel">Weitere Kaufberater: {related_links}</p>' if related_links else ''}
  <section style="margin-top:26px;background:var(--cream);border:1px solid #f3dca0;border-radius:14px;padding:18px;text-align:center">
    <strong style="font-size:1.05rem">📬 Gratis: Schnäppchen- &amp; Job-Updates</strong>
    <p style="font-size:.88rem;color:var(--ink2);margin:4px 0 10px">Das Beste aus dem Marktplatz + 1 KI-Tipp, Mo–Fr in 5 Minuten. Kein Spam, jederzeit abbestellbar.</p>
    <form action="https://abannews.beehiiv.com/subscribe" method="get" style="display:flex;gap:8px;max-width:380px;margin:0 auto;flex-wrap:wrap">
      <input type="email" name="email" required placeholder="deine@mail.ch" aria-label="E-Mail" style="flex:1;min-width:160px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-family:inherit">
      <button class="bigcta" type="submit" style="border:0;cursor:pointer">Abonnieren</button>
    </form>
  </section>
</div></main>
<footer><div class="wrap">aban news · Marktplatz Schweiz · Angaben ohne Gewähr · © 2026 ·
  <a href="/marktplatz.html">Marktplatz</a> · <a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
<script src="/js/affiliate-config.js" defer></script>
<script src="/js/partner-box.js" defer></script>
<script src="/js/ads-config.js" defer></script>
<script src="/js/ad-slot.js" defer></script>
</body>
</html>
"""


def main():
    for p in PAGES:
        path = os.path.join(ROOT, f"{p['slug']}.html")
        content = build_page(p)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  ✓ {p['slug']}.html")
    print(f"\n✅ {len(PAGES)} neue Kaufberater-Seiten erstellt")


if __name__ == "__main__":
    main()
