# Leere Kollektionen — die Frage «Entwurf oder fix» hat eine dritte Antwort (15.09.2026)

Betreiber: «118 von 518 in entwurf? oder fix». **Gemessen: 116 davon sind längst weder das eine
noch das andere — sie sind für Kunden gar nicht sichtbar.**

## Die entscheidende Zahl

| Von den 118 leeren Kollektionen | Anzahl |
|---|---|
| im **Onlineshop veröffentlicht** (eine Kundin kann sie öffnen) | **2** |
| nicht veröffentlicht, nur im Admin sichtbar | **116** |

Damit ist der grösste Teil der Frage erledigt, bevor man sie beantwortet. Die 55 Markenregale
(Michael Kors, Swatch, Adidas …), die ich am Morgen zum Abmelden vorgeschlagen hatte, **waren nie
angemeldet**. Sie kosten keinen Verkehr, verwirren keine Kundin und stehen in keinem Menü. Sie
liegen im Admin herum, mehr nicht.

## Die zwei echten Fälle — beide am 15.09. erledigt

| Kollektion | Was war | Was gemacht wurde |
|---|---|---|
| `tiktok-ads-ready` «Im Video vorgestellt» | 7 Produkte, alle Entwurf; der Text bewarb Herrenuhr, Slim Wallet und Steamer, die es nicht mehr gibt | aus dem Onlineshop genommen, 301 auf `/collections/viral-hits` (1'192 aktiv) |
| `angebote` «Angebote & Deals» | Regel «Preis reduziert»; 351 Mitglieder, **0 aktiv** — derzeit ist nichts reduziert | aus dem Onlineshop genommen, 301 auf `/collections/bestseller` |

Bei `angebote` wäre «füllen» der falsche Weg gewesen: Die Kollektion ist richtig gebaut, sie ist
leer, weil gerade nichts im Angebot ist. Sie mit erfundenen Streichpreisen zu füllen wäre
Schein-Rabatt und verstösst gegen das Lauterkeitsrecht und gegen die Hausregel. Kommt wieder etwas
ins Angebot, füllt sie sich von selbst; dann gehört sie zurück in den Shop.

## Was auf dem Weg dahin gefunden wurde

**1. Füllbar heisst selten füllbar.** Die erste Messung mit Titelwörtern meldete 39 füllbare
Kollektionen. Mit dem Merkmal, das die Kollektion selbst definiert, waren es 18. Der Unterschied
sind Wörter wie «Herren» (4'711 Treffer) oder «Damen» (2'487), die nichts über eine Kategorie sagen.

**2. Shopify kennt keine Wortgrenze.** Von den 18 blieben nach der Stichprobe vier übrig:

| Suchwort | was es fälschlich trifft |
|---|---|
| maker | Waffel-Maker, Sandwich-Maker, Smoothie-Maker — **alle sechs Stichproben**, kein einziges Maker-Elektronikteil |
| Bar | Ohrringe «Barque», «Schoggi Bar»-Tasse, Pilates Bar |
| velo | Velours-Cap, Sneaker «Velocità» |
| kaffee | Daunenjacke «Kaffeebraun», Kaffee-Nagelsticker |
| beauty | Jumpsuit mit «Beauty-Rücken» |
| Smart Home | «Nice Smart» Gemüseschneider |
| klima | Halsschal für klimatisierte Räume, Haustierbett |

`title:Velo` ohne Sternchen liefert **0** — die Suche ohne Wildcard hilft nicht.

**3. Sechs der leeren Kollektionen sind Schatten-Zwillinge.** Dieselbe Kategorie existiert zweimal:
einmal über `TAG EQUALS x`, einmal über `TITLE CONTAINS x`. Die Titel-Variante füllt sich selbst
und steht im Menü, die Tag-Variante bleibt leer, weil niemand taggt.

| leer (Tag-Regel) | funktionierender Zwilling (Titel-Regel) | aktiv |
|---|---|---|
| `vasen` | `sub-deko` «Vasen & Deko» | 279 |
| `ladegeraete` | `handy-zubehoer` / `elektronik-laden` | 639 / 718 |
| `smart-home-sub` | `smart-home-gadgets` | 87 |
| `e-scooter-trottinett` | `hightech-gadgets` | 295 |
| `beamer-projektoren` | `beamer-heimkino` | 28 |
| `solar-gartenlicht` | `garten-leuchten` | 7 |

Ich hatte begonnen, genau diese zu füllen, und nach 143 Produkten gestoppt. Die vergebenen Tags
(«Ladegerät» auf Ladegeräte) sind sachlich richtig und bleiben; sie schaden nicht. Aber die
Kollektionen selbst brauchen keine Füllung, sondern bleiben unveröffentlicht.

## Was zu tun bleibt

**Nichts Dringendes.** Die 116 unveröffentlichten Kollektionen kosten nichts. Wer sie später
aufräumen will, kann das tun; es ist Ordnung im Admin, kein Kundenproblem. Zwei Dinge lohnen sich,
wenn wieder Zeit ist:

1. `angebote` zurück in den Shop holen, sobald wieder Ware reduziert ist. Ein Wächter könnte das
   selbst tun: Regel «Preis reduziert» zählen, bei ≥8 veröffentlichen, bei 0 abmelden.
2. Die sechs Zwillingspaare zusammenführen, damit nicht zwei Kollektionen dasselbe meinen.

## Werkzeug

`automation/leere_kategorien_fuellen.py` trägt die geprüften Paare aus Suchwort und Tag und
dokumentiert im Kopf jede verworfene Kombination mit dem Grund. `DRY=1` zeigt nur.
