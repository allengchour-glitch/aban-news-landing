import json,subprocess,time,os,io,re,sys
from PIL import Image
# 13.10.2026 (Urteil B2) — PING-PONG mit bild_klein_fix: dieser Lauf holte ein kleineres Bild nach vorn (Kupferarmband: 244×171
# statt 1000×1000, 5× «25->0» in dropship/_textbild_hits.txt), bild_klein_fix drehte es zurück, und so fort. GEMESSEN (Gegenprüfer):
# 118 aktive Mehrfach-Umgestellte mit Hauptbild unter 500 px, obwohl ein grösseres da ist; 123 der 671 «Image under review» hatten
# seit 30.09. eine Umstellung von hier. Drei Schranken:
#  (1) GRÖSSEN-TOR kandidat_erlaubt(): ein Ersatz muss beide Kanten ≥ 500 haben (Regel von bild_klein_fix = Google-Mindestmass);
#      kleiner nur, wenn das Produkt KEIN Bild mit beiden Kanten ≥ 500 hat UND der Ersatz nicht kleiner ist als das Hauptbild.
#  (2) PINGPONG-BREMSE: Produkte mit ≥ 3 Zeilen in _textbild_hits.txt werden nur noch quittiert (Grund «pingpong-bremse»).
#  (3) DRY=1: keine Mutation, keine Quittung, kein Cursor — nur melden. --selbsttest prüft (1) und (2) ohne Shopify.
GROESSE_MIN=500
PINGPONG_MIN=3
HITS="dropship/_textbild_hits.txt"


def kandidat_erlaubt(kand_wh, alle_wh):
    """Darf das Bild kand_wh=(Breite, Höhe) Hauptbild werden? alle_wh = (Breite, Höhe) ALLER Bilder des Produkts, [0] = aktuelles
    Hauptbild. Unbekannte Masse zählen als 0."""
    kw, kh = (kand_wh[0] or 0), (kand_wh[1] or 0)
    if kw >= GROESSE_MIN and kh >= GROESSE_MIN:
        return True
    if any((w or 0) >= GROESSE_MIN and (h or 0) >= GROESSE_MIN for w, h in alle_wh):
        return False
    hw, hh = alle_wh[0] if alle_wh else (0, 0)
    return min(kw, kh) >= min(hw or 0, hh or 0)


def pingpong_zaehlen(zeilen):
    """Produkt-ID → Anzahl Zeilen im Hits-Ledger (jede Zeile = eine Umstellung durch diesen Lauf)."""
    n = {}
    for z in zeilen:
        pid = z.split("\t", 1)[0].strip()
        if pid.startswith("gid://shopify/Product/"):
            n[pid] = n.get(pid, 0) + 1
    return n


if "--selbsttest" in sys.argv:
    faelle = [("244×171 gegen vorhandenes 1000×1000", kandidat_erlaubt((244, 171), [(1000, 1000), (244, 171)]), False),
              ("244×171 gegen 1000×1000 an Platz 2", kandidat_erlaubt((244, 171), [(300, 300), (1000, 1000), (244, 171)]), False),
              ("800×800", kandidat_erlaubt((800, 800), [(300, 300), (800, 800)]), True),
              ("alle < 500: 400×400 bei Hauptbild 300×300", kandidat_erlaubt((400, 400), [(300, 300), (400, 400)]), True),
              ("alle < 500: 200×200 bei Hauptbild 300×300", kandidat_erlaubt((200, 200), [(300, 300), (200, 200)]), False),
              ("600×300 gegen vorhandenes 1000×1000", kandidat_erlaubt((600, 300), [(1000, 1000), (600, 300)]), False),
              ("600×300, alle < 500, Hauptbild 400×400", kandidat_erlaubt((600, 300), [(400, 400), (600, 300)]), False),
              ("Masse unbekannt, grosses Bild vorhanden", kandidat_erlaubt((None, None), [(1000, 1000), (None, None)]), False),
              ("Pingpong-Zählung", pingpong_zaehlen(["gid://shopify/Product/1\t25->0\tA\n"] * 3 + ["gid://shopify/Product/2\t9->1\tB\n", "kaputt\n"]),
               {"gid://shopify/Product/1": 3, "gid://shopify/Product/2": 1})]
    ok = 0
    for name, ist, soll in faelle:
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {name} → {ist}")
    print(f"Selbsttest {ok}/{len(faelle)}")
    sys.exit(0 if ok == len(faelle) else 1)
