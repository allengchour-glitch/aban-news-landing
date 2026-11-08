/**
 * Read-only Vertrag fuer das Google-Tracking einer Shopify-Produktseite.
 *
 * Die Probe wertet nur die im HTML ausgelieferte Google-&-YouTube-Pixel-
 * Konfiguration aus. Sie loest keine Storefront-Ereignisse aus und schreibt
 * weder in Shopify noch in ein Google-Konto.
 */

export const STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN',
});

export const STANDARD_ZIELE = Object.freeze({
  apiClientId: 1780363,
  ga: Object.freeze(['G-YJXJVC5KRX']),
  gt: 'GT-WVRZQPLZ',
  aw: 'AW-18174567886',
  mc: 'MC-CW38CV2EJ1',
});

const PFLICHT_EREIGNISSE = Object.freeze(['page_view', 'view_item']);

function grund(status, text) {
  return { status, grund: text };
}

function alsListe(wert) {
  if (Array.isArray(wert)) return wert.every(eintrag => typeof eintrag === 'string') ? wert : null;
  if (typeof wert === 'string') return [wert];
  if (wert == null) return [];
  return null;
}

function normalisiereZiele(ziele) {
  if (!Array.isArray(ziele)) return [];
  return [...new Set(ziele
    .filter(ziel => typeof ziel === 'string')
    .map(ziel => ziel.trim())
    .filter(Boolean))];
}

function zielBasis(ziel) {
  return ziel.split('/', 1)[0];
}

function hatZiel(istZiele, sollZiele) {
  const gesucht = new Set(normalisiereZiele(sollZiele));
  return istZiele.some(ziel => gesucht.has(ziel) || gesucht.has(zielBasis(ziel)));
}

/** Findet eine JSON-Liste nach `webPixelsConfigList:` ohne JavaScript auszufuehren. */
export function webPixelListeAusHtml(html) {
  if (typeof html !== 'string' || html.length === 0) {
    return { ...grund(STATUS.UNKNOWN, 'HTML fehlt.'), liste: null };
  }

  const marker = /webPixelsConfigList\s*:/g;
  let fund;
  let letzterFehler = 'webPixelsConfigList fehlt.';

  while ((fund = marker.exec(html)) !== null) {
    let start = marker.lastIndex;
    while (/\s/.test(html[start] || '')) start++;
    if (html[start] !== '[') {
      letzterFehler = 'Pixel-Liste beginnt nicht mit einer JSON-Liste.';
      continue;
    }

    let tiefe = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < html.length; i++) {
      const zeichen = html[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (zeichen === '\\') escaped = true;
        else if (zeichen === '"') inString = false;
        continue;
      }
      if (zeichen === '"') {
        inString = true;
        continue;
      }
      if (zeichen === '[') tiefe++;
      if (zeichen !== ']') continue;
      tiefe--;
      if (tiefe !== 0) continue;

      try {
        const liste = JSON.parse(html.slice(start, i + 1));
        if (!Array.isArray(liste)) throw new Error('kein Array');
        return { ...grund(STATUS.PASS, 'Pixel-Liste lesbar.'), liste };
      } catch (error) {
        letzterFehler = `Pixel-Liste nicht lesbar: ${error.message}`;
        break;
      }
    }
  }

  return { ...grund(STATUS.UNKNOWN, letzterFehler), liste: null };
}

