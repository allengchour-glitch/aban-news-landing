# 15 Drafts ohne Ledger-Quittung — Nachprüfung (Auftrag drafts15)

Nachprüfung durchgeführt **2026-09-23 00:15–00:35 UTC** (Auftrag vom 22.09.). Betrifft die 15 Produkte, die den
Tag `cj-nicht-mehr-verfuegbar` trugen, aber in `dropship/_cj_verfuegbarkeit.txt` keine Zeile hatten.

## Ergebnis in einer Zeile
**9 lebend → zurück ACTIVE (Tag weg, 6 Kanäle wieder veröffentlicht, rückgelesen) · 6 tot → bleiben DRAFT, jetzt quittiert · 0 unklar.**
Nachscan danach: 341 Produkte mit dem Tag, **0 ohne Ledger-Zeile** (vorher 15).

## Vorgehen
1. Shopify frisch gelesen (Status, SKUs, Titel, Tags, Veröffentlichungen) — alle 15 waren DRAFT mit dem Tag, sonst kein Risiko-Tag.
2. CJ in drei Formen gefragt, im Takt (`cj_takt`, 1,8 s), **30 Aufrufe**, Punkte 59'791 → 59'275:
   - numerische pid → `product/query?pid` + `product/variant/query?pid`
   - Varianten-SKU (`…01AZ`) → `product/query?productSku=<SKU minus 4>` + `product/query?variantSku`
   - Produkt-SKU (`CJJSBGSD00009-Blue package-US`) → `product/query?productSku` + `product/variant/query?pid=<pid aus Antwort>`;
     Shop-Variantennamen gegen CJ-`variantNameEn` (endswith, Bindestrich = Leerzeichen).
3. Klingen-Tor (`klinge_ch_wache.klingen_tor` = Sperr-Tag ODER `klingenregel.ist_handklinge`) vor jeder Reaktivierung: alle 15 frei
   («Messschieber» ist ein Messgerät, kein Messer — Ausnahme greift).
4. Trockenlauf mit Ausgabe, dann scharf: `productUpdate(status:ACTIVE)` + `tagsRemove(cj-nicht-mehr-verfuegbar)`, Rücklesen mit frischem Query.
5. Ledger-Zeilen im Format des Skripts angehängt (`gid\tok\tSKU\tzurueckgeholt-…` bzw. `gid\tbei-cj-weg\tSKU\tnachgeprueft-…`).

## Tabelle

| Produkt-ID | Titel | Klasse | SKU-Kern | CJ-Antworten (drei Formen) | Klingen-Tor | Urteil | Aktion | Rücklesen |
|---|---|---|---|---|---|---|---|---|
| 15507663389057 | Handliche Powerbank mit 10000 mAh | pid | 1438434380858134528 | product?pid **1602002** «removed from shelves»; variant?pid **1602002** | frei | **tot** | Ledger `bei-cj-weg` | DRAFT, Tag bleibt |
| 15448588517761 | Doppelreihiges Schnürkleid für festliche Anlässe | variantSku | CJLY296430702BY | productSku CJLY2964307 **1602002**; variantSku **1602003**; 0 Shop-Varianten bei CJ | frei | **tot** | Ledger `bei-cj-weg` | DRAFT, Tag bleibt |
| 15448610341249 | High-Waist Yoga-Rock mit Anti-Expositions-Schutz | variantSku | CJYD295341201AZ | productSku CJYD2953412 **1602002**; variantSku **1602003** | frei | **tot** | Ledger `bei-cj-weg` | DRAFT, Tag bleibt |
| 15448669749633 | Eleganter Herringbone Wollmantel für Damen | variantSku | CJQB273159301AZ | productSku CJQB2731593 **1602002**; variantSku **1602003** | frei | **tot** | Ledger `bei-cj-weg` | DRAFT, Tag bleibt |
| 15448756617601 | A-Linien Midi-Jupe aus Baumwoll-Leinen | variantSku | CJQZ292129201AZ | productSku CJQZ2921292 **1602002**; variantSku **1602003** | frei | **tot** | Ledger `bei-cj-weg` | DRAFT, Tag bleibt |
| 15448876581249 | Smartes Sportarmband mit Schrittzähler & Erinnerung | variantSku | CJZN147378301AZ | productSku CJZN1473783 **1602002**; variantSku **1602003** | frei | **tot** | Ledger `bei-cj-weg` | DRAFT, Tag bleibt |
| 15448892080513 | 3D-Druckstift der sechsten Generation | productSku | CJJSBGSD00009 | productSku **200**, 40 Varianten, pid E73DE1F7-…; variant?pid **200** (40); Shop-Namen 5/5 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449424953729 | USB-Luftbefeuchter mit Nachtlicht-Projektion | productSku | CJJJJTJT09042 | productSku **200**, 10 Varianten; variant?pid **200**; Shop-Namen 5/5 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449425215873 | Wasserdichte Winterhandschuhe mit Fleece und Anti-Rutsch | productSku | CJNSFJST00440 | productSku **200**, 52 Varianten; variant?pid **200**; Shop-Namen 5/5 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449425412481 | Digitaler Präzisions-Messschieber | productSku | CJXFLPJY00674 | productSku **200**, 4 Varianten; variant?pid **200**; Shop-Namen 4/4 | frei (Messgerät-Ausnahme) | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449425478017 | Automatischer Kaffeebecher | productSku | CJJJCFHS03322 | productSku **200**, 6 Varianten; variant?pid **200**; Shop-Namen 5/5 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449425871233 | RGB-Gaming-Tastatur mit schwebenden Tasten | productSku | CJJSBJYX00031 | productSku **200**, 3 Varianten; variant?pid **200**; Shop-Namen 3/3 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449426690433 | Wandmontierter Zahnpasta-Dispenser | productSku | CJJJJTYS01691 | productSku **200**, 14 Varianten; variant?pid **200**; Shop-Namen 5/5 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449427018113 | Armgrip-Trainingsgerät flexibel einstellbar | productSku | CJYDQTJM00163 | productSku **200**, 2 Varianten; variant?pid **200**; Shop-Namen 2/2 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |
| 15449427280257 | Magnetische LED-Wandlampe mit Bewegungssensor | productSku | CJJZSNSN00770 | productSku **200**, 12 Varianten; variant?pid **200**; Shop-Namen 5/5 | frei | **lebend** | ACTIVE + tagsRemove | ACTIVE, Tag weg, 6 Kanäle, URL ja |

