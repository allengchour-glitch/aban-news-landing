/**
 * Bericht für den Skill regeln: zeigt die Leitplanken NICHT aus einer abgeschriebenen Liste, sondern misst sie.
 * Jede Regel hat einen Beispielbefehl (oder Beispieltext); der Bericht fragt lib/regeln.mjs, ob der Beispielbefehl
 * gesperrt wird, was der Grund sagt und ob der Ausweg wirklich frei macht. Dazu kommen Varianten des Beispiels
 * (gebündelte Kurzoptionen, Anführungszeichen, Befehl hinter einem Heredoc-Kopf), der Pfad-Weg für Patches, das
 * Merken eines Trockenlaufs und Gegenproben, die frei sein müssen. Wird eine Regel geändert, stimmt der Bericht mit,
 * und eine Abweichung vom Erwarteten steht als ABWEICHUNG da, nie als Stille.
 *
 * Jede Messung hat drei mögliche Ausgänge: gesperrt, frei oder NICHT MESSBAR (die Prüfung wirft eine Ausnahme).
 * «Nicht messbar» ist nie «frei»: eine Messung, die nicht stattfand, steht nie als gemessen da.
 *
 * Reine Funktion: bekommt das Modul (lib/regeln.mjs oder eine Attrappe im Test), startet nichts, schreibt nichts.
 * Die Beispiele werden nur an pruefeBash/pruefeInhalt/pruefePfad gereicht, nie ausgeführt. Das Geheimnis-Beispiel
 * entsteht erst zur Laufzeit aus Teilen und steht nie als Ganzes in einer Datei oder im Bericht.
 */

/** Was das Modul liefern muss; fehlt etwas, ist kein Bericht möglich. */
export const ERWARTET = Object.freeze({ pruefeBash: 'function', pruefeInhalt: 'function', pruefePfad: 'function', AUSWEGE: 'array' });

/** Namen der Teile der Schnittstelle, die in `modul` fehlen oder die falsche Art haben. */
export function schnittstelleFehlt(modul) {
  const fehlt = [];
  for (const [name, art] of Object.entries(ERWARTET)) {
    const w = modul?.[name];
    if (art === 'function' ? typeof w !== 'function' : !Array.isArray(w)) fehlt.push(name);
  }
  return fehlt;
}

const BEISPIEL_SKRIPT = 'automation/beispiel_skript.mjs';
const ANDERES_SKRIPT = 'automation/anderes_skript.mjs';
const STOPP = 'dropship/_SOCIAL_STOPP';

/** Ein Text im Muster eines Shopify-Zugangs, erst hier zusammengesetzt (kein Geheimnis, nur die Form). */
export const geheimnisProbe = () => `${'sh'}${'pat_'}${'a'.repeat(32)}`;

/**
 * Die Regeln des Berichts. `befehl`: Beispiel für pruefeBash; `inhalt`: Beispiel für pruefeInhalt.
 * `varianten`: [Name, Befehl] weitere Formen, die AUCH gesperrt sein müssen. `pfad`: Zielpfad eines Patches (pruefePfad).
 * `trockenBefehl`: ein Lauf ohne LIVE=1, der als Trockenlauf gemerkt werden muss. `grenze`: ein Befehl, dessen Urteil nur
 * gezeigt wird (die Regel rät nicht), ohne Abweichung.
 */
