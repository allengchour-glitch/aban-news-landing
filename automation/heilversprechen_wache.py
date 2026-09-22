#!/usr/bin/env python3
"""heilversprechen_wache.py — findet und entschaerft Heil-/Gesundheitszusagen in Produkttexten.

WARUM (22.09.2026): «Tunmate Rizinusoel» (5 Sitzungen/Woche, eine der meistbesuchten Seiten)
versprach «Foerderung eines gesunden Haarwachstums» — die 13 Haarwachstums-Zusagen waren am
04.09. (Aufgabe 34) entschaerft worden, aber das Skript lag nur in /tmp, und dieses Produkt kam
am 07.09. aus dem Draft ZURUECK (Tag rueckhol-0907) und lief an der Korrektur vorbei. Stichprobe
ueber 2'569 Produkte der Beauty-/Kissen-/Fitness-Tags: 17 echte Zusagen (Schmerzen lindern,
Haarausfall, Heilungsprozess, Schnarchen verhindern, Gewichtsverlust). Ein Fix ohne Waechter
ist ein Fix fuer eine Woche (Lehre 21.09.: die alte Fassung seit Wochen).

RECHT: Kosmetika duerfen keine Heilwirkung versprechen (VKos/HMG-Abgrenzung), Gegenstaende
keine medizinische Zweckbestimmung (MepV) — sonst sind sie Heilmittel/Medizinprodukte ohne
Zulassung. Zudem UWG: unbelegte Wirkaussagen.

VERFAHREN: Alle AKTIVEN Produkte, beim ersten Lauf vollstaendig (250 je Seite), danach nur
`updated_at:>` seit dem letzten Lauf (Zustand `dropship/_heilversprechen_seit.txt`).
  · Ersatztabelle ERSATZ: exakte Phrasen -> unbedenkliche Fassung. Wird angewendet (FIX=1 ist
    Standard, FIX=0 nur melden). Jede Phrase ist von Hand gelesen; nichts wird geraten.
  · MUSTER: was nicht in der Tabelle steht, wird in dropship/HEILVERSPRECHEN.md gemeldet.
  · Fehlalarm-Wachen: «Bezug abnehmen», «lässt sich abnehmen», «Aromatherapie», «Lichttherapie».
Schreiben nur unter /tmp/lock_produkttext.lock (der Aufseher setzt ihn per TXTLOCK), Ruecklesen
nach jedem Schreiben, Ledger dropship/_heilversprechen.txt (id\tsha\tdatum\taktion).
ENV: FIX=0|1 (Standard 1) · VOLL=1 (alles statt seit letztem Lauf) · CAP=Seiten (Standard 400)
"""
import hashlib, json, os, re, subprocess, sys, time, datetime

TOK = open('/tmp/cj_shop_token.txt').read().strip()
URL = 'https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json'
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, 'dropship/HEILVERSPRECHEN.md')
LEDGER = os.path.join(REPO, 'dropship/_heilversprechen.txt')
SEIT_DATEI = os.path.join(REPO, 'dropship/_heilversprechen_seit.txt')
FIX = os.environ.get('FIX', '1') == '1'
VOLL = os.environ.get('VOLL') == '1'
CAP = int(os.environ.get('CAP', '400'))

