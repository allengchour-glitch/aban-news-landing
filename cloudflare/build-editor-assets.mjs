/* Bündelt die Storefront-Editor-Skripte (pod/designer.js + pod/personalize.js)
 * als String-Exporte in src/editor-assets.js, damit der Worker sie als First-Party-
 * Assets unter /ls-designer.js bzw. /ls-personalize.js ausliefern kann.
 * Aufruf:  node build-editor-assets.mjs   (aus dem cloudflare/-Ordner)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const designer = readFileSync(join(root, 'pod', 'designer.js'), 'utf8');
const personalize = readFileSync(join(root, 'pod', 'personalize.js'), 'utf8');

const out = `/* AUTO-GENERIERT von build-editor-assets.mjs — NICHT von Hand editieren.
 * Quelle: pod/designer.js + pod/personalize.js
 */
export const DESIGNER_JS = ${JSON.stringify(designer)};
export const PERSONALIZE_JS = ${JSON.stringify(personalize)};
`;
writeFileSync(join(here, 'src', 'editor-assets.js'), out);
console.log('editor-assets.js geschrieben:', designer.length, '+', personalize.length, 'Bytes');
