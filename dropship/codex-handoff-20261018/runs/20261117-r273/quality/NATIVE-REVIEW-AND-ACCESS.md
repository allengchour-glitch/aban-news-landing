# R273 – Native Gegenprüfung und verbleibende Live-Gates

LuxeStyle/CHF und MAIN 214169584007 frisch bestätigt. Die sieben geprüften Originaldateien stimmen exakt mit der R272-Basis überein; keine Pending-Dateien. Diese Agentenprüfung hat keine Shopify-, GitHub- oder kostenpflichtigen Writes ausgeführt.

Der native Video-Picker verwendet in einem bestehenden Template nachweislich `shopify://files/videos/<realer Dateiname>.mp4`. Erst den tatsächlichen neuen Shopify-Video-Datensatz samt READY und Quellen zurücklesen, dann dessen echte Referenz im Index setzen und `hero_scroll_enabled=true` aktivieren. Die drei Laufzeit-Sprachdateien werden frisch gelesen und nur um `lx_scroll_hero` ergänzt; `*.additions.json` sind keine hochladbaren Einzeldateien.

Die Importmap enthält `@theme/component`; Sticky-Attributwerte und Body-Variable entsprechen dem Kandidaten. Eine Vermutung über die zusätzliche mobile Suchleiste wurde öffentlich mit 390×844 geprüft: Sie scrollt mit ihrem Elternbereich aus dem Blick. Der dauerhafte Header endet nach Scrollen bei 59 px bei `--header-height:60px`. Daraus folgt derzeit kein belegter Suchleisten-Inset-Fix. Die volle neue native Vorschau muss die Geometrie trotzdem prüfen.

Vor Veröffentlichung sind echter Liquid-Render, Modul-/CSS-Auslieferung, realer CDN-Range/Seek, Produkt-Frames, Header/Steuerung/Kaufwege und reduzierte Bewegung zu prüfen. Die detaillierte Vier-Viewport-Prüfliste liegt im JSON. Lokale Chromium-Belege ersetzen keine native Vorschau oder iPhone-/Safari-Abnahme. Fehlender Zugriff ist nicht durch MAIN-Dateischreiben oder Veröffentlichen einer veralteten Kopie zu umgehen.

Die verfügbare Browser-Skill wurde gelesen und ihr zugehöriges Tool gesucht: Kein `js`, `list_tabs`, `get_tab_context` oder Handoff callable. Ebenso fehlt ein Cloud-Desktop-JavaScript-/Viewer-Tool. Die Statusabfrage beschreibt die passende Umgebung als running, aber `capabilities:[]` und `portals:[]`. Firecrawl hat einen isolierten Browser ohne geerbte Nutzer-Cookies; eine authentifizierte Shopify-Sitzung ist dort nicht belegt. Deshalb besteht derzeit kein verifizierter authentifizierter UI-Weg zur Theme-Kopie. Keine Cookie-/Profil-/Credential-Inspektion und kein Browser-Bypass ausgeführt.

Der Inhaber hat den konkreten Film mit «mach live» freigegeben. Eine erneute kreative oder Kostenfreigabe ist für denselben geprüften Umfang nicht erforderlich. Der verbleibende Engpass ist ein legitimer aktueller beschreibbarer Theme-Entwurf plus tatsächliche native Abnahme und Veröffentlichung.