function googlePixelAusListe(liste, apiClientId) {
  const treffer = liste.filter(eintrag => Number(eintrag?.apiClientId) === Number(apiClientId));
  if (treffer.length === 0) {
    return {
      ...grund(STATUS.FAIL, `Google-&-YouTube-Pixel apiClientId ${apiClientId} fehlt.`),
      pixel: null,
      config: null,
    };
  }
  if (treffer.length !== 1) {
    return {
      ...grund(STATUS.UNKNOWN, `Google-&-YouTube-Pixel apiClientId ${apiClientId} ist ${treffer.length}-mal vorhanden.`),
      pixel: null,
      config: null,
    };
  }
  const [pixel] = treffer;
  if (pixel.type !== 'APP') {
    return {
      ...grund(STATUS.FAIL, `Google-&-YouTube-Pixel hat unerwarteten Typ ${pixel.type ?? 'unbekannt'}.`),
      pixel,
      config: null,
    };
  }

  try {
    const aussen = typeof pixel.configuration === 'string'
      ? JSON.parse(pixel.configuration)
      : pixel.configuration;
    if (!aussen || typeof aussen !== 'object') throw new Error('Aussenkonfiguration fehlt');
    const config = typeof aussen.config === 'string' ? JSON.parse(aussen.config) : aussen.config;
    if (!config || typeof config !== 'object') throw new Error('Innenkonfiguration fehlt');
    if (!Array.isArray(config.gtag_events)) throw new Error('gtag_events fehlt');
    return {
      ...grund(STATUS.PASS, `Google-&-YouTube-Pixel apiClientId ${apiClientId} lesbar.`),
      pixel,
      config,
    };
  } catch (error) {
    return {
      ...grund(STATUS.UNKNOWN, `Google-Pixel-Konfiguration nicht lesbar: ${error.message}`),
      pixel,
      config: null,
    };
  }
}

function kanalBefund(istZiele, sollZiele, name) {
  if (istZiele === null) {
    return { ...grund(STATUS.UNKNOWN, `${name}: action_label hat ein unbekanntes Format.`), ziele: [] };
  }
  const soll = normalisiereZiele(sollZiele);
  if (hatZiel(istZiele, soll)) {
    return { ...grund(STATUS.PASS, `${name}: Ziel vorhanden.`), ziele: istZiele };
  }
  return {
    ...grund(STATUS.FAIL, `${name}: Ziel fehlt; erwartet ${soll.join(' oder ')}.`),
    ziele: istZiele,
  };
}

function statusZusammenfassen(befunde) {
  if (befunde.some(befund => befund.status === STATUS.FAIL)) return STATUS.FAIL;
  if (befunde.some(befund => befund.status === STATUS.UNKNOWN)) return STATUS.UNKNOWN;
  return STATUS.PASS;
}

function ereignisBefund(config, typ, ziele) {
  const passend = config.gtag_events.filter(ereignis => ereignis?.type === typ);
  if (passend.length === 0) {
    const fehlt = name => ({ ...grund(STATUS.FAIL, `${name}: Ereignis ${typ} fehlt.`), ziele: [] });
    const kanaele = { ga: fehlt('GA4'), aw: fehlt('Google Ads'), mc: fehlt('Merchant Center') };
    return { typ, status: STATUS.FAIL, actionLabels: [], kanaele };
  }

  const roheListen = passend.map(ereignis => alsListe(ereignis.action_label));
  const unlesbar = roheListen.some(liste => liste === null);
  const actionLabels = unlesbar ? null : normalisiereZiele(roheListen.flat());
  const kanaele = {
    ga: kanalBefund(actionLabels, ziele.ga, 'GA4'),
    aw: kanalBefund(actionLabels, [ziele.aw], 'Google Ads'),
    mc: kanalBefund(actionLabels, [ziele.mc], 'Merchant Center'),
  };
  return {
    typ,
    status: statusZusammenfassen(Object.values(kanaele)),
    actionLabels: actionLabels ?? [],
    kanaele,
  };
}

/**
 * Consent ist nur dann bekannt, wenn eine echte Browserbeobachtung mitgegeben wird.
 * dataSharingState im HTML ist kein Consent-Beleg.
 */
