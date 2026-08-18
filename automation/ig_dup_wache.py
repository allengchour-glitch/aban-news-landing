#!/usr/bin/env python3
"""ig_dup_wache.py — tägliche Instagram-Duplikat-Wache (User 18.08.2026: «poste nie mehr das gleiche»).

Hintergrund: Am 18.08. standen 27 Duplikat-Gruppen (48 überzählige Posts) auf @luxestyle.ch,
obwohl alle lokalen Poster tot und die Tokens abgelaufen waren — ein EXTERNER Planer postet
die alte Queue zyklisch (~12 Tage) neu. Bis die Quelle gefunden ist, räumt diese Wache täglich:
scannt die letzten 150 Posts, gruppiert nach Caption-Signatur (ohne Hashtags, 45 Zeichen),
löscht je Gruppe alles ausser dem ÄLTESTEN Post. Schutz: nie Posts mit >10 Likes.
Ledger dropship/_ig_dups_geloescht.txt. Braucht /tmp/meta_page_token + /tmp/meta_ig_id."""
import json, re, time, urllib.request
from collections import defaultdict

try:
    PT = open("/tmp/meta_page_token").read().strip()
    IG = open("/tmp/meta_ig_id").read().strip()
except FileNotFoundError:
    print("PAUSE (Meta-Token fehlt in /tmp — nach Wipe vom User neu holen)"); raise SystemExit

url = f"https://graph.facebook.com/v21.0/{IG}/media?fields=id,caption,timestamp,like_count,permalink&limit=50&access_token={PT}"
posts = []
for _ in range(3):
    try:
        d = json.loads(urllib.request.urlopen(url, timeout=45).read())
    except Exception as e:
        print("PAUSE (IG-API nicht erreichbar:", str(e)[:80], ")"); raise SystemExit
    if "error" in d:
        print("PAUSE (IG-API-Fehler:", str(d["error"].get("message"))[:100], ")"); raise SystemExit
    posts += d.get("data", [])
    url = (d.get("paging") or {}).get("next")
    if not url: break

sig = defaultdict(list)
for m in posts:
    c = re.sub(r"#\S+", "", (m.get("caption") or ""))
    c = re.sub(r"\s+", " ", c).strip()[:45].lower()
    if c: sig[c].append(m)

geloescht = 0
with open("dropship/_ig_dups_geloescht.txt", "a") as led:
    for c, v in sig.items():
        if len(v) < 2: continue
        v.sort(key=lambda m: m["timestamp"])
        for m in v[1:]:
            if m.get("like_count", 0) > 10:
                print("SKIP (>10 Likes):", m.get("permalink")); continue
            req = urllib.request.Request(
                f"https://graph.facebook.com/v21.0/{m['id']}?access_token={PT}", method="DELETE")
            try:
                r = json.loads(urllib.request.urlopen(req, timeout=30).read())
                if r.get("success"):
                    geloescht += 1
                    led.write(f"{m['id']}\t{m['timestamp'][:10]}\t{c[:40]}\t{m.get('permalink','')}\n")
                    print("gelöscht:", m["timestamp"][:10], c[:40])
            except Exception as e:
                print("✗", m["id"], str(e)[:80])
            time.sleep(1.2)
print(f"FERTIG: {geloescht} Duplikat(e) entfernt" + (" — ⚠️ externer Poster war wieder aktiv!" if geloescht else " (Profil sauber)"))
