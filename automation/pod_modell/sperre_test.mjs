// Tests für sperre.mjs (nur Dateien in einem Wegwerf-Ordner, kein Netz). Lauf: /opt/node22/bin/node automation/pod_modell/sperre_test.mjs
import { mkdtempSync, existsSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sperreNehmen, SPERRE_MAX_ALTER_H } from './sperre.mjs';
import { neuerTest } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('sperre');
const d = mkdtempSync(join(tmpdir(), 'fabrik-sperre-'));
const led = (n) => join(d, `${n}.txt`);
const T0 = Date.parse('2026-11-05T12:00:00Z');

{
  const a = sperreNehmen(led('a'), { jetzt: () => T0, pid: 1111, lebt: () => true });
  ist('erste Sperre wird genommen und ist eine Datei neben dem Ledger', [a.ok, existsSync(`${led('a')}.lock`)], [true, true]);
  const b = sperreNehmen(led('a'), { jetzt: () => T0 + 60000, pid: 2222, lebt: () => true });
  wahr('zweiter Lauf mit lebendigem ersten: verweigert, Grund nennt PID und Datei', b.ok === false && /1111/.test(b.grund) && /\.lock/.test(b.grund));
  a.freigeben();
  ist('Freigabe löscht die Datei', existsSync(`${led('a')}.lock`), false);
  const c = sperreNehmen(led('a'), { jetzt: () => T0, pid: 2222, lebt: () => true });
  ist('nach der Freigabe geht die Sperre wieder', c.ok, true);
  c.freigeben();
}
{ // veraltet: älter als die Frist
  const a = sperreNehmen(led('b'), { jetzt: () => T0, pid: 1111, lebt: () => true });
  const b = sperreNehmen(led('b'), { jetzt: () => T0 + (SPERRE_MAX_ALTER_H + 0.5) * 3.6e6, pid: 2222, lebt: () => true });
  ist('Sperre älter als die Frist wird übernommen (auch wenn der Prozess noch lebt)', [b.ok, /veraltet/.test(b.uebernommen ?? '')], [true, true]);
  b.freigeben();
}
{ // veraltet: Prozess weg
  sperreNehmen(led('c'), { jetzt: () => T0, pid: 1111, lebt: () => true });
  const b = sperreNehmen(led('c'), { jetzt: () => T0 + 1000, pid: 2222, lebt: () => false });
  ist('Sperre eines toten Prozesses wird übernommen', [b.ok, /läuft nicht mehr/.test(b.uebernommen ?? '')], [true, true]);
  b.freigeben();
}
{ // unlesbar
  writeFileSync(`${led('d')}.lock`, 'kaputt');
  const b = sperreNehmen(led('d'), { jetzt: () => T0, pid: 2222, lebt: () => true });
  ist('unlesbare Sperrdatei wird übernommen', [b.ok, b.uebernommen], [true, 'unlesbare Sperre übernommen']);
  b.freigeben();
}
{ // eine fremde Freigabe löscht nichts
  const a = sperreNehmen(led('e'), { jetzt: () => T0, pid: 1111, lebt: () => true });
  writeFileSync(`${led('e')}.lock`, JSON.stringify({ pid: 3333, zeit: new Date(T0).toISOString() }));
  a.freigeben();
  ist('freigeben() löscht nur die eigene Sperre', existsSync(`${led('e')}.lock`), true);
}
{ // gleiche PID im alten File (Neustart mit derselben PID): wird nicht als «ein anderer Lauf» gezählt
  writeFileSync(`${led('f')}.lock`, JSON.stringify({ pid: 4444, zeit: new Date(T0).toISOString() }));
  const b = sperreNehmen(led('f'), { jetzt: () => T0 + 1000, pid: 4444, lebt: () => true });
  ist('eigene PID in einer alten Sperre: übernommen', b.ok, true);
  b.freigeben();
}
ist('ohne Ledger keine Sperre', sperreNehmen(null).ok, false);
{ // echter Prozess: die eigene PID lebt
  const a = sperreNehmen(led('g'));
  const b = sperreNehmen(led('g'), { pid: process.pid + 100000 });
  wahr('echte Prüfung: die PID dieses Prozesses lebt, die zweite Sperre scheitert', a.ok && b.ok === false);
  a.freigeben();
  ist('Datei steht nach dem Test nicht mehr da', existsSync(`${led('g')}.lock`), false);
}
rmSync(d, { recursive: true, force: true });
ende();
