/**
 * Bericht für den Skill regeln: zeigt die Leitplanken NICHT aus einer abgeschriebenen Liste, sondern misst sie.
 * Jede Regel hat einen Beispielbefehl (oder Beispieltext); der Bericht fragt lib/regeln.mjs, ob der Beispielbefehl
 * gesperrt wird, was der Grund sagt und ob der Ausweg wirklich frei macht. Wird eine Regel geändert, stimmt der
 * Bericht mit, und eine Abweichung vom Erwarteten steht als ABWEICHUNG da, nie als Stille.
 *
 * Reine Funktion: bekommt das Modul (lib/regeln.mjs oder eine Attrappe im Test), startet nichts, schreibt nichts.
 * Die Beispiele werden nur an pruefeBash/pruefeInhalt gereicht, nie ausgeführt. Das Geheimnis-Beispiel entsteht erst
 * zur Laufzeit aus Teilen und steht nie als Ganzes in einer Datei oder im Bericht.
 */

/** Was das Modul liefern muss; fehlt etwas, ist kein Bericht möglich. */
export const ERWARTET = Object.freeze({ pruefeBash: 'function', pruefeInhalt: 'function', AUSWEGE: 'array' });

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

/** Ein Text im Muster eines Shopify-Zugangs, erst hier zusammengesetzt (kein Geheimnis, nur die Form). */
export const geheimnisProbe = () => `${'sh'}${'pat_'}${'a'.repeat(32)}`;

/** Die Regeln des Berichts. `befehl`: Beispiel für pruefeBash; `inhalt`: Beispiel für pruefeInhalt. */
export const REGELN = Object.freeze([
  { name: 'Kein Force-Push', befehl: 'git push --force origin main', ausweg: 'LUXE_FORCE_OK' },
  { name: 'Kein pkill und kein killall', befehl: 'pkill -f laufen.py', ausweg: 'LUXE_KILL_OK' },
  { name: 'Kein git add -A und kein git add .', befehl: 'git add -A', ausweg: 'LUXE_ADD_OK' },
  { name: 'dropship/_SOCIAL_STOPP wird nie neu angelegt (Löschen und Lesen sind erlaubt)', befehl: 'touch dropship/_SOCIAL_STOPP', ausweg: null },
  { name: 'LIVE=1 erst nach einem Trockenlauf desselben Skripts in dieser Sitzung', befehl: `LIVE=1 node ${BEISPIEL_SKRIPT}`, ausweg: 'LUXE_LIVE_OK', trocken: BEISPIEL_SKRIPT },
  { name: 'Keine Geheimnisse in Dateien (Shopify-, Stripe-, Groq-, Google-, GitHub-, Slack-, OpenAI-, Anthropic-, AWS-Schlüssel, privater PEM-Schlüssel)', beispielText: 'ein Text im Muster eines Shopify-Zugangs', inhalt: geheimnisProbe, marker: 'luxe-geheim-ok' },
]);

/** Befehle, die frei sein müssen: sie beweisen, dass die Regeln nicht einfach alles sperren. */
export const GEGENPROBEN = Object.freeze(['git status -sb', 'git push origin neuer-branch', 'git add codex-mods/README.md', `node ${BEISPIEL_SKRIPT}`]);

/** Ruft `f`; eine Ausnahme ist ein eigenes Urteil, nie ein Absturz des Berichts. */
function frage(f) {
  try {
    const u = f();
    // Eine Sperre ohne Grund zählt als frei: Codex verwirft ein deny ohne Begründung.
    return { deny: typeof u?.deny === 'string' && u.deny.trim() ? u.deny.trim() : undefined };
  } catch (fehler) {
    return { wirft: fehler instanceof Error ? fehler.message : String(fehler) };
  }
}

/**
 * Misst alle Regeln an `modul` (lib/regeln.mjs). Ergebnis: `{ text, abweichungen }`; `abweichungen` ist leer, wenn
 * jedes Beispiel gesperrt wird, jeder Ausweg frei macht, kein Ausweg für die Regel ohne Ausweg wirkt und alle
 * Gegenproben frei sind. Setzt voraus, dass `schnittstelleFehlt(modul)` leer ist.
 */