export function consentBefund(beobachtung) {
  if (!beobachtung || beobachtung.fehler) {
    return grund(STATUS.UNKNOWN, beobachtung?.fehler || 'Consent wurde in dieser HTML-Probe nicht beobachtet.');
  }
  if (beobachtung.analytics_storage === 'granted') {
    return grund(STATUS.PASS, 'analytics_storage wurde als granted beobachtet.');
  }
  if (beobachtung.analytics_storage === 'denied') {
    return grund(STATUS.FAIL, 'analytics_storage wurde als denied beobachtet.');
  }
  return grund(STATUS.UNKNOWN, 'analytics_storage ist unbekannt.');
}

function unbekanntesRouting(grundText) {
  return {
    status: STATUS.UNKNOWN,
    grund: grundText,
    ereignisse: {},
  };
}

function customPixelBefund(liste) {
  const anzahl = liste.filter(pixel => pixel?.type === 'CUSTOM' || pixel?.id === 'shopify-custom-pixel').length;
  if (anzahl === 0) return { ...grund(STATUS.PASS, 'Kein Custom Pixel im HTML registriert.'), anzahl };
  return {
    ...grund(STATUS.UNKNOWN, `${anzahl} Custom Pixel registriert; Quellcode ist im HTML nicht pruefbar.`),
    anzahl,
  };
}

function gesamtergebnis(statisch, consent, auslieferung, customPixel) {
  return statusZusammenfassen([statisch, consent, auslieferung, customPixel]);
}

function statisch(status, grundText) {
  return { status, grund: grundText };
}

