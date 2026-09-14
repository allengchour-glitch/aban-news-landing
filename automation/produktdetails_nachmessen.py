#!/usr/bin/env python3
"""Zaehlt die Klasse «Produktdetails doppelt» am OBJEKT nach und stellt die Falle — ueber den TEXT-HASH.

WARUM ES DIESE DATEI GIBT (08.09.2026): Die Nachmessung lag als Wegwerf-Skript im
Scratchpad und war nach dem naechsten Container-Neustart weg — «was nur in /tmp lebt,
existiert nicht» (Lehre 11.08.). Sie wird aber TAEGLICH gebraucht, solange der
Verursacher nicht benannt ist.

UMBAU 14.09.2026 — die Falle las die falsche Uhr. Die erste Fassung nahm `updatedAt` als
«Schreibminute» und hielt damit 593 Doppelbloecke fuer «in 3 s geschrieben». Gemessen waren
das die Minuten, in denen `kosten_boden15_korrigieren` Varianten-KOSTEN schrieb: Ein
Varianten-, Metafeld-, Publikations- oder Kollektions-Schreibvorgang hebt `updatedAt`
genauso wie ein Textschreibvorgang. **Ein `updatedAt` ist eine Beruehrung, kein Beleg fuer
einen Textschreiber.** Belastbar ist nur der TEXT selbst: Je Produkt wird der Hash von
`descriptionHtml` im Ledger `dropship/_pd_texthash.txt` festgehalten. Aendert sich der Hash
zwischen zwei Messungen UND traegt der Text jetzt den Doppelblock, dann hat in genau diesem
Fenster jemand den Text geschrieben — und das Fenster laesst sich gegen die Ledger-Commits
(`git log` ueber dropship/, der Auto-Committer stempelt sie im 90-s-Takt) und gegen die
/tmp-Logs halten. Wer in diesem Fenster eine Quittung fuer genau diese Produkt-ID geschrieben
hat, ist ein Kandidat; wer keine hat, ist es nicht.

Es MELDET NUR. Repariert wird mit `produktdetails_vereinen.py` (LISTE=), damit es
weiterhin genau EINE Regelquelle gibt.

⚠️ Reihenfolge im Aufseher: dieser Melder VOR `produktdetails_vereinen` — die Reparatur
schreibt sonst ihren eigenen Hash ins Fenster.
⚠️ Gezaehlt wird die UEBERSCHRIFT `<h4>Produktdetails</h4>`, nie das blosse Wort — der
CSS-Klassenname `ls-produktdetails` steht im selben Text und hat am 03.09. schon einmal
4'559 statt 1'743 gemeldet.
"""
import os, re, ssl, sys, json, time, hashlib, subprocess, urllib.request
from collections import Counter, defaultdict

