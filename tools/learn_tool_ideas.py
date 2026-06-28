#!/usr/bin/env python3
"""Wissenssammler — learn_tool_ideas.py  (Lern-Schleife für den Tool-/App-Loop).

Kopiert das Muster von automation/learn_from_youtube.mjs (Wissen → datierter Digest in
geteilte Memory), aber für die GRATIS-TOOLS/APPS statt Social: Es weiß, welche Tools schon
existieren, hält eine kuratierte Wissensbasis gefragter DE/CH-Themen, dedupliziert gegen den
Bestand (inkl. Synonyme) und schreibt einen PRIORISIERTEN Backlog nach
`automation/tool-ideas-learned.md` — die geteilte Liste, die der autonome Loop abarbeitet.

EHRLICH: keine erfundenen Zahlen. Nur Ideen + Such-Intent-Priorität + Bestands-Dedupe.
Reine Python-Stdlib, kein Netz, keine Secrets. Aufruf: python3 tools/learn_tool_ideas.py
"""
import os, re, glob, datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Kuratierte Wissensbasis: gefragte, voll-lokal baubare DE/CH-Tools, die es (Stand Anlage)
# noch nicht gibt. prio 1 = höchstes Such-/Wert-Potenzial. syn = Slug-Synonyme für Dedupe.
# Felder ohne erfundene Zahlen — die konkrete Rechenlogik kommt erst beim Bauen (mit Quellen).
IDEAS = [
    # slug, titel, kurz, prio, [synonyme]
    ("promille-rechner", "Promille-Rechner", "Blutalkohol nach Widmark schätzen (mit klarem Disclaimer)", 1, ["alkohol-rechner","blutalkohol-rechner"]),
    ("ssw-rechner", "Schwangerschaftswochen-Rechner", "SSW & voraussichtlicher Geburtstermin aus letzter Periode", 1, ["geburtstermin-rechner","schwangerschaftsrechner"]),
    ("eisprung-rechner", "Eisprung-/Fruchtbarkeits-Rechner", "Fruchtbare Tage & Eisprung aus Zyklusdaten", 1, ["fruchtbarkeits-rechner","zyklus-rechner"]),
    ("koerperfett-rechner", "Körperfett-Rechner", "Körperfettanteil per Umfang-Methode (US-Navy)", 2, ["kfa-rechner"]),
    ("wasserbedarf-rechner", "Wasserbedarf-Rechner", "Täglicher Trinkbedarf nach Gewicht & Aktivität (Faustregel)", 2, ["trinkmenge-rechner"]),
    ("trinkgeld-rechner", "Trinkgeld-Rechner", "Trinkgeld & Aufrunden, pro Person teilen", 3, ["tip-rechner"]),
    ("eigenmietwert-rechner", "Eigenmietwert-Rechner (CH)", "Grobschätzung Eigenmietwert + Steuer-Effekt (Richtwert)", 2, ["eigenmietwert"]),
    ("waehrung-cheatsheet", "Reise-Budget-Rechner", "Tagesbudget & Gesamtkosten einer Reise (ohne Live-Kurse)", 3, ["reisebudget-rechner"]),
    ("benzin-vs-elektro", "Benzin-vs-Elektro-Rechner", "Spritkosten vs. Stromkosten pro 100 km vergleichen", 2, ["auto-kostenvergleich"]),
    ("leasing-vs-kauf", "Leasing-vs-Kauf-Rechner", "Auto: Leasingrate vs. Kauf über die Jahre vergleichen", 2, ["leasingrechner"]),
    ("rentenluecke-rechner", "Rentenlücke-Rechner (CH)", "Grobe Vorsorgelücke 1./2./3. Säule abschätzen", 2, ["vorsorgeluecke-rechner"]),
    ("kalorien-verbrennen", "Kalorienverbrauch-Rechner", "Verbrauchte Kalorien je Sportart & Dauer (MET-Werte)", 3, ["sport-kalorien-rechner"]),
    ("schlafphasen-wecker", "Powernap-Timer", "Ideale Kurzschlaf-Dauer (10/20/90 Min) — Wecker-Zeit", 3, ["nickerchen-rechner"]),
    ("quadratmeter-preis", "Quadratmeterpreis-Rechner", "Preis pro m² aus Preis & Fläche (Miete/Kauf vergleichen)", 2, ["qm-preis-rechner"]),
    ("teilzeit-lohn-rechner", "Teilzeit-Lohn-Rechner", "Lohn & Pensum umrechnen (100 % ↔ Teilzeit)", 2, ["pensum-rechner"]),
    ("ferien-anspruch-rechner", "Ferien-Anspruch-Rechner", "Anteilige Ferientage pro rata (Eintritt/Austritt, Pensum)", 2, ["ferientage-rechner"]),
    ("zinssatz-vergleich", "Effektiver-Zins-Rechner", "Nominal- vs. Effektivzins eines Kredits", 3, ["effektivzins-rechner"]),
    ("kalorien-defizit", "Abnehm-Rechner (Kaloriendefizit)", "Defizit & Dauer bis Zielgewicht (mit Disclaimer)", 2, ["abnehm-rechner","kaloriendefizit-rechner"]),
]

def existing_slugs():
    out = set()
    for f in glob.glob(os.path.join(REPO, "*.html")):
        out.add(os.path.basename(f)[:-5].lower())
    return out

def main():
    exist = existing_slugs()
    open_ideas, done = [], []
    for slug, title, desc, prio, syn in IDEAS:
        cands = [slug] + list(syn)
        # Dedupe: Slug oder ein Synonym existiert bereits → erledigt/abgedeckt
        hit = next((c for c in cands if c in exist), None)
        if hit:
            done.append((slug, hit))
        else:
            open_ideas.append((prio, slug, title, desc))
    open_ideas.sort(key=lambda x: (x[0], x[1]))
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    out = ["# 🧠 Tool-Ideen-Learnings — Backlog für den autonomen Loop (auto-generiert)", "",
           "> Erzeugt von `tools/learn_tool_ideas.py`. Der Loop nimmt die **oberste offene Idee**,",
           "> baut sie sauber (eigene Recherche/Quellen, keine erfundenen Zahlen), und beim nächsten",
           "> Lauf fällt sie via Bestands-Dedupe raus. Nicht manuell abarbeiten nötig.", "",
           "Stand: %s · %d offen · %d bereits abgedeckt" % (ts, len(open_ideas), len(done)), "",
           "## ▶️ Offen (nach Priorität)"]
    if open_ideas:
        for prio, slug, title, desc in open_ideas:
            out.append("- **P%d** `%s.html` — **%s**: %s" % (prio, slug, title, desc))
    else:
        out.append("- (leer — Wissensbasis erweitern in tools/learn_tool_ideas.py)")
    out += ["", "## ✅ Bereits abgedeckt (Dedupe)"]
    out += ["- `%s` → vorhanden als `%s.html`" % (s, h) for s, h in done] or ["- (keine)"]
    open(os.path.join(REPO, "automation", "tool-ideas-learned.md"), "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("🧠 Tool-Ideen gelernt: %d offen / %d abgedeckt → automation/tool-ideas-learned.md" % (len(open_ideas), len(done)))
    if open_ideas:
        p, s, t, d = open_ideas[0]
        print("   Nächste (P%d): %s — %s" % (p, t, s))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
