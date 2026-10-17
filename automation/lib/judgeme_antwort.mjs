/**
 * Wie eine Judge.me-Antwort auf einen Bewertungs-POST zu lesen ist.
 *
 * WARUM (live gemessen 2026-10-17): Judge.me bestaetigt einen erfolgreichen POST mit
 * HTTP 201 und OHNE Review-ID im Body. Der Importer verlangte eine ID und verbuchte die
 * Bewertung darum als „unklar — vor Wiederholung abgleichen". Nachgelesen in Judge.me lagen
 * die Bewertungen aber LIVE im Shop (Walkie-Talkie, 19:56 UTC). Der Importer meldete also
 * „0 echte Reviews" fuer Arbeit, die er gerade erfolgreich getan hatte.
 *
 * Dritte Auflage derselben Fehlerklasse im Projekt: ein stiller Fehlschlag sieht aus wie
 * „keine Daten" (CJ-apiKey/password, pid-SKU-Skip, Shopify-Secret-No-op).
 *
 * Drei Ausgaenge, nie zwei:
 *   ok          — Judge.me nennt eine ID, fertig.
 *   abgleichen  — 2xx, nicht abgelehnt, keine ID → im Shop NACHLESEN (kein Blind-Wiederholen).
 *   uncertain   — Serverfehler: Ergebnis unbekannt, erst abgleichen.
 *   (sonst)     — abgelehnt: ok=false, abgleichen=false, uncertain=false.
 */
export function bewerteAntwort(status, body) {
  const s = Number(status);
  const zweiHundert = s >= 200 && s < 300;
  const abgelehnt = !!body && (body.success === false || body.result === false || body.error ||
    (Array.isArray(body.errors) ? body.errors.length > 0 : !!body.errors));
  const id = body?.review?.id ?? body?.id;
  const bestaetigt = typeof id === 'number' ? Number.isFinite(id) && id > 0
    : typeof id === 'string' ? id.trim().length > 0 : false;
  return {
    ok: zweiHundert && !abgelehnt && bestaetigt,
    abgleichen: zweiHundert && !abgelehnt && !bestaetigt,
    uncertain: s >= 500,
  };
}
