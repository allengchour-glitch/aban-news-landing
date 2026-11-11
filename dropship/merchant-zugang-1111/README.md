# Merchant Center für Claude lesbar machen (11.11.2026)

Besitzer 11.11.: «kannst du merchant auch wie codex» → auf meine Frage «Beides» (BigQuery zum täglichen Lesen und das
Google-Dienstkonto für spätere Änderungen; jede Änderung nur nach seinem Ja).

## Gemessen (11.11. 18:03 UTC, Workflow `merchant-probe.yml`, Lauf 43074063351, nur lesend)

- Das Dienstkonto `abannews@aban-imagen.iam.gserviceaccount.com` (Secret `GCP_SA_KEY`, Projekt `aban-imagen`,
  Nr. 392921573891) meldet sich an.
- Merchant API: HTTP 403 `SERVICE_DISABLED` (im Projekt ausgeschaltet). Content API: ebenso. Ob das Dienstkonto im
  Merchant Center eingetragen ist, ist darum noch nicht messbar.
- BigQuery: der Anschluss dieser Sitzung (Konto des Besitzers) kann im Projekt `aban-imagen` lesen und schreiben.
  Angelegt (18:0x UTC): Dataset `aban-imagen.merchant_center`, Region EU, Tabellenteile verfallen nach 35 Tagen
  (Speicher bleibt klein). Rücknahme: `DROP SCHEMA \`aban-imagen.merchant_center\` CASCADE`.

## Was der Besitzer einmal tun muss (rund 5 Minuten, am PC einfacher als am Handy)

1. **Merchant API einschalten:** https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=392921573891
   → «Aktivieren».
2. **BigQuery Data Transfer API einschalten:** https://console.cloud.google.com/apis/library/bigquerydatatransfer.googleapis.com?project=aban-imagen
   → «Aktivieren».
3. **Dienstkonto im Merchant Center eintragen:** Merchant Center → Zahnrad (Einstellungen) → «Personen und Zugriff» →
   «Person hinzufügen» → `abannews@aban-imagen.iam.gserviceaccount.com` → Zugriff **Standard** → speichern.
4. **Tägliche Übertragung anlegen:** https://console.cloud.google.com/bigquery/transfers?project=aban-imagen →
   «Übertragung erstellen» → Quelle **Google Merchant Center** → Name «Merchant täglich» → Wiederholung **Täglich** →
   Ziel-Dataset **merchant_center** → Merchant-ID (Zahl oben rechts im Merchant Center) → Bericht **Products / product
   issues** anhaken → Dienstkonto `abannews@…` wählen → Speichern.
   Der erste Lauf kann mit «No data to transfer found … wait for up to a day» enden: laut Google normal, der nächste
   Lauf läuft.
5. Die Merchant-ID an Claude schicken (sie ist keine Geheimzahl, gehört aber nicht in öffentliche Logs).

## Kosten (QUELLE cloud.google.com/bigquery/pricing, gelesen 11.11.)

Die Übertragung «Google Merchant Center» ist kostenlos («Free connectors … No charge»). BigQuery: 10 GiB Speicher und
1 TiB Abfragen je Monat gratis. Ob im Projekt eine Zahlungsart hinterlegt ist, ist ungemessen.

## Danach (Claude)

- `merchant-probe.yml` von Hand starten: soll «Zugang vorhanden» melden.
- Täglich die Tabelle der Produktprobleme lesen (nur lesen): abgelehnte Artikel je Grund und Land, neue Gründe gegen den
  Vortag, und die Zahlen ins Dashboard «Offene Punkte».
- Änderungen über die Merchant API (z. B. Liechtenstein-Versanddienst, CHF 14.90) nur nach ausdrücklichem Ja, mit
  Trockenlauf, Sicherung und Rücklesen. Die Google-App in Shopify kann eigene Einstellungen überschreiben: vorher messen.
