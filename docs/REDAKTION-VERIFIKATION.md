# Redaktions-Verifikation — ehrlicher Faktencheck der KI-Entwürfe

Viele Radar-Daten tragen `[Redaktion: prüfen]` — ein bewusster Marker: nicht geprüft.
Dieses Doc hält fest, **wie** geprüft wird und **was** schon erledigt ist.

## Prinzip (was geprüft wird — und was nicht)
- **Geprüft & belegbar:** dauerhafte Fakten — existiert das Tool, stimmt die offizielle
  URL, **Firmensitz/Herkunft** + **`eu_lager`**. Quelle: offizielle Seite / Impressum /
  etablierte Profile. Nur dann wird der Marker gehoben.
- **Definition `eu_lager` (laut Daten-Schema `_integritaet`): „EU-/DSGVO-Hosting"** — also
  bietet das Tool EU-/DSGVO-konforme Datenhaltung? `true`, wenn sicher (EU/EWR-Firma hostet
  in der EU **oder** adäquates Land wie die **Schweiz** [Angemessenheitsbeschluss] **oder**
  Anbieter mit dokumentierter EU-Region, z. B. US-SaaS mit EU-Rechenzentrum). `false`, wenn
  klar kein EU-Hosting (z. B. reines US-Hosting). **`null`, wenn unsicher** — lieber ehrlich
  offen als falsch behauptet. (Firmensitz ist ein Indiz, aber nicht gleich Hosting.)
- **Bleibt `null`/ungeprüft:** Preise (`preis_eur`) und Wertungen (`worth_it_score`).
  Die ändern sich laufend bzw. sind subjektiv — die füllt ein Mensch bewusst, nicht
  „per Websuche behauptet". Lieber ehrlich leer als geschönt.

## Erledigt
- **musik-radar (18 Tools):** Firmensitze verifiziert, EU-Flags korrigiert, `aban_note`
  bereinigt (Marker entfernt). Korrekturen u. a.:
  - Endel → Berlin (Endel Sound GmbH) → EU/DACH ✓
  - LALAL.AI → OmniSale GmbH, Zug/Schweiz → DACH, DSGVO-adäquat ✓
  - LANDR → Montreal/Kanada → nicht EU
  - AIVA (Luxemburg) bestätigt; Stable Audio → Stability AI (UK), nicht EU
  - Quellen: jeweilige Firmen-/Profilseiten (siehe Commit-Recherche).

- **webbaukasten-radar (15 Tools):** Firmensitze verifiziert, EU-Flags gesetzt (0 „unbekannt",
  vorher 4), `aban_note`-Marker gehoben. Korrekturen u. a.:
  - Webnode AG → Zürich/Schweiz → `eu_lager=true` (CH DSGVO-adäquat, Hosting in Europa)
  - Wix (Israel) · 10Web (Armenien) → `eu_lager=null` (EU-Datenresidenz unsicher → ehrlich offen)
  - Framer B.V. → Amsterdam/NL ✓ · Softr Platforms GmbH → Berlin/DE ✓ (EU-Hosting)
  - bestätigt EU: Jimdo (Hamburg), IONOS (Montabaur), STRATO (Berlin), one.com (DK), Hostinger (LT);
    bestätigt Nicht-EU (US): Squarespace, Webflow, Durable, Carrd, GoDaddy.
  - Quellen: Northdata/Creditsafe/Dun&Bradstreet, EIF-Armenia/TechCrunch + Firmen-Impressen.
- **buchhaltung-radar (22 Tools):** Firmensitze verifiziert, `aban_note`-Marker gehoben. Fast alle
  sind DACH/EU (deutsche GmbHs, DATEV eG, Agicap/FR, Pleo/DK). Zoho Books → `eu_lager=true`
  (Firma Indien, aber offizielle EU-Rechenzentren Amsterdam/Dublin = DSGVO-Hosting möglich).
  Klar kein EU-Hosting: Xero (NZ), QuickBooks/Intuit (US), FreshBooks (Kanada). Preise/Scores `null`.

- **chatbot-radar (24 Tools):** Firmensitze belegt, Marker gehoben, `eu_lager` nach DSGVO-Hosting:
  EU-Firmen (Cognigy/Parloa/moin.ai/Userlike DE, Crisp FR, Tidio/LiveChat PL, Landbot ES) +
  Anbieter mit belegter EU-Region (Zendesk, Freshchat, HubSpot, Intercom, Dialogflow/Google,
  watsonx/IBM) = `true` (14). Gehedgte „EU-Region prüfen"/keine = `null` (9: Ada, Forethought,
  Drift, Gorgias, Kustomer, Help Scout, Chatbase, Voiceflow, Botpress). ManyChat (US-Hosting) = `false`.

