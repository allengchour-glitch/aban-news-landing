// Tests für lib/grind_plan.mjs («Grind 2.0», Plan für NEUE Produkte). Rein, ohne Netz. Gegenproben in BEIDE Richtungen; die Zusammenfassung steht am ENDE.
//
// Datengrundlage: Auszüge (nur die Felder, die planeNeu liest) aus ECHTEN product/query-Antworten von CJ, gelesen am 26.10.2026 aus dem Zwischenspeicher
// /tmp/cj_fakten_cache (2 235 Datenblätter). Die Werte sind unverändert; wo ein Test eine Eigenschaft braucht, die in keinem echten Datenblatt vorkommt
// (Fremdstecker ohne Euro-Variante, Zahlen unter «Color», 101 Varianten, Erwachsenen-Ware), wird das echte Datenblatt ABGELEITET und der Test sagt es («abgeleitet»).
//
// Optionaler Reihentest über ALLE echten Datenblätter (nicht in der CI): GRIND_PLAN_CACHE=/tmp/cj_fakten_cache node automation/lib/grind_plan_test.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import {
  planeNeu, handleAus, slug, pidKurz, galerieAus, normalisiereCj, sortiereGroessen, streicheToteOptionen, preisLeser, schemaPruefen, konsistenzPruefen,
  API_VERSION, MAX_VARIANTEN, MIN_BILDER, VAR_MARKER, BASIS_TAGS, TORE, FRISTEN, PRODUCT_SET_MUTATION, SCHEMA, GOOGLE_TYP, ERWACHSENE_RE, TABAK_RE, MESSGERAET_RE, ANZUENDER_RE,
  SCHEMA_API_VERSION, ziffernKollision, kleinWortImWert, KLEIN_WORT_RE, PRODUKTART_WIDERSPRUCH, fremdsteckerImNamen, heikelWort,
  kinderWort, kinderImText, kinderware, zusatzSperrwort, heikelImText, STECKDOSE_EN_RE, fremdsteckerImText, steckerKontextVon,
} from './grind_plan.mjs';
import { ledgerGedaechtnis } from './varianten_sicherheit.mjs';
import { zerlege } from './text_prosa.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};
const wirft = (name, fn, muster) => {
  try { fn(); fehl++; console.log('FEHLER', name, '\n  soll werfen, hat aber nicht geworfen'); }
  catch (e) { if (!muster || muster.test(String(e.message))) ok++; else { fehl++; console.log('FEHLER', name, '\n  falsche Meldung:', e.message); } }
};
const klon = x => JSON.parse(JSON.stringify(x));
const runde = x => Math.round(x * 100) / 100;

