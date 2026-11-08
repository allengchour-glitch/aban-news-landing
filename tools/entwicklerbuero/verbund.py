"""Öffentliche Angebote mit Zuständigkeit und nächsten Prüfschritten verbinden."""
PROJEKTE = [
    ('kits', 'KI-Starter-Kits', 'Shop', 'produkt', '/shop', 'Stripe-Kaufbuttons vorhanden', 'Kaufweg und geschützte Lieferung eines vorhandenen Kits prüfen.'),
    ('finanzen', 'Finanz- und Alltagspakete', 'Shop', 'produkt', '/finanz-kompass-schweiz', 'Stripe-Kaufbutton vorhanden', 'Finanz-, Budget-, Schulden-, Mietzins-, Umzugs-, Krankenkassen- und Pensionspakete im Shop gemeinsam prüfen.'),
    ('cockpit', 'Business-Cockpit', 'Entwicklerbüro', 'entwicklung', '/business-cockpit', 'Gratis-App und Pro-Kaufweg vorhanden', 'Pro-Lizenz und Extras gegen die Kaufbeschreibung prüfen; vom KI-Studio unterscheiden.'),
    ('studio', 'KI-Studio', 'Entwicklerbüro', 'entwicklung', '/ki-studio', 'Abo-Kaufweg vorhanden', 'Demo, Lizenzfreischaltung und Modellbetrieb getrennt prüfen.'),
    ('monitor', 'Sichtbarkeits-Monitor', 'Entwicklerbüro', 'integration', '/ki-sichtbarkeit-monitor', 'Abo-Kaufbutton vorhanden', 'Einrichtung, geplanten Reportlauf und tatsächliche Lieferung nachweisen.'),
    ('audit', 'Sichtbarkeits-Workbook', 'Entwicklerbüro', 'zahlung', '/ki-sichtbarkeit-audit', 'Bestellung per E-Mail', 'Falschen Produktweg vom Pro-Audit zum Workbook prüfen und korrigieren.'),
    ('sichtbarkeit', 'Sichtbarkeits-Komplettpaket', 'Shop', 'zahlung', '/ki-sichtbarkeit-paket', 'Bestellung per E-Mail', 'Eigenen Checkout, Download und Monitor-Einrichtung zuordnen und prüfen.'),
    ('notfall', 'Notfall-Ordner', 'Shop', 'zahlung', '/notfall-ordner', 'Bestellung per E-Mail', 'Eigenen Kaufweg und geschützte PDF-Lieferung vor Automatisierung prüfen.'),
    ('automation', 'Automationen für Unternehmen', 'Entwicklerbüro', 'automation', '/ki-automation', 'Anfrageweg vorhanden', 'E-Mail-, Kommentar- und Angebots-Assistenten zu einem begrenzten Kundenpilot verbinden; Zugänge und Abnahme fehlen.'),
    ('services', 'Websites, Shops und Texte', 'Entwicklerbüro', 'produkt', '/leistungen', 'Anfrageweg vorhanden', 'Anfrage, klaren Leistungsumfang und passende Übergabe vorbereiten.'),
    ('buecher', 'Bücher und Trilogie', 'Social Media', 'redaktion', '/buch', 'Kostenlose Downloads vorhanden', 'Amazon-Platzhalter und widersprüchliche Verfügbarkeitsangaben prüfen; Trilogie und weitere Bücher passend verlinken.'),
    ('newsletter', 'Newsletter und Gratis-Werkzeuge', 'Social Media', 'marketing', '/', 'Inhalte und Anmeldeweg vorhanden', 'Passende eigene Produkte aus Ratgebern und Werkzeugen erreichbar machen; Wirkung messen.'),
    ('luxestyle', 'LuxeStyle', 'Shop', 'sortiment', '/luxestyle', 'Shop-Verlinkung vorhanden', 'Bestehenden Shop-Ablauf nutzen und Kaufhindernisse nachweisen; keine parallelen Publisher starten.'),
    ('marktplatz', 'Marktplatz und Affiliate-Angebote', 'Social Media', 'marketing', '/marktplatz', 'Such- und Weiterleitungswege vorhanden', 'Relevante Angebote und funktionierende Weiterleitungen prüfen; Provisionen getrennt nachweisen.'),
]


def katalog():
    return [dict(zip(('id','name','buero','rolle','pfad','verkaufsweg','naechster'), p),
                 messung='Käufe, Lieferung und Ertrag nicht durch den Link bestätigt.') for p in PROJEKTE]


def aufgaben():
    return [dict(id='verbund_'+p['id'], titel=p['name']+': Verkaufsweg prüfen',
                 rolle=p['rolle'], grund=p['naechster'], prioritaet=2 if p['id']=='audit' else 4)
            for p in katalog()]