# Exakte Phrasen (Text wie er im HTML steht) -> Ersatz. Reihenfolge: laengere zuerst.
ERSATZ = [
    ("Das Kissen unterstützt den Heilungsprozess und trägt zu einem allgemeinen Wohlbefinden bei.", "Das Kissen trägt zu einem angenehmen Liegegefühl bei."),
    ("um Nacken- und Schulterschmerzen zu lindern und die Entspannung zu fördern", "um Nacken und Schultern bequem zu stützen und die Entspannung zu fördern"),
    ("um Nacken-, Taillen- und Beinschmerzen zu lindern", "um Nacken, Taille und Beine bequem zu stützen"),
    ("Lindert Schmerzen in Nacken, Taille und Beinen", "Stützt Nacken, Taille und Beine"),
    ("lindert Schmerzen im Rücken- und Körperbereich", "wärmt Rücken und Körper angenehm"),
    ("um Schmerzen zu lindern und die Durchblutung in den Armen zu fördern", "um die Arme mit Wärme und Massage zu entspannen"),
    ("Lindert Schmerzen und fördert die Durchblutung", "Wärme und Massage für entspannte Arme"),
    ("um Schmerzen zu lindern und Muskeln zu entspannen", "um Muskeln nach dem Sport zu entspannen"),
    ("Lindert Schmerzen und Beschwerden", "Angenehm kühlendes Gefühl auf der Haut"),
    ("Es bietet milden Schutz vor Muskelkater und Unbehagen.", "Es zieht schnell ein und hinterlässt ein frisches Gefühl."),
    ("und kann Muskelschmerzen lindern", "und lockert beanspruchte Muskeln"),
    ("Verhindert Schnarchen und Schulterschmerzen", "Stützt Kopf und Schultern in der Seitenlage"),
    ("und kann so potenziell Schnarchen reduzieren", "und sorgt für eine ruhige Kopfposition"),
    ("kann die Maske auch unterstützend gegen Schnarchen wirken", "sitzt die Maske auch nachts bequem"),
    ("und gleichzeitig Haarausfall entgegenzuwirken", "und das Haar geschmeidig zu halten"),
    ("und hilft, Haarausfall entgegenzuwirken", "und macht das Haar geschmeidig"),
    ("die Durchblutung zu fördern, was wiederum das Haarwachstum unterstützen kann", "die Kopfhaut sanft zu massieren"),
    ("Es kann auch zur Stärkung der Haarwurzeln und zur Förderung eines gesunden Haarwachstums beitragen.", "Viele nutzen es als Pflegeöl für Haarspitzen und Kopfhaut."),
    ("hilft es, Spucken zu reduzieren und die Verdauung zu fördern", "liegt das Baby leicht erhöht"),
    ("das für seine entzündungshemmenden Eigenschaften bekannt ist", "das die Haut beruhigt"),
    ("die für ihre entzündungshemmenden Eigenschaften bekannt sind", "die die Haut beruhigen"),
    ("<li>Entzündungshemmend</li>", "<li>Beruhigt die Haut</li>"),
    ("Fördert Gewichtsverlust und Körperformung", "Für Fitness und Körperformung"),
    ("Ideal für Gewichtsverlust und Körperformung", "Ideal für Ausdauer und Körperformung"),
    ("und das Abnehmen zu unterstützen", "und das Training zu unterstützen"),
    ("und ist eine effektive Unterstützung beim Abnehmen", "und bringt Abwechslung ins Training"),
    ("Für Fitness und Abnehmen geeignet", "Für Fitness und Krafttraining geeignet"),
    ("Hilft, Schmerzen während der Schwangerschaft zu lindern", "Entlastet Rücken und Hüfte in der Seitenlage"),
]
ERSATZ.sort(key=lambda p: -len(p[0]))

MUSTER = re.compile(
    r"Schmerz\w* (?:zu )?lindern|lindert \w*[Ss]chmerz|schmerzlindernd|Heilungsprozess|\bheilt\b|\bHeilung\b"
    r"|Haarausfall|Haarwachstum|Schnarchen|entzündungshemmend|Gewichtsverlust|Fettverbrennung|Fett verbrenn"
    r"|Cellulite (?:reduz|bekämpf|entfern)|(?:beim|das) Abnehmen|Blutdruck|Migräne|Arthr(?:ose|itis)|Rheuma"
    r"|Diabetes|Immunsystem|Entgift|\bDetox\b|Krankheit|Beschwerden (?:zu )?lindern|lindert Beschwerden"
    r"|Verdauung (?:zu )?fördern|Durchblutung (?:zu )?fördern|fördert die Durchblutung|Schmerztherapie"
    r"|medizinisch(?:e|er|es)? (?:Wirkung|Behandlung|Zweck)|gegen \w*schmerzen", re.I)
FEHLALARM = re.compile(r"Bezug abnehmen|l[äa]sst sich \w* ?abnehmen|anbringen und \w* ?abnehmen|Anbringen und Abnehmen", re.I)


