/** Gesetzte technische Mindestfelder zählen; keine Aussage über Produktwahrheit oder Verkaufsreife. */

const PRODUKT_ID = /^gid:\/\/shopify\/Product\/\d+$/;
const EIGEN = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const OBJEKT = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const NULLTEXT = v => v === null || typeof v === 'string';

function leer(text) {
  // Die Quelle soll Klartext liefern. Reine Leerzeichen, Leer-HTML und geschützte Leerzeichen zählen nicht als Inhalt.
  return !text.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function berichtstitel(text) {
  // Auch versehentliche Links oder Preisangaben im Titel gelangen nicht in die nichtprivate Kandidatenliste.
  return text.replace(/https?:\/\/[^\s<>"']+/gi, '[URL entfernt]')
    .replace(/(?:CHF|EUR|USD|€|\$)\s*-?\d[\d.,'’]*/gi, '[Preis entfernt]')
    .replace(/[\r\n\t]/g, ' ').slice(0, 300);
}

export class Qualitaetszaehler {
  #produkte = new Map();
  #medien = new Map();
  #paare = new Set();
  #objekte = 0;
  #medienAnzahl = 0;
  #bilder = 0;
  #abgebrochen = false;
  #fertig = false;

  #offen() {
    if (this.#abgebrochen) throw new Error('PRODUKTQUALITAET: Messung wurde wegen ungültiger Daten abgebrochen.');
    if (this.#fertig) throw new Error('PRODUKTQUALITAET: Messung ist bereits abgeschlossen.');
  }

  add(row) {
    this.#offen();
    try {
      if (!OBJEKT(row) || typeof row.id !== 'string' || !row.id.trim()) {
        throw new Error('Ungültige oder fehlende Objektkennung.');
      }
      if (PRODUKT_ID.test(row.id)) {
        if (EIGEN(row, '__parentId') || this.#produkte.has(row.id)) throw new Error('Doppelte Produktkennung oder unerwarteter Produktelternverweis.');
        if (typeof row.title !== 'string' || typeof row.description !== 'string' || !OBJEKT(row.seo) ||
            !EIGEN(row.seo, 'title') || !EIGEN(row.seo, 'description') ||
            !NULLTEXT(row.seo.title) || !NULLTEXT(row.seo.description)) {
          throw new Error('Pflichtfelder der Produktzeile fehlen oder haben ungültige Typen.');
        }
        this.#produkte.set(row.id, {
          id: row.id, titel: berichtstitel(row.title), titelLeer: leer(row.title),
          beschreibungLeer: leer(row.description), seoBeschreibungLeer: row.seo.description === null || leer(row.seo.description),
        });
      } else {
        if (!EIGEN(row, '__parentId') || typeof row.__parentId !== 'string' || !PRODUKT_ID.test(row.__parentId) ||
            !EIGEN(row, 'alt') || !NULLTEXT(row.alt) ||
            typeof row.status !== 'string' || !row.status.trim() ||
            typeof row.mediaContentType !== 'string' || !row.mediaContentType.trim()) {
          throw new Error('Pflichtfelder der Medienzeile fehlen oder haben ungültige Typen.');
        }
        const paar = JSON.stringify([row.__parentId, row.id]);
        if (this.#paare.has(paar)) throw new Error('Doppeltes Eltern-Medien-Paar.');
        this.#paare.add(paar);
        const m = this.#medien.get(row.__parentId) || { bilder: 0, nichtReady: 0, ohneAlt: 0 };
        if (row.status !== 'READY') m.nichtReady++;
        if (row.mediaContentType === 'IMAGE') {
          m.bilder++; this.#bilder++;
          if (row.alt === null || leer(row.alt)) m.ohneAlt++;
        }
        this.#medien.set(row.__parentId, m);
        this.#medienAnzahl++;
      }
      this.#objekte++;
      return this;
    } catch (error) {
      this.#abgebrochen = true;
      throw new Error('PRODUKTQUALITAET: ' + error.message);
    }
  }

  finish(meta) {
    this.#offen();
    try {
      if (!OBJEKT(meta) || !['expectedRoots', 'expectedObjects', 'activeBefore', 'activeAfter']
        .every(k => EIGEN(meta, k) && Number.isSafeInteger(meta[k]) && meta[k] >= 0)) {
        throw new Error('Vollständigkeitszähler fehlen oder sind ungültig.');
      }
      for (const parent of this.#medien.keys()) {
        if (!this.#produkte.has(parent)) throw new Error('Verwaiste Medienzeile ohne Produkt.');
      }
      const befunde = {
        produkte_ohne_titel: 0, produkte_ohne_beschreibung: 0, produkte_ohne_seobeschreibung: 0,
        produkte_ohne_bild: 0, produkte_mit_medien_nicht_ready: 0,
        medien_nicht_ready: 0, produkte_mit_bildern_ohne_alttext: 0, bilder_ohne_alttext: 0,
      };
      const kandidaten = [];
      let ok = 0;
      for (const p of this.#produkte.values()) {
        const m = this.#medien.get(p.id) || { bilder: 0, nichtReady: 0, ohneAlt: 0 };
        const gruende = [];
        const befund = (gilt, key, text) => { if (gilt) { befunde[key]++; gruende.push(text); } };
        befund(p.titelLeer, 'produkte_ohne_titel', 'Titel leer');
        befund(p.beschreibungLeer, 'produkte_ohne_beschreibung', 'Klartextbeschreibung leer');
        befund(p.seoBeschreibungLeer, 'produkte_ohne_seobeschreibung', 'Explizite SEO-Beschreibung leer');
        befund(m.bilder === 0, 'produkte_ohne_bild', 'Kein IMAGE vorhanden');
        befund(m.nichtReady > 0, 'produkte_mit_medien_nicht_ready', 'Medien nicht vollständig READY');
        befund(m.ohneAlt > 0, 'produkte_mit_bildern_ohne_alttext', 'Bild-Alttext fehlt');
        befunde.medien_nicht_ready += m.nichtReady;
        befunde.bilder_ohne_alttext += m.ohneAlt;
        if (!gruende.length) ok++;
        else if (kandidaten.length < 50) kandidaten.push({ id: p.id, titel: p.titel, gruende });
      }
      const produkte = this.#produkte.size;
      const vollstaendig = meta.expectedRoots === produkte && meta.expectedObjects === this.#objekte &&
        meta.activeBefore === produkte && meta.activeAfter === produkte;
      this.#fertig = true;
      return {
        produkte, objekte: this.#objekte, bilder: this.#bilder, medien: this.#medienAnzahl,
        vollstaendig, mindestfelder_ok: ok,
        technische_quote_prozent: vollstaendig && produkte > 0 ? Math.round(ok / produkte * 10000) / 100 : null,
        befunde, kandidaten,
        massstab: 'SETZUNG: sechs technische Mindestfeld-Prüfungen; keine vollständige Produktqualität.',
        grenzen: ['Inhaltliche Wahrheit nicht geprüft', 'Sprache und Rechte nicht geprüft', 'Lieferbarkeit und Verkaufsreife nicht geprüft'],
      };
    } catch (error) {
      this.#abgebrochen = true;
      throw new Error('PRODUKTQUALITAET: ' + error.message);
    }
  }
}
