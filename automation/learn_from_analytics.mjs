#!/usr/bin/env node
/* LuxeStyle — learn_from_analytics.mjs  (SHIM → automation/brain/brain.mjs)
 *
 * Diese Datei war die erste, einfache Lernschleife (nahm NUR den letzten Report → Regressionsrisiko,
 * brachte z.B. die tote Marken-Sackgasse #luxestyle zurueck). Sie wurde durch das „Gehirn" ersetzt:
 * automation/brain/brain.mjs lernt ALLE Reports kumulativ, blockt bewiesene Verlierer dauerhaft und
 * bewahrt kuratierte Gewinner (Ratsche → wird nur besser). Damit alte Aufrufe/Workflows weiter
 * funktionieren, delegiert dieser Shim einfach ans Gehirn.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const brain = path.resolve(new URL('./brain/brain.mjs', import.meta.url).pathname);
const r = spawnSync(process.execPath, [brain, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status || 0);
