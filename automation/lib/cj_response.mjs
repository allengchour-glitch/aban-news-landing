/** CJ-Fehler sind keine leeren Produkt-/Bewertungslisten. Keine Zugangsdaten loggen. */
/**
 * @param {{ohneResult?:boolean}} [opt]  ohneResult: nur für Endpunkte, die KEIN `result`-Feld senden (getInventoryByPid: `{success:true, code:200, message:'', data}`, GEMESSEN 26.10.2026).
 *   Dann zählt `success:true` UND `code:200` zusammen als Erfolg; `result:false` bleibt auch dort ein Fehler. Ohne diese Angabe (Vorgabe, alle anderen Aufrufer) gilt wie bisher nur `result:true`.
 */
export function assertCjSuccess(body, status, context = 'CJ', opt = {}) {
  const message = String(body?.message || '');
  if (/insufficient api points|daily.*(?:quota|limit)|points.*exhaust/i.test(message)) {
    throw new Error(`CJ_QUOTA: Tagespunkte erschöpft (${context})`);
  }
  if (status < 200 || status >= 300) {
    throw new Error(`CJ_HTTP: HTTP ${status} (${context})`);
  }
  const erfolg = !!body && (body.result === true || (opt.ohneResult === true && body.result === undefined && body.success === true && Number(body.code) === 200));
  if (!erfolg) {
    const code = String(body?.code ?? 'unbekannt').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 40);
    throw new Error(`CJ_API: Antwort nicht erfolgreich, code=${code} (${context})`);
  }
  if (!Object.hasOwn(body,'data') || body.data === undefined) {
    throw new Error(`CJ_DATA: Erfolgsantwort enthält kein data-Feld (${context})`);
  }
  return body;
}

export async function readCjResponse(response, context) {
  let body;
  try { body = await response.json(); }
  catch { throw new Error(`CJ_JSON: Antwort nicht lesbar, HTTP ${response.status} (${context})`); }
  return assertCjSuccess(body, response.status, context);
}