export function bericht(modul) {
  const abweichungen = [];
  const auswege = modul.AUSWEGE;
  const zeilen = ['Leitplanken von luxe-codex, so wie lib/regeln.mjs sie jetzt durchsetzt (gemessen an Beispielen, es wird nichts ausgeführt)', ''];

  const sperre = (r, tx = '') => {
    if (r.befehl) return frage(() => modul.pruefeBash(`${tx}${r.befehl}`, []));
    return frage(() => modul.pruefeInhalt(`${tx}${r.inhalt()}`));
  };

  REGELN.forEach((r, i) => {
    const beispiel = r.befehl ?? r.beispielText;
    const u = sperre(r);
    zeilen.push(`${i + 1}. ${r.name}`, `   Beispiel: ${beispiel}`);
    if (u.wirft) {
      abweichungen.push(`Regel ${i + 1}: die Prüfung wirft eine Ausnahme (${u.wirft})`);
      zeilen.push(`   Urteil: nicht messbar (${u.wirft})`, '');
      return;
    }
    if (!u.deny) {
      abweichungen.push(`Regel ${i + 1} («${r.name}»): das Beispiel wird NICHT gesperrt`);
      zeilen.push('   Urteil: frei, das ist eine Abweichung vom Erwarteten', '');
      return;
    }
    zeilen.push('   Urteil: gesperrt', `   Grund: ${u.deny}`);

    if (r.ausweg) {
      if (!auswege.includes(r.ausweg)) abweichungen.push(`Regel ${i + 1}: der Ausweg ${r.ausweg} steht nicht in AUSWEGE`);
      const frei = !frage(() => modul.pruefeBash(`${r.ausweg}=1 ${r.befehl}`, [])).deny;
      if (!frei) abweichungen.push(`Regel ${i + 1}: der Ausweg ${r.ausweg}=1 macht das Beispiel NICHT frei`);
      zeilen.push(`   Ausweg: ${r.ausweg}=1 vor den Befehl (gemessen: ${frei ? 'dann frei' : 'hebt die Sperre NICHT auf'})`);
      if (r.trocken) {
        const nachTrocken = !frage(() => modul.pruefeBash(r.befehl, [r.trocken])).deny;
        if (!nachTrocken) abweichungen.push(`Regel ${i + 1}: nach einem Trockenlauf von ${r.trocken} bleibt LIVE=1 gesperrt`);
        zeilen.push(`   Ohne Ausweg: nach einem Trockenlauf von ${r.trocken} in dieser Sitzung (gemessen: ${nachTrocken ? 'dann frei' : 'bleibt gesperrt'})`);
      }
    } else if (r.marker) {
      const frei = !sperre(r, `${r.marker}\n`).deny;
      if (!frei) abweichungen.push(`Regel ${i + 1}: der Marker ${r.marker} macht das Beispiel NICHT frei`);
      zeilen.push(`   Ausweg: nur für erfundene Testwerte der Marker «${r.marker}» in einem Kommentar der Datei (gemessen: ${frei ? 'dann frei' : 'hebt die Sperre NICHT auf'})`);
    } else {
      const wirksam = auswege.filter(a => !frage(() => modul.pruefeBash(`${a}=1 ${r.befehl}`, [])).deny);
      if (wirksam.length > 0) abweichungen.push(`Regel ${i + 1}: ${wirksam.join(', ')} hebt die Sperre auf, obwohl sie keinen Ausweg haben soll`);
      zeilen.push(`   Ausweg: keiner (gemessen: ${wirksam.length === 0 ? 'keine der Auswege-Variablen macht frei' : `${wirksam.join(', ')} macht frei, das ist eine Abweichung`})`);
    }
    zeilen.push('');
  });

  const benutzt = new Set(REGELN.map(r => r.ausweg).filter(Boolean));
  for (const a of auswege) if (!benutzt.has(a)) abweichungen.push(`${a} steht in AUSWEGE, aber keine Regel dieses Berichts nutzt ihn (neue Regel ohne Beispiel?)`);

  const gesperrteGegenproben = GEGENPROBEN.filter(b => frage(() => modul.pruefeBash(b, [])).deny);
  for (const b of gesperrteGegenproben) abweichungen.push(`Gegenprobe «${b}» wird gesperrt, sie müsste frei sein`);
  zeilen.push(`Gegenproben (müssen frei sein): ${GEGENPROBEN.join(' · ')} → ${gesperrteGegenproben.length === 0 ? 'alle frei' : `GESPERRT: ${gesperrteGegenproben.join(' · ')}`}`);
  zeilen.push(`Die Auswege (${auswege.join(', ')}) gelten nur nach dem ausdrücklichen Ja des Besitzers in diesem Chat.`);
  zeilen.push('Eine Leitplanke ist eine Gedächtnisstütze, keine Sicherheitsgrenze.');
  zeilen.push('');
  zeilen.push(abweichungen.length === 0
    ? `Messung: alle ${REGELN.length} Regeln wie erwartet.`
    : `ABWEICHUNG (${abweichungen.length}): ${abweichungen.join(' | ')}`);
  return { text: zeilen.join('\n'), abweichungen };
}