export const REGELN = Object.freeze([
  {
    name: 'Kein Force-Push', befehl: 'git push --force origin main', ausweg: 'LUXE_FORCE_OK',
    varianten: [['gebündelte Kurzoption', 'git push -fu origin feature'], ['Option hinter dem Ziel', 'git push origin feature -f'], ['Befehl hinter einem Heredoc-Kopf', "node beispiel.mjs <<'ENDE_BEISPIEL' && git push --force origin main\nabc\nENDE_BEISPIEL"]],
  },
  { name: 'Kein pkill und kein killall', befehl: 'pkill -f laufen.py', ausweg: 'LUXE_KILL_OK', varianten: [['killall', 'killall node']] },
  {
    name: 'Kein git add -A und kein git add .', befehl: 'git add -A', ausweg: 'LUXE_ADD_OK',
    varianten: [['gebündelte Kurzoption', 'git add -Av'], ['Punkt in Anführungszeichen', 'git add "."'], ['git add .', 'git add .']],
  },
  {
    name: `${STOPP} wird nie neu angelegt (Löschen und Lesen sind erlaubt)`, befehl: `touch ${STOPP}`, ausweg: null,
    varianten: [['Umleitung', `echo x > ${STOPP}`]], pfad: STOPP,
  },
  {
    name: 'LIVE=1 erst nach einem Trockenlauf desselben Skripts in dieser Sitzung', befehl: `LIVE=1 node ${BEISPIEL_SKRIPT}`, ausweg: 'LUXE_LIVE_OK',
    trockenBefehl: `node ${BEISPIEL_SKRIPT}`,
    varianten: [['LIVE in Anführungszeichen', `LIVE='1' node ${BEISPIEL_SKRIPT}`], ['Skript in Anführungszeichen', `LIVE=1 node "${BEISPIEL_SKRIPT}"`], ['nach cd in den Ordner', 'cd automation && LIVE=1 node beispiel_skript.mjs']],
    grenze: 'LIVE=1 npm run beispiel',
  },
  { name: 'Keine Geheimnisse in Dateien (Shopify-, Stripe-, Groq-, Google-, GitHub-, Slack-, OpenAI-, Anthropic-, AWS-Schlüssel, privater PEM-Schlüssel)', beispielText: 'ein Text im Muster eines Shopify-Zugangs', inhalt: geheimnisProbe, marker: 'luxe-geheim-ok' },
]);

/** Befehle, die frei sein müssen: sie beweisen, dass die Regeln nicht einfach alles sperren und dass «Lesen und Löschen sind erlaubt» stimmt. */
export const GEGENPROBEN = Object.freeze([
  'git status -sb', 'git push origin neuer-branch', 'git add codex-mods/README.md', `node ${BEISPIEL_SKRIPT}`,
  `cat ${STOPP}`, `rm -f ${STOPP}`, `cp ${STOPP} /tmp/stopp-kopie`,
]);

/**
 * Ruft `f` und gibt das Urteil als Wert: `{ deny }` (gesperrt, mit Grund), `{ merke }` (als Trockenlauf gemerkt), `{}` (frei)
 * oder `{ wirft }` (die Prüfung ist abgestürzt: NICHT gemessen). Eine Sperre ohne Grund zählt als frei: Codex verwirft ein deny
 * ohne Begründung.
 */
function frage(f) {
  try {
    const u = f();
    return {
      deny: typeof u?.deny === 'string' && u.deny.trim() ? u.deny.trim() : undefined,
      merke: typeof u?.merke === 'string' && u.merke ? u.merke : undefined,
    };
  } catch (fehler) {
    return { wirft: fehler instanceof Error ? fehler.message : String(fehler) };
  }
}

/** Die drei Ausgänge einer Messung: frei heisst gemessen und nicht gesperrt, nie «es kam keine Sperre, weil die Prüfung abstürzte». */
const frei = u => !u.wirft && !u.deny;
const gesperrt = u => !u.wirft && Boolean(u.deny);

/**
 * Misst alle Regeln an `modul` (lib/regeln.mjs). Ergebnis: `{ text, abweichungen }`; `abweichungen` ist leer, wenn
 * jedes Beispiel samt Varianten gesperrt wird, jeder Ausweg frei macht, kein Ausweg für die Regel ohne Ausweg wirkt,
 * ein Lauf ohne LIVE=1 als Trockenlauf gemerkt wird, der Pfad-Weg sperrt und alle Gegenproben frei sind. Eine Prüfung,
 * die wirft, ist eine Abweichung («nicht messbar»). Setzt voraus, dass `schnittstelleFehlt(modul)` leer ist.
 */
