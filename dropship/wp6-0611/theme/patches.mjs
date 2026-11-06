// WP6 Teil C (06.11.2026): Warenkorb-Miniatur aus der Zeilen-Eigenschaft «_vorschau» in snippets/cart-products.liquid. Rein (kein Netz, kein Shopify):
// anwenden(text, opt) / zuruecknehmen(text, opt) / DATEI / MD5_VOR / MARKE. Belege, Messwerte und Rücknahme: dropship/wp6-0611/theme/README.md.
//
// Was sich ändert (vier Ankerstellen, je genau einmal im Ausgangsstand):
//   1. direkt hinter {% for item in cart.items %} (ohne Zeilenumbruch dazwischen, damit die Ausgabe Byte für Byte gleich bleibt) ein {% liquid %}-Block, der
//      aus der Eigenschaft «_vorschau» die Variable lx_vs_url ableitet: leer, ausser die Adresse besteht ALLE Prüfungen (https, Host res.cloudinary.com, Pfad
//      <cloud>/image/upload/<Datei>, höchstens 300 Zeichen, nur A-Z a-z 0-9 - _ . ~ : , /, kein «..», optional feste Cloud).
//   2. {% if item.image -%} wird {% if item.image or lx_vs_url != '' -%}
//   3. im bestehenden {% liquid %}-Block der Miniatur: ist lx_vs_url gesetzt, ist das Seitenverhältnis 1 (die Vorschau ist 800 × 800).
//   4. die Bildausgabe: bei gesetzter lx_vs_url ein <img> mit der Vorschau (Rückfall auf das Variantenbild per onerror), sonst GENAU die bisherige Ausgabe.
// Nicht geändert: die Ausgabe der Eigenschaften (Zeilen mit führendem Unterstrich blendet das Theme schon heute aus, die Cloudinary-Druckdatei erscheint schon
// heute als kleines Bild mit «Dein Entwurf ansehen» statt als Adresse), Preise, Mengen, Entfernen, CSS, Skripte.
export const DATEI = 'snippets/cart-products.liquid';
/** md5 des Live-Snippets vor dem Eingriff (GEMESSEN 06.11.2026 über die Prüfsumme der Theme-API, 30 195 Byte, MAIN-Theme 213013037447, zuletzt geändert 02.11.2026). */
export const MD5_VOR = '86a84bf9ff1862b97025bd1a841b8080';
export const MARKE = 'lx-vorschau-0611';
export const CLOUD_MUSTER = /^[A-Za-z0-9_-]{1,64}$/;

/** Prüft die optionale feste Cloud (Hartung); leer = jede Cloud unter res.cloudinary.com. Wirft bei ungültigem Namen. */
export function pruefeCloud(cloud) {
  if (cloud === undefined || cloud === null || cloud === '') return '';
  if (typeof cloud !== 'string' || !CLOUD_MUSTER.test(cloud)) throw new Error('VORSCHAU_CLOUD ist kein gültiger Cloud-Name (erlaubt: A-Z a-z 0-9 _ -, höchstens 64 Zeichen): ' + JSON.stringify(cloud));
  return cloud;
}

export const ERLAUBT = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~:,/';
export const MAX_LAENGE = 300;

const rechnen = (cloud) => `{% liquid
                  # ${MARKE} (WP6): Adresse des Vorschau-Bildes dieser Zeile (Eigenschaft _vorschau) oder leer.
                  # Gilt nur: https, Host res.cloudinary.com, Pfad <cloud>/image/upload/<Datei>, höchstens ${MAX_LAENGE} Zeichen,
                  # nur A-Z a-z 0-9 - _ . ~ : , / und kein "..". Alles andere: leer, dann bleibt das Variantenbild.
                  assign lx_vs_url = ''
                  assign lx_vs_cloud = '${cloud}'
                  assign lx_vs_erlaubt = '${ERLAUBT}'
                  for lx_vs_p in item.properties
                    if lx_vs_p.first == '_vorschau'
                      assign lx_vs_wert = lx_vs_p.last
                      assign lx_vs_gut = true
                      if lx_vs_wert.size > ${MAX_LAENGE} or lx_vs_wert contains '..'
                        assign lx_vs_gut = false
                      endif
                      if lx_vs_gut
                        assign lx_vs_teile = lx_vs_wert | split: '/'
                        if lx_vs_teile.size < 7 or lx_vs_teile[0] != 'https:' or lx_vs_teile[1] != '' or lx_vs_teile[2] != 'res.cloudinary.com' or lx_vs_teile[3] == '' or lx_vs_teile[4] != 'image' or lx_vs_teile[5] != 'upload'
                          assign lx_vs_gut = false
                        endif
                      endif
                      if lx_vs_gut and lx_vs_cloud != ''
                        if lx_vs_teile[3] != lx_vs_cloud
                          assign lx_vs_gut = false
                        endif
                      endif
                      if lx_vs_gut
                        assign lx_vs_zeichen = lx_vs_wert | split: ''
                        for lx_vs_z in lx_vs_zeichen
                          unless lx_vs_erlaubt contains lx_vs_z
                            assign lx_vs_gut = false
                            break
                          endunless
                        endfor
                      endif
                      if lx_vs_gut
                        assign lx_vs_url = lx_vs_wert
                      endif
                      break
                    endif
                  endfor
                %}`;