// ───────────────────────── Echte CJ-Datenblätter (Auszüge) ─────────────────────────
const FIX = {
  // Auszug (nur die Felder, die planeNeu liest) aus echten product/query-Antworten, gelesen aus dem Zwischenspeicher /tmp/cj_fakten_cache (Stand 26.10.2026). Werte unverändert.
  mode: { // 2-teilige-mesh-bluse-resille-langarm-mit-hollow-out
    pid: "2605290641261605000",
    productNameEn: "Two-piece Long-sleeved Fashionable Hollow-out Mesh Blouse",
    productSku: "CJYD2914710",
    productKeyEn: "Color-Size",
    categoryName: "Women's Clothing > Tops & Sets > Suits & Sets",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/quick/product/bfdffa14-7bda-4f7b-9cee-8d4777f14bc8.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/quick/product/bfdffa14-7bda-4f7b-9cee-8d4777f14bc8.jpg\",\"https://cf.cjdropshipping.com/quick/product/12b5b56c-2606-431d-99ce-78504125d48b.jpg\",\"https://cf.cjdropshipping.com/quick/product/6aaec1e1-ccf3-4567-b65f-f515f4d344cd.jpg\",\"https://cf.cjdropshipping.com/quick/product/9e4380fd-6448-4388-a777-12732da9bd11.jpg\",\"https://cf.cjdropshipping.com/quick/product/aaf20922-96a5-4ab8-9e7d-a78b23fbf88e.jpg\",\"https://cf.cjdropshipping.com/quick/product/f1e1bf73-296c-44ab-95d0-97334784c898.jpg\",\"https://cf.cjdropshipping.com/quick/product/dd8e83d4-9e5f-4968-ba2d-398aa32f6562.jpg\"]",
    variants: [
      {"vid":"2605290641261606600","variantSku":"CJYD291471001AZ","variantKey":"Black-S","variantImage":"https://cf.cjdropshipping.com/quick/product/f1e1bf73-296c-44ab-95d0-97334784c898.jpg","variantWeight":222,"variantSellPrice":7.88},
      {"vid":"2605290641261607600","variantSku":"CJYD291471002BY","variantKey":"Black-M","variantImage":"https://cf.cjdropshipping.com/quick/product/f1e1bf73-296c-44ab-95d0-97334784c898.jpg","variantWeight":232,"variantSellPrice":7.88},
      {"vid":"2605290641261608700","variantSku":"CJYD291471003CX","variantKey":"Black-L","variantImage":"https://cf.cjdropshipping.com/quick/product/f1e1bf73-296c-44ab-95d0-97334784c898.jpg","variantWeight":242,"variantSellPrice":7.88},
      {"vid":"2605290641261609300","variantSku":"CJYD291471004DW","variantKey":"Black-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/f1e1bf73-296c-44ab-95d0-97334784c898.jpg","variantWeight":252,"variantSellPrice":7.88},
      {"vid":"2605290641261609900","variantSku":"CJYD291471005EV","variantKey":"Black-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/f1e1bf73-296c-44ab-95d0-97334784c898.jpg","variantWeight":262,"variantSellPrice":7.88},
      {"vid":"2605290641271600500","variantSku":"CJYD291471006FU","variantKey":"White-S","variantImage":"https://cf.cjdropshipping.com/quick/product/dd8e83d4-9e5f-4968-ba2d-398aa32f6562.jpg","variantWeight":222,"variantSellPrice":7.88},
      {"vid":"2605290641271601000","variantSku":"CJYD291471007GT","variantKey":"White-M","variantImage":"https://cf.cjdropshipping.com/quick/product/dd8e83d4-9e5f-4968-ba2d-398aa32f6562.jpg","variantWeight":232,"variantSellPrice":7.88},
      {"vid":"2605290641271601600","variantSku":"CJYD291471008HS","variantKey":"White-L","variantImage":"https://cf.cjdropshipping.com/quick/product/dd8e83d4-9e5f-4968-ba2d-398aa32f6562.jpg","variantWeight":242,"variantSellPrice":7.88},
      {"vid":"2605290641271602200","variantSku":"CJYD291471009IR","variantKey":"White-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/dd8e83d4-9e5f-4968-ba2d-398aa32f6562.jpg","variantWeight":252,"variantSellPrice":7.88},
      {"vid":"2605290641271602800","variantSku":"CJYD291471010JQ","variantKey":"White-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/dd8e83d4-9e5f-4968-ba2d-398aa32f6562.jpg","variantWeight":262,"variantSellPrice":7.88},
    ],
  },
  einzel: { // 100-stuck-wattestabchen-im-karton-fc57c0
    pid: "083C30C4-EB88-45AE-87DA-AC4A4EFC57C0",
    productNameEn: "100pc boxed cotton swabs",
    productSku: "CJJZGJSD00849",
    productKeyEn: "Color",
    categoryName: "Home Improvement / Tools / Hand Tools",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/16010496/7823795377488.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/16010496/7823795377488.jpg\",\"https://cf.cjdropshipping.com/20200927/1349818977914.jpg\",\"https://cf.cjdropshipping.com/20200927/7826328732145.jpg\",\"https://cf.cjdropshipping.com/20200927/1622882307921.jpg\"]",
    variants: [
      {"vid":"51070B22-1C4A-49A1-AFE7-B07882C8E2BA","variantSku":"CJJZGJSD00849-100pcs","variantKey":"100pcs","variantImage":"https://cf.cjdropshipping.com/20200927/399228858531.jpg","variantWeight":80,"variantSellPrice":0.55},
    ],
  },
  stecker: { // 2-in-1-lockenstab-glatteisen-679680
    pid: "1361117633956679680",
    productNameEn: "Curling Iron With Bangs And Curly Hair Does Not Hurt Hair Straightener",
    productSku: "CJTF1012846",
    productKeyEn: "Color-Electrical outlet",
    categoryName: "Health & Beauty， Hair > Beauty Tools > Straightening Irons",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/1613350489718.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/1613350489718.jpg\",\"https://cf.cjdropshipping.com/1613350489725.jpg\",\"https://cf.cjdropshipping.com/1613350489728.jpg\",\"https://cf.cjdropshipping.com/1613350489982.jpg\",\"https://cf.cjdropshipping.com/1613350489985.jpg\",\"https://cf.cjdropshipping.com/1613350489722.jpg\",\"https://cf.cjdropshipping.com/1613350489716.jpg\",\"https://cf.cjdropshipping.com/1613350489715.jpg\"]",
    variants: [
      {"vid":"1361117635256913920","variantSku":"CJTF101284601AZ","variantKey":"Black-EU","variantImage":"https://cf.cjdropshipping.com/1613350489725.jpg","variantWeight":406,"variantSellPrice":4.13},
      {"vid":"1361117635307245568","variantSku":"CJTF101284602BY","variantKey":"Black-US","variantImage":"https://cf.cjdropshipping.com/1613350489728.jpg","variantWeight":406,"variantSellPrice":4.13},
      {"vid":"1361117635353382912","variantSku":"CJTF101284603CX","variantKey":"Black-UK","variantImage":"https://cf.cjdropshipping.com/1613350489982.jpg","variantWeight":406,"variantSellPrice":4.31},
      {"vid":"1361117635403714560","variantSku":"CJTF101284604DW","variantKey":"Black-AU","variantImage":"https://cf.cjdropshipping.com/1613350489985.jpg","variantWeight":406,"variantSellPrice":4.31},
    ],
  },
  unsicher: { // 10-make-up-pinsel-in-pastellfarben-1f3d7c
    pid: "489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C",
    productNameEn: "10 candy-colored makeup brushes",
    productSku: "CJBJHZHZ00502",
    productKeyEn: "Color",
    categoryName: "Health & Beauty, Hair / Makeup / Makeup Brushes",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/203104/767574434313.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/203104/767574434313.jpg\",\"https://cf.cjdropshipping.com/203104/2774522476943.jpg\",\"https://cf.cjdropshipping.com/203104/2242877869376.jpg\",\"https://cf.cjdropshipping.com/203104/979004052690.jpg\"]",
    variants: [
      {"vid":"5A21C461-996D-47A8-AA11-9A280576D5E0","variantSku":"CJBJHZHZ00502-Lime","variantKey":"Lime","variantImage":"https://cf.cjdropshipping.com/203104/1890220451880.jpg","variantWeight":138,"variantSellPrice":2.61},
      {"vid":"CB350026-8DC6-45FC-97AA-63F993974472","variantSku":"CJBJHZHZ00502-Peach","variantKey":"Peach","variantImage":"https://cf.cjdropshipping.com/203104/29358840397457.jpg","variantWeight":138,"variantSellPrice":2.61},
      {"vid":"F374EFA3-D0FF-4EF7-965E-B8249149E32D","variantSku":"CJBJHZHZ00502-Watermelon red","variantKey":"Watermelon red","variantImage":"https://cf.cjdropshipping.com/203104/767574434313.jpg","variantWeight":138,"variantSellPrice":2.61},
      {"vid":"FBFFB8B5-CE9D-450E-ACD3-B9036F77F612","variantSku":"CJBJHZHZ00502-Avocado","variantKey":"Avocado","variantImage":"https://cf.cjdropshipping.com/203104/450792409926.jpg","variantWeight":138,"variantSellPrice":2.61},
    ],
  },
  zahl: { // fissman-schneidebretter-set-mit-marmorbeschich-6709b1
    pid: "1F521504-63AA-48A1-AA6B-4850BA6709B1",
    productNameEn: "Kitchen multifunctional cutting board",
    productSku: "CJJJCFCF01522",
    productKeyEn: "Model",
    categoryName: "Home & Garden, Furniture / Kitchen, Dining & Bar / Kitchen Knives & Accessories",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/20200910/4318186284214.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/20200910/4318186284214.jpg\",\"https://cf.cjdropshipping.com/20200910/3402487069958.jpg\",\"https://cf.cjdropshipping.com/20200910/949896997934.jpg\",\"https://cf.cjdropshipping.com/20200910/7368565050194.jpg\",\"https://cf.cjdropshipping.com/20200910/9107357387014.jpg\"]",
    variants: [
      {"vid":"83793DB1-0695-4487-B618-F6C6C3CD2340","variantSku":"CJJJCFCF01522-8016","variantKey":"8016","variantImage":"https://cf.cjdropshipping.com/20200910/44087378822274.jpg","variantWeight":1030,"variantSellPrice":6.13},
      {"vid":"D87B0CFA-3C2D-4B7F-A350-9BB29F44FBD5","variantSku":"CJJJCFCF01522-8017","variantKey":"8017","variantImage":"https://cf.cjdropshipping.com/20200910/4318186284214.jpg","variantWeight":1150,"variantSellPrice":6.62},
    ],
  },
  hinweis: { // multifunktionale-sport-umhangetasche-605100
    pid: "2502190619241605100",
    productNameEn: "Multifunctional Large Capacity Sports Messenger Bag",
    productSku: "CJYD2295626",
    productKeyEn: "Color-Capacity",
    categoryName: "Bags & Shoes > Men's Luggage & Bags > Men's Backpacks",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://oss-cf.cjdropshipping.com/product/2025/02/19/06/eefdb74b-a220-4374-aa04-ec59820f81a4.jpg",
    productImage: "[\"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/eefdb74b-a220-4374-aa04-ec59820f81a4.jpg\",\"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/1a40f375-bd91-4ea9-85b1-dde12ed43d2c.jpg\",\"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/792c8e7b-e181-4011-a18f-fe5939e37990.jpg\",\"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/085f2a97-9600-485a-aa20-cf1959444d7a.jpg\",\"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/fdac6ec3-4fd5-4e71-9f34-3d1a3ef1dffb.jpg\",\"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/03f99ee8-db09-493f-9cdf-78dce3277698.jpg\"]",
    variants: [
      {"vid":"2502190619241605300","variantSku":"CJYD229562601AZ","variantKey":"Black-15L","variantImage":"https://oss-cf.cjdropshipping.com/product/2025/02/19/06/03f99ee8-db09-493f-9cdf-78dce3277698.jpg","variantWeight":896,"variantSellPrice":13.08},
      {"vid":"2502190619241605400","variantSku":"CJYD229562602BY","variantKey":"Blue-15L","variantImage":"https://cf.cjdropshipping.com/quick/product/d22151d2-544d-4eaa-b1d0-4da566ab8322.jpg","variantWeight":883,"variantSellPrice":13.08},
    ],
  },
  hyphen: { // einheitliches-fahrradhelm-304704
    pid: "1367073159471304704",
    productNameEn: "One-Piece Bicycle Helmet Men's And Women's Equipment Accessories",
    productSku: "CJZX1027390",
    productKeyEn: "Color-Size",
    categoryName: "Sports & Outdoors > Cycling > Bicycle Helmets",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/1614770205195.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/1614770205195.jpg\",\"https://cf.cjdropshipping.com/1614770205194.jpg\",\"https://cf.cjdropshipping.com/1614770205203.jpg\",\"https://cf.cjdropshipping.com/1614770205201.jpg\",\"https://cf.cjdropshipping.com/1614770205198.jpg\"]",
    variants: [
      {"vid":"1367073160796704768","variantSku":"CJZX102739001AZ","variantKey":"White-52-62cm","variantImage":"https://cf.cjdropshipping.com/1614770205203.jpg","variantWeight":268,"variantSellPrice":6.2},
      {"vid":"1367073160956088320","variantSku":"CJZX102739002BY","variantKey":"Black-52-62cm","variantImage":"https://cf.cjdropshipping.com/1614770205195.jpg","variantWeight":268,"variantSellPrice":6.2},
      {"vid":"1367073161019002880","variantSku":"CJZX102739003CX","variantKey":"Red-52-62cm","variantImage":"https://cf.cjdropshipping.com/1614770205194.jpg","variantWeight":268,"variantSellPrice":6.2},
      {"vid":"1367073161081917440","variantSku":"CJZX102739004DW","variantKey":"Blue-52-62cm","variantImage":"https://cf.cjdropshipping.com/1614770205201.jpg","variantWeight":268,"variantSellPrice":6.2},
    ],
  },
  diy: { // diy-retro-halskette-mit-buchstabe-diamant-639600
    pid: "2608060835411639600",
    productNameEn: "DIY Retro Fashion-Inspired Trendy Women's Necklace Series",
    productSku: "CJLX3041568",
    productKeyEn: "Color-style",
    categoryName: "Jewelry & Watches > Fashion Jewelry > Necklace & Pendants",
    status: "3",
    productType: "DIY_PRODUCT",
    isTestProduct: false,
    customizationVersion: 2,
    bigImage: "https://oss-cf.cjdropshipping.com/product/2026/08/06/08/d9ecced7-eeea-42f7-bd76-a1630398df9a.jpg",
    productImage: "[\"https://oss-cf.cjdropshipping.com/product/2026/08/06/08/d9ecced7-eeea-42f7-bd76-a1630398df9a.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/08/06/08/583b586c-ab78-4eeb-a360-8dc687dc9d1f.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/08/06/08/9e12e404-0ca5-45db-9f8b-9d67d8987dda.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/08/06/08/94126a9d-9643-4147-9308-19647c63f037.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/08/06/08/6cf632d0-ddf2-4a62-9de7-c6d9ac212a8b.jpg\"]",
    variants: [
      {"vid":"2608060835421630400","variantSku":"CJLX304156801AZ","variantKey":"Gold-1 drill and 1 letter","variantImage":"https://oss-cf.cjdropshipping.com/product/2026/08/06/08/9e12e404-0ca5-45db-9f8b-9d67d8987dda.jpg","variantWeight":20,"variantSellPrice":4.43},
    ],
  },
  wenig: { // 40-farbige-augen-schatten-palette-607500
    pid: "2502260715321607500",
    productNameEn: "Makeup 40-color Eye Shadow Combination Suit",
    productSku: "CJYD2308285",
    productKeyEn: "Color Classification",
    categoryName: "Health, Beauty & Hair > Makeup > Eyeshadow",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://oss-cf.cjdropshipping.com/product/2025/02/26/07/a6d5bfd7-5789-4709-b44e-545c08660b82.jpg",
    productImage: "[\"https://oss-cf.cjdropshipping.com/product/2025/02/26/07/a6d5bfd7-5789-4709-b44e-545c08660b82.jpg\",\"https://oss-cf.cjdropshipping.com/product/2025/02/26/07/26f01342-6b79-47c0-99e0-f8b3ab3ef320.jpg\"]",
    variants: [
      {"vid":"2502260715321607800","variantSku":"CJYD230828501AZ","variantKey":"SET002A","variantImage":"https://oss-cf.cjdropshipping.com/product/2025/02/26/07/a6d5bfd7-5789-4709-b44e-545c08660b82.jpg","variantWeight":200,"variantSellPrice":3.49},
      {"vid":"2502260715321608000","variantSku":"CJYD230828502BY","variantKey":"SET002B","variantImage":"https://oss-cf.cjdropshipping.com/product/2025/02/26/07/26f01342-6b79-47c0-99e0-f8b3ab3ef320.jpg","variantWeight":200,"variantSellPrice":3.49},
    ],
  },
  lizenz: { // 12-neon-nagelpuder-set-623300
    pid: "2601120143321623300",
    productNameEn: "12-Color Fluorescent Nail Art Powder Set In A Barbie-Style Clear Box",
    productSku: "CJYD2725369",
    productKeyEn: "Color Classification",
    categoryName: "Health, Beauty & Hair > Nail Art & Tools > Nail Art Kits",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://oss-cf.cjdropshipping.com/product/2026/01/12/01/feb0b99e-f887-4684-9e02-3847150c2621_fine.jpeg",
    productImage: "[\"https://oss-cf.cjdropshipping.com/product/2026/01/12/01/feb0b99e-f887-4684-9e02-3847150c2621_fine.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2026/01/12/01/d9f4a73d-f342-4318-9333-ebea1969f71d_trans.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2026/01/12/01/7ed1ceb5-2089-4676-958b-7f39430807d7_fine.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2026/01/12/01/a38188a9-bbcc-4bcf-baf3-e7ba6c89aca4_fine.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2026/01/12/01/07d8f4c7-c391-412c-af23-10bd53533fd6_fine.jpeg\"]",
    variants: [
      {"vid":"2601120143321623500","variantSku":"CJYD272536901AZ","variantKey":"12 Colors Suit","variantImage":"https://oss-cf.cjdropshipping.com/product/2026/01/12/01/07d8f4c7-c391-412c-af23-10bd53533fd6_fine.jpeg","variantWeight":205,"variantSellPrice":2.19},
    ],
  },
  viele: { // boho-resort-set-2-teilig-sommer-kollektion-2026-top-hose
    pid: "2605300752571605400",
    productNameEn: "Bohemian SpringSummer Resort-Style Top And Pants Set For Europe And America",
    productSku: "CJLS2915949",
    productKeyEn: "Color-Size",
    categoryName: "Women's Clothing > Tops & Sets > Suits & Sets",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg\",\"https://cf.cjdropshipping.com/quick/product/cb7def10-7677-427e-9b0b-58176a0b37b4.jpg\",\"https://cf.cjdropshipping.com/quick/product/3a0af592-89bd-4607-abc0-447dc8bca98c.jpg\",\"https://cf.cjdropshipping.com/quick/product/e0682bc0-de42-4d93-a3e5-bf5ba9a38f74.jpg\",\"https://cf.cjdropshipping.com/quick/product/00be95b0-5353-49b1-b5b2-1e1caf007836.jpg\",\"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg\",\"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg\",\"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg\",\"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg\",\"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg\",\"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg\",\"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg\",\"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg\"]",
    variants: [
      {"vid":"2605300752571606100","variantSku":"CJLS291594901AZ","variantKey":"White-S","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300752571606700","variantSku":"CJLS291594902BY","variantKey":"White-M","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300752571607200","variantSku":"CJLS291594903CX","variantKey":"White-L","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300752571607700","variantSku":"CJLS291594904DW","variantKey":"White-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300752571608200","variantSku":"CJLS291594905EV","variantKey":"White-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300752571608700","variantSku":"CJLS291594906FU","variantKey":"White-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300752571609200","variantSku":"CJLS291594907GT","variantKey":"White-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300752571609700","variantSku":"CJLS291594908HS","variantKey":"White-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/17fa4a46-a2b1-4e2c-8c57-c9b3b9090577.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300752581600200","variantSku":"CJLS291594909IR","variantKey":"Black-S","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300752581600800","variantSku":"CJLS291594910JQ","variantKey":"Black-M","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300752581601200","variantSku":"CJLS291594911KP","variantKey":"Black-L","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300752581601900","variantSku":"CJLS291594912LO","variantKey":"Black-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300752581602800","variantSku":"CJLS291594913MN","variantKey":"Black-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300752581603500","variantSku":"CJLS291594914NM","variantKey":"Black-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300752581603900","variantSku":"CJLS291594915OL","variantKey":"Black-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300752581604500","variantSku":"CJLS291594916PK","variantKey":"Black-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/02d94ee0-f14c-4c92-a1ae-52889e3bde8a.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300752581605000","variantSku":"CJLS291594917QJ","variantKey":"Light Gray-S","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300752581605500","variantSku":"CJLS291594918RI","variantKey":"Light Gray-M","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300752581606000","variantSku":"CJLS291594919SH","variantKey":"Light Gray-L","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300752581606600","variantSku":"CJLS291594920TG","variantKey":"Light Gray-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300752581607100","variantSku":"CJLS291594921UF","variantKey":"Light Gray-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300752581607600","variantSku":"CJLS291594922VE","variantKey":"Light Gray-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300752581608100","variantSku":"CJLS291594923WD","variantKey":"Light Gray-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300752581608700","variantSku":"CJLS291594924XC","variantKey":"Light Gray-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/b3ba6818-a62c-4f38-bf0b-d1e867375a84.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300752581609200","variantSku":"CJLS291594925YB","variantKey":"Pink-S","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300752581609700","variantSku":"CJLS291594926ZA","variantKey":"Pink-M","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300752591600100","variantSku":"CJLS291594927AZ","variantKey":"Pink-L","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300752591600700","variantSku":"CJLS291594928BY","variantKey":"Pink-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300752591601200","variantSku":"CJLS291594929CX","variantKey":"Pink-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300752591601700","variantSku":"CJLS291594930DW","variantKey":"Pink-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300752591602200","variantSku":"CJLS291594931EV","variantKey":"Pink-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300752591602800","variantSku":"CJLS291594932FU","variantKey":"Pink-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/5565d037-31a9-41d0-be6c-be75c280a833.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300752591603200","variantSku":"CJLS291594933GT","variantKey":"Orange Red-S","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300752591603800","variantSku":"CJLS291594934HS","variantKey":"Orange Red-M","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300752591604200","variantSku":"CJLS291594935IR","variantKey":"Orange Red-L","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300752591604700","variantSku":"CJLS291594936JQ","variantKey":"Orange Red-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300752591605200","variantSku":"CJLS291594937KP","variantKey":"Orange Red-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300752591605800","variantSku":"CJLS291594938LO","variantKey":"Orange Red-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300752591606200","variantSku":"CJLS291594939MN","variantKey":"Orange Red-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300752591606700","variantSku":"CJLS291594940NM","variantKey":"Orange Red-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/dc88e815-1901-4968-ae95-22ed39aa9400.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300752591607100","variantSku":"CJLS291594941OL","variantKey":"Wine Red-S","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300752591607600","variantSku":"CJLS291594942PK","variantKey":"Wine Red-M","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300752591608000","variantSku":"CJLS291594943QJ","variantKey":"Wine Red-L","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300752591608500","variantSku":"CJLS291594944RI","variantKey":"Wine Red-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300752591608900","variantSku":"CJLS291594945SH","variantKey":"Wine Red-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300752591609300","variantSku":"CJLS291594946TG","variantKey":"Wine Red-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300752591609800","variantSku":"CJLS291594947UF","variantKey":"Wine Red-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300753001600300","variantSku":"CJLS291594948VE","variantKey":"Wine Red-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/74400fe3-94fc-44b0-a557-9c635f718b4f.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300753001600800","variantSku":"CJLS291594949WD","variantKey":"Dark Blue-S","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300753001601300","variantSku":"CJLS291594950XC","variantKey":"Dark Blue-M","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300753001601700","variantSku":"CJLS291594951YB","variantKey":"Dark Blue-L","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300753001602200","variantSku":"CJLS291594952ZA","variantKey":"Dark Blue-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300753001602600","variantSku":"CJLS291594953AZ","variantKey":"Dark Blue-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300753001603100","variantSku":"CJLS291594954BY","variantKey":"Dark Blue-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300753001603500","variantSku":"CJLS291594955CX","variantKey":"Dark Blue-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300753001604000","variantSku":"CJLS291594956DW","variantKey":"Dark Blue-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/f9b07cb1-d0a5-4c12-a5d6-cad0636d5310.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300753001604400","variantSku":"CJLS291594957EV","variantKey":"Light Blue-S","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300753001604800","variantSku":"CJLS291594958FU","variantKey":"Light Blue-M","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300753001605300","variantSku":"CJLS291594959GT","variantKey":"Light Blue-L","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300753001605700","variantSku":"CJLS291594960HS","variantKey":"Light Blue-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300753001606200","variantSku":"CJLS291594961IR","variantKey":"Light Blue-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300753001606600","variantSku":"CJLS291594962JQ","variantKey":"Light Blue-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300753001607100","variantSku":"CJLS291594963KP","variantKey":"Light Blue-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300753001607500","variantSku":"CJLS291594964LO","variantKey":"Light Blue-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/1f051c54-b005-4df1-a8cc-efcf605c79f4.jpg","variantWeight":620,"variantSellPrice":9.29},
      {"vid":"2605300753001607900","variantSku":"CJLS291594965MN","variantKey":"Light Green-S","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":480,"variantSellPrice":9.29},
      {"vid":"2605300753001608700","variantSku":"CJLS291594966NM","variantKey":"Light Green-M","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":500,"variantSellPrice":9.29},
      {"vid":"2605300753001609400","variantSku":"CJLS291594967OL","variantKey":"Light Green-L","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":520,"variantSellPrice":9.29},
      {"vid":"2605300753011600300","variantSku":"CJLS291594968PK","variantKey":"Light Green-XL","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":540,"variantSellPrice":9.29},
      {"vid":"2605300753011600700","variantSku":"CJLS291594969QJ","variantKey":"Light Green-XXL","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":560,"variantSellPrice":9.29},
      {"vid":"2605300753011601600","variantSku":"CJLS291594970RI","variantKey":"Light Green-3XL","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":580,"variantSellPrice":9.29},
      {"vid":"2605300753011602400","variantSku":"CJLS291594971SH","variantKey":"Light Green-4XL","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":600,"variantSellPrice":9.29},
      {"vid":"2605300753011602900","variantSku":"CJLS291594972TG","variantKey":"Light Green-5XL","variantImage":"https://cf.cjdropshipping.com/quick/product/e8a83165-48b0-44fa-afdf-d166ad195908.jpg","variantWeight":620,"variantSellPrice":9.29},
    ],
  },
  zusammen: { // beruhigendes-kuscheltier-608200
    pid: "2407020647451608200",
    productNameEn: "Breathing Rabbit Soothing Sensory Plush Toy With Relieve Anxiety Bunny Comforter Breathes For Newborn Conciliate Baby",
    productSku: "CJMR2073592",
    productKeyEn: "Color-Height",
    categoryName: "Toys, Kids & Babies > Toys & Hobbies > Stuffed & Plush Animals",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://oss-cf.cjdropshipping.com/product/2024/07/29/03/ce089123-f7d3-4aeb-8e5b-8ad1c98ecc45.jpg",
    productImage: "[\"https://oss-cf.cjdropshipping.com/product/2024/07/29/03/ce089123-f7d3-4aeb-8e5b-8ad1c98ecc45.jpg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/29/03/b940be8f-0532-4bc5-8088-6bdb8ae1a59d.jpg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/29/03/44f2763e-edbe-4459-b447-e48ba85061aa.jpg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/29/03/827b4d6a-641e-4b85-a7ae-eb686b765749.jpg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/29/03/b1875932-c675-40be-b485-aca0722cb132.jpg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/29/03/dd835ae1-4940-4453-b24e-51f904208418.jpg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/d6a62b60-6b01-4252-ab76-3d6a3593989b_fine.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/e6c0dc98-1fc9-41e7-b435-5383fe21d05a_fine.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/7e8be58d-870b-4736-95a7-b99afc03181b_fine.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/ee241e66-5cd1-4c3f-baec-7b92ae250e57.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/192c188c-50a4-48e3-83c4-efc2ff6d082a.jpeg\",\"https://oss-cf.cjdropshipping.com/product/2025/07/08/11/e3fb9b8d-a93d-49ff-8fa0-382012fe6b6e.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/09/21/00/8cd2827e-b8f3-489d-80fd-30b0f2a65bf1.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/09/30/08/9cd76da8-7a91-4835-9c2a-e64ba8701edc.jpg\",\"https://oss-cf.cjdropshipping.com/product/2026/09/30/08/678d435e-f8c8-4cdc-bd15-6522f0674b1b.jpg\"]",
    variants: [
      {"vid":"2407020647451608600","variantSku":"CJMR207359201AZ","variantKey":"New Breathing Rabbit-32cm","variantImage":"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/e6c0dc98-1fc9-41e7-b435-5383fe21d05a_fine.jpeg","variantWeight":340,"variantSellPrice":4.96},
      {"vid":"2507081117091603800","variantSku":"CJMR207359203CX","variantKey":"4speed breathing elephant-32cm","variantImage":"https://oss-cf.cjdropshipping.com/product/2025/07/08/11/e3fb9b8d-a93d-49ff-8fa0-382012fe6b6e.jpg","variantWeight":340,"variantSellPrice":3.69},
      {"vid":"2510281003591627200","variantSku":"CJMR207359205EV","variantKey":"New Breathing Rabbit-28cm","variantImage":"https://oss-cf.cjdropshipping.com/product/2024/07/02/06/e6c0dc98-1fc9-41e7-b435-5383fe21d05a_fine.jpeg","variantWeight":340,"variantSellPrice":3.69},
      {"vid":"2609210005481637600","variantSku":"CJMR207359207GT","variantKey":"Koala-32cm","variantImage":"https://oss-cf.cjdropshipping.com/product/2026/09/21/00/8cd2827e-b8f3-489d-80fd-30b0f2a65bf1.jpg","variantWeight":300,"variantSellPrice":2.94},
      {"vid":"2609300803491632200","variantSku":"CJMR207359215OL","variantKey":"White elk-30cm","variantImage":"https://oss-cf.cjdropshipping.com/product/2026/09/30/08/9cd76da8-7a91-4835-9c2a-e64ba8701edc.jpg","variantWeight":340,"variantSellPrice":3.51},
      {"vid":"2609300803491632201","variantSku":"CJMR207359218RI","variantKey":"Brown elk-30cm","variantImage":"https://oss-cf.cjdropshipping.com/product/2026/09/30/08/678d435e-f8c8-4cdc-bd15-6522f0674b1b.jpg","variantWeight":340,"variantSellPrice":3.51},
    ],
  },
  kind: { // armbanduhr-fur-kinder-schlicht-klar-233344
    pid: "1589075009778233344",
    productNameEn: "Watch Student Simple And Clear Number Little Boy",
    productSku: "CJSY1606000",
    productKeyEn: "Color",
    categoryName: "Jewelry & Watches > Men's Watches > Quartz Watches",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/ddd148e8-a897-45a3-b1c6-882a1934fe25.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/ddd148e8-a897-45a3-b1c6-882a1934fe25.jpg\",\"https://cf.cjdropshipping.com/ab3ac12b-a6f7-49b9-ac5f-44764de02855.jpg\",\"https://cf.cjdropshipping.com/9a264712-31ba-4428-89b7-db117f82cc00.jpg\",\"https://cf.cjdropshipping.com/7e6ae9f6-b71b-4424-a2f7-af7ff3a481e5.jpg\",\"https://cf.cjdropshipping.com/9ea8617f-98f1-409b-ac8c-5c546368406a.jpg\",\"https://cf.cjdropshipping.com/dbab520d-589e-42db-990e-1eebb76fb9b8.jpg\",\"https://cf.cjdropshipping.com/21430bf4-8afe-4512-bdbc-e02a4d960fc0.jpg\"]",
    variants: [
      {"vid":"1589075009849536512","variantSku":"CJSY160600001AZ","variantKey":"Blue and white","variantImage":"https://cf.cjdropshipping.com/ab3ac12b-a6f7-49b9-ac5f-44764de02855.jpg","variantWeight":150,"variantSellPrice":3.61},
      {"vid":"1589075009853730816","variantSku":"CJSY160600002BY","variantKey":"Black and white","variantImage":"https://cf.cjdropshipping.com/9a264712-31ba-4428-89b7-db117f82cc00.jpg","variantWeight":150,"variantSellPrice":3.61},
      {"vid":"1589075009857925120","variantSku":"CJSY160600003CX","variantKey":"Green and white","variantImage":"https://cf.cjdropshipping.com/7e6ae9f6-b71b-4424-a2f7-af7ff3a481e5.jpg","variantWeight":150,"variantSellPrice":3.61},
      {"vid":"1589075009857925121","variantSku":"CJSY160600004DW","variantKey":"Black face","variantImage":"https://cf.cjdropshipping.com/9ea8617f-98f1-409b-ac8c-5c546368406a.jpg","variantWeight":150,"variantSellPrice":3.61},
      {"vid":"1589075009857925122","variantSku":"CJSY160600005EV","variantKey":"Blue black","variantImage":"https://cf.cjdropshipping.com/dbab520d-589e-42db-990e-1eebb76fb9b8.jpg","variantWeight":150,"variantSellPrice":3.61},
      {"vid":"1589075009862119424","variantSku":"CJSY160600006FU","variantKey":"Green black","variantImage":"https://cf.cjdropshipping.com/21430bf4-8afe-4512-bdbc-e02a4d960fc0.jpg","variantWeight":150,"variantSellPrice":3.61},
    ],
  },
  iphone: { // fernbedienung-fur-iphone-df3b52
    pid: "38478069-27A0-411C-8797-F4A306DF3B52",
    productNameEn: "Remote control",
    productSku: "CJXFZNZN00680",
    productKeyEn: "Color",
    categoryName: "Consumer Electronics / Smart Electronics / Smart Remote Controls",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/20200428/1983057688099.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/20200428/1983057688099.jpg\",\"https://cf.cjdropshipping.com/20200428/12554826106.jpg\",\"https://cf.cjdropshipping.com/20200428/3188503750514.jpg\",\"https://cf.cjdropshipping.com/20200428/1489004617563.jpg\",\"https://cf.cjdropshipping.com/20200428/7137643173880.jpg\",\"https://cf.cjdropshipping.com/20200428/1168524264756.jpg\"]",
    variants: [
      {"vid":"D26F0A68-EC71-4B46-A2A3-BF12AF7F9A2A","variantSku":"CJXFZNZN00680-Black","variantKey":"Black","variantImage":"https://cf.cjdropshipping.com/20200428/1983057688099.jpg","variantWeight":100,"variantSellPrice":6.48},
    ],
  },
  steckerNur: { // elektrischer-dreh-kreisel-fur-volumenwellen-617472  (NUR Fremdstecker: White-US, Pink-US, Blue-US)
    pid: "1592849659536617472",
    productNameEn: "Electric Rotating Non-invasive Hair Iron Large Volume Wave Volume Female",
    productSku: "CJTF1614204",
    productKeyEn: "Color-Electrical outlet",
    categoryName: "Health, Beauty & Hair > Beauty Tools > Straightening Irons",
    status: "3",
    productType: "ORDINARY_PRODUCT",
    isTestProduct: false,
    bigImage: "https://cf.cjdropshipping.com/63aeecb9-c1ea-4b1f-a5cd-7d49ea316908.jpg",
    productImage: "[\"https://cf.cjdropshipping.com/63aeecb9-c1ea-4b1f-a5cd-7d49ea316908.jpg\",\"https://cf.cjdropshipping.com/7a31da9e-76ab-4a16-8b76-51690b57242a.jpg\",\"https://cf.cjdropshipping.com/f2430417-4422-42e5-9376-958a290e1b70.jpg\",\"https://cf.cjdropshipping.com/9ef60e06-6f74-4818-bd55-1acca0a21dec.jpg\",\"https://cf.cjdropshipping.com/ca044b5d-18fa-400c-869a-fe8fc3582807.jpg\",\"https://cf.cjdropshipping.com/a0fbd5df-c8ef-401d-9eae-ee648f9e4e7a.jpg\"]",
    variants: [
      {"vid":"1592849659561783296","variantSku":"CJTF161420401AZ","variantKey":"White-US","variantImage":"https://cf.cjdropshipping.com/a0fbd5df-c8ef-401d-9eae-ee648f9e4e7a.jpg","variantWeight":430,"variantSellPrice":7.42},
      {"vid":"1592849659565977600","variantSku":"CJTF161420402BY","variantKey":"Pink-US","variantImage":"https://cf.cjdropshipping.com/9ef60e06-6f74-4818-bd55-1acca0a21dec.jpg","variantWeight":430,"variantSellPrice":7.42},
      {"vid":"1592849659565977601","variantSku":"CJTF161420403CX","variantKey":"Blue-US","variantImage":"https://cf.cjdropshipping.com/f2430417-4422-42e5-9376-958a290e1b70.jpg","variantWeight":430,"variantSellPrice":7.42},
    ],
  },
};

// ───────────────────────── Hilfen ─────────────────────────
const KURS = 0.82435;
/** Testpreis: Einstand = (EK + 3 USD Fracht) × Kurs, Preis = Einstand × 2,5. Form (a) von ctx.preis. */
const preisFn = (faktor = 2.5) => v => {
  const kosten = (v.ekUsd + 3) * KURS;
  return { preis: kosten * faktor, kosten: runde(kosten) };
};
const BASIS = { googlePfad: 'Home & Garden > Household Supplies', productType: 'Haushalt', tags: ['sort-haushalt', 'grind2-20261027'], preis: preisFn(), beschreibungHtml: '<p>Ein Text.</p>', bildOk: null };
const lauf = (fix, titel, extra = {}) => planeNeu(fix, { ...BASIS, titel, ...extra });
const tor = (r, name) => r.tore.find(t => t.name === name);
const fallen = r => r.tore.filter(t => t.ok === false).map(t => t.name);
const MODE = { googlePfad: 'Apparel & Accessories > Clothing > Shirts & Tops', productType: 'Bekleidung', tags: ['sort-damen-blusen', 'grind2-20261027'] };
const T_MODE = 'Mesh-Bluse mit Hollow-out, langärmlig';
/** Ein Datenblatt abwandeln (Kopie). */
const ableiten = (fix, f) => { const k = klon(fix); f(k); return k; };
/** Synthetische Zusatzvarianten in der echten Form (nur dort, wo kein echtes Datenblatt die Eigenschaft hat). */
const variante = (i, key, extra = {}) => ({ vid: `SYN-VID-${i}`, variantSku: `CJSYN${String(i).padStart(5, '0')}`, variantKey: key, variantImage: `https://cf.cjdropshipping.com/syn/${i}.jpg`, variantWeight: 100, variantSellPrice: 2, ...extra });

