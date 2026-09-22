---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-21 · 🧭 Menü und Dubletten; 🧭 Drei tote Landeseiten; 2026-09-22 · Nachtrag 2
gelernt: 2026-09-22
---
# Vor Umleiten oder Abmelden: bestehende 301 und Veröffentlichungsstand lesen

Beim Yoga-Paar war /collections/yoga schon eine 301 auf yoga-pilates, der Gewinner wurde abgemeldet («Target can't redirect to another redirect»); drei weitere Verlierer hatten die 301 längst. Das naheliegende Ziel schuhe-sandalen (1'611 Produkte) ist NICHT veröffentlicht — eine Weiterleitung dorthin wäre ein 404 gewesen; /collections/gadgets ist selbst eine 301. Messfallen: publishedOnCurrentPublication kennt die Custom-App nicht und kippt die GANZE Antwort; Menü-Einträge vom Typ COLLECTION zeigt die API als /en/collections/…, die Storefront rendert sie richtig → einheitlich Typ HTTP. Regel: Redirect-Liste und published_status:published (mit Köder-Handle, der False liefert) VOR jedem Abmelden/Umleiten; Ziel darf weder unveröffentlicht noch selbst eine 301 sein.

Verwandt: [[Hypothese-mit-Datum]]
