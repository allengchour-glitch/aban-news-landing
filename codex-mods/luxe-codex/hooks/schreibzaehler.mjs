/**
 * PostToolUse-Hook (und SessionStart mit Argument «start»): zählt erfolgreiche schreibende Zugriffe nach aussen
 * (Shop, Social, Mail, Live) und zeigt «Schreibzugriffe · Shop 2 · Social 1» als Meldung. Die Logik steht in
 * ../lib/zaehler.mjs, damit sie sich ohne Prozess testen lässt. Ein Fehler hier blockiert nie (Exit 0), bleibt aber sichtbar.
 */
import { laufe } from '../lib/hook_io.mjs';
import { behandle } from '../lib/zaehler.mjs';

process.exitCode = await laufe('schreibzaehler', (eingabe, env) => behandle(eingabe, env, process.argv[2] === 'start'));
