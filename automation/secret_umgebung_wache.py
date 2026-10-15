#!/usr/bin/env python3
"""secret_umgebung_wache.py — welche LAUFENDEN Prozesse tragen einen von Shopify abgelehnten SHOPIFY_CLIENT_SECRET? (15.10.2026)

GEMESSEN 15.10. 04:30 UTC: Die Umgebung der Sitzung trägt einen verdorbenen Wert (60 statt 38 Zeichen). engine_keepalive.sh
heilte ihn seit 14.10. nur für das, was es selbst startet. autostart.sh (SessionStart-Hook, bei JEDEM Container-Neustart)
startete cj_perpetual weiter mit dem abgelehnten Wert → sein Kind cj_category_fill scheiterte 6'832× an «shTok: kein Token».
Seit 15.10. ruft jeder Startweg automation/lib/shopify_secret.sh. Dieser Wächter fängt, was VORHER schon lief oder auf
einem dritten Weg startet.

REGEL
- «Abgelehnt» = md5-Präfix (12) mit Urteil DATEI in /tmp/_shop_secret_pruef (geschrieben von shopify_secret.sh nach einem
  Grant-Vergleich: Umgebungswert HTTP 400/401/403, Dateiwert 200). Ohne Urteil gibt es nichts zu melden.
- Gezählt werden nur VERBRAUCHER (node/python). /proc/<pid>/environ zeigt die Umgebung beim Start: Eine bash-Hülle, die danach
  /tmp/secrets_env.sh einliest (cj_queue_runner.sh, reel_engine_runner.sh), steht dort mit dem alten Wert, ihre Kinder tragen
  aber den gültigen (gemessen: Hülle 151 abgelehnt, Kind 285 gültig). Wer Hüllen zählt, schiesst gesunde Motoren ab.
- Jeder Verbraucher wird seinem nächsten bekannten Motor-Vorfahren zugeordnet (Tabelle MOTOREN). Nur diese Motoren beendet
  --heilen, und nur, weil ein Starter sie mit dem gültigen Wert neu startet: cj_perpetual → autostart.sh (Marke
  /tmp/_secret_neustart_autostart, engine_keepalive.sh ruft danach autostart.sh), cj_queue_runner → Keepalive Abschnitt 3.
- Die Sitzung selbst (claude) und von Hand gestartete Befehle kann kein Skript heilen → nur gemeldet (Betreiber-Klick:
  Umgebungsvariable korrigieren; bis dahin vor Handläufen `. automation/lib/shopify_secret.sh && shopify_secret_heilen`).
- Werte werden NIE ausgegeben oder gespeichert, nur md5-Präfixe verglichen.

AUFRUF
  python3 automation/secret_umgebung_wache.py              # melden (Standard, ändert nichts)
  python3 automation/secret_umgebung_wache.py --heilen     # bekannte Motoren mit abgelehntem Wert beenden (Starter startet neu)
  python3 automation/secret_umgebung_wache.py --selbsttest
Ausgabe: erste Zeile «SECRET-UMGEBUNG: …» für die Ampel. Ledger: dropship/_secret_umgebung.tsv (nur Beendigungen).
"""
import hashlib
import os
import signal
import sys
import time

PRUEF = "/tmp/_shop_secret_pruef"
MARKE_AUTOSTART = "/tmp/_secret_neustart_autostart"
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "_secret_umgebung.tsv")
VAR = b"SHOPIFY_CLIENT_SECRET="

# Motor-Wurzeln: (Erkennung im argv, Name, Starter). Nur diese beendet --heilen.
MOTOREN = [
    ("cj_perpetual.mjs", "cj_perpetual", "autostart"),
    ("cj_queue_runner.sh", "cj_queue_runner", "keepalive"),
]
VERBRAUCHER = ("node", "python", "python3")


def abgelehnte(pfad=PRUEF):
    """md5-Präfixe mit Urteil DATEI (letztes Urteil je Präfix gilt)."""
    urteil = {}
    try:
        with open(pfad, encoding="utf-8", errors="replace") as f:
            for z in f:
                t = z.split()
                if len(t) >= 2:
                    urteil[t[0]] = t[1]
    except FileNotFoundError:
        pass
    return {m for m, u in urteil.items() if u == "DATEI"}