/** Wertet die statische Routing-Konfiguration aus; es werden keine Events erzeugt. */
export function trackingVertragAusHtml(html, optionen = {}) {
  const ziele = {
    apiClientId: optionen.apiClientId ?? STANDARD_ZIELE.apiClientId,
    ga: normalisiereZiele(optionen.ga ?? STANDARD_ZIELE.ga),
    gt: optionen.gt ?? STANDARD_ZIELE.gt,
    aw: optionen.aw ?? STANDARD_ZIELE.aw,
    mc: optionen.mc ?? STANDARD_ZIELE.mc,
  };
  const pixelListe = webPixelListeAusHtml(html);
  const consent = consentBefund(optionen.consent);
  const auslieferung = grund(STATUS.UNKNOWN, 'Tatsaechliche Browser-Auslieferung wurde nicht beobachtet.');

  if (pixelListe.status !== STATUS.PASS) {
    const statischeKonfiguration = statisch(STATUS.UNKNOWN, pixelListe.grund);
    return {
      status: gesamtergebnis(statischeKonfiguration, consent, auslieferung, grund(STATUS.UNKNOWN, 'Custom Pixel unbekannt.')),
      statischeKonfiguration,
      pixelListe: { status: pixelListe.status, grund: pixelListe.grund },
      googlePixel: grund(STATUS.UNKNOWN, 'Google-Pixel wegen unlesbarer Pixel-Liste unbekannt.'),
      customPixel: grund(STATUS.UNKNOWN, 'Custom Pixel wegen unlesbarer Pixel-Liste unbekannt.'),
      konfiguriert: {
        ga: grund(STATUS.UNKNOWN, 'Direkte GA4-Konfiguration unbekannt.'),
        gt: grund(STATUS.UNKNOWN, 'Google-Tag-Konfiguration unbekannt.'),
      },
      routing: unbekanntesRouting(pixelListe.grund),
      consent,
      auslieferung,
      soll: ziele,
    };
  }

  const customPixel = customPixelBefund(pixelListe.liste);
  const googlePixel = googlePixelAusListe(pixelListe.liste, ziele.apiClientId);
  if (googlePixel.status === STATUS.FAIL) {
    const statischeKonfiguration = statisch(STATUS.FAIL, googlePixel.grund);
    return {
      status: STATUS.FAIL,
      statischeKonfiguration,
      pixelListe: { status: pixelListe.status, grund: pixelListe.grund },
      googlePixel: { status: googlePixel.status, grund: googlePixel.grund },
      customPixel,
      konfiguriert: {
        ga: grund(STATUS.FAIL, 'Direkte GA4-Konfiguration fehlt.'),
        gt: grund(STATUS.FAIL, 'Google-Tag-Konfiguration fehlt.'),
      },
      routing: { status: STATUS.FAIL, grund: googlePixel.grund, ereignisse: {} },
      consent,
      auslieferung,
      soll: ziele,
    };
  }
  if (googlePixel.status === STATUS.UNKNOWN) {
    const statischeKonfiguration = statisch(STATUS.UNKNOWN, googlePixel.grund);
    return {
      status: gesamtergebnis(statischeKonfiguration, consent, auslieferung, customPixel),
      statischeKonfiguration,
      pixelListe: { status: pixelListe.status, grund: pixelListe.grund },
      googlePixel: { status: googlePixel.status, grund: googlePixel.grund },
      customPixel,
      konfiguriert: {
        ga: grund(STATUS.UNKNOWN, 'Direkte GA4-Konfiguration nicht lesbar.'),
        gt: grund(STATUS.UNKNOWN, 'Google-Tag-Konfiguration nicht lesbar.'),
      },
      routing: unbekanntesRouting(googlePixel.grund),
      consent,
      auslieferung,
      soll: ziele,
    };
  }

  const konfigurierteTags = normalisiereZiele(googlePixel.config.google_tag_ids);
  const gaDirekt = hatZiel(konfigurierteTags, ziele.ga)
    ? kanalBefund(konfigurierteTags, ziele.ga, 'Direktes GA4-Konfigurationsziel')
    : hatZiel(konfigurierteTags, [ziele.gt])
      ? { ...grund(STATUS.UNKNOWN, `${ziele.gt} ist vorhanden; seine Verbindung zu ${ziele.ga.join(' oder ')} ist im HTML unbekannt.`), ziele: konfigurierteTags }
      : kanalBefund(konfigurierteTags, ziele.ga, 'Direktes GA4-Konfigurationsziel');
  const konfiguriert = {
    ga: gaDirekt,
    gt: kanalBefund(konfigurierteTags, [ziele.gt], 'Google Tag'),
  };
  const ereignisse = Object.fromEntries(PFLICHT_EREIGNISSE.map(typ => [
    typ,
    ereignisBefund(googlePixel.config, typ, ziele),
  ]));
  const routingStatus = statusZusammenfassen(Object.values(ereignisse));
  const routing = {
    status: routingStatus,
    grund: routingStatus === STATUS.PASS
      ? 'page_view und view_item routen zu GA4, Google Ads und Merchant Center.'
      : routingStatus === STATUS.FAIL
        ? 'Mindestens ein Pflichtziel fehlt im Ereignis-Routing.'
        : 'Mindestens ein Ereignis-Routing ist nicht messbar.',
    ereignisse,
  };
  const statischeKonfiguration = statisch(
    statusZusammenfassen([konfiguriert.gt, routing]),
    routing.status === STATUS.PASS
      ? 'Statische page_view/view_item-Routen sind vollstaendig.'
      : routing.grund,
  );

  return {
    status: gesamtergebnis(statischeKonfiguration, consent, auslieferung, customPixel),
    statischeKonfiguration,
    pixelListe: { status: pixelListe.status, grund: pixelListe.grund },
    googlePixel: {
      status: googlePixel.status,
      grund: googlePixel.grund,
      id: String(googlePixel.pixel.id ?? ''),
      apiClientId: Number(googlePixel.pixel.apiClientId),
      runtimeContext: googlePixel.pixel.runtimeContext ?? null,
    },
    customPixel,
    konfiguriert,
    routing,
    consent,
    auslieferung,
    soll: ziele,
  };
}

function quelleUnbekannt(status, grundText, url, anfragen = 1) {
  return {
    status: STATUS.UNKNOWN,
    statischeKonfiguration: statisch(STATUS.UNKNOWN, grundText),
    quelle: { status: STATUS.UNKNOWN, httpStatus: status ?? null, grund: grundText },
    produktseite: grund(STATUS.UNKNOWN, 'Produktseite nicht bestaetigt.'),
    tracking: null,
    consent: grund(STATUS.UNKNOWN, 'Consent wegen fehlender Seitenmessung unbekannt.'),
    request: { methode: 'GET', url, anfragen },
  };
}

