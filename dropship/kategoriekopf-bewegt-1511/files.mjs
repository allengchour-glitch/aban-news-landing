import { gql } from './shop.mjs';
let after = null, n = 0; const out = [];
for (let i = 0; i < 20; i++) {
  const d = await gql(`query($a:String){files(first:250,after:$a,query:"created_at:>2026-11-10",sortKey:CREATED_AT,reverse:true){pageInfo{hasNextPage endCursor} nodes{__typename id createdAt ... on GenericFile{url mimeType originalFileSize} ... on Video{filename sources{url width height}} ... on MediaImage{image{url width height}}}}}`, { a: after });
  for (const f of d.files.nodes) { n++; const u = f.url || f.sources?.[0]?.url || f.image?.url || ''; if (/\.mp4|video/i.test(u + f.__typename + (f.mimeType||''))) out.push([f.createdAt, f.__typename, f.mimeType, f.originalFileSize, u.split('?')[0].split('/').pop(), f.sources ? f.sources.map(s=>s.width+'x'+s.height).join(',') : '']); }
  if (!d.files.pageInfo.hasNextPage) break; after = d.files.pageInfo.endCursor;
}
console.log('Dateien seit 10.11.:', n);
for (const r of out) console.log(r.join(' | '));
