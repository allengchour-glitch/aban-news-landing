"""Bringt die Versand- und Lieferzeit-Aussagen auf den Shop-Seiten mit der Wahrheit in Einklang.

DIE WAHRHEIT, aus den echten Versandprofilen ausgelesen (nicht aus einem anderen Text
abgeschrieben — genau das hat den Widerspruch ja erzeugt):

    Zone Schweiz   Standard              CHF  7.00
                   Kostenloser Versand   CHF  0.00  ab CHF 50.00
                   Standard              CHF  0.00  ab CHF 65.00   ← Altregel, siehe unten
    International                        CHF 15.00

WAS DIE SEITEN STATTDESSEN SAGEN:
    /pages/versand                «Standard-Versand: CHF 4.90 · GRATIS ab CHF 65»
    /pages/versand-lieferzeiten   «Unter CHF 50: CHF 4.90 · ab CHF 65: GRATIS»
    /pages/faq-haufig-…           «Was kostet der Versand? CHF 4.90. GRATIS ab CHF 65»

Beide Zahlen sind falsch: Der Standardversand kostet CHF 7.00, nicht 4.90, und die
Gratis-Schwelle liegt bei 50, nicht 65. Eine Seite, die einen zu NIEDRIGEN Versandpreis
nennt, ist schlimmer als eine mit zu hoher Schwelle — die Kundin sieht im Checkout mehr, als
ihr versprochen wurde, und das ist der Moment, in dem Warenkörbe stehen bleiben.

WOHER DIE 65 KOMMT — die Ursache liegt nicht im Text, sondern in den Einstellungen: In der
Schweizer Zone sind ZWEI Gratis-Regeln gleichzeitig aktiv, eine ab CHF 50 und eine ältere ab
CHF 65. Die 65er ist wirkungslos (bei 50 greift die günstigere längst), aber sie steht noch
da, und solange sie dasteht, schreibt jeder, der nachschaut, wieder 65 in einen Text. Das ist
dieselbe Sorte Fehler wie die zwei Reiniger mit gegenläufigem Ziel: Nicht der Text ist die
Quelle, sondern eine Einstellung, die nie aufgeräumt wurde.
⚠️ Diese Altregel wird hier NICHT gelöscht. Sie ändert für die Kundschaft nichts, und
Versandeinstellungen greifen direkt in den Checkout ein — das gehört gemeldet, nicht
nebenbei erledigt.

LIEFERZEITEN: Über die Seiten verteilt stehen 2–7, 3–5, 5–7, 5–10, 5–12, 7–12, 7–14 und
10–20 Tage. Keine dieser Zahlen ist für sich falsch — sie beschreiben verschiedene Fälle —,
aber nebeneinander ergeben sie kein Versprechen mehr. Der Katalog kennt genau zwei Fälle, und
die stehen auch im Hero: **1–2 Werktage aus dem Schweizer Lager**, sonst **10–20 Werktage ab
Werk**. Darauf werden die Seiten vereinheitlicht.

DRY=1 zeigt jede Änderung.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_seiten_versandtext.txt"

# Nur Seiten, auf denen Versand überhaupt Thema ist. Ein Blogartikel über Jade-Roller soll
# nicht angefasst werden, bloss weil dort einmal «5–7 Tage» steht.
# ⚠️ 24.08.2026: Der Anker war zu eng. `faq` traf exakt — die beiden VEROEFFENTLICHTEN
# Seiten heissen aber `faq-luxestyle` und `faq-en`. Der Lauf vom 12.08. reparierte drei
# FAQ-Seiten, die heute alle UNVEROEFFENTLICHT sind, und liess die zwei sichtbaren stehen:
# «CHF 4.90 für CH · 9.90 EUR für DE/AT … mit Code SHIP50» und «Flat CHF 4.90 within
# Switzerland» — live sind es CHF 7.00, und es gibt genau EINEN Markt (Switzerland, ['CH']),
# DE/AT koennen gar nicht auschecken. Der Kopfkommentar dieser Datei nennt CHF 4.90
# ausdruecklich als falsch; die Seiten, auf denen es stand, hat er nie erreicht.
# Jetzt praefixbasiert: jede Seite, deren Handle mit einem dieser Woerter BEGINNT.
VERSANDSEITEN = re.compile(r'^(versand|faq|rueckgabe|widerruf|agb|'
                           r'30-tage-garantie|garantie|tracking|lieferung|shipping|returns)'
                           r'(-[a-z0-9-]+)?$')

SCHWELLE = re.compile(r'(ab\s*CHF\s*)(65|49)(?![0-9.,])')
PREIS = re.compile(r'CHF\s*4\.90(?![0-9])')
LIEFERZEIT = re.compile(r'(?<![\d,])(?:5\s*[–-]\s*12|7\s*[–-]\s*12)\s*Werktage?n?')

# ⚠️ EIN ZEITRAUM IST NICHT AUTOMATISCH EINE LIEFERZEIT. Der erste Entwurf ersetzte jede
# Spanne zwischen 2 und 14 Tagen durch «10–20 Werktage» und hätte damit vier Aussagen
# zerstört, die völlig richtig waren:
#   • «Innerhalb 5-7 Werktage ist alles erledigt» — das ist die RETOUREN-Bearbeitung.
#   • «Wann bekomme ich Geld zurück? 5–10 Werktage» — die Rückerstattung.
#   • «Express (3-5 Werktage): CHF 14.90» — eine kostenpflichtige Zusatzoption.
#   • «Blitzversand ab CH-Lager: 1–2 Werktage · übrige Lagerartikel: 2-7» — Lagerware, die
#     tatsächlich schneller da ist.
# Falsch ist nur die Aussage, die STANDARDLIEFERUNG ab Werk dauere 5–12 oder 7–12 Tage.
# Deshalb muss ein Lieferwort davorstehen und darf kein Retouren- oder Expresswort in der
# Nähe sein.
LIEFERKONTEXT = re.compile(r'Lieferzeit|Lieferung\s+(?:dauert|erfolgt|beträgt)|'
                           r'Paket\s+(?:erreicht|kommt)|dauert\s+die\s+Lieferung', re.I)
KEIN_LIEFERKONTEXT = re.compile(r'Retoure|R[üu]ckversand|Geld\s+zur[üu]ck|Erstattung|'
                                r'Express|erledigt|Bearbeitung|Reklamation|Lagerartikel|'
                                r'CH-Lager|Blitzversand', re.I)


def gql(q, v=None):
    with open("/tmp/_sv.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_sv.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def umfeld(html, i, j, vor=150, nach=60):
    """Reiner Text um die Fundstelle — die Prüfung soll HTML-Tags nicht sehen."""
    return re.sub(r'<[^>]+>', ' ', html[max(0, i - vor):j + nach])


def berichtigen(html):
    aenderungen = []

    def merk(alt, neu):
        aenderungen.append((alt, neu))
        return neu

    def lieferzeit(m):
        u = umfeld(html, m.start(), m.end())
        if not LIEFERKONTEXT.search(u) or KEIN_LIEFERKONTEXT.search(u):
            return m.group(0)
        return merk(m.group(0), "10–20 Werktage")

    def versandpreis(m):
        # CHF 4.90 nur dort, wo es der VERSANDPREIS ist — nicht bei einem Produktpreis.
        u = umfeld(html, m.start(), m.end(), vor=90, nach=90)
        if not re.search(r'Versand|Porto|Lieferkosten|Standard', u, re.I):
            return m.group(0)
        return merk(m.group(0), "CHF 7.00")

    neu = SCHWELLE.sub(lambda m: merk(m.group(0), m.group(1) + "50"), html)
    neu = PREIS.sub(versandpreis, neu)
    neu = LIEFERZEIT.sub(lieferzeit, neu)
    return neu, aenderungen


def main():
    d = gql('{pages(first:80){nodes{id handle title body}}}')
    seiten = ((d.get("data") or {}).get("pages") or {}).get("nodes") or []
    aufgaben = []
    for p in seiten:
        if not VERSANDSEITEN.match(p["handle"]):
            continue
        html = p.get("body") or ""
        neu, aend = berichtigen(html)
        if aend:
            aufgaben.append((p["id"], p["handle"], html, neu, aend))

    print(f"Versandseiten mit falschen Angaben: {len(aufgaben)}", flush=True)
    for _, h, _, _, aend in aufgaben:
        print(f"\n── /pages/{h}", flush=True)
        for alt, neu in aend[:6]:
            print(f"     «{re.sub(r'<[^>]+>', ' ', alt).strip()[:48]}»  →  «{neu[:48]}»",
                  flush=True)
    if DRY or not aufgaben:
        return

    f = open(LEDGER, "a")
    n = 0
    for pid, h, _, neu, aend in aufgaben:
        r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p)'
                '{userErrors{message}}}', {"id": pid, "p": {"body": neu}})
        e = ((r.get("data") or {}).get("pageUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {h}: {e[0]['message'][:70]}", flush=True)
            continue
        n += 1
        f.write(f"{pid}\t{h}\t{len(aend)} Stellen\n")
        f.flush()
        time.sleep(0.3)
    print(f"\nFERTIG: {n} Seiten berichtigt")


if __name__ == "__main__":
    main()
