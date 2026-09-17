/**
 * pinterest_boards_anlegen.mjs — legt die fehlenden Boards ueber Pinterests eigenen
 * Weg an: Profilseite → «+» → «Pinnwand» → Name → Erstellen.
 *
 * ⚠️ WARUM NEU (17.09.2026): Die erste Fassung rief `/board-create/` auf — diese Adresse
 * gibt es nicht. Pinterest leitete auf den Feed um und zeigte «Wir konnten diese Idee
 * nicht finden!»; das Skript meldete daraufhin sechsmal «kein Namensfeld gefunden».
 * Die Meldung war richtig und die Ursache eine geratene URL. **Eine Adresse, die man
 * nicht gemessen hat, ist eine Vermutung** — hier wird jetzt der Weg genommen, der im
 * Screenshot sichtbar ist.
 *
 * ⚠️ ERST EINE PROBE, DANN DER REST. Das erste Board wird angelegt und danach
 * NACHGELESEN, ob es wirklich auf dem Konto steht. Nur wenn das belegt ist, laufen die
 * uebrigen fuenf. Sonst waeren es sechs Fehlversuche — oder, schlimmer, sechs Dubletten,
 * falls das Anlegen klappt und nur das Erkennen scheitert (CLAUDE.md Regel 2).
 */
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';
const NUTZER = 'luxestyleCH';
const SOLL = ['Herrenmode Schweiz', 'Schmuck & Accessoires', 'Sommerkleider & Damenmode 2026',
              'Wellness & Beauty', 'Home & Geschenkideen', 'Schuhe & Sandalen'];

const grund = s => (s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const normen = s => [grund(s).replace(/&/g, 'und').replace(/[^a-z0-9]/g, ''),
                     grund(s).replace(/&/g, '').replace(/[^a-z0-9]/g, '')];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const bilder = [], schritte = [];
  const seite = await ctx.newPage();
  const schuss = async (name) => {
    const d = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: d, fullPage: false });
    bilder.push(path.relative(REPO, d));
  };

  /** Liest die Board-Namen aus der Reiterleiste der Profilseite. */
  async function vorhandene() {
    await seite.goto(`${HOST}/${NUTZER}/_saved/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(4500);
    if (ist_anmeldeseite(seite.url())) {
      const e = new Error(`nicht angemeldet — ${seite.url()}`); e.nichtAngemeldet = true; throw e;
    }
    // Zwei Quellen, damit eine leere Antwort nicht als «keine Boards» durchgeht:
    // die Adressen der Board-Links UND die sichtbaren Namen der Reiterleiste.
    const adressen = await seite.$$eval('a[href]', (as, n) => [...new Set(as
      .map(a => a.getAttribute('href') || '')
      .filter(h => h.toLowerCase().startsWith('/' + n + '/'))
      .map(h => decodeURIComponent(h.split('/').filter(Boolean)[1] || ''))
      .filter(h => h && !h.startsWith('_')))], NUTZER.toLowerCase());
    const namen = await seite.$$eval('[role="tab"],nav a,nav div',
      els => els.map(e => (e.innerText || '').trim()).filter(t => t && t.length < 40));
    return { adressen, namen, alle: new Set([...adressen, ...namen].flatMap(normen)) };
  }

  /** EIN Board anlegen. Gibt zurueck, wie weit es kam — nie stillschweigend. */
  async function anlegen(name, marke) {
    const plus = seite.locator(
      '[aria-label*="erstell" i],[aria-label*="create" i],[aria-label*="hinzuf" i],'
      + 'button:has-text("Erstellen"),div[role="button"]:has-text("Erstellen")');
    if (!(await plus.count())) return `kein «+»/«Erstellen» auf der Profilseite gefunden`;
    await plus.first().click({ timeout: 15000 }).catch(() => {});
    await seite.waitForTimeout(2500);
    await schuss(`${marke}-a-menu`);

    // Im Menue «Pinnwand»/«Board» waehlen — sofern es ein Menue gibt.
    const pinnwand = seite.locator('[role="menuitem"],a,button,div[role="button"]')
      .filter({ hasText: /^\s*(Pinnwand|Board)\s*$/i });
    if (await pinnwand.count()) {
      await pinnwand.first().click({ timeout: 15000 }).catch(() => {});
      await seite.waitForTimeout(2500);
    }
    const feld = seite.locator('input[type="text"]:visible,input[name="name"]:visible,'
                             + 'input[placeholder*="Name" i],input[id*="name" i]');
    if (!(await feld.count())) { await schuss(`${marke}-b-kein-feld`); return 'kein Namensfeld im Dialog'; }
    await feld.first().fill(name);
    await seite.waitForTimeout(1200);
    await schuss(`${marke}-c-gefuellt`);
    const knopf = seite.locator('button,div[role="button"]')
      .filter({ hasText: /^\s*(Erstellen|Create|Fertig|Done|Weiter)\s*$/i });
    if (!(await knopf.count())) return 'Name gesetzt, aber kein Erstellen-Knopf';
    await knopf.first().click({ timeout: 20000 });
    await seite.waitForTimeout(6000);
    await schuss(`${marke}-d-nachher`);
    return null;                                   // null = kein Hinderungsgrund
  }

  const ergebnis = { angelegt: [], vorhanden: [], offen: [], schritte, bilder };
  try {
    let stand = await vorhandene();
    await schuss('0-profil');
    schritte.push(`vorhanden: ${[...new Set([...stand.adressen])].join(', ') || '—'}`);

    const fehlt = SOLL.filter(n => !normen(n).some(k => stand.alle.has(k)));
    ergebnis.vorhanden = SOLL.filter(n => normen(n).some(k => stand.alle.has(k)));
    if (!fehlt.length) { schritte.push('alle sechs existieren schon'); return ergebnis; }

    // ── Probe: das erste fehlende Board, dann nachlesen ──────────────────────
    const erstes = fehlt[0];
    const hindernis = await anlegen(erstes, 'probe');
    stand = await vorhandene();
    const probe_da = normen(erstes).some(k => stand.alle.has(k));
    schritte.push(`Probe «${erstes}»: ${hindernis || 'durchgelaufen'} → auf dem Konto: ${probe_da}`);
    if (!probe_da) {
      ergebnis.offen = fehlt.map(n => `${n} (Probe schlug fehl: ${hindernis || 'angelegt, aber nicht gefunden'})`);
      return ergebnis;                             // NICHT fuenfmal denselben Fehler wiederholen
    }
    ergebnis.angelegt.push(erstes);

    for (const name of fehlt.slice(1)) {
      const h = await anlegen(name, normen(name)[0].slice(0, 16));
      if (h) { ergebnis.offen.push(`${name} (${h})`); continue; }
      ergebnis.angelegt.push(name);
    }
    // Schlusskontrolle am Konto, nicht am eigenen Zaehler.
    stand = await vorhandene();
    ergebnis.bestaetigt = SOLL.filter(n => normen(n).some(k => stand.alle.has(k)));
    return ergebnis;
  } finally { await seite.close().catch(() => {}); }
}
