# Sperre der «Selbst gestalten»-Produkte: Seite fror ein (09.11.2026)

Auftrag des Besitzers 09.11.2026: «printeredt fehler beheben» (meine Auslegung: Fehler im Printful-Editor / auf den «Selbst gestalten»-Seiten beheben).

## Befund (GEMESSEN)
- Alle 17 aktiven «Selbst gestalten»-Seiten mit Playwright (Desktop 1440) geladen. **Magnet (`magnet-zum-selbstgestalten`), Dad-Cap (`dad-cap-selbst-gestalten`) und Bügeltransfer (`buegeltransfer-selbst-gestalten`) laden nie zu Ende**: `page.goto` läuft ins Zeitlimit (60 s), `page.evaluate` antwortet nicht, die Seite blockiert den Hauptthread. Die übrigen Seiten laden normal, der Editor v6.3 startet (`data-init-v6=1`).
- Alle drei sind die Produkte mit der **Sperre statt Editor** («Personalisierung derzeit nicht bestellbar», Review-Gate des Rollouts vom 08.11.). Die Sperre ist ein Block in der Produktbeschreibung (`<!-- lx-v63-editor:start … mode=blocked -->`, Generator `blockerBaustein` in `direct_rollout_lib.mjs`).
- **Ursache:** Das Sperrskript beobachtet den ganzen Seitenbaum (`new MutationObserver(lock).observe(document.documentElement,{childList:true,subtree:true})`). `lock()` setzt bei jedem Lauf `a.textContent=msg`. Jede Zuweisung an `textContent` ist eine `childList`-Mutation, auch bei gleichem Text, und löst den Beobachter erneut aus: **Endlosschleife im Hauptthread, die Seite friert ein.** Besucherinnen konnten diese drei Seiten nicht bedienen.
- **Beweis:** dieselbe Live-Seite (Playwright, Route-Ersetzung): unverändert Zeitlimit nach 25 s; mit der Schutzabfrage `if(a.textContent!==msg)a.textContent=msg;` lädt sie in 3,7 s, die Sperre wirkt (CTA «Personalisierung derzeit nicht bestellbar», Kaufknopf gesperrt).
- Warum es der Test nicht fand: der vorhandene Test verwendete eine Attrappe mit `class MutationObserver { observe() {} }`, die nie auslöst.

## Behoben
1. **Generator** (`direct_rollout_lib.mjs`): `if(a.textContent!==msg)a.textContent=msg;` statt `a.textContent=msg;`. Sonst bleibt der Block gleich.
2. **Test** (`direct_rollout_test.mjs`): neuer Test mit wirklichkeitsnaher Attrappe (jede `textContent`-Zuweisung löst den Beobachter aus, Rundenobergrenze 200): höchstens 2 Zuweisungen, Beobachter beruhigt sich, CTA gesperrt, Kaufknopf gesperrt, Dynamic-Checkout versteckt. **Mutationsprobe:** mit dem alten Code ist dieser Test rot («Beobachter lief 200 Runden ohne Ende»). Test gesamt 22 von 22 bestanden.
3. **Live** (`apply.mjs`): ersetzt in den drei Beschreibungen genau den alten Block durch den neuen (+23 Zeichen je Produkt), mit Sicherung (`sicherung/<handle>.vor.html`), Prüfung auf zwischenzeitliche Änderung (`updatedAt` und Beschreibung), frischem Rücklesen und Idempotenzprüfung (`beschreibungPlanen(...).geaendert === false`, die Bedingung von `direct_rollout.mjs`: Generator und Live-Beschreibung bleiben bytegleich).

## Bedienung
- Trockenlauf: `SHOPIFY_SHOP=au3j0y-hq.myshopify.com node dropship/selbst-gestalten-fertig-0511/rollout-v63-direct/sperre-fix-0911/apply.mjs`
- Live: `LIVE=1 …` (zuerst den Trockenlauf als eigenen Aufruf, Leitplanke).
- Rücknahme: `ZURUECK=1 LIVE=1 …` (nur wenn die Live-Beschreibung den neuen Block trägt). Die Rücknahme stellt den **fehlerhaften** Stand wieder her (die Seiten frieren dann wieder ein); sie ist nur für den Notfall gedacht.


