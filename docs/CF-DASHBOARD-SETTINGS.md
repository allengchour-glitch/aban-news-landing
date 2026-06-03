# Cloudflare-Pages — Dashboard-Settings je Projekt

Falls du die Subdomains lieber **manuell im Dashboard** anlegst (statt per
`tools/cf_pages_setup.py`): hier alle Projekte mit den exakten Einstellungen.

**Für jedes Projekt gleich:**
Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → Repo
`aban-news-landing`, Branch **`main`**, Framework preset **None**. Dann die Build-Settings
unten, **Save and Deploy**, danach **Custom domains → Set up a domain**.
Falls der Build meckert: Variable **`PYTHON_VERSION` = `3.11`** setzen.
Die „Connect to Git"-Autorisierung ist nur **einmal** nötig, danach gilt sie für alle.

## 🟢 Schon live — nichts tun
| Projekt | Domain |
|---------|--------|
| ki-tools-radar | radar.abannews.com |
| foerder-radar | foerder.abannews.com |
| jobs-radar | jobs.abannews.com |

## ⬜ Anzulegen
| CF-Projektname | Build command | Output directory | Custom Domain |
|----------------|---------------|------------------|---------------|
| ki-verzeichnis | `cd ki-verzeichnis && python generate.py` | `ki-verzeichnis/dist` | tools.abannews.com |
| pod-shop | `cd pod-shop && python generate.py` | `pod-shop/dist` | shop.abannews.com |
| musik-radar | `cd musik-radar && python generate.py` | `musik-radar/dist` | musik.abannews.com |
| video-radar | `cd video-radar && python generate.py` | `video-radar/dist` | video.abannews.com |
| voice-radar | `cd voice-radar && python generate.py` | `voice-radar/dist` | voice.abannews.com |
| chatbot-radar | `cd chatbot-radar && python generate.py` | `chatbot-radar/dist` | chatbot.abannews.com |
| buchhaltung-radar | `cd buchhaltung-radar && python generate.py` | `buchhaltung-radar/dist` | buchhaltung.abannews.com |
| newsletter-radar | `cd newsletter-radar && python generate.py` | `newsletter-radar/dist` | newsletter.abannews.com |
| dropshipping-radar | `cd dropshipping-radar && python generate.py` | `dropshipping-radar/dist` | dropshipping.abannews.com |
| automatisierung-radar | `cd automatisierung-radar && python generate.py` | `automatisierung-radar/dist` | automatisierung.abannews.com |
| kurse-radar | `cd kurse-radar && python generate.py` | `kurse-radar/dist` | kurse.abannews.com |
| prompts-bibliothek | `cd prompts-bibliothek && python generate.py` | `prompts-bibliothek/dist` | prompts.abannews.com |
| agenturen-radar | `cd agenturen-radar && python generate.py` | `agenturen-radar/dist` | agenturen.abannews.com |

## ⚠️ Erst Daten verifizieren (OSM), dann anlegen
| CF-Projektname | Build command | Output directory | Custom Domain |
|----------------|---------------|------------------|---------------|
| handwerk-radar | `cd handwerk-radar && python generate.py` | `handwerk-radar/dist` | handwerk.abannews.com |

**Tipp:** Mit **ki-verzeichnis (tools.)** anfangen — es bündelt alle Radars und verlinkt
zurück, ist also das Rückgrat fürs SEO.

> Automatisierter Weg (ohne Dashboard, sobald „Connect to Git" einmal autorisiert ist):
> `docs/CF-PAGES-SETUP.md` + `tools/cf_pages_setup.py`.
