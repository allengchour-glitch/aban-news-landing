#!/usr/bin/env python3
"""stimme_edge.py — wie stimme.sh (Format «S1<TAB>Text<TAB>Titel»), aber mit neuronaler Stimme über edge-tts.
Aufruf:  python3 stimme_edge.py <stimme.txt> <ausgabe.wav> <zeiten.json>
Umgebung: STIMME (Vorgabe de-DE-KatjaNeural), STIMME_RATE (Vorgabe -8%), STIMME_PAUSE (Vorgabe 0.9 s), STIMME_BEGINN (Vorgabe 0.6 s),
          EDGE_CA_BUNDLE (Zertifikatsbündel, wenn ein Proxy das TLS neu terminiert; die Prüfung bleibt immer an).
Hinweis: inoffizieller Client des Vorlese-Dienstes von Microsoft Edge, keine Lizenz für veröffentlichte Videos belegt.
Zeiten wie stimme.sh: erste Zeile ab 0.6 s, danach Dauer plus Pause; Szene beginnt 0.4 s vor ihrer ersten Zeile,
endet 0.6 s nach ihrer letzten (letzte Szene 1 s Ausklang). Nur der Sprechtext geht an den Dienst."""
import asyncio, json, os, re, subprocess, sys, tempfile

def fail(m):
    print("FEHLER: " + m, file=sys.stderr); sys.exit(2)

if len(sys.argv) != 4: fail("Aufruf: stimme_edge.py <stimme.txt> <ausgabe.wav> <zeiten.json>")
txt, out, zj = sys.argv[1:]
voice = os.environ.get("STIMME", "de-DE-KatjaNeural"); rate = os.environ.get("STIMME_RATE", "-8%"); pause = float(os.environ.get("STIMME_PAUSE", "0.9"))
if not re.fullmatch(r"[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural", voice): fail("STIMME muss z. B. de-DE-KatjaNeural heissen")
if not re.fullmatch(r"[+-]\d{1,2}%", rate): fail("STIMME_RATE muss z. B. -8% heissen")
bund = os.environ.get("EDGE_CA_BUNDLE")
if bund:
    import certifi; certifi.where = lambda: bund
import edge_tts

zeilen = []
for n, l in enumerate(open(txt, encoding="utf-8").read().splitlines(), 1):
    if not l.strip(): continue
    s, t, ti = (l.split("\t") + ["", ""])[:3]
    if not re.fullmatch(r"S\d+", s): fail(f"Zeile {n}: erste Spalte muss S<Nummer> sein")
    if not t or len(t) > 160: fail(f"Zeile {n}: Text fehlt oder länger als 160 Zeichen")
    zeilen.append({"szene": s, "text": t, "titel": ti})
if not zeilen: fail("keine Zeilen")

work = tempfile.mkdtemp()
async def sprechen():
    for i, z in enumerate(zeilen, 1):
        await edge_tts.Communicate(z["text"], voice, rate=rate).save(f"{work}/z{i}.mp3")
asyncio.run(sprechen())
t = float(os.environ.get("STIMME_BEGINN", "0.6"))   # Sekunde, ab der die erste Zeile spricht
for i, z in enumerate(zeilen, 1):
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{work}/z{i}.mp3"], text=True).strip())
    z["start"], z["dauer"] = round(t, 3), round(d, 3); t += d + pause
    print(f"Zeile {i}: ab {z['start']}s, Dauer {z['dauer']}s: {z['text']}")
szenen = []
for z in zeilen:
    if not szenen or szenen[-1]["id"] != z["szene"]: szenen.append({"id": z["szene"], "zeilen": []})
    szenen[-1]["zeilen"].append(z)
for i, sz in enumerate(szenen):
    erste, letzte = sz["zeilen"][0], sz["zeilen"][-1]
    sz["t0"] = 0.0 if i == 0 else round(erste["start"] - 0.4, 3)
    ende = letzte["start"] + letzte["dauer"]
    sz["t1"] = round(ende + 1.0, 3) if i == len(szenen) - 1 else round(ende + 0.6, 3)
json.dump({"gesamt": szenen[-1]["t1"], "szenen": szenen}, open(zj, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
args, graph = [], ""
for i, z in enumerate(zeilen):
    ms = int(z["start"] * 1000); args += ["-i", f"{work}/z{i+1}.mp3"]; graph += f"[{i}:a]aresample=24000,adelay={ms}|{ms}[a{i}];"
graph += "".join(f"[a{i}]" for i in range(len(zeilen))) + f"amix=inputs={len(zeilen)}:duration=longest:normalize=0[o]"
subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", *args, "-filter_complex", graph, "-map", "[o]", out])
print(f"Fertig: {out} ({len(zeilen)} Zeilen, Stimme {voice}); Zeiten: {zj}")