Alle 18 Mutationen ohne `userErrors`. Veröffentlichungen: die Drafts hatten 0 Kanäle; nach `status:ACTIVE` standen von selbst wieder
6 (Online Store, Shop, TikTok, Facebook & Instagram, Google & YouTube, Pinterest) — gleich wie die 5 neuesten aktiven cj-real-Produkte (je 6).
`publishablePublish` war deshalb nicht nötig und wurde nicht ausgeführt.

## Ursache — gemessen, nicht geraten
Die Annahme «Skript schreibt ohne flush, der pkill nahm den Puffer mit» hält der Messung **nicht** stand:
- `f.flush()` steht in JEDER Iteration am Ende der Schleife — heute (Z. 505), in der Fassung vom 21.09. 10:16 (72538d236, Z. 416) und
  vom 21.09. 09:43 (39af7f15d, Z. 381). Ungeschützt ist nur das Fenster zwischen `f.write(bei-cj-weg)` und den zwei Mutationen —
  ein Kill verliert dort **höchstens eine Zeile**, nicht 14.
- Shopify-Ereignisse: 14 der 15 wurden von `autopilot2` zwischen **10:16:38 und 10:22:15 UTC** gedraftet; die Powerbank schon **07:24:57**
  (anderer Lauf, älter als beide Fassungen).
- Das Nachbarprodukt 15448547393921 (gedraftet 10:16:25, also 13 s VOR dem ersten der 14) **hat** seine Zeile — im Auto-Commit d8e82d0e2
  um 10:21:27. Dieser Commit enthält sonst keine Zeile aus dem Fenster, obwohl bis dahin 12 der 14 schon gedraftet waren.
- `git log -S<id>` über das Ledger: keine der 15 IDs war je in einer committeten Fassung; keine Zeile wurde im Fenster entfernt (0 `-gid`);
  beide Stashes 0 Treffer; die zwei Ledger-Kopien in `/tmp/tmp.*` (18./19.09., 45'522 Zeilen) enthalten sie nicht.
**Offen:** wer die 14 zwischen 10:16:38 und 10:22:15 gedraftet hat, ohne eine Zeile in dieses Ledger zu schreiben. Kandidat: ein
zweiter Prozess (Aufseher-Kopie `/tmp/cj_verfuegbarkeit.py` oder Handstart aus fremdem cwd — `LEDGER` ist ein RELATIVER Pfad) bzw. eine
Fassung, die 1602001/«not found» noch als Absage wertete (Kommentar «21.09. 10:40 — TEUER» im Skript). Die Sperre `_nur_einmal()` gilt seit 19.09.
und hätte zwei Läufe verhindert — aber nur bei gleichem Lock-Pfad.

## Was das Ledger jetzt sagt
```
grep -c "drafts15" dropship/_cj_verfuegbarkeit.txt      # 15
```
9 Zeilen `ok … zurueckgeholt-2026-09-23 drafts15-Nachpruefung mit Klingen-Tor (…)`, 6 Zeilen `bei-cj-weg … nachgeprueft-2026-09-23 drafts15 (…)`.

## Prüfbefehl
```
cd /home/user/aban-news-landing && python3 -c "
import json,subprocess;T=open('/tmp/cj_shop_token.txt').read().strip()
I=['15507663389057','15448588517761','15448610341249','15448669749633','15448756617601','15448876581249','15448892080513','15449424953729','15449425215873','15449425412481','15449425478017','15449425871233','15449426690433','15449427018113','15449427280257']
r=subprocess.run(['curl','-s','https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json','-H','X-Shopify-Access-Token: '+T,'-H','Content-Type: application/json','-d',json.dumps({'query':'query(\$i:[ID!]!){nodes(ids:\$i){... on Product{id status tags}}}','variables':{'i':['gid://shopify/Product/'+x for x in I]}})],capture_output=True,text=True)
L=open('dropship/_cj_verfuegbarkeit.txt').read()
[print(n['id'][-14:],n['status'],'tag' if 'cj-nicht-mehr-verfuegbar' in n['tags'] else '-','ledger',L.count(n['id']+'\t')) for n in json.loads(r.stdout)['data']['nodes']]"
```
Erwartung: 9× `ACTIVE - ledger 1`, 6× `DRAFT tag ledger 1`.