LISTE = os.environ.get("LISTE", "dropship/_klassen/produktdetails-doppelt.txt")
LEDGER = os.environ.get("LEDGER", "dropship/_pd_texthash.txt")
BERICHT = os.environ.get("BERICHT", "dropship/PD-ZOMBIE-FALLE.md")
TOK = open("/tmp/cj_shop_token.txt").read().strip()
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
H4 = re.compile(r"<h4[^>]*>\s*Produktdetails\s*</h4>", re.I)
JETZT = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def gql(q, v=None, versuche=12):
    for _ in range(versuche):
        req = urllib.request.Request(
            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
            data=json.dumps({"query": q, "variables": v or {}}).encode(),
            headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
        d = json.loads(urllib.request.urlopen(req, context=CTX).read())
        if d.get("data") is not None:
            return d
        errs = d.get("errors") or []
        # ⚠️ Eine Drosselung ist kein Abbruchgrund (Lehre 21.08.) — sie sagt nur, wie
        # lange zu warten ist. Nur ein ECHTER Fehler beendet den Lauf.
        if any(e.get("extensions", {}).get("code") == "THROTTLED" for e in errs):
            ts = d.get("extensions", {}).get("cost", {}).get("throttleStatus", {})
            need = d["extensions"]["cost"].get("requestedQueryCost", 50) - ts.get("currentlyAvailable", 0)
            time.sleep(max(2, need / max(ts.get("restoreRate", 50), 1) + 1))
            continue
        raise SystemExit(f"⛔ Shopify: {errs}")
    raise SystemExit("⛔ dauerhaft gedrosselt — PAUSE, kein Befund")


def ledger_lesen():
    """Letzter Stand je Produkt: pid -> (hash, zeit, n_h4)."""
    st = {}
    if not os.path.exists(LEDGER):
        return st
    for z in open(LEDGER):
        t = z.rstrip("\n").split("\t")
        if len(t) >= 4:
            st[t[0]] = (t[1], t[2], t[3])
    return st


def quittungen_im_fenster(seit, bis, pids):
    """Welche Ledger haben zwischen `seit` und `bis` eine Zeile mit einer dieser IDs bekommen?
    Der Auto-Committer committet dropship/ im 90-s-Takt — die Commit-Zeit ist damit die
    Schreibzeit auf ±2 Minuten. Rueckgabe: {pid: {ledgerdatei: [commitzeit, ...]}}."""
    treffer = defaultdict(lambda: defaultdict(list))
    if not pids:
        return treffer
    try:
        r = subprocess.run(
            ["git", "log", f"--since={seit}", f"--until={bis}", "-p", "--format=COMMIT %cI",
             "--", "dropship"], capture_output=True, text=True, timeout=240)
    except Exception as e:
        print("  ⚠️ git log nicht lesbar:", e)
        return treffer
    c = f = None
    for zeile in r.stdout.splitlines():
        if zeile.startswith("COMMIT "):
            c = zeile[7:]
        elif zeile.startswith("+++ b/"):
            f = zeile[6:]
        elif zeile.startswith("+") and not zeile.startswith("++") and f and c:
            if f == LEDGER or f == LISTE:
                continue           # die eigene Falle und die Arbeitsliste sind keine Schreiber
            for pid in pids:
                if pid in zeile:
                    treffer[pid][f].append(c)
    return treffer


def logs_im_fenster(seit, bis, pid):
    """/tmp-Logs, die im Fenster geschrieben wurden UND die ID nennen."""
    try:
        r = subprocess.run(
            ["find", "/tmp", "-maxdepth", "1", "-name", "*.log", "-newermt", seit,
             "!", "-newermt", bis], capture_output=True, text=True, timeout=30)
        out = []
        for p in r.stdout.split():
            try:
                if pid in open(p, errors="ignore").read():
                    out.append(os.path.basename(p))
            except Exception:
                pass
        return out
    except Exception:
        return []


def main():
    ids = [l.split("\t")[0].strip() for l in open(LISTE) if l.strip()]
    ids = [re.sub(r".*/", "", x) for x in ids]
    alt = ledger_lesen()
    doppelt, einfach, ohne, fehlt = [], 0, 0, 0
    neu_im_ledger, geaendert, unveraendert = 0, [], 0
    zeilen = []
    for i in range(0, len(ids), 50):
        q = "{nodes(ids:[%s]){... on Product{id title status updatedAt descriptionHtml}}}" % ",".join(
            '"gid://shopify/Product/%s"' % x for x in ids[i:i + 50])
        for n in gql(q)["data"]["nodes"]:
            if not n:
                fehlt += 1
                continue
            pid = n["id"].split("/")[-1]
            html = n.get("descriptionHtml") or ""
            h = hashlib.sha1(html.encode()).hexdigest()[:16]
            c = len(H4.findall(html))
            vor = alt.get(pid)
            if vor is None:
                neu_im_ledger += 1
            elif vor[0] != h:
                geaendert.append((pid, vor[1], vor[2], c))
            else:
                unveraendert += 1
            zeilen.append(f"{pid}\t{h}\t{JETZT}\t{c}\n")
            if c >= 2:
                doppelt.append((pid, n["title"][:44], c, n["updatedAt"], n["status"], vor))
            elif c == 1:
                einfach += 1
            else:
                ohne += 1
        time.sleep(0.3)

    with open(LEDGER, "a") as fh:
        fh.writelines(zeilen)

    print(f"gemessen: {len(ids)} · doppelt: {len(doppelt)} · einfach: {einfach} · "
          f"ohne Block: {ohne} · nicht gefunden: {fehlt}")
    print(f"Text-Hash: {neu_im_ledger} neu im Ledger · {len(geaendert)} seit letzter Messung "
          f"geaendert · {unveraendert} unveraendert")

    if not doppelt:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
        print("FERTIG: Klasse am Objekt geschlossen, 0 geaendert")
        return

    # Die Falle: nur Produkte, deren TEXT sich seit der letzten Messung geaendert hat,
    # tragen ein belegtes Schreibfenster. Ein Doppelblock ohne vorherige Messung ist ein
    # Befund, aber kein Beweis.
    mit_fenster = [d for d in doppelt if d[5] is not None and d[5][0] and d[5][2] == "1"]
    print(f"\nDIE FALLE — {len(mit_fenster)} von {len(doppelt)} Doppelbloecken entstanden "
          f"nachweislich seit der letzten Messung (Text war einfach, Hash geaendert)")
    fenster = defaultdict(list)
    for d in mit_fenster:
        fenster[d[5][1]].append(d[0])
    schreiber = Counter()
    out = ["# Zombie-Falle «Produktdetails doppelt» — Text-Hash",
           f"\nStand {JETZT}. gemessen {len(ids)} · doppelt {len(doppelt)} · davon mit belegtem "
           f"Schreibfenster {len(mit_fenster)}.\n",
           "Ein Fenster = zwischen der letzten Messung (Text einfach) und jetzt (Text doppelt). "
           "Genannt werden die Ledger, die in diesem Fenster eine Quittung fuer GENAU diese ID "
           "bekommen haben, und die /tmp-Logs, die im Fenster geschrieben wurden und die ID nennen. "
           "Ein Ledger ohne Zeile ist kein Schreiber dieses Produkts.\n"]
    for seit, pids in sorted(fenster.items()):
        q = quittungen_im_fenster(seit, JETZT, set(pids))
        out.append(f"\n## Fenster {seit} → {JETZT} · {len(pids)} Produkte\n")
        for pid in pids[:40]:
            teile = []
            for f, zeiten in sorted(q.get(pid, {}).items()):
                schreiber[f] += 1
                teile.append(f"`{f}` ({', '.join(sorted(set(z[11:16] for z in zeiten)))})")
            logs = logs_im_fenster(seit, JETZT, pid)
            for l in logs:
                schreiber["log:" + l] += 1
            out.append(f"- `{pid}` — Ledger: {'; '.join(teile) or '—'} · Logs: {', '.join(logs) or '—'}")
        if len(pids) > 40:
            out.append(f"- … und {len(pids) - 40} weitere")
    out.append("\n## Schreiber-Zaehlung (Quittung fuer eine der betroffenen IDs im Fenster)\n")
    for f, n in schreiber.most_common():
        out.append(f"- {n}× `{f}`")
        print(f"  Kandidat: {n}× {f}")
    if not schreiber:
        out.append("- KEIN Repo-Ledger und KEIN /tmp-Log nennt diese IDs im Fenster → der Schreiber "
                   "quittiert nicht oder laeuft ausserhalb dieses Containers.")
        print("  ⚠️ kein Ledger, kein Log — Schreiber quittiert nicht oder ist extern")
    out.append("\n## Alle Doppelbloecke (Beruehrung = updatedAt, KEIN Textbeleg)\n")
    for d in doppelt[:60]:
        out.append(f"- `{d[0]}` {d[2]}× · beruehrt {d[3]} · {d[4]} · {d[1]}")
    open(BERICHT, "w").write("\n".join(out) + "\n")
    for d in doppelt[:15]:
        print("   DOPPELT", d[0], d[2], "×", d[3], d[1])
    # ⚠️ Ein MELDER meldet auch dann FERTIG, wenn er etwas GEFUNDEN hat: sein FERTIG haengt
    # an der Zahl der AENDERUNGEN (hier immer 0), nicht an der Zahl der Befunde. Ohne diese
    # Zeile startet der Aufseher ihn alle zwei Minuten neu — genau der Kurzschluss vom 21.08.
    print(f"FERTIG: {len(doppelt)} Befunde gemeldet, 0 geaendert")


if __name__ == "__main__":
    main()