// ───────────────────────── Kleine Bausteine ─────────────────────────
ist('slug: Umlaute wie die vorhandenen Handles, ß → ss', slug('Größe ÄÖÜ Schönheit'), 'grosse-aou-schonheit');
ist('slug: 46 Zeichen, kein hängender Bindestrich', slug('a'.repeat(45) + ' bcd').length <= 46 && !slug('a'.repeat(45) + ' bcd').endsWith('-'), true);
ist('pidKurz: Ziffern-pid → letzte 6 (wie «…-601400»)', pidKurz('2603030141121601400'), '601400');
ist('pidKurz: UUID → letzte 6 Hex, klein (wie «…-1f3d7c»)', pidKurz('489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C'), '1f3d7c');
ist('pidKurz: Müll → leer', [pidKurz(''), pidKurz(null), pidKurz('abc'), pidKurz('12 34 56 78')], ['', '', '', '']);
ist('handleAus: Titel + pid-Ende', handleAus('2605290641261605000', T_MODE), 'mesh-bluse-mit-hollow-out-langarmlig-605000');
ist('handleAus: derselbe Eingang, derselbe Handle (deterministisch)', handleAus('2605290641261605000', T_MODE), handleAus('2605290641261605000', T_MODE));
ist('handleAus: ohne lesbare pid oder ohne Buchstaben im Titel kein Handle', [handleAus('xyz', 'Titel'), handleAus('2605290641261605000', '!!!')], ['', '']);

ist('galerieAus: echte Reihenfolge aus productImage, bigImage zuerst', galerieAus(FIX.mode)[0], FIX.mode.bigImage);
ist('galerieAus: 7 Bilder, keine Doppelten', galerieAus(FIX.mode).length, 7);
ist('galerieAus: fehlt bigImage in der Liste, wird es vorangestellt (4 von 2 235 echten Datenblättern)', galerieAus({ bigImage: 'https://a/0.jpg', productImage: '["https://a/1.jpg","https://a/2.jpg"]' }), ['https://a/0.jpg', 'https://a/1.jpg', 'https://a/2.jpg']);
ist('galerieAus: ohne JSON-Text fällt es auf productImageSet zurück', galerieAus({ productImage: 'kaputt', productImageSet: ['https://a/1.jpg'] }), ['https://a/1.jpg']);
ist('galerieAus: nichts → leer', galerieAus({}), []);
ist('normalisiereCj: ganze Antwort und data sind dasselbe', normalisiereCj({ code: 200, result: true, data: FIX.einzel }) === FIX.einzel && normalisiereCj(FIX.einzel) === FIX.einzel, true);
ist('normalisiereCj: Müll → leeres Objekt', [normalisiereCj(null), normalisiereCj('x'), normalisiereCj(undefined)], [{}, {}, {}]);

ist('sortiereGroessen: Konfektion der Reihe nach', sortiereGroessen(['XL', 'S', 'L', 'M']), ['S', 'M', 'L', 'XL']);
ist('sortiereGroessen: XXL/2XL/3XL und XS', sortiereGroessen(['3XL', 'XXL', 'XS', 'M']), ['XS', 'M', 'XXL', '3XL']);
ist('sortiereGroessen: Zahlen aufsteigend (10 nach 9)', sortiereGroessen(['10', '8', '9', '7.5']), ['7.5', '8', '9', '10']);
ist('sortiereGroessen: EIN unbekannter Wert → CJ-Reihenfolge bleibt (nie halb sortieren)', sortiereGroessen(['L', 'Einheitsgrösse', 'S']), ['L', 'Einheitsgrösse', 'S']);
ist('sortiereGroessen: ein Wert', sortiereGroessen(['M']), ['M']);

// streicheToteOptionen — Optionen ohne Werte oder mit einem Wert
{
  const v2 = [{ vid: 'a', werte: { Farbe: 'Rot', Grösse: 'M' } }, { vid: 'b', werte: { Farbe: 'Rot', Grösse: 'L' } }];
  const r = streicheToteOptionen([{ name: 'Farbe', art: 'farbe' }, { name: 'Grösse', art: 'groesse' }], v2);
  ist('tote Option mit EINEM Wert wird gestrichen, die echte bleibt', [r.ok, r.optionen.map(o => o.name), r.optionen[0].werte, r.gestrichen], [true, ['Grösse'], ['M', 'L'], [{ name: 'Farbe', grund: '1 Wert', wert: 'Rot' }]]);
  ist('… und fehlt in den Varianten', r.varianten.map(v => Object.keys(v.werte)), [['Grösse'], ['Grösse']]);
  const r0 = streicheToteOptionen([{ name: 'Farbe' }, { name: 'Grösse' }], [{ vid: 'a', werte: { Farbe: '', Grösse: 'M' } }, { vid: 'b', werte: { Farbe: ' ', Grösse: 'L' } }]);
  ist('Option ohne Werte (alle leer) wird gestrichen', [r0.ok, r0.gestrichen.map(g => g.grund)], [true, ['0 Werte']]);
  const rm = streicheToteOptionen([{ name: 'Farbe' }, { name: 'Grösse' }], [{ vid: 'a', werte: { Farbe: 'Rot', Grösse: 'M' } }, { vid: 'b', werte: { Farbe: '', Grösse: 'L' } }]);
  ist('Gegenprobe: ein Wert fehlt nur bei EINER Variante → nicht reparierbar', [rm.ok, /keinen Wert/.test(rm.grund)], [false, true]);
  const rg = streicheToteOptionen([{ name: 'Farbe' }, { name: 'Grösse' }], [{ vid: 'a', werte: { Farbe: 'Rot', Grösse: 'M' } }, { vid: 'b', werte: { Farbe: 'Blau', Grösse: 'L' } }]);
  ist('Gegenprobe: zwei echte Optionen bleiben beide', [rg.ok, rg.optionen.map(o => o.name), rg.gestrichen], [true, ['Farbe', 'Grösse'], []]);
  const rk = streicheToteOptionen([{ name: 'Farbe' }], [{ vid: 'a', werte: { Farbe: 'Rot' } }, { vid: 'b', werte: { Farbe: 'Rot' } }]);
  ist('alle Optionen tot bei mehreren Varianten → keine Auswahl', [rk.ok, /keine Auswahl/.test(rk.grund)], [false, true]);
  const re = streicheToteOptionen([{ name: 'Farbe' }], [{ vid: 'a', werte: { Farbe: 'Rot' } }]);
  ist('eine einzige Variante mit einem Wert: Option fällt weg, kein Fehler', [re.ok, re.optionen.length], [true, 0]);
  const rc = streicheToteOptionen([{ name: 'Farbe' }, { name: 'Grösse' }], [{ vid: 'a', werte: { Farbe: 'Rot', Grösse: 'M' } }, { vid: 'b', werte: { Farbe: 'rot', Grösse: 'M' } }]);
  ist('Gegenprobe: Schreibweisen-Duplikate zählen als EIN Wert nicht, hier unterscheiden sie die Varianten nicht → Fehler', [rc.ok], [false]);
}

// preisLeser — drei Formen
{
  const f = preisLeser(v => ({ preis: 5, kosten: 2, x: v.vid }));
  ist('preisLeser (a) Funktion', f({ vid: 'v1' }), { preis: 5, kosten: 2 });
  const b = preisLeser({ ok: true, varianten: [{ vid: 'v1', ok: true, preis: 9.9, kosten: 4 }, { vid: 'v2', ok: false, grund: 'Fracht unbekannt', preis: null, kosten: null }] });
  ist('preisLeser (b) Ergebnis von preiseFuerVarianten: gepreist', b({ vid: 'v1' }), { preis: 9.9, kosten: 4 });
  ist('preisLeser (b) ok:false → weglassen mit Grund', b({ vid: 'v2' }), { weglassen: true, grund: 'Fracht unbekannt' });
  ist('preisLeser (b) unbekannte vid → weglassen', b({ vid: 'v9' }).weglassen, true);
  const c = preisLeser({ 'v1': { preis: 7, kosten: 3 }, 'SKU-2': { preis: 8, kosten: 3 } });
  ist('preisLeser (c) Objekt nach vid oder SKU', [c({ vid: 'v1', sku: 'x' }), c({ vid: 'zz', sku: 'SKU-2' })], [{ preis: 7, kosten: 3 }, { preis: 8, kosten: 3 }]);
  ist('preisLeser: null/Zahl/Text → keine Quelle', [preisLeser(null), preisLeser(5), preisLeser('x')], [null, null, null]);
  ist('preisLeser: eine nackte Zahl ist unlesbar (nicht «kein Preis»)', Number.isNaN(preisLeser({ v1: 12.9 })({ vid: 'v1' }).preis), true);
}

// ───────────────────────── Der volle Plan an einem echten Mode-Produkt (Farbe × Grösse) ─────────────────────────
const M = lauf(FIX.mode, T_MODE, MODE);
ist('Mode: alle Tore bestanden', [M.ok, M.grund, fallen(M)], [true, '', []]);
ist('Mode: die Tore stehen in der festen Reihenfolge, jedes einmal', M.tore.map(t => t.name), TORE);
ist('Mode: jedes Tor ok === true und ohne Grund', M.tore.every(t => t.ok === true && t.grund === ''), true);
ist('Mode: 10 Varianten, 7 Bilder', [M.varianten, M.bilder], [10, 7]);
const E = M.eingabe;
ist('Mode: DRAFT, Vendor, Handle aus Titel + pid', [E.status, E.vendor, E.handle, M.handle], ['DRAFT', 'LuxeStyle', 'mesh-bluse-mit-hollow-out-langarmlig-605000', 'mesh-bluse-mit-hollow-out-langarmlig-605000']);
ist('Mode: Titel, Produkttyp', [E.title, E.productType], [T_MODE, 'Bekleidung']);
ist('Mode: Tags = Basis + ctx.tags, ohne Doppelte', E.tags, ['cj-real', 'dropship', 'sort-damen-blusen', 'grind2-20261027']);
ist('Mode: Optionen deutsch, Grössen der Reihe nach', E.productOptions, [
  { name: 'Farbe', values: [{ name: 'Schwarz' }, { name: 'Weiss' }] },
  { name: 'Grösse', values: [{ name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }, { name: 'XXL' }] },
]);
ist('Mode: SKU ist die ECHTE CJ-variantSku, in CJ-Reihenfolge', E.variants.map(v => v.inventoryItem.sku), FIX.mode.variants.map(v => v.variantSku));
ist('Mode: erste Variante vollständig (Optionen, Preis, Kosten, Gewicht, Bild)', E.variants[0], {
  optionValues: [{ optionName: 'Farbe', name: 'Schwarz' }, { optionName: 'Grösse', name: 'S' }], price: '22.42', inventoryPolicy: 'CONTINUE',
  inventoryItem: { sku: 'CJYD291471001AZ', tracked: false, cost: '8.97', measurement: { weight: { value: 222, unit: 'GRAMS' } } },
  file: { originalSource: FIX.mode.variants[0].variantImage, contentType: 'IMAGE' },
});
ist('Mode: Preis > Kosten bei jeder Variante', E.variants.every(v => Number(v.price) > Number(v.inventoryItem.cost)), true);
ist('Mode: Preis und Kosten sind Text mit zwei Stellen (Money/Decimal)', E.variants.every(v => /^\d+\.\d\d$/.test(v.price) && /^\d+\.\d\d$/.test(v.inventoryItem.cost)), true);
ist('Mode: Google-Kategorie als Metafeld, Typ wie im Shop', E.metafields, [{ namespace: 'mm-google-shopping', key: 'google_product_category', type: GOOGLE_TYP, value: 'Apparel & Accessories > Clothing > Shirts & Tops' }]);
ist('Mode: Galerie = die 7 CJ-Bilder, Hero zuerst, Alt = Titel', [E.files.map(f => f.originalSource), E.files.every(f => f.alt === T_MODE && f.contentType === 'IMAGE')], [galerieAus(FIX.mode), true]);
ist('Mode: jedes Variantenbild steht auch in files (Schema-Regel von ProductVariantSetInput.file)', E.variants.every(v => E.files.some(f => f.originalSource === v.file.originalSource)), true);
ist('Mode: Variantenbild je Farbe (zwei verschiedene)', new Set(E.variants.map(v => v.file.originalSource)).size, 2);
ist('Mode: Beschreibung = Marker + Text des Aufrufers', E.descriptionHtml, VAR_MARKER + '<p>Ein Text.</p>');
ist('Mode: die Textkette (text_prosa.zerlege) erkennt den Marker als Kopf und lässt die Prosa unberührt', (() => { const z = zerlege(E.descriptionHtml); return [z.kopf, z.prosa, z.rest]; })(), [VAR_MARKER, '<p>Ein Text.</p>', '']);
ist('Mode: SEO aus dem Titel (seoTitel)', [E.seo.title.includes('LuxeStyle') || E.seo.title.length > 0, E.seo.description.includes('Gratis-Versand ab CHF 50')], [true, true]);
ist('Mode: nur Felder aus dem echten Schema', schemaPruefen(E), []);
ist('Mode: in sich stimmig', konsistenzPruefen(E), []);
ist('Mode: Eingabe ist reines JSON (keine Funktionen, kein undefined)', JSON.stringify(E) === JSON.stringify(JSON.parse(JSON.stringify(E))), true);
ist('Mode: Warnungen nennen die ungeprüften Bilder und den ungeprüften Google-Pfad (ehrlich statt still)', [M.warnungen.some(w => /HTTP 200/.test(w)), M.warnungen.some(w => /Vokabular/.test(w))], [true, true]);
ist('Mode: Ergebnis-Felder', [typeof M.pid, M.pid, M.frist, M.ledgerGrund, M.unsicher, M.ausgelassen], ['string', '2605290641261605000', null, '', [], { stecker: [], ohnePreis: [], bilder: [] }]);
{
  const vorher = JSON.stringify(FIX.mode);
  lauf(FIX.mode, T_MODE, MODE);
  ist('Mode: das Eingabe-Datenblatt wird nie verändert', JSON.stringify(FIX.mode), vorher);
  ist('Mode: zweimal derselbe Plan (deterministisch)', JSON.stringify(lauf(FIX.mode, T_MODE, MODE)), JSON.stringify(M));
}
ist('Mode: dieselbe Eingabe über die ganze CJ-Antwort {code, data}', JSON.stringify(planeNeu({ code: 200, result: true, data: FIX.mode }, { ...BASIS, ...MODE, titel: T_MODE }).eingabe), JSON.stringify(E));

// ───────────────────────── Einzelvariante (CJ führt genau eine) ─────────────────────────
{
  const r = lauf(FIX.einzel, 'Wattestäbchen im Karton, 100 Stück');
  ist('Einzel: ok, 1 Variante, Title/Default Title (so legt productSet ein Produkt ohne Auswahl an)', [r.ok, r.varianten, r.eingabe.productOptions, r.eingabe.variants[0].optionValues], [true, 1, [{ name: 'Title', values: [{ name: 'Default Title' }] }], [{ optionName: 'Title', name: 'Default Title' }]]);
  ist('Einzel: echte SKU, kein Variantenbild (die Galerie genügt), Kosten gesetzt', [r.eingabe.variants[0].inventoryItem.sku, r.eingabe.variants[0].file, r.eingabe.variants[0].inventoryItem.cost], ['CJJZGJSD00849-100pcs', undefined, '2.93']);
  ist('Einzel: kein Marker (nichts nachgezogen)', r.eingabe.descriptionHtml, '<p>Ein Text.</p>');
  ist('Einzel: Handle aus UUID-pid wie im Shop («…-fc57c0»)', r.handle, 'wattestabchen-im-karton-100-stuck-fc57c0');
  ist('Einzel: Schema und Konsistenz', [schemaPruefen(r.eingabe), konsistenzPruefen(r.eingabe)], [[], []]);
}

// ───────────────────────── Tor: Titel ─────────────────────────
{
  const leer = lauf(FIX.einzel, '');
  ist('Titel leer → Tor titel fällt, KEINE Eingabe, vorläufig', [tor(leer, 'titel').ok, leer.eingabe, leer.frist, leer.ledgerGrund.startsWith('vorläufig: ')], [false, null, 'vorlaeufig', true]);
  ist('Titel nur Leerzeichen → ebenso', [lauf(FIX.einzel, '   \n ').ok, tor(lauf(FIX.einzel, '   '), 'titel').ok], [false, false]);
  ist('Titel undefined → ebenso (kein Absturz)', lauf(FIX.einzel, undefined).ok, false);
  const en = lauf(FIX.einzel, 'Black Skull Armband');
  ist('Titel mit englischem Rest («Black») → Tor fällt, zurückgestellt', [tor(en, 'titel').ok, /Black/.test(tor(en, 'titel').grund), en.frist], [false, true, 'zurueckgestellt']);
  ist('Gegenprobe: titelEnglischOk lässt ihn durch', lauf(FIX.einzel, 'Black Skull Armband', { titelEnglischOk: true }).ok, true);
  ist('Gegenprobe: deutscher Titel mit «Schwarz»', lauf(FIX.einzel, 'Schwarzes Skull-Armband').ok, true);
  ist('Titel mit chinesischen Zeichen → Tor fällt', tor(lauf(FIX.einzel, '宠物床 Hundebett'), 'titel').ok, false);
  ist('Titel über 255 Zeichen → Tor fällt', tor(lauf(FIX.einzel, 'a'.repeat(256)), 'titel').ok, false);
  ist('Titel über 70 Zeichen ist erlaubt, aber eine Warnung', [tor(lauf(FIX.einzel, 'Kaffeetasse '.repeat(7)), 'titel').ok, lauf(FIX.einzel, 'Kaffeetasse '.repeat(7)).warnungen.some(w => /70 Zeichen/.test(w))], [true, true]);
}

// ───────────────────────── Tor: Produktart ─────────────────────────
{
  const d = lauf(FIX.diy, 'Retro-Halskette mit Buchstabe');
  ist('DIY-Produkt (CJ productType DIY_PRODUCT) → fällt, endgültig, keine Eingabe', [tor(d, 'produktart').ok, d.frist, d.eingabe, d.ledgerGrund.startsWith('produktart')], [false, 'endgueltig', null, true]);
  ist('Gegenprobe: diyErlaubt hebt es auf', lauf(FIX.diy, 'Retro-Halskette mit Buchstabe', { diyErlaubt: true }).ok, true);
  ist('Gegenprobe: ein normales Produkt (ORDINARY_PRODUCT) fällt hier nicht', tor(M, 'produktart').ok, true);
  const t = lauf(ableiten(FIX.einzel, k => { k.isTestProduct = true; }), 'Wattestäbchen');
  ist('CJ-Testprodukt → fällt, endgültig (abgeleitet)', [tor(t, 'produktart').ok, t.frist], [false, 'endgueltig']);
  const s = lauf(ableiten(FIX.einzel, k => { k.status = '2'; }), 'Wattestäbchen');
  ist('CJ-Status ≠ 3 → fällt, aber nur zurückgestellt (abgeleitet)', [tor(s, 'produktart').ok, s.frist], [false, 'zurueckgestellt']);
  ist('Gegenprobe: Status null oder fehlend wird nicht beurteilt (nur ein Wert ≠ 3 lehnt ab)', [lauf(ableiten(FIX.einzel, k => { k.status = null; }), 'Wattestäbchen').ok, lauf(ableiten(FIX.einzel, k => { delete k.status; }), 'Wattestäbchen').ok], [true, true]);
  ist('Gegenprobe: Status als Zahl 3 passt', lauf(ableiten(FIX.einzel, k => { k.status = 3; }), 'Wattestäbchen').ok, true);
  const p = lauf(ableiten(FIX.einzel, k => { delete k.pid; }), 'Wattestäbchen');
  ist('ohne pid → fällt (vorläufig), und es gibt keinen Handle', [tor(p, 'produktart').ok, tor(p, 'handle').ok, p.frist], [false, false, 'vorlaeufig']);
  ist('pid in unbekanntem Format → fällt', tor(lauf(ableiten(FIX.einzel, k => { k.pid = 'abc'; }), 'Wattestäbchen'), 'produktart').ok, false);
}

