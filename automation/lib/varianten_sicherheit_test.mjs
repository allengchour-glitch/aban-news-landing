import { ledgerGedaechtnis, veraendertSeitPlan, bilderUnbrauchbar, VORLAEUFIG_MS, ZURUECKGESTELLT_MS, ENDGUELTIG_MS, FRISCH } from './varianten_sicherheit.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };

const JETZT = Date.parse('2026-10-26T20:00:00Z');
const vor = ms => new Date(JETZT - ms).toISOString();
const H = 3600 * 1000;
const zeile = (h, ms, e, g = '') => `${h} · ${vor(ms)} · ${e}${g ? ' · ' + g : ''}`;
const g = (zeilen, opt = {}) => [...ledgerGedaechtnis(zeilen.join('\n'), { jetzt: JETZT, ...opt })].sort();

// ── Ledger-Gedächtnis ────────────────────────────────────────────────────
ist('GESCHRIEBEN bleibt für immer', g([zeile('a', 400 * 24 * H, 'GESCHRIEBEN', '7 Varianten')]), ['a']);
ist('endgültiger Überspringer: 13 Tage alt = erledigt', g([zeile('b', 13 * 24 * H, 'UEBERSPRUNGEN', 'CJ führt nur 1 Variante — kein Auswahlproblem')]), ['b']);
ist('endgültiger Überspringer: 15 Tage alt = wieder dran', g([zeile('b', 15 * 24 * H, 'UEBERSPRUNGEN', 'CJ führt nur 1 Variante')]), []);
ist('vorläufig: 19 h alt = erledigt', g([zeile('c', 19 * H, 'UEBERSPRUNGEN', 'vorläufig: unsicher übersetzt')]), ['c']);
ist('vorläufig: 21 h alt = wieder dran (nächste Nacht)', g([zeile('c', 21 * H, 'UEBERSPRUNGEN', 'vorläufig: unsicher übersetzt')]), []);
ist('vorläufig ohne Grundtext zählt als vorläufig (nicht 14 Tage)', g([zeile('c', 21 * H, 'UEBERSPRUNGEN', 'vorläufig')]), []);
ist('zurückgestellt: 6 Tage alt = erledigt (kostet sonst jede Nacht CJ-Punkte)', g([zeile('z', 6 * 24 * H, 'UEBERSPRUNGEN', 'zurückgestellt: unsicher übersetzt [{"wert":"Retro Gold"}]')]), ['z']);
ist('zurückgestellt: 8 Tage alt = wieder dran', g([zeile('z', 8 * 24 * H, 'UEBERSPRUNGEN', 'zurückgestellt: viele CJ-Varianten (60 > 40)')]), []);
ist('zurückgestellt ohne Grundtext zählt als zurückgestellt (nicht 14 Tage, nicht 20 h)', [g([zeile('z', 3 * 24 * H, 'UEBERSPRUNGEN', 'zurückgestellt')]), g([zeile('z', 9 * 24 * H, 'UEBERSPRUNGEN', 'zurückgestellt')])], [['z'], []]);
ist('FORCE hebt auch zurückgestellte auf', g([zeile('z', 1 * H, 'UEBERSPRUNGEN', 'zurückgestellt: x')], { force: true }), []);
ist('FEHLER: 5 h alt = erledigt (kein Wiederholen in jeder Runde)', g([zeile('d', 5 * H, 'FEHLER', '[{"field":["x"]}]')]), ['d']);
ist('FEHLER: 25 h alt = wieder dran', g([zeile('d', 25 * H, 'FEHLER', 'x')]), []);
ist('Ein späteres GESCHRIEBEN gewinnt über ein altes Überspringen', g([zeile('e', 30 * H, 'UEBERSPRUNGEN', 'vorläufig: x'), zeile('e', 1 * H, 'GESCHRIEBEN', '3 Varianten')]), ['e']);
ist('FORCE hebt Überspringer und FEHLER auf, nicht GESCHRIEBEN', g([zeile('f', 1 * H, 'UEBERSPRUNGEN', 'vorläufig: x'), zeile('g', 1 * H, 'FEHLER', 'x'), zeile('h', 1 * H, 'GESCHRIEBEN', '2')], { force: true }), ['h']);
ist('ungültiges Datum = nicht erledigt (im Zweifel erneut)', g(['i · gestern · UEBERSPRUNGEN · CJ führt nur 1 Variante']), []);
ist('Leerzeilen und Müll stören nicht', g(['', '   ', 'nur-ein-feld', zeile('j', 1 * H, 'GESCHRIEBEN', '2')]), ['j']);
ist('Grund mit Mittelpunkt im Text bricht das Lesen nicht', g([zeile('k', 1 * H, 'UEBERSPRUNGEN', 'vorläufig: Auswahl nicht baubar: A · B · C')]), ['k']);
ist('Konstanten', [VORLAEUFIG_MS, ZURUECKGESTELLT_MS, ENDGUELTIG_MS], [20 * H, 7 * 24 * H, 14 * 24 * H]);
ist('leerer Text', g([]), []);

