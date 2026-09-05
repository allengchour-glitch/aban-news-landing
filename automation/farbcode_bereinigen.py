"""Entfernt Lieferanten-Artikelcodes aus dem kundensichtbaren Farb-/Varianten-Text.

DER BEFUND (20-Agenten-Audit, 11.08.2026): Lieferanten-NAMEN stehen nirgends im Katalog — die
Importer-Wachen greifen; 0 Treffer für «CJdropshipping», «BigBuy», «AliExpress». Durchgerutscht
sind aber die CODES, und zwar dort, wo sie besonders sinnlos wirken: in der Farbangabe.

    «Farben: CK228-1, CK228-2, CK228-3»          ← reine Codes, keinerlei Information
    «Farbe: RM47-Plaid»                          ← Code plus echte Angabe
    «Modell: AB002»                              ← reiner Code
    «Farbe: DR23 Orange Lip Glaze»               ← Code plus echte Angabe

Für eine Kundin ist «CK228-2» keine Farbe. Entweder bleibt nach dem Entfernen des Codes eine
echte Angabe übrig — dann wird die behalten — oder der ganze Abschnitt verschwindet.

⚠️ WAS NICHT ANGETASTET WIRD: Zeichenfolgen, die wie ein Code aussehen, aber eine Aussage sind.
«S925» ist die Silberlegierung, «IP68» die Schutzart, «4K»/«1080P» die Auflösung, «CR2032» die
Batteriegrösse, «433 MHz» die Funkfrequenz. Genau diese Verwechslung hat schon einmal
«Skulptur» (wegen «SKU») und «Reflexzonen» (wegen «Ref») zu Fehltreffern gemacht — eine
Schutzliste ist hier Pflicht, keine Kür.

DRY=1 zeigt jede Änderung als Vorher/Nachher.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_farbcode_bereinigt.txt"

ABSCHNITT = re.compile(
    r'(?P<label>Farben?|Stil|Variante[n]?|Modell)\s*:\s*(?P<wert>[^<.\n]{2,160})', re.I)
# Ein Artikelcode: Grossbuchstaben mit Ziffern, optional mit Bindestrich-Zusatz.
CODE = re.compile(r'\b[A-Z]{2,}[0-9]+[A-Z0-9]*(?:-[0-9A-Z]+)?\b')
# Aussagen, die nur wie ein Code aussehen. Ohne diese Liste würde Silberlegierung,
# Schutzart und Batteriegrösse aus den Texten verschwinden.
SCHUTZ = re.compile(r'^(S?9[02][05]|1[48]K|750|585|IP6[0-9]|IP5[0-9]|4K|8K|[0-9]+P|HD|UHD|'
                    r'CR[0-9]{4}|LR[0-9]{2,}|AG[0-9]+|SR[0-9]+|ER[0-9]{5}|[0-9]+MAH|[0-9]+MHZ|'
                    r'[0-9]+GHZ|[0-9]+ATM|USB[0-9]?|RGB|LED|[0-9]+W|[0-9]+V|[0-9]+ML|[0-9]+CM|'
                    r'[0-9]+MM|BT[0-9]|5G|4G|3D)$', re.I)


def gql(q, v=None):
    with open("/tmp/_fc.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_fc.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def saeubern(treffer):
    label, wert = treffer.group("label"), treffer.group("wert")
    teile = [t.strip() for t in wert.split(",")]
    behalten = []
    for t in teile:
        ohne = CODE.sub(lambda m: "" if not SCHUTZ.match(m.group(0)) else m.group(0), t)
        if ohne == t:
            behalten.append(t)          # nichts entfernt → Text unverändert übernehmen
            continue
        # ⚠️ NUR AN DEN RÄNDERN aufräumen. Der erste Entwurf ersetzte JEDEN Bindestrich durch
        # ein Leerzeichen, um Reste wie «-Plaid» zu glätten — und machte dabei aus «Retro-Glam»
        # ein «Retro Glam», aus «Hip-Hop» ein «Hip Hop» und aus «Kürbis-Orange» ein
        # «Kürbis Orange». Zwanzig einwandfreie Texte wären so verschlechtert worden, um ein
        # Dutzend zu verbessern. Innen bleibt alles, wie es ist.
        # Leere Klammern, die der entfernte Code hinterlässt: «Stahl (KR110050-GC)» → «Stahl ()».
        ohne = re.sub(r'\(\s*\)', '', ohne)
        ohne = re.sub(r'\s{2,}', ' ', ohne).strip(" -–—·,")
        if len(ohne) >= 3:
            behalten.append(ohne)
    behalten = list(dict.fromkeys(behalten))          # Reihenfolge behalten, Dubletten weg
    if not behalten:
        return ""                                      # nur Codes → Abschnitt fällt ganz weg
    return f"{label}: {', '.join(behalten)}"


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        d = p.get("descriptionHtml") or ""
        if not CODE.search(d):
            continue
        neu = ABSCHNITT.sub(lambda m: saeubern(m), d)
        if neu != d:
            aufgaben.append((p["id"], p["title"], d, neu))

    print(f"Produkte mit Code im Farb-/Varianten-Text: {len(aufgaben)}", flush=True)
    for gid, t, alt, neu in aufgaben[:14 if DRY else 4]:
        a = ABSCHNITT.search(alt)
        n = ABSCHNITT.search(neu)
        print(f"   {t[:38]:<40} «{a.group(0)[:44] if a else ''}»", flush=True)
        print(f"   {'':<40} → «{n.group(0)[:44] if n else '(entfernt)'}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, titel, alt, neu in aufgaben:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "descriptionHtml": neu}})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {titel[:36]}: {e[0]['message']}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tbereinigt\t{titel}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Beschreibungen bereinigt")


if __name__ == "__main__":
    main()