// ───────────────────────── Tor: Sperr-Wörter ─────────────────────────
{
  const lz = lauf(FIX.lizenz, 'Neon-Nagelpuder-Set in klarer Box');
  ist('Lizenzname «Barbie» im CJ-Namen (echtes Datenblatt) → fällt, endgültig', [tor(lz, 'sperrwoerter').ok, /Lizenzname «Barbie»/.test(tor(lz, 'sperrwoerter').grund), lz.frist, lz.eingabe], [false, true, 'endgueltig', null]);
  ist('F03: das Lizenz-Tor meldet selbst («Lizenzname «Barbie»»), auch wenn die Merchant-Prüfung des CJ-Namens denselben Fall zusätzlich kennt', /Lizenzname «Barbie»/.test(lz.ledgerGrund), true);
  const lzB = lauf(FIX.einzel, 'Wattestäbchen', { beschreibungHtml: '<p>Harry Potter lässt grüssen.</p>' });
  ist('Lizenzname in der BESCHREIBUNG des Aufrufers → fällt (Merchant-Lehre vom 24.10.)', [tor(lzB, 'sperrwoerter').ok, /Harry Potter/.test(tor(lzB, 'sperrwoerter').grund)], [false, true]);
  ist('Gegenprobe: dieselbe Beschreibung ohne Lizenzname', lauf(FIX.einzel, 'Wattestäbchen', { beschreibungHtml: '<p>Ein Zauberer-Kostüm.</p>' }).ok, true);
  const ip = lauf(FIX.iphone, 'Fernbedienung für iPhone');
  ist('Marke im deutschen Titel («iPhone», echtes Datenblatt «Remote control») → fällt', [tor(ip, 'sperrwoerter').ok, /markenware/.test(tor(ip, 'sperrwoerter').grund)], [false, true]);
  ist('Gegenprobe: derselbe Artikel mit markenlosem Titel', lauf(FIX.iphone, 'Fernbedienung für Smartphones').ok, true);
  const kd = lauf(FIX.kind, 'Armbanduhr für Kinder, schlicht & klar');
  ist('Kinderware («Kinder» im Titel, Merchant-Risiko) → fällt, endgültig', [tor(kd, 'sperrwoerter').ok, /Merchant/.test(tor(kd, 'sperrwoerter').grund), kd.frist], [false, true, 'endgueltig']);
  ist('Gegenprobe: derselbe echte Artikel mit neutralem Titel passiert das Tor', tor(lauf(FIX.kind, 'Armbanduhr, schlicht & klar'), 'sperrwoerter').ok, true);
  const wf = lauf(FIX.einzel, 'Zielfernrohr 4x32 für Gewehr');
  ist('WAFFEN-Muster (aus kategorien.mjs) im Titel → fällt', [tor(wf, 'sperrwoerter').ok, /Waffen-Wort/.test(tor(wf, 'sperrwoerter').grund)], [false, true]);
  const kn = lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'Stainless Steel Kitchen Knife Set'; }), 'Küchenset aus Edelstahl');
  ist('Klinge im ENGLISCHEN CJ-Namen («Knife», abgeleitet) → fällt (die deutsche Sperre allein sähe es nie)', [tor(kn, 'sperrwoerter').ok, /klinge-waffenrecht/.test(tor(kn, 'sperrwoerter').grund)], [false, true]);
  ist('Klinge im deutschen Titel («Küchenmesser-Set») → fällt', tor(lauf(FIX.einzel, 'Küchenmesser-Set aus Edelstahl'), 'sperrwoerter').ok, false);
  ist('Gegenprobe: «Höhenmesser» und «Durchmesser» im Titel sind keine Klingen', [lauf(FIX.einzel, 'Uhr mit Höhenmesser').ok, lauf(FIX.einzel, 'Teller, 30 cm Durchmesser').ok], [true, true]);
  ist('Erwachsenen-Ware (Titel) → fällt, endgültig', [tor(lauf(FIX.einzel, 'Vibrator mit App-Steuerung'), 'sperrwoerter').ok, lauf(FIX.einzel, 'Vibrator mit App-Steuerung').frist], [false, 'endgueltig']);
  ist('Erwachsenen-Ware im englischen CJ-Namen (abgeleitet)', tor(lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'Adult Toys Massager'; }), 'Massagegerät'), 'sperrwoerter').ok, false);
  ist('Gegenprobe: «Unisex», «Essex», «analog» sind keine Erwachsenen-Ware', [ERWACHSENE_RE.test('Unisex-Pullover'), ERWACHSENE_RE.test('Essex Hose'), ERWACHSENE_RE.test('analoge Uhr'), ERWACHSENE_RE.test('Sex Toy')], [false, false, false, true]);
  ist('Tabak/Nikotin → fällt', [tor(lauf(FIX.einzel, 'Shisha-Kohle'), 'sperrwoerter').ok, tor(lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'Disposable Vape Pen'; }), 'Dampfgerät'), 'sperrwoerter').ok], [false, false]);
  ist('Gegenprobe: Auto-Zigarettenanzünder-Ladegerät ist kein Tabak', lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'Car Charger Cigarette Lighter Socket'; }), 'Auto-Ladegerät').ok, true);
  ist('Gegenprobe: Unkraut (weed) und Nail-Art-«Blättchen» sind kein Tabak, Zigarettenpapier schon', [TABAK_RE.test('Weed Barrier Fabric'), TABAK_RE.test('Metall Blättchen für Nail Art'), TABAK_RE.test('Zigarettenpapier lang')], [false, false, true]);
  ist('Die exportierten Muster sind ohne Flag g (kein lastIndex-Fehler bei wiederholtem test)', [MESSGERAET_RE.global, ANZUENDER_RE.global, [MESSGERAET_RE.test('Höhenmesser'), MESSGERAET_RE.test('Höhenmesser')]], [false, false, [true, true]]);
  const sp = lauf(FIX.einzel, 'Wattestäbchen', { tags: ['adult-nicht-bewerben'] });
  ist('Sperr-Tag (SPERR_TAGS aus kategorien.mjs) → fällt', [tor(sp, 'sperrwoerter').ok, /Sperr-Tag adult-nicht-bewerben/.test(tor(sp, 'sperrwoerter').grund)], [false, true]);
  ist('Sperr-Tag nach Muster (kanal_sperren: «nicht-google-bewerben») → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { tags: ['nicht-google-bewerben'] }), 'sperrwoerter').ok, false);
  ist('Gegenprobe: gewöhnliche Tags', tor(lauf(FIX.einzel, 'Wattestäbchen', { tags: ['sort-haushalt', 'neuheit'] }), 'sperrwoerter').ok, true);
}

// ───────────────────────── Tor: Steckdosen-Ware ─────────────────────────
{
  ist('Steckdosen-Ware im deutschen Titel → fällt, endgültig', [tor(lauf(FIX.einzel, 'Smart Steckdose mit WLAN'), 'steckdosen-ware').ok, lauf(FIX.einzel, 'Smart Steckdose mit WLAN').frist], [false, 'endgueltig']);
  ist('Steckdosenleiste (Schuko) → fällt', tor(lauf(FIX.einzel, 'Steckdosenleiste mit USB'), 'steckdosen-ware').ok, false);
  ist('Google-Pfad «Power Strips» → fällt', tor(lauf(FIX.einzel, 'Verteiler mit Schalter', { googlePfad: 'Electronics > Electronics Accessories > Power > Power Strips' }), 'steckdosen-ware').ok, false);
  ist('englischer CJ-Name «Smart Plug» → fällt (abgeleitet)', tor(lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'WiFi Smart Plug Timer'; }), 'Zwischenstecker'), 'steckdosen-ware').ok, false);
  ist('englischer CJ-Name «Power Strip» (nur das englische Muster kennt ihn; der deutsche Titel ist neutral, abgeleitet) → fällt', tor(lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'Extension Socket Power Strip 4 Outlets'; }), 'Verteiler mit Schalter'), 'steckdosen-ware').ok, false);
  ist('Gegenprobe: Schutzabdeckung für Steckdosen ist keine Steckdosen-Ware', tor(lauf(FIX.einzel, 'Schutzabdeckung für Steckdosen'), 'steckdosen-ware').ok, true);
  ist('Gegenprobe: Wattestäbchen', tor(M, 'steckdosen-ware').ok, true);
}

// ───────────────────────── Tor: Google-Pfad ─────────────────────────
{
  ist('ohne Google-Pfad → fällt, zurückgestellt, kein Metafeld', [tor(lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: '' }), 'google-pfad').ok, lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: '' }).frist], [false, 'zurueckgestellt']);
  ist('Pfad mit nur einer Ebene → fällt (Vorgabe: 2 Ebenen)', tor(lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: 'Electronics' }), 'google-pfad').ok, false);
  ist('Gegenprobe: googleMinTiefe 1 erlaubt ihn', tor(lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: 'Electronics', googleMinTiefe: 1 }), 'google-pfad').ok, true);
  ist('Pfad mit leerer Ebene («A > > B», «A >> B», «A >») → fällt', ['Home & Garden > > Household Supplies', 'Home & Garden >> Household Supplies', 'Home & Garden >'].map(p => tor(lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: p }), 'google-pfad').ok), [false, false, false]);
  ist('Gegenprobe: Ebenen mit «&», «,», «/» und Apostroph sind erlaubt (echte Google-Namen)', tor(lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: "Arts & Entertainment > Hobbies & Creative Arts > Collectibles > Collectible Coins, Bills & Stamps/Postage" }), 'google-pfad').ok, true);
  ist('Mehrfache Leerzeichen im Pfad werden vereinheitlicht (kein Fehler)', lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: ' Home & Garden >  Household Supplies ' }).eingabe.metafields[0].value, 'Home & Garden > Household Supplies');
  const voc = new Set(['Home & Garden > Household Supplies', 'Apparel & Accessories > Clothing']);
  ist('Vokabular: Pfad darin → ok', tor(lauf(FIX.einzel, 'Wattestäbchen', { googleVokabular: voc }), 'google-pfad').ok, true);
  const nein = lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: 'Home & Garden > Haushaltskram', googleVokabular: voc });
  ist('Vokabular: Pfad nicht darin → fällt', [tor(nein, 'google-pfad').ok, /Vokabular/.test(tor(nein, 'google-pfad').grund)], [false, true]);
  ist('Vokabular als Liste geht auch', tor(lauf(FIX.einzel, 'Wattestäbchen', { googleVokabular: [...voc] }), 'google-pfad').ok, true);
  ist('mit Vokabular keine «nicht geprüft»-Warnung', lauf(FIX.einzel, 'Wattestäbchen', { googleVokabular: voc }).warnungen.some(w => /Vokabular/.test(w)), false);
}

// ───────────────────────── Tor: Tags ─────────────────────────
{
  const e = lauf(FIX.einzel, 'Wattestäbchen', { tags: ['CJ-REAL', 'Neuheit', 'neuheit', ' sort-haushalt '] });
  ist('Tags: Basis-Tags nicht doppelt (Gross/Klein), getrimmt, ohne Doppelte', e.eingabe.tags, ['cj-real', 'dropship', 'Neuheit', 'sort-haushalt']);
  ist('Tag mit Umlaut-Handle «sort-x-langbörsen» → fällt (Shopify-Tags sind diakritik-unempfindlich, CLAUDE.md 26.10.)', tor(lauf(FIX.einzel, 'Wattestäbchen', { tags: ['sort-x-langbörsen'] }), 'tags').ok, false);
  ist('Gegenprobe: «sort-x-langborsen»', tor(lauf(FIX.einzel, 'Wattestäbchen', { tags: ['sort-x-langborsen'] }), 'tags').ok, true);
  ist('Tag mit Komma → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { tags: ['a,b'] }), 'tags').ok, false);
  ist('Tag über 255 Zeichen → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { tags: ['x'.repeat(256)] }), 'tags').ok, false);
  ist('BASIS_TAGS', BASIS_TAGS, ['cj-real', 'dropship']);
}

// ───────────────────────── Tor: Handle ─────────────────────────
{
  const h = lauf(FIX.einzel, 'Wattestäbchen', { handle: 'mein-handle-aus-dem-ledger-123456' });
  ist('ctx.handle (aus dem Ledger) gewinnt, auch wenn der Titel anders lautet', [h.ok, h.eingabe.handle], [true, 'mein-handle-aus-dem-ledger-123456']);
  ist('ctx.handle ungültig («Ab c», Umlaut) → fällt', [tor(lauf(FIX.einzel, 'Wattestäbchen', { handle: 'Ab c' }), 'handle').ok, tor(lauf(FIX.einzel, 'Wattestäbchen', { handle: 'bürste-1' }), 'handle').ok], [false, false]);
  ist('Gegenprobe: ein anderer Titel ohne ctx.handle ergibt einen anderen Handle, dieselbe pid-Endung', [lauf(FIX.einzel, 'Wattestäbchen').handle, lauf(FIX.einzel, 'Wattestäbchen').handle.endsWith('-fc57c0')], ['wattestabchen-fc57c0', true]);
}

// ───────────────────────── Tor: Metafelder ─────────────────────────
{
  const zus = lauf(FIX.einzel, 'Wattestäbchen', { metafelder: [{ namespace: 'mm-google-shopping', key: 'gender', type: 'single_line_text_field', value: 'unisex' }, { namespace: 'mm-google-shopping', key: 'age_group', type: 'single_line_text_field', value: 'adult' }] });
  ist('Zusatz-Metafelder werden angehängt, Google-Kategorie bleibt zuerst', [zus.ok, zus.eingabe.metafields.map(m => m.key)], [true, ['google_product_category', 'gender', 'age_group']]);
  ist('Metafeld doppelt (zweimal google_product_category) → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { metafelder: [{ namespace: 'mm-google-shopping', key: 'google_product_category', type: 'single_line_text_field', value: 'x' }] }), 'metafelder').ok, false);
  ist('Metafeld unvollständig (ohne type) → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { metafelder: [{ namespace: 'a', key: 'b', value: 'c' }] }), 'metafelder').ok, false);
}

// ───────────────────────── Tor: Bilder ─────────────────────────
{
  const w = lauf(FIX.wenig, 'Lidschatten-Palette, 40 Farben');
  ist('Nur 2 Galeriebilder (echtes Datenblatt) → fällt, zurückgestellt', [tor(w, 'bilder').ok, /nur 2 brauchbare/.test(tor(w, 'bilder').grund), w.frist, w.eingabe], [false, true, 'zurueckgestellt', null]);
  ist('Gegenprobe: minBilder 2 lässt es zu', tor(lauf(FIX.wenig, 'Lidschatten-Palette, 40 Farben', { minBilder: 2 }), 'bilder').ok, true);
  ist('MIN_BILDER ist 3', MIN_BILDER, 3);
  const http = ableiten(FIX.mode, k => { k.productImage = JSON.stringify(JSON.parse(k.productImage).map((u, i) => (i < 2 ? u.replace('https://', 'http://') : u))); k.bigImage = k.bigImage.replace('https://', 'http://'); });
  const rh = lauf(http, T_MODE, MODE);
  ist('Bilder ohne https werden weggelassen (7 → 5), die Warnung sagt es', [rh.ok, rh.bilder, rh.warnungen.some(w => /ohne https/.test(w)), rh.ausgelassen.bilder.filter(b => b.grund === 'kein https').length], [true, 5, true, 2]);
  ist('Gegenprobe: kein weggelassenes Bild im unveränderten Datenblatt', M.ausgelassen.bilder, []);
  const alleHttp = ableiten(FIX.mode, k => { k.productImage = JSON.stringify(JSON.parse(k.productImage).map(u => u.replace('https://', 'http://'))); k.bigImage = k.bigImage.replace('https://', 'http://'); });
  ist('alle Bilder ohne https → fällt', tor(lauf(alleHttp, T_MODE, MODE), 'bilder').ok, false);
  const url = klon(galerieAus(FIX.mode));
  const ok7 = lauf(FIX.mode, T_MODE, { ...MODE, bildOk: new Set(url) });
  ist('bildOk mit allen Bildern: ok, keine Warnung «nicht geprüft»', [ok7.ok, ok7.warnungen.some(x => /HTTP 200 geprüft/.test(x))], [true, false]);
  const varB = new Set(FIX.mode.variants.map(v => v.variantImage)), keinVar = url.filter(u => !varB.has(u));
  const ok5 = lauf(FIX.mode, T_MODE, { ...MODE, bildOk: new Set(url.filter(u => !keinVar.slice(0, 2).includes(u))) });
  ist('bildOk: 2 Galeriebilder nicht HTTP 200 → nicht in files (Bild-Falle), 5 bleiben', [ok5.ok, ok5.eingabe?.files.length, ok5.ausgelassen.bilder.filter(b => b.grund === 'nicht HTTP 200').length], [true, 5, 2]);
  const ohneVar = lauf(FIX.mode, T_MODE, { ...MODE, bildOk: new Set(url.filter(u => !varB.has(u))), minBilder: 3 });
  ist('Gegenprobe: sind die VARIANTENbilder nicht HTTP 200, hat keine Variante ein Bild → Tor varianten-bilder fällt', [tor(ohneVar, 'bilder').ok, tor(ohneVar, 'varianten-bilder').ok], [true, false]);
  const ok2 = lauf(FIX.mode, T_MODE, { ...MODE, bildOk: new Set(url.slice(0, 2)) });
  ist('bildOk: zu wenige geprüfte Bilder → fällt, aber nur VORLÄUFIG (HTTP-Aussetzer ≠ endgültig)', [tor(ok2, 'bilder').ok, ok2.frist], [false, 'vorlaeufig']);
  ist('bildOk als Liste geht auch', lauf(FIX.mode, T_MODE, { ...MODE, bildOk: url }).ok, true);
  // Variantenbilder
  const neu = ableiten(FIX.mode, k => { k.variants[0].variantImage = 'https://cf.cjdropshipping.com/quick/product/nur-fuer-s.jpg'; });
  const rn = lauf(neu, T_MODE, MODE);
  ist('Variantenbild, das nicht in der Galerie steht, wird zusätzlich in files aufgenommen (alt mit Variante)', [rn.ok, rn.bilder, rn.eingabe.files[7], rn.eingabe.variants[0].file.originalSource], [true, 8, { originalSource: 'https://cf.cjdropshipping.com/quick/product/nur-fuer-s.jpg', contentType: 'IMAGE', alt: `${T_MODE} – Schwarz / S` }, 'https://cf.cjdropshipping.com/quick/product/nur-fuer-s.jpg']);
  ist('… und dazu eine Warnung wegen quick/product (Bild-Falle)', rn.warnungen.some(x => /quick\/product/.test(x)), true);
  ist('bildAlias: visuell gleiches Galeriebild → kein zusätzlicher Upload', (() => { const a = lauf(neu, T_MODE, { ...MODE, bildAlias: { 'https://cf.cjdropshipping.com/quick/product/nur-fuer-s.jpg': galerieAus(FIX.mode)[0] } }); return [a.bilder, a.eingabe.variants[0].file.originalSource]; })(), [7, galerieAus(FIX.mode)[0]]);
  const hv = ableiten(FIX.mode, k => { k.variants[0].variantImage = 'http://cf.cjdropshipping.com/x.jpg'; });
  const rhv = lauf(hv, T_MODE, MODE);
  ist('Variantenbild ohne https: die Variante bleibt, ohne eigenes Bild, mit Warnung', [rhv.ok, rhv.eingabe.variants[0].file, rhv.warnungen.some(x => /ohne https/.test(x))], [true, undefined, true]);
  const halb = ableiten(FIX.mode, k => { for (const v of k.variants.slice(0, 6)) v.variantImage = ''; });
  ist('mehr als die Hälfte der Varianten ohne Variantenbild → Tor varianten-bilder fällt', [tor(lauf(halb, T_MODE, MODE), 'varianten-bilder').ok], [false]);
  const wenig = ableiten(FIX.mode, k => { for (const v of k.variants.slice(0, 2)) v.variantImage = ''; });
  ist('Gegenprobe: 2 von 10 ohne Bild geht, mit Warnung', [lauf(wenig, T_MODE, MODE).ok, lauf(wenig, T_MODE, MODE).warnungen.some(x => /ohne Variantenbild/.test(x))], [true, true]);
  ist('Variantenbild mit bildOk: nicht geprüftes Variantenbild wird weggelassen', (() => { const r = lauf(neu, T_MODE, { ...MODE, bildOk: new Set(url) }); return [r.eingabe.variants[0].file, r.ausgelassen.bilder.some(b => b.grund === 'Variantenbild nicht HTTP 200')]; })(), [undefined, true]);
}

// ───────────────────────── Tor: CJ-Varianten (Rohdaten) ─────────────────────────
{
  const dop = ableiten(FIX.mode, k => { k.variants[1].variantSku = k.variants[0].variantSku; });
  ist('doppelte variantSku → fällt, keine Eingabe', [tor(lauf(dop, T_MODE, MODE), 'cj-varianten').ok, lauf(dop, T_MODE, MODE).eingabe], [false, null]);
  ist('doppelte vid → fällt', tor(lauf(ableiten(FIX.mode, k => { k.variants[1].vid = k.variants[0].vid; }), T_MODE, MODE), 'cj-varianten').ok, false);
  ist('Variante ohne SKU → fällt', tor(lauf(ableiten(FIX.mode, k => { k.variants[3].variantSku = ''; }), T_MODE, MODE), 'cj-varianten').ok, false);
  ist('Variante ohne vid → fällt', tor(lauf(ableiten(FIX.mode, k => { delete k.variants[3].vid; }), T_MODE, MODE), 'cj-varianten').ok, false);
  const keine = lauf(ableiten(FIX.mode, k => { k.variants = []; }), T_MODE, MODE);
  ist('keine Varianten → fällt, endgültig; die Tore danach sind «nicht geprüft» (null), nicht stumm true', [tor(keine, 'cj-varianten').ok, keine.frist, tor(keine, 'preis').ok, tor(keine, 'auswahl').ok, tor(keine, 'eingabe-schema').ok], [false, 'endgueltig', null, null, null]);
  ist('variants fehlt ganz → fällt', lauf(ableiten(FIX.mode, k => { delete k.variants; }), T_MODE, MODE).ok, false);
  ist('Variante null im Array → fällt, kein Absturz', lauf(ableiten(FIX.mode, k => { k.variants[2] = null; }), T_MODE, MODE).ok, false);
}

// ───────────────────────── Tor: Stecker ─────────────────────────
{
  const s = lauf(FIX.stecker, 'Lockenstab & Glätteisen 2-in-1');
  ist('Stecker (echtes Datenblatt Black-EU/US/UK/AU): nur die Euro-Variante bleibt', [s.ok, s.varianten, s.eingabe.variants[0].inventoryItem.sku], [true, 1, 'CJTF101284601AZ']);
  ist('Stecker: die drei Fremdstecker-SKUs stehen in ausgelassen, die Warnung nennt sie', [s.ausgelassen.stecker, s.warnungen.some(w => /3 Fremdstecker/.test(w))], [['CJTF101284602BY', 'CJTF101284603CX', 'CJTF101284604DW'], true]);
  ist('Stecker: bleibt nur EINE Variante, wird es ein Produkt ohne Auswahl (und die Warnung sagt, dass keine Auswahl versprochen werden darf)', [s.eingabe.productOptions, s.warnungen.some(w => /nur 1 von 4 CJ-Varianten/.test(w))], [[{ name: 'Title', values: [{ name: 'Default Title' }] }], true]);
  ist('Stecker: keine Fremdstecker-SKU in der Eingabe', s.eingabe.variants.some(v => /-(US|UK|AU)$|0[234]/.test(v.inventoryItem.sku.slice(-5)) && /^CJTF10128460[234]/.test(v.inventoryItem.sku)), false);
  const rn = lauf(FIX.steckerNur, 'Drehkreisel für Volumenwellen');
  ist('nur Fremdstecker (echtes Datenblatt: White-US, Pink-US, Blue-US) → fällt, endgültig, keine Eingabe', [tor(rn, 'stecker').ok, rn.frist, rn.eingabe, /nur Fremdstecker/.test(tor(rn, 'stecker').grund)], [false, 'endgueltig', null, true]);
  ist('… und die Tore danach sind nicht geprüft', [tor(rn, 'preis').ok, tor(rn, 'auswahl').ok], [null, null]);
  const nurAbg = ableiten(FIX.stecker, k => { k.variants = k.variants.filter(v => !/-EU$/.test(v.variantKey)); });
  ist('Gegenprobe zum echten Fall: Lockenstab ohne die Euro-Variante (abgeleitet) fällt ebenso', tor(lauf(nurAbg, 'Lockenstab'), 'stecker').ok, false);
  ist('Gegenprobe: ein Produkt ohne Stecker-Schlüssel (Mode) hat nichts ausgelassen', M.ausgelassen.stecker, []);
  const gem = ableiten(FIX.mode, k => { k.variants.push(variante(1, 'Black-US'), variante(2, 'White-US')); k.variants[10].variantImage = k.variants[0].variantImage; k.variants[11].variantImage = k.variants[5].variantImage; });
  ist('Fremdstecker mitten in einer Farbe×Grösse-Auswahl (abgeleitet «Black-US»): die Optionen enthalten «US» nicht', (() => { const r = lauf(gem, T_MODE, MODE); return [r.ok, r.varianten, r.ausgelassen.stecker.length, JSON.stringify(r.eingabe.productOptions).includes('US')]; })(), [true, 10, 2, false]);
}

// ───────────────────────── Tor: Preis ─────────────────────────
{
  const ohne = planeNeu(FIX.mode, { ...BASIS, ...MODE, titel: T_MODE, preis: undefined });
  ist('ohne Preisquelle → fällt (vorläufig), keine Eingabe', [tor(ohne, 'preis').ok, ohne.frist, ohne.eingabe], [false, 'vorlaeufig', null]);
  // Variante ohne Preis = nicht verkaufen
  const weissWeg = lauf(FIX.mode, T_MODE, { ...MODE, preis: v => (/^CJYD2914710(0[6-9]|10)/.test(v.sku) ? null : preisFn()(v)) });
  ist('Varianten ohne Preis (hier alle weissen) werden weggelassen, nicht geraten', [weissWeg.ok, weissWeg.varianten, weissWeg.ausgelassen.ohnePreis.length], [true, 5, 5]);
  ist('… Farbe ist dann konstant: KEINE Option «Farbe» mit nur einem Wert (tote Auswahl), nur noch Grösse', weissWeg.eingabe.productOptions.map(o => o.name), ['Grösse']);
  ist('… und die konstante Farbe taucht nirgends als Option auf', weissWeg.eingabe.variants.every(v => v.optionValues.length === 1), true);
  ist('… die Warnung nennt die weggelassenen Varianten', weissWeg.warnungen.some(w => /5 von 10 Variante\(n\) ohne Preis/.test(w)), true);
  ist('Mindestzahl: bleibt von 10 CJ-Varianten nur EINE mit Preis → fällt (Auswahl-Produkt braucht 2)', (() => { const r = lauf(FIX.mode, T_MODE, { ...MODE, preis: v => (v.sku === 'CJYD291471001AZ' ? preisFn()(v) : null) }); return [tor(r, 'variantenzahl').ok, r.frist, /mindestens 2/.test(tor(r, 'variantenzahl').grund)]; })(), [false, 'zurueckgestellt', true]);
  ist('Gegenprobe: minVarianten 1 erlaubt es, dann ein Produkt ohne Auswahl', (() => { const r = lauf(FIX.mode, T_MODE, { ...MODE, minVarianten: 1, preis: v => (v.sku === 'CJYD291471001AZ' ? preisFn()(v) : null) }); return [r.ok, r.eingabe.productOptions[0].name]; })(), [true, 'Title']);
  ist('keine Variante mit Preis → fällt', tor(lauf(FIX.mode, T_MODE, { ...MODE, preis: () => null }), 'preis').ok, false);
  // Preis > Kosten
  const gl = lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: 5, kosten: 5 }) });
  ist('Preis = Kosten → fällt (kein Verkauf zum Einstand)', [tor(gl, 'preis>kosten').ok, gl.frist, gl.eingabe], [false, 'vorlaeufig', null]);
  ist('Preis < Kosten → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: 4.9, kosten: 5 }) }), 'preis>kosten').ok, false);
  ist('Gegenprobe: ein Rappen darüber geht', tor(lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: 5.01, kosten: 5 }) }), 'preis>kosten').ok, true);
  ist('Rundung: 5.004 / 5.001 sind nach Rappen gleich → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: 5.004, kosten: 5.001 }) }), 'preis>kosten').ok, false);
  ist('minFaktor 1.2: Preis nur 10 % über Kosten → fällt', tor(lauf(FIX.einzel, 'Wattestäbchen', { minFaktor: 1.2, preis: () => ({ preis: 11, kosten: 10 }) }), 'preis>kosten').ok, false);
  ist('Gegenprobe: minFaktor 1.2 und 30 % darüber', tor(lauf(FIX.einzel, 'Wattestäbchen', { minFaktor: 1.2, preis: () => ({ preis: 13, kosten: 10 }) }), 'preis>kosten').ok, true);
  const eine = lauf(FIX.mode, T_MODE, { ...MODE, preis: v => (v.sku === 'CJYD291471004DW' ? { preis: 8, kosten: 9 } : preisFn()(v)) });
  ist('EINE Variante mit Verlust genügt, um das Produkt zu stoppen (und sie wird benannt)', [tor(eine, 'preis>kosten').ok, /CJYD291471004DW/.test(tor(eine, 'preis>kosten').grund)], [false, true]);
  // unlesbar
  for (const [name, p] of [['NaN', { preis: NaN, kosten: 2 }], ['Kosten fehlen', { preis: 5 }], ['Kosten 0', { preis: 5, kosten: 0 }], ['Preis negativ', { preis: -1, kosten: 2 }], ['Text', { preis: 'viel', kosten: 2 }], ['Preis 1 Mio', { preis: 1e6, kosten: 2 }]])
    ist(`Preis unlesbar (${name}) → Tor preis fällt`, tor(lauf(FIX.einzel, 'Wattestäbchen', { preis: () => p }), 'preis').ok, false);
  const wf = lauf(FIX.einzel, 'Wattestäbchen', { preis: () => { throw new Error('Kurs fehlt'); } });
  ist('eine werfende Preisfunktion bricht planeNeu NICHT ab, sondern lässt das Tor fallen', [wf.ok, tor(wf, 'preis').ok, /Kurs fehlt/.test(tor(wf, 'preis').grund)], [false, false, true]);
  // Formen b und c
  const rows = FIX.mode.variants.map(v => ({ vid: v.vid, ok: true, preis: 19.9, kosten: 9.5 }));
  ist('Form (b): Ergebnis von preiseFuerVarianten', (() => { const r = lauf(FIX.mode, T_MODE, { ...MODE, preis: { ok: true, varianten: rows } }); return [r.ok, r.eingabe.variants[0].price, r.eingabe.variants[0].inventoryItem.cost]; })(), [true, '19.90', '9.50']);
  ist('Form (b): ok:false-Zeile → Variante weggelassen', (() => { const r2 = rows.map((x, i) => (i === 0 ? { vid: x.vid, ok: false, grund: 'Fracht unbekannt', preis: null, kosten: null } : x)); const r = lauf(FIX.mode, T_MODE, { ...MODE, preis: { ok: false, varianten: r2 } }); return [r.varianten, r.ausgelassen.ohnePreis]; })(), [9, ['CJYD291471001AZ']]);
  ist('Form (c): Objekt nach SKU', (() => { const o = Object.fromEntries(FIX.mode.variants.map(v => [v.variantSku, { preis: 12.9, kosten: 6 }])); const r = lauf(FIX.mode, T_MODE, { ...MODE, preis: o }); return [r.ok, r.eingabe.variants[9].price]; })(), [true, '12.90']);
  ist('Preis als Text mit Komma-Müll → unlesbar', tor(lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: '12,90', kosten: '6,00' }) }), 'preis').ok, false);
  ist('Preis als Zahlen-Text «12.9» wird gelesen und als «12.90» geschrieben', lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: '12.9', kosten: '6' }) }).eingabe.variants[0].price, '12.90');
}

