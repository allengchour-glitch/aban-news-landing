#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_post_kontrolle — merkt, wenn der PC-Autoposter STEHT (31.08.2026, MELDET NUR).

WARUM: Der tägliche TikTok-Post läuft auf dem PC des Betreibers (schtasks 17:31,
Paket %USERPROFILE%\\LuxeStyleTT). Die Cloud sieht dessen Log nicht — ein toter
Task, ein abgemeldeter Browser oder ein ausgeschalteter PC fiele NIEMANDEM auf.
Genau die Klasse «Motor meldet gesund, arbeitet aber nicht» (Lehren 23.08./29.08.).

WAS ES TUT: Liest die öffentliche Videozahl des Profils @luxestyle.ch (serverseitig
im HTML, __UNIVERSAL_DATA_FOR_REHYDRATION__ → videoCount; Browser-User-Agent nötig)
und schreibt sie einmal pro Tag in dropship/_tiktok_videocount.tsv. Steht die Zahl
über die letzten 3 ERFASSTEN Tage still, obwohl die Queue freie Beiträge hat,
entsteht dropship/TIKTOK-POST-KONTROLLE.md. Läuft es wieder, verschwindet der
Bericht (ein Bericht ohne Befund gehört gelöscht, Lehre 21.08.).

EHRLICHE GRENZEN:
- Ein Netzfehler ist KEIN Befund: ohne lesbaren videoCount wird weder Zustand
  geschrieben noch Alarm ausgelöst (Nullergebnis aus kaputtem Werkzeug, 28.08.).
- Die Zahl sagt nur DASS gepostet wurde, nicht WAS — welcher Slug raus ist, weiss
  nur das lokale Ledger des PCs. Dieses Werkzeug schreibt deshalb NIE ins
  Upload-Ledger (eine geratene Ledger-Zeile wäre eine Lüge).
- Es POSTET NICHTS und repariert nichts — der Bericht nennt die Handgriffe.
"""
import json
import os
import re
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(ROOT, "dropship", "_tiktok_videocount.tsv")
BERICHT = os.path.join(ROOT, "dropship", "TIKTOK-POST-KONTROLLE.md")
QUEUE = os.path.join(ROOT, "dropship", "tiktok_queue.json")
STILLSTAND_TAGE = 3

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")


def video_zahl():
    """videoCount vom Live-Profil; None bei jedem Zweifel (nie 0 raten)."""
    for _ in range(3):
        r = subprocess.run(["curl", "-s", "--max-time", "45", "-A", UA,
                            "https://www.tiktok.com/@luxestyle.ch"],
                           capture_output=True, text=True)
        # Die App-Hülle («TikTok - Make Your Day») ist ~30 KB; die echte Antwort
        # mit Profildaten liegt bei ~350 KB. Erst die Grösse, dann das Feld.
        if len(r.stdout) > 100_000:
            m = re.search(r'"videoCount":(\d+)', r.stdout)
            if m:
                return int(m.group(1))
        time.sleep(5)
    return None


def main():
    heute = time.strftime("%Y-%m-%d")
    zahl = video_zahl()
    if zahl is None:
        print("TikTok nicht lesbar — kein Zustand geschrieben, kein Alarm (Netz ist kein Befund).")
        print("FERTIG. geschrieben=0")
        return

    zeilen = []
    if os.path.exists(STAND):
        zeilen = [z.rstrip("\n") for z in open(STAND) if "\t" in z]
    if not any(z.startswith(heute + "\t") for z in zeilen):
        zeilen.append(f"{heute}\t{zahl}")
        with open(STAND, "w") as f:
            f.write("\n".join(zeilen) + "\n")
        print(f"Erfasst: {heute} → {zahl} Videos")
    else:
        print(f"Heute schon erfasst ({zahl} Videos live).")

    frei = 0
    try:
        q = json.load(open(QUEUE))
        frei = sum(1 for b in q.get("beitraege", []) if b.get("frei") and b.get("video"))
    except Exception:
        pass

    letzte = [int(z.split("\t")[1]) for z in zeilen[-STILLSTAND_TAGE:]]
    steht = (len(letzte) >= STILLSTAND_TAGE and len(set(letzte)) == 1)
    if steht and frei > 0:
        with open(BERICHT, "w") as f:
            f.write(f"""# ⛔ TikTok-Autoposter steht — {STILLSTAND_TAGE} Tage keine neuen Videos

Stand {heute}: Das Profil @luxestyle.ch zeigt seit {STILLSTAND_TAGE} erfassten Tagen
unverändert **{letzte[-1]} Videos**, obwohl die Queue **{frei} freie Beiträge** hat.
Der tägliche 17:31-Post auf dem PC läuft also nicht.

## Die vier üblichen Ursachen, in Prüf-Reihenfolge (alles am PC)
1. **PC war aus** um 17:31 — dann reicht: anlassen, oder von Hand
   `%USERPROFILE%\\LuxeStyleTT\\run-post.cmd` doppelklicken.
2. **Browser abgemeldet:** `%USERPROFILE%\\LuxeStyleTT\\start-browser.cmd` öffnen und
   prüfen, ob tiktok.com noch als @luxestyle.ch angemeldet ist.
3. **STOPP.txt** liegt im Ordner `LuxeStyleTT` → löschen, wenn es weitergehen soll.
4. **log.txt** im selben Ordner lesen — die letzte Zeile nennt den Grund
   (ffmpeg fehlt, Port 9222 zu, Queue leer …).
""")
        print(f"⛔ STILLSTAND: {STILLSTAND_TAGE} Tage bei {letzte[-1]} Videos, {frei} Beiträge frei → Bericht.")
    elif os.path.exists(BERICHT):
        os.remove(BERICHT)
        print("Läuft wieder — Bericht gelöscht.")

    print("FERTIG. geschrieben=0")


if __name__ == "__main__":
    main()
