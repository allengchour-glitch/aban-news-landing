import { kimi } from './kimi.mjs';
import fs from 'node:fs';
const sys="Du bist Top-Schweizer-E-Commerce-Copywriter, CRO- & Social-Media-Stratege. Deutsch, Schweizer Ton («ss»), premium, knapp, verkaufsstark. Antworte NUR mit gültigem JSON, kein Markdown.";
const usr=`Shop LuxeStyle.ch (CH-Online-Shop, Mode/Schmuck/Uhren/Spielzeug/Kostueme/Deko). USPs: Blitzversand CH-Lager 1-2 Tage, Gratis ab CHF 50, 30 Tage Rueckgabe, Kauf auf Rechnung (Klarna/TWINT). IG @luxestyle.ch: 152 Follower, 855 gefolgt, ~2000 Aufrufe/30T. Aktion 1. August Code AUGUST15=-15%.
Liefere NUR dieses JSON:
{
 "website_kritik":[4 konkrete Schwachstellen + Fix],
 "hero":[3x {"headline":"max32","subline":"max75"}],
 "usps":[4 Einzeiler mit Emoji max40],
 "announcement":"1 Zeile Emoji max70",
 "seo_meta":[3 Beispiel-Meta-Descriptions fuer Kollektionen, je max150],
 "instagram_kritik":[3 Punkte + Fix (152 Follower Problem, 855 gefolgt)],
 "instagram_captions":[3 verkaufsstarke IG-Captions mit Hooks + Hashtags],
 "tiktok_ideen":[4 konkrete TikTok-Video-Ideen fuer einen CH-Shop, viral-tauglich]
}`;
const out=await kimi(sys,usr,{json:true,max_tokens:3000,timeout:400000});
fs.writeFileSync('/tmp/kimi_out.json', out||'FEHLER: keine Antwort');
console.log('FERTIG, Länge:', (out||'').length);