// ───────────────────────── Tor: Variantenzahl ─────────────────────────
{
  ist('MAX_VARIANTEN ist 100 (wie im Nachzieher)', MAX_VARIANTEN, 100);
  const v72 = lauf(FIX.viele, 'Boho-Set 2-teilig', MODE);
  ist('Echtes Datenblatt mit 72 Varianten: im Limit', [tor(v72, 'variantenzahl').ok, v72.varianten], [true, 72]);
  const v71 = lauf(FIX.viele, 'Boho-Set 2-teilig', { ...MODE, maxVarianten: 71 });
  ist('… mit maxVarianten 71 fällt es, zurückgestellt (später, wenn das Tageslimit reicht)', [tor(v71, 'variantenzahl').ok, v71.frist, /72 > 71/.test(tor(v71, 'variantenzahl').grund), v71.eingabe], [false, 'zurueckgestellt', true, null]);
  ist('Grenze: genau maxVarianten ist erlaubt', tor(lauf(FIX.viele, 'Boho-Set 2-teilig', { ...MODE, maxVarianten: 72 }), 'variantenzahl').ok, true);
  const viele = ableiten(FIX.mode, k => { for (let i = 0; i < 91; i++) k.variants.push(variante(100 + i, `Farbe${i}-M`)); });
  const r101 = lauf(viele, T_MODE, MODE);
  ist('101 Varianten (abgeleitet: 10 echte + 91 synthetische) → Vorgabe 100 lässt es fallen', [tor(r101, 'variantenzahl').ok, /101 > 100/.test(tor(r101, 'variantenzahl').grund)], [false, true]);
  ist('Gegenprobe: dieselben 101 mit maxVarianten 101', tor(lauf(viele, T_MODE, { ...MODE, maxVarianten: 101 }), 'variantenzahl').ok, true);
  ist('maxVarianten Müll («abc», 0, -5) → Vorgabe 100', [tor(lauf(FIX.mode, T_MODE, { ...MODE, maxVarianten: 'abc' }), 'variantenzahl').ok, tor(lauf(viele, T_MODE, { ...MODE, maxVarianten: 0 }), 'variantenzahl').ok, tor(lauf(viele, T_MODE, { ...MODE, maxVarianten: -5 }), 'variantenzahl').ok], [true, false, false]);
  ist('gezählt wird, was angelegt würde: 101 CJ-Varianten, davon 5 ohne Preis → 96 → im Limit', tor(lauf(viele, T_MODE, { ...MODE, preis: v => (/^CJYD2914710(0[1-5])/.test(v.sku) ? null : preisFn()(v)) }), 'variantenzahl').ok, true);
}

// ───────────────────────── Tor: Auswahl ─────────────────────────
{
  const hy = lauf(FIX.hyphen, 'Fahrradhelm');
  ist('Schlüssel mit Bindestrich im Wert («White-52-62cm», echtes Datenblatt) → Auswahl nicht baubar, zurückgestellt, nie geraten', [tor(hy, 'auswahl').ok, /Schlüssel passen nicht zu 2 Optionen/.test(tor(hy, 'auswahl').grund), hy.frist, hy.eingabe], [false, true, 'zurueckgestellt', null]);
  ist('… die Tore danach sind nicht geprüft', [tor(hy, 'tote-optionen').ok, tor(hy, 'optionswerte-sicher').ok], [null, null]);
  const kollision = lauf(ableiten(FIX.mode, k => { k.variants[5].variantKey = 'Gray-S'; k.variants[0].variantKey = 'Grey-S'; }), T_MODE, MODE);
  ist('zwei CJ-Werte, die auf dasselbe deutsche Wort fallen («Gray»/«Grey» → Grau): Auswahl nicht baubar', [tor(kollision, 'auswahl').ok, /gleich/.test(tor(kollision, 'auswahl').grund)], [false, true]);
  // Hinweis (konstante Option)
  const hw = lauf(FIX.hinweis, 'Sport-Umhängetasche', { googlePfad: 'Luggage & Bags > Messenger Bags' });
  ist('Konstante CJ-Option (Capacity = 15L bei allen Varianten) wird KEINE Auswahl, sondern ein Hinweis im Kopf der Beschreibung', [hw.ok, hw.eingabe.productOptions.map(o => o.name), hw.eingabe.descriptionHtml], [true, ['Farbe'], VAR_MARKER + '<p><strong>Ausführung:</strong> Inhalt: 15 l.</p><p>Ein Text.</p>']);
  ist('… der Kopf wird von der Textkette als Kopf erkannt (zerlege)', (() => { const z = zerlege(hw.eingabe.descriptionHtml); return [z.kopf, z.prosa]; })(), [VAR_MARKER + '<p><strong>Ausführung:</strong> Inhalt: 15 l.</p>', '<p>Ein Text.</p>']);
  ist('… Hinweis im Ergebnis', hw.hinweise, [{ name: 'Capacity', wert: '15L', text: 'Inhalt: 15 l.' }]);
  ist('… die Farben sind übersetzt und die Varianten haben je ein Bild', [hw.eingabe.productOptions[0].values.map(v => v.name), hw.eingabe.variants.every(v => v.file)], [['Schwarz', 'Blau'], true]);
  ist('Beschreibung, die den Marker schon trägt, bekommt ihn nicht doppelt', (() => { const d = lauf(FIX.mode, T_MODE, { ...MODE, beschreibungHtml: VAR_MARKER + '<p>x</p>' }).eingabe.descriptionHtml; return d.split(VAR_MARKER).length - 1; })(), 1);
  // zusammengefasst
  const zs = lauf(FIX.zusammen, 'Beruhigendes Kuscheltier', { uebersetzung: {} });
  ist('Dünnes Raster (6 Varianten aus Farbe × Höhe) wird EINE Auswahl «Ausführung» mit « · » — nicht ein Raster mit unmöglichen Kombinationen', [zs.optionen.map(o => o.name), zs.warnungen.some(w => /zusammengefasst/.test(w))], [['Ausführung'], true]);
}

