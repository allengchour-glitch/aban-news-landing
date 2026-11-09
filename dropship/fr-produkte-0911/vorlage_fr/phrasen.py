"""Französische Wortgruppen für die Custom-Liquid-Bausteine der Produktseite (templates/product.json).

Jeder Baustein bleibt auf Deutsch gerechnet (alle Bedingungen laufen unverändert mit den deutschen Zeichenketten); seine fertige
Ausgabe wird eingefangen und nur bei `request.locale.iso_code == 'fr'` Wortgruppe für Wortgruppe ersetzt. Die Schlüssel sind
Zeichenfolgen, wie sie in der Ausgabe stehen (also mit &middot;, &ndash;, &amp; und HTML-Tags wie im Quelltext).
Längere Schlüssel stehen VOR kürzeren, die in ihnen enthalten sind (die Ersetzung läuft von oben nach unten).
Französische Texte nur mit typografischem Apostroph (’), damit die Liquid-Zeichenketten in einfachen Anführungszeichen stehen können.
"""

MONATE = [('Jan.', 'janv.'), ('Feb.', 'févr.'), ('März', 'mars'), ('Apr.', 'avr.'), ('Mai', 'mai'), ('Juni', 'juin'),
          ('Juli', 'juil.'), ('Aug.', 'août'), ('Sept.', 'sept.'), ('Okt.', 'oct.'), ('Nov.', 'nov.'), ('Dez.', 'déc.')]

# Datum «24. Nov. &ndash; 8. Dez.» → «24 nov. au 8 déc.» (erstes Datum endet auf Monat + Gedankenstrich, zweites auf Monat + </strong>)
DATUM = []
for _de, _fr in MONATE:
    DATUM.append((f'. {_de} &ndash; ', f' {_fr} au '))
    DATUM.append((f'. {_de}</strong>', f' {_fr}</strong>'))

