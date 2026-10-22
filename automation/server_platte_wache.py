#!/usr/bin/env python3
"""server_platte_wache.py — liest die Platten-Lage des Hetzner-Servers aus der täglichen Quittung `server-zustand-*.json` (22.10.2026).

ANLASS (Sauber-Inventur 22.10., Spähtrupp «betrieb»): Die Wartungsaktion `waechter_zustand` liefert jeden Tag `df -h / /tmp` des Servers, aber nur Menschen
lasen die Quittung. GEMESSEN in den Quittungen: 20.10. `/dev/sda1 38G 35G 718M 99 %`, 21.10. `38G 36G 115M 100 %`. Bei voller Platte kann der Agent nicht
mehr pushen, `git fetch` des Wächters scheitert (ExecStartPre), Aufträge sterben mitten im Lauf (22.10.: `server-zustand` 00:16, 8 von 10 Pin-Aufträge) — und
die Ampel nannte als Ursache nur den GitHub-Token. Der Hetzner-Agent steht seit 22.10. 11:00 UTC, der Wächter seit 16.10.

  python3 automation/server_platte_wache.py            # Ampelzeile (leer, wenn alles in Ordnung)
  python3 automation/server_platte_wache.py --selbsttest

Nie «in Ordnung» bei Unklarheit: keine Quittung / kein df-Wert → «unklar».
"""
import glob
import json
import os
import re
import sys
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
QUITTUNGEN = os.path.join(REPO, "auftraege", "erledigt")
VOLL_PROZENT, FAST_PROZENT = 95, 90
VOLL_FREI_MB, FAST_FREI_MB = 1024, 2048
ALT_STUNDEN = 36
ABHILFE = ("Abhilfe auf dem Server (root): "
           "`curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/server/platte-schlank.sh | bash`"
           " (Anleitung im Kopf von server/platte-schlank.sh)")


def mb(text):
    """'115M' → 115, '1.4G' → 1433.6, '950K' → 0.93, '2T' → 2097152. Unlesbar → None."""
    m = re.fullmatch(r"\s*([\d.,]+)\s*([KMGT]?)i?B?\s*", text or "", re.I)
    if not m:
        return None
    try:
        zahl = float(m.group(1).replace(",", "."))
    except ValueError:
        return None
    return zahl * {"": 1 / (1024 * 1024), "K": 1 / 1024, "M": 1, "G": 1024, "T": 1024 * 1024}[m.group(2).upper()]


def df_wurzel(ausgaben):
    """Aus den Ausgaben der Quittung die Zeile für «/» holen: (Prozent, frei_mb) oder None. Nimmt die Zeile mit Einhängepunkt genau «/»."""
    for a in ausgaben or []:
        if not str(a.get("befehl", "")).startswith("df"):
            continue
        for zeile in str(a.get("ausgabe", "")).splitlines():
            teile = zeile.split()
            if len(teile) >= 6 and teile[-1] == "/" and teile[-2].endswith("%"):
                try:
                    prozent = int(teile[-2].rstrip("%"))
                except ValueError:
                    continue
                frei = mb(teile[-3])
                if frei is not None:
                    return prozent, frei
    return None


def neueste(verzeichnis=QUITTUNGEN):
    """Neueste Quittung `server-zustand-*.json` mit stand=ok und lesbarem df-Wert: (name, begonnen, prozent, frei_mb) oder None."""
    for pfad in sorted(glob.glob(os.path.join(verzeichnis, "server-zustand-*.json")), reverse=True):
        try:
            d = json.load(open(pfad, encoding="utf-8"))
        except Exception:
            continue
        if d.get("stand") != "ok":
            continue
        wert = df_wurzel((d.get("ergebnis") or {}).get("ausgaben"))
        if not wert:
            continue
        roh = d.get("begonnen") or ""
        try:
            wann = datetime.fromisoformat(roh.replace("Z", "+00:00"))
            if wann.tzinfo is None:
                wann = wann.replace(tzinfo=timezone.utc)
        except Exception:
            wann = datetime.fromtimestamp(os.path.getmtime(pfad), timezone.utc)
        return os.path.basename(pfad), wann, wert[0], wert[1]
    return None


def bewerte(prozent, frei_mb, alter_h):
    """→ Text oder None. Voll vor fast voll vor veraltet."""
    if prozent >= VOLL_PROZENT or frei_mb < VOLL_FREI_MB:
        return (f"⚠️ SERVER-PLATTE VOLL: {prozent} % belegt, {frei_mb:.0f} MB frei (Messung vor {alter_h:.0f} h). Folge: der Agent kann nicht pushen, "
                f"Wächter und Aufträge sterben mitten im Lauf. {ABHILFE}")
    if prozent >= FAST_PROZENT or frei_mb < FAST_FREI_MB:
        return f"⚠️ SERVER-PLATTE FAST VOLL: {prozent} % belegt, {frei_mb:.0f} MB frei (Messung vor {alter_h:.0f} h). {ABHILFE}"
    if alter_h > ALT_STUNDEN:
        return f"ℹ️ SERVER-PLATTE: letzte Messung vor {alter_h:.0f} h ({prozent} % belegt) — die tägliche Quittung server-zustand fehlt"
    return None


