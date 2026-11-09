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

## Nicht gemessen / Grenzen
- Die Wirkung auf echten Geräten (Safari, Handy) ist nicht gemessen; gemessen wurde in Chromium (Desktop).
- Die Sperre selbst (Review-Gate, Freigabe der drei Produkte) ist Sache der Codex-Rolloutkette und unverändert.
- Auswirkung der Einfrierung auf Käufe oder Google (Core Web Vitals, Indexierung dieser Seiten) unbekannt.