// ───────────────────────── Tore: Optionswerte (sicher, deutsch, keine Zahlen als Modell) ─────────────────────────
{
  const u = lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben');
  ist('unbekannte englische Farben (echtes Datenblatt: Lime, Peach, Watermelon red, Avocado) → Tor optionswerte-sicher fällt, KEINE Eingabe', [tor(u, 'optionswerte-sicher').ok, u.eingabe, u.frist], [false, null, 'zurueckgestellt']);
  ist('… die Werte zum Übersetzen stehen im Ergebnis (der Aufrufer übersetzt und ruft erneut)', u.unsicher.map(x => x.wert), ['Lime', 'Peach', 'Watermelon red', 'Avocado']);
  ist('… kiAusfall → nur vorläufig (20 h), nicht 7 Tage', lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben', { kiAusfall: true }).frist, 'vorlaeufig');
  const ue = { Lime: 'Limette', Peach: 'Pfirsich', 'Watermelon red': 'Wassermelonenrot', Avocado: 'Avocado' };
  const u2 = lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben', { uebersetzung: ue });
  ist('mit ctx.uebersetzung: ok, die Werte stehen deutsch in Optionen UND Varianten', [u2.ok, u2.eingabe.productOptions[0].values.map(v => v.name), u2.eingabe.variants.map(v => v.optionValues[0].name)], [true, ['Limette', 'Pfirsich', 'Wassermelonenrot', 'Avocado'], ['Limette', 'Pfirsich', 'Wassermelonenrot', 'Avocado']]);
  ist('… Option heisst «Farbe»', u2.eingabe.productOptions[0].name, 'Farbe');
  const u3 = lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben', { uebersetzung: { ...ue, Lime: 'Lime green' } });
  ist('Übersetzung, die selbst englisch bleibt («Lime green») → Tor optionswerte-deutsch fällt und meldet den Wert zum Übersetzen', [tor(u3, 'optionswerte-deutsch').ok, u3.eingabe, u3.unsicher.some(x => x.wert === 'Lime green')], [false, null, true]);
  const u4 = lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben', { uebersetzung: { ...ue, Peach: 'Limette' } });
  ist('Übersetzung macht zwei Werte gleich → Auswahl nicht baubar', [tor(u4, 'auswahl').ok, /gleich/.test(tor(u4, 'auswahl').grund)], [false, true]);
  // Endwerte, die farbeDeutsch für sicher hält, EN_AUSGABE_RE aber nicht
  const ap = ableiten(FIX.mode, k => { for (const v of k.variants) v.variantKey = v.variantKey.replace(/^Black/, 'Apricot / Weiss').replace(/^White/, 'Schwarz'); });
  const rap = lauf(ap, T_MODE, MODE);
  ist('Endwert «Apricot / Weiss» (farbeDeutsch: sicher; EN_AUSGABE_RE: englisch) → Tor optionswerte-deutsch fällt', [tor(rap, 'optionswerte-deutsch').ok, rap.unsicher.map(x => x.wert)], [false, ['Apricot / Weiss']]);
  const rap2 = lauf(ap, T_MODE, { ...MODE, uebersetzung: { 'Apricot / Weiss': 'Aprikose / Weiss' } });
  ist('… die Übersetzung des ENDWERTS behebt es (sonst gäbe es keinen Weg)', [rap2.ok, rap2.eingabe.productOptions[0].values.map(v => v.name)], [true, ['Aprikose / Weiss', 'Schwarz']]);
  const kol = lauf(FIX.mode, T_MODE, { ...MODE, uebersetzung: { Schwarz: 'Weiss' } });
  ist('Übersetzung eines ENDWERTS, die auf einen anderen Wert derselben Option fällt (Schwarz → Weiss) → Auswahl nicht baubar', [tor(kol, 'auswahl').ok, /gleich/.test(tor(kol, 'auswahl').grund), kol.eingabe], [false, true, null]);
  ist('Gegenprobe: ein deutscher Farbwert wird nie angefasst', M.eingabe.productOptions[0].values.map(v => v.name), ['Schwarz', 'Weiss']);
  // chinesische Zeichen
  const cn = ableiten(FIX.mode, k => { k.variants[0].variantKey = '黑色-S'; });
  ist('chinesische Zeichen in einem Optionswert → fällt', tor(lauf(cn, T_MODE, { ...MODE, uebersetzung: { '黑色': '黑色' } }), 'optionswerte-deutsch').ok, false);

  // Zahlen als Modell / Farbe
  const z = lauf(FIX.zahl, 'Schneidebrett-Set mit Marmorbeschichtung');
  ist('Option «Model» mit nackten Zahlen 8016/8017 (echtes Datenblatt) → Tor zahl-als-modell fällt, zurückgestellt', [tor(z, 'zahl-als-modell').ok, /Modell/.test(tor(z, 'zahl-als-modell').grund), /8016/.test(tor(z, 'zahl-als-modell').grund), z.frist, z.eingabe], [false, true, true, 'zurueckgestellt', null]);
  const stil = ableiten(FIX.zahl, k => { k.productKeyEn = 'Style'; k.variants[0].variantKey = 'Style1'; k.variants[1].variantKey = 'Style2'; });
  ist('Gegenprobe: «Style1»/«Style2» werden «Modell 1»/«Modell 2» — das trägt das Wort und geht durch (abgeleitet)', (() => { const r = lauf(stil, 'Schneidebrett-Set mit Marmorbeschichtung'); return [r.ok, r.eingabe.productOptions[0].name, r.eingabe.productOptions[0].values.map(v => v.name)]; })(), [true, 'Modell', ['Modell 1', 'Modell 2']]);
  const code = ableiten(FIX.mode, k => { k.productKeyEn = 'Color-Size'; for (const v of k.variants) v.variantKey = v.variantKey.replace(/^Black/, 'A').replace(/^White/, 'B'); });
  ist('Gegenprobe: Buchstaben-Kürzel unter «Color» (A, B) werden «Modell A», «Modell B», nicht «Farbe: A» (abgeleitet)', (() => { const r = lauf(code, T_MODE, MODE); return [r.ok, r.eingabe.productOptions[0].name, r.eingabe.productOptions[0].values.map(v => v.name)]; })(), [true, 'Modell', ['Modell A', 'Modell B']]);
  const zahlFarbe = ableiten(FIX.mode, k => { for (const v of k.variants) v.variantKey = v.variantKey.replace(/^Black/, '5').replace(/^White/, '6'); });
  const rzf = lauf(zahlFarbe, T_MODE, { ...MODE, uebersetzung: { 5: '5', 6: '6' } });
  ist('Zahlen unter «Farbe» (Ringgrössen «5», «6», abgeleitet; die KI gibt sie unverändert zurück) → fällt', [tor(rzf, 'zahl-als-modell').ok, /Farbe/.test(tor(rzf, 'zahl-als-modell').grund)], [false, true]);
  ist('Zahlen mit Einheit unter Grösse sind in Ordnung (Gegenprobe: «Grösse» 36, 38 …)', (() => { const g = ableiten(FIX.mode, k => { const gr = ['36', '38', '40', '42', '44']; k.variants.forEach((v, i) => { v.variantKey = `${v.variantKey.split('-')[0]}-${gr[i % 5]}`; }); }); const r = lauf(g, T_MODE, MODE); return [r.ok, r.eingabe.productOptions[1].name, r.eingabe.productOptions[1].values.map(v => v.name)]; })(), [true, 'Grösse', ['36', '38', '40', '42', '44']]);
}

// ───────────────────────── Prüfung 27.10.2026: Farbwerte, Massangaben, Produktart, Fremdstecker, heikle Ware ─────────────────────────
{
  // Ziffernkollision: «Schwarz» neben «Schwarz1» ist für die Kundin keine Auswahl (im Shop live: 3d-teddy-lampe-a92a5f)
  ist('ziffernKollision: «Schwarz1» + «Schwarz» sind zwei gleich benannte Farben', ziffernKollision(['Schwarz1', 'Schwarz']), [['Schwarz1', 'Schwarz']]);
  ist('ziffernKollision: «Black Zone2»/«Black Zone4» sind echte Unterschiede', ziffernKollision(['Black Zone2', 'Black Zone4']), []);
  ist('ziffernKollision: Werte ohne Ziffern', ziffernKollision(['Rot', 'Blau']), []);
  ist('ziffernKollision: zwei getrennte Kollisionen', ziffernKollision(['Weiss', 'Weiss1', 'Riss', 'Riss1']).length, 2);
  ist('ziffernKollision: «Black1»/«White1» ohne Gegenstück ohne Ziffer ist keine Kollision', ziffernKollision(['Black1', 'White1']), []);
  ist('ziffernKollision: Eingabe nicht lesbar → leer, kein Wurf', [ziffernKollision(null), ziffernKollision([]), ziffernKollision([null, undefined])], [[], [], []]);
  const kol = ableiten(FIX.mode, k => { for (const v of k.variants) v.variantKey = v.variantKey.replace(/^White/, 'Black1'); });
  const rk = lauf(kol, T_MODE, { ...MODE, uebersetzung: { Black1: 'Schwarz1' } });
  ist('Tor farbwerte-unterscheidbar: «Schwarz» + «Schwarz1» (abgeleitet) → fällt, zurückgestellt, KEINE Eingabe', [tor(rk, 'farbwerte-unterscheidbar').ok, /Schwarz \/ Schwarz1/.test(tor(rk, 'farbwerte-unterscheidbar').grund), rk.frist, rk.eingabe], [false, true, 'zurueckgestellt', null]);
  ist('Gegenprobe: das echte Datenblatt (Schwarz/Weiss) besteht das Tor', tor(M, 'farbwerte-unterscheidbar').ok, true);
  ist('Tor farbwerte-unterscheidbar steht in der Torliste (23 Tore) und läuft in jedem Ergebnis', [TORE.length, TORE.includes('farbwerte-unterscheidbar'), M.tore.some(t => t.name === 'farbwerte-unterscheidbar')], [23, true, true]);

  // kleine Wörter in Optionswerten («4 sections 1.6m», «Pink gold» sind englischer Rest, auch wenn kein Wörterbuch-Treffer da ist)
  for (const w of ['4 sections 1.6m', '15 pieces', 'L plus', 'Pink gold', 'Schwarz / gold', '12 inch']) ist(`KLEIN_WORT_RE: «${w}» ist englischer Rest`, kleinWortImWert(w), true);
  for (const w of ['Roségold', 'Schwarz / Weiss', 'mit Fernbedienung', 'ohne Akku', 'Grün', '150 × 200 cm', 'S', 'XXL', 'Gold', 'Rot, Blau']) ist(`KLEIN_WORT_RE: «${w}» bleibt erlaubt`, kleinWortImWert(w), false);
  ist('kleinWortImWert: null/undefined werfen nicht', [kleinWortImWert(null), kleinWortImWert(undefined)], [false, false]);
  ist('KLEIN_WORT_RE hat kein g-Flag (sonst springt test() zwischen Aufrufen)', KLEIN_WORT_RE.global, false);

  // «Modell» mit nur Massen: Breite? Länge? Leistung? → nie raten
  const mm = ableiten(FIX.zahl, k => { k.variants.forEach((v, i) => { v.variantKey = ['60cm', '80cm', '100cm'][i % 3]; }); });
  const rm = lauf(mm, 'Schneidebrett-Set mit Marmorbeschichtung');
  ist('«Modell» aus lauter Massen (60 cm, 80 cm; abgeleitet) → Tor zahl-als-modell fällt mit Klartext', [tor(rm, 'zahl-als-modell').ok, /nur Masse/.test(tor(rm, 'zahl-als-modell').grund), rm.frist, rm.eingabe], [false, true, 'zurueckgestellt', null]);
  const gr = ableiten(FIX.zahl, k => { k.productKeyEn = 'Size'; k.variants.forEach((v, i) => { v.variantKey = ['60cm', '80cm', '100cm'][i % 3]; }); });
  ist('Gegenprobe: dieselben Masse unter «Size» heissen «Grösse» und gehen durch', (() => { const r = lauf(gr, 'Schneidebrett-Set mit Marmorbeschichtung'); return [tor(r, 'zahl-als-modell').ok, r.eingabe?.productOptions[0].name]; })(), [true, 'Grösse']);

  const gemischt = ableiten(FIX.zahl, k => { k.variants.forEach((v, i) => { v.variantKey = ['60cm', 'Standard', '100cm'][i % 3]; }); });
  ist('Gegenprobe: «Modell» mit Massen UND einem Wort («Standard») ist keine reine Massangabe → Tor zahl-als-modell besteht', tor(lauf(gemischt, 'Schneidebrett-Set mit Marmorbeschichtung', { uebersetzung: { Standard: 'Standard' } }), 'zahl-als-modell').ok, true);

  // kleine englische Wörter in Optionswerten («pieces», «sections», «plus») fängt nur KLEIN_WORT_RE: das Tor optionswerte-deutsch muss fallen
  for (const [a1, b1] of [['15 pieces', '30 pieces'], ['4 sections', '5 sections'], ['L plus', 'XL plus']]) {
    const gr = ableiten(FIX.mode, k => { k.variants.forEach(v => { const [c, g] = v.variantKey.split('-'); v.variantKey = `${c}-${{ S: a1, M: b1, L: 'XXL', XL: '3XL', XXL: '4XL' }[g]}`; }); });
    const rg = lauf(gr, T_MODE, MODE);
    ist(`Tor optionswerte-deutsch: «${a1}» / «${b1}» sind englischer Rest → fällt, zurückgestellt, KEINE Eingabe`, [tor(rg, 'optionswerte-deutsch').ok, tor(rg, 'optionswerte-deutsch').grund.includes(`«${a1}»`), rg.frist, rg.eingabe], [false, true, 'zurueckgestellt', null]);
  }

  // Produktart: der Pfad sagt «Webcam», das Datenblatt beschreibt eine Netzwerk-Kamera (echter Fall pid 5C86453E, 27.10.2026)
  const WEBCAM = 'Cameras & Optics > Cameras > Webcams';
  const wc = ableiten(FIX.einzel, k => { k.productNameEn = 'Webcam with microphone'; k.description = '<p>Type: Network Camera</p><p>Style: Gun Camera</p><p>Lens: 3.6 (mm)</p><p>Power supply voltage: 3.7 (V)</p>'; });
  const rw = lauf(wc, 'Webcam mit Mikrofon', { googlePfad: WEBCAM });
  ist('Webcam-Titel, Datenblatt «Network Camera / Gun Camera» → Tor produktart fällt (zurückgestellt), Klartext nennt Überwachungskamera', [tor(rw, 'produktart').ok, /Netzwerk-\/Überwachungskamera/.test(tor(rw, 'produktart').grund), rw.frist, rw.eingabe], [false, true, 'zurueckgestellt', null]);
  const wc2 = ableiten(FIX.einzel, k => { k.productNameEn = 'Webcam with microphone'; k.description = '<p>USB webcam, 1080P, built-in microphone</p>'; });
  ist('Gegenprobe: echte USB-Webcam mit gleichem Pfad besteht das Tor', tor(lauf(wc2, 'Webcam mit Mikrofon', { googlePfad: WEBCAM }), 'produktart').ok, true);
  ist('Gegenprobe: dasselbe Datenblatt unter einem anderen Pfad (Überwachungskamera) wird nicht gesperrt', tor(lauf(wc, 'Überwachungskamera', { googlePfad: 'Electronics > Video > Video Surveillance Cameras' }), 'produktart').ok, true);
  ist('PRODUKTART_WIDERSPRUCH ist eingefroren (Liste und Einträge)', [Object.isFrozen(PRODUKTART_WIDERSPRUCH), PRODUKTART_WIDERSPRUCH.every(w => w.pfad instanceof RegExp && w.text instanceof RegExp && w.was)], [true, true]);

  // Fremdstecker / 110 V im NAMEN (nicht nur in den Varianten)
  const stecker = (nameEn, titel) => { const r = lauf(ableiten(FIX.einzel, k => { k.productNameEn = nameEn; }), titel); return [tor(r, 'steckdosen-ware').ok, r.frist]; };
  ist('Fremdstecker: «Heater 110V US Plug» im CJ-Namen → Tor steckdosen-ware fällt', stecker('Electric Heater 110V US Plug Mini Desktop Warmer', 'Elektroheizung Mini')[0], false);
  ist('Fremdstecker: «Hair Dryer 1800W AU Plug»', stecker('Hair Dryer 1800W AU Plug', 'Haartrockner 1800 W')[0], false);
  ist('Fremdstecker: «Wall Charger 65W GaN UK Plug»', stecker('Wall Charger 65W GaN UK Plug', 'Wandladegerät 65 W')[0], false);
  ist('Fremdstecker: deutscher Titel «mit US-Stecker» ohne EU', stecker('LED Night Light Mushroom', 'LED-Nachtlicht Pilz mit US-Stecker')[0], false);
  ist('Gegenprobe: «Wall Charger 65W GaN» ohne Steckerangabe', stecker('Wall Charger 65W GaN', 'Wandladegerät 65 W')[0], true);
  ist('Gegenprobe: «(EU/US Plug)» nennt EU, die Varianten-Prüfung entscheidet', stecker('LED Night Light Mushroom (EU/US Plug)', 'LED-Nachtlicht Pilz (EU/US Stecker)')[0], true);
  ist('fremdsteckerImNamen: 110-240V ist Weitbereich, 110V / 110 V nicht', [fremdsteckerImNamen('Travel Charger 110-240V'), fremdsteckerImNamen('Mini Heater 110V'), fremdsteckerImNamen('Mini Heater 110 V'), fremdsteckerImNamen('Waffelmaschine Herzform 110 V')], [false, true, true, true]);
  ist('fremdsteckerImNamen: Wortteile («Business»), 1100V und «Auction» lösen nicht aus', [fremdsteckerImNamen('Business Backpack'), fremdsteckerImNamen('Capacitor 1100V'), fremdsteckerImNamen('Auction Hammer'), fremdsteckerImNamen(null), fremdsteckerImNamen('')], [false, false, false, false, false]);

  // heikle Ware (sicherer Standard = sperren, der Besitzer entscheidet über eine Lockerung)
  ist('heikelWort: Laser-Zeiger, Blutdruck, Hörgerät, Steinschleuder, Pfefferspray, Feuerwerk', ['Taktische Taschenlampe mit Laser', 'Laserpointer 5000 mW', 'Blutdruckmessgerät Oberarm', 'Hörgerät wiederaufladbar', 'Steinschleuder Jagd', 'Pepper Spray Keychain', 'Feuerwerk Rauchbombe'].map(x => !!heikelWort(x)), [true, true, true, true, true, true, true]);
  ist('heikelWort: kein Fehlalarm bei abnehmbar, Gerichtsmediziner, Feldspritze, Laser-Entfernungsmesser, Laser-Graviermaschine, Haarentfernung', ['Abnehmbarer Hüftbeutel', 'Kostüm Gerichtsmediziner', 'Anhängefeldspritze', 'Laser-Entfernungsmesser 40 m', 'Laser Engraver Machine', 'IPL Laser Hair Removal'].map(x => !!heikelWort(x)), [false, false, false, false, false, false]);
  ist('heikelWort: null/leer wirft nicht', [heikelWort(null), heikelWort(''), heikelWort(undefined)], [null, null, null]);
  const hk = lauf(ableiten(FIX.einzel, k => { k.productNameEn = 'Laser Pointer 5000mW Green'; }), 'Laserpointer 5000 mW');
  ist('heikle Ware im Plan: Laserpointer → Tor sperrwoerter fällt mit Klartext', [tor(hk, 'sperrwoerter').ok, /heikle Ware/.test(tor(hk, 'sperrwoerter').grund)], [false, true]);

  // Schema-Pin: die Konstante im Schema ist die gefahrene API-Version
  ist('SCHEMA_API_VERSION ist API_VERSION (das Schema gilt für die Version, mit der gefahren wird)', [SCHEMA_API_VERSION, SCHEMA_API_VERSION === API_VERSION], ['2026-01', true]);
}

// ───────────────────────── Schema und Konsistenz ─────────────────────────
{
  const g = klon(E);
  ist('schemaPruefen: gültige Eingabe', schemaPruefen(g), []);
  const mut = (f) => { const k = klon(E); f(k); return schemaPruefen(k); };
  ist('Schema: unbekanntes Feld in ProductSetInput', mut(k => { k.foo = 1; }), ['input.foo: Feld gibt es in ProductSetInput nicht']);
  ist('Schema: altes Feld inventoryItem.weight gibt es nicht mehr (nur measurement)', mut(k => { k.variants[0].inventoryItem.weight = 1; }), ['input.variants[0].inventoryItem.weight: Feld gibt es in InventoryItemInput nicht']);
  ist('Schema: falscher Status', mut(k => { k.status = 'ACTIV'; }).length, 1);
  ist('Schema: Preis als Zahl statt Text', mut(k => { k.variants[0].price = 22.42; }).length, 1);
  ist('Schema: optionValues fehlt (Pflicht)', mut(k => { delete k.variants[0].optionValues; }), ['input.variants[0].optionValues: Pflichtfeld fehlt']);
  ist('Schema: Typ nicht eingebettet (barcodes) → Fehler statt stillem Durchlass', mut(k => { k.variants[0].barcodes = []; }).length, 1);
  ist('Schema: WeightInput braucht unit und value', mut(k => { k.variants[0].inventoryItem.measurement.weight = { value: 1 }; }), ['input.variants[0].inventoryItem.measurement.weight.unit: Pflichtfeld fehlt']);
  ist('Schema: falsche Gewichtseinheit', mut(k => { k.variants[0].inventoryItem.measurement.weight.unit = 'GRAM'; }).length, 1);
  ist('Schema: tags müssen Texte sein', mut(k => { k.tags = ['a', 5]; }).length, 1);
  ist('Schema: contentType IMAGE ist erlaubt, «PHOTO» nicht', [mut(k => { k.files[0].contentType = 'IMAGE'; }).length, mut(k => { k.files[0].contentType = 'PHOTO'; }).length], [0, 1]);
  ist('Schema: Metafeld ohne value ist formal gültig (value optional im Schema); die Pflicht prüft planeNeu', mut(k => { delete k.metafields[0].value; }), []);
  ist('Schema: kein Objekt', schemaPruefen(null).length, 1);
  ist('SCHEMA enthält alle Felder von ProductSetInput (21) und ProductVariantSetInput (17), wie die ECHTE Admin-API 2026-01 sie per Introspektion am 27.10.2026 liefert (der MCP kennt 2026-10: dort barcodes/published statt barcode, 18 Felder)', [Object.keys(SCHEMA.ProductSetInput).length, Object.keys(SCHEMA.ProductVariantSetInput).length], [21, 17]);
  ist('SCHEMA: ProductVariantSetInput kennt barcode (2026-01), aber weder barcodes noch published (nur 2026-10)', 'barcode' in SCHEMA.ProductVariantSetInput && !('barcodes' in SCHEMA.ProductVariantSetInput) && !('published' in SCHEMA.ProductVariantSetInput), true);

  const kon = (f) => { const k = klon(E); f(k); return konsistenzPruefen(k); };
  ist('Konsistenz: gültige Eingabe', konsistenzPruefen(klon(E)), []);
  ist('Konsistenz: Variantenbild steht nicht in files', kon(k => { k.variants[0].file.originalSource = 'https://x/nicht-in-files.jpg'; }), ['Variante 0: Variantenbild steht nicht in files']);
  ist('Konsistenz: SKU doppelt', kon(k => { k.variants[1].inventoryItem.sku = k.variants[0].inventoryItem.sku; }).some(f => /SKU .* doppelt/.test(f)), true);
  ist('Konsistenz: Kombination doppelt', kon(k => { k.variants[1].optionValues = klon(k.variants[0].optionValues); }).some(f => /Kombination doppelt/.test(f)), true);
  ist('Konsistenz: Optionswert, den es in productOptions nicht gibt', kon(k => { k.variants[0].optionValues[0].name = 'Pink'; }).some(f => /fehlt in Option/.test(f)), true);
  ist('Konsistenz: Preis nicht über Kosten', kon(k => { k.variants[0].price = '8.97'; }).some(f => /nicht über Kosten/.test(f)), true);
  ist('Konsistenz: Status ACTIVE ist verboten (neue Produkte starten als DRAFT)', kon(k => { k.status = 'ACTIVE'; }).some(f => /DRAFT/.test(f)), true);
  ist('Konsistenz: Handle mit Umlaut', kon(k => { k.handle = 'bürste'; }).some(f => /Handle/.test(f)), true);
  ist('Konsistenz: Option mit zwei Werten, die sich nur in Gross-/Kleinschreibung unterscheiden', kon(k => { k.productOptions[0].values.push({ name: 'schwarz' }); }).some(f => /doppelt/.test(f)), true);
  ist('Konsistenz: mehr als 3 Optionen', kon(k => { k.productOptions.push({ name: 'A', values: [{ name: 'x' }] }, { name: 'B', values: [{ name: 'x' }] }); }).some(f => /mehr als 3 Optionen/.test(f)), true);
  ist('Konsistenz: Option ohne Werte', kon(k => { k.productOptions[0].values = []; }).some(f => /ohne Werte/.test(f)), true);
  ist('Konsistenz: mehr als 250 Medien', kon(k => { for (let i = 0; i < 250; i++) k.files.push({ originalSource: `https://x/${i}.jpg`, contentType: 'IMAGE' }); }).some(f => /250 Medien/.test(f)), true);
  ist('Konsistenz: Variante ohne SKU', kon(k => { delete k.variants[0].inventoryItem.sku; }).some(f => /keine SKU/.test(f)), true);
}

// ───────────────────────── Fristen und Ledger-Vokabular ─────────────────────────
{
  const jetzt = Date.parse('2026-10-27T12:00:00Z');
  const zeile = (r, h) => `${h} · 2026-10-27T12:00:00.000Z · UEBERSPRUNGEN · ${r.ledgerGrund}`;
  const tage = n => jetzt + n * 24 * 3600 * 1000;
  const hy = lauf(FIX.hyphen, 'Fahrradhelm');                       // zurückgestellt (7 Tage)
  ist('ledgerGrund beginnt mit «zurückgestellt: »', hy.ledgerGrund.startsWith('zurückgestellt: auswahl: '), true);
  ist('Ledger: zurückgestellt gilt 7 Tage (nach 3 Tagen erledigt, nach 8 Tagen wieder dran)', [ledgerGedaechtnis(zeile(hy, 'h1'), { jetzt: tage(3) }).has('h1'), ledgerGedaechtnis(zeile(hy, 'h1'), { jetzt: tage(8) }).has('h1')], [true, false]);
  const lz = lauf(FIX.lizenz, 'Nagelpuder');                         // endgültig (14 Tage)
  ist('ledgerGrund endgültig: kein Präfix', lz.ledgerGrund.startsWith('sperrwoerter: '), true);
  ist('Ledger: endgültig gilt 14 Tage (nach 10 Tagen erledigt, nach 15 wieder dran)', [ledgerGedaechtnis(zeile(lz, 'h2'), { jetzt: tage(10) }).has('h2'), ledgerGedaechtnis(zeile(lz, 'h2'), { jetzt: tage(15) }).has('h2')], [true, false]);
  const lg = lauf(FIX.einzel, '');                                   // vorläufig (20 h)
  ist('ledgerGrund vorläufig beginnt mit «vorläufig: »', lg.ledgerGrund.startsWith('vorläufig: titel: '), true);
  ist('Ledger: vorläufig gilt 20 Stunden (nach 10 h erledigt, nach 2 Tagen wieder dran)', [ledgerGedaechtnis(zeile(lg, 'h3'), { jetzt: jetzt + 10 * 3600 * 1000 }).has('h3'), ledgerGedaechtnis(zeile(lg, 'h3'), { jetzt: tage(2) }).has('h3')], [true, false]);
  ist('ledgerGrund enthält weder «·» noch Zeilenumbruch (das Ledger trennt mit «·»)', [hy, lz, lg].every(r => !/[·\n\r]/.test(r.ledgerGrund)), true);
  // FIX.zusammen ist ein Neugeborenen-Spielzeug (CJ-Kategorie «Toys, Kids & Babies»): seit der Gegenlesung 27.10.2026 sperrt das Tor sperrwoerter es; für den «·»-Test eine neutrale Abwandlung
  const zusammenNeutral = ableiten(FIX.zusammen, k => { k.productNameEn = 'Breathing Rabbit Soothing Sensory Plush Toy With Relieve Anxiety Bunny Comforter Breathes'; k.categoryName = 'Home & Garden > Decor > Plush'; k.description = '<p>Soft plush.</p>'; });
  const zu = lauf(zusammenNeutral, 'Beruhigendes Kuscheltier', { uebersetzung: { 'New Breathing Rabbit': 'Atmendes Kaninchen', '4speed breathing elephant': 'Elefant, 4 Stufen', Koala: 'Koala', 'White elk': 'White elk', 'Brown elk': 'Brauner Elch' } });
  ist('Fall mit « · » im Grund (zusammengefasste Auswahl, ein Wert bleibt englisch: «White elk · 30 cm»): der Tor-Grund trägt es, der ledgerGrund nicht', [tor(zu, 'optionswerte-deutsch').grund.includes(' · '), zu.ledgerGrund.includes('·'), zu.ledgerGrund.startsWith('zurückgestellt: optionswerte-deutsch: ')], [true, false, true]);
  ist('ledgerGrund ist höchstens 300 Zeichen', [hy, lz, lg].every(r => r.ledgerGrund.length <= 300), true);
  // Der längste Grund gewinnt
  const mix = lauf(FIX.lizenz, '');                                 // Titel leer (vorläufig) + Lizenz (endgültig)
  ist('mehrere Gründe: der LÄNGSTE gewinnt (endgültig vor vorläufig)', [mix.frist, FRISTEN], ['endgueltig', ['endgueltig', 'zurueckgestellt', 'vorlaeufig']]);
  ist('mehrere Gründe stehen alle im ledgerGrund', [/titel: /.test(mix.ledgerGrund), /sperrwoerter: /.test(mix.ledgerGrund)], [true, true]);
  ist('ok → frist null, ledgerGrund leer, grund leer', [M.frist, M.ledgerGrund, M.grund], [null, '', '']);
}

// ───────────────────────── Fall-Folgen: keine Eingabe ohne bestandene Tore ─────────────────────────
{
  const faelle = [
    ['Titel leer', lauf(FIX.einzel, '')], ['DIY', lauf(FIX.diy, 'Halskette')], ['Lizenz', lauf(FIX.lizenz, 'Nagelpuder')], ['zu wenig Bilder', lauf(FIX.wenig, 'Palette')],
    ['Preis ≤ Kosten', lauf(FIX.einzel, 'Wattestäbchen', { preis: () => ({ preis: 1, kosten: 2 }) })], ['Auswahl', lauf(FIX.hyphen, 'Fahrradhelm')], ['unsicher', lauf(FIX.unsicher, 'Pinsel')],
    ['Zahl', lauf(FIX.zahl, 'Brett')], ['Limit', lauf(FIX.viele, 'Boho', { ...MODE, maxVarianten: 10 })], ['kein Google', lauf(FIX.einzel, 'Wattestäbchen', { googlePfad: '' })],
  ];
  for (const [n, r] of faelle) ist(`fällt ein Tor (${n}) → ok false, eingabe null, grund und ledgerGrund gefüllt, jedes Tor hat Namen und ok true/false/null`, [r.ok, r.eingabe, r.grund.length > 0, r.ledgerGrund.length > 0, r.tore.every(t => typeof t.name === 'string' && [true, false, null].includes(t.ok))], [false, null, true, true, true]);
  ist('jedes Ergebnis führt alle Tore in fester Reihenfolge auf, auch bei Abbruch', faelle.every(([, r]) => JSON.stringify(r.tore.map(t => t.name)) === JSON.stringify(TORE)), true);
}

// ───────────────────────── Robustheit: planeNeu wirft nie ─────────────────────────
{
  const muell = [undefined, null, 0, 'x', [], {}, { variants: 'x' }, { variants: [null, 1, 'a'] }, { pid: 5, variants: [{ vid: 1, variantSku: 2 }] }, { data: { data: {} } }, { variants: [{ vid: 'a', variantSku: 'b', variantKey: 5, variantSellPrice: 'x' }] }];
  let geworfen = 0, ok1 = 0;
  for (const m of muell) for (const c of [undefined, null, {}, { titel: 'T' }, 'x', 5, { titel: 'T', preis: 'x', tags: 'kein array', bildOk: 5, uebersetzung: 'x', metafelder: 'x' }]) {
    try { const r = planeNeu(m, c); if (r.ok) ok1++; } catch (e) { geworfen++; console.log('  Absturz bei', JSON.stringify(m), JSON.stringify(c), e.message); }
  }
  ist('planeNeu wirft bei keiner Müll-Eingabe (11 × 7 Kombinationen) und bejaht keine', [geworfen, ok1], [0, 0]);
}

// ───────────────────────── Gegenlesung 27.10.2026 («Geld und Tore», Runde 2): Kinderware, Sperrwörter, Datenblatt-Text, Fremdstecker ─────────────────────────
// Jeder Test unten lief auf dem Stand VOR der Einarbeitung rot (Mutationsprobe in der Übergabe). Messbasis der Gegenleser: 21 Kinderfälle und 49 heikle englische CJ-Namen mit plausibler deutscher Übersetzung.
{
  /** Läuft ein Produkt (englischer CJ-Name, deutscher Titel, CJ-Kategorie, Datenblatt-Text) durch das Tor «sperrwoerter» bzw. «steckdosen-ware»? true = gesperrt. */
  const sperrFall = (en, de, { kategorie = 'Home Improvement / Tools / Hand Tools', text: beschr = '<p>Ein neutraler Text.</p>' } = {}) => {
    const r = lauf(ableiten(FIX.einzel, k => { k.productNameEn = en; k.categoryName = kategorie; k.description = beschr; }), de);
    return { gesperrt: fallen(r).some(n => ['sperrwoerter', 'steckdosen-ware'].includes(n)), grund: (tor(r, 'sperrwoerter')?.grund || '') + (tor(r, 'steckdosen-ware')?.grund || '') };
  };
  const KATEGORIE_KINDER = 'Toys, Kids & Babies > Toys & Hobbies > Misc';

  // ── Kinderware auf Produktebene: 21 Fälle der Gegenlesung (englischer Name + plausible deutsche Übersetzung ohne «Kinder»)
  const KINDER = [
    ['Kids Smart Watch Waterproof', 'Smartwatch für Kinder'], ['Kids Smart Watch Waterproof', 'Smartwatch Kids'], ['Children Drawing Board LCD', 'LCD-Zeichentafel für Kinder'],
    ['Infant Teether Silicone Teething Toy', 'Beissring aus Silikon für Säuglinge'], ['Newborn Photography Props Baby Blanket', 'Neugeborenen-Fotografie-Requisiten Decke'],
    ['Pacifier Clip Chain Silicone Beads', 'Schnullerkette mit Silikonperlen'], ['Toddler Walking Shoes Soft Sole', 'Lauflernschuhe für Kleinkinder'], ['Toddler Walking Shoes Soft Sole', 'Lauflernschuhe mit weicher Sohle'],
    ['Girls Princess Dress Party', 'Prinzessinnenkleid für Mädchen'], ['Boys Dinosaur Backpack School Bag', 'Dinosaurier-Rucksack für Jungen'], ['Baby Bath Thermometer Duck', 'Badethermometer Ente'],
    ['Baby Bath Thermometer Duck', 'Babybadethermometer Ente'], ['Child Safety Cabinet Lock 10pcs', 'Schrankschloss Kindersicherung 10 Stück'], ['Child Safety Cabinet Lock 10pcs', 'Schrankschloss 10 Stück zum Schutz vor Zugriff'],
    ['Kids Night Light Projector Star', 'Sternenprojektor Nachtlicht'], ['Kids Electric Toothbrush Silicone', 'Elektrische Zahnbürste mit Silikonborsten'], ['Baby Monitor Camera WiFi', 'Überwachungskamera für das Kinderzimmer'],
    ['Teething Necklace Silicone Beads for Mom', 'Beissketten-Set aus Silikon'], ['Kids Slime Kit DIY Toy', 'Schleim-Set zum Selbermachen'],
    ['Magnetic Building Blocks 100pcs', 'Magnetische Bausteine 100 Stück'], ['Button Cell Battery LED Finger Lights Toy', 'Leuchtende Fingerlichter'],
  ];
  const durchgelassen = KINDER.filter(([en, de]) => !sperrFall(en, de, { kategorie: KATEGORIE_KINDER }).gesperrt);
  ist('Kinderware: alle 21 Fälle der Gegenlesung werden vom Tor «sperrwoerter» gesperrt (vorher 13 von 21 durchgelassen)', durchgelassen, []);
  ist('Kinderware: die Fälle OHNE Kinderwort (Magnet-Bausteine, Knopfzellen-Fingerlichter) fängt die CJ-KATEGORIE «Toys, Kids & Babies», nicht der Name', [sperrFall('Magnetic Building Blocks 100pcs', 'Magnetische Bausteine 100 Stück').gesperrt, sperrFall('Magnetic Building Blocks 100pcs', 'Magnetische Bausteine 100 Stück', { kategorie: KATEGORIE_KINDER }).gesperrt], [false, true]);
  ist('Kinderware: der Grund nennt Fundort und Wort', [sperrFall('Infant Teether Silicone Teething Toy', 'Silikon-Zahnungshilfe').grund.includes('Kinder-/Babyware (CJ-Name: «infant»)'), sperrFall('Haarband', 'Haarband für Kinder').grund.includes('Kinder-/Babyware (Titel: «kinder»)'), sperrFall('Plush', 'Plüsch', { kategorie: KATEGORIE_KINDER }).grund.includes('CJ-Kategorie')], [true, true, true]);
  // Gegenproben: KEINE Kinderware (Fehlalarme kosten Kandidaten) — Farben, Pflanze, Kochen, Warnhinweise, Erwachsenen-Altersangaben
  const KEINE_KINDER = [
    ['Baby Pink Hoodie Women Oversized', 'Oversize-Hoodie in Rosa'], ['Baby Blue Denim Jacket Women', 'Jeansjacke Damen'], ["Dried Flowers Baby's Breath Bouquet", 'Trockenblumen-Strauss'],
    ['Mini Electric Garlic Chopper USB', 'Mini-Zerkleinerer'], ['Boyfriend Jeans Women High Waist', 'Boyfriend-Jeans'], ['Cowboy Hat Western Straw', 'Strohhut'],
  ];
  ist('Kinderware-Gegenprobe: Farbe «Baby Pink/Blue», «Baby\'s Breath», «Boyfriend», «Cowboy» sind keine Kinderware', KEINE_KINDER.filter(([en, de]) => sperrFall(en, de).gesperrt), []);
  const text = h => `<p>${h}</p>`;
  ist('Kinderware-Gegenprobe im Datenblatt-Text: «Keep out of the reach of children», «Applicable people: women, men, children», «Children\'s Day», «children\'s bedroom», «baby food» sperren NICHT',
    [text('Please keep this product out of the reach of children. Package Contents: Nail polish*1'), text('Applicable people: women, men, children, teenagers, couples, adults, elderly'),
      text('Applicable Holidays: Christmas, Valentine\'s Day, Children’s Day, others'), text('Suitable for study room, bedroom, coffee shop, desk, children\'s bedroom, and other home furnishings'),
      text('You can use it for cooking, baby food, and smoothie drinks. Easy to clean.'), text('Voltage: 18-40 years old buyers prefer black. Warranty: 12 months.')]
      .filter(h => sperrFall('Kitchen Gadget', 'Küchenhelfer', { text: h }).gesperrt), []);
  ist('Kinderware im Datenblatt-Text mit Absicht: Alter unter 13, «designed for kids», «toy for boys & girls», «Target audience: Children», Babywörter sperren',
    [text('Applicable age: 3-8 years old. Material: wood'), text('Adults and children over 6 years old can use this brush'), text('As a teddy bear toy for boys & girls, this lamp is designed for kids to learn'),
      text('Packaging specifications: Bubble wrap Target audience: Children Style: Fashion'), text('Soft blanket for your newborn and infant'), text('Not a toy. Age range: 3')]
      .map(h => sperrFall('Desk Lamp', 'Tischlampe', { text: h }).gesperrt), [true, true, true, true, true, true]);
  ist('kinderWort/kinderImText einzeln: Wörter, Redewendungen und Satzmuster', [kinderWort('Hello Kids'), kinderWort('Baby Pink Dress'), kinderWort('Schnullerkette'), kinderWort('Dog Toy'), kinderImText('Easy for kids to use without making a mess.'), kinderImText('Designed for kids to learn')],
    ['kids', null, 'schnullerkette', null, null, 'designed for kids']);
  ist('Z148: «Perfect for kids and adults» (Erwachsenen-Nähe im selben Satz) ist keine Kinderware, «Perfect for kids.» schon', [kinderImText('Perfect for kids and adults.'), kinderImText('Designed for kids, also suitable for women.'), kinderImText('Perfect for kids.')], [null, null, 'perfect for kids']);
  ist('Z164: Tabak im Datenblatt-Text sperrt («rolling your own cigarettes»), der Zigarettenanzünder-Anschluss im Auto nicht', [text('Ideal for rolling your own cigarettes and tobacco.'), text('Fits the car cigarette lighter socket 12V.')].map(h => sperrFall('Desk Lamp', 'Tischlampe', { text: h }).gesperrt), [true, false]);
  ist('kinderware(): Reihenfolge Titel, CJ-Name, Kategorie, Datenblatt; ohne Treffer null', [kinderware({ titel: 'Kinder-Uhr' }).wo, kinderware({ cjName: 'Kids Watch' }).wo, kinderware({ kategorie: 'Girls Shoes' }).wo, kinderware({ beschreibung: '<p>Age: 5</p>' }).wo, kinderware({ titel: 'Uhr', cjName: 'Watch', kategorie: 'Jewelry > Watches', beschreibung: '<p>Elegant.</p>' })],
    ['Titel', 'CJ-Name', 'CJ-Kategorie', 'Datenblatt', null]);
  ist('FIX.zusammen (Neugeborenen-Spielzeug, «Toys, Kids & Babies») ist seit der Gegenlesung gesperrt — die alte Testannahme «nur die Optionswerte sind das Problem» gilt nicht mehr',
    [fallen(lauf(FIX.zusammen, 'Beruhigendes Kuscheltier')).includes('sperrwoerter')], [true]);

  // ── Heikle Namen: 49 Fälle der Gegenlesung. Durchkommen dürfen NUR die gewollten Ausnahmen (jede mit Begründung).
  const HEIKEL = [
    ['Electric Shock Dog Training Collar Anti Bark', 'Elektro-Erziehungshalsband für Hunde Anti-Bell'], ['Pepper Spray Keychain Self Defense', 'Selbstverteidigungs-Schlüsselanhänger'], ['Self Defense Keychain Alarm 130dB', 'Persönlicher Alarm Schlüsselanhänger 130 dB'],
    ['Stun Gun Flashlight Tactical', 'Taktische Taschenlampe'], ['Brass Knuckles Keychain', 'Schlüsselanhänger aus Metall'], ['Throwing Stars Ninja Shuriken', 'Wurfsterne aus Edelstahl'], ['Airsoft Gun BB Pistol 6mm', 'Softair-Pistole 6 mm'],
    ['Hunting Crossbow Mini Toy', 'Mini-Armbrust'], ['Telescopic Baton Retractable', 'Ausziehbarer Schlagstock'], ['Butterfly Comb Knife Trainer', 'Schmetterlingskamm Übungsmesser'], ['Herb Grinder Metal 4 Layer', 'Gewürzmühle Metall 4-teilig'],
    ['Rolling Tray Smoking Accessories', 'Tablett für Raucherzubehör'], ['Glass Smoking Pipe Handmade', 'Glaspfeife handgefertigt'], ['Mini Hidden Spy Camera Pen WiFi', 'Stift mit Mini-Kamera WLAN'], ['GPS Tracker Magnetic Car Hidden', 'GPS-Tracker magnetisch für Fahrzeuge'],
    ['Signal Jammer 8 Antennas', 'Signalstörer 8 Antennen'], ['Lock Pick Set 24pcs', 'Dietrich-Set 24-teilig'], ['Posture Corrector Back Brace', 'Geradehalter Rücken'], ['Ear Wax Removal Camera Otoscope', 'Ohrenreiniger mit Kamera'],
    ['Blood Oxygen Fingertip Monitor', 'Fingerclip Sauerstoffmessgerät'], ['Digital Thermometer Forehead Non Contact', 'Kontaktloses Stirnthermometer'], ['Hearing Amplifier Rechargeable', 'Hörverstärker wiederaufladbar'], ['Teeth Whitening Kit LED', 'Zahnaufhellungs-Set'],
    ['Breast Enlargement Cream Herbal', 'Brustcreme pflanzlich'], ['Slimming Belly Patch Fat Burning', 'Schlankheits-Bauchpflaster'], ['Hair Growth Serum Minoxidil', 'Haarwuchs-Serum'], ['Erection Delay Spray Men', 'Verzögerungsspray für Männer'],
    ['Silicone Love Doll Torso', 'Torso-Figur aus Silikon'], ['Nipple Clamps Adjustable', 'Brustwarzenklemmen verstellbar'], ['Fireworks Sparkler Candles Birthday', 'Wunderkerzen Geburtstag'], ['Smoke Grenade Photography', 'Rauchgranate für Fotografie'],
    ['Laser Pointer 5000mW Green', 'Laserpointer grün'], ['Handheld Laser Torch Burning', 'Brennlaser Taschenlampe'], ['Nike Air Style Sneakers', 'Sneaker im Stil von Air'], ['Pokemon Pikachu Plush 30cm', 'Pikachu Plüschtier'],
    ['Hello Kitty Style Cat Backpack', 'Katzen-Rucksack'], ['Louis Vuitton Style Wallet', 'Geldbörse im Stil von LV'], ['AirPods Pro Case Cover', 'Hülle für In-Ear-Kopfhörer'], ['Extension Cord 5 Sockets 2m', 'Verlängerungskabel mit 5 Steckdosen'],
    ['Power Strip with USB 4 AC Outlets UK Plug', 'Steckdosenleiste mit USB'], ['Travel Adapter Universal EU US UK AU', 'Reiseadapter Universal'], ['Electric Blanket 220V', 'Heizdecke 220 V'], ['Hair Dryer 110V US Plug', 'Haartrockner 110 V'],
    ['Soldering Iron Station 60W', 'Lötstation 60 W'], ['Mini Fridge Cooler 12V Car', 'Mini-Kühlschrank 12 V Auto'], ['Insulin Cooler Travel Case', 'Kühltasche für Insulin'], ['CBD Hemp Oil Dropper Bottle Empty', 'Tropfflasche leer'],
    ['Nasal Dilator Strips Anti Snoring', 'Nasenpflaster gegen Schnarchen'], ['Anti Snoring Mouthpiece', 'Anti-Schnarch-Schiene'],
  ];
  // Gewollte Ausnahmen: ein Zubehör für fremde Markenware ohne Markennamen im deutschen Titel (AirPods-Hülle), ein Universal-Reiseadapter mit EU, eine 220-V-Heizdecke, eine Lötstation, ein Auto-Kühlschrank mit NEUTRALEM Datenblatt
  // (die Insulin-Kühlbox-Falle fängt der Datenblatt-Text, siehe unten).
  const GEWOLLT = ['AirPods Pro Case Cover', 'Travel Adapter Universal EU US UK AU', 'Electric Blanket 220V', 'Soldering Iron Station 60W', 'Mini Fridge Cooler 12V Car'];
  ist(`Sperrwörter: von 49 heiklen Namen kommen nur die 5 gewollten Ausnahmen durch (vorher 27 von 49)`, HEIKEL.filter(([en, de]) => !sperrFall(en, de).gesperrt).map(([en]) => en).sort(), [...GEWOLLT].sort());
  ist('Sperrwörter: der Fundort steht im Grund (Zusatzliste, Waffen-Wort, Tabak)', [sperrFall('Brass Knuckles Keychain', 'Schlüsselanhänger aus Metall').grund.includes('«brass knuckles»'), sperrFall('Herb Grinder Metal 4 Layer', 'Gewürzmühle').grund.includes('«herb grinder»')], [true, true]);
  // Gegenproben der Zusatzliste: harmlose Waren mit ähnlichen Wörtern
  const HARMLOS = [
    ['Smart Watch Heart Rate Blood Oxygen Sleep Monitor Bracelet', 'Smartwatch mit Herzfrequenz'], ['Coffee Grinder Electric Burr Mill', 'Kaffeemühle'], ['Pepper Grinder Manual Stainless', 'Pfeffermühle'],
    ['Jam Jar Set 12pcs Glass Preserving', 'Einmachgläser'], ['LED Strip Light 5V USB 5m', 'LED-Streifen USB'], ['Cat Interactive Toy Weight Loss Exercise', 'Katzenspielzeug'], ['Weight Tracker Notebook Planner', 'Notizbuch'],
    ['Foam Roller Massage Muscle Recovery', 'Faszienrolle'], ['Orthopedic Memory Foam Pillow', 'Nackenkissen'], ['Hidden Storage Box Book Safe', 'Buchversteck'], ['Bluetooth Tracker Key Finder', 'Schlüsselfinder'],
    ['Laser Level Cross Line Self Leveling', 'Kreuzlinienlaser'], ['Laser Engraving Machine Mini', 'Lasergravierer'], ['Electric Safety Shock Absorber Foam', 'Stossdämpfer'],
  ];
  ist('Sperrwörter-Gegenprobe: Smartwatch mit Blutsauerstoff-Sensor, Kaffee-/Pfeffermühle, Einmachglas, Katzenspielzeug, Laser-Wasserwaage/-Gravierer, Hidden Storage, Tracker sperren NICHT', HARMLOS.filter(([en, de]) => sperrFall(en, de).gesperrt).map(([en]) => en), []);

  // ── Datenblatt-Text: Name und Titel neutral, der Text verrät es («Mini-Kühlschrank» war eine Insulin-Kühlbox, STAND-ARCHIV 04.10.2026)
  const insulin = sperrFall('Mini Fridge Cooler Box 12V Portable', 'Mini-Kühlbox 12 V tragbar', { text: '<p>Portable insulin cooler box for diabetics, keeps medicine cold, 12V car and 220V home.</p>' });
  ist('Datenblatt-Text: die Insulin-Kühlbox mit neutralem Namen und Titel wird gesperrt, mit Grund «Datenblatt nennt heikle Ware»', [insulin.gesperrt, insulin.grund.includes('Datenblatt nennt heikle Ware («insulin»)')], [true, true]);
  ist('Datenblatt-Text: Erwachsenen-Ware («Category: Sex toys» im Text eines Damen-Gürtels), Tabak-Zubehör, Pyro, Elektroreizgerät werden gelesen',
    [sperrFall('Leather Belt Women Chain', 'Damen-Gürtel mit Kette', { text: '<p>Material: PU Category: Sex toys Note: Asian sizes</p>' }).grund.includes('Datenblatt nennt Erwachsenen-Ware («Sex»)'),
      sperrFall('Metal Tray Set', 'Metalltablett', { text: '<p>Perfect for your rolling tray and herb grinder setup.</p>' }).gesperrt,
      sperrFall('Party Candle', 'Kerze', { text: '<p>A sparkler effect with a smoke grenade finish.</p>' }).gesperrt,
      sperrFall('Dog Collar Nylon', 'Hundehalsband', { text: '<p>Includes an electric shock collar remote.</p>' }).gesperrt], [true, true, true, true]);
  ist('Datenblatt-Text-Gegenprobe: «contact lenses» beim Reinigungsgerät, «laser» und «light» an verschiedenen Stellen (Rohrschelle), «electric shock» in der Sicherheitsanleitung, «self-defense» als Sportart sperren NICHT',
    ['<p>Suitable for cleaning glasses, contact lenses, jewelry, watches, makeup tools.</p>', '<p>Aluminum alloy; laser cutting process. Product light weight. Colour: Black.</p>', '<p>Warning: to prevent electric shock do not open the housing.</p>',
      '<p>Applicable sports: boxing, running, self-defense, fitness.</p>', '<p>Smart watch with heart rate and blood oxygen monitoring.</p>'].filter(h => sperrFall('Cleaning Gadget', 'Reinigungsgerät', { text: h }).gesperrt), []);
  ist('heikelImText: Laser nur in Nachbarschaft von Pointer/Taschenlampe; Medizin-Treffer; contact lens ausgenommen', [heikelImText('A green laser pointer for presentations'), heikelImText('Laser cutting. Light weight.'), heikelImText('cleaning contact lenses'), heikelImText('Measures blood pressure monitor upper arm')],
    ['Laser-Zeiger/-Lampe', null, null, 'blood pressure monitor']);
  ist('zusatzSperrwort: Namen und Text (Text lässt «self-defense» und «ear wax» aus)', [zusatzSperrwort('Self Defense Alarm'), zusatzSperrwort('Self Defense Alarm', { textModus: true }), zusatzSperrwort('Ear Wax Spoon'), zusatzSperrwort('Ear Wax Spoon', { textModus: true }), zusatzSperrwort('Otoscope Camera', { textModus: true })], ['self defense', null, 'ear wax', null, 'otoscope']);
  ist('Steckdosen-Ware englisch: «Extension Cord» wird erkannt, ein Kopfhörer-«Cord Reel» nicht', [STECKDOSE_EN_RE.test('Extension Cord 5 Sockets 2m'), STECKDOSE_EN_RE.test('Cable Reel Extension 10m'), STECKDOSE_EN_RE.test('Donut Silicone Suction Cup Cord Reel Silicone'), STECKDOSE_EN_RE.test('Plug-in Timer Switch Digital')], [true, true, false, true]);
  ist('PYRO: «Fireworks»/«LED Fireworks Toy» ist heikle Ware (Feuerwerk steht in der Liste)', [heikelWort('LED Fireworks Toy'), heikelWort('Fireworks'), heikelWort('Feuerwerk Set')].map(x => !!x), [true, true, true]);

  // ── Fremdstecker im NAMEN (Gegenlesung: «Heater USA Standard», «Fan 110-240V US», «Charger Brazil/India Plug» blieben unerkannt)
  const NAMEN_FREMD = ['Hair Dryer 1800W AU Plug', 'Hair Dryer 1800W US-Plug', 'Electric Heater UK Plug 13A', 'Heater 110V US Plug', 'Heater USA Standard', 'Kettle British Standard Plug', 'Kettle Australian Plug Type I', 'Fan 110-240V US', 'Fan 100-240V US Plug', 'Charger Brazil Plug', 'Charger India Plug'];
  const NAMEN_OK = ['Charger UK/US/EU/AU Universal', 'Hair Straightener 220V EU Plug', 'Travel Charger 110-240V', 'Dual Voltage 110V/220V Hair Dryer EU', 'Fan 100-240V Wide Voltage', 'Bluetooth Speaker American Football Theme'];
  ist('Fremdstecker im Namen: 11 Schreibweisen erkannt, EU-/Weitbereichs-/Universal-Namen nicht', [NAMEN_FREMD.filter(n => !fremdsteckerImNamen(n)), NAMEN_OK.filter(n => fremdsteckerImNamen(n))], [[], []]);

  // ── Fremdstecker im BESCHREIBUNGSTEXT (echtes Probe-Datenblatt der Lichterkette: «[96 lights with US plug]», nur eine Variante hiess «-EU»)
  const lichter = (keys, beschr) => ({ pid: '0E413843-30B2-47E9-A62F-4B81BAF3CD07', productNameEn: 'LED String Lights Christmas Fairy', productSku: 'CJLEDS0000001', productKeyEn: 'Color-Size', categoryName: 'Home Improvement > Lighting > String Lights', status: '3', productType: 'ORDINARY_PRODUCT', isTestProduct: false,
    bigImage: 'https://cf.cjdropshipping.com/l/1.jpg', productImage: JSON.stringify([1, 2, 3, 4].map(i => `https://cf.cjdropshipping.com/l/${i}.jpg`)), description: beschr,
    variants: keys.map((k, i) => ({ vid: `LV-${i}`, variantSku: `CJLEDS0000001-${i}`, variantKey: k, variantImage: `https://cf.cjdropshipping.com/l/v${i}.jpg`, variantWeight: 200 + i, variantSellPrice: 5 + i })) });
  const steckerTor = r => tor(r, 'stecker');
  const rA = lauf(lichter(['White 1.5x1.5M', 'White 3x2M', 'White 10x8M 2000Lamp-EU'], '1.5 m × 1.5 m [96 lights with US plug], 3 m × 2 m [192 lights with US plug]'), 'LED-Lichterkette');
  ist('Fremdstecker im Text («with US plug»), aber nicht jede Variante nennt ihren Stecker: Tor «stecker» fällt, zurückgestellt (7 Tage), Eingabe fehlt',
    [steckerTor(rA).ok, /Fremdstecker im Beschreibungstext/.test(steckerTor(rA).grund), rA.frist, rA.eingabe, /^zurückgestellt: stecker: /.test(rA.ledgerGrund)], [false, true, 'zurueckgestellt', null, true]);
  const rB = lauf(lichter(['White-EU', 'Black-EU', 'White-US'], 'Plug type: EU plug, US plug'), 'LED-Lichterkette');
  ist('Gegenprobe: nennt JEDE Variante ihren Stecker (EU, EU, US), entscheidet der Schlüssel: die US-Variante fällt weg, das Tor besteht', [steckerTor(rB).ok, rB.ausgelassen.stecker.length, rB.varianten], [true, 1, 2]);
  const rC = lauf(lichter(['White 5m', 'White 10m'], 'EU plug, 230V. Length: 5 m or 10 m.'), 'LED-Lichterkette');
  ist('Gegenprobe: ein EU-Stecker im Text sperrt nicht', steckerTor(rC).ok, true);
  const rD = lauf(lichter(['Black', 'White'], 'Input: AC 100-240V wide voltage. 110V/220V dual voltage.'), 'Netzteil');
  ist('Gegenprobe: Weitbereichs- und Umschaltspannung (100-240V, 110V/220V) im Text sperren nicht', steckerTor(rD).ok, true);
  const rE = lauf(lichter(['Black', 'White'], 'Voltage: AC 110V only. Not suitable for 230V.'), 'Netzteil');
  ist('Eine reine 110-V-Angabe im Text sperrt (Schweiz 230 V)', [steckerTor(rE).ok, /110/.test(steckerTor(rE).grund)], [false, true]);
  ist('Schraubenbit «Japanese standard» ohne Stecker-/Spannungswort in der Zeile sperrt NICHT, mit «Plug: Japanese standard» schon',
    [fremdsteckerImText('Hexagon shank. Japanese standard, 6.35 mm'), fremdsteckerImText('Plug: Japanese standard'), fremdsteckerImText('Voltage 110V Japanese standard')].map(x => !!x), [false, true, true]);
  ist('Z177: «Plug type: US» / «Plug: AU» (Steckertyp-Angabe ohne weiteres Steckerwort) sperrt, «Plug type: EU» nicht', [fremdsteckerImText('Plug type: US'), fremdsteckerImText('Plug: AU'), fremdsteckerImText('Plug type: EU')].map(x => !!x), [true, true, false]);
  ist('steckerKontextVon: Optionsname oder Produktname nennt den Stecker', [steckerKontextVon({ productKeyEn: 'Color-Plug Type' }), steckerKontextVon({ productNameEn: 'Hair Dryer with EU Plug' }), steckerKontextVon({ productKeyEn: 'Color-Size', productNameEn: 'Brush Set' }), steckerKontextVon({})], [true, true, false, false]);
  // «Type A/B/G» als Steckertyp NUR mit Steckerkontext: sonst sind es die Ausführungen einer Bürste
  const typen = ctxKey => lauf(ableiten(lichter(['Type A', 'Type B', 'Type C'], '<p>Text.</p>'), k => { k.productKeyEn = ctxKey; }), 'Haartrockner');
  ist('Type A/B/C: mit Steckerkontext («Plug Type») fallen A und B weg (US/UK/AU), C (Euro) bleibt; ohne Kontext («Style») bleiben alle drei', [typen('Plug Type').ausgelassen.stecker.length, typen('Plug Type').varianten, typen('Style').ausgelassen.stecker.length, typen('Style').varianten], [2, 1, 0, 3]);
}

// ── Endtore «eingabe-schema» und «eingabe-konsistent» (Mutanten T28/T29 überlebten): sie sind die letzte Sicherung vor der Eingabe und lösen nur bei Werten aus, die kein CJ-Datenblatt trägt
{
  const f = ableiten(FIX.einzel, k => { k.variants[0].variantWeight = Infinity; });
  const r = lauf(f, 'Wattestäbchen im Karton');
  ist('Endtor eingabe-schema: ein Gewicht, das kein endlicher Zahlenwert ist (Float erwartet), lässt das Tor fallen — und es gibt KEINE Eingabe (Mutant V26: «Eingabe auch bei Fehler»)', [fallen(r), r.ok, r.eingabe, /weight/.test(tor(r, 'eingabe-schema').grund)], [['eingabe-schema'], false, null, true]);
  const gut = lauf(ableiten(FIX.einzel, () => {}), 'Wattestäbchen im Karton');
  ist('Gegenprobe: dasselbe Datenblatt mit endlichem Gewicht besteht und liefert die Eingabe', [gut.ok, gut.eingabe !== null, tor(gut, 'eingabe-schema').ok, tor(gut, 'eingabe-konsistent').ok], [true, true, true, true]);
  // eingabe-konsistent: ein Optionswert über 255 Zeichen (Shopify lehnt ihn ab) — kommt durch jede Übersetzung (ctx.uebersetzung) durch, bis die Konsistenzprüfung ihn sieht
  const keys = FIX.unsicher.variants.map(v => v.variantKey);
  const lang = Object.fromEntries(keys.map((k, i) => [k, String.fromCharCode(65 + i).repeat(300)]));
  const rl = lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben', { uebersetzung: lang });
  ist('Endtor eingabe-konsistent: Optionswerte über 255 Zeichen lassen das Tor fallen (alle anderen Tore bestehen), keine Eingabe', [fallen(rl), rl.eingabe, /255 Zeichen/.test(tor(rl, 'eingabe-konsistent').grund)], [['eingabe-konsistent'], null, true]);
  const kurz = lauf(FIX.unsicher, 'Make-up-Pinsel in Pastellfarben', { uebersetzung: Object.fromEntries(keys.map((k, i) => [k, ['Limette', 'Pfirsich', 'Wassermelonenrot', 'Avocado'][i] ?? 'Weiss'])) });
  ist('Gegenprobe: kurze Übersetzungen bestehen beide Endtore', [tor(kurz, 'eingabe-schema').ok, tor(kurz, 'eingabe-konsistent').ok], [true, true]);
}

// ───────────────────────── Die letzten zwei Tore (eingabe-schema, eingabe-konsistent) sind über CJ-Daten erreichbar ─────────────────────────
// Gegenlesung 27.10.2026, Mutationen T28/T29/V26 blieben grün: kein Test brachte den Plan bis an diese Tore. Frühere Tore brechen ab (abbruch), nur Daten, die sie passieren, kommen an.
{
  const gewicht = lauf(ableiten(FIX.mode, k => { k.variants[0].variantWeight = '1e999'; }), T_MODE, MODE);
  ist('T28: ein Gewicht, das als Zahl unendlich wird («1e999»), lässt das Tor eingabe-schema fallen und ist das EINZIGE gefallene Tor', [fallen(gewicht), /weight\.value/.test(tor(gewicht, 'eingabe-schema').grund)], [['eingabe-schema'], true]);
  ist('V26: ein nicht bestandener Plan gibt KEINE Eingabe heraus (ok false, eingabe null) — auch wenn sie schon gebaut war', [gewicht.ok, gewicht.eingabe, gewicht.frist], [false, null, 'vorlaeufig']);
  const lang = 'Gross'.repeat(60);
  const wert = lauf(ableiten(FIX.mode, k => { k.variants[0].variantKey = 'Black-' + 'X'.repeat(300); }), T_MODE, { ...MODE, uebersetzung: { ['X'.repeat(300)]: lang } });
  ist('T29: ein (übersetzter) Optionswert über 255 Zeichen lässt das Tor eingabe-konsistent fallen und ist das EINZIGE gefallene Tor', [fallen(wert), /255 Zeichen/.test(tor(wert, 'eingabe-konsistent').grund), wert.eingabe], [['eingabe-konsistent'], true, null]);
  ist('Gegenprobe: dieselben Daten ohne Gewichtsfehler und mit kurzem Wert bestehen beide Tore und liefern die Eingabe', [tor(lauf(FIX.mode, T_MODE, MODE), 'eingabe-schema').ok, tor(lauf(FIX.mode, T_MODE, MODE), 'eingabe-konsistent').ok, !!lauf(FIX.mode, T_MODE, MODE).eingabe], [true, true, true]);
}

// ───────────────────────── GraphQL und API ─────────────────────────
ist('API_VERSION ist 2026-01 oder neuer (unterstützt: 2026-01, 2026-04, 2026-07, 2026-10)', /^20(2[6-9]|[3-9]\d)-(01|04|07|10)$/.test(API_VERSION), true);
ist('Mutation: productSet mit ProductSetInput, optionalem identifier, synchron', [/productSet\(input: \$input, identifier: \$identifier, synchronous: true\)/.test(PRODUCT_SET_MUTATION), /\$input: ProductSetInput!/.test(PRODUCT_SET_MUTATION), /\$identifier: ProductSetIdentifiers\)/.test(PRODUCT_SET_MUTATION)], [true, true, true]);
ist('Mutation: liest userErrors und Medienstatus zurück (nicht dem Schreiben glauben)', [/userErrors \{ field message code \}/.test(PRODUCT_SET_MUTATION), /media\(first: 100\) \{ nodes \{ id status \} \}/.test(PRODUCT_SET_MUTATION)], [true, true]);
ist('Mutation: Klammern ausgeglichen', [...PRODUCT_SET_MUTATION].reduce((n, c) => n + (c === '{' ? 1 : c === '}' ? -1 : 0), 0), 0);