def lese_proc(proc="/proc"):
    """{pid: {ppid, argv, md5|None, alter}} — md5 nur als 12er-Präfix, Wert verlässt die Funktion nie."""
    try:
        hz = os.sysconf("SC_CLK_TCK")
        with open(os.path.join(proc, "uptime")) as f:
            uptime = float(f.read().split()[0])
    except (OSError, ValueError):
        hz, uptime = 100, 0.0
    out = {}
    for name in os.listdir(proc):
        if not name.isdigit():
            continue
        p = os.path.join(proc, name)
        try:
            with open(os.path.join(p, "stat"), "rb") as f:
                stat = f.read().decode("utf-8", "replace")
            rest = stat.rsplit(")", 1)[1].split()
            ppid, start = int(rest[1]), int(rest[19])
            with open(os.path.join(p, "cmdline"), "rb") as f:
                argv = [a.decode("utf-8", "replace") for a in f.read().split(b"\0") if a]
            with open(os.path.join(p, "environ"), "rb") as f:
                env = f.read()
        except (OSError, IndexError, ValueError):
            continue
        md5 = None
        for eintrag in env.split(b"\0"):
            if eintrag.startswith(VAR):
                md5 = hashlib.md5(eintrag[len(VAR):]).hexdigest()[:12]
                break
        out[int(name)] = {"ppid": ppid, "argv": argv, "md5": md5, "alter": max(0, int(uptime - start / hz)) if uptime else 0}
    return out


def ist_verbraucher(argv):
    return bool(argv) and os.path.basename(argv[0]) in VERBRAUCHER


def motor_von(argv):
    s = " ".join(argv[:3])
    for muster, name, starter in MOTOREN:
        if muster in s:
            return name, starter
    return None


def ist_sitzung(argv):
    return bool(argv) and ("claude-code" in argv[0] or os.path.basename(argv[0]) == "claude")


def einordnen(procs, abgel):
    """Verbraucher mit abgelehntem Wert → (motoren{wurzel_pid: (name, starter, [pids])}, sitzung[], fremd[])."""
    motoren, sitzung, fremd = {}, [], []
    for pid, p in sorted(procs.items()):
        if p["md5"] not in abgel:
            continue
        if ist_sitzung(p["argv"]):
            sitzung.append(pid)
            continue
        if not ist_verbraucher(p["argv"]):
            continue
        q, gesehen, treffer, unter_sitzung = pid, set(), None, False
        while q in procs and q not in gesehen and q > 1:
            gesehen.add(q)
            m = motor_von(procs[q]["argv"])
            if m:
                treffer = (q, m)
                break
            if ist_sitzung(procs[q]["argv"]):
                unter_sitzung = True
                break
            q = procs[q]["ppid"]
        if treffer:
            wurzel, (name, starter) = treffer
            motoren.setdefault(wurzel, (name, starter, []))[2].append(pid)
        elif unter_sitzung:
            sitzung.append(pid)
        else:
            fremd.append(pid)
    return motoren, sitzung, fremd


def unterbaum(procs, wurzel):
    kinder = {}
    for pid, p in procs.items():
        kinder.setdefault(p["ppid"], []).append(pid)
    out, stapel = [], [wurzel]
    while stapel:
        q = stapel.pop()
        out.append(q)
        stapel.extend(kinder.get(q, []))
    return out


def kurz(argv):
    return " ".join(os.path.basename(a) if i < 2 else a for i, a in enumerate(argv[:3]))[:70]