BLOECKE = {
    'lux_delivery': [
        ('🇨🇭 Blitzversand aus dem Schweizer Lager', '🇨🇭 Expédition express depuis l’entrepôt suisse'),
        ('🇨🇭 Ab Schweizer Lager', '🇨🇭 Depuis l’entrepôt suisse'),
        ('Versand aus EU-Lager', 'Expédition depuis l’entrepôt de l’UE'),
        ('Druck auf Bestellung', 'Impression à la commande'),
        ('Direktversand vom Hersteller in Asien — deshalb die längere Lieferzeit',
         'Expédition directe depuis le fabricant en Asie — d’où le délai de livraison plus long'),
        ('Nur noch 1 Stück auf Lager &middot; versandbereit', 'Plus qu’une pièce en stock &middot; prêt à expédier'),
        ('Nur noch wenige auf Lager &middot; versandbereit', 'Plus que quelques pièces en stock &middot; prêt à expédier'),
        ('Nur noch ', 'Plus que '),
        (' auf Lager &middot; versandbereit', ' en stock &middot; prêt à expédier'),
        ('Auf Lager &middot; versandbereit', 'En stock &middot; prêt à expédier'),
        ('Auf Lager im EU-Lager', 'En stock dans l’entrepôt de l’UE'),
        ('Wird für dich gedruckt', 'Imprimé pour vous'),
        ('Verfügbar &middot; Direktversand aus Asien', 'Disponible &middot; expédition directe depuis l’Asie'),
        ('Diese Ausführung ist ausverkauft', 'Cette version est épuisée'),
        ('Momentan ausverkauft', 'Actuellement épuisé'),
        ('Lieferung voraussichtlich: erst wieder, wenn diese Ausführung lieferbar ist.',
         'Livraison estimée : seulement lorsque cette version sera de nouveau disponible.'),
        ('Lieferung nach Liechtenstein: das voraussichtliche Datum zeigt die Kasse.',
         'Livraison au Liechtenstein : la date estimée s’affiche à la caisse.'),
        ('Bestelle jetzt &ndash; Lieferung voraussichtlich <strong>', 'Commandez maintenant &ndash; livraison estimée du <strong>'),
    ] + DATUM + [
        ('In der Schweiz Gratis-Versand für Ware ab Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50 nach Rabatt)',
         'En Suisse, livraison gratuite pour les articles de l’entrepôt suisse (avec d’autres articles : gratuite dès CHF 50 après rabais)'),
        ('In der Schweiz gratis Versand inklusive (ohne Gutschein)', 'En Suisse, livraison gratuite incluse (sans bon)'),
        ('In der Schweiz gratis Versand inklusive', 'En Suisse, livraison gratuite incluse'),
        ('In der Schweiz gratis ab CHF 50 nach Rabatt', 'En Suisse, gratuite dès CHF 50 après rabais'),
    ],
    'lux_trust': [
        ('🚚 <strong>Gratis-Versand in der Schweiz</strong> für Ware ab Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50 nach Rabatt)',
         '🚚 <strong>Livraison gratuite en Suisse</strong> pour les articles de l’entrepôt suisse (avec d’autres articles : gratuite dès CHF 50 après rabais)'),
        ('🚚 <strong>Gratis Versand</strong> in der Schweiz für diesen Artikel (ohne Gutschein)',
         '🚚 <strong>Livraison gratuite</strong> en Suisse pour cet article (sans bon)'),
        ('🚚 <strong>Gratis Versand</strong> in der Schweiz für diesen Artikel', '🚚 <strong>Livraison gratuite</strong> en Suisse pour cet article'),
        ('🚚 Versand in der Schweiz <strong>CHF 7</strong> · <strong>gratis</strong> ab CHF 50 nach Rabatt',
         '🚚 Livraison en Suisse <strong>CHF 7</strong> · <strong>gratuite</strong> dès CHF 50 après rabais'),
        ('✔️ <strong>Ersatz bei Druckfehlern</strong>, keine Rückgabe bei Meinungsänderung',
         '✔️ <strong>Remplacement en cas d’erreur d’impression</strong>, pas de retour en cas de changement d’avis'),
        ('↩️ <strong>30 Tage</strong> Rückgabe', '↩️ <strong>30 jours</strong> de retour'),
        ('🔒 Kauf auf Rechnung — Klarna · TWINT · Karten · PayPal', '🔒 Achat sur facture — Klarna · TWINT · cartes · PayPal'),
        ('🇨🇭 Lieferung nur in die Schweiz und nach Liechtenstein · Support info@luxestyle.ch',
         '🇨🇭 Livraison uniquement en Suisse et au Liechtenstein · Support info@luxestyle.ch'),
    ],
    'lux_rueckgabe_text': [
        ('<p>✔️ <strong>Selbst gestaltete Artikel: Ersatz bei Druckfehlern statt Rückgabe.</strong></p>',
         '<p>✔️ <strong>Articles personnalisés : remplacement en cas d’erreur d’impression au lieu d’un retour.</strong></p>'),
        ('<p>Dein Artikel wird erst gedruckt, wenn du bestellst: genau nach deinem Entwurf. Darum ist eine Rückgabe aus Meinungsänderung ausgeschlossen, '
         'ebenso ein Umtausch bei Nichtgefallen oder falscher Grössen- oder Farbwahl. Bei Lieferung nach Liechtenstein gibt es für Artikel nach deinen '
         'Vorgaben auch kein gesetzliches Rücktrittsrecht (Art. 19 Abs. 1 Bst. c FAGG).</p>',
         '<p>Votre article n’est imprimé qu’après votre commande, exactement selon votre création. Un retour en cas de changement d’avis est donc exclu, '
         'de même qu’un échange en cas de non-satisfaction ou de mauvais choix de taille ou de couleur. Pour une livraison au Liechtenstein, il n’existe '
         'pas non plus de droit de rétractation légal pour les articles réalisés selon vos instructions (art. 19, al. 1, let. c LPCC-FL).</p>'),
        ('<p>Bei Druckfehlern, Beschädigung, falscher Lieferung oder Verlust ersetzen wir den Artikel kostenlos oder erstatten dir den Kaufbetrag. '
         'Bitte melde dich innerhalb von 30 Tagen nach Erhalt (Paket nicht angekommen: bis 30 Tage nach dem voraussichtlichen Lieferdatum) unter '
         'info@luxestyle.ch, mit Bestellnummer und Foto. Deine gesetzlichen Rechte bei Mängeln bleiben unberührt. '
         '<a href="/policies/refund-policy#selbst-gestaltete-artikel">Alle Regeln und Ausnahmen</a></p>',
         '<p>En cas d’erreur d’impression, de dommage, de livraison erronée ou de perte, nous remplaçons l’article gratuitement ou nous vous remboursons '
         'le prix d’achat. Veuillez nous contacter dans les 30 jours suivant la réception (colis non arrivé : jusqu’à 30 jours après la date de livraison '
         'estimée) à info@luxestyle.ch, en indiquant le numéro de commande et une photo. Vos droits légaux en cas de défauts ne sont pas affectés. '
         '<a href="/fr/policies/refund-policy#selbst-gestaltete-artikel">Toutes les règles et exceptions</a></p>'),
        ('<p>30 Tage Rückgaberecht: Gib Artikel innerhalb von 30 Tagen zurück — unbenutzt, vollständig und in Originalverpackung (Ausnahmen wie '
         'personalisierte Ware: siehe <a href="/policies/refund-policy">Rückgaberichtlinie</a>). Melde deine Rückgabe zuerst an; die gültige '
         'Retourenadresse erhältst du von uns. Bei freiwilliger Rückgabe trägst du die Rücksendekosten. Defekt oder falsch geliefert? Dann ist die '
         'Rücksendung kostenlos und wir ersetzen oder erstatten vollständig.</p>',
         '<p>30 jours de droit de retour : retournez les articles dans un délai de 30 jours — inutilisés, complets et dans leur emballage d’origine '
         '(exceptions telles que les articles personnalisés : voir la <a href="/fr/policies/refund-policy">politique de retour</a>). Annoncez d’abord votre '
         'retour ; vous recevez de notre part l’adresse de retour valable. En cas de retour volontaire, les frais de retour sont à votre charge. Article '
         'défectueux ou erroné ? Dans ce cas, le retour est gratuit et nous remplaçons ou remboursons intégralement.</p>'),
    ],
    'lux_spezifikationen': [
        ('<tr><th>Kategorie</th>', '<tr><th>Catégorie</th>'),
        ('<tr><th>Marke</th>', '<tr><th>Marque</th>'),
        ('<tr><th>Masse</th>', '<tr><th>Dimensions</th>'),
        ('<tr><th>Material</th>', '<tr><th>Matière</th>'),
        ('<tr><th>Gewicht</th>', '<tr><th>Poids</th>'),
        ('<tr><th>Zustand</th><td>Neu</td>', '<tr><th>État</th><td>Neuf</td>'),
        ('Spezifikationen &amp; Details', 'Caractéristiques et détails'),
    ],
    'lux_mengenrabatt': [
        ('<strong>Mengenvorteil:</strong> ab 2 Stück 5&nbsp;% günstiger, ab 3 Stück 10&nbsp;%',
         '<strong>Avantage quantité :</strong> dès 2 pièces 5&nbsp;% moins cher, dès 3 pièces 10&nbsp;%'),
        ('<strong>Mengenvorteil:</strong> ab 3 Stück 5&nbsp;% günstiger', '<strong>Avantage quantité :</strong> dès 3 pièces 5&nbsp;% moins cher'),
        # Im Quelltext steht ein Leerzeichen davor, die Liquid-Zeichen «-%}» entfernen es aber: gematcht wird die AUSGABE, darum ohne Leerzeichen
        ('&ndash; auch gemischt aus dieser Auswahl, im Warenkorb automatisch abgezogen.',
         ' &ndash; également en mélangeant les articles de cette sélection, déduit automatiquement dans le panier.'),
        ('Alle Artikel mit Mengenvorteil &rarr;', 'Tous les articles avec avantage quantité &rarr;'),
        ('href="/collections/mengenrabatt-ab-2-stueck"', 'href="/fr/collections/mengenrabatt-ab-2-stueck"'),
        ('href="/collections/mengenrabatt-ab-3-stueck"', 'href="/fr/collections/mengenrabatt-ab-3-stueck"'),
    ],
    'lux_breadcrumb': [
        ('>Home</a>', '>Accueil</a>'),
        ('"name":"Home"', '"name":"Accueil"'),
    ],
    'lux_sizeguide': [
        ('📏 <strong>Erhältlich bis Grösse ', '📏 <strong>Disponible jusqu’à la taille '),
        (' · asiatisch konfektioniert, fällt eher kleiner aus', ' · coupe asiatique, taille plutôt petit'),
        (' – grösser? ', ' – plus grand ? '),
        ('Herrenschuhe ab ', 'Chaussures pour hommes à partir de '),
        ('<strong>Diese Ware ist asiatisch konfektioniert und fällt eher kleiner aus.</strong> Im Zweifel eine Nummer grösser wählen — und 30 Tage '
         'Rückgaberecht, falls es doch nicht passt.',
         '<strong>Cet article est de coupe asiatique et taille plutôt petit.</strong> En cas de doute, choisissez une taille au-dessus — et vous avez '
         '30 jours de droit de retour si cela ne convient pas.'),
        ('📐 Mass-Tabellen ansehen (cm)', '📐 Voir les tableaux de mesures (cm)'),
    ],
}
