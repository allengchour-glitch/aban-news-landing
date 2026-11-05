/**
 * Attrappe des Shopify-Admin-GraphQL für die Tests der Modell-Fabrik (anlegen.mjs). Kein Netz. Hält Produkte im Speicher und versteht genau die Abfragen und Mutationen,
 * die anlegen.mjs benutzt (erkannt am Text): productByIdentifier, productVariants (SKU-Suche), productSet, metafieldsSet, productUpdate, productVariantAppendMedia, productDelete.
 * Sie PRÜFT wie Shopify, soweit gemessen: Handle eindeutig, jede Variante nennt zu jeder Option einen vorhandenen Wert, SKU nicht doppelt, Medien werden erst nach `polls` Lesungen READY,
 * productVariantAppendMedia verlangt READY, neue Produkte sind in keinem Kanal. Mit `optionen` lassen sich Fehler einbauen (Tageslimit, userErrors, Netzfehler, umgeschriebene Beschreibung).
 */
export function neueAttrappe(optionen = {}) {
  const o = { polls: 1, ...optionen };
  const st = { produkte: new Map(), naechste: 1000, aufrufe: [], extras: [], lesungen: 0, schreibaufrufe: 0 };
  const zaehler = (p) => `gid://shopify/${p}/${st.naechste++}`;
  const gid = (id) => String(id);
  const byHandle = (h) => [...st.produkte.values()].find((p) => p.handle === h) ?? null;
  const ok = (feld, daten) => ({ data: { [feld]: { userErrors: [], ...daten } } });
  const ue = (feld, message, code = 'INVALID') => ({ data: { [feld]: { userErrors: [{ field: ['input'], message, code }] } } });
  const sichtbar = (p) => {
    for (const m of p.media) { if (m.status !== 'PROCESSING') continue; m.lesungen = (m.lesungen ?? 0) + 1; if (m.lesungen > o.polls) m.status = o.mediaFehler ? 'FAILED' : 'READY'; }
    return {
      id: p.id, handle: p.handle, title: p.title, status: p.status, vendor: p.vendor, productType: p.productType, tags: [...p.tags], seo: p.seo ?? { title: null, description: null }, descriptionHtml: p.descriptionHtml, category: p.category ? { id: p.category } : null,
      options: p.options.map((x, i) => ({ id: `gid://shopify/ProductOption/${i + 1}`, name: x.name, position: i + 1, optionValues: x.values.map((w, j) => ({ id: `gid://shopify/ProductOptionValue/${j + 1}`, name: w, hasVariants: p.variants.some((v) => v.selectedOptions.some((s) => s.name === x.name && s.value === w)) })) })),
      variants: { nodes: p.variants.map((v) => ({ id: v.id, sku: v.sku, price: v.price, inventoryPolicy: v.inventoryPolicy, selectedOptions: v.selectedOptions, inventoryItem: v.inventoryItem, media: { nodes: v.mediaIds.map((mid) => ({ id: mid, alt: p.media.find((m) => m.id === mid)?.alt })) } })), pageInfo: { hasNextPage: false } },
      media: { nodes: p.media.map((m) => ({ id: m.id, alt: m.alt, status: m.status, mediaContentType: 'IMAGE' })) },
      metafields: { nodes: p.metafields.map((m) => ({ ...m })) },
      resourcePublicationsCount: { count: p.kanaele },
    };
  };
  const netz = (was) => { if (o.netzfehlerBei === was) { o.netzfehlerBei = null; throw new Error(`Netzfehler (Attrappe) bei ${was}`); } };
  // Antwort verloren: die Mutation WIRD ausgeführt, die Antwort kommt aber nie an (Zeitüberschreitung). Einmalig.
  const verloren = (was) => { if (o.antwortVerlorenBei === was) { o.antwortVerlorenBei = null; return true; } return false; };

  async function gql(query, v = {}, extra = {}) {
    st.aufrufe.push(String(query).slice(0, 60).replace(/\s+/g, ' '));
    st.extras.push(extra ?? {});
    const q = String(query);
    if (/\bproduct\(id:/.test(q)) { st.lesungen++; const p = st.produkte.get(v.id); return { data: { product: p ? { id: p.id, handle: p.handle, title: p.title, status: p.status, tags: [...p.tags], resourcePublicationsCount: { count: p.kanaele } } : null } }; }
    if (/productByIdentifier/.test(q)) { st.lesungen++; const p = byHandle(v.h); return { data: { productByIdentifier: p ? sichtbar(p) : null } }; }
    if (/productVariants\(/.test(q)) {
      const m = String(v.q).match(/^sku:(.+)\*$/); const pre = m ? m[1] : String(v.q).replace(/^sku:/, '');
      const nodes = [...st.produkte.values()].flatMap((p) => p.variants.filter((x) => x.sku.startsWith(pre)).map((x) => ({ id: x.id, sku: x.sku, product: { id: p.id, handle: p.handle } })));
      return { data: { productVariants: { nodes: nodes.slice(0, 5) } } };
    }
    st.schreibaufrufe++;
    if (/productSet/.test(q)) {
      netz('productSet');
      if (o.tageslimit) return { errors: [{ message: 'Daily variant creation limit reached (VARIANT_THROTTLE_EXCEEDED)' }] };
      const i = v.input;
      if (o.userErrorBei === 'productSet') return ue('productSet', 'Titel ungültig (Attrappe)');
      if (byHandle(i.handle)) return ue('productSet', 'Handle schon vergeben', 'TAKEN');
      const werte = Object.fromEntries(i.productOptions.map((x) => [x.name, x.values.map((w) => w.name)]));
      const skus = new Set();
      for (const x of i.variants) {
        for (const ov of x.optionValues) if (!werte[ov.optionName]?.includes(ov.name)) return ue('productSet', `Optionswert «${ov.name}» zu «${ov.optionName}» unbekannt`);
        if (x.optionValues.length !== i.productOptions.length) return ue('productSet', 'Variante nennt nicht jede Option');
        if (skus.has(x.sku)) return ue('productSet', `SKU ${x.sku} doppelt`); skus.add(x.sku);
      }
      if (i.status !== 'DRAFT' && o.nurDraft !== false) return ue('productSet', 'Attrappe erwartet DRAFT');
      const p = {
        id: zaehler('Product'), category: i.category ?? null, handle: i.handle, title: i.title, status: i.status, vendor: i.vendor, productType: i.productType, tags: [...i.tags], seo: i.seo, descriptionHtml: o.entferneScripts ? i.descriptionHtml.replace(/<script[\s\S]*?<\/script>/g, '') : i.descriptionHtml, kanaele: 0, metafields: [],
        options: i.productOptions.map((x) => ({ name: x.name, values: x.values.map((w) => w.name) })),
        variants: i.variants.map((x) => ({ id: zaehler('ProductVariant'), sku: x.sku, price: o.preisAufschlag ? (Number(x.price) + o.preisAufschlag).toFixed(2) : x.price, inventoryPolicy: x.inventoryPolicy, inventoryItem: { tracked: x.inventoryItem?.tracked ?? true, requiresShipping: x.inventoryItem?.requiresShipping ?? true }, selectedOptions: x.optionValues.map((ov) => ({ name: ov.optionName, value: ov.name })), mediaIds: [] })),
        media: (i.files ?? []).map((f) => ({ id: zaehler('MediaImage'), alt: f.alt, url: f.originalSource, status: 'PROCESSING' })),
      };
      st.produkte.set(p.id, p);
      if (verloren('productSet')) throw new Error('GraphQL: fetch: The operation was aborted due to timeout (Attrappe, Antwort verloren)');
      return ok('productSet', { product: { id: p.id, handle: p.handle, status: p.status } });
    }
    if (/metafieldsSet/.test(q)) {
      netz('metafieldsSet');
      for (const m of v.mf) {
        const p = st.produkte.get(m.ownerId); if (!p) return ue('metafieldsSet', 'Besitzer unbekannt');
        if (m.type === 'json') { try { JSON.parse(m.value); } catch { return ue('metafieldsSet', 'Kein gültiges JSON'); } }
        if (m.type === 'number_integer' && !/^-?\d+$/.test(m.value)) return ue('metafieldsSet', 'Keine ganze Zahl');
        const i = p.metafields.findIndex((x) => x.namespace === m.namespace && x.key === m.key);
        const e = { namespace: m.namespace, key: m.key, type: m.type, value: m.value };
        if (i >= 0) p.metafields[i] = e; else p.metafields.push(e);
      }
      return ok('metafieldsSet', { metafields: v.mf.map((m) => ({ key: m.key })) });
    }
    if (/productUpdate/.test(q)) {
      netz('productUpdate');
      const p = st.produkte.get(v.p.id); if (!p) return ue('productUpdate', 'Produkt unbekannt');
      if (v.p.descriptionHtml !== undefined) p.descriptionHtml = o.entferneScripts ? v.p.descriptionHtml.replace(/<script[\s\S]*?<\/script>/g, '') : v.p.descriptionHtml;
      if (v.p.status) p.status = v.p.status;
      return ok('productUpdate', { product: { id: p.id } });
    }
    if (/productVariantAppendMedia/.test(q)) {
      netz('productVariantAppendMedia');
      const p = st.produkte.get(v.p); if (!p) return ue('productVariantAppendMedia', 'Produkt unbekannt');
      for (const x of v.m) {
        const va = p.variants.find((y) => y.id === x.variantId); if (!va) return ue('productVariantAppendMedia', 'Variante unbekannt');
        for (const mid of x.mediaIds) { const m = p.media.find((y) => y.id === mid); if (!m) return ue('productVariantAppendMedia', 'Medium unbekannt'); if (m.status !== 'READY') return ue('productVariantAppendMedia', 'Medium ist nicht READY', 'NON_READY_MEDIA'); if (!va.mediaIds.includes(mid)) va.mediaIds.push(mid); }
      }
      return ok('productVariantAppendMedia', {});
    }
    if (/productDelete/.test(q)) {
      const p = st.produkte.get(v.id); if (!p) return ue('productDelete', 'Produkt unbekannt');
      st.produkte.delete(v.id);
      return { data: { productDelete: { deletedProductId: v.id, userErrors: [] } } };
    }
    throw new Error('Attrappe kennt diese Anfrage nicht: ' + q.slice(0, 80));
  }
  return {
    gql, st,
    /** legt ein fremdes Produkt an (für Kollisionstests) */
    legeProduktAn(p) { const id = zaehler('Product'); const e = { id, handle: p.handle, title: p.title ?? 'Fremd', status: p.status ?? 'ACTIVE', vendor: 'X', productType: '', tags: p.tags ?? [], descriptionHtml: '', kanaele: p.kanaele ?? 1, metafields: [], options: [{ name: 'Title', values: ['Default Title'] }], variants: (p.skus ?? ['FREMD_1']).map((sku) => ({ id: zaehler('ProductVariant'), sku, price: '1.00', inventoryPolicy: 'DENY', inventoryItem: { tracked: true, requiresShipping: true }, selectedOptions: [{ name: 'Title', value: 'Default Title' }], mediaIds: [] })), media: [] }; st.produkte.set(id, e); return e; },
    veroeffentliche(id, n = 1) { st.produkte.get(id).kanaele = n; },
    setzeStatus(id, s) { st.produkte.get(id).status = s; },
    setzeTitel(id, t) { st.produkte.get(id).title = t; },
    optionen: o,
  };
}
