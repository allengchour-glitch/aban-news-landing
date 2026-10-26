// Unterfilter je Kategorie (Handle der Kategorie -> Liste). Sprachliche Muster, rein auf dem Titel; optional, ein Produkt darf in mehreren stehen.
import { A, W, E } from './herren_regeln.mjs';
export const UNTERFILTER = {
  'herren-t-shirts': [
    { handle: 'herren-t-shirts-kurzarm', titel: 'Kurzarm', muss: [A('kurzarm|kurzärm|short-?sleeve|halbarm|kurz-?arm')], nicht: [A('langarm|langärm|long-?sleeve')] },
    { handle: 'herren-t-shirts-langarm', titel: 'Langarm', muss: [A('langarm|langärm|long-?sleeve|longsleeve|dreiviertel')], nicht: [] },
    { handle: 'herren-t-shirts-tanktops', titel: 'Tanktops & Muskelshirts', muss: [A('tank|ärmellos|singlet|muskel|sleeveless|trägershirt')], nicht: [] },
    { handle: 'herren-t-shirts-henley', titel: 'Henley & Knopfleiste', muss: [A('henley|knopfleiste|v-ausschnitt mit knöpfen')], nicht: [] },
    { handle: 'herren-t-shirts-print', titel: 'Print & Grafik', muss: [A('print|druck|grafik|aufdruck|motiv|bedruckt')], nicht: [] },
  ],
  'herren-poloshirts': [
    { handle: 'herren-poloshirts-kurzarm', titel: 'Kurzarm', muss: [A('kurzarm|kurzärm|kurz-?arm')], nicht: [A('langarm|langärm')] },
    { handle: 'herren-poloshirts-langarm', titel: 'Langarm', muss: [A('langarm|langärm|long')], nicht: [] },
    { handle: 'herren-poloshirts-business', titel: 'Business & Golf', muss: [A('business|golf|kontrast|piqu')], nicht: [] },
  ],
  'herren-hemden': [
    { handle: 'herren-hemden-kurzarm', titel: 'Kurzarmhemden', muss: [A('kurzarm|kurzärm|kurz-?arm|halbarm|short')], nicht: [A('langarm|langärm')] },
    { handle: 'herren-hemden-langarm', titel: 'Langarmhemden', muss: [A('langarm|langärm|long')], nicht: [] },
    { handle: 'herren-hemden-leinen', titel: 'Leinenhemden', muss: [A('lein(en|enmix|enartig)')], nicht: [] },
    { handle: 'herren-hemden-freizeit', titel: 'Freizeithemden', muss: [A('freizeit|casual|lässig|legere|loose')], nicht: [] },
    { handle: 'herren-hemden-hawaii-strand', titel: 'Hawaii- & Strandhemden', muss: [A('hawai|strand|resort|kubakragen|beach|tropical|palmen')], nicht: [] },
    { handle: 'herren-hemden-kariert', titel: 'Karo & Flanell', muss: [A('kari|karo|plaid|flanell|tartan|gingham')], nicht: [] },
    { handle: 'herren-hemden-business', titel: 'Business-Hemden', muss: [A('business|bügelfrei|manschett|anzug|formell|klassisch|elegant')], nicht: [] },
    { handle: 'herren-hemden-jeans-cord', titel: 'Jeans- & Cordhemden', muss: [A('jeans|denim|cord|corduroy|samt')], nicht: [] },
  ],
  'herren-pullover-strick': [
    { handle: 'herren-pullover-strickpullover', titel: 'Strickpullover', muss: [A('strick(?!jacke)|gestrickt|wollpullover|wolle|kaschmir|häkel')], nicht: [A('cardigan|kardigan|strickjacke')] },
    { handle: 'herren-pullover-cardigans', titel: 'Cardigans & Strickjacken', muss: [A('cardigan|kardigan|kardigen|strickjacke')], nicht: [] },
    { handle: 'herren-pullover-rollkragen', titel: 'Rollkragenpullover', muss: [A('rollkragen|turtleneck|mock-?neck')], nicht: [] },
    { handle: 'herren-pullover-halbzip', titel: 'Half-Zip & Troyer', muss: [A('half-?zip|halb-?zip|halbzipfel|troyer|reissverschluss')], nicht: [] },
    { handle: 'herren-pullover-v-ausschnitt', titel: 'V-Ausschnitt', muss: [A('v-ausschnitt|v-neck|v-?hals')], nicht: [] },
    { handle: 'herren-pullover-fleece', titel: 'Fleece & Thermo', muss: [A('fleece|thermo|gefüttert|plüsch|teddy')], nicht: [] },
  ],
  'herren-hoodies-sweatshirts': [
    { handle: 'herren-hoodies', titel: 'Hoodies', muss: [E('hoodies?|hoodys?'), A('kapuzenpullover|kapuzenpulli|kapuzen-sweat')], nicht: [] },
    { handle: 'herren-sweatshirts', titel: 'Sweatshirts', muss: [A('sweat-?shirt|rundhals-?sweat')], nicht: [A('kapuze|hoodie|cardigan')] },
    { handle: 'herren-hoodies-zip', titel: 'Zip-Hoodies & Kapuzenjacken', muss: [A('zip|reissverschluss|kapuzenjacke|sweatjacke|cardigan')], nicht: [] },
    { handle: 'herren-hoodies-fleece', titel: 'Fleece-Hoodies', muss: [A('fleece|gefüttert|plüsch|teddy|heavyweight|dick')], nicht: [] },
  ],
  'herren-jacken-maentel': [
    { handle: 'herren-jacken-jeans', titel: 'Jeansjacken', muss: [A('jeans|denim')], nicht: [] },
    { handle: 'herren-jacken-leder', titel: 'Leder- & Kunstlederjacken', muss: [A('leder|pu-?leder|wildleder|biker|lederimitat')], nicht: [] },
    { handle: 'herren-jacken-baseball-bomber', titel: 'Bomber- & Baseballjacken', muss: [A('baseball|bomber|college|varsity|pilot|harrington|coach')], nicht: [] },
    { handle: 'herren-jacken-uebergang', titel: 'Übergangsjacken', muss: [A('übergang|frühling|herbst|freizeitjacke|leicht')], nicht: [] },
    { handle: 'herren-jacken-winter', titel: 'Winter- & Daunenjacken', muss: [A('winter|daunen|wattiert|gepolstert|pad-?jacke|steppjacke|parka|gefüttert|warm|puffer')], nicht: [] },
    { handle: 'herren-jacken-outdoor', titel: 'Outdoor- & Windjacken', muss: [A('outdoor|wind|wasserdicht|softshell|regen|taktisch|trekking|wander')], nicht: [] },
    { handle: 'herren-jacken-kapuze', titel: 'Kapuzenjacken', muss: [A('kapuze|hoodie')], nicht: [] },
    { handle: 'herren-jacken-maentel-lang', titel: 'Mäntel & Trenchcoats', muss: [A('mantel|trench|coat|parka|überzieher')], nicht: [] },
    { handle: 'herren-jacken-hemdjacke', titel: 'Hemdjacken & Workwear', muss: [A('hemdjacke|jeanshemd|overshirt|workwear|arbeits|shacket|cord')], nicht: [] },
  ],
  'herren-anzuege-sakkos': [
    { handle: 'herren-anzuege', titel: 'Anzüge', muss: [E('anzug|anzüge|anzuege')], nicht: [] },
    { handle: 'herren-sakkos-blazer', titel: 'Sakkos & Blazer', muss: [A('sakko|blazer|jackett|zweireiher|anzugjacke')], nicht: [] },
  ],
  'herren-jeans': [
    { handle: 'herren-jeans-straight', titel: 'Straight', muss: [A('straight|gerade')], nicht: [] },
    { handle: 'herren-jeans-loose', titel: 'Loose & Baggy', muss: [A('loose|baggy|weit|wide|relaxed|oversize')], nicht: [] },
    { handle: 'herren-jeans-slim', titel: 'Slim & Skinny', muss: [A('slim|skinny|schmal|eng(?![a-zäöüß])')], nicht: [] },
    { handle: 'herren-jeans-bootcut', titel: 'Bootcut & Flared', muss: [A('bootcut|flare|schlag')], nicht: [] },
    { handle: 'herren-jeans-destroyed', titel: 'Destroyed & Vintage', muss: [A('distress|destroy|ripped|zerrissen|vintage|washed|used|patchwork')], nicht: [] },
  ],
  'herren-hosen': [
    { handle: 'herren-hosen-cargo', titel: 'Cargohosen', muss: [A('cargo|multi-?pocket|taschen')], nicht: [] },
    { handle: 'herren-hosen-freizeit', titel: 'Freizeithosen', muss: [A('freizeit|casual|lässig|bequem|loose')], nicht: [] },
    { handle: 'herren-hosen-jogger', titel: 'Jogger & Sporthosen', muss: [A('jogger|jogging|sweatpants|trainer|sport|fitness|schlabber|kordelzug')], nicht: [] },
    { handle: 'herren-hosen-arbeit', titel: 'Workwear- & Arbeitshosen', muss: [A('arbeits|work-?pants|workpants|workwear|work-?hose|latzhose')], nicht: [] },
    { handle: 'herren-hosen-outdoor', titel: 'Outdoor-Hosen', muss: [A('outdoor|wasserdicht|trekking|wander|softshell|taktisch|wind|camo|tarn|schnee')], nicht: [] },
    { handle: 'herren-hosen-stoff-chino', titel: 'Chino- & Stoffhosen', muss: [A('chino|stoff|anzughose|business|formell|klassisch|trouser|cord|kord|lein(en|enmix|enhose)|schmal')], nicht: [] },
  ],
  'herren-shorts': [
    { handle: 'herren-shorts-jeans', titel: 'Jeansshorts', muss: [A('jeans|denim')], nicht: [] },
  ],
  'herren-westen': [
    { handle: 'herren-westen-strick-anzug', titel: 'Strick- & Anzugwesten', muss: [A('strick|gestrickt|anzug|business|zweireih|tweed|fischgrat|wolle')], nicht: [] },
    { handle: 'herren-westen-gesteppt', titel: 'Daunen- & Steppwesten', muss: [A('daunen|stepp|gesteppt|wattiert|gepolstert|puffer|fleece|thermo|winterweste|warm')], nicht: [] },
    { handle: 'herren-westen-outdoor', titel: 'Outdoor- & Sportwesten', muss: [A('outdoor|sport|taktisch|multifunktion|multipocket|fitness|lauf|funktion')], nicht: [] },
  ],
};
