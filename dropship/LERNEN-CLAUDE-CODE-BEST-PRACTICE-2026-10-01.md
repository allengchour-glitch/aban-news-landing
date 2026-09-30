# Lernen: «Claude Code Best Practice» (TikTok @alan.buildz, Betreiber-Link 01.10.2026)

Quelle: TikTok https://www.tiktok.com/@alan.buildz/video/7671764034571537697 (Transkript über `automation/tiktok_lesen.py`)
→ Repo https://github.com/shanraisshan/claude-code-best-practice (README gelesen, 599 Zeilen, Stand 30.09.2026).

## Einordnung der Aussagen
- **BEHAUPTUNG (falsch):** «Boris Cherny (leitet Claude Code) hat den Skill geteilt». Das Repo stammt von shanraisshan
  und SAMMELT u. a. Tweets von Boris/Thariq — geteilt hat Boris den Skill nicht.
- **QUELLE:** ~66'800 Sterne (Websuche 01.10.), «83 Tipps» (README-Überschrift, gezählt).
- **BEHAUPTUNG:** «Kommentiere Best und ich schicke dir …» = Lead-Magnet des Kanals; das Repo ist frei zugänglich.

## Gegenprobe am eigenen Stand (GEMESSEN 01.10.)
| Tipp (Repo) | Bei uns | Folgerung |
|---|---|---|
| CLAUDE.md < 200 Zeilen; `.claude/rules/*.md` mit `paths:` laden nur bei Bedarf | **550 Zeilen / 75,9 KB**, kein `.claude/rules/` | grösster Hebel: Themenblöcke (TikTok, BigBuy, Musik, Screenshot …) in Regeln auslagern — Kern bleibt kurz (Betreiber 14.09. «prompt zu lang immer») |
| Zweites Modell prüft Plan/Ergebnis | ✓ `automation/kritik.py` (ChatGPT + Kimi), heute für die TikTok-Kampagne genutzt | beibehalten |
| Skills: Gotchas-Abschnitt, Beschreibung = Auslöser | 5 von 9 Skills haben «Fallen» | die 4 übrigen ergänzen, wenn sie das nächste Mal Fehler machen |
| «Produkt-Verifikations-Skills» (checkout-verifier) | fehlt | **passt genau zum Engpass**: Sirène 7× an der Kasse, 0 Käufe → Testkasse im Browser (`tools/browser.mjs`) bis zur Zahlungsseite: Versandkosten, Klarna/TWINT sichtbar? |
| Stop-Hook prüft Turn-Ende | ✓ (git-Check) | — |
| Kontext: ab ~40 % Qualitätsabfall, Subagenten für Suchen | lange Sessions hier | Such-/Leseaufgaben öfter an Subagenten |
