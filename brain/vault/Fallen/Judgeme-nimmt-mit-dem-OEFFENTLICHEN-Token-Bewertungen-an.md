---
tags: [falle, teuer-gelernt]
quelle: Selbst verursacht 2026-09-14, live gemessen
gelernt: 2026-09-14
---
# Judge.me nimmt mit dem OEFFENTLICHEN Token Bewertungen an

GEMESSEN 2026-09-14 und teuer bezahlt: die Judge.me-API ist unsymmetrisch. Der OEFFENTLICHE Token darf NICHT lesen (GET /reviews und /reviews/count antworten 403 mit 'You are using a public token'), aber er darf SEHR WOHL SCHREIBEN: POST /api/v1/reviews antwortet 201 'Review is being processed in background'. Wer also mit einem POST pruefen will, ob ein Token schreiben kann, hat damit schon geschrieben. Ich habe auf diese Weise versehentlich eine Test-Bewertung im Live-Shop erzeugt und damit gegen die harte Regel NIE FAKE-REVIEWS verstossen - und konnte sie mit demselben Token nicht wieder loeschen, weil Loeschen Lesezugriff braucht. REGEL: eine Schreib-Gegenprobe wird NIE an der echten Schnittstelle gefahren. Ob ein Token privat oder oeffentlich ist, klaert ein LESE-Aufruf: falscher Token gibt 401 'Failed to authenticate', oeffentlicher Token gibt 403 'public token', privater Token gibt 200. Zweiter Teil derselben Lehre: fuer den Reviews-Import reicht der Judge.me-Token allein nicht. automation/cj_reviews_import.mjs hat drei Waechter und steigt ohne CJ_EMAIL und CJ_API_KEY sowie ohne Shopify-Zugang als No-op aus - die Bewertungen kommen aus CJ, Judge.me ist nur das Ziel.

Verwandt: [[Hypothese-mit-Datum]]
