# Tore: Abbruch-Mail 2 (10-%-Code) nur an Newsletter-Abonnenten (Betreiber 25.11.2026 «4 ja»)

Flow XEGbTB «Abandoned Checkout · 1 Std», Aktion 120053547 / Nachricht SPNjDp. Mail 1 (VfffLv) bleibt Service-Hinweis für alle.
Sicherung vorher: `dropship/verkauf-2511/klaviyo-xegbtb-vorher.json` (additional_filters: null). Rückweg: Filter in Klaviyo wieder leeren.

- [x] T1: Mail 2 trägt den Filter «E-Mail-Marketing: abonniert» (Klaviyo-Antwort auf update_flow_action 25.11., additional_filters = profile-marketing-consent / email / subscribed, Status live)
    HAND: kein Klaviyo-Schlüssel in der Sitzung (nur Konnektor) — nachprüfen mit get_flow XEGbTB, additional_fields definition
- [ ] T2: Wirkung nach 30 Tagen: Mail 2 nur noch an Abonnenten zugestellt (get_flow_report SPNjDp, Empfänger ≤ Abonnenten unter den Abbrechern)
    HAND: Sitzung misst ab 25.12.