- **voice-radar (22 Tools):** Firmensitze belegt, Marker gehoben. `eu_lager` (DSGVO-Hosting):
  EU = `true` (Amberscript NL, Happy Scribe IE, Noota FR, aTrain/Uni Graz AT, tl;dv GmbH DE);
  US ohne EU-Region = `false` (Otter, Fireflies, Fathom, Descript, Sonix, Rev, Deepgram,
  AssemblyAI, ElevenLabs, Murf); UK/unklar/Self-host-abhängig = `null` (Speechmatics, Trint,
  Krisp, Sembly, Supernormal, OpenAI-Whisper).

- **video-radar (22 Tools):** Firmensitze belegt, Marker gehoben. `eu_lager`: 3 `true`
  (Submagic/FR, Elai/Estland, Google-Veo via Vertex-EU-Region); 13 `false` (US/CN-Generatoren:
  Runway, Pika, Luma, Kling/Kuaishou, Sora, HeyGen, Descript, CapCut/ByteDance, OpusClip,
  Pictory, InVideo, Fliki, Kapwing); 6 `null` (UK/IL/Adobe/Topaz-lokal: Synthesia, D-ID,
  Colossyan, VEED, Adobe Firefly, Topaz).

- **newsletter-radar (21 Tools):** Marker gehoben. `eu_lager`: 9 `true` (CleverReach/rapidmail/
  HubSpot-DE-Region, Brevo/FR, GetResponse/PL, Mailjet/Sinch, KlickTipp-DE-Server, **MailerLite &
  Sender/Litauen**); 8 `false` (US: Mailchimp, Kit, ActiveCampaign, Klaviyo, beehiiv, Substack,
  Buttondown, Loops); 4 `null` (Omnisend, Ghost-Self-host, EmailOctopus/UK, Resend).

- **automatisierung-radar (36 Tools):** Marker gehoben. `eu_lager`: 10 `true` (DE-GmbHs n8n/
  Camunda/Bryter/SeaTable/Locoia/Konfuzio, Make/Celonis, + Power Automate & Azure Logic Apps
  [Azure-EU-Region], Zoho Flow [EU-DC]); 13 `false` (US/IN: Zapier, Pipedream, IFTTT, Bardeen,
  Gumloop, Lindy, Relay, Parabola, Pabbly, Integrately, Inngest, Axiom, Magical); 13 `null`
  (Self-host/Enterprise-iPaaS mit unklarer EU-Region: Activepieces, Workato, Tray, UiPath, AA,
  Albato, Latenode, Boomi, Celigo, Cyclr/UK, Windmill, Trigger.dev/UK, Temporal).

- **dropshipping-radar (22 Tools):** Marker gehoben. Hier meint `eu_lager` = **EU-Warenlager**:
  5 `true` (BigBuy/ES, vidaXL/NL, Printful, Gelato, Brandsdistribution/IT), 4 `false` (US-Lager:
  DSers/AliExpress, Zendrop, Sellvia, Trendsi), 13 `null` (Plattformen/Marktplätze ohne eigenes
  Lager bzw. gemischte Standorte: Shopify, WooCommerce, Spocket, Syncee, CJ, Printify u. a.).

- **data/tools.json (Haupt-Tool-Liste):** Bei den 33 markierten Einträgen `eu_lager` für eindeutige
  Fälle gesetzt — 8 `true` (EU: Mistral/Le Chat·FR, Freepik·ES, Magnific·ES, Submagic·FR, Dust·FR,
  Systeme.io·FR, Tana·NO, mymind·AT), 11 `false` (US/CN: Poe, Lindy, Coda, Luma, Kling, Hailuo,
  OpusClip, Gumloop, Relay, Zed, Devin). **Marker bleiben**, weil sie „prüfen & *bewerten*" lauten —
  die Bewertung (`worth_it_score`) ist subjektiv und bleibt `null` (kein Vortäuschen).

## Offen (für einen Menschen)
- **Bewertungen (`worth_it_score`) & Preise (`preis_eur`)** überall — bewusst `null`, bis ein Mensch
  sie real setzt. KI verifiziert nur dauerhafte Fakten, erfindet keine Zahlen.
+ `data/tools.json`. Pro Radar: Herkunft/URL prüfen, EU-Flag setzen, Marker heben;
Preise/Scores bewusst `null` lassen.

> Merksatz: Verifikation heißt **belegbare, dauerhafte Fakten** bestätigen — nicht
> volatile Zahlen erfinden. Genau das ist der aban-Unterschied.