def zeile(jetzt=None, verzeichnis=QUITTUNGEN):
    jetzt = jetzt or datetime.now(timezone.utc)
    n = neueste(verzeichnis)
    if not n:
        return "SERVER-PLATTE: unklar (keine auswertbare Quittung server-zustand-*.json mit df-Zeile)"
    name, wann, prozent, frei = n
    return bewerte(prozent, frei, (jetzt - wann).total_seconds() / 3600.0)


def selbsttest():
    import tempfile
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        df = lambda zeile: [{"befehl": "df -h / /tmp", "ausgabe": "Filesystem Size Used Avail Use% Mounted on\n" + zeile + "\ntmpfs 1.9G 481M 1.4G 26% /tmp\n"}]
        if m.df_wurzel(df("/dev/sda1 38G 36G 115M 100% /")) != (100, 115.0):
            f.append(f"A df-Zeile 100 % → {m.df_wurzel(df('/dev/sda1 38G 36G 115M 100% /'))}")
        if m.df_wurzel(df("/dev/sda1 38G 20G 16G 56% /")) is None or abs(m.df_wurzel(df("/dev/sda1 38G 20G 16G 56% /"))[1] - 16384) > 1:
            f.append("B 16G frei falsch gelesen")
        if m.df_wurzel([{"befehl": "free -m", "ausgabe": "/dev/sda1 38G 36G 115M 100% /"}]) is not None:
            f.append("C nur df-Befehle zählen")
        if m.df_wurzel(df("kaputte zeile ohne zahlen")) is not None:
            f.append("D unlesbare Zeile muss None geben")
        if not (m.bewerte(100, 115, 5) or "").startswith("⚠️ SERVER-PLATTE VOLL"):
            f.append("E 100 % / 115 MB muss VOLL melden")
        if not (m.bewerte(70, 800, 5) or "").startswith("⚠️ SERVER-PLATTE VOLL"):
            f.append("F 70 % aber nur 800 MB frei muss VOLL melden (freier Platz allein zählt)")
        if not (m.bewerte(97, 3000, 5) or "").startswith("⚠️ SERVER-PLATTE VOLL"):
            f.append("F2 97 % belegt bei 3 GB frei muss VOLL melden (Prozent allein zählt)")
        if not (m.bewerte(92, 4000, 5) or "").startswith("⚠️ SERVER-PLATTE FAST VOLL"):
            f.append("G 92 % muss FAST VOLL melden")
        if m.bewerte(56, 16000, 5) is not None:
            f.append("H 56 % / 16 GB frei muss schweigen")
        if not (m.bewerte(56, 16000, 50) or "").startswith("ℹ️ SERVER-PLATTE"):
            f.append("I alte Messung muss gemeldet werden")
        with tempfile.TemporaryDirectory() as d:
            if "unklar" not in (m.zeile(verzeichnis=d) or ""):
                f.append("J ohne Quittung muss «unklar» heissen, nie leer")
            for name, stand, zl in (("server-zustand-2026-10-19.json", "ok", "/dev/sda1 38G 20G 16G 56% /"),
                                    ("server-zustand-2026-10-21.json", "ok", "/dev/sda1 38G 36G 115M 100% /"),
                                    ("server-zustand-2026-10-22.json", "laufend", "/dev/sda1 38G 20G 16G 56% /")):
                json.dump({"stand": stand, "begonnen": "2026-10-21T07:36:34.564Z", "ergebnis": {"ausgaben": df(zl)}}, open(os.path.join(d, name), "w"))
            n = m.neueste(d)
            if not n or n[0] != "server-zustand-2026-10-21.json":
                f.append(f"K neueste ok-Quittung statt laufender: {n}")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Prozent-Schwelle weg", "prozent >= VOLL_PROZENT or frei_mb < VOLL_FREI_MB", "frei_mb < VOLL_FREI_MB"),
           ("freier Platz zählt nicht", "prozent >= VOLL_PROZENT or frei_mb < VOLL_FREI_MB", "prozent >= VOLL_PROZENT"),
           ("laufende Quittung zählt", 'if d.get("stand") != ' + '"ok":', 'if False:'),
           ("Einhängepunkt egal", 'teile[-1] == ' + '"/" and', "True and"),
           ("Unklar wird leer", 'return "SERVER-PLATTE: unklar' + ' (keine', 'return None  # (keine')]
    erkannt = 0
    for name, alt, neu in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu, 1), "mutant", "exec"), m.__dict__)
        try:
            if faelle(m):
                erkannt += 1
            else:
                fehler.append(f"Mutant «{name}» NICHT erkannt")
        except Exception:
            erkannt += 1
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 11 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    print(zeile() or "SERVER-PLATTE: ok")