export function bericht(modul) {
  const abweichungen = [];
  const auswege = modul.AUSWEGE;
  const zeilen = ['Leitplanken von luxe-codex, so wie lib/regeln.mjs sie jetzt durchsetzt (gemessen an Beispielen, es wird nichts ausgeführt)', ''];
  const bash = (befehl, trocken = []) => frage(() => modul.pruefeBash(befehl, trocken));

  const sperre = (r, tx = '') => {
    if (r.befehl) return bash(`${tx}${r.befehl}`);
    return frage(() => modul.pruefeInhalt(`${tx}${r.inhalt()}`));
  };

  REGELN.forEach((r, i) => {
    const nr = `Regel ${i + 1}`;
    const beispiel = r.befehl ?? r.beispielText;
    const u = sperre(r);
    zeilen.push(`${i + 1}. ${r.name}`, `   Beispiel: ${beispiel}`);
    if (u.wirft) {
      abweichungen.push(`${nr}: die Prüfung wirft eine Ausnahme (${u.wirft})`);
      zeilen.push(`   Urteil: nicht messbar (${u.wirft})`, '');
      return;
    }
    if (!u.deny) {
      abweichungen.push(`${nr} («${r.name}»): das Beispiel wird NICHT gesperrt`);
      zeilen.push('   Urteil: frei, das ist eine Abweichung vom Erwarteten', '');
      return;
    }
    zeilen.push('   Urteil: gesperrt', `   Grund: ${u.deny}`);

    if (r.varianten) {
      const urteile = r.varianten.map(([name, befehl]) => [name, bash(befehl)]);
      const namen = r.varianten.map(([name]) => name).join(' · ');
      const offen = urteile.filter(([, v]) => frei(v)).map(([n]) => n);
      const kaputt = urteile.filter(([, v]) => v.wirft);
      for (const n of offen) abweichungen.push(`${nr}: die Variante «${n}» wird NICHT gesperrt`);
      for (const [n, v] of kaputt) abweichungen.push(`${nr}: die Prüfung wirft bei der Variante «${n}» eine Ausnahme (${v.wirft})`);
      const ergebnis = offen.length === 0 && kaputt.length === 0
        ? `${urteile.length} von ${urteile.length} gesperrt`
        : [offen.length > 0 ? `NICHT gesperrt: ${offen.join(', ')}` : '', kaputt.length > 0 ? `nicht messbar: ${kaputt.map(([n, v]) => `${n} (${v.wirft})`).join(', ')}` : ''].filter(Boolean).join('; ');
      zeilen.push(`   Varianten (müssen ebenfalls gesperrt sein): ${namen} → ${ergebnis}`);
    }

    if (r.pfad) {
      const p = frage(() => modul.pruefePfad(r.pfad));
      if (p.wirft) {
        abweichungen.push(`${nr}: der Patch-Weg wirft eine Ausnahme (${p.wirft})`);
        zeilen.push(`   Patch-Weg: ${r.pfad} → nicht messbar (${p.wirft})`);
      } else if (!p.deny) {
        abweichungen.push(`${nr}: der Patch-Weg sperrt ${r.pfad} NICHT`);
        zeilen.push(`   Patch-Weg: ${r.pfad} → frei, das ist eine Abweichung vom Erwarteten`);
      } else {
        zeilen.push(`   Patch-Weg: ${r.pfad} → gesperrt`);
      }
    }

    if (r.ausweg) {
      if (!auswege.includes(r.ausweg)) abweichungen.push(`${nr}: der Ausweg ${r.ausweg} steht nicht in AUSWEGE`);
      const a = bash(`${r.ausweg}=1 ${r.befehl}`);
      if (a.wirft) {
        abweichungen.push(`${nr}: die Prüfung wirft mit dem Ausweg ${r.ausweg}=1 eine Ausnahme (${a.wirft})`);
        zeilen.push(`   Ausweg: ${r.ausweg}=1 vor den Befehl (nicht messbar: ${a.wirft})`);
      } else {
        if (!frei(a)) abweichungen.push(`${nr}: der Ausweg ${r.ausweg}=1 macht das Beispiel NICHT frei`);
        zeilen.push(`   Ausweg: ${r.ausweg}=1 vor den Befehl (gemessen: ${frei(a) ? 'dann frei' : 'hebt die Sperre NICHT auf'})`);
      }
      if (r.trockenBefehl) trockenlauf(r, nr);
    } else if (r.marker) {
      const m = sperre(r, `${r.marker}\n`);
      if (m.wirft) {
        abweichungen.push(`${nr}: die Prüfung wirft beim Marker ${r.marker} eine Ausnahme (${m.wirft})`);
        zeilen.push(`   Ausweg: nur für erfundene Testwerte der Marker «${r.marker}» in einem Kommentar der Datei (nicht messbar: ${m.wirft})`);
      } else {
        if (!frei(m)) abweichungen.push(`${nr}: der Marker ${r.marker} macht das Beispiel NICHT frei`);
        zeilen.push(`   Ausweg: nur für erfundene Testwerte der Marker «${r.marker}» in einem Kommentar der Datei (gemessen: ${frei(m) ? 'dann frei' : 'hebt die Sperre NICHT auf'})`);
      }
    } else {
      const urteile = auswege.map(a => [a, bash(`${a}=1 ${r.befehl}`)]);
      const wirksam = urteile.filter(([, v]) => frei(v)).map(([a]) => a);
      const kaputt = urteile.filter(([, v]) => v.wirft);
      if (wirksam.length > 0) abweichungen.push(`${nr}: ${wirksam.join(', ')} hebt die Sperre auf, obwohl sie keinen Ausweg haben soll`);
      for (const [a, v] of kaputt) abweichungen.push(`${nr}: die Prüfung wirft mit ${a}=1 eine Ausnahme (${v.wirft})`);
      const gemessen = kaputt.length > 0
        ? `nicht messbar: ${kaputt.map(([a, v]) => `${a} (${v.wirft})`).join(', ')}${wirksam.length > 0 ? `; ${wirksam.join(', ')} macht frei, das ist eine Abweichung` : ''}`
        : wirksam.length === 0 ? 'keine der Auswege-Variablen macht frei' : `${wirksam.join(', ')} macht frei, das ist eine Abweichung`;
      zeilen.push(`   Ausweg: keiner (gemessen: ${gemessen})`);
    }

    if (r.grenze) {
      const g = bash(r.grenze);
      if (g.wirft) {
        abweichungen.push(`${nr}: die Prüfung wirft bei der Grenze «${r.grenze}» eine Ausnahme (${g.wirft})`);
        zeilen.push(`   Grenze, gemessen: «${r.grenze}» → nicht messbar (${g.wirft})`);
      } else {
        zeilen.push(`   Grenze, gemessen: «${r.grenze}» → ${gesperrt(g) ? 'gesperrt' : 'frei (ohne erkennbares Skript wird nichts geraten)'}`);
      }
    }
    zeilen.push('');
  });

  /** Das Merken eines Trockenlaufs: ein Lauf ohne LIVE=1 muss gemerkt werden, danach ist LIVE=1 für DASSELBE Skript frei, für ein anderes nicht. */
  function trockenlauf(r, nr) {
    const t = bash(r.trockenBefehl);
    if (t.wirft) {
      abweichungen.push(`${nr}: die Prüfung wirft beim Trockenlauf «${r.trockenBefehl}» eine Ausnahme (${t.wirft})`);
      zeilen.push(`   Trockenlauf merken: «${r.trockenBefehl}» → nicht messbar (${t.wirft})`);
      return;
    }
    if (!t.merke) {
      abweichungen.push(`${nr}: ein Lauf ohne LIVE=1 («${r.trockenBefehl}») wird nicht als Trockenlauf gemerkt, ein späteres LIVE=1 bliebe für immer gesperrt`);
      zeilen.push(`   Trockenlauf merken: «${r.trockenBefehl}» → NICHT gemerkt, das ist eine Abweichung vom Erwarteten`);
      return;
    }
    zeilen.push(`   Trockenlauf merken: «${r.trockenBefehl}» → gemerkt als «${t.merke}»`);
    const nach = bash(r.befehl, [t.merke]);
    if (nach.wirft) abweichungen.push(`${nr}: die Prüfung wirft nach einem Trockenlauf von ${t.merke} eine Ausnahme (${nach.wirft})`);
    else if (!frei(nach)) abweichungen.push(`${nr}: nach einem Trockenlauf von ${t.merke} bleibt LIVE=1 gesperrt`);
    zeilen.push(`   Ohne Ausweg: nach dem Trockenlauf von ${t.merke} in dieser Sitzung (${nach.wirft ? `nicht messbar: ${nach.wirft}` : `gemessen: ${frei(nach) ? 'dann frei' : 'bleibt gesperrt'}`})`);
    const fremd = bash(r.befehl, [ANDERES_SKRIPT]);
    if (fremd.wirft) abweichungen.push(`${nr}: die Prüfung wirft mit einem anderen Skript im Trockenlauf eine Ausnahme (${fremd.wirft})`);
    else if (!gesperrt(fremd)) abweichungen.push(`${nr}: ein anderes Skript im Trockenlauf (${ANDERES_SKRIPT}) macht LIVE=1 für ${BEISPIEL_SKRIPT} frei`);
    zeilen.push(`   Ein anderes Skript im Trockenlauf macht es nicht frei (${fremd.wirft ? `nicht messbar: ${fremd.wirft}` : `gemessen: ${gesperrt(fremd) ? 'bleibt gesperrt' : 'FREI, das ist eine Abweichung'}`})`);
  }

  const benutzt = new Set(REGELN.map(r => r.ausweg).filter(Boolean));
  for (const a of auswege) if (!benutzt.has(a)) abweichungen.push(`${a} steht in AUSWEGE, aber keine Regel dieses Berichts nutzt ihn (neue Regel ohne Beispiel?)`);

  const gegen = GEGENPROBEN.map(b => [b, bash(b)]);
  const zuHart = gegen.filter(([, u]) => gesperrt(u)).map(([b]) => b);
  const kaputt = gegen.filter(([, u]) => u.wirft);
  for (const b of zuHart) abweichungen.push(`Gegenprobe «${b}» wird gesperrt, sie müsste frei sein`);
  for (const [b, u] of kaputt) abweichungen.push(`Gegenprobe «${b}»: die Prüfung wirft eine Ausnahme (${u.wirft})`);
  const urteilGegen = zuHart.length === 0 && kaputt.length === 0
    ? 'alle frei'
    : [zuHart.length > 0 ? `GESPERRT: ${zuHart.join(' · ')}` : '', kaputt.length > 0 ? `NICHT MESSBAR: ${kaputt.map(([b, u]) => `${b} (${u.wirft})`).join(' · ')}` : ''].filter(Boolean).join('; ');
  zeilen.push(`Gegenproben (müssen frei sein): ${GEGENPROBEN.join(' · ')} → ${urteilGegen}`);
  zeilen.push(`Die Auswege (${auswege.join(', ')}) gelten nur nach dem ausdrücklichen Ja des Besitzers in diesem Chat.`);
  zeilen.push('Eine Leitplanke ist eine Gedächtnisstütze, keine Sicherheitsgrenze.');
  zeilen.push('');
  zeilen.push(abweichungen.length === 0
    ? `Messung: alle ${REGELN.length} Regeln wie erwartet.`
    : `ABWEICHUNG (${abweichungen.length}): ${abweichungen.join(' | ')}`);
  return { text: zeilen.join('\n'), abweichungen };
}
