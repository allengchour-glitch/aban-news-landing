/**
 * Was in den Google-Gruppen der Abteilung NICHT dazugehoert. Jeder Eintrag: re = Regex-String (Flag i), grund (fuer den Bericht),
 * nach = wohin das Produkt gehoert. Alle `re` stehen als titel_nicht in JEDER Kategorie der Gruppe (und die getroffenen Produkte
 * erscheinen in `fremdkoerper`). Alles mit Wortgrenze (kein «Tasse» in «Tassel»).
 */
import { anfS, endS } from './sa_regeln.mjs';

export const AUSSCHLUSS = {
  schuh: [
    { id: 'arbeit', re: endS('arbeitsschuh\\w*|arbeitsstiefel|sicherheitsschuh\\w*|stahlkappe\\w*|schutzschuh\\w*|durchtrittschutz|kochschuh\\w*|küchenschuh\\w*|operationsschuh\\w*|op-schuh\\w*|pflegeschuh\\w*') + '|' + anfS('arbeits-'),
      grund: 'Arbeits-/Sicherheitsschuh (hat eine eigene Kategorie)', nach: 'arbeitsschuhe (Tag sort-arbeitsschuhe)' },
    { id: 'rollsport', re: endS('rollschuh\\w*|schlittschuh\\w*|inline[- ]?skates?|roller[- ]?skates?|rollen-?schuh\\w*|rädern|laufrädern|rädchen|einrad\\w*|tretroller|kinderroller|scooter|wheel[- ]?shoes?|heelys|roller-?shoes?') + '|' + anfS('laufschuhe mit rollen|schuhe mit rollen|schuhe mit rädern') + '|' + anfS('doppelte rollen'),
      grund: 'Roll-/Eissport, kein Strassenschuh', nach: 'Sport & Outdoor (Rollsport)' },
    { id: 'kostuem', re: anfS('cosplay|kostüm') + '|' + endS('cosplay\\w*|kostüm\\w*'), grund: 'Cosplay-/Kostümschuh (Verkleidung)', nach: 'Kostüme' },
    { id: 'fremd_misc', re: endS('gläser|schienbein\\w*|spannschutz|tier-?taschen|handtaschen'), grund: 'Kein Schuh trotz Google-Kategorie «Shoes» (Gläser, Schutzausrüstung, Taschen)', nach: 'Geschirr / Sport-Schutz / Taschen' },
    { id: 'skischuh', re: endS('skischuh\\w*|ski-?stiefel|skiboots?|snowboard-?(schuh|stiefel|boots?)\\w*'), grund: 'Skischuh/Snowboardstiefel (Wintersport-Ausrüstung)', nach: 'Sport & Outdoor (Wintersport)' },
    { id: 'zubehoer', re: anfS('zehen-trenner|zehenspreizer|fussmassage|schuh-?einlage\\w*|schuhspanner|schnürsenkel-?(set|paar)|elastische schnürsenkel|silikon-?schnürsenkel|schuhlöffel|schuhputz\\w*|schuhpflege|sohlenschutz\\w*|schuhschutz\\w*|schuhüberzug\\w*|überschuh\\w*|schneeschutzhülle|schuhregal|schuhschrank|schuhbürste') + '|' + endS('schuhüberzug\\w*|stiefelüberzug\\w*|überzüge|überzug|abdeckung\\w*|schneeschutzhülle|schuhschutzhülle|schuhhülle\\w*|schuhtasche\\w*|schuhbeutel\\w*|schuhsack\\w*') + '|^(?!.*(lauflern|sneaker|sandal|stiefel|boots?)).*(einlegesohle|einlagen)',
      grund: 'Schuhzubehör (Einlagen, Überzüge, Pflege), kein Schuh', nach: 'Schuhzubehör / Haushalt' },
    { id: 'kleidung', re: endS('hose|hosen') + '|^(?!.*(schuh|sneaker|stiefel)).*(socken|strümpfe)', grund: 'Kleidungsstück mit Fehl-Google-Kategorie «Shoes»', nach: 'Bekleidung (Hosen / Socken)' },
  ],
  tasche: [
    { id: 'kleidung', re: endS('rock|jupe|skort|hose|hosen|pants|jogger|kleid|jacke|mantel|shirt|trageweste|weste|overall'),
      grund: 'Kleidungsstück («… mit Taschen»), Google-Kategorie «Handbags» ist falsch', nach: 'Damenmode (Röcke / Hosen) bzw. Jacken & Westen' },
    { id: 'sport_outdoor', re: endS('fahrrad\\w*|radtasche\\w*|vordertasche\\w*|lenker\\w*|kesseltasche\\w*|rahmentasche\\w*|satteltasche\\w*|gepäckträger\\w*|camping\\w*|packsack|packsäcke|packtasche\\w*|angel\\w*|anglertasche\\w*|fischköder\\w*|golf\\w*|badminton\\w*|tennis\\w*|ski\\w*|lauftasche\\w*|handy-?armband\\w*|taillengürtel\\w*|trekkingtasche\\w*|outdoor-?tasche\\w*|multi-?fach-?storage|storage|jagd\\w*|schiessdecke|schwertabdeckung|trageweste|magazinbeutel|feldweste|sicherheitsleine|gstältli|logtasche') + '|' + anfS('armtasche|sportarmtasche|taktische[rsn]? (weste|packtasche|werkzeug)|racing knight|motorrad-?(seiten|heck|bein|schuh)\\w*|motorrad-?hartschalen\\w*|motorradschultertasche-?hart\\w*|schutzhülle für motorrad|seitentasche|hecktasche|rückensatteltasche|satteltasche'),
      grund: 'Sport-/Outdoor-/Fahrzeug-Zubehör, keine Mode-Tasche', nach: 'Sport & Outdoor' },
    { id: 'baby_tier', re: endS('mommy\\w*|wickeltasche\\w*|windeltasche\\w*|kinderwagen\\w*|hundetasche\\w*|haustiertasche\\w*|tiertasche\\w*|hundekot\\w*|kaninchenbeutel') + '|' + anfS('baby-?\\w*tasche|haustier|hunde?-?tasche'),
      grund: 'Baby- oder Haustier-Zubehör', nach: 'Baby-Ausstattung bzw. Haustierwelt' },
    { id: 'elektronik_gadget', re: endS('taschenlampe\\w*|taschenliner|handyhülle|handyhalter|handy-?halterung|kameratasche\\w*|kamera-?\\w*|fototasche|desinfektion\\w*|uv-\\w*paket|friseur-?\\w*|toolkit|werkzeug-?\\w*|reparatur-?box|laminierkissen|wangenauflage|golfhandschuh-?box|thermosflaschen\\w*|flaschentasche\\w*|wasserflasche\\w*|thermos\\w*|gitarren\\w*|gig-?tasche|instrument\\w*|kofferhülle\\w*|hosentaschenaccessoires|drohne\\w*|game machine|spielkonsole\\w*|konsole\\w*|isoliert\\w*'),
      grund: 'Gadget, Werkzeug, Flaschen- oder Instrumententasche — keine Mode-Tasche', nach: 'Elektronik / Haushalt / Hobby' },
    { id: 'kosmetik_schmuck', re: endS('kosmetik\\w*|toilettentasche\\w*|kulturbeutel\\w*|necessaire|waschtasche|schmucktasche\\w*|schmuck-?organizer|organizer\\w*|schlüsseletui\\w*|schlüsselanhänger\\w*|erste-?hilfe\\w*|notfall\\w*|sanitäts\\w*|medizin\\w*|sauerstoff\\w*|konzentrator\\w*|aufbewahrung\\w*|picknick\\w*|kühltasche\\w*|lunch-?tasche\\w*'),
      grund: 'Kosmetik-/Schmuck-/Medizin-/Kühltasche — hat eine eigene Kategorie', nach: 'Kulturbeutel & Packorganizer bzw. Haushalt / Gesundheit' },
    { id: 'papiere_geld', re: endS('münzbörse\\w*|fahrkarten-?case|dokumententasche\\w*|passport\\w*|kfz\\w*|versicherungs\\w*|fahrzeug\\w*|reisepass\\w*|passhülle|kartenetui\\w*|kartenhalter\\w*|ausweis\\w*|portemonnaie\\w*|geldbeutel|geldbörse\\w*'),
      grund: 'Geldbörse/Kartenetui mit Google-Kategorie «Handbags»', nach: 'portemonnaies-geldboersen bzw. kartenhalter-kartenetuis' },
    { id: 'schule', re: endS('schulranzen\\w*|schultasche\\w*|federmäppchen'), grund: 'Schulzubehör', nach: 'schule-kindergarten' },
  ],
  geldboerse: [
    { id: 'kleidung_misc', re: endS('rock|hose|jacke|kleid|shirt|etui für stifte|stiftetui|geschenk-?set\\w*|quarzuhr\\w*|uhr-?set'), grund: 'kein Portemonnaie (Geschenk-/Uhrenset, Kleidung)', nach: 'Bekleidung / Büro' },
  ],
  guertel: [
    { id: 'kleidung', re: '^(?!.*(ledergürtel für|gürtel für (kleider|mäntel)|baumwoll-gürtel)).*(' + endS('kleid\\w*|sommerkleid\\w*|blazer\\w*|trench\\w*|mantel|mäntel|jacke\\w*|overall\\w*|shawl\\w*|kimono\\w*|jumpsuit\\w*|cardigan\\w*|pullover|bademantel|weste\\w*|etui') + '|' + anfS('kimono') + ')',
      grund: 'Kleidungsstück «mit Bindegürtel», Google-Kategorie «Belts» ist falsch', nach: 'Bekleidung (Kleider / Jacken / Mäntel)' },
    { id: 'bauch_umstand', re: endS('bauchgurt\\w*|bauchstütz\\w*|taillenformer|bauchwickel|rückbildung\\w*') + '|' + anfS('bauchgurt|bauchstütz|nach der geburt|schwanger\\w*|taillenkette|taillenformer'),
      grund: 'Bauchgurt, Stütz-/Formwäsche, Taillenkette — kein Gürtel', nach: 'Umstandsmode / Gesundheit bzw. Schmuck' },
    { id: 'kostuem', re: anfS('kostüm|cosplay') + '|' + endS('kostüm\\w*'), grund: 'Kostüm', nach: 'Kostüme' },
  ],
  kopf: [
    { id: 'kleidung', re: endS('kleid\\w*|badetuch\\w*|overall\\w*') , grund: 'Kleidungsstück mit Fehl-Google-Kategorie «Hats»', nach: 'Bekleidung' },
    { id: 'haartuch', re: anfS('haarhandtuch|haar-?handtuch|latex\\w*|gesichtsmaske mit kopfband|kühlende|gel-?mütze|migräne\\w*'), grund: 'Haarhandtuch bzw. Pflege-/Latexmaske — kein Kopfaccessoire', nach: 'Beauty / Haarpflege' },
    { id: 'kostuem', re: anfS('kostüm|halloween|cosplay|piraten\\w*') + '|' + endS('kostüm\\w*'), grund: 'Kostüm/Halloween/Piratenmütze', nach: 'Kostüme' },
  ],
  schal: [
    { id: 'kleidung', re: endS('mantel|mäntel|jacke\\w*|kleid\\w*|trench\\w*|bindegürtel|armband|uhrenarmband|uhrenband'), grund: 'Kleidung oder Uhrenarmband mit Fehl-Google-Kategorie «Scarves»', nach: 'Bekleidung bzw. Uhrenarmbänder' },
  ],
  handschuh: [
    { id: 'kein_modehandschuh', re: endS('boxhandschuh\\w*|einweghandschuh\\w*|kostümhandschuh\\w*|schwimmhandschuh\\w*|arbeits-?schutzhandschuh\\w*|schnittschutz\\w*|sicherheitshandschuh\\w*|arbeitshandschuh\\w*|ofenhandschuh\\w*|kapuzenpullover|pullover|hoodie\\w*|fitnesshandschuh\\w*|krafttraining\\w*|kompressionshandschuh\\w*|cosplay\\w*'),
      grund: 'Sport-, Einweg-, Arbeits-, Kostüm- oder Kleidungsartikel', nach: 'Sport & Outdoor / Kostüme / Bekleidung' },
  ],
  brille: [
    { id: 'keine_sonnenbrille', re: endS('leuchtbrille\\w*|skibrille\\w*|partybrille\\w*|schwimmbrille\\w*|schutzbrille\\w*|nachtsicht\\w*|vr-?brille\\w*|smart-?brille\\w*|lesebrille\\w*|nachtfahr\\w*') + '|' + anfS('fahren bei nacht'),
      grund: 'Leucht-, Ski-, Party-, Schutz- oder Smart-Brille — keine Sonnenbrille', nach: 'Sport & Outdoor / Kostüme / smarte-brillen-ki' },
  ],
  haar: [
    { id: 'perueckeetc', re: endS('perücke\\w*|perücken|wigs?|echthaar\\w*|tönungsmousse|haarteil\\w*|styroporkopf|kopfschmuck|doppelhaken|egg roll stick|kühlkopfband|kuehl\\w*|katzenohren\\w*|ohren\\w*|cosplay\\w*|gaming\\w*|kostüm\\w*'),
      grund: 'Perücke, Kostümteil oder Perückenzubehör — kein Haarschmuck', nach: 'Beauty (Perücken) bzw. Kostüme' },
  ],
};
