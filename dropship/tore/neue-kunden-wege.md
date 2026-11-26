# Tore: «suche kunden die noch nicht gemacht hast sachen machen» (Betreiber 26.11.2026)

Grundlage: Workflow «neue-kunden-wege» (10 Wege, Skeptiker je Weg). Sitzung setzt um, was ohne Geld und ohne Betreiber geht;
Rest = Klick-Liste `dropship/KUNDEN-WEGE-2611.md`.

- [x] T1: Newsletter-Fenster zählt die Sitzungszeit (ab 2. Seite, Sitzung mobil ≥ 45 s / Desktop 30 s → nach 10/8 s), nie auf Produktseiten
    PRUEFUNG: python3 automation/popup_tor_wache.py
    ERWARTET: POPUP-TOR: ok
- [x] T2: Live im Handy-Browser gemessen (390 px, Banner weggeklickt): Kollektion 2. Seite nach 6 s zu, nach 14 s offen; Produktseite nach 14 s zu
    HAND: Messung 26.11. mit tools/browser.mjs (Skript im Scratchpad poptest4.mjs), Ergebnis «nach 6 s none | nach 14 s flex» / Produktseite «none»
- [x] T3: Klaviyo-Flow «Warenkorb-Erinnerung · 4 Std» T9aiM7 live (Added to Cart TFy7Yn → 4 h → Mail, nur Abonnenten, ohne Rabatt, raus bei Checkout Started/Placed Order seit Start, Wiedereintritt 7 T)
    HAND: update_flow T9aiM7 → status live (Klaviyo-Antwort 26.11.)
- [ ] T4: Wirkung: Anmeldungen über «Onsite Popup» und Flow-Klicks nach 30 Tagen gegen vorher (Baseline: Liste T2VHfu ~16 Profile, 8 Added-to-Cart-Ereignisse bekannter Personen 07.09.–16.11.)
    HAND: Sitzung misst ab 26.12. (Klaviyo get_flow_report T9aiM7 + Liste T2VHfu)