def lauf(heilen, procs=None, abgel=None, toeten=None, marke=MARKE_AUTOSTART, ledger=LEDGER):
    abgel = abgelehnte() if abgel is None else abgel
    if not abgel:
        return ["SECRET-UMGEBUNG: ok (kein von Shopify abgelehnter Wert bekannt)"], []
    procs = lese_proc() if procs is None else procs
    toeten = toeten or (lambda pid: os.kill(pid, signal.SIGTERM))
    motoren, sitzung, fremd = einordnen(procs, abgel)
    zeilen, beendet = [], []
    for wurzel, (name, starter, verbr) in sorted(motoren.items()):
        if heilen:
            for pid in unterbaum(procs, wurzel):
                try:
                    toeten(pid)
                except ProcessLookupError:
                    pass
            beendet.append((wurzel, name, starter, len(verbr)))
            if starter == "autostart":
                try:
                    open(marke, "w").close()
                except OSError:
                    pass
        zeilen.append(f"  {'beendet' if heilen else 'betroffen'}: {name} (PID {wurzel}, {len(verbr)} Verbraucher mit abgelehntem Wert) → Neustart durch {starter}")
    lang = [pid for pid in fremd if procs[pid]["alter"] > 600]
    for pid in lang[:5]:
        zeilen.append(f"  ohne bekannten Starter: PID {pid} {kurz(procs[pid]['argv'])} (läuft {procs[pid]['alter'] // 60} min)")
    teile = []
    if motoren:
        teile.append(f"{len(motoren)} Motor(en) mit abgelehntem Shopify-Schlüssel ({', '.join(n for n, _, _ in motoren.values())})"
                     + (" → beendet, Starter startet mit gültigem Wert neu" if heilen else ""))
    if fremd:
        teile.append(f"{len(fremd)} weitere Verbraucher ohne bekannten Starter ({len(lang)} > 10 min)")
    if sitzung:
        teile.append(f"Sitzung trägt den abgelehnten Wert ({len(sitzung)} Prozesse) — Betreiber: Umgebungsvariable korrigieren")
    kopf = "SECRET-UMGEBUNG: " + (" · ".join(teile) if teile else "ok (kein Motor trägt den abgelehnten Wert)")
    if (motoren or lang) and not heilen:
        kopf = "⚠️ " + kopf
    if beendet and ledger:
        try:
            with open(ledger, "a", encoding="utf-8") as f:
                for wurzel, name, starter, n in beendet:
                    f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\tbeendet\t{name}\t{wurzel}\t{n}\t{starter}\n")
        except OSError:
            pass
    return [kopf] + zeilen, beendet