## Live eingespielt und nachgemessen (09.11.2026 ca. 06:20 UTC)
- `apply.mjs` mit `LIVE=1`: alle drei Beschreibungen geschrieben (je +23 Zeichen), frisch zurückgelesen **byte-gleich** dem Plan (SHA-256 alt → neu: Magnet `df9b5459…` → `5ae4c910…`, Dad-Cap `7aecf4af…` → `c970e2d8…`, Bügeltransfer `8a454e9d…` → `e8cd13e7…`), idempotent gegen den Generator, Sicherungen in `sicherung/`.
- **Browser (Playwright, Live-Seiten, Desktop 1440 und Handy 390):** alle drei laden vollständig (`readyState complete`, 4,0 bis 5,8 s), Hauptthread antwortet nach 40 bis 89 ms, Sperrtext gesetzt, Sperrblock vorhanden, neues Skript 3 von 3, altes Skript 0 von 3, kein Seitenüberlauf, 0 Seitenfehler. Vorher: Zeitlimit nach 25 bis 60 s, Hauptthread blockiert.
- Die einzige Konsolenmeldung (HTTP 403) kommt von `shop.app/pay/hop` (Shop-Pay-Rahmen der Plattform), nicht von unserem Code.
- Die Admin-Suche nach «MutationObserver» findet weiter genau diese drei Produkte: richtig, der Beobachter bleibt im Block, jetzt mit Schutzabfrage. Unterscheidendes Merkmal ist die Schutzabfrage `if(a.textContent!==msg)`.

## Unabhängige Prüfung (drei Prüfer vor dem Einspielen, nur lesend)
- **Skript im echten Chromium:** Originalskript friert in 6 von 6 Nachbauten ein (Setter 20 002-mal bis zur Kappe), die Korrektur setzt `textContent` 1-mal, lädt in 14 bis 25 ms; spätere CTA/Formulare werden gesperrt, Fremdformular unberührt, Klick und Submit auf eigene Elemente verhindert (0 Requests an `/cart/add`), 0 Konsolen- und Seitenfehler. **Die Beobachter-Optionen `{childList:true,subtree:true}` sind Teil der Sicherheit: mit `attributes:true` friert die Seite trotz Schutzabfrage wieder ein. Nie erweitern.**
- **Patchplan:** Live-Block gleich Generator in 3 von 3, genau eine Einfügung, `beschreibungPlanen` idempotent, Shopify normalisiert nichts.
- **Dieselbe Fehlerart sonst im Shop:** nein. Repo, MAIN-Theme (524 Textdateien), Seiten (223), Artikel (351), Sammlungen (1 723) und 494 «Selbst gestalten»-Produkte geprüft, sechs Live-Seiten im Browser: Hauptthread überall frei (Latenz 0 bis 28 ms). Einzige Instanz waren diese drei.
- **Bekannte kleine Härtungen, nicht umgesetzt** (würden Generator und Live-Block gemeinsam ändern): Beobachter entprellen (schützt nur gegen ein fremdes Skript, das den CTA-Text aktiv zurücksetzt, nicht vorhanden); CSS-Regel im Block trifft auch Fremdformulare auf der Seite (auf diesen drei Seiten gibt es keins); `layout/theme.liquid` Zeile 571 `fix()` ist ein ungedrosselter Dokumentbeobachter, der nur durch seine Datenlage gegen Ping-Pong geschützt ist (kein Fehler heute).
- **Hinweis:** Die Live-Seiten enthalten im Formular keinen Kaufknopf (0 Buttons, 0 Dynamic-Checkout): live sperrt das Skript nur den CTA-Text, Kaufknopf und Checkout-Sperre sind nur mit Attrappe bewiesen.

## Nicht gemessen / Grenzen
- Die Wirkung auf echten Geräten (Safari, Handy) ist nicht gemessen; gemessen wurde in Chromium (Desktop).
- Die Sperre selbst (Review-Gate, Freigabe der drei Produkte) ist Sache der Codex-Rolloutkette und unverändert.
- Auswirkung der Einfrierung auf Käufe oder Google (Core Web Vitals, Indexierung dieser Seiten) unbekannt.