DRY=os.environ.get("DRY")=="1"
TOK=open("/tmp/cj_shop_token.txt").read().strip()
def gql(q,v=None):
    p=json.dumps({"query":q,"variables":v or {}})
    for _ in range(4):
        r=subprocess.run(["curl","-s","--max-time","60","https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json","-H","X-Shopify-Access-Token: "+TOK,"-H","Content-Type: application/json","-d",p],capture_output=True,text=True)
        try:
            d=json.loads(r.stdout)
            if "data" in d: return d
        except Exception: pass
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")
def fetch(url):
    try:
        r=subprocess.run(["curl","-sL","--max-time","25",url.split("?")[0]],capture_output=True)
        if len(r.stdout)<500: return None
        return Image.open(io.BytesIO(r.stdout)).convert("L")
    except Exception: return None
def textscore(im):
    if im is None: return 999
    im=im.resize((400,400)); px=im.load(); rows=0
    for y in range(0,400,2):
        runs=0; dark=0; prev=False
        for x in range(0,400,2):
            d=px[x,y]<110; dark+=d
            if d and not prev: runs+=1
            prev=d
        if runs>=8 and dark<140: rows+=1
    return rows
# Optionaler Filter, damit einzelne Kategorien vorgezogen werden können. Anlass: die Uhren
# (904 Artikel) haben auffällig oft eine Lieferanten-Collage als Hauptbild — mit englischem
# Werbetext und fremder Marke. Ohne Filter käme die Kategorie erst nach Zehntausenden anderer
# Produkte an die Reihe.
QUERY=os.environ.get("QUERY","status:ACTIVE")
Q=f'''query($c:String){{products(first:50,after:$c,query:"{QUERY}"){{pageInfo{{hasNextPage endCursor}}
 nodes{{id handle title media(first:12){{nodes{{id ... on MediaImage{{image{{url width height}}}}}}}}}}}}}}'''
# 05.10.2026: Produkte, deren Hauptbild der Google-Bildtausch bewusst gesetzt hat, bleiben unangetastet. Gemessen: 83 von
# 301 Bildtauschen hatte DIESER Lauf wieder zurückgedreht (Spitze/Mesh gilt der Dunkel-Lauf-Heuristik als «Text», das alte
# Model-Bild rückte wieder nach vorn). Die Sperre wird quittiert, damit das Produkt nicht bei jedem Lauf neu geladen wird.
import sys as _sys; _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bildtausch_sperre import gesperrte_handles as _gesperrte_handles
SPERRE=_gesperrte_handles()
# Cursor und Ledger im Repo, nicht in /tmp: dieser Lauf lädt für JEDES Produkt bis zu fünf
# Bilder herunter und bewertet sie. Geht der Cursor bei einem Container-Wipe verloren,
# beginnt die Bildanalyse wieder bei null — das kostet Stunden und Bandbreite umsonst.
state=os.environ.get("CURSOR","dropship/_textbild_cursor.txt")
cur=(open(state).read().strip() or None) if os.path.exists(state) else None
if DRY: cur=None                      # Trockenlauf: fremden Cursor weder lesen noch schreiben noch löschen
seiten=0
# Geprüft-Ledger: Produkt-ID -> Media-ID des Hauptbilds, das beim letzten Lauf beurteilt
# wurde. Ohne dieses Ledger lud jeder Lauf für DIESELBEN ~500 unheilbaren Produkte erneut
# bis zu fünf Bilder herunter und kam nie über die ersten Seiten hinaus (beobachtet 26.08.:
# zehn Läufe in Folge «umsortiert 0» auf identischem Fenster). Der Schlüssel ist die
# Media-ID, nicht nur die Produkt-ID: Tauscht ein Backfill oder Reorder das Hauptbild,
# passt die Quittung nicht mehr und das Produkt wird neu beurteilt.
GEPRUEFT="dropship/_textbild_geprueft.txt"
quitt={}
if os.path.exists(GEPRUEFT):
    for z in open(GEPRUEFT,errors="ignore"):
        t=z.rstrip("\n").split("\t")
        if len(t)>=2: quitt[t[0]]=t[1]
qlog=open(GEPRUEFT,"a") if not DRY else None
def quittieren(zeile):
    if DRY: return
    qlog.write(zeile); qlog.flush()
