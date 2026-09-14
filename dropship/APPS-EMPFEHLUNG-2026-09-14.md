# APPS — was der Shop braucht, was er hat, was Ballast ist (14.09.2026, 20:30 UTC)

Betreiber: «suche apps die ich brauchen kann». Marken: GEMESSEN = hier nachgeprüft · QUELLE = fremde Angabe.
Randbedingungen: Basic-Plan, «alles kostenlos», Kurs Conversion statt Menge, Dateispeicher voll.

## 1. Bestand (GEMESSEN, Admin-API + Storefront-HTML)
- **33 Apps installiert**, davon wirken auf der Seite nur **4**: Judge.me (App-Embed), Microsoft Clarity (Embed, aktiv),
  UpPromote (Embed + Script), **Hextom Currency Converter (Script auf jeder Seite)**. Sticky-Cart-Embed (SEOWILL) ist AUS,
  Google-&-YouTube-Widget AUS. Klaviyo läuft nur über das eigene Popup (`lx_popup_v1`, Liste T2VHfu).
- **Chat: «Messaging»/Shopify Inbox ist INSTALLIERT, aber kein Chat-Embed aktiv** (`chat_widget ✗` auf allen Seiten).
  Chatty ist nur als Tracking-Pixel da.
- Feature-Matrix Produktseite (tools/shop_vergleich.mjs): Sticky-Kaufknopf ✔, Cross-Sell ✔, Accordion ✔, Zahlungslogos 6,
  TWINT/Rechnung ✔, Bewertungen ✔, Newsletter ✔ — fehlt: Chat ✗, Video ✗, Telefon/WhatsApp ✗, Produkt-FAQ ✗.

## 2. Aktivieren statt installieren (kostenlos, schon da)
| # | App | Was | Wer |
|---|---|---|---|
| 1 | **Shopify Inbox** | Theme-Editor → App-Embeds → «Online store chat» einschalten, Begrüssung «Hoi! Fragen zu Versand, Grösse oder Rückgabe? Wir antworten innert 24 h.» | Betreiber/Cowork (App-Embed-UUID nicht per API ermittelbar) |
| 2 | **Microsoft Clarity** | läuft schon — Aufzeichnungen der 12 Warenkorb-Sitzungen ansehen (wo bricht es ab?) | Betreiber (Clarity-Login) |
| 3 | **Shopify Forms / Klaviyo** | Popup existiert (eigenes JS); 3 Abonnenten bei 1'498 Kunden → Popup-Timing prüfen (Clarity) | ich, nach Clarity-Befund |
| 4 | **Shopify Flow** | installiert; Kandidat: «Warenkorb ohne Kauf → Tag» für Klaviyo-Strecke — nur wenn die Strecke nachweislich versendet | ich |

## 3. Neue Apps — nur wo eine gemessene Lücke ist
| Lücke (GEMESSEN) | Empfehlung | Kosten | Urteil |
|---|---|---|---|
| Produkt-FAQ fehlt | **keine App** — Metafeld + Theme-Accordion (Horizon kann Accordion-Blöcke), 0 Script-Gewicht | 0 | selbst bauen |
| Vertrauenssiegel | **keine App** — 6 Zahlungslogos, TWINT/Klarna, Schweiz-Signal sind schon da | 0 | nichts tun |
| Upsell/Cross-Sell | Search & Discovery liefert «Ähnliche Produkte» (✔) | 0 | nichts tun |
| Zurück-im-Lager | unnötig — Dropship, `inventoryPolicy CONTINUE` | — | nichts tun |
| Gratis-Versand-Balken im Warenkorb (CHF 50) | Horizon-Warenkorb hat den Block «Versandfortschritt»? — prüfen, sonst 20 Zeilen Liquid | 0 | prüfen, selbst bauen |
| Video auf Produktseite | CJ-Videos hängen als Media an 126 Produkten (Video-Deckel) — Theme-Block, keine App | 0 | nichts tun |
QUELLE (Listen wie delightchat/yotpo/cartylabs sind Werbung): «Trust Badges Bear», «Cartylabs Checkout Upsell», «Back in Stock»
— alle drei decken Lücken, die hier nicht gemessen sind. **Keine dieser Apps installieren.**

## 4. Ballast entfernen (Betreiber-Klick; nie: autopilot2, Judge.me, Printful, CJ, Klaviyo, Clarity, Search & Discovery, Flow, Forms, Swiss Post Labels)
| App | Grund |
|---|---|
| **Hextom Currency Converter** | Shop hat EINEN Markt (CH, CHF). Lädt `multicurrencyconverter.js` auf jeder Seite (42 Fundstellen auf der Produktseite) für nichts. |
| Spocket, DropCommerce, Gelato, Printify, WAZP+, DSers, Collective, SimGym, Marketplace Connect, Shopwaive, MetaShop, Magik Auto Post, Track123 | kein Script auf der Seite (harmlos), aber Datenzugriff ohne Nutzung — Hygiene. Vorher je App im Admin «letzte Aktivität» ansehen. |
| UpPromote | **behalten**, solange die Seite `/pages/influencer-partner` (28 Sitzungen/30 T.) das Affiliate-Formular braucht. |
| SEOWILL Sticky Cart | Embed ist aus, Horizon hat den Sticky-Kaufknopf selbst (✔) → deinstallieren. |

## 5. Lehre
33 Apps, 4 wirken, 1 schadet, 1 fehlt eingeschaltet. **Vor jeder App-Suche den Bestand messen** — die meiste
Wirkung liegt im Einschalten (Inbox) und Ausschalten (Hextom), nicht im Installieren.
