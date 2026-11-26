# Tore: Wächter/Schreiber auf das Live-Theme (26.11.2026; Theme-Wechsel 21.11. → 214565814663, 13 Skripte trugen fest 187533001089)

Prüfung je Skript: Workflow wf_4b04b1cd-ab8 (Analyse + Skeptiker, nur Lese-/Trockenlauf), Urteile in `dropship/theme-id-2611/URTEILE.md`.
Prüfen: `python3 tools/tore.py dropship/tore/theme-id-live.md`

- [ ] T1: Helfer main_theme.py wählt genau das MAIN-Theme (Selbsttest) und liefert live die GID
    PRUEFUNG: python3 automation/main_theme.py --selbsttest && python3 automation/main_theme.py
    ERWARTET: /OK \(\d+\/\d+[\s\S]*OnlineStoreTheme\/\d+/
- [ ] T2: Die 7 als sicher beurteilten Skripte tragen keine feste Theme-ID mehr und lösen beim Import das Live-Theme auf
    PRUEFUNG: cd automation && python3 -c "import importlib,main_theme;g=main_theme.gid();ms=['theme_text_kanarien','variant_links_wache','kassen_lieferdatum_wache','anlass_lieferzeit_wache','versandschwelle_rabatt','pod_designzwang','meta_beschreibung_escape'];b=[m for m in ms if '187533001089' in open(m+'.py').read() or importlib.import_module(m).THEME!=g];print(b);assert not b;print('TOR-OK')"
    ERWARTET: TOR-OK
- [ ] T3: Veraltete Läufe stillgelegt (Startseiten-Rotation, Mobil-Tempo-Patch, Schlank-Patch nicht mehr im Aufseher)
    PRUEFUNG: f=automation/fixer_keepalive.sh; grep -q 'if false && \[ -f "$REPO/automation/homepage_katalog_rotation.py" \]' $f && grep -q 'if false && \[ -f "$REPO/automation/mobil_tempo_patch.py" \]' $f && ! grep -q 'startseite_gewicht startseite_schlank_patch' $f && echo TOR-OK
    ERWARTET: TOR-OK
- [ ] T4: Varianten-Link-Wache liest das Live-Theme vollständig (Kanarienvogel ok)
    PRUEFUNG: env -u SHOPIFY_CLIENT_ID -u SHOPIFY_CLIENT_SECRET SHOPIFY_SHOP=au3j0y-hq.myshopify.com SHOPIFY_ADMIN_TOKEN="$(cat /tmp/cj_shop_token.txt | tr -d '\n')" timeout 300 python3 automation/variant_links_wache.py 2>&1 | tail -1
    ERWARTET: /Kanarienvogel ok/
- [ ] T5: Warenkorb-Schreiber umgebaut (Workflow wf_d6e5dcb3-ae2: Umbau + 2 Skeptiker + Nachbesserung): Soll-Block 50/5556/«nach Rabatt», gid() zur Laufzeit, abendaktion --start gesperrt, theme_gratis_schwelle_50 --zurueck nur altes Theme mit Prüfsumme; alle Selbsttests grün
    PRUEFUNG: cd automation && for s in main_theme theme_attrappe warenkorb_gratisversand warenkorb_einig abendaktion theme_gratis_schwelle_50 google_org_richtlinien; do timeout 300 python3 $s.py --selbsttest 2>&1 | tail -1; done | grep -c -E "OK"
    ERWARTET: /^7$/
