// cj_groessen.mjs — EINE Wahrheit für Konfektionsgrössen.
//
// ⚠️ 23.08.2026. Dieselbe Grössenliste stand in drei Dateien nebeneinander
// (`cj_category_fill.mjs`, `cj_trending_import.mjs`, `cj_variant_backfill.mjs`) — mit drei
// verschiedenen Inhalten: einmal ohne XXS, einmal ohne 2XL, keine mit 0XL/1XL oder 7XL+.
// Genau diese Lücke hat 350 aktive Produkte beschädigt: Der Parser erkannte «Aprikose-2XL»
// nicht als Farbe+Grösse, schrieb den ganzen Ausdruck ins FARBFELD und füllte den
// Grössen-Slot mit der kleinsten Grösse auf. 1'634 Varianten mussten nachträglich
// umgehängt werden (`automation/groesse_im_farbwert.py`).
//
// Vierte Wiederholung derselben Lehre nach der viermal kopierten Farbtabelle, den vier
// Preisformeln und dem ungeprüften `publishablePublish`: **Wer eine Hilfsfunktion
// repariert, sucht ihre Geschwister — und macht daraus EINE Datei.**
// NEUE GRÖSSEN NUR HIER.

// Sortierreihenfolge. CJ nummeriert oberhalb von XXL mit Ziffern (2XL … 11XL) und
// unterhalb von XS mit 0XL/1XL — Letzteres ist KEINE Übergrösse, sondern CJs eigene
// Zählweise; die Reihenfolge orientiert sich deshalb an der Zahl, nicht am Wort.
export const SORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL',
  '0XL', '1XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL', '11XL'];

export const SIZESET = new Set([...SORDER, 'XXXL',
  'ONE SIZE', 'ONESIZE', 'FREE SIZE', 'FREESIZE', 'F']);
