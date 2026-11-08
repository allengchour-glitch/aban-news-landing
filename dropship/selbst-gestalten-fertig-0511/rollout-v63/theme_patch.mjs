/**
 * Rein lokale, deterministische Theme-Transformation fuer den begrenzten v6.3-Rollout.
 *
 * Diese Datei schreibt weder Shopify noch Printful. Sie ersetzt nur den exakt
 * belegten v5-Loaderblock. Jede unbekannte Ausgangslage bricht ab.
 */

export const MARKER = 'lspod-v63-rollout-20261108';

export const ERWARTETER_BLOCK = `    {%- if request.page_type == 'product' and product.description contains 'lspod-designer' -%}
      <script src="{{ 'lspod-designer-v5-safe.js' | asset_url }}" defer></script>
    {%- endif -%}`;

const anzahl = (text, needle) => text.split(needle).length - 1;

function scope(allowlist) {
  if (!allowlist || allowlist.schema !== 1 || !Array.isArray(allowlist.products)) {
    throw new Error('V63_ALLOWLIST_INVALID: Schema oder Produktliste fehlt');
  }
  if (allowlist.products.length < 1) throw new Error('V63_ALLOWLIST_INVALID: Produktliste ist leer');
  const seenHandles = new Set();
  const seenAssets = new Set();
  return allowlist.products.map((product) => {
    const handle = String(product.handle || '');
    const asset = String(product.asset || '');
    const previewAsset = product.previewAsset == null || product.previewAsset === '' ? null : String(product.previewAsset);
    if (product.status !== 'ACTIVE') throw new Error(`V63_ALLOWLIST_INVALID: ${handle || '(ohne Handle)'} ist nicht ACTIVE`);
    // Shopify-Handles koennen bestehende Unicode-Zeichen behalten (im aktuellen
    // Katalog z. B. iPhone®). Erlaubt sind nur Buchstaben, Zahlen, kombinierende
    // Zeichen und die von Shopify belegten Trenner. Quotes, Leerraum, Slashes
    // und Liquid-/HTML-Zeichen bleiben ausgeschlossen.
    if (!/^[\p{L}\p{N}][\p{L}\p{N}\p{M}®._-]*$/u.test(handle)) {
      throw new Error(`V63_ALLOWLIST_INVALID: ungueltiger Handle ${JSON.stringify(handle)}`);
    }
    if (!/^[a-z0-9][a-z0-9._-]*\.json$/.test(asset)) throw new Error(`V63_ALLOWLIST_INVALID: ungueltiges Asset ${JSON.stringify(asset)}`);
    if (previewAsset && !/^[a-z0-9][a-z0-9._-]*\.json$/.test(previewAsset)) {
      throw new Error(`V63_ALLOWLIST_INVALID: ungueltiges Vorschau-Asset ${JSON.stringify(previewAsset)}`);
    }
    if (seenHandles.has(handle)) throw new Error(`V63_ALLOWLIST_INVALID: doppelter Handle ${handle}`);
    if (seenAssets.has(asset)) throw new Error(`V63_ALLOWLIST_INVALID: doppeltes Asset ${asset}`);
    seenHandles.add(handle);
    seenAssets.add(asset);
    if (previewAsset && seenAssets.has(previewAsset)) throw new Error(`V63_ALLOWLIST_INVALID: doppeltes Asset ${previewAsset}`);
    if (previewAsset) seenAssets.add(previewAsset);
    return { handle, asset, previewAsset };
  });
}

/** Baut den Liquid-Block. Die alte Produktbeschreibung bleibt unveraendert; nur
 * genau ein Legacy-Container wird zur v6-Klasse hochgestuft. Bei 0 oder mehr als
 * 1 Containern startet v6 absichtlich nicht. */
