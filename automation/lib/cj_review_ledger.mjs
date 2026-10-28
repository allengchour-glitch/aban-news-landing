import fs from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Schluessel je einzelner Bewertung.
 *
 * ⚠️ GEMESSEN 2026-10-18 an CJ `product/productComments?pid=1616334321445515264`: ALLE sieben
 * Kommentare des Produkts tragen dieselbe `commentId` (1616344932124471300). Die alte Fassung
 * nahm diese Kennung allein, sobald sie vorhanden war — damit hatten alle Bewertungen EINES
 * Produkts denselben Schluessel. Folge: die erste wurde importiert, jede weitere sah den
 * Zustand `sending` und wurde als `CJ_REVIEW_UNCERTAIN` gezaehlt. Der Lauf ueber 150
 * Elektronik-Produkte meldete darum 17 Bewertungen und 20 „Fehler", obwohl CJ fuer dieselben
 * sieben Produkte deutlich mehr hatte.
 *
 * Darum geht der Inhalt IMMER mit in den Schluessel. Die Kennung bleibt als zusaetzliche
 * Unterscheidung drin: derselbe Kommentar ergibt denselben Schluessel (Idempotenz bleibt),
 * zwei verschiedene Kommentare nie.
 */
export function reviewKey(productId, cjPid, review) {
  const sourceId=review.id ?? review.commentId;
  const kennung=sourceId !== undefined && sourceId !== null && String(sourceId).trim() !== ''
    ? String(sourceId) : '';
  const source=[String(productId),String(cjPid),'inhalt',kennung,
    String(review.commentUser ?? ''),String(review.commentDate ?? ''),
    Number(review.score),String(review.comment ?? '')];
  return createHash('sha256').update(JSON.stringify(source)).digest('hex');
}

// Die zuletzt gesendete Fassung je Schluessel (Feld `body`). Die Uebersetzung ist nicht deterministisch: nur mit dem
// gespeicherten Text kann ein unklarer Eintrag spaeter im Shop wiedergefunden werden, und beim Wiederaufnehmen wird
// dieser Text verwendet statt neu zu uebersetzen. Haengt am Zustands-Map (WeakMap), damit die Signaturen unveraendert bleiben.
const FASSUNGEN = new WeakMap();
export function reviewBody(states, key) {
  return FASSUNGEN.get(states)?.get(key) ?? '';
}

export function loadReviewStates(file) {
  const states=new Map();
  const fassungen=new Map();
  FASSUNGEN.set(states,fassungen);
  if (!fs.existsSync(file)) return states;
  for (const line of fs.readFileSync(file,'utf8').split('\n').filter(Boolean)) {
    let entry;
    try { entry=JSON.parse(line); } catch { throw new Error('CJ_REVIEW_LEDGER: ungültige Zeile, Abgleich erforderlich'); }
    if (typeof entry.key!=='string' || !['sending','sent','failed','uncertain'].includes(entry.status)) {
      throw new Error('CJ_REVIEW_LEDGER: ungültiger Status, Abgleich erforderlich');
    }
    if (entry.body!==undefined && typeof entry.body!=='string') {
      throw new Error('CJ_REVIEW_LEDGER: ungültiger Text, Abgleich erforderlich');
    }
    states.set(entry.key,entry.status);
    if (entry.body) fassungen.set(entry.key,entry.body);
  }
  return states;
}

export function recordReviewState(file, states, key, status, body) {
  const text=typeof body==='string' && body ? body : undefined;
  const fd=fs.openSync(file,'a',0o600);
  try {
    fs.writeSync(fd,JSON.stringify({key,status,...(text ? {body:text} : {}),updated_at:new Date().toISOString()})+'\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  states.set(key,status);
  if (text) {
    if (!FASSUNGEN.has(states)) FASSUNGEN.set(states,new Map());
    FASSUNGEN.get(states).set(key,text);
  }
}
