# Verdorbenes SHOPIFY_CLIENT_SECRET der Umgebung: alle Startwege heilen + Wache für laufende Motoren (15.10.2026, nachgetragen 18.10.)

Marken: **GEMESSEN** = selbst nachgemessen, **BEHAUPTUNG** = ungeprüft.

## Befund (GEMESSEN 15.10. 04:30 UTC)
- Umgebungsvariable `SHOPIFY_CLIENT_SECRET` der Sitzung = **60 Zeichen** (gültig: 38, Einfügefehler). Shopify lehnt jeden
  Client-Credentials-Grant damit ab (HTTP 400); `/tmp/secrets_env.sh` trägt den gültigen Wert.
- `engine_keepalive.sh` prüfte das seit 14.10. — aber nur für das, was es selbst startet. Der SessionStart-Hook `autostart.sh` (läuft bei JEDEM
  Container-Neustart) startete `cj_perpetual`, `cj_queue_runner` und `autocommit` weiter mit dem abgelehnten Wert:
  `cj_category_fill` scheiterte **6'832×** an «shTok: kein Token» (`/tmp/cj_perp.log`).
- Folgen ausserhalb des Grinds: `kollektion_leer`, `textbild_fix`, `google_kanal_saeubern`, `bild_quadrat` meldeten «Shopify antwortet nicht».

## Fix
- `automation/lib/shopify_secret.sh` — EINE Funktion `shopify_secret_heilen [melden]`: weicht der Umgebungswert vom Dateiwert ab, prüft sie
  einmal je Umgebungswert beide per Grant (nur Statuscode, Werte nie ausgegeben, nie in argv; Urteil in `/tmp/_shop_secret_pruef` als
  `<md5_12> DATEI|OK <ts>`) und exportiert bei «Shopify lehnt ab, Datei gültig» den Dateiwert. Setzt `SEC_KORRIGIERT`, `SEC_GEHEILT`.
- Jeder Startweg ruft sie: `autostart.sh` (Hook), `engine_keepalive.sh`. `SEC_KORRIGIERT=1` ersetzt den Aufseher einmal.
- `automation/secret_umgebung_wache.py` (`--selbsttest` 16/16, Standard = Bericht, `--heilen`): liest `/proc/<pid>/environ` der Motoren
  (cj_perpetual, cj_queue_runner), vergleicht per md5-Präfix gegen die abgelehnten Werte, beendet betroffene Motoren (die Startwege starten
  sie mit dem gültigen Wert neu). Ledger `dropship/_secret_umgebung.tsv`; Marke `/tmp/_secret_neustart_autostart`.
- Live belegt 15.10. 04:31 UTC: `cj_perpetual` beendet und neu gestartet, STAND 3 CJ-Runner; seitdem meldet jeder Sitzungsstart
  «[autostart] Shopify-Secret der Umgebung abgelehnt → gültiger Dateiwert für alle Starts».

## Stand 18.10. (GEMESSEN 20:10 UTC)
Keepalive-Zeile: «SECRET-UMGEBUNG: Sitzung trägt den abgelehnten Wert (1 Prozesse)» — nur die Sitzung selbst (ihre Umgebung lässt sich
nicht von innen ändern); alle Motoren tragen den gültigen Wert. 61'466 CJ-Einträge, 3 CJ-Runner.

## Regel
Eine Prüfung, die nur an EINEM Startweg hängt, schützt nur diesen. Wer ein Geheimnis prüft, tut es in einer gemeinsamen Funktion, die JEDER
Startweg ruft — und eine Wache liest, was laufende Prozesse wirklich tragen (`/proc/<pid>/environ`), nie, was die Shell glaubt.

## OFFEN (Betreiber)
Umgebungsvariable `SHOPIFY_CLIENT_SECRET` in den Claude-Umgebungseinstellungen korrigieren (60 → 38 Zeichen, Wert wie in `/tmp/secrets_env.sh`
bzw. im Shopify-Dev-Dashboard). Bis dahin heilt der Code bei jedem Start selbst.
