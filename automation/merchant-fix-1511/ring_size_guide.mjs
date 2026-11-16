import fs from 'node:fs';
import {createShopifyClient} from './shopify_client.mjs';
const HANDLE='geburtsstein-ring-mit-zirkonia-601500',PAGE='ringgroesse-richtig-messen';
const MARKER='luxe-ringgroesse-hilfe';
const extra=`<section id="${MARKER}"><h2>Ringgrösse wählen</h2><p>Die Auswahl 6–10 bezeichnet Herstellergrössen. Für dieses Modell liegt noch keine bestätigte Zuordnung zu US- oder EU-Grössen vor. Bitte kläre die passende Grösse vor der Bestellung mit uns.</p><p><a href="/pages/${PAGE}">Ringgrösse messen: Anleitung und EU-Grössentabelle</a></p></section>`;
async function main(){
 const gql=await createShopifyClient();const dir='merchant-ring-size-guide';fs.mkdirSync(dir,{recursive:true});const live=process.env.LIVE==='1';
 const fields='id handle title status descriptionHtml updatedAt options{id name values} variants(first:100){pageInfo{hasNextPage} nodes{id sku price compareAtPrice}}';
 const read=async()=> (await gql(`query($h:String!){productByIdentifier(identifier:{handle:$h}){${fields}}}`,{h:HANDLE})).productByIdentifier;
 const product=await read();if(product?.handle!==HANDLE||product.status!=='ACTIVE'||product.variants.pageInfo.hasNextPage)throw Error('Unerwartetes Produkt/unvollständige Varianten');
 const pages=await gql('query($q:String!){pages(first:10,query:$q){nodes{id handle title body isPublished updatedAt}}}',{q:'handle:'+PAGE});
 if(pages.pages.nodes.some(p=>p.handle===PAGE&&!p.body.includes('luxe-ringgroessen-messen')))throw Error('Vorhandene fremde Grössenseite wird nicht überschrieben');
 fs.writeFileSync(`${dir}/before.json`,JSON.stringify({product,pages:pages.pages.nodes},null,2));
 const body=fs.readFileSync('dropship/merchant-fix-1511/ringgroesse/guide.html','utf8');
 const opt=product.options.find(o=>o.name==='Ringgrösse (Hersteller)'||o.name==='Abmessung');
 if(opt){
  try{const translations=await gql('query($id:ID!){translatableResource(resourceId:$id){resourceId translatableContent{key value digest locale} de:translations(locale:"de"){key value outdated} fr:translations(locale:"fr"){key value outdated}}}',{id:opt.id});fs.writeFileSync(`${dir}/option-translations.json`,JSON.stringify(translations,null,2));}catch(e){console.log('Option-Übersetzungen nicht messbar: '+e.message);}
 }
 if(!live){console.log('TROCKENLAUF: allgemeine EU-Messtabelle, keine erfundene Zuordnung der Herstellergrössen');return;}
 let page=pages.pages.nodes.find(p=>p.handle===PAGE);
 if(!page){const d=(await gql('mutation($p:PageCreateInput!){pageCreate(page:$p){page{id handle body isPublished} userErrors{field message}}}',{p:{title:'Ringgrösse richtig messen',handle:PAGE,body,isPublished:true}})).pageCreate;if(d.userErrors.length)throw Error(JSON.stringify(d.userErrors));page=d.page;}
 if(!page.isPublished||!page.body.includes('luxe-ringgroessen-messen'))throw Error('Ratgeber nicht bestätigt');
 if(!product.descriptionHtml.includes(MARKER)){
  const fresh=await read();if(JSON.stringify(fresh)!==JSON.stringify(product))throw Error('Produkt zwischenzeitlich geändert');
  const d=(await gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}',{p:{id:product.id,descriptionHtml:product.descriptionHtml+'\n'+extra}})).productUpdate;
  if(d.userErrors.length)throw Error(JSON.stringify(d.userErrors));
 }
 const naming=await read();const size=naming.options.find(o=>o.name==='Abmessung');
 if(size){
  if(JSON.stringify(size.values)!==JSON.stringify(['6','7','8','9','10']))throw Error('Herstellergrössen verändert; Bezeichnung nicht ändern');
  const d=(await gql('mutation($p:ID!,$o:OptionUpdateInput!){productOptionUpdate(productId:$p,option:$o){userErrors{field message} product{id}}}',{p:product.id,o:{id:size.id,name:'Ringgrösse (Hersteller)'}})).productOptionUpdate;
  if(d.userErrors.length)throw Error(JSON.stringify(d.userErrors));
 }
 // Flush the product representation after renaming its option; content stays identical.
 const refresh=await read();const touched=(await gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{field message}}}',{p:{id:refresh.id,descriptionHtml:refresh.descriptionHtml}})).productUpdate;
 if(touched.userErrors.length)throw Error(JSON.stringify(touched.userErrors));
 const after=await read();if(!after.options.some(o=>o.name==='Ringgrösse (Hersteller)'))throw Error('Grössenbezeichnung nicht bestätigt');fs.writeFileSync(`${dir}/after.json`,JSON.stringify(after,null,2));
 if(!after.descriptionHtml.includes(MARKER)||!after.descriptionHtml.includes('/pages/'+PAGE)||after.status!==product.status||after.title!==product.title||JSON.stringify(after.variants)!==JSON.stringify(product.variants))throw Error('Rücklesen stimmt nicht mit Ziel überein');
 const d=(await gql('query($id:ID!){page(id:$id){id handle body isPublished}}',{id:page.id})).page;if(!d.isPublished||!d.body.includes('EU-Grössentabelle')&&!d.body.includes('EU-Grösse'))throw Error('Seite nicht bestätigt');
 fs.writeFileSync(`${dir}/verified.json`,JSON.stringify({verified:true,page:'/pages/'+PAGE,product:HANDLE,manufacturerSizeSystemConfirmed:false,variantIdsSkusPricesPreserved:true},null,2));console.log('BESTÄTIGT: EU-Messratgeber live und am Ring verlinkt; fehlende Herstellerumrechnung transparent, Varianten und Preise unverändert');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
