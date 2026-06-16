# aban news — Kurzbefehle. `make` oder `make help` zeigt alles.
# Lokal laufende Wartungs-Tools (keine Keys nötig). Posten/Bilder laufen in CI
# (GitHub Actions, weil dort die Secrets liegen).
.DEFAULT_GOAL := help
PY := python3

.PHONY: help status audit consistency links growth funnel related cta leadmagnets sharekit og all-content check

help:  ## Diese Übersicht
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

status:  ## Ein-Blick-Status (Queues, Bild-/CTA-Abdeckung, Audits)
	@$(PY) tools/status.py

audit: growth consistency links  ## Alle Audits nacheinander

growth:  ## Wachstums-Audit → reports/GROWTH-AUDIT.md
	@$(PY) tools/growth_audit.py

consistency:  ## Preise/Garantie prüfen → reports/CONSISTENCY.md
	@$(PY) tools/consistency_check.py

links:  ## Interne Links prüfen
	@$(PY) tools/check_internal_links.py

funnel:  ## Funnel-Block in allen Hubs aktualisieren (idempotent)
	@$(PY) tools/add_branchen_funnel.py

related:  ## Verwandte Branchen + Themen verlinken
	@$(PY) tools/related_hubs.py && $(PY) tools/related_themen.py

cta:  ## Newsletter-CTA in Content-Seiten ergänzen
	@$(PY) tools/add_newsletter_cta.py

leadmagnets:  ## Branchen-PDFs (alle Hubs) bauen + verlinken
	@$(PY) automation/generate_branchen_pdfs.py --all

sharekit:  ## Share-Kit (Copy-Paste-Posts) neu erzeugen
	@$(PY) tools/share_kit.py

og:  ## OG-/Money-Bilder neu rendern
	@$(PY) generate_og_images.py

all-content: funnel related cta leadmagnets sharekit growth  ## Alles Inhaltliche frisch erzeugen

check: consistency links  ## Schnell-Check vor dem Commit
	@echo "✓ Check fertig."

qa: consistency links  ## Voll-QA: HTML-Standards + Links + Konsistenz + Brain-Score
	@npx html-validate index.html marktplatz.html immobilien.html inserate.html angebote-suche.html auto-suche.html stellenangebote.html 2>/dev/null || echo "ℹ html-validate: 'npm install' fuer HTML-Standards-Check"
	@$(PY) tools/daily_improvement_scan.py
	@echo "✓ QA fertig."
