import { initialiseDesigner } from './edm.mjs';

const TEXT = Object.freeze({
  initialising: 'Gestaltungseditor wird vorbereitet.',
  incomplete: 'Prüfe die Gestaltung und die gewählte Ausführung.',
  ready: 'Die Gestaltung kann gespeichert werden.',
  saving: 'Gestaltung wird gespeichert.',
  saved: 'Gestaltung gespeichert. Die Druckdaten werden noch geprüft.',
  error: 'Der Gestaltungseditor ist derzeit nicht verfügbar.',
});

function element(document, name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * Shared host for the official Printful iframe. It draws no product or print
 * projection itself. The caller must provide an already authorised EDM
 * session resolved for exactly one current Shopify variant.
 */
export function mountDesignerHost({
  root,
  PFDesignMaker,
  session,
  productTitle,
  variantTitle,
  retailPriceCHF,
  onSaved,
  onClose,
  onError = () => {},
  now,
} = {}) {
  if (!root || typeof root.replaceChildren !== 'function' || !root.ownerDocument) {
    throw new Error('INVALID_HOST_ROOT');
  }
  if (typeof productTitle !== 'string' || !productTitle.trim() || productTitle.length > 200 ||
      typeof variantTitle !== 'string' || !variantTitle.trim() || variantTitle.length > 200 ||
      (retailPriceCHF !== undefined && (!Number.isFinite(retailPriceCHF) || retailPriceCHF < 0)) ||
      typeof onSaved !== 'function' || typeof onClose !== 'function' || typeof onError !== 'function') {
    throw new Error('INVALID_HOST_OPTIONS');
  }

  const document = root.ownerDocument;
  const shell = element(document, 'section', 'luxe-edm-shell');
  shell.setAttribute('aria-label', 'Produkt selbst gestalten');
  const header = element(document, 'header', 'luxe-edm-heading');
  const headingCopy = element(document, 'div', 'luxe-edm-heading-copy');
  const title = element(document, 'strong', 'luxe-edm-title', productTitle.trim());
  const variant = element(document, 'span', 'luxe-edm-variant', variantTitle.trim());
  headingCopy.append(title, variant);
  if (retailPriceCHF !== undefined) {
    const price = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' })
      .format(retailPriceCHF);
    headingCopy.append(element(document, 'span', 'luxe-edm-price', price));
  }
  const close = element(document, 'button', 'luxe-edm-close', 'Schliessen');
  close.type = 'button';
  header.append(headingCopy, close);

  const container = element(document, 'div', 'luxe-edm-container');
  const containerId = `luxe-edm-${session?.externalProductId?.slice(-12) || 'invalid'}`;
  container.id = containerId;

  const footer = element(document, 'footer', 'luxe-edm-footer');
  const status = element(document, 'p', 'luxe-edm-status', TEXT.initialising);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const save = element(document, 'button', 'luxe-edm-save', 'Gestaltung speichern');
  save.type = 'button';
  save.disabled = true;
  footer.append(status, save);
  shell.append(header, container, footer);
  root.replaceChildren(shell);

  let changed = false;
  let saved = false;
  let disposed = false;
  const setStatus = (value, state) => {
    status.textContent = value;
    status.dataset.state = state;
  };

  let editor;
  try {
    editor = initialiseDesigner({
      PFDesignMaker,
      elemId: containerId,
      session,
      now,
      onStatus(result) {
        if (disposed || saved) return;
        changed = true;
        save.disabled = !result.designValid;
        setStatus(result.designValid ? TEXT.ready : TEXT.incomplete,
          result.designValid ? 'ready' : 'incomplete');
      },
      onSaved(report) {
        if (disposed) return;
        saved = true;
        save.disabled = true;
        setStatus(TEXT.saved, 'saved');
        onSaved(report);
      },
      onError(code) {
        if (disposed) return;
        save.disabled = true;
        setStatus(TEXT.error, 'error');
        onError(code);
      },
    });
  } catch (error) {
    save.disabled = true;
    setStatus(TEXT.error, 'error');
    throw error;
  }

  save.addEventListener('click', () => {
    if (disposed || !editor.canSave) return;
    save.disabled = true;
    setStatus(TEXT.saving, 'saving');
    editor.save();
  });
  close.addEventListener('click', () => {
    if (disposed) return;
    // The host owns the confirmation UI; browsers may suppress nested iframe
    // prompts. This callback reports whether an unsaved edit needs a prompt.
    onClose({ hasUnsavedChanges: changed && !saved });
  });

  return Object.freeze({
    editor,
    shell,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.replaceChildren();
    },
  });
}