PINGPONG=pingpong_zaehlen(open(HITS,errors="ignore")) if os.path.exists(HITS) else {}
sc=hit=fix=skip=gesperrt=pingpong=zuklein=wuerde=0
log=open(HITS,"a") if not DRY else None
if DRY: print(f"DRY=1: keine Mutation, keine Quittung, kein Cursor (QUERY={QUERY})",flush=True)
while True:
    d=gql(Q,{"c":cur}); pg=(d.get("data") or {}).get("products")
    if not pg: break
    for p in pg["nodes"]:
        sc+=1
        ms=[m for m in p["media"]["nodes"] if m.get("image")]
        if len(ms)<2: continue
        if quitt.get(p["id"])==ms[0]["id"]: skip+=1; continue
        if p.get("handle") in SPERRE:
            gesperrt+=1; quittieren(f'{p["id"]}\t{ms[0]["id"]}\tbildtausch-sperre\n'); continue
        if PINGPONG.get(p["id"],0)>=PINGPONG_MIN:      # 13.10. (B2): schon ≥3× umgestellt → nur quittieren, nie wieder umstellen
            pingpong+=1; quittieren(f'{p["id"]}\t{ms[0]["id"]}\tpingpong-bremse\n')
            if DRY: print(f'DRY pingpong-bremse {p["id"]} ({PINGPONG[p["id"]]} Zeilen) — nicht umgestellt',flush=True)
            continue
        wh=[((m["image"].get("width") or 0),(m["image"].get("height") or 0)) for m in ms]
        s0=textscore(fetch(ms[0]["image"]["url"]))
        haupt=ms[0]["id"]
        if s0>=8:
            hit+=1
            best=None;bs=s0
            for i,m in enumerate(ms[1:5],1):
                if not kandidat_erlaubt(wh[i],wh): zuklein+=1; continue   # 13.10. (B2): Grössen-Tor wie bild_klein_fix
                s=textscore(fetch(m["image"]["url"]))
                if s<bs: bs=s; best=m
                if s<=1: break
            if best and bs<=3:
                if DRY:
                    wuerde+=1
                    print(f'DRY würde umstellen {p["id"]} {s0}->{bs} {best["image"].get("width")}x{best["image"].get("height")} {p["title"][:50]}',flush=True)
                else:
                    r=gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}',
                          {"id":p["id"],"m":[{"id":best["id"],"newPosition":"0"}]})
                    if not (r.get("data") or {}).get("productReorderMedia",{}).get("userErrors"):
                        fix+=1; haupt=best["id"]
                        log.write(f'{p["id"]}\t{s0}->{bs}\t{p["title"][:60]}\n'); log.flush()
                    time.sleep(0.2)
        quittieren(f'{p["id"]}\t{haupt}\n')
    if not pg["pageInfo"]["hasNextPage"]: break
    cur=pg["pageInfo"]["endCursor"]
    # Cursor nur alle 20 Seiten (~1000 Produkte) auf die Platte schreiben, nicht bei
    # jeder Seite. Vorher aenderte sich die versionierte Datei im Sekundentakt: der
    # Stop-Hook fand den Baum IMMER schmutzig, egal wie oft committet wurde, und jeder
    # Commit verlor das Rennen gegen den naechsten Schreibvorgang. Der Preis fuer den
    # groesseren Abstand ist, dass ein Absturz bis zu 1000 Produkte neu scannt — das
    # ist ein reiner Lesevorgang von wenigen Sekunden und damit billiger als die Unruhe.
    seiten+=1
    if seiten%20==0 and not DRY: open(state,"w").write(cur)
    if sc%200<50: print(f"gescannt {sc} | Text-Hauptbilder {hit} | umsortiert {fix}",flush=True)
# Cursor am Ende löschen: der Katalog wächst täglich um Hunderte CJ-Importe. Bliebe der Cursor
# stehen, startete jeder Folgelauf am Ende und prüfte nie wieder etwas ("FERTIG: 37 gescannt").
if os.path.exists(state) and not DRY: os.remove(state)
print(f"FERTIG{' (DRY)' if DRY else ''}: {sc} gescannt ({skip} per Quittung uebersprungen, {gesperrt} Bildtausch-Sperre, {pingpong} Pingpong-Bremse), "
      f"{hit} mit Text-Hauptbild, {fix} auf sauberes Bild umgestellt" + (f" (DRY: würde {wuerde})" if DRY else "")
      + f", {zuklein} Ersatzbilder am Grössen-Tor verworfen")