// ───────────────────────── Endprüfung 27.10.2026: Lücken der Mutationsprobe (jede Prüfung ist rot, wenn ihr Wort aus der Liste fällt) ─────────────────────────
// P09: die Mehrzahl «babies» (Foto-Requisiten, Strampler) ist Kinderware; «babys?» allein erkennt sie nicht
ist('P09 «Babies» (Mehrzahl) im Namen gesperrt', kinderWort('Cute Babies Photo Props'), 'babies');
ist('P09 Gegenprobe: die Farbe «Baby Pink» und «Baby\'s Breath» bleiben frei', [kinderWort('Baby Pink Hoodie Women'), kinderWort("Baby's Breath Dried Flowers")], [null, null]);
// P28: «Oximeter» ist allein ein Medizinprodukt (nicht erst mit «SpO2» oder «Blood Oxygen»)
ist('P28 Oximeter allein gesperrt', zusatzSperrwort('Fingertip Oximeter Monitor SpO2'), 'oximeter');
ist('P28 Oximeter ohne weiteres Merkmal ebenfalls gesperrt', zusatzSperrwort('Fingertip Oximeter'), 'oximeter');
// P29: Anti-Bark-Halsband (Stromschlag-/Ultraschall-Erziehungsgerät) ist heikle Ware
ist('P29 Anti-Bark-Halsband gesperrt', zusatzSperrwort('Anti Bark Collar for Dogs'), 'anti bark collar');
// P30: «infant» im Fliesstext des Datenblatts weist auf Kinderware hin
ist('P30 «infant» im Datenblatt-Text gesperrt', kinderImText('Soft cotton for infant skin'), 'infant');

