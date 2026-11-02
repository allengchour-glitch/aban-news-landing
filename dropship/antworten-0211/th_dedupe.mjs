import fs from 'node:fs';import { g } from './sh.mjs';
const LIVE=process.env.LIVE==='1';
const raw=fs.readFileSync('/tmp/cm/th_main2/templates__collection.json','utf8');
fs.copyFileSync('/tmp/cm/th_main2/templates__collection.json','/tmp/cm/collection_vor_dedupe.json');
const kopf=(raw.match(/^\/\*[\s\S]*?\*\/\s*/)||[''])[0];const j=JSON.parse(raw.slice(kopf.length));
let s=j.sections.lux_subchips.settings.custom_liquid;
const alt1=`<ul class="lx-tabs__zeile">
  {%- for ch in chips -%}
    {%- if forloop.index <= lx_max or ch.url == collection.url -%}
      <li><a href="{{ ch.url }}"{% if ch.url == collection.url %} aria-current="page"{% endif %}>{{ ch.title }}</a></li>
    {%- endif -%}
  {%- endfor -%}
</ul>`;
const neu1=`<ul class="lx-tabs__zeile">
  {%- assign lx_seen = '|' -%}{%- assign lx_shown = 0 -%}
  {%- for ch in chips -%}
    {%- assign lx_key = '|' | append: ch.url | append: '|' -%}
    {%- unless lx_seen contains lx_key -%}
      {%- assign lx_seen = lx_seen | append: ch.url | append: '|' -%}
      {%- assign lx_shown = lx_shown | plus: 1 -%}
      {%- if lx_shown <= lx_max or ch.url == collection.url -%}
        <li><a href="{{ ch.url }}"{% if ch.url == collection.url %} aria-current="page"{% endif %}>{{ ch.title }}</a></li>
      {%- endif -%}
    {%- endunless -%}
  {%- endfor -%}
  {%- assign lx_n = lx_shown -%}
</ul>`;
const alt2=`<ul class="lx-tabs__alle">
  {%- for ch in chips -%}<li><a href="{{ ch.url }}"{% if ch.url == collection.url %} aria-current="page"{% endif %}>{{ ch.title }}</a></li>{%- endfor -%}
</ul>`;
const neu2=`<ul class="lx-tabs__alle">
  {%- assign lx_seen2 = '|' -%}
  {%- for ch in chips -%}{%- assign lx_key2 = '|' | append: ch.url | append: '|' -%}{%- unless lx_seen2 contains lx_key2 -%}{%- assign lx_seen2 = lx_seen2 | append: ch.url | append: '|' -%}<li><a href="{{ ch.url }}"{% if ch.url == collection.url %} aria-current="page"{% endif %}>{{ ch.title }}</a></li>{%- endunless -%}{%- endfor -%}
</ul>`;
if(!s.includes(alt1)||!s.includes(alt2))throw new Error('Muster nicht gefunden');
s=s.replace(alt1,neu1).replace(alt2,neu2);
// lx_n wird nach der ersten Schleife gesetzt, die Pruefung "lx_n > lx_max" folgt danach: ok
j.sections.lux_subchips.settings.custom_liquid=s;
const out=kopf+JSON.stringify(j,null,2);
fs.writeFileSync('/tmp/cm/collection_dedupe.json',out);
console.log('neu',out.length,'alt',raw.length);
if(!LIVE)process.exit(0);
const r=(await g(`mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$f){upsertedThemeFiles{filename} userErrors{field message}}}`,{id:'gid://shopify/OnlineStoreTheme/213013037447',f:[{filename:'templates/collection.json',body:{type:'TEXT',value:out}}]})).themeFilesUpsert;
console.log(JSON.stringify(r));
