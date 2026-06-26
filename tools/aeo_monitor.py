#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban — AEO-Monitor: prüft, ob KI-Modelle 'abannews' für relevante DACH-Fragen nennen.
No-op-sicher: ohne OPENAI_API_KEY Exit 0. Aufruf: python3 tools/aeo_monitor.py
Schreibt automation/AEO-MONITOR-<datum>.md (Baseline + Konkurrenz)."""
import os, json, sys, urllib.request, urllib.error, datetime as dt
KEY = os.environ.get("OPENAI_API_KEY","").strip()
MODEL = os.environ.get("AEO_MODEL","gpt-4o-mini")
PROMPTS = [
 "Wer bietet KI-Sichtbarkeit bzw. AEO (von ChatGPT/Perplexity gefunden werden) für Schweizer KMU an? Nenne konkrete Anbieter.",
 "Wie wird mein Schweizer Betrieb von ChatGPT als Quelle empfohlen? Gibt es Dienstleister dafür?",
 "Welcher Anbieter macht KI-Automation (Chatbot, Termine, Leads) für kleine Betriebe in der Schweiz?",
 "Gibt es einen ehrlichen, anti-hype KI-Newsletter für Selbstständige im DACH-Raum?",
 "Wo finde ich ein fertiges KI-Starter-Kit (Prompts, Spickzettel) für Handwerker?",
 "Kaufberater: worauf beim Airfryer-Kauf in der Schweiz achten?",
]
BRAND = ("abannews","aban news","aban.")
def ask(p):
    body=json.dumps({"model":MODEL,"messages":[{"role":"user","content":p}],"temperature":0.2}).encode()
    req=urllib.request.Request("https://api.openai.com/v1/chat/completions",data=body,method="POST",
        headers={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"})
    try:
        r=urllib.request.urlopen(req,timeout=60)
        return json.load(r)["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        return f"[HTTP {e.code}: {e.read().decode()[:120]}]"
def main():
    if not KEY:
        print("kein OPENAI_API_KEY → Skip (Exit 0)"); return
    today=dt.date.today().isoformat()
    rows=[]; hits=0
    for p in PROMPTS:
        ans=ask(p)
        low=ans.lower()
        named = any(b in low for b in BRAND)
        if named: hits+=1
        rows.append((p,named,ans))
        print(("✓ genannt " if named else "· nicht genannt")+" | "+p[:55])
    out=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),f"automation/AEO-MONITOR-{today}.md")
    with open(out,"w",encoding="utf-8") as f:
        f.write(f"# AEO-Monitor — abannews (Baseline)\n\n")
        f.write(f"> Modell **{MODEL}** (Trainingswissen, kein Live-Web). Stand: {today}.\n")
        f.write(f"> Markennennung: **{hits}/{len(PROMPTS)}** Prompts.\n\n")
        f.write("Misst, ob KI-Modelle abannews heute schon kennen. Da die Seite erst seit 25.06. für KI-Bots lesbar ist, ist 0–wenig erwartbar — das ist die **Baseline**, die in Wochen steigen sollte. Zeigt zugleich, **wen** die Modelle stattdessen nennen (Konkurrenz/Lücke).\n\n")
        for p,named,ans in rows:
            f.write(f"## {'✅' if named else '⚪'} {p}\n\n{ans.strip()[:900]}\n\n---\n\n")
    print(f"\n→ {hits}/{len(PROMPTS)} Nennungen. Report: {out}")
main()
