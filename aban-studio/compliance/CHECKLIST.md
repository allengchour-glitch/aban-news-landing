# Aban Studio — DSGVO / EU-AI-Act Compliance-Checkliste

Eingebaut ins Design, nicht nachträglich aufgesetzt. Status pflegen, bevor das MVP live geht.

## Datenresidenz & Transfers
- [ ] Supabase Projekt in `eu-central-1` (Frankfurt); Storage-Bucket EU.
- [ ] Fly.io Orchestrator in `fra`.
- [ ] Keine End-Kunden-PII an AI-Provider — nur Thema/Marke senden.
- [ ] US-Provider (OpenAI/Anthropic/ElevenLabs): DPA unterzeichnet, **SCCs + Transfer-Impact-
      Assessment** abgelegt (`SCC-US-transfer.md`, `TIA.md`). Training/Retention-Flags deaktiviert.
- [ ] Bild über **FLUX (Black Forest Labs, Freiburg/EU)** als EU-native Option.

## Einwilligung (Consent)
- [ ] Signup-Checkboxen: ToS, DPA, **expliziter US-Transfer/SCC-Hinweis**, AI-Act-Ack →
      jede Zustimmung als Zeile in `consent_events` (Typ + Version + ip_hash).
- [ ] Transparente Anbieter-Auflistung („welche Daten an welchen Anbieter").

## EU AI Act Artikel 50 (ab 2.8.2026)
- [ ] Jedes Asset maschinenlesbar gelabelt: C2PA-Manifest für Bild/Audio, Marker/Metadaten für Text.
- [ ] Sichtbare „KI-generiert"-Disclosure in allen Exporten (`ai_act_label.export_footer`).
- [ ] Deepfake/synthetische Stimme gekennzeichnet.
- [ ] Disclosure-Wording config-getrieben in `apps/orchestrator/compliance/ai_act_label.py`
      (Kommissions-Leitlinie ~Q2 2026 → 1-Zeilen-Update).

## Betroffenenrechte / Löschung
- [ ] MVP **ohne** persistente User-Vektorstores (umgeht Embedding-Löschproblem).
- [ ] Falls später pgvector: keyed by `user_id`, hartes `DELETE` entfernt Embeddings echt.
- [ ] Account-Löschung = Cascade-Delete aller Zeilen + Purge Storage-Objekte + Stripe-Customer-Delete.
- [ ] Lösch-Runbook gepflegt (`deletion-runbook.md`).

## Dokumentation & TOMs
- [ ] DPA/AVV für B2B-Kunden angeboten (`AVV.md`).
- [ ] ROPA / Verzeichnis von Verarbeitungstätigkeiten gepflegt (`ROPA.md`).
- [ ] TOMs dokumentiert: RLS, Encryption-at-rest (Supabase), signed URLs, least-privilege Keys.

## Steuern / Billing
- [ ] Stripe Tax: DE 19 % USt + EU OSS für grenzüberschreitende B2C-Digitalleistungen.
- [ ] Kleinunternehmer-Grenzen beachtet (€25k Vorjahr / €100k laufend, harte Kappung) —
      `profiles.kleinunternehmer` Flag.

## Web / Tracking
- [ ] Kein Tracking über strikt Nötiges → kein Cookie-Banner.
- [ ] System-Fonts (kein Google Fonts), `_headers`-CSP nur auf eigene API-Origins.
- [ ] Impressum + Datenschutz live (Reuse DE/AT/CH-Templates aus Aban News).

---

*Offene Compliance-Dokumente noch zu erstellen:* `DPA-template.md`, `SCC-US-transfer.md`,
`TIA.md`, `AVV.md`, `ROPA.md`, `deletion-runbook.md`. Vor Live-Gang juristisch prüfen lassen.