def gql(q, v=None):
    a = ["curl", "-s", "--max-time", "90", "-X", "POST", URL, "-H", "X-Shopify-Access-Token: " + TOK,
         "-H", "Content-Type: application/json", "-d", json.dumps({"query": q, "variables": v or {}})]
    for versuch in range(5):
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
        except Exception:
            time.sleep(3 * (versuch + 1)); continue
        if d.get("errors") and any("THROTTLED" in str(e) for e in d["errors"]):
            time.sleep(6); continue
        return d
    raise RuntimeError("Shopify antwortet nicht (5 Versuche)")


def sha(t):
    return hashlib.sha1((t or "").encode()).hexdigest()[:12]


def main():
    heute = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    seit = ""
    if not VOLL and os.path.exists(SEIT_DATEI):
        seit = open(SEIT_DATEI).read().strip()
    ledger = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 2: ledger[t[0]] = t[1]
    q = "status:active" + (f" updated_at:>{seit}" if seit else "")
    cur = None; seiten = 0; geprueft = 0; fixe = 0; meld = []; fehler = 0
    while seiten < CAP:
        d = gql('query($q:String!,$c:String){products(first:250,query:$q,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title descriptionHtml}}}', {"q": q, "c": cur})
        if "data" not in d:
            raise RuntimeError(f"Antwort ohne data: {str(d)[:300]}")
        pg = d["data"]["products"]; seiten += 1
        for p in pg["nodes"]:
            html = p["descriptionHtml"] or ""
            geprueft += 1
            if ledger.get(p["id"]) == sha(html):
                continue
            neu = html
            for a, b in ERSATZ:
                if a in neu: neu = neu.replace(a, b)
            aktion = "sauber"
            if neu != html and FIX:
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}', {"i": {"id": p["id"], "descriptionHtml": neu}})
                pu = (r.get("data") or {}).get("productUpdate") or {}
                if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                    fehler += 1; print("⛔ nicht geschrieben", p["handle"], pu.get("userErrors")); continue
                html = neu; fixe += 1; aktion = "entschaerft"
                print("✔", p["handle"])
            txt = re.sub(r"<[^>]+>", " ", html)
            rest = []
            for m in MUSTER.finditer(txt):
                umfeld = txt[max(0, m.start() - 60):m.end() + 60]
                if FEHLALARM.search(umfeld): continue
                if re.search(r"(?i)(aroma|licht|photon|farb|rotlicht|ems|wärme|kälte|puls)-?therap", m.group(0)): continue
                rest.append(re.sub(r"\s+", " ", umfeld).strip())
            tm = MUSTER.search(p["title"] or "")
            if tm and not FEHLALARM.search(p["title"]): rest.append("TITEL: " + p["title"])
            if rest:
                meld.append((p["handle"], p["title"], rest[:3])); aktion += "+offen"
            with open(LEDGER, "a") as f:
                f.write(f'{p["id"]}\t{sha(html)}\t{heute[:10]}\t{aktion}\n')
        if not pg["pageInfo"]["hasNextPage"]: break
        cur = pg["pageInfo"]["endCursor"]
    if geprueft == 0 and not seit:
        raise RuntimeError("0 Produkte geprueft ohne Zeitfilter — Abfrage/Berechtigung kaputt, KEIN Urteil")
    with open(BERICHT, "w") as f:
        f.write(f"# Heilversprechen in Produkttexten — Stand {heute}\n\n")
        f.write(f"Geprüft: {geprueft} (Filter: `{q}`) · entschärft: {fixe} · offen: {len(meld)} · Schreibfehler: {fehler}\n\n")
        f.write("Offen = Muster getroffen, aber keine geprüfte Ersatzphrase. Satz lesen, Ersatz in `ERSATZ` eintragen, nächster Lauf schreibt.\n\n")
        for h, t, r in meld:
            f.write(f"- **{t}** (`{h}`)\n")
            for s in r: f.write(f"  - …{s}…\n")
    if seiten < CAP:
        open(SEIT_DATEI, "w").write(heute)
    print(f"FERTIG: {geprueft} geprüft ({seiten} Seiten, seit={seit or 'ALLE'}), {fixe} entschärft, {len(meld)} offen, {fehler} Fehler")
    if fehler: sys.exit(1)


if __name__ == "__main__":
    main()
