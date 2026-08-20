// Erkennt Hunde-Erziehungsgeräte, die nach TSchV Art. 76 in der Schweiz nicht frei
// verkäuflich sind: Geräte mit Elektroschock-/Impulswirkung, Sprühhalsbänder mit Reizstoff,
// Stachel- und Würgehalsbänder.
//
// BEFUND (20.08.2026): Elf solche Geräte standen ACTIVE und in ALLEN SECHS Kanälen — auch im
// Google-Kanal, dem einzigen mit belegten Verkäufen. Neun davon waren am oder nach dem 13.08.
// neu angelegt worden, also NACH der Sofortmassnahme vom 16.08., bei der schon zwei Schock-
// Halsbänder gedraftet wurden. Der Bestand zu putzen genügt hier nicht: der Grind legt die
// Klasse täglich nach. Deshalb prüft der Importer VOR dem Anlegen.
//
// WARUM DREI TEILE JE REGEL (tier + geraet + wirkung): Ein Wirkungswort allein ist zu breit
// («Schockfarben», «elektrischer Impuls» in einem Netzteil), ein Gerätewort allein zu stumpf.
// Erst die Kombination trifft. Die Wirkungswörter hängen an der MECHANIK, nicht am
// Produktnamen — die Lieferanten nennen den Schock «statischer Impuls» (99 Stufen),
// «elektrostatische Stimulation», «elektrischer Impuls» oder «Puls-proportionale Stimulation».
// Ein Muster, das nur «Schock» kennt, übersieht die Mehrheit der Fälle.
//
// KEINE SPERRE AUF VERNEINUNGEN: «humaner Schutzmodus», «sanft», «harmlos», «ohne dem Tier zu
// schaden» stehen in fast jedem dieser Texte. Wer sie als Entlastung wertet, schaltet das
// Muster genau bei den Produkten ab, die es treffen soll. Begründung ausführlich in
// automation/tierschutz_geraet.json.
//
// Ware wird nicht verworfen, sondern als DRAFT mit Tag `tierschutz-tschv76` angelegt und NICHT
// publiziert — mit Unterlagen jederzeit freischaltbar.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(fs.readFileSync(path.join(HIER, 'tierschutz_geraet.json'), 'utf8'));

const SPERRE = M.sperre.map(x => ({ n: x.n, re: new RegExp(x.re, 'i') }));
const TREFFER = M.treffer.map(x => ({
  n: x.n,
  tier: new RegExp(x.tier, 'i'),
  geraet: new RegExp(x.geraet, 'i'),
  wirkung: new RegExp(x.wirkung, 'i'),
}));

// Nimmt HTML oder Klartext. null = unbedenklich, sonst {grund, muster, stelle}.
export function tierschutzGeraet(titel, text) {
  const roh = String(titel || '') + ' || ' + String(text || '');
  const klar = roh.replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                  .replace(/\s+/g, ' ');
  for (const s of SPERRE) if (s.re.test(klar)) return null;
  for (const t of TREFFER) {
    if (!t.tier.test(klar) || !t.geraet.test(klar)) continue;
    const m = t.wirkung.exec(klar);
    if (m) return { grund: t.n, muster: m[0].slice(0, 90),
                    stelle: klar.slice(Math.max(0, m.index - 60), m.index + 120) };
  }
  return null;
}

export default tierschutzGeraet;
