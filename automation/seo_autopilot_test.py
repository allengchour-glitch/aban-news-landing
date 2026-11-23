"""Selbsttest seo_autopilot (23.11.2026): Produktblock nur bei Kopf-Treffer im Titel; Rücklesen ohne Leerraum. Aufruf aus Repo-Wurzel: python3 automation/seo_autopilot_test.py"""
import sys,os; sys.path.insert(0,'automation'); os.environ.pop('SCHARF',None)
import importlib.util
spec=importlib.util.spec_from_file_location('sa','automation/seo_autopilot.py'); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
F=[('Wickel','Rizinusöl-Wickel wiederverwendbar · Bauch & Nacken',True),('Wickel','Polka-Dot Wickel-Rock',False),('Wickel','Wickelbluse mit V-Ausschnitt',False),
   ('Wickel','7-Chakra Wickelarmband',False),('Wickel','Wickelkleid Midi',False),('Wickel','Bauchwickel für Rizinusöl',True),
   ('Kerzen','Duftkerze im Glas',True),('Kerzen','Kerzenhalter aus Messing',False),('Lampen','Himalaya Salzlampe 3 kg',True),('Lampen','Lampenschirm Leinen',False),
   ('Seidenkissenbezug','Seidenkissenbezug 100% Maulbeerseide',True),('Henkeltasche','Henkeltaschen-Set',False),('Henkeltasche','Damen Henkeltasche Leder',True),
   ('Gesichtsreiniger','Sanfter Gesichtsreiniger 150 ml',True),('Geschenkset','Geschenksets für Männer',True),('Chronograph','Chronograph Herrenuhr',True),
   ('Elektronik','Multifunktionales Reparatur-Set für Elektronik',False),('Elektronik','Reise-Organizer für Elektronik',False),
   ('Kerzen','Aromatherapie Kerzen- & Seifenform',False),('Kerzen','Silikonform Häschenohren – Backen & Kerzen giessen',False),('Kerzen','Schaumform für Kerzen',False),
   ('Kerzen','Silikonform Muschel-Kerzen',False),('Kerzen','Duftkerzen 3er-Set Vanille',True),('Kerzen','Set Duftkerzen Vanille',True),
   ('Gesichtspflege','LED-Farblicht-Pflaster für die Gesichtspflege',False),('Gesichtspflege','Kupfer Peptid Gesichtspflege Liquid',True),('Crossbody','Elegante Umhängetasche in Lack-Optik – Crossbody, kompakt (3 Farben)',True),('Seidenkissenbezug','Satin-Seidenkissenbezug 2er-Set – sanft zu Haut & Haar',True)]
bad=[(w,t,e) for w,t,e in F if m.titel_traegt(w,t)!=e]
print('titel_traegt: Fälle',len(F),'falsch',bad)
assert m.body_gleich('<ul><li>a</li></ul>','<ul>\n<li>a</li>\n</ul>') and not m.body_gleich('<p>a</p>','<p>b</p>')
assert m.ERWACHSENE.search(m.norm('Männer-Geschenke unter 50 CHF')) and m.KIND.search(m.norm('Winter-Geschenkset für Kinder'))
sys.exit(1 if bad else 0)
