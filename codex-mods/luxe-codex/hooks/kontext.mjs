/**
 * SessionStart und UserPromptSubmit: bringt zusätzlichen Kontext in die Sitzung.
 *  - SessionStart: die fünf wichtigsten Projektregeln (immer, kurz) und bei Sparmodus AN den Stil-Text.
 *  - UserPromptSubmit: bei Sparmodus AN eine Erinnerung von höchstens 200 Zeichen, bei AUS nichts.
 * Das Ereignis kommt aus hook_event_name der Eingabe, nicht aus einem Argument. Die Logik steht in ../lib/modus.mjs.
 */
import { laufe } from '../lib/hook_io.mjs';
import { kontextAusgabe } from '../lib/modus.mjs';

process.exitCode = await laufe('kontext', (eingabe, env) => kontextAusgabe(eingabe, env));
