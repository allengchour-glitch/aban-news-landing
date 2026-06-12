# 📌 Pinterest-Setup für LuxeStyle CH — Gratis-Dauertraffic

> **Warum Pinterest?** Pinterest ist eine **Suchmaschine**, kein Social-Feed. Ein Pin lebt
> **Monate bis Jahre** (ein TikTok ist nach 48 h tot). Für Mode, Schmuck, Deko & Geschenke ist
> es der beste Gratis-Kanal, der **im Hintergrund weiterläuft**, während du an anderem arbeitest.
> Realistisch: erster spürbarer Traffic nach **4–8 Wochen**, dann konstant & wachsend.

---

## ✅ Schritt 1 — Business-Konto (einmalig, ~15 Min) · NUR DU

1. Gehe auf **pinterest.com/business/create** → kostenloses Business-Konto erstellen
   (oder bestehendes Privatkonto unter Einstellungen → „Zu Business-Konto wechseln").
2. **Profil ausfüllen:** Name **„LuxeStyle CH"**, Bio:
   > *Schweizer Online-Shop für Mode, Schmuck & Lifestyle 🇨🇭 Faire Preise, weltweiter Versand. −10 % mit WELCOME10.*
3. **Website beanspruchen (claimen):** Einstellungen → **„Beanspruchte Konten"** → `luxestyle.ch`
   eintragen → Pinterest gibt dir ein Meta-Tag oder eine HTML-Datei. *(Wenn du den Theme-Code
   nicht anfassen willst: sag mir Bescheid, dann baue ich das Meta-Tag in den Shopify-Header ein.)*
   → Claimen schaltet **Rich Pins** frei (Preis + „Auf Lager" direkt im Pin = mehr Klicks).
4. *(Optional, später)* **Pinterest-Shopify-App** installieren → synchronisiert den ganzen Katalog
   automatisch als „Produkt-Pins". Aber: die kuratierten Pins unten konvertieren besser, weil sie
   SEO-Texte + Hashtags haben. Beides parallel ist ideal.

---

## ✅ Schritt 2 — Boards anlegen (~10 Min) · NUR DU

Lege diese **6 Boards** an (jeweils 1 Satz Beschreibung mit Keywords — wichtig fürs Ranking):

| Board | Beschreibung (Keywords!) |
|---|---|
| **Sommerkleider & Damenmode 2026** | Luftige Sommerkleider, Boho-Looks & Damenmode aus der Schweiz. Faire Preise, weltweiter Versand. |
| **Schuhe & Sandalen** | Sandaletten, Sneaker, Ballerinas & Pumps für den Sommer. Schweizer Online-Shop LuxeStyle. |
| **Schmuck & Accessoires** | Ketten, Ohrringe, Armreife & Sonnenbrillen. Eleganter Schmuck zu fairen Preisen. |
| **Herrenmode Schweiz** | Sommerhemden, Sneaker, Sets & Jeans für Männer. Cleaner Look, faire Preise. |
| **Wellness & Beauty** | Gua-Sha, Serum, Masken & Diffuser für Selfcare zuhause. Schweizer Shop. |
| **Home & Geschenkideen** | Deko, Vasen, Kerzenwärmer & Geschenke. Schöne Dinge fürs Zuhause. |

---

## ✅ Schritt 3 — Pins hochladen (die CSV macht die Arbeit)

Ich habe dir **`dropship/pinterest_pins.csv`** gebaut — **103 fertige, gebrandete Pins** (Markenband +
Preis-Anker + WELCOME10-Pill, gehostet auf der Shopify-CDN) mit SEO-Titel, Beschreibung + Hashtags und
direktem Link zur Produktseite. Verteilung: Schmuck/Accessoires 26 · Herrenmode 20 · Home/Geschenke 20 ·
Damenmode/Kleider 17 · Schuhe 11 · Wellness/Beauty 9.

> **Vollautomatisch (empfohlen):** `automation/pinterest_publish.mjs` + Workflow `pinterest-publish.yml`
> posten die Pins per Pinterest-API selbst (Mo & Do je 5). Du brauchst nur einmal ein Secret — entweder
> `PINTEREST_ACCESS_TOKEN`, oder besser `PINTEREST_REFRESH_TOKEN` + `PINTEREST_APP_ID` + `PINTEREST_APP_SECRET`
> (dann holt sich das Skript den Token bei jedem Lauf frisch → läuft nie ab). Manuell geht weiterhin so:

**So lädst du sie hoch (2 Wege):**

- **A) Pinterest-Bulk-Upload (am schnellsten):** Pinterest Business-Konto → **„Erstellen" →
  „Pins per Masseneinträge erstellen"** (Bulk create) → CSV hochladen. Pinterest liest Titel,
  Bild-URL, Board, Beschreibung, Link & Keywords automatisch. *(Falls dein Konto den Bulk-Upload
  noch nicht zeigt: er wird nach ein paar Tagen Kontoalter freigeschaltet — bis dahin Weg B.)*
- **B) Manuell / geplant:** „Pin erstellen" → Bild + Titel + Beschreibung + Link aus der CSV
  kopieren → Board wählen → **„Später veröffentlichen"** und Datum setzen. So planst du eine
  ganze Woche in 20 Min vor.

> **Tempo:** **3–5 Pins/Tag**, gestaffelt — nicht alle 71 auf einmal (sieht für Pinterest nach
> Spam aus). Die Automation drosselt das automatisch. Vorrat reicht für ~3–5 Wochen. Sag „mehr Pins",
> dann baue ich weitere aus dem Katalog.

---

## ✅ Schritt 4 — Dranbleiben (Routine)

- **2×/Woche** je 5 Pins planen (immer neue Produkte + saisonale Keywords).
- Eigene Pins gelegentlich auf passende Boards **re-pinnen**, fremde gute Mode-Pins mit-pinnen
  (macht das Profil aktiv → Algo mag das).
- Nach 4–8 Wochen: in **Pinterest Analytics** schauen, welche Pins Klicks bringen → davon mehr.

---

## Was ich liefere vs. was nur du kannst
- ✅ **Ich:** Board-Struktur, SEO-Pin-Texte, Hashtags, Bild-Auswahl, die fertige CSV, Meta-Tag-Einbau
  in den Shop (auf Wunsch), Nachschub-Pins.
- 🙋 **Nur du:** Konto erstellen, Website claimen (1 Klick im Shop oder Bescheid geben), CSV hochladen
  bzw. Pins planen.

---
*Erstellt 2026-06-12 · Quelle-Produkte live aus dem Shop gezogen · Branch `claude/luxstyle-ads-search-5i68xa`*
