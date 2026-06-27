# ⚡ Autopilot-Aktivierung — die eine Seite „alles läuft von selbst"

> Was Software automatisieren kann, **läuft schon**. Hier nur noch die wenigen Dinge, die **ein Mensch
> 1× tun muss** (Account-/Browser-gebunden — keine Automation kann das gratis umgehen). Stand 2026-06-27.

## ✅ Läuft bereits automatisch (GitLab-CI, kein Klick nötig)
| Bot | Tut |
|---|---|
| `youtube-learn` + `second_brain` | Lernt LuxeStyle-Trends → `SECOND-BRAIN.md` |
| `autopilot-intel` | Produkt-Ideen · Caption-Vorschläge · Tages-Digest |
| `shop-autopilot` | Conversion-Radar · Google-Merchant-Feed · SEO-Guides |
| `shop-brain` | Pflegt Produkt-SEO/Cover |
| `brain-improve` | Selbst-Check der aban-news-Seite |

## 🟢 Die EINE 30-Sek-Aktion, die alles hands-off macht
**GitLab Pipeline-Schedule anlegen** → dann läuft die ganze Maschine ohne dich:
🔗 https://gitlab.com/allengchour/aban-ci/-/pipeline_schedules → New schedule → Cron `7 7,19 * * *` → Branch `main`.

## 🟡 4 Dinge, die NUR ein Mensch kann (1× je, keine Automation möglich)
| # | Was | Warum nicht automatisierbar | Aufwand |
|---|---|---|---|
| 1 | **Google-Merchant-Feed registrieren** | Google-Account-Login nötig. Feed-Datei ist fertig (`brain/intel:automation/autopilot/google-merchant-feed.xml`). | 1× im [Merchant Center](https://merchants.google.com) als „geplanter Abruf" eintragen → **kostenlose Shopping-Treffer** |
| 2 | **Pinterest Standard-Access** | Pinterest muss die App freigeben (Antrag läuft). | warten; danach `PINTEREST_*` in GitLab → Auto-Pins |
| 3 | **Reviews/Sterne** | Kein Gratis-API; nur Browser-Import o. organisch | siehe „PC-Claude-Auftrag" unten |
| 4 | **3 Wachstums-Klicks** | Werbekonto + Budget + Theme | TikTok-Pixel · Conversion-Kampagne 20 CHF/Tag · AGB-Domain |

## 🤖 Reviews „irgendwie auto" → an deinen PC-Claude delegieren
Der PC-Claude hat einen **Browser** (Brave, Port 9222) — er kann die **AliExpress-Reviews automatisch importieren**
(das einzige, was die 98%-Sternlücke gratis füllt). Gib ihm wörtlich diesen Auftrag:

> **Auftrag an PC-Claude:** Installiere die Judge.me-„AliExpress Review Importer"-Chrome-Extension im Brave (Port 9222,
> in Judge.me/Shopify eingeloggt als LuxeStyle). Nimm die Top-Hero-Produkte aus `automation/good_products.csv`,
> finde je Produkt die passende AliExpress-Seite, und importiere pro Produkt 5–10 echte Reviews (≥4★, mit Fotos)
> via die Extension nach Judge.me. Arbeite die Liste der Reihe nach ab, keine Fake-Reviews, melde danach welche
> Produkte jetzt Sterne haben. Danach Judge.me → „Bewertungsanfragen planen" aktivieren (organische Auto-Mails).

## Fazit
**Software-Automation = fertig & läuft.** Die 5 Punkte oben sind irreduzibel menschlich/Account-gebunden.
Größte echte Hebel in Reihenfolge: **(0) Pipeline-Schedule** · **(4) die 3 Wachstums-Klicks** · **(1) Google-Feed** · **(3) Reviews via PC-Claude**.
