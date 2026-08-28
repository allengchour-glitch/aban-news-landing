# Aufträge für Claude Cowork (Stand 28.08.2026)

Diese fünf Aufgaben lassen sich aus der Cloud-Session **nicht** erledigen — sie sind Klicks in
fremden Web-Konsolen. Mit Cowork + «Computer use» (Einstellungen → General, nur Pro/Max)
kann Claude sie am Bildschirm ausführen. Jeder Block ist so geschrieben, dass er direkt
weitergegeben werden kann.

⚠️ Reihenfolge nach Wirkung sortiert. Zugangsdaten NICHT in den Auftragstext schreiben —
Cowork soll die bereits angemeldete Sitzung im Browser benutzen.

---

## 1. Judge.me: Bewertungs-Anfragemails abstellen
> Öffne die Judge.me-Konsole für den Shop au3j0y-hq.myshopify.com.
> Gehe zu **Settings → Request scheduling → Request Timing**.
> Entferne die Häkchen bei allen drei Bestellarten (domestic, international, POS) und
> speichere. Bestätige mir danach, dass alle drei aus sind.
>
> Hintergrund: Es gibt drei getrennte Schalter; die Mails hören erst auf, wenn alle drei aus
> sind. Bereits eingeplante, noch nicht versendete Anfragen entfallen dabei mit; schon
> verschickte lassen sich nicht zurückholen.

## 2. Klaviyo: tote Domain aus den Mails nehmen  ⭐ grösster stiller Verlust
> Öffne Klaviyo. Suche in allen Flows und Kampagnen-Vorlagen nach Links auf
> **luxestyle.com.co** und ersetze die Domain durch **luxestyle.ch**.
>
> Hintergrund: `luxestyle.com.co` ist tot (DNS zeigt nicht mehr auf Shopify,
> ERR_CONNECTION_CLOSED). Jede Klaviyo-Mail mit diesem Link führt Kundinnen ins Leere, und
> keine Statistik weist das je als Kaufabbruch aus.
>
> **Wirksamer, falls die Domain noch dem Betreiber gehört:** Statt jede Vorlage zu ändern,
> `luxestyle.com.co` per DNS auf Shopify zeigen lassen und in Shopify als
> Weiterleitungs-Domain eintragen. Das rettet mit EINER Änderung auch alle bereits
> verschickten Mails und alten Social-Posts.

## 3. Google Merchant Center: Zielland auf Schweiz
> Öffne das Google Merchant Center für luxestyle.ch und stelle das Ziel-/Versandland des
> Feeds auf **nur Schweiz**.
>
> Hintergrund: Der Shop hat genau EINEN aktiven Markt (Switzerland). Zeigt der Feed auf
> Deutschland, meldet Merchant «Missing shipping info» für Ware, die dorthin gar nicht
> verkauft werden kann. Google ist der einzige Kanal mit belegten Verkäufen.

## 4. Schlüssel dauerhaft hinterlegen
> Trage in den Claude-Umgebungs-Einstellungen (nicht in eine Datei im Repo — das Repo ist
> öffentlich) folgende Variablen ein:
> `JUDGEME_PRIVATE_TOKEN`, `JUDGEME_PUBLIC_TOKEN`, `JUDGEME_SHOP_DOMAIN`
>
> Hintergrund: Sie liegen derzeit nur unter `/tmp/judgeme.env`. Der Container stellt
> regelmässig einen alten Snapshot her, und `/tmp` wird dabei mit zurückgedreht — die Token
> waren am 28.08. schon einmal weg. Ohne sie endet der tägliche Bewertungs-Import als No-op.

## 5. TikTok: Freigabe der App «luxe» nachfassen
> Prüfe im TikTok-Developer-Portal den Review-Status der App «luxe»
> (Client-Key awhvghmn5q2oh91i, seit 18.08. in Review für Login Kit + Content Posting API).
> Falls freigegeben: Bescheid geben, dann kann der Reel-Versand automatisiert werden.
> ⚠️ Das Client-Secret stand einmal im Chat — im Portal rotieren lassen.

---

## Was Cowork NICHT übernehmen sollte

- **Die Motoren dieser Session** (4 CJ-Runner, Aufseher, 23 tägliche Wächter) brauchen einen
  dauerhaft laufenden Container. Cowork ist eine Arbeitsoberfläche, kein Ersatz dafür.
- **Bewertungen löschen oder schreiben.** Bewertungen sind Kundentext; es werden weder
  welche erfunden noch bestehende umgeschrieben oder übersetzt.
- **Preisentscheidungen.** Die 102 Produkte, die in jedem Warenkorb Geld kosten, sind eine
  Geschäftsentscheidung des Betreibers (`dropship/PREIS-ALTBESTAND-ENTSCHEID.md`).