// ───────────────────────── Reihentest über alle echten Datenblätter (nur auf Wunsch) ─────────────────────────
const CACHE = process.env.GRIND_PLAN_CACHE;
if (CACHE && existsSync(CACHE)) {
  let n = 0, gut = 0, verletzt = 0, ausnahmen = 0;
  const gate = {};
  for (const f of readdirSync(CACHE)) {
    let d; try { d = JSON.parse(readFileSync(`${CACHE}/${f}`, 'utf8')); } catch { continue; }
    n++;
    let r;
    try { r = planeNeu(d, { ...BASIS, titel: String(d.productNameEn || 'x').slice(0, 60), titelEnglischOk: true, googleMinTiefe: 1, ...MODE, tags: [] }); } catch (e) { ausnahmen++; continue; }
    for (const t of r.tore) if (t.ok === false) gate[t.name] = (gate[t.name] || 0) + 1;
    if (!r.ok) continue;
    gut++;
    const x = r.eingabe, q = new Set(d.variants.map(v => v.variantSku));
    if (x.status !== 'DRAFT' || !x.variants.every(v => q.has(v.inventoryItem.sku)) || x.variants.length > MAX_VARIANTEN || schemaPruefen(x).length || konsistenzPruefen(x).length
      || (x.variants.length > 1 && x.productOptions.some(o => o.values.length < 2))) verletzt++;
  }
  console.log(`Reihentest ${CACHE}: ${n} Datenblätter, ${gut} ok, ${ausnahmen} Ausnahmen, ${verletzt} verletzte Invarianten; Tore, die gefallen sind: ${JSON.stringify(gate)}`);
  ist('Reihentest: keine Ausnahme, keine verletzte Invariante', [ausnahmen, verletzt], [0, 0]);
} else console.log('Reihentest über alle echten Datenblätter übersprungen (GRIND_PLAN_CACHE nicht gesetzt)');

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