export function rolloutBlock(allowlist) {
  const products = scope(allowlist);
  const cases = products.map(({ handle, asset, previewAsset }) =>
    `        {%- when '${handle}' -%}\n          {%- assign lspod_v63_karte = '${asset}' -%}` +
    (previewAsset ? `\n          {%- assign lspod_v63_vorschau = '${previewAsset}' -%}` : '')).join('\n');
  return `    {%- if request.page_type == 'product' -%}
      {%- comment -%} ${MARKER}: exakt erlaubter ACTIVE-Produkte-Scope; Produktprojektion nur mit belegtem Vorschau-Asset {%- endcomment -%}
      {%- assign lspod_v63_karte = '' -%}
      {%- assign lspod_v63_vorschau = '' -%}
      {%- case product.handle -%}
${cases}
      {%- endcase -%}
      {%- if lspod_v63_karte != blank -%}
        <script>
      (function () {
        'use strict';
        window.__lspodDesignerLoaded = true;
        window.__lspodV63Blockieren = function (grund) {
          document.documentElement.setAttribute('data-lspod-v63-error', String(grund || 'unbekannt'));
          function istWarenkorbForm(form) {
            return form && form.tagName === 'FORM' && /\\/cart\\/add(?:[/?#]|$)/.test(form.getAttribute('action') || '');
          }
          function sperren(form) {
            if (!istWarenkorbForm(form)) return;
            form.setAttribute('data-lspod-v63-blockiert', '1');
            var knoepfe = form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
            for (var i = 0; i < knoepfe.length; i += 1) {
              knoepfe[i].disabled = true;
              knoepfe[i].setAttribute('aria-disabled', 'true');
            }
          }
          var formen = document.querySelectorAll('form[action]');
          for (var i = 0; i < formen.length; i += 1) sperren(formen[i]);
          if (!window.__lspodV63CartSperre) {
            window.__lspodV63CartSperre = true;
            document.addEventListener('submit', function (ereignis) {
              if (!istWarenkorbForm(ereignis.target)) return;
              ereignis.preventDefault();
              ereignis.stopImmediatePropagation();
              sperren(ereignis.target);
            }, true);
            document.addEventListener('click', function (ereignis) {
              var ziel = ereignis.target;
              while (ziel && ziel !== document && ziel.tagName !== 'FORM') ziel = ziel.parentNode;
              if (!istWarenkorbForm(ziel)) return;
              ereignis.preventDefault();
              ereignis.stopImmediatePropagation();
              sperren(ziel);
            }, true);
          }
          if (!document.getElementById('lspod-v63-blocker')) {
            var blocker = document.createElement('div');
            blocker.id = 'lspod-v63-blocker';
            blocker.setAttribute('role', 'alert');
            blocker.style.cssText = 'margin:16px 0;padding:14px;border:1px solid #8b5e3c;background:#fff8f1;color:#2b211b;font:600 14px/1.45 sans-serif';
            blocker.textContent = 'Gestalten ist derzeit nicht sicher verfügbar. Dieses Produkt kann ohne geprüfte Druckdaten nicht bestellt werden. Bitte lade die Seite neu.';
            var ziel = document.querySelector('main') || document.body;
            if (ziel) ziel.insertBefore(blocker, ziel.firstChild);
          }
        };
        function lspodV63Starten() {
          var knoten = document.querySelectorAll('.lspod-designer');
          if (knoten.length !== 1) {
            window.__lspodV63Blockieren('container-count-' + knoten.length);
            return;
          }
          var editor = knoten[0];
          editor.classList.remove('lspod-designer');
          editor.classList.add('lspod-designer-v6');
          editor.setAttribute('data-karte-pflicht', '1');
          editor.setAttribute('data-karte-url', {{ lspod_v63_karte | asset_url | json }});
          editor.setAttribute('data-product-title', {{ product.title | json }});
          editor.removeAttribute('data-vorschau');
          editor.removeAttribute('data-vorschau-url');
          var eingebettet = editor.querySelectorAll('#lspod-vorschau');
          for (var i = 0; i < eingebettet.length; i += 1) eingebettet[i].remove();
          {%- if lspod_v63_vorschau != blank -%}
            editor.setAttribute('data-vorschau-url', {{ lspod_v63_vorschau | asset_url | json }});
          {%- endif -%}
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', lspodV63Starten, { once: true });
        } else {
          lspodV63Starten();
        }
      }());
        </script>
        <script src="{{ 'lspod-designer-v6-6.3.1.js' | asset_url }}" defer></script>
        <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          if (window.__lspodDesignerV6Loaded !== true && window.__lspodV63Blockieren) {
            window.__lspodV63Blockieren('editor-nicht-initialisiert');
          }
        }, 0);
      }, { once: true });
        </script>
      {%- elsif product.description contains 'lspod-designer' -%}
        <script src="{{ 'lspod-designer-v5-safe.js' | asset_url }}" defer></script>
      {%- endif -%}
    {%- endif -%}`;
}

function pruefeBestehendenPatch(layout, allowlist) {
  if (anzahl(layout, MARKER) !== 1) throw new Error('V63_PATCH_AMBIGUOUS: Marker kommt nicht genau einmal vor');
  const expected = rolloutBlock(allowlist);
  if (anzahl(layout, expected) !== 1) throw new Error('V63_PATCH_AMBIGUOUS: Rollout-Block weicht vom exakten Allowlist-Bau ab');
}

/**
 * Ersetzt nur den exakt bekannten v5-Loaderblock. Ein bereits vollstaendiger
 * Patch ist idempotent. Abweichende, doppelte oder teilweise Patches brechen ab.
 */
export function patchThemeLayout(layout, allowlist) {
  if (typeof layout !== 'string' || !layout.length) throw new Error('V63_THEME_INVALID: layout/theme.liquid ist leer');
  scope(allowlist);
  const markerCount = anzahl(layout, MARKER);
  if (markerCount) {
    pruefeBestehendenPatch(layout, allowlist);
    return layout;
  }
  const treffer = anzahl(layout, ERWARTETER_BLOCK);
  if (treffer !== 1) throw new Error(`V63_THEME_BASE_MISMATCH: erwarteter v5-Block ${treffer}-mal gefunden`);
  const patched = layout.replace(ERWARTETER_BLOCK, rolloutBlock(allowlist));
  pruefeBestehendenPatch(patched, allowlist);
  return patched;
}

export const themePatch = patchThemeLayout;
