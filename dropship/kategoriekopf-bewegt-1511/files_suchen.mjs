// Sucht Shopify Files nach Dateinamen-Praefix. Aufruf: node files_suchen.mjs lx-kb-
import { gql } from './shop.mjs';
const q = process.argv[2] || 'lx-kb-';
const d = await gql(`query($q:String){files(first:50,query:$q){nodes{__typename id fileStatus createdAt ... on GenericFile{url originalFileSize mimeType}}}}`, { q: 'filename:' + q + '*' });
const n = d.files.nodes.filter((f) => (f.url || '').includes('/' + q));
console.log('Treffer', n.length);
for (const f of n) console.log(f.id, f.fileStatus, f.originalFileSize, f.url);