const BILD = `{%- if lx_vs_url != '' -%}
                        <img
                          src="{{ lx_vs_url | escape }}"
                          alt="{{ item.product.title | escape }}"
                          class="cart-items__media-image cart-items__media-image--vorschau border-style"
                          style="{{ border_override | escape }}"
                          width="800"
                          height="800"
                          loading="lazy"
                          decoding="async"
                          data-lx-vorschau="1"
                          {%- if item.image %}
                          data-lx-fallback="{{ item.image | image_url: width: 250 | escape }}"
                          onerror="this.onerror=null;var f=this.getAttribute('data-lx-fallback');if(f){this.src=f;this.removeAttribute('data-lx-vorschau')}"
                          {%- endif %}
                        >
                      {%- else -%}
                      {%- liquid
                        echo item.image | image_url: width: 250 | image_tag: class: 'cart-items__media-image border-style', style: border_override
                      -%}
                      {%- endif -%}`;

// Ankerstellen im Ausgangsstand und ihr Ersatz (Reihenfolge = Reihenfolge im Snippet)
const A1 = `{% for item in cart.items %}\n              <tr\n                role="row"`;
const A2 = `{% if item.image -%}`;
const A3 = `                        assign ratio = item.image.aspect_ratio\n                      endif\n                    %}`;
const A4 = `{%- liquid\n                        echo item.image | image_url: width: 250 | image_tag: class: 'cart-items__media-image border-style', style: border_override\n                      -%}`;
const N2 = `{% if item.image or lx_vs_url != '' -%}`;
const N3 = `                        assign ratio = item.image.aspect_ratio\n                      endif\n                      if lx_vs_url != ''\n                        assign ratio = 1\n                      endif\n                    %}`;
const n1 = (cloud) => `{% for item in cart.items %}${rechnen(cloud)}\n              <tr\n                role="row"`;

const zaehle = (text, anker) => text.split(anker).length - 1;
function genau1(text, anker, name) {
  const n = zaehle(text, anker);
  if (n !== 1) throw new Error(`Anker «${name}» kommt ${n}× vor (erwartet 1×)`);
}

/** Ausgangsstand -> neuer Stand. Wirft, wenn ein Anker fehlt oder doppelt ist, der Eingriff schon drinsteckt oder die Cloud ungültig ist. */
export function anwenden(text, opt = {}) {
  const cloud = pruefeCloud(opt.cloud);
  if (text.includes(MARKE) || text.includes('lx_vs_url')) throw new Error('Eingriff steckt schon im Snippet');
  genau1(text, A1, 'for'); genau1(text, A2, 'if-image'); genau1(text, A3, 'ratio'); genau1(text, A4, 'bild');
  let t = text.replace(A1, () => n1(cloud));
  t = t.replace(A2, () => N2);
  t = t.replace(A3, () => N3);
  t = t.replace(A4, () => BILD);
  return t;
}

/** Umkehrung: setzt die vier Stellen auf den Ausgangsstand zurück. Wirft, wenn der Stand nicht genau dem eingespielten entspricht. */
export function zuruecknehmen(text, opt = {}) {
  const cloud = pruefeCloud(opt.cloud);
  let t = text;
  for (const [mit, ohne, name] of [[n1(cloud), A1, 'for'], [N2, A2, 'if-image'], [N3, A3, 'ratio'], [BILD, A4, 'bild']]) {
    const n = zaehle(t, mit);
    if (n !== 1) throw new Error(`Baustein «${name}» kommt ${n}× vor (erwartet 1×): Snippet entspricht nicht dem eingespielten Stand`);
    t = t.replace(mit, () => ohne);
  }
  return t;
}