// ── Frisch lesen vor dem Schreiben ───────────────────────────────────────
const plan = { beschreibungHtml: '<p>Text</p>', tags: ['b', 'a'], medienIds: ['m1', 'm2'] };
const frisch = (o = {}) => ({ descriptionHtml: '<p>Text</p>', tags: ['a', 'b'], variantsCount: { count: 1 }, media: { nodes: [{ id: 'm1', status: 'READY' }, { id: 'm2', status: 'READY' }] }, ...o });
ist('unverändert (Tag-Reihenfolge egal)', veraendertSeitPlan(plan, frisch()), '');
ist('Produkt gelöscht', veraendertSeitPlan(plan, null), 'Produkt nicht mehr da');
ist('inzwischen mehrere Varianten (andere Sitzung war schneller)', veraendertSeitPlan(plan, frisch({ variantsCount: { count: 4 } })), 'inzwischen 4 Varianten');
ist('Varianten unbekannt = nicht schreiben', veraendertSeitPlan(plan, frisch({ variantsCount: undefined })), 'inzwischen undefined Varianten');
ist('Beschreibung geändert (Text-Lauf)', veraendertSeitPlan(plan, frisch({ descriptionHtml: '<p>Neuer Text</p>' })), 'Beschreibung inzwischen geändert');
ist('Tag hinzugekommen (Kategorie-Lauf) würde überschrieben', veraendertSeitPlan(plan, frisch({ tags: ['a', 'b', 'sort-damen-kleider'] })), 'Tags inzwischen geändert');
ist('Tag entfernt', veraendertSeitPlan(plan, frisch({ tags: ['a'] })), 'Tags inzwischen geändert');
ist('neues READY-Medium ginge beim Schreiben verloren', veraendertSeitPlan(plan, frisch({ media: { nodes: [{ id: 'm1', status: 'READY' }, { id: 'm2', status: 'READY' }, { id: 'm3', status: 'READY' }] } })), '1 Medium/Medien inzwischen hinzugekommen');
ist('Medium in Verarbeitung zählt nicht (wird ohnehin nicht mitgeschrieben)', veraendertSeitPlan(plan, frisch({ media: { nodes: [{ id: 'm1', status: 'READY' }, { id: 'm2', status: 'READY' }, { id: 'm9', status: 'PROCESSING' }] } })), '');
ist('Medium inzwischen entfernt: files nennte ein Bild, das es nicht mehr gibt', veraendertSeitPlan(plan, frisch({ media: { nodes: [{ id: 'm1', status: 'READY' }] } })), '1 Medium/Medien inzwischen entfernt');
ist('Plan ohne Tags/Medien, Shop auch ohne', veraendertSeitPlan({ beschreibungHtml: '' }, { descriptionHtml: null, tags: [], variantsCount: { count: 1 }, media: { nodes: [] } }), '');
ist('Abfrage-Text fragt genau die geprüften Felder', ['updatedAt', 'descriptionHtml', 'tags', 'variantsCount', 'media'].every(f => FRISCH.includes(f)), true);

// Zeitstempel: fängt ab, was die Einzelprüfungen nicht sehen (Preis, Kosten, SKU, Metafelder)
const planZ = { ...plan, updatedAt: '2026-10-26T10:00:00Z' };
ist('updatedAt gleich: unverändert', veraendertSeitPlan(planZ, frisch({ updatedAt: '2026-10-26T10:00:00Z' })), '');
ist('updatedAt neuer (z. B. Preis von anderer Sitzung erhöht): nicht schreiben', veraendertSeitPlan(planZ, frisch({ updatedAt: '2026-10-26T10:05:00Z' })), 'Produkt inzwischen geändert (updatedAt)');
ist('Plan aus der Zeit vor dem Feld (ohne updatedAt): kein Fehlalarm', veraendertSeitPlan(plan, frisch({ updatedAt: '2026-10-26T10:05:00Z' })), '');
ist('frische Antwort ohne updatedAt: kein Fehlalarm', veraendertSeitPlan(planZ, frisch()), '');

// Bild-Schranke: mehr als die Hälfte unlesbar = nicht schreiben
const bp = (zugeordnet, neuHochzuladen, unlesbar) => bilderUnbrauchbar({ bilder: { zugeordnet, neuHochzuladen, unlesbar } });
ist('alle Bilder lesbar', bp(3, 2, 0), false);
ist('keine Variantenbilder bei CJ (0/0/0)', bp(0, 0, 0), false);
ist('ein toter Link unter fünf guten', bp(3, 1, 1), false);
ist('genau die Hälfte unlesbar (1 von 2): noch schreiben', bp(1, 0, 1), false);
ist('mehr als die Hälfte (2 von 3)', bp(1, 0, 2), true);
ist('alle unlesbar (ffmpeg/Download weg)', bp(0, 0, 6), true);
ist('Plan ohne bilder-Feld', bilderUnbrauchbar({}), false);

console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