function istLuxeStyleProdukt(url) {
  try {
    const ziel = new URL(url);
    return ziel.origin === 'https://luxestyle.ch'
      && !ziel.username
      && !ziel.password
      && ziel.pathname.startsWith('/products/');
  } catch {
    return false;
  }
}

/**
 * Holt genau eine Produktseite per GET und prueft deren statische Pixel-Routen.
 * 429, 5xx und Netzfehler sind UNKNOWN, nie ein leerer oder falscher Nullbefund.
 */
export async function produktseitePruefen({ url, fetchFn = fetch, ...optionen }) {
  if (!istLuxeStyleProdukt(url)) {
    return quelleUnbekannt(null, 'Nur eine HTTPS-Produkt-URL auf luxestyle.ch ist erlaubt.', url, 0);
  }

  let antwort;
  try {
    antwort = await fetchFn(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html',
        'Cache-Control': 'no-cache',
        'User-Agent': 'LuxeStyle-Tracking-Vertrag/1.0',
      },
    });
  } catch (error) {
    return quelleUnbekannt(null, `Netzfehler: ${error.message}`, url);
  }

  if (antwort.status === 429 || antwort.status >= 500) {
    return quelleUnbekannt(antwort.status, `HTTP ${antwort.status} ist nicht messbar.`, url);
  }
  if (antwort.status >= 300 && antwort.status < 400) {
    return quelleUnbekannt(antwort.status, 'Redirect wird ohne zweite Anfrage als UNKNOWN behandelt.', url);
  }
  if (antwort.status === 404) {
    return {
      status: STATUS.FAIL,
      statischeKonfiguration: statisch(STATUS.UNKNOWN, 'Tracking auf fehlender Produktseite nicht messbar.'),
      quelle: { status: STATUS.FAIL, httpStatus: 404, grund: 'Produktseite liefert HTTP 404.' },
      produktseite: grund(STATUS.FAIL, 'Produktseite fehlt.'),
      tracking: null,
      consent: grund(STATUS.UNKNOWN, 'Consent wegen fehlender Seite unbekannt.'),
      request: { methode: 'GET', url, anfragen: 1 },
    };
  }
  if (!antwort.ok) {
    return quelleUnbekannt(antwort.status, `HTTP ${antwort.status} verhindert die Messung.`, url);
  }

  const endUrl = antwort.url || url;
  if (!istLuxeStyleProdukt(endUrl)) {
    return {
      ...quelleUnbekannt(antwort.status, 'Antwort wurde auf keine Produktseite umgeleitet.', url),
      produktseite: grund(STATUS.FAIL, `Endziel ist keine /products/-URL: ${endUrl}`),
      status: STATUS.FAIL,
    };
  }

  let html;
  try {
    html = await antwort.text();
  } catch (error) {
    return quelleUnbekannt(antwort.status, `HTML nicht lesbar: ${error.message}`, url);
  }

  const tracking = trackingVertragAusHtml(html, optionen);
  return {
    status: tracking.status,
    statischeKonfiguration: tracking.statischeKonfiguration,
    quelle: { status: STATUS.PASS, httpStatus: antwort.status, grund: 'Produktseite per GET gelesen.' },
    produktseite: grund(STATUS.PASS, `Produktseite bestaetigt: ${endUrl}`),
    tracking,
    consent: tracking.consent,
    request: { methode: 'GET', url, anfragen: 1 },
  };
}

export function exitCodeFuer(ergebnis) {
  const statischStatus = ergebnis?.statischeKonfiguration?.status;
  if (statischStatus === STATUS.PASS) return 0;
  if (statischStatus === STATUS.FAIL || ergebnis?.status === STATUS.FAIL) return 1;
  return 2;
}