def selbsttest():
    import tempfile
    ok = fehl = 0

    def pruef(name, bed):
        nonlocal ok, fehl
        if bed:
            ok += 1
        else:
            fehl += 1
            print("FEHL:", name)

    SCHLECHT, GUT = b"x" * 60, b"y" * 38
    m_schlecht = hashlib.md5(SCHLECHT).hexdigest()[:12]
    m_gut = hashlib.md5(GUT).hexdigest()[:12]
    with tempfile.TemporaryDirectory() as d:
        proc = os.path.join(d, "proc")
        os.makedirs(proc)
        with open(os.path.join(proc, "uptime"), "w") as f:
            f.write("5000.0 1.0\n")
        hz = os.sysconf("SC_CLK_TCK")

        def mache(pid, ppid, argv, wert, start_s=100):
            p = os.path.join(proc, str(pid))
            os.makedirs(p)
            comm = os.path.basename(argv[0])
            felder = ["S", str(ppid)] + ["0"] * 17 + [str(int(start_s * hz))]
            with open(os.path.join(p, "stat"), "w") as f:
                f.write(f"{pid} ({comm} a) b) " + " ".join(felder) + "\n")
            with open(os.path.join(p, "cmdline"), "wb") as f:
                f.write(b"\0".join(a.encode() for a in argv) + b"\0")
            with open(os.path.join(p, "environ"), "wb") as f:
                f.write(b"PATH=/bin\0" + (VAR + wert + b"\0" if wert is not None else b""))

        mache(2, 1, ["/opt/claude-code/bin/claude", "--x"], SCHLECHT)
        mache(10, 1, ["bash", "/tmp/cj_queue_runner.sh"], SCHLECHT)                 # Hülle, liest Datei neu
        mache(11, 10, ["/opt/node22/bin/node", "automation/cj_category_fill.mjs"], GUT)  # Kind gesund
        mache(20, 1, ["/opt/node22/bin/node", "automation/cj_perpetual.mjs"], SCHLECHT)
        mache(21, 20, ["/opt/node22/bin/node", "automation/cj_category_fill.mjs"], SCHLECHT)
        mache(30, 1, ["bash", "automation/fixer_keepalive.sh"], GUT)
        mache(31, 30, ["python3", "automation/google_feedback_wache.py"], GUT)
        mache(40, 2, ["bash", "-c", "python3 tools/x.py"], SCHLECHT)
        mache(41, 40, ["python3", "tools/x.py"], SCHLECHT, start_s=4900)            # Handlauf der Sitzung
        mache(50, 1, ["python3", "automation/fremd.py"], SCHLECHT, start_s=10)       # unbekannter Starter, lang
        mache(60, 1, ["sleep", "300"], SCHLECHT)                                     # kein Verbraucher
        mache(70, 1, ["python3", "automation/ohne.py"], None)
        mache(80, 1, ["bash", "/tmp/cj_queue_runner.sh"], SCHLECHT)                 # Hülle OHNE Neu-Einlesen
        mache(81, 80, ["/opt/node22/bin/node", "automation/cj_sku_import.mjs"], SCHLECHT)
        procs = lese_proc(proc)
        pruef("A lese_proc alle", len(procs) == 14)
        pruef("B md5 nur Präfix", procs[20]["md5"] == m_schlecht and procs[11]["md5"] == m_gut)
        motoren, sitzung, fremd = einordnen(procs, {m_schlecht})
        pruef("C cj_perpetual erkannt", 20 in motoren and motoren[20][0] == "cj_perpetual" and motoren[20][2] == [20, 21])
        pruef("D Hülle mit gesundem Kind NICHT erkannt", 10 not in motoren)
        pruef("E Hülle mit krankem Kind erkannt", 80 in motoren and motoren[80][2] == [81])
        pruef("F Sitzung + Handlauf", 2 in sitzung and 41 in sitzung and 41 not in fremd)
        pruef("G fremd + sleep/ohne Wert nicht", fremd == [50])
        getoetet = []
        pr = os.path.join(d, "pruef")
        with open(pr, "w") as f:
            f.write(f"{m_schlecht} DATEI 2026-10-14T13:28:55Z\n{m_gut} OK 2026-10-14T13:29:00Z\n")
        pruef("H Urteil lesen", abgelehnte(pr) == {m_schlecht})
        marke = os.path.join(d, "marke")
        led = os.path.join(d, "led.tsv")
        zeilen, beendet = lauf(True, procs=procs, abgel=abgelehnte(pr), toeten=getoetet.append, marke=marke, ledger=led)
        pruef("I heilen tötet nur Motor-Unterbäume", sorted(getoetet) == [20, 21, 80, 81])
        pruef("J Marke autostart", os.path.exists(marke))
        pruef("K Ledger", open(led).read().count("\tbeendet\t") == 2)
        alles = "\n".join(zeilen)
        pruef("L kein Wert in der Ausgabe", "xxxx" not in alles and "yyyy" not in alles)
        pruef("M Kopfzeile", zeilen[0].startswith("SECRET-UMGEBUNG:") and "Sitzung" in zeilen[0])
        getoetet.clear()
        zeilen, _ = lauf(False, procs=procs, abgel={m_schlecht}, toeten=getoetet.append, marke=os.path.join(d, "m2"), ledger=None)
        pruef("N melden tötet nichts, Warnzeichen", getoetet == [] and zeilen[0].startswith("⚠️") and not os.path.exists(os.path.join(d, "m2")))
        zeilen, _ = lauf(True, procs=procs, abgel=set(), toeten=getoetet.append)
        pruef("O ohne Urteil ok", zeilen[0].startswith("SECRET-UMGEBUNG: ok") and getoetet == [])
        pruef("P Urteil OK zählt nicht", einordnen(procs, abgelehnte(pr) - {m_schlecht})[0] == {})
    print(f"Selbsttest: {ok}/{ok + fehl}")
    return 0 if fehl == 0 else 1


def main():
    if "--selbsttest" in sys.argv:
        return selbsttest()
    zeilen, _ = lauf("--heilen" in sys.argv)
    print("\n".join(zeilen))
    return 0


if __name__ == "__main__":
    sys.exit(main())
