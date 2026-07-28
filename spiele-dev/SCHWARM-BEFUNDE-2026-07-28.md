# Schwarm-Befunde Traumhaus + Koop (2026-07-28)

Zwei Agenten-Schwaerme, jeder Befund anschliessend adversarisch gegengeprueft.

Nur was die Gegenpruefung ueberlebt hat, steht hier.


- **Mechanik-Schwarm:** 94 Agenten, 78 Befunde, **72 haltbar**, 6 widerlegt
- **Koop-Schwarm:** 73 Agenten, 56 Befunde, **46 haltbar**, 10 widerlegt


## Bereits behoben (in `main`)

- Bewegungsgrenze +-150 sperrte alle neuen Viertel aus (PR #2115)
- Achterbahn-Mitfahrt ignorierte die Bahnhoehe (PR #2115)
- _lampGlows ueberschrieben -> Lichtkegel aller Hauptstrassen-Laternen aus (PR #2115)
- Villa-Vorlage als Geldpresse, Boden-Doppelbuchung, Angel-Sperre (PR #2115)
- Tasten haengen nach Fenster-Wechsel, Tankstellen-Kollider (PR #2116)
- Zombie-Peer besetzte die Raum-ID dauerhaft (PR #2120)

## Koop-Befunde (offen)


### HOCH (30)


**Quick-Match verklemmt: beide Spieler hosten denselben Public-Raum auf unterschiedlichen Brokern und warten ewig**  
`mp.js` Zeile 319

- Ablauf: Der Broker-Index `aban_broker` liegt pro Gerät im localStorage (Z.36-42) und wird NIE zwischen den Geräten abgeglichen. Gerät A steht auf Index 0 (PeerJS-Cloud), Gerät B auf Index 1 (peerjs.92k.de) — das passiert schon nach einem einzigen früheren Netzfehler (Z.189 kippt den Index bei jedem network/socket-error). Beide tippen jetzt gleichzeitig auf «⚡ Zufalls-Match» (neon-zusammen.html:328 `MP.quick("tempel2")`, ebenso neon-dungeon.html:364, neon-wildnis.html:4995). Phase 0 = join: A sucht Raum PUBA/tempel2 auf Broker 0 → peer-unavailable → `retried` → mpNextBroker → Index 1 → wieder peer-unav

- Fix: Der Host-Zweig braucht einen Lebenszeit-Timeout bzw. `quick` muss die Host-Phase nach n Sekunden ohne Gast selbst schliessen (`goNext` auch aus einem Timer heraus, nicht nur aus Status "closed"). Zusätzlich den Broker für feste Public-Räume deterministisch aus dem Raum/gameId ableiten statt aus dem geräte-lokalen `aban_broker` — oder beim Hosten eines Public-Raums nacheinander auf ALLEN Brokern in


**peer.destroy() weckt den Peer über den disconnected-Handler wieder auf → Zombie besetzt die Raum-ID dauerhaft**  
`mp.js` Zeile 185

- Ablauf: PeerJS 1.5.4 (js/vendor/peerjs.min.js): destroy(){this.destroyed||(this.disconnect(),this._cleanup(),this._destroyed=!0,...)} — disconnect() feuert 'disconnected' SYNCHRON, während _destroyed noch false ist. Der Handler in Zeile 185 prüft nur byUs und pInst===peer, beides trifft zu, und ruft pInst.reconnect(). reconnect() sieht disconnected=true, destroyed=false → _disconnected=false + _initialize(_lastServerId) → NEUER WebSocket registriert dieselbe Peer-ID erneut beim Broker. Erst danach läuft destroy() weiter: _cleanup() macht nur socket.removeAllListeners() — die Socket-Instanz samt WebSoc

- Fix: Ein eigenes Sterbe-Flag setzen und im Handler prüfen, statt sich auf byUs/destroyed zu verlassen: var dying=false; function killPeer(p){dying=true;try{p.destroy();}catch(e){}} und in fail/giveUp/Broker-Retry/unavailable-id/peer-unavailable nur noch killPeer(peer) aufrufen; Handler: pInst.on('disconnected',function(){ if(byUs||dying||pInst!==peer) return; try{pInst.reconnect();}catch(e){} }). Beim 


**Reconnect-Slot ohne Identitätsprüfung: Fremder übernimmt die laufende Runde, echter Partner wird ausgesperrt**  
`mp.js` Zeile 181

- Ablauf: lost() setzt beim Host main=null (Zeile 148), damit der Gast zurückkommen kann. peer.on('connection') nimmt danach aber JEDE eingehende Verbindung an — für den fast-Kanal wird in Zeile 177 explizit conn.peer!==main.peer geprüft, für den main-Kanal gibt es keinerlei Prüfung, wer da zurückkommt. Ablauf: A und B spielen neon-wildnis über MP.quick('wildnis') (fester, im Seitenquelltext stehender Raumname, kein Rätselraten nötig). B's Verbindung reisst kurz ab; A's Watchdog feuert nach 6s → lost() → beide Kanäle zu, main=null, A hält den Slot bis zu ~56s offen. In diesem Fenster tippt ein dritter B

- Fix: Vor dem Freigeben des Slots die Gegenstelle merken und im Reconnect-Fenster nur diese akzeptieren: in lost() 'lastPeerId = main && main.peer' vor main=null; in peer.on('connection') für den main-Kanal 'if (lastPeerId && conn.peer !== lastPeerId && S.status === "lost") { try{conn.close();}catch(e){} return; }' (lastPeerId beim endgültigen giveUp bzw. bei einem frischen 'waiting' wieder löschen). Er


**Gast-Reconnect schliesst die alten Kanäle nicht → alter fast-Kanal füttert weiter den Host-Watchdog**  
`mp.js` Zeile 153

- Ablauf: Im Gast-Zweig von lost() wird nur ein NEUES main via peer.connect() erzeugt; das alte main und vor allem das alte fast werden nie geschlossen (der Host-Zweig darüber, Zeile 145-147, macht genau das explizit — Kommentar 'Schwarm-P0'). In PeerJS 1.x hat jede DataConnection eine eigene RTCPeerConnection, d.h. der alte fast-Kanal bleibt am Leben, solange die Gast-Seite läuft. Ablauf mit zwei Spielern: Host (Handy) wechselt für 10s die App / sperrt den Bildschirm → Host sendet nichts mehr (rAF/Timer eingefroren). Gast-Watchdog (Zeile 90) feuert nach 6s → lost(). Der Gast spammt aber weiter über S.s

- Fix: Im else-Zweig von lost() vor peer.connect() dasselbe tun wie im Host-Zweig: try{if(main)main.close();}catch(e){} try{if(fast)fast.close();}catch(e){} fast=null; main=null; — damit bekommt der Host ein close-Event auf seinem main, gibt den Slot frei und der Kanal-Spam auf dem Zombie-fast hört auf.


**Host weist den Reconnect DESSELBEN Gastes als 'Raum voll' ab (keine Peer-Identität beim main-Slot)**  
`mp.js` Zeile 181

- Ablauf: peer.on('connection') prüft für label 'fast' korrekt die Identität (Zeile 177: conn.peer !== main.peer), für den main-Kanal aber nur 'if (main) { conn.close(); return; }'. Zwei Spieler: der Gast verliert 6s lang Daten (Host im Hintergrund / kurzer Funkloch-Moment) und ruft lost() auf. Der Gast startet nach 600ms einen neuen main zum selben Host. Der Host hält seinen alten (aus seiner Sicht noch offenen) main → die neue Verbindung wird sofort geschlossen. Der Gast erfährt davon nichts (PeerJS meldet ein close auf einer nie geöffneten Verbindung nicht an die Gegenseite) und läuft in seinen Kette

- Fix: Analog zu Zeile 177 die Peer-Identität auswerten: if (main && main.peer === conn.peer) { try{main.close();}catch(e){} try{if(fast)fast.close();}catch(e){} fast=null; main=conn; wireMain(conn); return; } — der wiederkehrende Gast ersetzt seine eigene Stale-Verbindung, nur FREMDE Peers werden mit conn.close() abgewiesen.


**„Solo bauen" beendet die laufende Host-Session nicht — Solo-Fortschritt landet im Koop-Slot und ein Fremder kann mitten hineinspringen**  
`traumhaus.html` Zeile 5510

- Ablauf: Der Solo-Button liegt AUSSERHALB von #netSetup/#mpLobby (Zeile 255 vs. 256-269) und bleibt darum sichtbar, während die Koop-Lobby offen ist. Spieler A klickt „Raum erstellen" (Zeile 5526: MPs=MP.host(...), mpHost=true), sieht den Code, wartet, wird ungeduldig und klickt „🏡 Solo bauen ▶". Der soloBtn-Handler (5510-5515) setzt MPs/mpHost NICHT zurück und ruft nur startGame(). Folge 1: In startGame prüft Zeile 5503 `if(MPs)` → Chat/netBadge/Partner-Leiste erscheinen im vermeintlichen Solo-Spiel. Folge 2: saveGame() (Zeile 5487) schreibt wegen `MPs?"th_save_coop":SAVE` alle 6 s (Zeile 5693) in den

- Fix: Im soloBtn-Handler zuerst die Netz-Session abräumen: `try{if(MPs)MPs.close();}catch(e){} MPs=null; mpHost=false;` und die Lobby-UI (#mpLobby aus, #netSetup an) zurücksetzen, bevor loadSnapshot/startGame läuft. Zusätzlich den Solo-Button ausblenden (oder deaktivieren), solange eine Lobby offen ist.


**Villa-Gratis-Markierung ist rein lokal – der Partner reißt die Villa für ~3x den Kaufpreis ab**  
`traumhaus.html` Zeile 5612

- Ablauf: stampVilla() zieht 3500 $ ab und markiert alle gestempelten Teile als gratis: Böden/Wände in window._gratisBau (5614/5616), Möbel per _neu.gratis=1 (5618). Diese Marke existiert NUR im Tab des Stemplers. Über das Netz gehen nur die Einzelbefehle {t:'floor'}, {t:'wall'}, {t:'furn'} (3480-3482) – ohne gratis-Flag; snapshot() (3569) überträgt es ebenfalls nicht. Ablauf: Host geht in den Bau-Modus, tippt 🏰 Villa (−3500 $ aus der gemeinsamen Kasse). Der Gast sieht die Villa, schaltet auf 🔨 Bauen + 🗑️, und löscht die Villa-Teile. Bei ihm greift in doDelete der Gratis-Check nicht (3486/3490: window._

- Fix: gratis-Flag mitübertragen: in doPlaceFurn ein g:1 ins {t:'furn'}-Paket aufnehmen und beim Empfänger auf den furn-Record setzen; für Böden/Wände ein eigenes {t:'gratis',k:...} senden bzw. die _gratisBau-Keys in snapshot() aufnehmen und in loadSnapshot wiederherstellen. Robuster: statt Flags den Rückerstattungsbetrag pro Zelle speichern (rueck:0 für Villa-Teile).


**Gast-Figur ist täglich von 09:00 bis 17:00 eingefroren und unsichtbar**  
`traumhaus.html` Zeile 4343

- Ablauf: updWork läuft nur beim Host (4339). Ab 09:00 setzt es für alle sims außer sims[0] state='work', mesh.visible=false (4343-4345) – im Koop ist sims[1] aber die Spielfigur des Gasts, nicht die NPC-Mia. In updSim bricht der Host für diese Figur sofort ab (4630 'if(s.state==="work")return;'), noch bevor steerVec(1) die netSteer-Daten des Gasts auswertet (4845). Ablauf: Host und Gast verbinden sich, im Spiel wird es 09:00 (uhrzeit+=dt*4, 5633 – ca. alle 6 Realminuten ein Tag). Der Gast bewegt den Joystick, sein {t:'steer'}-Paket kommt an (3646, netSteer wird gesetzt), aber die Figur rührt sich nicht

- Fix: In updWork die Spielfigur des Gasts ausnehmen: 'if(i2===0||(MPs&&i2===1))return;' – bei aktiver Koop-Verbindung darf nur eine echte NPC-Mia zur Arbeit gehen. Alternativ in updSim die work-Sperre nur greifen lassen, wenn kein netSteer-Input vorliegt.


**Markthalle: Gast verkauft dieselbe Ernte endlos, weil der Host stats.ernten zurückspielt**  
`traumhaus.html` Zeile 5147

- Ablauf: Der Markthallen-Button hat keine Host-Prüfung (4083: nur inMarkt && stats.ernten>0). Beim Klick macht der Gast 'geld+=erloes; stats.ernten=0; geldSend()' – geldSend schickt das Plus-Delta an den Host, die gemeinsame Kasse wächst wirklich. stats.ernten=0 bleibt aber lokal: es gibt keine Netz-Meldung dafür, und der Host broadcastet alle 8 netTicks (~2,8 s) sein komplettes stats-Objekt (5690 'st:stats'), das der Gast in 3656 ungeprüft übernimmt. Ablauf: Host lässt Beete reifen und erntet ein paar Mal (4120 stats.ernten++). Der Gast läuft zur Markthalle (-26/95), tippt 🥕 Ernte verkaufen → z. B. +3

- Fix: Verkauf autoritativ beim Host abwickeln: Gast sendet {t:'markt'}, der Host prüft stats.ernten, bucht geld und setzt stats.ernten=0; der Button beim Gast schickt nur die Anfrage. Minimal-Fix: Button-Anzeige und Handler auf (!MPs||mpHost) begrenzen, analog zum kircheBtn (4096).


**Coup-Tageslimit greift beim Gast nie – unbegrenzte Beute-Züge pro Nacht**  
`traumhaus.html` Zeile 4050

- Ablauf: finishCrime bricht beim Gast in 4045 ab ('if(MPs&&!mpHost)return;'). Der Zähler window._coupHeute/_coupTag wird aber erst danach in 4050 hochgezählt – beim Gast also nie. Das Limit wird nur in startCrime geprüft, und nur wenn silent falsch ist (4032). Ablauf: Nacht (21:00–05:00), Gast tippt 🕶️, wählt einen Job, spielt das Tresor-Minispiel. crimeGo (5450) schickt {t:'crimeAsk'} und startet nach 10 s (oder sofort bei crimeJoin) startCrime(ji,false) – die Limit-Prüfung läuft, _coupHeute ist beim Gast aber immer undefined → passiert. Der Gast sendet {t:'crimeGo'}, der Host führt startCrime(m.j,m.a

- Fix: Zähler vor den Host-Return ziehen (also vor Zeile 4045 hochzählen) und die Limit-Prüfung autoritativ beim Host in startCrime auch für silent-Aufrufe machen: bei Überschreitung den Coup ablehnen und ein {t:'crimeDeny'} zurückschicken, das der Gast auswertet.


**Villa-Vorlage: „gratis"-Markierung wird nie übertragen → Geld-Duplikation**  
`traumhaus.html` Zeile 5612

- Ablauf: stampVilla() zieht 3500 $ ab und markiert alle gestempelten Teile NUR lokal: window._gratisBau["f"+fkey] / ["w"+key] (Z. 5612–5616) und _neu.gratis=1 (Z. 5618). Über das Netz gehen aber nur die nackten Nachrichten {t:"wall"}, {t:"floor"}, {t:"furn"} (doPlaceWall/doPlaceFloor/doPlaceFurn, Z. 3480–3482) — ohne Gratis-Flag. Ablauf: Host tippt im Bau-Modus „🏰 Villa-Vorlage · 3500 $". Beim Gast entstehen 280 Böden, ~200 Wände und 31 Möbel als GANZ NORMALE, bezahlte Objekte. Der Gast schaltet 🧨 Abreißen ein und tippt die Villa ab. Beim Gast greift die Sperre in doDelete nicht (Z. 3486: !(window._gra

- Fix: Das Gratis-Flag in die Nachrichten aufnehmen: netSend({t:"furn",…,g:1}) bzw. {t:"wall"/"floor",…,g:1} und im Empfänger (onNetMsg Z. 3601–3605 → doPlaceWall/doPlaceFloor/doPlaceFurn) window._gratisBau bzw. rec.gratis genauso setzen. Alternativ stampVilla nicht als Einzelnachrichten senden, sondern als eigene Nachricht {t:"villa",ax,ay}, die der Empfänger mit derselben Funktion (inkl. Markierung) au


**Gast umgeht das Tageslimit für Verbrechen komplett (unbegrenzte Bank-Coups)**  
`traumhaus.html` Zeile 4045

- Ablauf: finishCrime() steigt beim Gast früh aus (Z. 4045: if(MPs&&!mpHost)return;) — die Zeile darunter (Z. 4050) zählt window._coupHeute/_coupTag hoch. Beim Gast bleibt _coupTag also für immer undefined, sein Limit-Check in startCrime (Z. 4032: if(!silent && window._coupTag===tag && (window._coupHeute||0)>=2)) ist nie wahr. Auf der Host-Seite wird startCrime durch die Netznachricht mit silent=true aufgerufen (onNetMsg Z. 3668: startCrime(m.j,m.a,true)), womit der Check dort per Konstruktion übersprungen wird. Ablauf: Es ist Spielzeit ≥21:00. Der Gast tippt „🕶️ Krummes Ding drehen…", wählt BANK-COUP, 

- Fix: Das Tageslimit muss dort geprüft werden, wo die Auszahlung passiert. In startCrime den Check auch im silent-Pfad ausführen, wenn mpHost (bzw. in finishCrime vor der Auszahlung erneut prüfen und bei Überschreitung 0 auszahlen), und den Zählerstand mit {t:"coupCount",n:…} an den Gast spiegeln, damit dessen crimeAvailable()/startCrime dieselbe Wahrheit sieht.


**Markthalle: Gast kann dieselbe Ernte im 3-Sekunden-Takt endlos verkaufen**  
`traumhaus.html` Zeile 5147

- Ablauf: Der Host überschreibt beim Gast alle ~2,8 s das komplette stats-Objekt (Loop Z. 5690: netSend({t:"love",…,st:stats}); Empfänger Z. 3656: if(m.st)stats=m.st;). Der Markthallen-Verkauf ist aber nicht gehostet: markthalleBtn.onclick (Z. 5144–5150) liest e9=stats.ernten, bucht geld+=erloes, ruft geldSend() (Delta geht ins gemeinsame Konto) und setzt stats.ernten=0 NUR lokal — es gibt keine Netznachricht dafür (vgl. die Nachrichtenliste in onNetMsg: growSold/fisch/dieb/busk/moebelStat existieren, ein „ernten"-Reset nicht). Ablauf: Host lässt ein Gemüsebeet reifen, ein Bewohner erntet (updBeete Z. 3

- Fix: Analog zu growReset/growSold eine Nachricht einführen: der Gast sendet {t:"ernteSell"}, der Host berechnet Erlös aus SEINEM stats.ernten, setzt ihn auf 0, bucht geld und sendet geldSend(); der Gast bucht selbst nichts. Alternativ den Button beim Gast nur anzeigen, wenn (!MPs||mpHost) — wie bei kircheBtn (Z. 4096) bereits gemacht.


**Villa-Vorlage: gratis-Markierung wird nicht übertragen — Partner reisst sie für ~9200 $ ab (3500 $ Einsatz)**  
`traumhaus.html` Zeile 5614

- Ablauf: stampVilla() zieht 3500 $ ab (Z. 5609) und markiert danach jede gestempelte Zelle als gratis: window._gratisBau["f"+key] (Z. 5614), window._gratisBau["w"+key] (Z. 5616) und _neu.gratis=1 (Z. 5617). Diese Markierung ist eine reine LOKALE Variable des Käufers. Die Villa selbst wird über doPlaceFloor/doPlaceWall/doPlaceFurn (Z. 3480-3482) als {t:"floor"|"wall"|"furn"} an den Partner geschickt, der sie mit silent=true anwendet — ohne _gratisBau, ohne .gratis. Ablauf: (1) Host geht in den Bau-Modus, tippt "🏰 Villa-Vorlage · 3500 $" (villaBtn ist für beide sichtbar, Z. 5680). (2) Beim Gast erscheint

- Fix: gratis/_gratisBau ins Netz-Protokoll aufnehmen: doPlaceFurn ein Feld g:1 mitschicken und beim Empfänger rec.gratis setzen; für Wände/Böden eine eigene Nachricht {t:"gratis",k:...} oder ein Flag in den wall/floor-Nachrichten. Zusätzlich in snapshot() furn-Einträge um g:f.gratis und ein Feld gb:window._gratisBau erweitern und in loadSnapshot wieder herstellen.


**Gast kann die Ernte in der Markthalle beliebig oft verkaufen — stats.ernten wird 2,8 s später vom Host zurückgesetzt**  
`traumhaus.html` Zeile 5147

- Ablauf: stats.ernten wird ausschliesslich beim Host hochgezählt (updBeete, Z. 4109 'if(MPs&&!mpHost)return;', Zähler Z. 4120). Der Host schickt alle 8 Sim-Ticks (~2,8 s) netSend({t:"love",...,st:stats}) (Z. 5690), der Gast ersetzt daraufhin sein komplettes stats-Objekt: 'if(m.st)stats=m.st;' (Z. 3656). Der markthalleBtn-Handler (Z. 5145-5147) zahlt e9*45*(1+arbeit.lv*0.15) aus, setzt stats.ernten=0 aber NUR lokal und schickt dafür keine Nachricht — geldSend() überträgt nur die Geld-Differenz. Ablauf: (1) Host lässt die Beete wachsen, bis stats.ernten z. B. 6 ist. (2) Host läuft in die Markthalle bei (

- Fix: Den Verkauf beim Gast über eine Nachricht an den Host laufen lassen (analog zu {t:"growSold"}/{t:"dieb"}): Gast sendet {t:"marktVerkauf"}, nur der Host rechnet erloes aus, setzt stats.ernten=0 und macht geldSend(). Alternativ dürfen host-autoritative Zähler wie stats.ernten beim Gast überhaupt nicht als Auszahlungsgrundlage dienen.


**Gast umgeht das Limit von 2 Coups pro Tag — der Zähler steht hinter dem Host-Only-Return**  
`traumhaus.html` Zeile 4045

- Ablauf: startCrime() prüft in Z. 4032 'if(!silent&&window._coupTag===tag&&(window._coupHeute||0)>=2)'. Hochgezählt wird _coupHeute aber erst in Z. 4050 — also NACH dem Gast-Ausstieg 'if(MPs&&!mpHost)return;' in Z. 4045. Beim Gast bleibt _coupHeute deshalb für immer undefined. Zusätzlich wird der Host bei einem vom Gast gestarteten Coup über {t:"crimeGo"} (Z. 4038) angestossen und ruft startCrime(...,true) mit silent=true (Handler Z. 3667) — dort greift die Tagesprüfung wegen '!silent' ebenfalls nicht. Ablauf: (1) Nach 21:00 tippt der Gast '🕶️ Krummes Ding drehen' (crimeAvailable(), Z. 4023, hat keine 

- Fix: In finishCrime das Hochzählen von _coupHeute/_coupTag VOR das 'if(MPs&&!mpHost)return;' ziehen (beide Seiten zählen dieselbe Runde), oder den Tageszähler beim Host führen und mit {t:"crimeEnd"} als Feld c:_coupHeute an den Gast mitschicken, damit dessen Z.-4032-Prüfung greift.


**gratis-Markierung wird nie mitgesendet — Villa-Stempel ist im Koop eine Geldpresse**  
`traumhaus.html` Zeile 5617

- Ablauf: stampVilla() markiert die gestempelten Teile nur LOKAL als kostenlos: furn[...].gratis=1 (5617-5618) und window._gratisBau[...] fuer Boeden/Waende (5613-5616). Verschickt wird ueber doPlaceFurn/doPlaceFloor/doPlaceWall (3480-3482) aber nur {t:'furn'|'floor'|'wall'} OHNE dieses Flag; auch snapshot() (3568) enthaelt weder gratis noch _gratisBau. Ablauf: Spieler A tippt im Baumodus auf den Villa-Knopf und zahlt 3500. Spieler B sieht dieselbe Villa, seine 31 Moebel-Records haben aber kein gratis-Flag und sein _gratisBau ist leer. B schaltet Abriss ein und tippt die Villa weg: removeFurnAt (3454) z

- Fix: gratis/_gratisBau in die Netz-Nachrichten und in snapshot() aufnehmen: doPlaceFurn ein Feld g:1 mitgeben (applyFurn setzt rec.gratis), doPlaceFloor/doPlaceWall analog ein Flag mitschicken, das der Empfaenger in window._gratisBau eintraegt; snapshot()/loadSnapshot beides mitfuehren.


**del/Moebel-Sync laeuft ueber Koordinaten statt ueber die fid — gleichzeitiges Bauen auf dieselbe Zelle spaltet die Welten dauerhaft**  
`traumhaus.html` Zeile 3604

- Ablauf: Jedes Moebel hat eine eindeutige fid (3482, Suffix h/g), aber geloescht wird nur ueber x/y: netSend({t:'del',x,y}) (3493/3518/3537/3566) und removeFurnAt(gx,gy) (3446). Zusaetzlich prueft der Remote-Pfad doPlaceFurn(...,true,fid) (3604) NICHT footprintFree — nur der lokale Tap tut das (5114). Ablauf: A und B tippen im selben Moment auf Zelle (5,5), A ein Sofa, B ein Bett. Beide bestehen lokal footprintFree, beide senden. Danach hat A furn=[...,SofaA,BettB], B hat furn=[...,BettB,SofaA] — dieselbe Zelle ist doppelt belegt, die Reihenfolge ist gespiegelt. Jetzt reisst A (5,5) ab: removeFurnAt la

- Fix: del ueber die fid fahren ({t:'del',fid:...}) und removeFurnAt eine fid-Variante geben; im Remote-Pfad von doPlaceFurn footprintFree pruefen und bei Konflikt deterministisch aufloesen (z. B. Host gewinnt, Gast bekommt sein Geld zurueck).


**doDelete faellt bei fehlendem Moebel auf Waende und Boden durch — ein del-Paket frisst beide Wandkanten plus die Bodenkachel**  
`traumhaus.html` Zeile 3485

- Ablauf: doDelete versucht erst removeFurnAt; schlaegt das fehl, loescht es ohne weitere Pruefung die Waende der Zelle — die forEach ueber ['0','1'] hat keinen Abbruch, es fallen also BEIDE Kanten (3485-3488) — und danach zusaetzlich den Boden (3489-3492). Deterministischer Zwei-Spieler-Ablauf: A kauft im Garten einen Kombi (2400 $, def.car). applyFurn legt fuer Autos (3350-3360) und den Hund (3419-3423) gar keinen furn-Record an, sendet aber {t:'furn'} — B baut dieselbe Attrappe. Jetzt tippt B im Abriss-Modus auf die Auto-Zelle: removeFurnAt findet nichts → B loescht seine Wand(e) und seinen Boden unt

- Fix: doDelete nur genau eine Ebene bedienen (Moebel ODER Wand ODER Boden, per Nachrichtentyp bzw. Zielangabe) statt durchzufallen, in der Wand-Schleife nach dem ersten Treffer abbrechen, und Auto/Hund als echte furn-Records fuehren (oder ihre Zelle vom Abriss ausnehmen).


**Gast bleibt nach endgültigem Verbindungsabriss für immer im Gast-Modus: kein Speichern, eingefrorene Welt, kein Weg zurück**  
`traumhaus.html` Zeile 5487

- Ablauf: saveGame() steigt bei `MPs && !mpHost` sofort aus. MPs wird NUR in mpBackBtn.onclick (Z. 5521) auf null gesetzt — dieser Button liegt aber in <div id="start">, das startGame() mit class "hide" (`display:none!important`, Z. 107/5490) unsichtbar macht. Ablauf: A hostet, B tritt bei, B baut mit. A schliesst den Tab. In mp.js läuft beim Gast der 6s-Watchdog → lost() → 5 Reconnect-Versuche gegen die alte Raum-ID (A hat nach Reload einen NEUEN 4-Zeichen-Code) → giveUp() → status "closed". Beim Gast passiert daraufhin nur: Text in #mpStatus (unsichtbar, weil in #start) und netBadge wird rot, Beschrif

- Fix: Im onStatus-Handler des Gasts (Z. 5553-5557) auf st==="closed" reagieren: MPs=null; mpHost=false; setzen (damit saveGame() ab da in den Solo-Slot schreibt bzw. der Spieler wenigstens weiterspielen kann), sichtbaren hint()/Overlay statt nur #mpStatus anzeigen und einen erreichbaren "Alleine weiterspielen / Zurück zum Menü"-Button ausserhalb von #start einblenden. Alternativ MPs beibehalten, aber ei


**snapshot() verliert die gratis-Markierungen der Villa-Vorlage → Geld-Duplikation, die nur über das Netz funktioniert**  
`traumhaus.html` Zeile 3569

- Ablauf: stampVilla() markiert gestempelte Teile lokal als kostenlos: Möbel bekommen `_neu.gratis=1` (Z. 5618), Wände/Böden landen in window._gratisBau (Z. 5612-5616). removeFurnAt() zahlt nur ohne dieses Flag aus (Z. 3454), doDelete() ebenso für Wände/Böden (Z. 3486/3490). Genau diese Marken fehlen aber in beiden Serialisierungen: snapshot() (Z. 3569) speichert pro Möbel nur id/x/y/r/fid/lv/w — kein `gratis`; und doPlaceFurn() sendet `{t:"furn",id,x,y,r,fid,lv}` (Z. 3482) — ebenfalls ohne. window._gratisBau wird nie gesendet und nie gespeichert. Zwei-Spieler-Ablauf: A und B im Koop, A geht in den Bau-

- Fix: gratis in snapshot() mitschreiben (`g:f.gratis?1:0` in der furn-Map, Z. 3569) und in loadSnapshot() wieder setzen; window._gratisBau als eigenes Snapshot-Feld sichern und laden; in doPlaceFurn()/doPlaceWall()/doPlaceFloor() das gratis-Flag ins Netzpaket aufnehmen und beim Empfänger auf dem Datensatz bzw. in _gratisBau setzen. Alternativ die Rückerstattung serverseitig-artig nur beim Host berechnen


**Voice-Chat ist tot, wenn der Gast das Mikrofon zuerst antippt (peer.on("call") wird erst in voiceStart registriert)**  
`traumhaus.html` Zeile 5574

- Ablauf: Der Host registriert den PeerJS-Empfangs-Handler `peer.on("call",...)` erst INNERHALB von voiceStart(), also erst wenn er selbst 🎙️ drückt. Ablauf: Host + Gast sind verbunden, der Gast drückt 🎙️ zuerst → getUserMedia ok → `peer.call("aban-traumhaus-CODE", stream)` (Z. 5577). Auf der Host-Seite feuert PeerJS das 'call'-Event, es gibt aber keinen Listener → der Anruf wird nie beantwortet, das Event ist verloren (EventEmitter puffert nicht). Der Gast bekommt nie ein 'stream'-Event, hört nichts, sieht aber '🎙️ Voice AN — sprich mit deinem Mitspieler!' und einen roten Knopf. Drückt der Host danach 

- Fix: Den Empfangs-Pfad beim Host beim Verbindungsaufbau registrieren statt beim Mikro-Klick: direkt nach `MPs=MP.host(...)` bzw. in onStatus('connected') `MPs._peer.on("call",function(c){voice.pending=c;if(voice.stream)c.answer(voice.stream);})` setzen und in voiceStart einen gepufferten `voice.pending` beantworten. Zusätzlich beim Gast einen Retry einbauen (kein 'stream' nach ~5 s → erneut `peer.call`


**Ego-Modus des Hosts macht den Partner beim Gast komplett unsichtbar (mesh.visible wird als v mitgesendet)**  
`traumhaus.html` Zeile 4694

- Ablauf: updCam() blendet im Ego-Modus den eigenen Körper aus (`_me.mesh.visible=false`). Genau dieses Flag wird aber im sims-Broadcast als Wahrheit über den Partner verschickt: Z. 5688 `a:sims.map(... v:s.mesh.visible ...)`, und der Gast übernimmt es hart in updSim (Z. 4628 `if(s.net.v!==undefined)s.mesh.visible=s.net.v;`). Ablauf: Host und Gast spielen zusammen, der Host tippt 👁️ (Ego-Perspektive). Ab diesem Moment sieht der Gast Max überhaupt nicht mehr — der Charakter verschwindet mitten im Bild, obwohl der Host normal herumläuft. Übrig bleibt nur der blaue Partner-Pfeil, der über leerem Rasen schw

- Fix: Sichtbarkeit nicht aus der Render-Sicht ableiten: ein eigenes Feld führen (z. B. `s.hidden` für Auto/Arbeit/Crime/Verstecken) und im Broadcast `v:!s.hidden` senden statt `s.mesh.visible`; die lokale Ego-Ausblendung darf dieses Feld nicht berühren.


**Partner-Marker, Radar und Distanz zeigen beim fahrenden Partner einen Geister-Körper statt das Auto**  
`traumhaus.html` Zeile 4256

- Ablauf: Beim Einsteigen wird nur `sims[0].mesh.visible=false` gesetzt (Z. 4155); autoFahr() aktualisiert danach ausschliesslich die Auto-Mesh-Position und — als einziges Sim — den Beifahrer (Z. 4256). Die Position des FAHRERS (sims[0].x/z) bleibt liegen, wird aber weiter unverändert im sims-Broadcast verschickt (Z. 5688). Zusätzlich hat updSim keinen fahren-Guard und `steerVec(0)` liefert weiter den Joystick (Z. 4844), also läuft der unsichtbare Max mit 4 m/s durch die Gegend, während das Auto mit 13 m/s fährt. Ablauf: Host steigt am Haus ins Auto und fährt zum Strand. Der Gast sieht das Auto fahren (

- Fix: In autoFahr() den Fahrer mitziehen (`sims[0].x=m.position.x; sims[0].z=m.position.z; sims[0].rot=carRot;`) und in updSim ein `if(fahren&&si===0)return;` ergänzen (analog zu `s._bf`), damit der unsichtbare Körper nicht parallel gesteuert wird. Alternativ Marker/Radar bei aktivem `ca` auf die Auto-Position umschalten.


**Robo entfernen verschiebt Lobby-Slots, ohne conns._idx / NET.my nachzuziehen → Start-Knopf erscheint nie mehr**  
`lebenspfad.html` Zeile 3456

- Ablauf: Host erstellt Raum (NET.names=["Host"]). Host tippt "+ 🤖 Robo hinzufügen" → names=["Host","Robo 🤖"], ready[1]=true, bots[1]=true. Jetzt tritt der Freund bei: hallo → names=["Host","Robo 🤖","Gast"], c._idx=2, welcome idx=2, ready[2]=false. Host tippt "🤖 Robo entfernen" → Zeile 3456 splict names/cfgs/ready an bi=1 → names=["Host","Gast"], ready=[true,false]. ABER: anders als der Lobby-close-Handler (Z. 3609-3610) wird weder c._idx dekrementiert noch ein neues {t:"welcome"} geschickt. Der Gast bleibt lokal NET.my=2 und der Host stempelt weiterhin m.i=c._idx=2. Tippt der Gast "✅ Ich bin bereit", s

- Fix: Im Robo-Entfernen-Zweig dieselbe Kompaktierung wie im close-Handler fahren: NET.conns.forEach(cc=>{if(cc._idx!=null&&cc._idx>bi){cc._idx--;try{cc.send(JSON.stringify({t:"welcome",idx:cc._idx}));}catch(e){}}}); und NET.bots gezielt mit splice(bi,1) statt =[] behandeln. Am besten die Reindex-Logik aus Z. 3606-3611 in eine Funktion netCompact(idx) ziehen und an allen drei Splice-Stellen (3230, 3456, 


**Gast mit Namen "Robo 🤖" wird vom Bot-Knopf des Hosts aus der Lobby gelöscht**  
`lebenspfad.html` Zeile 3455

- Ablauf: Der Bot wird ausschliesslich über den Anzeigenamen identifiziert: `var bi=NET.names.indexOf("Robo 🤖")`. Das netName-Feld (Z. 279) erlaubt beliebigen Text bis 12 Zeichen; "Robo 🤖" sind 7 UTF-16-Einheiten und passt. Ablauf: Host erstellt Raum, Gast trägt als Namen "Robo 🤖" ein und tritt bei. netUniqueName (Z. 3245) hängt kein Suffix an, weil noch kein Eintrag so heisst → names=["Host","Robo 🤖"], c._idx=1. Der Bot-Knopf-Text wird nur in netLobbyShow gesetzt und danach nie aktualisiert, der Host sieht weiter "+ 🤖 Robo hinzufügen" und tippt drauf. bi=1 trifft den MENSCHEN → NET.names/cfgs/ready wer

- Fix: Bot-Sitze über NET.bots (Flag-Array) statt über den Namen suchen, z.B. `var bi=(NET.bots||[]).indexOf(true)`, und in netUniqueName/hallo reservierte Namen ("Robo 🤖") für Gäste blockieren bzw. umbenennen.


**Reconnect: alter Verbindungsversuch reisst die frisch aufgebaute Verbindung ab (NET.conns=[])**  
`lebenspfad.html` Zeile 3525

- Ablauf: netTryReconnect() legt in Zeile 3517 eine DataConnection an und setzt NET.conns=[c]. Laeuft der Versuch nach 6s ins Leere, ruft der Timer in Zeile 3525 einfach netTryReconnect() erneut auf — der alte c wird NICHT geschlossen und nicht entkoppelt (im Join-Pfad, Zeile 3687, wird dagegen sauber c.close() aufgerufen; hier fehlt es). Ablauf zu zweit: Gast ist Spieler 1, Handy wechselt WLAN->Mobilfunk, Kanal schliesst. Versuch 1 (c1) haengt in ICE/TURN. Nach 6s startet Versuch 2 (c2), NET.conns=[c2], c2 oeffnet, sendet rejoin, Host antwortet mit Snapshot — Spiel laeuft wieder. Kurz darauf faellt c1 

- Fix: Vor jedem neuen Versuch den alten Kanal neutralisieren: in Zeile 3525 (und am Anfang des Timeouts in 3513) try{c.close()}catch(e){} und die Handler entschaerfen. Zusaetzlich in c.on('close') und c.on('open') nur reagieren, wenn der Kanal noch der aktuelle ist: if(NET.conns[0]!==c)return; — analog im open-Handler, bevor rejoin gesendet wird.


**netLaunch schickt 'init' an noch nicht identifizierte Verbindungen -> Gast landet auf Host-Slot 0**  
`lebenspfad.html` Zeile 3765

- Ablauf: NET.conns wird schon beim 'connection'-Event befuellt (Zeile 3570); c._idx entsteht erst, wenn die 'hallo'-Nachricht eintrifft (Zeile 3577). netLaunch iteriert in Zeile 3765 aber ueber ALLE conns und sendet you:c._idx. Fuer eine noch nicht identifizierte Verbindung ist c._idx undefined, JSON.stringify laesst das Feld weg, und beginNet macht daraus in Zeile 3769 NET.my=init.you|0 = 0. Ablauf: Host + Gast A sind in der Lobby, A ist bereit, der Start-Knopf ist sichtbar. Gast B tippt den Einladungslink (?raum=CODE) genau in dem Moment, in dem der Host 'Spiel starten' drueckt — Bs Kanal ist offen, 

- Fix: In netLaunch nur an identifizierte Kanaele senden und den Rest abweisen: NET.conns.forEach(c=>{ if(c._idx==null){try{c.send(JSON.stringify({t:'full'}));c.close();}catch(e){} return;} ... }) und die Liste anschliessend saeubern. Zusaetzlich in beginNet defensiv abbrechen, wenn init.you nicht als Zahl geliefert wurde (typeof init.you!=='number' -> Meldung + Lobby statt Slot 0).


**Robo aus der Lobby entfernen verschiebt die Sitzplätze, ohne die Verbindungen neu zu indizieren → Lobby-Deadlock**  
`lebenspfad.html` Zeile 3456

- Ablauf: Spieler A erstellt einen Raum und tippt in der Lobby »+ 🤖 Robo hinzufügen« (NET.names=[A,Robo]). Danach tritt Freund B bei: der Host vergibt c._idx=2 und schickt {t:'welcome',idx:2}; B setzt NET.my=2. Jetzt tippt A »🤖 Robo entfernen«: der Handler macht NET.names.splice(1,1)/cfgs/ready und NET.bots=[], sendet aber NUR {t:'lobby',names,ready} — er korrigiert weder c._idx der offenen Verbindungen noch schickt er ein neues 'welcome' (der Leave-Pfad in Z. 3608–3610 macht genau das, der Bot-Pfad nicht). B bleibt also auf NET.my=2, während B in NET.names jetzt auf Index 1 sitzt. B tippt »✅ Ich bin be

- Fix: Im netBotBtn-Handler beim Entfernen denselben Kompaktierungs-Code wie im Leave-Pfad ausführen: alle NET.conns mit c._idx>bi um 1 dekrementieren und jedem betroffenen Gast {t:'welcome',idx:c._idx} nachschicken (danach netPlayersUpd()). Alternativ den Robo nie an einer Position < Gast-Index löschen, sondern Bot-Sitze als eigenes Feld statt als Array-Slot führen.


**'rejoin' wird ohne jede Authentifizierung akzeptiert und wirft den bisherigen Slot-Inhaber aktiv raus (Sitz-Übernahme)**  
`lebenspfad.html` Zeile 3588

- Ablauf: Der Host nimmt jede eingehende Verbindung sofort in NET.conns (Z. 3570). Bei {t:'rejoin',idx:N} prüft er nur !NET.started||N<1||N>=NET.names.length (Z. 3585) — es gibt kein Token, kein Secret, keine Prüfung, ob Slot N überhaupt frei/tot ist. Schlimmer: Z. 3588 schließt aktiv die bestehende Verbindung mit demselben _idx. Ablauf zu zweit: A hostet (Code ABCD), B ist Gast auf Slot 1, Runde läuft. Ein Dritter (oder B in einem zweiten Tab mit minimal geändertem Client) verbindet sich auf aban-lp-abcd und sendet als erste Nachricht {t:'rejoin',n:'x',idx:1} statt 'hallo' (der 'hallo'-Weg würde mit 'f

- Fix: Beim 'hallo'/'welcome' ein zufälliges Sitz-Token erzeugen, dem Gast mitschicken und bei 'rejoin' zwingend {idx, token} verlangen (Vergleich gegen NET.seats[idx].token). Zusätzlich rejoin nur akzeptieren, wenn der Slot gerade wirklich unbesetzt ist (keine offene Verbindung mit diesem _idx) — den vorhandenen Kanal nur dann schließen, wenn er nachweislich tot ist (kein Pong).


### MITTEL (15)


**Gast-Reconnect schliesst die alten Kanäle nicht — Host-Slot bleibt belegt, jeder Wiederverbindungs-Versuch wird abgewiesen**  
`mp.js` Zeile 151

- Ablauf: Im Host-Zweig von `lost()` werden bewusst BEIDE Kanäle geschlossen und `main`/`fast` genullt (Z.145-148, Kommentar «Schwarm-P0»). Der Gast-Zweig (Z.151-155) macht das nicht: er überschreibt nur `main = peer.connect(...)` und lässt die alte DataConnection samt `fast` offen. Ablauf zu zweit: Host-Tab wird auf dem Handy in den Hintergrund geschoben / der Host→Gast-Pfad bricht einseitig weg. Der Gast-Watchdog (Z.90) schlägt nach 6s an → `lost()`. In den ersten ~600ms (Backoff) sendet das Spiel des Gasts weiter über den ALTEN, aus seiner Sicht offenen `main` — der Host empfängt also weiter, sein ei

- Fix: Im Gast-Zweig von `lost()` vor dem Neuverbinden symmetrisch aufräumen: `try{if(main)main.close();}catch(e){} try{if(fast)fast.close();}catch(e){} fast=null; main=null;` — dann bemerkt der Host den Abriss sofort und gibt den 1v1-Slot frei. Zusätzlich ein vom Host abgewiesener Verbindungsversuch sollte `reconns` nicht verbrennen (Grund unterscheiden), bzw. der Host sollte eine Zweitverbindung dessel


**Nach Host-lost() kann jeder Fremde den freien main-Slot übernehmen (kein Peer-Pinning) — Session-Hijack über das Netz**  
`mp.js` Zeile 182

- Ablauf: lost() setzt beim Host main=null (Zeile 148) und wartet bis zu backoff+9000ms auf den zurückkehrenden Gast. In diesem Fenster akzeptiert peer.on('connection') die erste beliebige eingehende Verbindung: 'main = conn; wireMain(conn);' — die Peer-ID des bisherigen Gastes wird nirgends gemerkt. Zwei Spieler + ein Dritter: A hostet, B spielt; die Raum-ID ist deterministisch ('aban-'+gameId+'-'+code), bei MP.quick sogar fest und öffentlich ('PUBA'/'OFEN', Zeile 312), sonst nur 24^4 ≈ 330k Codes. Ein Dritter, der dauerhaft peer.connect auf die Raum-ID hämmert, erwischt den Slot in der Reconnect-Lücke

- Fix: Beim Verbindungsaufbau die Peer-ID des Gastes merken (var guestPeer = conn.peer) und im lost()-Fenster nur diese akzeptieren: if (S.status === 'lost' && guestPeer && conn.peer !== guestPeer) { conn.close(); return; } Der Slot wird erst nach giveUp()/Neustart wieder für beliebige Peers geöffnet.


**Raum-Code wird nach ID-Kollision still neu gewürfelt — angezeigter Code und kopierter Einladungslink bleiben veraltet**  
`mp.js` Zeile 193

- Ablauf: Im PeerJS-Fehlerhandler wird bei `unavailable-id` (Host, ohne noRegen) in Zeile 193 `S.code = makeCode()` gesetzt und neu gebootet — ohne jede Benachrichtigung an den Aufrufer. Der Header von mp.js verspricht aber ausdrücklich "s.code SOFORT verfügbar (Anzeige!)" (Zeile 14), und genau so nutzen es die Spiele: neon-zusammen.html:362-364 liest direkt nach `MP.host("tempel2")` `net.code`, baut daraus `location...+"?raum="+code`, legt den Link per `navigator.clipboard.writeText` in die Zwischenablage und zeigt den Code an. neon-dungeon.html:366-368 macht dasselbe. Ablauf mit zwei Spielern: Spieler

- Fix: Den Code-Wechsel signalisieren, statt ihn stillschweigend zu machen: in Zeile 193 nach `S.code = makeCode()` einen Callback/Status feuern (z.B. `S._st`-Kanal mit "code" oder ein neues `S.onCode(fn)`), oder — sauberer — den Code erst nach `peer.on("open")` als endgültig markieren und `MP.host` ein `S.codeReady`-Promise mitgeben, das die Spiele vor Anzeige/Clipboard abwarten. Zusätzlich in neon-zusa


**Reconnect-Slot ist an keine Partner-Identität gebunden — im öffentlich bekannten Raum PUBA wird der legitime Partner dauerhaft verdrängt**  
`mp.js` Zeile 148

- Ablauf: Bei Abriss schliesst der Host in lost() beide Kanäle und setzt in Zeile 148 `main = null`, damit `peer.on("connection")` den Gast wieder annimmt. Die Annahme in Zeile 181-182 prüft aber nur `if (main) { conn.close(); }` — es gibt keinerlei Prüfung, ob der neue `conn.peer` derselbe ist wie der bisherige Partner (der Guard existiert nur für den fast-Kanal, Zeile 177). Bei MP.quick ist der Raumcode zudem die feste, im Klartext im Code stehende Konstante "PUBA" (Zeile 312), die PeerJS-ID also für jeden vorhersagbar (`aban-<gameId>-PUBA`, Zeile 53). Ablauf: A und B spielen neon-dungeon über "⚡ Schn

- Fix: Beim Abriss die Peer-ID des Partners merken (`var mate = conn.peer` beim ersten erfolgreichen open) und in Zeile 181 für ein Zeitfenster (z.B. 20 s nach lost()) nur `conn.peer === mate` annehmen, fremde Verbindungen mit einer Ablehn-Nachricht schliessen. Für Räume mit festem Code zusätzlich ein pro Session zufälliges Geheimnis im ersten Hello-Frame verlangen und Verbindungen ohne passendes Geheimn


**Host kann die Lobby nicht verlassen: der Abbrechen-Knopf wird im Zustand „waiting" hart versteckt**  
`traumhaus.html` Zeile 5539

- Ablauf: Spieler A klickt „Raum erstellen". Zeile 5531/5532 blenden #netSetup aus und #mpLobby ein; #mpBackBtn startet mit display:none (Zeile 267). Der Status-Callback setzt in Zeile 5539 `display=(st==="closed")?"inline-block":"none"` — im Normalfall kommt aber „waiting", also bleibt der Knopf „↩ Abbrechen / neuer Versuch" unsichtbar. A hat sich beim Namen vertippt, oder B hat inzwischen selbst einen Raum erstellt und A soll doch beitreten: A kommt weder an das Beitreten-Feld (netSetup ist weg) noch an Abbrechen — die Lobby hängt endgültig, einziger Ausweg ist Reload oder „Solo bauen" (das den Befund

- Fix: Abbrechen in jedem Nicht-verbunden-Zustand anbieten: in Zeile 5539 `display=(st==="connected")?"none":"inline-block"` (analog im Gast-Handler bei „lost" einblenden). Der vorhandene mpBackBtn-Handler (5520) räumt bereits korrekt auf (MPs.close(), MPs=null, netSetup zurück).


**spielerPos() liefert dem Gast immer die Figur des Hosts — alle Orts-Aktionen hängen an der falschen Figur**  
`traumhaus.html` Zeile 4290

- Ablauf: meinSi() (Z. 3683) legt fest: der Gast steuert sims[1]. Das Radar (Z. 4885: sims[meinSi()]), doEmote (Z. 3686), doPing (Z. 3719) und updCoaster (Z. 4725) halten sich daran. spielerPos() (Z. 4290) gibt dagegen fest {x:sims[0].x,z:sims[0].z} zurück — beim Gast also die Position des Hosts. Alle ortsgebundenen Aktionen hängen an spielerPos(): shopBtn/werkBtn/markthalleBtn/kircheBtn (updCrime Z. 4076–4096), npcBtnUpd (Z. 4770) und coasterBtnUpd (Z. 4796). Ablauf: Gast läuft mit dem Joystick in die Markthalle (−26/95) und steht mittendrin — kein Button erscheint, das Gebäude wirkt kaputt. Sobald der

- Fix: spielerPos() an die eigene Rolle koppeln: var me=sims[meinSi()]||sims[0]; return (fahren&&driveCar)?{x:driveCar.mesh.position.x,z:driveCar.mesh.position.z}:{x:me.x,z:me.z}; — updPolizei/updVerstecken laufen ohnehin nur beim Host und bekommen damit weiterhin sims[0].


**Gebäude-Knöpfe des Gasts hängen an der Host-Position (spielerPos liefert sims[0], der Gast ist sims[1])**  
`traumhaus.html` Zeile 4290

- Ablauf: meinSi() (Z. 3683) sagt korrekt: der Gast steuert sims[1]. spielerPos() (Z. 4290) gibt aber unbedingt sims[0] zurück — beim Gast ist das der ferngesteuerte Host-Avatar (Positionen kommen aus dem {t:"sims"}-Broadcast, Z. 4626). Alle Innenraum-Interaktionen hängen daran: shopBtn (Z. 4078), werkBtn (Z. 4080), markthalleBtn (Z. 4083), npcBtnUpd (Z. 4769), coasterBtnUpd (Z. 4797). Ablauf: (1) Gast läuft mit seinem Joystick in den Shop bei (-24/74) — es passiert nichts, kein Knopf erscheint, das Gebäude wirkt kaputt. (2) Gleichzeitig steht der Host quer über der Karte im Shop: beim Gast poppt '🛒 Ein

- Fix: spielerPos() auf die eigene Figur beziehen: 'var s=sims[meinSi()];return fahren&&driveCar?{x:driveCar.mesh.position.x,z:driveCar.mesh.position.z}:{x:s.x,z:s.z};'. Damit prüfen alle Gebäude-Knöpfe die tatsächliche Position des jeweiligen Spielers.


**Gast dreht/verschiebt/wertet auf: der Host legt die Pflanze mit wachs=0 neu an und synct den Fortschritt beim Gast wieder auf 0**  
`traumhaus.html` Zeile 3537

- Ablauf: editVerschiebe/edRot/edUp (3518/3537/3550) loeschen das Moebel und legen es via doPlaceFurn neu an; den Wachstums-Fortschritt rettet _restoreLvWachs (3523) — aber nur lokal, denn die Netz-Nachricht {t:'furn'} (3482) traegt nur id/x/y/r/fid/lv, kein w. Ablauf: Der Gast stellt seine Growbox (oder das Gemuesebeet) mit fast vollem Wachstum eine Zelle weiter. Beim Host kommt del + furn an; applyFurn setzt wachs:0 (3377/3417). updGrow/updBeete laufen ausschliesslich beim Host (4102/4110), der Host ist also die Quelle der Wahrheit und sendet alle ~3 s {t:'wachs'} mit w=0 fuer diese fid (5691). Der Ga

- Fix: w im furn-Paket mitschicken und in applyFurn/doPlaceFurn uebernehmen (analog lv), damit der wachstumsfuehrende Host denselben Stand hat wie der Absender.


**th_save_coop wird ohne Backup geladen und nach einem gescheiterten Load 6 Sekunden später vom Autosave überschrieben**  
`traumhaus.html` Zeile 5529

- Ablauf: Der Solo-Pfad schützt sich: soloBtn schreibt vor jedem Laden ein rollendes Backup nach th_save1_bak und meldet einen kaputten Stand per alert() (Z. 5511-5513). Der Koop-Pfad tut nichts davon: `try{var cs=localStorage.getItem("th_save_coop");if(cs)loadSnapshot(JSON.parse(cs));}catch(e){}` (Z. 5529) verschluckt sowohl einen JSON.parse-Fehler als auch jeden Fehler MITTEN in loadSnapshot() still. loadSnapshot() räumt aber zuerst die komplette Welt ab (walls/floors/furn, Z. 3575-3577) und baut danach Stück für Stück wieder auf — bricht es dabei ab (z.B. applyFurn() auf eine id, die dieser Build nic

- Fix: Den Koop-Load auf denselben Schutz wie Solo heben: vor loadSnapshot() localStorage.setItem("th_save_coop_bak", cs) schreiben, den catch nicht leer lassen (alert/hint + Flag), und bei fehlgeschlagenem Load den Autosave für diese Sitzung sperren, bis der Spieler bestätigt hat.


**Grosse Weltkarte verrät beim Verstecken-Spiel die exakte Position des Partners**  
`traumhaus.html` Zeile 4971

- Ablauf: Marker (Z. 3890) und Radar (Z. 4916) blenden den Partner bewusst aus, solange `hideSpiel` läuft — die grosse Karte prüft das nicht: `if(MPs){var pa=sims[1-meinSi()];...}` zeichnet den blauen Partner-Punkt immer. Ablauf: Host drückt 🙈, der Gast bekommt 'VERSTECK DICH!' und läuft zu einem Versteck. Der Host tippt einmal auf das Radar (bigMapOpen, Z. 4976) → die Weltkarte zeigt den Gast als blauen Punkt exakt auf seinem Versteck. Karte schliessen, hinlaufen, d<3 → 'GEFUNDEN! +100 $' (Z. 3758/3742). Die komplette Heiss/Kalt-Mechanik (Z. 3757) und der Sinn des Modus sind damit umgangen, inklusive G

- Fix: In drawBigMap dieselbe Bedingung wie im Radar verwenden: `if(MPs&&!hideSpiel){...}` — und die Karte während hideSpiel entweder ohne Partner-Punkt zeichnen oder nur eine grobe Richtungsangabe (Heiss/Kalt) anzeigen.


**Gäste dürfen {t:"drop"} senden — Host splict die Lobby-Arrays ohne Reindex (Netz-Exploit)**  
`lebenspfad.html` Zeile 3598

- Ablauf: Die Whitelist erlaubt "drop" von Gästen, obwohl drop im ganzen Client nur vom Host gesendet wird (netPauseSkip, Z. 3189). Ein modifizierter Gast schickt in der Lobby {t:"drop"}; der Host stempelt m.i=c._idx (Z. 3599) und ruft netOnMsg → netApply. Weil `running` false ist, greift der Lobby-Zweig (Z. 3229-3231): NET.names/cfgs/ready/bots werden an di gesplict, aber conns[]._idx wird nicht dekrementiert und kein neues welcome verschickt — genau die Lücke aus Befund 1. Mit Host + Gast A + Gast B: A sendet drop (di=1) → names=[Host,B], B._idx bleibt 2 und B.NET.my bleibt 2. Startet der Host (netAll

- Fix: "drop" aus der Gäste-Whitelist in Z. 3598 entfernen (Host-Kontrolltyp wie welcome/init/sync); Gäste-Austritt wird bereits über c.on("close") sauber behandelt. Zusätzlich den Lobby-Zweig in netApply auf die gemeinsame netCompact(idx)-Routine umstellen.


**NET.pubWanted überlebt "Zurück ins Menü" → "Raum erstellen" öffnet einen offenen Raum bzw. joint einen fremden**  
`lebenspfad.html` Zeile 4072

- Ablauf: netHostReset() setzt NET.pubWanted=false (Z. 3528), aber der Menü-Rückweg nach dem Spiel (newBtn, Z. 4069-4075) und der Solo-Ausstieg im Pause-Overlay (Z. 3191-3194) setzen NET nur teilweise zurück und lassen pubWanted stehen. Ablauf: Spieler 1 startet über "🌍 Sofort online spielen"/Einladungslink ?quick=1 → im Fallback wird netHostPubBtn geklickt → NET.pubWanted=true. Runde mit Spieler 2 zu Ende spielen, dann "Zurück ins Menü ▶" (Z. 4068). pubWanted bleibt true. Jetzt tippt Spieler 1 "Raum erstellen", um seinem Freund einen privaten 4-Buchstaben-Code zu geben. netHostBoot Z. 3535 greift: `if(

- Fix: In newBtn (Z. 4072) und im Solo-Handler (Z. 3191) NET.pubWanted=false, NET.quick=false, NET.code="", NET.my=0, NET._pubFlip=0, NET._brkScan=false, NET._brkJAuto=false mitzurücksetzen — am saubersten netHostReset() bzw. eine gemeinsame netFullReset()-Funktion aufrufen statt die Felder inline zu kopieren.


**Nach Seiten-Reload kommt ein Gast nie wieder ins laufende Spiel — Sitz bleibt blockiert**  
`lebenspfad.html` Zeile 3573

- Ablauf: Der Wiedereintritt in ein laufendes Spiel funktioniert nur ueber {t:'rejoin'} (Zeile 3520), und das wird ausschliesslich aus netTryReconnect gesendet, also nur solange die Seite lebt und NET.my/NET.code im Speicher stehen. Nichts davon wird persistiert (localStorage kennt nur lp_char_*, lp_stats, lp_ach, lp_broker, lp_save1 — keine Raum-/Slot-Info). Ablauf zu zweit: Host und Gast spielen, der Gast ist Spieler 1. Auf dem Handy wird der Tab vom Browser verworfen (Hintergrund/Speicherdruck) oder der Gast laedt neu. Er tippt denselben Einladungslink, der Auto-Join in Zeile 3743 klickt 'Beitreten',

- Fix: Beim Start eines Online-Spiels {code:NET.code, my:NET.my, seed-lose Kennung} in localStorage schreiben (und beim sauberen Verlassen loeschen). Beim Join zusaetzlich zu 'hallo' ein 'rejoin' mit dieser gespeicherten idx senden, wenn Code und Raum uebereinstimmen; der Host-Zweig in Zeile 3583 akzeptiert das bereits inklusive Snapshot. Mindestens aber die Ablehnung unterscheiden: 'Spiel laeuft bereits


**'roll' traegt keinen Spieler-/Sequenzstempel — Doppelwurf klaut dem naechsten Spieler den Zug**  
`lebenspfad.html` Zeile 2169

- Ablauf: Die Wurf-Nachricht ist reines {t:'roll'} ohne Absender-Index und ohne Sequenznummer; updNet fuehrt sie in Zeile 3255 blind fuer G.players[G.turn] aus, sobald G.phase==='idle' ist. Der AFK-Watchdog des Hosts (Zeile 2169) sendet nach 150s Untaetigkeit ebenfalls ein anonymes {t:'roll'} und prueft dabei weder NET.q noch, ob der Spieler gerade selbst gesendet hat. Ablauf zu zweit: Gast (Spieler 1) laesst das Handy 2,5 Minuten liegen und tippt genau bei ~150s auf 'Drehen'. Sein Client sendet {t:'roll'} und pusht es lokal (Zeile 2072); der Host feuert im selben Moment seinen AFK-Wurf und pusht ihn eb

- Fix: roll (und drop) mit Kontext stempeln: {t:'roll', i:G.turn, r:G.round} bzw. eine fortlaufende actionSeq. In updNet vor rollCore() pruefen, ob m.i===G.turn und m.r===G.round — sonst verwerfen. Zusaetzlich in updAfk (und updBot, Zeile 2149) abbrechen, wenn NET.q bereits ein roll fuer den aktuellen Zug enthaelt.


**'drop' (Überspringen) wird im Lockstep ohne Phasen-Prüfung angewandt — der Rest-Wurf bewegt den nächsten Spieler**  
`lebenspfad.html` Zeile 3258

- Ablauf: In updNet warten 'roll' (Z. 3255, nur bei G.phase==='idle') und 'pick' (Z. 3265) auf einen sicheren Simulationspunkt, 'drop' dagegen wird sofort geshiftet und ausgeführt — mitten in jeder laufenden Animation. Ablauf zu zweit: A hostet, B ist Gast. B tippt »🎡 Drehen!« und schließt/verliert unmittelbar danach die Verbindung (Tab zu, Flugmodus). Auf A läuft die Rad-Animation (showWheel, ~2,4 s + 0,65 s Ausblenden, danach startMove). Gleichzeitig feuert A's close-Handler (Z. 3602) → netBroadcastPres → netCheckPause blendet »⏸️ Warte auf B …« samt Überspringen-Knopf ein. A tippt Überspringen, solan

- Fix: Den 'drop'-Zweig genauso gaten wie 'roll': nur ausführen, wenn G.phase==='idle' oder eine Karte offen ist; sonst in der Queue stehen lassen (der 12-s-Watchdog in Z. 3272 fängt Hänger ohnehin ab). Zusätzlich beim Verarbeiten laufende Bewegungs-/Wurf-Zustände hart zurücksetzen (moveQ=0, moveTo=-1, forkSel=null, dieAnim=null, _radDiv-Callback entschärfen), bevor nextTurn() gerufen wird.


### NIEDRIG (1)


**hostBtn lädt den Koop-Spielstand sofort in die laufende Welt — bleibt nach Abbruch im Solo-Spiel stehen und überschreibt dort den Solo-Slot**  
`traumhaus.html` Zeile 5529

- Ablauf: Zeile 5529 ruft loadSnapshot(th_save_coop) BEVOR überhaupt eine Verbindung besteht; loadSnapshot (3570 ff.) ersetzt Wände, Böden, Möbel, geld, liebe/verlobt/verheiratet, stats und kinder der aktuellen Welt. Ablauf zu zweit: A und B verabreden Koop, A klickt „Raum erstellen", der Broker ist nicht erreichbar → mpLobbyFehler (5516) zeigt „⚠️ Verbindung fehlgeschlagen" und den Abbrechen-Knopf. A klickt Abbrechen (5520, setzt MPs=null/mpHost=false, räumt aber die geladene Welt NICHT auf) und dann „Solo bauen". Hat A noch nie solo gespielt, existiert kein th_save1, der soloBtn-Handler lädt also nich

- Fix: Den Koop-Stand erst laden, wenn die Verbindung wirklich steht (im Status-Callback bei „connected", direkt vor startGame), oder im mpBackBtn-Handler den Weltzustand zurücksetzen (leeren Snapshot bzw. th_save1 neu laden).


## Mechanik-Befunde (offen, hoch + mittel)


### HOCH (23)


**Boden-Klick bucht doppelt ab (mousedown + mouseup/tapAt)**  
`traumhaus.html` Zeile 4763

- Ablauf: Bau-Modus an, Bodenbelag waehlen (z. B. Parkett 12 $), einmal kurz auf eine Zelle klicken (oder tippen). mousedown ruft paintFloorAt() -> doPlaceFloor + geld-=12 + geldSend. Beim Loslassen erkennt der mouseup-Handler (Zeile 4771) den Klick als Tap (<260 ms, <8 px) und ruft tapAt(), das in Zeile 4869 exakt dieselbe Zelle nochmals legt und nochmals geld-=12 rechnet. Der _paintSet-Schutz (Zeile 4756) greift nur innerhalb von paintFloorAt, tapAt fragt ihn nicht ab. Ergebnis: jede einzeln angeklickte Bodenkachel kostet den doppelten Preis (Ziehen ueber mehrere Felder kostet dagegen korrekt einfach)

- Fix: In tapAt den Boden-Zweig entfernen (Zeile 4869) und stattdessen paintFloorAt() als einzigen Boden-Pfad nutzen, oder in tapAt vor dem Legen `if(_paintSet&&_paintSet.has(c.gx+"_"+c.gy))return;` pruefen.


**Villa-Vorlage ist eine Geldmaschine (3500 $ rein, ~9459 $ Abriss-Erstattung)**  
`traumhaus.html` Zeile 5382

- Ablauf: Bau-Modus -> Knopf 'Villa-Vorlage 3500 $'. stampVilla zieht pauschal 3500 ab und stempelt 280 Bodenzellen, 138 Waende und 31 Moebel. Deren Einzelpreise summieren sich auf 18.917 $ (Moebel 11.920 + Boeden 2.812 + Waende 4.185). Anschliessend Abriss-Modus: removeFurnAt (3294), Wand-Abriss (3326) und Boden-Abriss (3329) zahlen je 50 % des Katalogpreises zurueck, also ~9.459 $. Netto +5.959 $ pro Durchlauf. Da die Flaeche nach dem Abriss wieder frei ist, besteht stampVilla die Frei-Pruefung (5375) sofort erneut -> beliebig oft wiederholbar. Schon Moebel+Boeden allein (7.366 $) uebersteigen den Kau

- Fix: Entweder den Villa-Preis an die Summe der Einzelteile koppeln, oder die gestempelten Objekte mit einem Flag (z. B. rec.gratis=1 bzw. floorsFree-Set) versehen, das die 50-%-Erstattung in removeFurnAt/doDelete unterdrueckt.


**Villa-Stempel ist eine Gelddruckmaschine: 3500 $ Kosten, 9459 $ Rückerstattung**  
`traumhaus.html` Zeile 5382

- Ablauf: stampVilla() zieht 3500 $ ab (Zeile 5382) und stempelt danach 280 Böden, 138 Wände und 31 Möbel aufs Grundstück. Nachgerechnet mit den Katalogpreisen: Böden 2812 $, Wände 4185 $, Möbel 11'920 $ = 18'917 $ Inhalt. Jedes dieser Teile lässt sich per Abriss-Modus wieder verkaufen — removeFurnAt (Zeile 3294) und doDelete (Zeile 3326/3329) zahlen jeweils 50 % zurück, also 9459 $. Ablauf: 🏰-Knopf drücken (−3500), in den Bau-Modus, Abriss-Werkzeug, Villa wegtippen (+9459) → +5959 $ Reingewinn pro Durchgang. Danach ist die Fläche wieder frei und der Knopf funktioniert erneut. Weil inLot das ganze 72×46

- Fix: Entweder die Villa zum echten Preis ihres Inhalts verkaufen (mindestens 18'917 $ verlangen) oder die gestempelten Teile beim Abriss nicht erstatten (Flag am furn/floor/wall-Eintrag setzen, das removeFurnAt/doDelete auf 0 % Rückerstattung schaltet).


**Angeln: „Aufhören" zahlt aus, setzt aber die Sperre nicht — unbegrenztes Fisch-Farmen**  
`traumhaus.html` Zeile 5048

- Ablauf: angelEnd() (Zeile 5033–5035) zahlt ANGEL.geldSum aus UND setzt window._angelCd=uhrzeit, wodurch angelStart() 180 Spielminuten lang blockt (Zeile 4999). Der Aufhören-Knopf (Zeile 5047–5048) zahlt ANGEL.geldSum ebenfalls aus, setzt _angelCd aber NICHT. Ablauf: Gartenteich antippen → warten bis „JETZT ZIEHEN" → ZIEHEN (Prachtfisch +70 $) → sofort „Aufhören" tippen → Geld ist gutgeschrieben, Fenster zu, keine Sperre → Teich sofort wieder antippen. Ein Zyklus dauert ~4 s und bringt bis 70 $ plus je einen stats.fische-Zähler (der die Quests „Fang 3/5 Fische" füttert). Wer stattdessen alle 3 Würfe zu

- Fix: In der angelQuit-Handler dieselbe Zeile ergänzen wie in angelEnd: window._angelCd=uhrzeit; (und ANGEL.geldSum=0 nach der Auszahlung setzen, damit beide Pfade nicht doppelt gutschreiben können).


**Basislinie der Endlos-Quests wird nicht gespeichert — Fortschritt fällt bei jedem Neuladen auf 0**  
`traumhaus.html` Zeile 4320

- Ablauf: `ensurePQ()` legt die Basislinie `b={fische,furn,grow,stunts,liefer}` aus den AKTUELLEN Stats an und cached sie nur in `window._pq`. `snapshot()` (Zeile 3407) sichert zwar `qi:questIdx` und `qb:questBusy`, aber `_pq` nicht — und `loadSnapshot` setzt `_pq` weder wieder noch löscht es. Ablauf: Spieler ist bei questIdx 7 (n=0, Template 0: "Fang 3 Fische fürs Dorffest", b.fische = 12). Er fängt 2 Fische (stats.fische = 14). Der 6-Sekunden-Autosave (Zeile 5460 → saveGame) schreibt stats.fische=14 und qi=7. Seite neu laden → soloBtn lädt den Save (Zeile 5286), `_pq` ist null, ensurePQ berechnet b.fi

- Fix: Die Basislinie in den Snapshot aufnehmen (z. B. `pqb: window._pq&&window._pq.b`) und in loadSnapshot nach dem Setzen von questIdx wieder in `window._pq` einspielen; `ensurePQ` das gespeicherte `b` bevorzugen statt neu zu messen. Zusätzlich in loadSnapshot `window._pq=null` setzen, bevor questIdx zugewiesen wird, damit kein Cache aus der vorherigen Sitzung mit gleichem Index stehen bleibt.


**Vermögens-Auftrag verankert sein Ziel bei jedem Laden neu am aktuellen Vermögen — Ziel läuft davon**  
`traumhaus.html` Zeile 4313

- Ablauf: PQ_TPL[3] berechnet das Ziel beim Anlegen: `t=Math.round((hausWert()+geld+n*1500+2500)/500)*500`, also immer mindestens 2500 $ ÜBER dem Vermögen im Moment des ensurePQ-Aufrufs. Da `window._pq` nicht persistiert wird (siehe snapshot(), Zeile 3407), wird dieses Ziel nach jedem Neuladen frisch berechnet. Ablauf: Spieler ist bei questIdx 10 (n=3 → Template 3), Vermögen 6000 → Ziel 13000 (mit n*1500). Er erspielt 4000 $ (Vermögen 10000), lädt neu → ensurePQ läuft erneut, t wird jetzt aus 10000 berechnet → Ziel 17000. Jeder Reload hebt die Latte um genau den seit dem letzten Reload erwirtschafteten 

- Fix: Ziel `t` einmalig berechnen und mitspeichern (Teil des in Befund 2 vorgeschlagenen `_pq`-Snapshots) statt es bei jedem ensurePQ neu aus dem Live-Vermögen abzuleiten; alternativ das Ziel rein aus n und einem gespeicherten Startvermögen ableiten.


**Fahndungs-HUD des Gastes wird im nächsten Frame selbst wieder gelöscht**  
`traumhaus.html` Zeile 4155

- Ablauf: Der Host begeht einen Coup, der schiefgeht → wantedPlus(1) (3892/4149) sendet {t:"wanted",w:1}. Der Gast setzt in Zeile 3474 wanted=1, blendet das HUD ein und zeigt den Hinweis. Im selben Frame läuft aber updPolizei(dt,now) (Aufruf 5436, ungeschützt auch beim Gast). Beim Gast ist polizei.length immer 0 — setWanted/mkPolizeiAuto laufen dort nie, weil wantedPlus in 4150 für Gäste sofort zurückkehrt. Zeile 4155 greift also: 'if(!polizei.length){if(wanted!==0){wanted=0;updWantedHUD();...}}' → wanted wird auf 0 zurückgesetzt und das HUD wieder ausgeblendet. Der Gast sieht die Fahndung höchstens ein

- Fix: In Zeile 4155 den Sicherheits-Reset auf den Host beschränken: 'if(!polizei.length){if((!MPs||mpHost)&&wanted!==0){wanted=0;updWantedHUD();if(MPs&&mpHost)netSend({t:"wanted",w:0});}return;}'. Dann bleibt der vom Host gesendete Stand beim Gast stehen und wird nur noch durch die nächste wanted-Nachricht geändert.


**5 von 9 Lieferzielen liegen ausserhalb der harten Fahr-Begrenzung — Auftrag unerfüllbar**  
`traumhaus.html` Zeile 4099

- Ablauf: autoFahr klemmt die Auto-Position hart auf x∈[-155,155] und z∈[-140,140] (Zeile 4064/4065). Die Zielliste LIEFERZIELE enthält aber Bauernhof(-40,-196), Windmühle(-136,-196), Sportpark(0,216), Freizeitpark(-190,158) und Gewerbe Ost(172,0). Der Erfolgs-Check (Zeile 4114) verlangt hypot<7. Beim Bauernhof kommt man maximal auf z=-140 → Restdistanz 56; bei Gewerbe Ost auf x=155 → Restdistanz 17. Spieler-Ablauf: Einsteigen → 📦-Knopf drücken → mit 5/9 Wahrscheinlichkeit ein Ziel ziehen, das man selbst mit Nitro nie erreicht; nach 60 s kommt zwingend 'Zeit abgelaufen'. Die POIs existieren real (WORLD_

- Fix: Entweder die Fahr-Clamp in Zeile 4064/4065 auf die tatsächliche Weltgrösse anheben (x -250..+200, z -230..+230, passend zu WORLD_POIS) oder LIEFERZIELE auf Ziele innerhalb der Clamp reduzieren. Zusätzlich beim Anlegen von liefer prüfen, dass |x|<155 und |z|<140 gilt, sonst neu ziehen.


**Mitfahrt ignoriert die Bahnhöhe komplett — Ego-Fahrt bleibt am Boden**  
`traumhaus.html` Zeile 4562

- Ablauf: updCoaster übernimmt vom Kurvenpunkt nur x/z: `me.x=pos.x;me.z=pos.z` (Zeile 4562) — `pos.y` wird nie gesetzt. Der Sim hat ohnehin keine y-Komponente, updSim zeichnet ihn hart mit `m.position.set(s.x,0,s.z)` (Zeile 4495), und die Ego-Kamera nimmt in updCam die feste Augenhöhe `_ey=1.42` (Zeile 4530). Ablauf: Spieler geht zur Station, klickt „🎢 Achterbahn fahren", Ego-Modus schaltet sich ein — der Zug (C.zug) klettert sichtbar bis y≈20.8 den Hügel hoch, Kamera und Spielerfigur kriechen aber auf 1.42 m über dem Rasen den Grundriss der Kurve nach, quer durch Stützen und unter der Schleife hindurc

- Fix: In updCoaster die Höhe mitführen (z. B. `me.y=pos.y` bzw. ein `me._rideY=pos.y+1.0`), in updSim beim Zeichnen `m.position.set(s.x,s.y||0,s.z)` verwenden und in updCam die Ego-Augenhöhe als `_ey=(_me.y||0)+1.42` berechnen.


**window._lampGlows wird überschrieben — die Lichtkegel aller Hauptstrassen-Laternen gehen nie an**  
`traumhaus.html` Zeile 1966

- Ablauf: Die grosse Laternen-IIFE (Zeile 422–465) baut ~62 Strassenlaternen entlang aller Hauptachsen, legt für jede einen additiven Boden-Lichtkegel (CircleGeometry r=10, opacity 0) an und sammelt dessen Material in window._lampGlows (Zeile 445/459). Später im selben synchronen Ladelauf setzt baueStadt() in Zeile 1966 window._lampGlows=[] — ein harter Reset, kein ||[]. Damit sind alle ~62 Kegel-Materialien aus dem Array verschwunden; nur die 17 kleinen Dorf-Laternen (Zeile 1976) landen noch darin. Der Nacht-Umschalter in Zeile 5424 ((window._lampGlows||[]).forEach(gm=>gm.opacity=nacht9?0.5:0)) erreich

- Fix: Zeile 1966 von window._lampGlows=[] auf window._lampGlows=window._lampGlows||[] ändern (wie in Zeile 445).


**Geklautes Verkehrsauto fährt 90° quer — zwei gegensätzliche Achsen-Konventionen**  
`traumhaus.html` Zeile 3994

- Ablauf: updVerkehr richtet die Autos nach der Konvention "Nase = lokales +x" aus (Z. 2207/2208: dir>0 -> rotation.y=0 bei x-Route, -PI/2 bei z-Route; Kommentar Z. 2206). Das ist korrekt: th_auto_kombi.glb hat genau EINEN Node ohne Rotation und eine Bounding-Box von x=1.898 / z=0.823, die Längsachse ist also x. autoFahr rechnet dagegen mit "Nase = lokales +z": Bewegung ist (sin(carRot), cos(carRot)) (Z. 4059) bei gleichzeitigem m.rotation.set(0,carRot,0) (Z. 4080) — das ist die lokale +z-Richtung, also die Fahrzeug-FLANKE. Ablauf: Ein fahrendes Auto antippen -> Z. 4866 ruft einsteigen(v9,true) -> Z. 39

- Fix: Eine Konvention festlegen. Da Modell + Verkehr + Parktaschen (Z. 2126) alle auf Nase=+x stehen, autoFahr/updAuto angleichen: Bewegung m.position.x+=Math.cos(carRot)*sp*dt; m.position.z-=Math.sin(carRot)*sp*dt, Zielwinkel entsprechend ziel=Math.atan2(-mz,mx), und die Ausstiegs-/Beifahrer-Offsets (Z. 4015, 4038, 4093) mit umstellen.


**Angeln: "Aufhören" zahlt die Beute aus, setzt aber die Sperrfrist nie — unendliche Geldquelle**  
`traumhaus.html` Zeile 5053

- Ablauf: Die 3-Stunden-Sperre wird ausschliesslich in angelEnd() gesetzt (Zeile 5042: window._angelCd=uhrzeit). Der Abbruch-Handler angelQuit (Zeile 5053-5055) schreibt das Geld gut (geld+=ANGEL.geldSum), setzt _angelCd aber nicht. Ablauf: Teich antippen -> Angeln startet (angelStart prueft in Zeile 5006 nur, ob _angelCd !== undefined) -> Wurf 1 abwarten, bei "JETZT ZIEHEN!" ziehen -> +70 $ Prachtfisch -> waehrend der 1400-ms-Pause auf "Aufhören" tippen -> Dialog zu, Geld ist auf dem Konto, _angelCd bleibt undefined -> sofort wieder den Teich antippen, angelStart laeuft ohne jede Sperre erneut. Das ist

- Fix: angelQuit muss denselben Abschluss fahren wie angelEnd: window._angelCd=uhrzeit; setzen und ANGEL.geldSum nach der Auszahlung auf 0 zuruecksetzen. Am saubersten: der Handler ruft einfach angelEnd() auf (statt die Auszahlung zu duplizieren) und setzt danach ANGEL.geldSum=0.


**Tageslimits und Angel-Sperre stehen nur in window.*-Variablen und fehlen im Spielstand — Reload setzt alle Limits zurueck**  
`traumhaus.html` Zeile 3423

- Ablauf: snapshot() (Zeile 3422-3423) sichert geld, tag, uhrzeit, stats, skills usw., aber NICHT window._buskHeute/_buskTag (Strassenmusik-Limit, Zeile 5208/5213), window._angelCd (Angel-Sperre, Zeile 5006/5042) und window._coupHeute/_coupTag (Coup-Limit, Zeile 3877/3895). Der Autosave laeuft alle 6 Sekunden (Zeile 5476). Ablauf: In-Game 17:30 Uhr dreimal Strassenmusik spielen -> beim 4. Versuch kommt "Für heute ist das Publikum durch — morgen wieder!" -> Seite neu laden -> "Solo"-Start laedt den Spielstand, tag und uhrzeit werden aus dem Save wiederhergestellt (Zeile 3433), es ist also derselbe In-Gam

- Fix: Die drei Zaehler in snapshot() mitschreiben (z.B. bh:window._buskHeute, bt:window._buskTag, acd:window._angelCd, ch:window._coupHeute, ct:window._coupTag) und in loadSnapshot wieder auf window zurueckschreiben. Besser noch: sie als Felder eines regulaeren Objekts (z.B. limits={busk:0,buskTag:0,angelCd:undefined,coup:0,coupTag:0}) fuehren und dieses Objekt speichern.


**Koop-Gast: Sims bleiben nach Verlobung/Tanz für immer in state "propose"/"dance" hängen**  
`traumhaus.html` Zeile 3867

- Ablauf: loveEvent() setzt in Zeile 3863 (dance) bzw. 3867 (verlobung) s.state="dance"/"propose" plus s.useT. Heruntergezählt und auf "idle" zurückgesetzt wird useT aber nur in updSim Zeile 4505 — und die liegt im else-Zweig, den nur der Host durchläuft. Der Gast läuft in den Zweig `if(MPs&&!mpHost)` (Zeile 4487-4489), der ausschliesslich x/z/rot/pose/needs/visible aus dem Netz übernimmt, den state aber nie anfasst. Ablauf: Koop-Spiel starten, Gast verbindet sich. Beim Host steigt liebe auf 60 → updLove (4237) ruft loveEvent("verlobung") → netSend({t:"loveEv"}) → Gast bekommt Zeile 3521 loveEvent("verl

- Fix: Den useT-Countdown aus Zeile 4505 vor die `if(MPs&&!mpHost)`-Verzweigung ziehen (also für Host UND Gast ausführen), oder in der Gast-Übernahme (4489) `if(s.state==="dance"||s.state==="propose"){s.useT-=dt;if(s.useT<=0)s.state="idle";}` ergänzen.


**Nach "Raum erstellen"/"Beitreten" schreibt das Solo-Spiel in den Koop-Slot – oder gar nicht mehr**  
`traumhaus.html` Zeile 5284

- Ablauf: Der Startbildschirm (#start) bleibt sichtbar, wenn man auf "Raum erstellen" bzw. "Beitreten" tippt – hostBtn/joinBtn blenden nur #netSetup aus und #mpLobby ein, der Button "🏡 Solo bauen ▶" bleibt anklickbar. hostBtn (5327) setzt aber schon MPs=MP.host(...) und mpHost=true, joinBtn (5344) setzt MPs und mpHost=false. Wer in der Lobby nicht warten will und auf "Solo bauen" tippt, startet ein Solo-Spiel mit noch gesetztem MPs – soloBtn (5307) räumt MPs nirgends auf. Ab da entscheidet saveGame() den Slot über MPs: Als Ex-Host wird alle 6 s (5484) der komplette Solo-Stand nach "th_save_coop" geschri

- Fix: In soloBtn.onclick vor dem Laden die Netz-Session sauber beenden: `if(MPs){try{MPs.close();}catch(e){} MPs=null;mpHost=false;}` (analog zu mpBackBtn 5317-5318) und zusätzlich soloBtn ausblenden/disablen, sobald hostBtn/joinBtn gedrückt wurde.


**Endlos-Aufträge (window._pq) fehlen im Snapshot – Ziel wächst bei jedem Laden mit, Fortschritt geht verloren**  
`traumhaus.html` Zeile 3431

- Ablauf: snapshot() sichert vom Auftragssystem nur `qi:questIdx` und `qb:questBusy`. Das eigentliche Auftragsobjekt window._pq (4346) mit seiner Basislinie b (4344: fische/furn/growSold/stunts/lieferungen zum Zeitpunkt der Vergabe) wird weder gespeichert noch in loadSnapshot (3458) wiederhergestellt. Nach jedem Reload ist window._pq undefined, ensurePQ() (4341) baut den Auftrag mit der AKTUELLEN Statistik als Basislinie neu. Ablauf: Spieler erfüllt die 7 festen QUESTS, ist bei questIdx=10 (n=3 → PQ_TPL[3], Vermögens-Vorlage). Der Bürgermeister nennt "Steigere dein Vermögen auf X $" mit X = round((hausW

- Fix: window._pq mitspeichern (mindestens idx + die Basislinie b und bei der Vermögens-Vorlage das fixierte Ziel t) und in loadSnapshot rekonstruieren, statt ensurePQ() frisch neu einmessen zu lassen; ensurePQ() so umbauen, dass es aus einer gespeicherten Basislinie rekonstruiert.


**blur setzt nur shiftHeld zurueck — WASD bleiben nach Alt-Tab haengen**  
`traumhaus.html` Zeile 4637

- Ablauf: Am PC W (oder A/S/D/Pfeil) gedrueckt halten und waehrend des Laufens das Fenster wechseln (Alt-Tab, Klick in ein anderes Programm). Das keyup (Zeile 4632) wird nie zugestellt, also bleibt steerKeys.w=1 und updSteerKeys() haelt steer.z=-1 dauerhaft. Zurueck im Spiel rennt der Bewohner endlos in eine Richtung, obwohl keine Taste gedrueckt ist und der Joystick auf 0 steht; er stoppt erst, wenn man W erneut drueckt UND loslaesst. Der blur-Handler direkt daneben raeumt nur shiftHeld auf — steerKeys wird vergessen.

- Fix: Im blur-Handler (und zusaetzlich bei visibilitychange) steerKeys leeren und updSteerKeys() aufrufen: addEventListener("blur",function(){shiftHeld=false;steerKeys={};updSteerKeys();});


**egoToggle uebernimmt einen fremden followSim — Ego-Kamera sitzt in Mia, gesteuert wird Max**  
`traumhaus.html` Zeile 4616

- Ablauf: Im Leben-Modus auf Mia tippen (tapAt Zeile 4894 setzt followSim=Mia, Feature laut Tipp-Zeile). Danach 👁️ druecken. egoToggle setzt followSim nur, wenn es leer ist — es bleibt Mia. updCam Zeile 4552 nimmt _me=followSim=Mia, blendet Mias Mesh aus und setzt die Kamera in Mias Kopf. Joystick/WASD bewegen aber weiterhin sims[0] (steerVec Zeile 4653 liefert nur fuer si===0), und Zeile 4501 setzt followSim nicht zurueck, weil followSim bereits gesetzt ist. Ergebnis: Man sieht durch die Augen einer NPC-Figur, die eigene Figur laeuft unsichtbar-fuer-die-Kamera irgendwo anders herum; die Ego-Steuerung i

- Fix: In egoToggle beim Einschalten den Fokus hart auf den Spieler setzen: if(egoMode){if(_me)followSim=_me;...} statt nur bei !followSim.


**Koop-Gast: Markthallen-Verkauf ist unbegrenzt wiederholbar (Geld-Exploit)**  
`traumhaus.html` Zeile 4946

- Ablauf: Der markthalleBtn-Handler (Z. 4943-4949) bucht nur lokal: geld+=erloes; stats.ernten=0; geldSend(). Ein netSend gibt es nicht — im Gegensatz zum Growbox-Deal, wo genau dieses Problem schon behoben wurde (Z. 5211/5213 'love-Broadcast ueberschreibt'). Der Host sendet aber alle netTick%8 (~2,8 s, Z. 5480-5481) {t:'love', st:stats}, und der Gast setzt in Z. 3518 stats=m.st komplett zurueck. Ablauf: Koop-Runde starten, Host laesst ein Gemuesebeet ernten (stats.ernten steigt beim Host, updBeete Z. 3982). Der GAST laeuft in die Markthalle (-26,95), tippt '🥕 Ernte verkaufen' → +e9*45*(1+arbeit.lv*0.15

- Fix: Den Verkauf wie den Grow-Deal netzwerkfaehig machen: im Handler bei (MPs&&!mpHost) statt lokaler Buchung ein netSend({t:'erntenVerkauft'}) senden und beim Host in onNetMsg (neben Z. 3499) erloes berechnen, geld gutschreiben und stats.ernten=0 setzen; der Gast bucht nichts selbst.


**Stadt-Auftrag 'Verkaufe N Ernten am Markt' zaehlt den Markthallen-Verkauf nicht — Quest-Kette blockiert**  
`traumhaus.html` Zeile 4336

- Ablauf: Die Auftragsvorlage PQ_TPL[2] hat den Text 'Verkaufe '+t+' Ernten am Markt', prueft aber (stats.growSold||0)-b.grow>=t. stats.growSold wird ausschliesslich beim illegalen Growbox-Nachtdeal hochgezaehlt (Z. 5213 bzw. Z. 3499) — der markthalleBtn-Handler (Z. 4943-4949) erhoeht ueberhaupt keinen Zaehler, er setzt stats.ernten nur auf 0. Ablauf: Der Spieler erreicht questIdx>=7 (Endlos-Auftraege), bekommt diesen Auftrag, baut Gemuesebeete (120 $), erntet, laeuft in die Markthalle und verkauft beliebig oft — checkQuest (Z. 4351-4357) wird nie erfuellt. Weil questIdx nur bei Erfuellung hochgezaehlt 

- Fix: Im markthalleBtn-Handler einen eigenen Zaehler fuehren (z. B. stats.marktVerkauf=(stats.marktVerkauf||0)+e9) und die Vorlage darauf pruefen (Basislinie in ensurePQ, Z. 4344, ergaenzen) — oder den Quest-Text auf den Growbox-Deal umschreiben.


**Tankstellen-Kollider sitzt auf dem Gruppen-Ursprung statt auf dem Kiosk – unsichtbare Wand zwischen den Zapfsäulen, Kiosk selbst ist durchlässig**  
`traumhaus.html` Zeile 1942

- Ablauf: Die Tankstellen-Gruppe steht bei g.position.set(92,0,-74) (Zeile 1940). Der Kiosk ist ein Kind-Mesh mit kio.position.set(-4.5,1.7,-3) und BoxGeometry(6,3.4,4.5) (Zeile 1924), liegt in Weltkoordinaten also bei x 84.5..90.5 / z -79.25..-74.75. addSolid(92,-74,7,5,…) legt den Kollider aber auf den Gruppen-Ursprung: x 88.5..95.5 / z -76.5..-71.5. Der lokale Offset (-4.5,-3) wurde nie addiert. Ablauf: Spieler läuft oder fährt zur Tankstelle (92,-74) – erreichbar, liegt innerhalb der Bewegungsgrenzen. Er läuft mitten auf dem freien Vorplatz unter dem Vordach, exakt zwischen den beiden Zapfsäulen (lo

- Fix: Kollider auf die Weltposition des Kiosk-Meshes setzen und die Tür mitziehen: addSolid(92-4.5, -74-3, 7, 5, {a:"z", at:(-74-3)+2.5, c:92-4.5, w:3.0}) – also addSolid(87.5,-77,7,5,{a:"z",at:-74.5,c:87.5,w:3.0}). Generell: Kollider immer aus der Weltposition des tragenden Meshes ableiten, nicht aus g.position, sobald das Mesh einen lokalen Offset hat.


**Bewegungs-Clamp (±150/±135 zu Fuß, ±155/±140 im Auto) sperrt die halbe Welt aus – Achterbahn-Button kann nie erscheinen**  
`traumhaus.html` Zeile 4667

- Ablauf: steerMove clamped die Spielerposition auf lim=150 / limZ=135, autoFahr auf ±155 / ±140 (Zeilen 4088-4089). Der Kommentar in Zeile 4666 nennt als äußerste Punkte noch 'Downtown z=-120, Bahnhof z=+112, Villen x=±105' – seither sind über viertel() und die Achterbahn ganze Quartiere weit außerhalb entstanden: Gewerbe Ost x=172, Sportpark z=216, Freizeitpark (-190,158), Bauernhof (-40,-196), Windmühle (-136,-196), Achterbahn (-190,234), Meer x=-232. Ablauf: Spieler sieht auf der großen Karte (drawBigMap zeichnet WORLD_POIS, Zeile 4764) die Symbole 🎡 Freizeitpark, 🎢 Achterbahn, 🏟️ Sportpark, 🚜 Bauer

- Fix: Bewegungsgrenzen an die tatsächliche Weltausdehnung anpassen (mindestens x -240..200, z -210..250) und für Fuß- und Auto-Clamp dieselben Konstanten verwenden, statt zwei getrennte Zahlenpaare zu pflegen.


**Blitz-Lieferung: 5 von 9 Zielen liegen außerhalb des Fahrzeug-Clamps – der Auftrag kann nie abgeschlossen werden**  
`traumhaus.html` Zeile 4123

- Ablauf: LIEFERZIELE enthält Bauernhof(-40,-196), Windmühle(-136,-196), Sportpark(0,216), Freizeitpark(-190,158) und Gewerbe Ost(172,0). updLiefer (Zeile 4138) zählt den Auftrag nur bei hypot(pos-ziel)<7 als erledigt, autoFahr clamped die Autoposition aber auf x ±155 / z ±140 (Zeilen 4088-4089). Minimal erreichbarer Abstand: Bauernhof/Windmühle 56 m, Sportpark 76 m, Freizeitpark 39 m, Gewerbe Ost 17 m. Ablauf: Spieler steigt ins Auto, drückt den Liefer-Button, bekommt per Zufall eines dieser fünf Ziele (Zeile 4126), fährt so weit wie möglich, klebt an der Weltgrenze fest, der 60-Sekunden-Timer läuft ab

- Fix: Entweder den Clamp aufziehen (siehe Befund zu Zeile 4667) oder LIEFERZIELE beim Aufbau gegen die tatsächlichen Weltgrenzen filtern, statt eine feste Liste zu würfeln.


### MITTEL (44)


**edRot dreht ohne footprintFree -> Moebel ueberlappen, edSell verkauft danach das falsche Stueck**  
`traumhaus.html` Zeile 3376

- Ablauf: Sofa (size 2x1) auf (5,5) stellen -> belegt (5,5)+(6,5). Sessel auf (5,6) stellen. Sofa antippen -> Edit-Leiste -> '🔄 Drehen'. edRot loescht das Sofa und ruft doPlaceFurn mit rot=1, OHNE footprintFree zu pruefen (editVerschiebe in 3351 prueft es sehr wohl). Gedreht belegt das Sofa jetzt (5,5)+(5,6) und liegt im Sessel. Folgefehler: furnAt (3345) laeuft vorwaerts und liefert fuer (5,6) den Sessel, removeFurnAt (3290) laeuft rueckwaerts und trifft das zuletzt gepushte Sofa. Wer also den Sessel antippt und '💰 Verkaufen' drueckt, verkauft das Sofa und bekommt dessen Preis erstattet, waehrend die E

- Fix: In edRot vor dem Neuplatzieren `if(!footprintFree(f9.def,gx,gy,nr,f9)){hint("Gedreht passt es nicht");return;}` einbauen, analog zu editVerschiebe.


**Waende am Lot-Rand sind nie wieder abreissbar (Geld dauerhaft verloren)**  
`traumhaus.html` Zeile 4871

- Ablauf: Bau-Modus, 'Wand' waehlen, auf die Zelle (0,y) klicken und dabei nahe der linken Kante zielen. nearestEdge (4839) liefert {x:-1,d:1}; doPlaceWall legt die Wand unter dem Schluessel "-1,y,1" an, 25 $ werden abgebucht (applyWall prueft inLot nicht). Zum Abreissen muesste man Zelle (-1,y) antippen — tapAt bricht dort aber in Zeile 4861 wegen `!inLot` ab, und doDelete (3325) sucht nur die Schluessel gx,gy,0 und gx,gy,1, also nie die Westkante der Spalte 0. Dieselbe Sackgasse an der Suedkante: Klick unten in Zelle (x,GH-1) erzeugt "x,GH,0". Die Wand bleibt fuer immer stehen, 50-%-Erstattung unerrei

- Fix: In tapAt vor doPlaceWall die Kantenzelle pruefen: `var e=nearestEdge(c); if(!inLot(e.x,e.y)){hint("Ausserhalb des Grundstuecks");return;}` — oder doDelete zusaetzlich die Schluessel (gx-1,gy,1) und (gx,gy-1,0) beruecksichtigen.


**Aufwerten bucht das Geld ab, bevor geprueft wird, ob das Moebel noch existiert**  
`traumhaus.html` Zeile 3384

- Ablauf: Koop-Spiel: Spieler A tippt ein Moebel an (editShow setzt editSel) und drueckt '⬆️ Aufwerten'. Spieler B reisst genau dieses Moebel in derselben Sekunde ab (Netz-Nachricht 'del' -> removeFurnAt entfernt den Datensatz aus furn). Der Handler zieht in Zeile 3384 erst `geld-=kost` ab und ruft geldSend, und erst danach (Zeile 3385) `furn.indexOf(f9)`; der Index ist jetzt -1, also editHide() + return. Das Geld ist weg, aufgewertet wurde nichts, es gibt keine Rueckbuchung und keinen Hinweis. Dieselbe Reihenfolge-Falle gibt es nicht in edRot/editVerschiebe, die pruefen den Index vor jeder Aktion.

- Fix: Die Index-Pruefung (`var _iu=furn.indexOf(f9); if(_iu<0){editHide();return;}`) vor `geld-=kost;geldSend();` ziehen.


**Romantik: _rom und bett.busy werden nie aufgeräumt, wenn ein Sim vorher zur Arbeit geht**  
`traumhaus.html` Zeile 4486

- Ablauf: Romantik-Modus an (romChk). simThink löst ab Zeile 3796 etwa alle 4 Sekunden startRomance aus, sobald beide idle sind. startRomance setzt a._rom=b._rom=true und bett.busy=true (Zeile 4233/4235). Trifft nun 09:00 Uhr ein, setzt updWork (Zeile 4181) Mia auf state='work'. updSim steigt für sie ab sofort in Zeile 4467 (`if(s.state==="work")return;`) aus — der Aufräum-Block in Zeile 4486/4487 wird für sie nie erreicht, ihr _rom bleibt true. Max erreicht das Bett, wird idle, setzt sein _rom=false, aber `!sims.some(q=>q._rom)` ist wegen Mia falsch → romScene läuft nicht und romPair.busy bleibt bis 17

- Fix: In zielFrei() (Zeile 3878) zusätzlich `s9._rom=false;` setzen und dort — falls danach kein Sim mehr _rom hat — romPair.busy=false; romPair=null; nachziehen. zielFrei wird von startCrime, updWork und updLove bereits aufgerufen; für einsteigen und startVerstecken ergänzen.


**blur-Handler setzt nur shiftHeld zurück, nicht die Laufrichtung**  
`traumhaus.html` Zeile 4613

- Ablauf: Der Spieler hält am PC W gedrückt und wechselt währenddessen das Fenster (Alt-Tab, Klick in ein anderes Programm, Konsole öffnen). Das keyup landet im anderen Fenster; steerKeys.w bleibt gesetzt (keyup-Handler Zeile 4609/4610 feuert nie), steer.z bleibt -1. Der blur-Handler in Zeile 4613 setzt ausschliesslich shiftHeld zurück. Zurück im Spiel liefert steerActive() dauerhaft true, updSim (4471-4477) hält den Sim damit permanent in state='steer' und erneuert jedes Frame s._manualT: Max rennt endlos in eine Richtung bis an die Weltgrenze (steerMove-Klemme ±150/±135), lässt sich per Tastatur nur d

- Fix: Den blur-Handler erweitern: `addEventListener("blur",function(){shiftHeld=false;joyEdge=false;steerKeys={};updSteerKeys();});` (und dasselbe bei document visibilitychange auf hidden).


**Beim Autofahren läuft die Spielfigur unsichtbar weiter — einsteigen() setzt followSim vergeblich auf null**  
`traumhaus.html` Zeile 4477

- Ablauf: Weder updSim noch steerVec (Zeile 4626) prüfen `fahren`. Der Spieler tippt das geparkte Auto an (tapAt, einsteigen Zeile 3993): sims[0].mesh.visible=false und followSim=null. Im nächsten Frame läuft trotzdem sims.forEach(updSim) (Zeile 5432) vor autoFahr (5435): steerVec(0) liefert den Joystick-Vektor, updSim setzt state='steer' und ruft steerMove — die unsichtbare Figur läuft mit 4 m/s parallel zum Auto (13 m/s) los und driftet weg. Ausserdem setzt Zeile 4477 followSim sofort wieder auf sims[0] und macht das gezielte followSim=null aus einsteigen() wirkungslos. Konkret sichtbar mit Mia als Be

- Fix: In updSim direkt nach den frühen Returns ergänzen: `if(fahren&&si===meinSi())return;` — oder in steerVec ganz oben `if(fahren)return null;` und in einsteigen zusätzlich `sims[0].state="idle"` setzen, damit die Figur während der Fahrt eingefroren bleibt.


**Markthalle setzt stats.ernten auf 0 und lässt Erfolg + Team-Aufgabe hängen**  
`traumhaus.html` Zeile 4922

- Ablauf: stats.ernten ist ein Lebenszeit-Zähler: Er treibt den Erfolg „Grüner Daumen — 5 Ernten" (Zeile 3076) und die Koop-Team-Aufgabe „Fahrt zusammen 6 Ernten ein" (Zeile 4341). Der Markthallen-Knopf setzt ihn auf 0 (Zeile 4922). Ablauf Erfolg: 3 Beete ernten (Zähler 3) → in die Markthalle → verkaufen → Zähler 0. Wer nach jedem Marktbesuch weitermacht, kommt nie auf 5, der Erfolg bleibt für immer gesperrt. Ablauf Team-Aufgabe: teamArm() misst teamBase[4]=stats.ernten beim Aktivieren (Zeile 4347). Steht dort z. B. 12 und man verkauft danach am Markt, rechnet teamProg() max(0, 0−12)=0. Der Fortschritts

- Fix: Einen eigenen Bestandszähler für unverkaufte Ware einführen (z. B. stats.ernteLager), den die Markthalle leert, und stats.ernten als reinen Lebenszeit-Zähler unangetastet lassen.


**Markthalle bezahlt Ernten ein zweites Mal (doppelte Buchung)**  
`traumhaus.html` Zeile 4922

- Ablauf: updBeete zahlt beim Ernten bereits aus: geld += 35 + skills.arbeit.lv*8 und erhöht stats.ernten (Zeile 3958, Hinweis „🥕 Ernte! +X $"). Die Markthalle liest denselben Zähler und zahlt nochmal Math.round(e9*45*(1+lv*0.15)) (Zeile 4921–4922) — also 45 $+ pro Ernte, die schon vergütet wurde. Weil stats.ernten der kumulative Lebenszeit-Zähler ist (und aus dem Spielstand geladen wird, Zeile 3434), kassiert der erste Marktbesuch rückwirkend für ALLE jemals eingefahrenen Ernten. Ablauf: 20 Beete stellen, 20 Ernten einsammeln (+ca. 900 $), dann einmal zur Markthalle laufen → nochmal ~900–1300 $ für exa

- Fix: Entweder die Sofort-Auszahlung in updBeete streichen (Ernte wandert nur ins Lager) oder die Markthalle nur eine Differenz zum ohnehin gezahlten Erntelohn auszahlen lassen; in beiden Fällen über einen Lagerbestand statt über den Lebenszeit-Zähler abrechnen.


**Tageslimits für Coups, Straßenmusik und Angeln überleben keinen Reload**  
`traumhaus.html` Zeile 3406

- Ablauf: Die einzigen Bremsen der lukrativsten Einnahmequellen liegen ausschliesslich in window-Variablen: _coupTag/_coupHeute (max. 2 Coups pro Tag, geprüft Zeile 3870, gesetzt Zeile 3888), _buskTag/_buskHeute (max. 3 Auftritte, Zeile 5201/5206) und _angelCd (Zeile 4999/5035). snapshot() (Zeile 3406–3407) speichert keine davon, saveGame läuft aber alle 6 s (Zeile 5460) und sichert Geld und Tag. Ablauf: nachts zwei BANK-COUPs drehen (je ~900*(1+lv*0,4) Beute), 6 s auf den Autosave warten, Seite neu laden, „Weiterspielen" — _coupTag ist undefined, die Prüfung window._coupTag===tag schlägt fehl, es sind 

- Fix: _coupTag/_coupHeute, _buskTag/_buskHeute und _angelCd mit in snapshot() aufnehmen und in loadSnapshot() zurückschreiben.


**Team-Aufgabe "Macht 10 Emotes zusammen": Gast-Emotes zählen nicht**  
`traumhaus.html` Zeile 4342

- Ablauf: TEAMQ[5] misst den Fortschritt über `window._emoteCount`. Erhöht wird der Zähler nur in `doEmote()` (Zeile 3523), also lokal bei dem Spieler, der den Knopf drückt. Der Gast schickt `netSend({t:"emote",si,k})` (Zeile 3528); der Host verarbeitet die Nachricht in Zeile 3446 mit `onEmote(m.si,m.k)` — und `onEmote` (Zeile 3529) zeigt nur das Sprite an, ohne `_emoteCount` zu erhöhen. `checkTeamQ` läuft aber ausschliesslich beim Host (Zeile 4350). Ablauf: Im Koop tippt der Gast 15-mal auf Emotes, sieht seine Emojis über dem Sim, aber die HUD-Anzeige bleibt bei "(0/10)" — nur der Host bringt die gemei

- Fix: In `onEmote` (Zeile 3529) bzw. im Handler in Zeile 3446 `window._emoteCount=(window._emoteCount||0)+1;` ergänzen, damit der Host auch fremde Emotes zählt (analog zu den bereits gepatchten Fällen `fisch`/`growSold`/`moebelStat`).


**teamBase wird gespeichert, der zugehörige Emote-Zähler nicht — Fortschritt kippt nach Reload ins Negative**  
`traumhaus.html` Zeile 4346

- Ablauf: `teamArm()` merkt sich in `teamBase[k]` den Startwert der aktuellen Team-Aufgabe, und `snapshot()` sichert dieses Objekt als `tb` (Zeile 3407); `loadSnapshot` stellt es in Zeile 3429 wieder her. Die Messgrösse von TEAMQ[5] ist aber `window._emoteCount` — ein reiner Laufzeit-Global, der in keinem Snapshot vorkommt und beim Seitenstart wieder bei 0 beginnt. Ablauf: Im Koop läuft die Emote-Aufgabe an, als der Host in der Sitzung schon 9 Emotes gemacht hat → teamBase[5]=9. Host lädt neu (Zeile 5302 lädt th_save_coop) → teamBase[5]=9 kommt zurück, `_emoteCount` ist 0. `teamProg()` liefert `Math.max

- Fix: Entweder `_emoteCount` in den Snapshot aufnehmen (z. B. `ec:window._emoteCount`) und in loadSnapshot zurückschreiben, oder — konsistent mit den übrigen Aufgaben — den Zähler als `stats.emotes` führen, da `stats` bereits gespeichert und im Koop gesynct wird.


**Tageslimit wird erst NACH dem kompletten Tresor-Minispiel geprüft**  
`traumhaus.html` Zeile 3870

- Ablauf: Der einzige Weg zu startCrime ist crimeBtn (5211) → Job wählen → crimeGo (5223) → mgStart mit 3 Runden → Callback → startCrime. Die Sperre '(window._coupHeute||0)>=2' steht aber erst in startCrime, Zeile 3870. Ablauf: Spieler dreht um 21:30 und 22:00 zwei Coups. Um 22:30 ist crimeAvailable() weiterhin true (3861–3863 kennt _coupHeute nicht), der Button ist sichtbar, die Job-Auswahl öffnet sich, der Spieler spielt drei Minispiel-Runden — und bekommt danach nur 'Zwei krumme Dinger an einem Tag reichen'. Der Job startet nicht, es gibt keine Belohnung, keinen Malus. crimeBtn bleibt danach die ganz

- Fix: Die Limit-Prüfung nach crimeAvailable() ziehen, z. B. in 3861: 'return running&&!crime.on&&...&&!(window._coupTag===tag&&(window._coupHeute||0)>=2);'. Dann verschwindet der Button, sobald das Tageskontingent leer ist, und niemand spielt ein Minispiel ins Leere. Die Prüfung in 3870 als Sicherheitsnetz stehen lassen.


**crimeGo/startCrime prüfen crimeAvailable() nicht erneut — Coup läuft während der Arbeitszeit und zerschießt den Arbeits-Zustand**  
`traumhaus.html` Zeile 5229

- Ablauf: Das Minispiel in crimeGo (5224) hat kein Zeitlimit — es endet erst, wenn der Spieler dreimal 'Stop' drückt. Die Spielzeit läuft dabei weiter (5400: uhrzeit+=dt*4, also 1 Spielstunde ≈ 15 Realsekunden). Ablauf: Spieler startet um 04:50 einen Coup, lässt das Minispiel-Overlay ca. 90 Realsekunden offen (Uhr springt auf ~11:00), drückt dann dreimal Stop. Der Callback ruft in 5229 startCrime(ji,false) auf. Weder crimeGo noch startCrime (3868) prüfen crimeAvailable() erneut, also weder das Zeitfenster noch 'arbeiten' noch 'fahren'. startCrime setzt in 3874 ALLE sims auf state="work" und mesh.visible

- Fix: In crimeGo am Anfang und im mgStart-Callback vor startCrime erneut absichern: 'if(!crimeAvailable()){hint("🌙 Zu spät — krumme Dinger nur zwischen 21:00 und 05:00.");return;}'. Zusätzlich in crimeBtnUpd (3864) den offenen Dialog schließen, wenn crimeAvailable() false wird: 'if(!crimeAvailable())document.getElementById("crimeWahl").style.display="none";'


**Geschnappt-Fall bucht zusätzlich das Umlackieren — Statistik, Erfolg und Meldung widersprechen sich**  
`traumhaus.html` Zeile 4165

- Ablauf: aufGrund in 4023 umfasst |x|<GW*CS/2 und |z|<GH*CS/2, mit GW=72,GH=46,CS=2 (Zeile 363) also den kompletten Heimatbereich ±72/±46. Ablauf: Spieler klaut ein Auto (wantedPlus(2) in 4002), fährt aufs eigene Grundstück und bleibt sitzen. Ein Streifenwagen kommt auf <3.2 heran, nach 1.2 s greift 4163. Zeile 4164 berechnet die Busse korrekt mit wanted=2. Zeile 4165 ruft aussteigen() auf — dort greift die Pay'n'Spray-Klausel 4025, weil wanted>0 und aufGrund: stats.lackiert wird hochgezählt, der Erfolg 'Umlackierer' (3094, Text 'Fahndung getilgt') schaltet frei, polizei wird geleert und wanted auf 0 g

- Fix: Den Fahndungsstand vor dem Aussteigen sichern und die Pay'n'Spray-Klausel für den Bust ausschalten, z. B. in 4163: 'var wVor=wanted; var busse=Math.min(geld,200+wVor*150+(skills.krimi.lv||0)*60); geld-=busse; ... wanted=0; if(fahren)aussteigen(); hint("🚔 Geschnappt! Busse: −"+busse+" $ (Fahndung "+wVor+"⭐)");'. Weil wanted vor aussteigen() genullt wird, greift die Bedingung in 4025 nicht mehr.


**Nitro läuft nur herunter, während gelenkt wird — Boost wird unbegrenzt haltbar, Flamme friert sichtbar ein**  
`traumhaus.html` Zeile 4052

- Ablauf: nitro-=dt steht innerhalb von if(l>0.1) (Lenk-Input vorhanden). Ebenso stehen fx.visible=true und das else fx.visible=false (Zeile 4054/4058) nur in diesem Zweig. Ablauf: 🚀 drücken (nitro=1.6), sofort Joystick loslassen. Der else-Zweig (Zeile 4067) tickt nitro nicht herunter → nitro bleibt für immer 1.6. Der Nitro-Sprite bleibt an der zuletzt gesetzten Weltposition sichtbar in der Luft stehen (mitten auf der Strasse), der Tacho-Balken bleibt orange (Zeile 4082), und beim nächsten Antippen des Joysticks hat man wieder vollen 25er-Speed statt 13. Praktisch: 🚀 drücken, loslassen, 10 Sekunden wart

- Fix: nitro-=dt und die fx-Sichtbarkeits-Logik aus dem if(l>0.1)-Block herausziehen und wie die Sprungphysik (Zeile 4068 ff.) unbedingt jeden Frame ausführen.


**Kompletter Arbeitstag entfällt, wenn man über das 09:00–17:00-Fenster fährt**  
`traumhaus.html` Zeile 5436

- Ablauf: Im Hauptloop steht if(!fahren)updWork(dt). Die Uhr läuft mit uhrzeit+=dt*4 (Zeile 5400), 1 Spielstunde = 15 reale Sekunden, das Arbeitsfenster 09–17 Uhr dauert also nur 120 reale Sekunden. Ablauf: um 08:30 einsteigen, eine Lieferung fahren (60 s) plus etwas herumfahren, um 17:30 aussteigen. Beim Aussteigen läuft updWork wieder: der erste Zweig verlangt hh>=9&&hh<17 (falsch, es ist 17:30), der zweite Zweig verlangt arbeiten===true (ist aber nie true geworden). Ergebnis: kein Arbeitsbeginn, kein Feierabend, kein Gehalt (2*(100+lv*40), also mind. 200 $) und kein skillXp('arbeit') für diesen Tag —

- Fix: updWork auch während fahren laufen lassen und stattdessen nur den Auto-Teleport darin überspringen: in Zeile 4179/4185 die autoRec-Manipulation mit if(window.autoRec&&driveCar!==window.autoRec) absichern. Alternativ die Zeitschwellen als 'überschritten seit letztem Frame' prüfen statt als Fenster.


**Autoklau ohne jede Fahndung: Aussteigen innerhalb von 1,5 s**  
`traumhaus.html` Zeile 4002

- Ablauf: Beim Klauen wird die Fahndung nicht sofort gesetzt, sondern per setTimeout(...,1500) mit der Bedingung if(fahren)wantedPlus(2). Ablauf: ein Verkehrsauto antippen (einsteigen(v9,true), Zeile 4866) → stats.autosGeklaut wird sofort hochgezählt und der Erfolg zählt → sofort 🚪 Aussteigen drücken. Nach 1,5 s ist fahren===false, wantedPlus wird nie aufgerufen, es gibt keine Polizei. Beliebig wiederholbar. Umgekehrter Fall: klauen, in <1,5 s aussteigen und ins eigene gekaufte Auto einsteigen → dann ist fahren wieder true und man bekommt 2 Sterne fürs Einsteigen ins eigene Auto, ohne erkennbaren Grund.

- Fix: Statt if(fahren) den konkreten Wagen merken, z. B. var geklautesAuto=a; setTimeout(function(){if(fahren&&driveCar===geklautesAuto)wantedPlus(2);},1500) — und die Fahndung zusätzlich auch dann setzen, wenn der Spieler das geklaute Auto vorzeitig verlässt.


**Zweiter Auto-Kauf löscht das erste Auto ohne Rückerstattung und ohne Warnung**  
`traumhaus.html` Zeile 3194

- Ablauf: applyFurn löscht bei def.car bedingungslos das vorhandene Auto: scene.remove(window.autoRec.mesh); window.autoRec=null. Der Kaufpreis wurde in tapAt (Zeile 4891) aber schon voll abgezogen und für das alte Auto gab es nie eine Erstattung. Ablauf: Kombi für 2400 $ kaufen, später in der Palette 'Flitzer' 4800 $ wählen und irgendwo aufs Grundstück tippen → Kombi verschwindet spurlos, insgesamt 7200 $ bezahlt, ein Auto vorhanden. Härtere Variante: während der Fahrt auf 🔨 Bauen (Zeile 5232 hat keine fahren-Sperre) und ein Auto setzen → driveCar zeigt weiter auf den aus der Szene entfernten Mesh, man

- Fix: Vor dem Ersetzen den Restwert erstatten (geld+=Math.round(defOf(window.autoRec.id).cost*0.5)) oder den Kauf mit einem Hinweis ablehnen, solange schon ein Auto existiert. Zusätzlich in applyFurn abbrechen bzw. vorher aussteigen(), wenn driveCar===window.autoRec.


**Einsteigen in einen bereits fahrenden Zug teleportiert und setzt den Rundenzähler zurück**  
`traumhaus.html` Zeile 4571

- Ablauf: coasterBtnUpd blendet den Button allein nach Nähe und `!C.mit` ein (Zeile 4588) — der Zustand `C.faehrt` wird nicht geprüft. Im Koop: Spieler A steigt ein, `netSend({t:"coasterStart"})` startet auch bei Spieler B den Zug (Zeile 3453). B steht an der Station, sein `C.mit` ist false → Button sichtbar. Klickt B mitten in der Fahrt, greift in coasterEinsteigen die Bedingung `if(!C.faehrt)` (Zeile 4571) nicht: B wird sofort an die aktuelle Kurvenposition gehängt, also über bis zu ~25 Einheiten quer über den Park an den Zug teleportiert. Zusätzlich setzt Zeile 4570 bedingungslos `C.runden=0`, obwohl

- Fix: Button nur zeigen, wenn der Zug steht (`!C.faehrt` in die Bedingung in Zeile 4587/4588 aufnehmen) bzw. in coasterEinsteigen bei bereits fahrendem Zug abbrechen; `C.runden=0` nur im Zweig setzen, in dem die Fahrt tatsächlich neu gestartet wird.


**Gast fährt gegen die Host-Positionssynchronisierung — Host sieht ihn die ganze Fahrt am Bahnsteig stehen**  
`traumhaus.html` Zeile 4562

- Ablauf: updCoaster setzt beim Mitfahren `sims[meinSi()]` auf die Zugposition (Zeile 4561/4562). Für einen Gast ist das sims[1], dessen Position aber autoritativ vom Host kommt: updSim zieht sie jeden Frame per `s.x+=(s.net.x-s.x)*Math.min(1,dt*8)` zurück und überschreibt zusätzlich `s.rot=s.net.r;s.pose=s.net.p` (Zeile 4464/4465). Der Host erfährt vom Einsteigen nur `coasterStart` (Zeile 3453) — dass der Gast im Wagen sitzt, wird nie übertragen, also simuliert und sendet der Host den Gast weiter an der Station. Ablauf: Gast steigt ein → auf seinem Bildschirm wird die Figur jeden Frame ~13 % Richtung S

- Fix: Mitfahrt als Zustand übertragen (z. B. `{t:"coasterRide",si,on}`), den mitfahrenden Sim auf Hostseite wie `_bf`/`_hide` von der Simulation ausnehmen und seine Position aus der Kurve berechnen; gastseitig `s.net` für den eigenen Sim ignorieren, solange `C.mit` gilt.


**Ego-Modus wird nach der Fahrt zwangsweise abgeschaltet, auch wenn er vorher an war**  
`traumhaus.html` Zeile 4580

- Ablauf: coasterEinsteigen schaltet Ego nur bedingt ein (`if(!egoMode)egoToggle()`, Zeile 4572), coasterAussteigen schaltet es aber bedingungslos ab, sobald es an ist (`if(egoMode)egoToggle()`, Zeile 4580) — der Zustand vor dem Einsteigen wird nirgends gemerkt. Ablauf: Spieler spielt bewusst in Ego-Perspektive (egoBtn, Zeile 4896), läuft zur Achterbahn, steigt ein (kein Umschalten, weil schon Ego), fährt 2 Runden — am Ende wirft ihn coasterAussteigen in die Übersichtskamera zurück, setzt zusätzlich camB=0.72 und camRT auf ≥26 (Zeile 4593). Er muss den Ego-Modus jedes Mal neu einschalten, obwohl er ihn 

- Fix: Beim Einsteigen `C.egoVorher=egoMode` merken und beim Aussteigen nur dann umschalten, wenn `egoMode!==C.egoVorher`.


**Fahndungsanzeige beim Gast wird einen Frame nach dem Empfang wieder auf 0 gesetzt**  
`traumhaus.html` Zeile 4155

- Ablauf: Der Host schickt bei jeder Fahndungsänderung {t:'wanted',w:n} (Z. 4152). Der Gast setzt in Z. 3474 wanted=m.w, ruft updWantedHUD() und zeigt den Hinweis '🚨 Fahndung Stufe n'. Im selben Frame läuft aber updPolizei(dt,now) (Loop Z. 5436, ohne Gast-Guard — anders als updNpcs/updGrow/updWork/updLove). Beim Gast ist das Array 'polizei' garantiert leer, denn gefüllt wird es nur von setWanted, und setWanted wird nur aus wantedPlus (steigt beim Gast in Z. 4150 sofort aus) und aus updPolizei Z. 4171 (hinter dem Early-Return) aufgerufen. Also greift Z. 4155: polizei.length===0 -> wanted=0 -> updWantedHU

- Fix: In Z. 4155 den Zwangs-Reset für den Gast abschalten, z.B. Funktionsbeginn 'if(MPs&&!mpHost){updWantedHUD();return;}' — der Gast rendert nur den vom Host gemeldeten Stand und räumt ihn nicht selbst weg. Zusätzlich sollte der Host beim Festnehmen (Z. 4167, wanted=0 ohne Broadcast) und beim Umlackieren (Z. 4026, ebenfalls wanted=0 ohne Broadcast) netSend({t:'wanted',w:0}) nachziehen.


**Tresor-Minispiel des Gasts hat null Einfluss auf den Coup-Ausgang**  
`traumhaus.html` Zeile 5225

- Ablauf: crimeGo() speichert das Minispiel-Ergebnis nur lokal in crime.mgBonus (Z. 5225) und meldet dem Spieler '🔓 Sauber geknackt — beste Chancen!'. Über das Netz gehen aber nur crimeAsk/crimeJoin/crimeGo — der Bonus ist in keiner Nachricht enthalten. Ausgewertet wird er ausschliesslich in finishCrime (Z. 3885), und finishCrime bricht beim Gast in Z. 3883 ab ('if(MPs&&!mpHost)return'). Startet also der Gast den Coup, rechnet der Host mit SEINEM crime.mgBonus, der in Z. 3885 nach jedem Coup auf 0 zurückgesetzt wird und beim Host-Client sonst nie gesetzt wurde. Der Gast kann den Tresor perfekt oder kata

- Fix: Bonus mitschicken: in Z. 5227/3876 'netSend({t:"crimeGo",j:jobIdx,a:!!withAccomplice,mg:crime.mgBonus||0})' und im Handler Z. 3506 vor startCrime 'crime.mgBonus=m.mg||0;' setzen (analog im crimeAsk/crimeJoin-Pfad, damit der Wert bis zum tatsächlichen Start überlebt).


**Tageslimit von 2 Coups gilt für den Gast nie — der Gast kann unbegrenzt rauben**  
`traumhaus.html` Zeile 3883

- Ablauf: startCrime prüft in Z. 3870 'window._coupTag===tag && window._coupHeute>=2'. Hochgezählt wird _coupHeute aber erst in Z. 3888 — also NACH dem Gast-Early-Return in Z. 3883 ('if(MPs&&!mpHost)return'). Der Handler crimeEnd (Z. 3507) zählt ebenfalls nicht hoch. Auf dem Gast-Client bleibt _coupHeute damit dauerhaft undefined, die Sperrbedingung wird nie wahr. Ablauf: Gast wartet auf 21:00, macht Coup 1, 2, 3, 4 … hintereinander, nur begrenzt durch die 7 Sekunden crime.t. Der Host wird nach seinem zweiten eigenen Coup mit '👮 Zwei krumme Dinger an einem Tag reichen' geblockt — und zwar auch dann, wen

- Fix: Zähler vor den Rollen-Return ziehen: Z. 3888 direkt hinter 'var job=crime.job;crime.on=false;' (Z. 3880) verschieben, damit beide Seiten identisch zählen; alternativ im crimeEnd-Handler (Z. 3507) beim Gast '_coupHeute'/'_coupTag' aus der Nachricht übernehmen.


**applySaison() liest tag, bevor tag aus dem Spielstand gesetzt wird**  
`traumhaus.html` Zeile 3429

- Ablauf: In loadSnapshot steht applySaison() in Zeile 3429, die Zuweisung tag=sn.tag aber erst in Zeile 3433. applySaison() ruft calcSaison() = Math.floor((tag-1)/5)%4 mit dem noch alten tag (beim Seitenstart 1, Zeile 3060) auf und färbt den Rasen Frühlings-grün. Im Solo-Pfad ist das maskiert, weil Zeile 5287 applySaison() nochmal aufruft. Im Koop-Pfad nicht: (a) Host klickt „Hosten" → Zeile 5302 lädt th_save_coop, danach folgt nur startGame(), kein zweites applySaison(). (b) Gast: Zeile 3458 loadSnapshot(m.sn);startGame() — ebenfalls kein applySaison(). Zusätzlich hängt der Gast fest: der uhr-Handler 

- Fix: applySaison() aus Zeile 3429 herausnehmen und hinter die Zuweisungen in Zeile 3433 verschieben (also nach if(sn.tag)tag=sn.tag;).


**Gespeichertes Wetter wird beim Laden sofort neu ausgewürfelt**  
`traumhaus.html` Zeile 5287

- Ablauf: snapshot() speichert das Wetter (we:wetter, Zeile 3407) und loadSnapshot stellt es mit if(sn.we)setWetter(sn.we) wieder her (Zeile 3429). Im Solo-Start-Handler folgt aber unmittelbar danach in Zeile 5287 applySaison();rollWetter(); — rollWetter() setzt setWetter() unbedingt neu per Math.random(). Der restaurierte Wert lebt also nur wenige Millisekunden. Ablauf: In einer Nicht-Winter-Jahreszeit warten, bis es regnet, 6 s bis zum Autosave (Zeile 5460) abwarten, Seite neu laden, „Solo" klicken → in 75 % der Fälle ist es wieder sonnig; das Feld we im Spielstand hat faktisch keine Wirkung.

- Fix: In Zeile 5287 rollWetter() nur aufrufen, wenn kein Wetter aus dem Spielstand kam, z. B. das geladene sn.we in einer Variablen merken und rollWetter() nur bei fehlendem Wert ausführen.


**Emissive-Farbe aller Nachtfenster wird bei der ersten Dämmerung dauerhaft überschrieben**  
`traumhaus.html` Zeile 5420

- Ablauf: Der Nacht-Umschalter macht dorfFenster.forEach(fm=>{fm.emissiveIntensity=nacht9?2.2:0; if(nacht9&&fm.emissive)fm.emissive.setHex(0xffcf80); …}). setHex mutiert das Color-Objekt des Materials in-place, die Originalfarbe wird nirgends gesichert und beim Tagwechsel nicht zurückgesetzt. Betroffen sind u. a. die Neon-Schilder der Läden (Zeile 1575: emissive = individuelle Ladenfarbe sh[3], emissiveIntensity bewusst 0.5) und die Kirchen-/Turm-Zifferblätter (Zeile 2664: emissive 0xffe8a8). Ablauf: Spiel starten (8:00) — die Neon-Schilder sind schon jetzt aus, weil der erste Frame emissiveIntensity au

- Fix: Beim Anlegen die Ursprungsfarbe merken (z. B. fm.userData.emiBase=fm.emissive.getHex()) und in Zeile 5420 statt des festen 0xffcf80 diesen Wert setzen; Materialien mit eigener Tag-Leuchtkraft (Neon) über ein Flag von der emissiveIntensity=0-Regel ausnehmen.


**carLean (mesh.rotation.z) wird beim Aussteigen nie zurückgesetzt — Auto bleibt dauerhaft schief**  
`traumhaus.html` Zeile 4029

- Ablauf: autoFahr schreibt bei jeder Lenkbewegung m.rotation.z=carLean (Z. 4080, carLean bis ca. ±0.25 rad). aussteigen() setzt driveCar, driveGeklaut, nitro, carAirY, carVY, carAirT und position.y zurück (Z. 4028/4029), aber NICHT rotation.z — und carLean selbst bleibt ebenfalls stehen. updVerkehr schreibt danach nur noch rotation.y (Z. 2207/2208), rotation.z bleibt für immer erhalten. Ablauf: Ein fahrendes Auto klauen, Joystick voll zur Seite halten (Kurve) und in genau diesem Moment 🚪 antippen. Das Auto reiht sich wieder in den Verkehr ein und fährt ab jetzt permanent um bis zu 14° verkantet über di

- Fix: In aussteigen() vor dem Zurücksetzen ergänzen: a.mesh.rotation.z=0; carLean=0; (und in einsteigen() carLean=0 setzen, damit ein alter Wert nicht in die nächste Fahrt übernommen wird).


**Ringstrassen-Autos halten an Ampeln, die es dort gar nicht gibt**  
`traumhaus.html` Zeile 2197

- Ablauf: ROUTEN enthält zwei Ringstrassen-Spuren mit axis:"z" bei x=-109.5 und x=114.5 (Z. 2047). updVerkehr wendet die Ampel-Regel aber pauschal auf jede z-Route an: ctrs=[58,-58], off=11 (Z. 2197), also Haltelinien bei z=47/-69 bzw. z=69/-47. Die einzigen Ampeln/Kreuzungen liegen jedoch bei x=±RX(=±78); die Nord-/Südstrasse endet bei x=±102 (RL=204) und berührt den Ring bei x=±112 nie. Ablauf: Zur West-Ringstrasse laufen/fahren (ca. x=-110, z=40..55) und zuschauen — dort steht alle 10 s für 5,5 s ein Auto mitten auf freier Strecke, ohne Kreuzung, ohne Ampel, und fährt dann grundlos wieder los. Gleich

- Fix: Die Ampel-Prüfung an die Route binden statt an die Achse, z.B. Flag ampel:false in den beiden Ring-Routen setzen und Z. 2196 zu if(v.route.ampel!==false&&ampRed(v.route.axis)) erweitern — oder die Kreuzungs-Zentren aus der Route ableiten (nur Routen mit |x|≈RX bzw. |z|≈SZ+12).


**Koop: Gast überschreibt jeden Frame die Position des vom Host geklauten Autos**  
`traumhaus.html` Zeile 3461

- Ablauf: Fährt der Host ein geklautes Verkehrsauto, sendet er alle 0,35 s {t:"sims", ca:{x,z,r,vi:verkehr.indexOf(driveCar)}} (Z. 5455). Der Gast setzt damit verkehr[vi].mesh.position (Z. 3461) und blendet zugleich den Host-Avatar aus (Z. 3462: sims[0].mesh.visible=!m.ca). Der Gast lässt aber updVerkehr ungebremst weiterlaufen (Z. 5437, nur durch if(running) gedeckt) und dort ist driveCar beim Gast null — die Ausnahme in Z. 2188 greift also nicht. Schon im nächsten Frame schreibt updVerkehr Position und Rotation des Autos wieder auf die eigene Route zurück. Ablauf: Koop starten, Host tippt ein fahrende

- Fix: Beim Gast den ferngesteuerten Wagen aus der lokalen Simulation nehmen: empfangenes vi in einer Variablen _netCarIdx merken und in updVerkehr zusätzlich zu v===driveCar auch verkehr.indexOf(v)===_netCarIdx überspringen (bei ca:null wieder auf -1 zurücksetzen).


**Bus ignoriert Ampel und Abstandsregel und fährt durch die wartende Kolonne**  
`traumhaus.html` Zeile 2214

- Ablauf: Der Bus liegt bei z=SZ+14.5=60.5, die Verkehrsspur ROUTEN[0] bei z=SZ+14=60 (Z. 2041/2098) — 0,5 m Abstand bei 2,4 m Bus- und ca. 1,7 m Autobreite, die Fahrzeuge überlappen also dauerhaft. Der Bus-Block (Z. 2214-2223) ruft weder ampRed() auf noch die Abstandsprüfung; er kennt nur den Halt bei x=-8. Ablauf: An die Südstrasse in Höhe der Kreuzung x=78 stellen und warten, bis die x-Ampel rot ist. Die Autos stauen sich bei x=68.5 im 7,5-m-Raster — der gelbe Bus fährt bei Rot geradewegs durch die stehende Kolonne und durch die Kreuzung.

- Fix: Im Bus-Block dieselben Regeln anwenden: vor dem Positions-Update if(ampRed("x")) die Haltelinien-Klemmung wie in Z. 2196-2200 mit prev9/pos ausführen und zusätzlich den Abstand zu Autos auf ROUTEN[0] prüfen (bzw. den Bus auf eine eigene, freie z-Lage legen).


**Kochen: die beiden Folge-Timer in kochTap liegen nicht in KOCH.tmr — "Aufhören" kann sie nicht abbrechen**  
`traumhaus.html` Zeile 5089

- Ablauf: kochQuit (Zeile 5105) raeumt nur clearTimeout(KOCH.tmr) auf. Die beiden in kochTap erzeugten Timer werden aber gar nicht in KOCH.tmr abgelegt: Zeile 5089 setTimeout(kochEnd,600) und Zeile 5090 setTimeout(...kochRound...,700). Folge 1: Letzte Zutat der 3. Runde tippen und innerhalb von 600 ms "Aufhören" druecken -> der Dialog schliesst, aber kochEnd laeuft trotzdem durch: volle Belohnung (kochApply, Hunger +20..60/Spass), Erfolg "Sternekoch" bei perfektem Score und der Ergebnis-Hinweis erscheinen, obwohl der Spieler abgebrochen hat — der Abbruch-Knopf hat in diesem Fenster keinerlei Wirkung. Fo

- Fix: Beide Timer in KOCH.tmr ablegen und zusaetzlich per KOCH.on absichern: KOCH.tmr=setTimeout(function(){if(KOCH.on)kochEnd();},600); bzw. KOCH.tmr=setTimeout(function(){if(KOCH.on)kochRound();},700); Zusaetzlich sollte kochStart vorsichtshalber clearTimeout(KOCH.tmr) voranstellen.


**Coup: das Tageslimit wird erst nach dem kompletten Minispiel geprueft — Aktion laeuft ins Leere**  
`traumhaus.html` Zeile 5230

- Ablauf: crimeGo (Zeile 5230) startet sofort mgStart("Tresor knacken"); die Pruefung auf max. 2 Coups pro Tag steht erst in startCrime (Zeile 3877) und damit im Callback NACH dem Minispiel. Ablauf: Nach zwei erfolgreichen Coups am selben Tag nachts erneut auf "Krummes Ding drehen" tippen (crimeAvailable in Zeile 3861 kennt das Limit nicht, der Knopf bleibt sichtbar), einen Job waehlen, drei Runden Timing-Minispiel durchspielen — im Koop wird danach zusaetzlich 10 Sekunden auf die Komplizen-Antwort gewartet (Zeile 5235) — und erst dann kommt "Zwei krumme Dinger an einem Tag reichen". Die gesamte Aktion 

- Fix: Die Limit-Pruefung aus startCrime nach vorne ziehen: in crimeAvailable() (Zeile 3861) mit aufnehmen bzw. am Anfang von crimeGo pruefen und mit dem Hinweis abbrechen, bevor mgStart aufgerufen wird. Zusaetzlich crime.mgBonus=0 setzen, wenn startCrime vorzeitig zurueckkehrt.


**Hund kann beliebig oft gekauft werden — jedes Mal 450 $ ohne Wirkung, und er lässt sich nie wieder entfernen**  
`traumhaus.html` Zeile 3286

- Ablauf: Der pet-Zweig in applyFurn (Zeile 3286-3290) legt den Hund NICHT in das Array `furn`, sondern nur in die Variable `haustier`, und macht ein frühes `return`. footprintFree (Zeile 3326-3333) prüft aber ausschliesslich `furn`. Ablauf: Bauen-Modus öffnen, 🐕 Hund (Haustier), 450 $, irgendwo platzieren — Hund erscheint. Direkt danach nochmal denselben Hund kaufen und auf eine andere Zelle setzen: die Platzprüfung meldet nichts, geld-=450 wird in tapAt ausgeführt, stats.moebelGekauft wird erneut hochgezählt — aber Zeile 3287 entfernt den alten Mesh und es existiert weiterhin genau EIN Hund. Beliebig 

- Fix: Im pet-Zweig einen Datensatz in `furn` pushen (z.B. {fid,id,gx,gy,rot,def,mesh:null,pet:1}), damit footprintFree und removeFurnAt greifen; zusätzlich am Anfang des Zweigs bei bereits vorhandenem `haustier` mit hint("Ihr habt schon einen Hund") abbrechen, BEVOR in tapAt geld abgezogen wird.


**skillXp zeigt bei jedem Nicht-"arbeit"-Skill die Liebes-Meldung mit dem falschen Level**  
`traumhaus.html` Zeile 3151

- Ablauf: skillXp (Zeile 3144-3153) unterscheidet nur `k==="arbeit"` und ALLES ANDERE; der else-Zweig (3151) meldet fest "💘 Liebes-Skill Level "+sk.lv und wirft hearts(), obwohl sk das gelevelte Fremd-Skill ist. Da `krimi` mit lv:0 startet, ist need = sk.lv*5 = 0, d.h. der allererste Krimi-XP löst sofort einen Level-Up aus. Ablauf: Spiel starten, bis nach 21 Uhr warten, 🕶️-Knopf drücken, Coup zu Ende laufen lassen → finishCrime ruft skillXp("krimi",2) bzw. ("krimi",1) → sofort Vollbild-Overlay "💘 Liebes-Skill Level 1 — euer Herz schlägt schneller!" plus Herzchen, obwohl skills.liebe.lv unverändert 1 ist

- Fix: Die Meldung an den Skill koppeln, z.B. `var TXT={arbeit:"💼 BEFÖRDERUNG! Karriere-Level ",liebe:"💘 Liebes-Skill Level ",krimi:"🕶️ Krimi-Level "};` und nur bei k==="liebe" hearts() auslösen.


**Romantik-Szene wird beim Gast doppelt und zu früh angezeigt (zwei netSend pro Turteln)**  
`traumhaus.html` Zeile 4260

- Ablauf: startRomance schickt bereits beim LOSLAUFEN `netSend({t:"rom",a:0,b:1})` (Zeile 4260), obwohl die Sims da erst zum Bett unterwegs sind. Wenn sie ankommen, ruft updSim in Zeile 4511 `romScene(0,1)` OHNE das silent-Flag auf, und romScene sendet am Ende erneut `netSend({t:"rom",...})`. Der Gast-Handler (Zeile 3516) ruft beide Male romScene(...,true). Ablauf: Koop-Spiel, Romantik-Haken gesetzt, Bett steht im Haus. Sobald simThink (3813-3815) die Romantik auslöst, sieht der Gast sofort das Overlay "Max & Mia turteln … 💞", während die Figuren noch quer durchs Haus laufen — und ein paar Sekunden spät

- Fix: Das netSend aus startRomance (Zeile 4260) entfernen — die Szene wird ohnehin bei der Ankunft synchronisiert — oder umgekehrt den Aufruf in Zeile 4511 als `romScene(0,1,true)` markieren und das Start-netSend als reine Reservierung des Betts umbauen.


**haustier wird beim Laden nie zurückgesetzt – Hund wandert aus einem Spielstand in den anderen**  
`traumhaus.html` Zeile 3451

- Ablauf: loadSnapshot setzt in Zeile 3451 nur `if(sn.hu&&!haustier)applyFurn("hund",…)` – es gibt keinen Gegenpart, der ein vorhandenes Haustier entfernt. Für das Auto existiert dieser Gegenpart in Zeile 3436 (`if(!sn.au&&window.autoRec){scene.remove(...);window.autoRec=null;}`), fürs Haustier nicht. haustier wird im gesamten File nur ein einziges Mal zugewiesen (3289) und nirgends wieder auf null gesetzt; der Hund liegt auch nicht in `furn`, removeFurnAt/doDelete erreichen ihn also nicht. Ablauf: Im Koop-Stand (th_save_coop) existiert ein Hund. Spieler tippt "Raum erstellen" – hostBtn lädt in Zeile 53

- Fix: In loadSnapshot analog zum Auto ergänzen: `if(!sn.hu&&haustier){scene.remove(haustier.mesh);haustier=null;}` – vor der Zeile 3451 einfügen.


**Gespeichertes Wetter wird beim Solo-Laden sofort wieder überwürfelt**  
`traumhaus.html` Zeile 5311

- Ablauf: snapshot() speichert `we:wetter`, loadSnapshot stellt es in Zeile 3453 per setWetter(sn.we) wieder her. Direkt danach ruft soloBtn.onclick in Zeile 5311 aber bedingungslos `rollWetter()` auf, und rollWetter() (894) macht immer ein `setWetter(...)` mit frischem Math.random(). Ablauf: Spieler spielt bei Schnee/Regen, Autosave sichert `we:"schnee"`, Tab neu laden, "Solo bauen" → der geladene Wert wird im selben Klick-Handler überschrieben, in 75 % der Fälle steht wieder "sonne". Das Feld `we` hat im Solo-Pfad – dem einzigen, in dem es zählt (Gäste bekommen Wetter ohnehin per {t:"wetter"}-Nachrich

- Fix: rollWetter() nur aufrufen, wenn kein Stand geladen wurde – z. B. Flag setzen: `var geladen=false; … loadSnapshot(...); geladen=true; … applySaison(); if(!geladen)rollWetter();`


**followSim wird vor egoToggle() auf null gesetzt — der gefolgte Bewohner bleibt unsichtbar**  
`traumhaus.html` Zeile 4919

- Ablauf: Auf Mia tippen (followSim=Mia), 👁️ druecken (updCam Zeile 4555 setzt Mia.mesh.visible=false), dann ➖ (zoomOut) druecken. Der Handler setzt erst followSim=null und ruft danach egoToggle(). Der Else-Zweig in Zeile 4617 stellt nur _me (=sims[0]) und followSim wieder sichtbar — followSim ist zu diesem Zeitpunkt aber schon null, also wird Mias Mesh nie wieder eingeblendet. Mia laeuft ab jetzt komplett unsichtbar durch die Stadt (nur ein Arbeits-Zyklus, der in Zeile 3905 alle Meshes wieder sichtbar setzt, repariert es zufaellig). Gleiches Muster in Zeile 4679 (updFollow) und Zeile 4017 (einsteigen).

- Fix: Reihenfolge umdrehen: erst if(egoMode)egoToggle(); dann followSim=null; — bzw. in egoToggle die Sichtbarkeit aller sims wiederherstellen (sims.forEach(s=>{if(s.mesh&&!s._bf&&s.state!=="work")s.mesh.visible=true;})).


**Ego waehrend der Autofahrt ausschalten blendet den Fahrer-Koerper ein, der parallel mitgesteuert wird**  
`traumhaus.html` Zeile 4617

- Ablauf: In ein Auto einsteigen (einsteigen Zeile 4017 setzt sims[0].mesh.visible=false), waehrend der Fahrt 👁️ zweimal druecken (Ego an, Ego aus). Der Else-Zweig setzt _me.mesh.visible=true, obwohl der Fahrer im Auto sitzt — nichts blendet ihn wieder aus, weil updCam waehrend fahren den Cockpit-Zweig (Zeile 4550) nimmt. Zusaetzlich verarbeitet updSim den Fahrer weiter: steerVec(0) liefert bei Joystick-Input auch fuer sims[0] einen Vektor (Zeile 4494), also bucht derselbe Joystick-Ausschlag doppelt — einmal aufs Auto (autoFahr Zeile 4069) und einmal auf den Koerper (steerMove). Sichtbar rennt jetzt ein

- Fix: In updSim frueh abbrechen, wenn die Figur faehrt (analog zu s._bf): if(si===meinSi()&&fahren)return; und in egoToggle die Sichtbarkeit nur wiederherstellen, wenn !fahren.


**dragging bleibt true, wenn die Maustaste ausserhalb des Fensters losgelassen wird**  
`traumhaus.html` Zeile 4807

- Ablauf: Linke Maustaste auf der Canvas druecken, den Zeiger bei gedrueckter Taste aus dem Browserfenster ziehen (z. B. auf den Desktop / zweiten Monitor) und dort loslassen. Das mouseup-Event erreicht das Fenster nie, dragging bleibt true. Zurueck ueber der Canvas dreht/verschiebt jede blosse Mausbewegung die Kamera (Zeile 4800-4805), ohne dass eine Taste gedrueckt ist — im Baumodus mit Bodenwerkzeug malt paintFloorAt sogar durchgehend Boden und bucht Geld ab. Der Zustand loest sich erst mit dem naechsten Klick.

- Fix: Zusaetzlich auf pointercancel/blur/mouseleave des Fensters zuruecksetzen (addEventListener("blur",function(){dragging=false;});) oder in mousemove pruefen: if(dragging&&e.buttons===0)dragging=false;


**Markthallen-Verkauf setzt stats.ernten zurueck und zerstoert damit Erfolg + Team-Aufgabe**  
`traumhaus.html` Zeile 4946

- Ablauf: stats.ernten dient gleichzeitig als verbrauchbarer Lagerbestand (Verkaufsmenge, Sichtbarkeit des Buttons, Z. 3945) und als Lebenszeit-Zaehler: Erfolg 'gaertner — 5 Ernten eingefahren' prueft stats.ernten>=5 (Z. 3100), die Koop-Aufgabe 'Fahrt zusammen 6 Ernten ein' liest stats.ernten (Z. 4365) gegen eine einmalig eingemessene Basislinie (teamBase, Z. 4370). Ablauf: Der Spieler baut ein Beet, wartet ~36 s bis wachs>=1, ein Sim erntet (+35 $, stats.ernten=1, Z. 3982), er folgt dem eingebauten Tipp 'Erst im Garten ernten — dann kauft die Markthalle dir die Ware ab' (Z. 3952) und verkauft → stats.e

- Fix: Bestand und Lebenszeit-Zaehler trennen: stats.ernten als reinen kumulativen Zaehler stehen lassen und einen separaten stats.ernteLager fuer Ernten/Verkauf einfuehren (updBeete erhoeht beide, der Markthallen-Handler leert nur das Lager).


**Feuerwache und Schule: Türöffnung im Kollider liegt auf der Rückseite, die sichtbaren Tore/Eingänge sind zugemauert**  
`traumhaus.html` Zeile 2660

- Ablauf: Feuerwache: Gruppe bei g.position.set(56,0,100) ohne Rotation; die beiden Tore stehen bei lokal z=+5.32 (Zeile 1909), also Welt z≈105.3, der Vorplatz bei Welt z≈110.5 (Zeile 1916) – Eingangsseite ist +z. Der Kollider addSolid(56,100,18,12,{a:"z",at:94,…}) legt die Öffnung aber auf at=94, also die -z-Seite (Rückseite zur Wiese). Identisch bei der Schule (Zeile 2659): g.position.set(-56,0,100) ohne Rotation, Eingangstür bei lokal z=+5.32 → Welt 105.32, Kollideröffnung aber bei at=93. Zum Vergleich ist es beim Rathaus (Zeile 1754) richtig gemacht (Portikus lokal +z, aber rotation.y=PI → Öffnung b

- Fix: Türachse auf die Eingangsseite drehen: Feuerwache {a:"z",at:106,c:56,w:8.0} (beide Tore), Schule {a:"z",at:106,c:-56,w:3.0}; Schulen-Kollider zudem auf 22x12 korrigieren, damit at genau auf der Sockelkante liegt.


**Wand-Kollision ist nur eine 0,55 m dünne Schale – Autos tunneln bei niedriger Bildrate in Gebäude hinein**  
`traumhaus.html` Zeile 4083

- Ablauf: inSolid behandelt nur den Randstreifen inner=0.55 als fest und lässt das Innere frei (Zeilen 396-397). autoFahr bewegt das Auto pro Frame um sp*dt mit sp=13 bzw. 25 mit Nitro (Zeile 4076); dt ist in der Hauptschleife auf 0.05 gedeckelt (Zeile 5415). Bei 20 fps sind das 0,65 m ohne bzw. 1,25 m mit Nitro pro Schritt – mehr als die Schalendicke. Ablauf: Spieler drückt auf dem Handy (oder bei einem Frame-Hänger) den Nitro-Button und fährt frontal gegen ein Haus, z. B. den Bahnhof (0,102) oder die Lagerhalle (97,-84). Der Kandidatenpunkt überspringt den 0,55-m-Ring und landet im freien Innenbereich

- Fix: Vor der Kollisionsprüfung in Teilschritte zerlegen, solange sp*dt > 0.4 (z. B. Schleife mit maximal 0.3 m pro Sub-Schritt), oder inSolid einen zweiten Test auf dem Segmentmittelpunkt machen lassen. Alternativ die Schale mit der maximalen Schrittweite skalieren statt fest 0.55.


## Lobby mit Namensanzeige — Entwurf


Alle drei Entwuerfe kommen unabhaengig zum selben Schluss:

**Ein echter Server-Browser ist mit PeerJS nicht moeglich** — es gibt keine Liste laufender Raeume.


Was geht: ein **fester Pool oeffentlicher Raum-Codes** (8-12 pro Spiel), die beim Oeffnen
der Lobby **angeklopft** werden. Belegte Slots antworten mit Spielernamen, freie nicht.
Ergibt eine echte Raumliste mit Namen, ohne erfundene API.


**Grenze:** private Raeume mit Zufallscode tauchen darin nie auf — die bleiben Code-Weitergabe.

**Aufwand:** ~320-400 Zeilen ueber `js/mp.js`, `traumhaus.html`, `lebenspfad.html`.


### Entwurf 1 — Machbarkeit: gut

GRUNDIDEE: "Raumliste" = fester Slot-Pool + aktives Anklopfen (Probe). Kein Server, keine erfundene API.

PeerJS kann nur eines: "verbinde mich mit Peer-ID X". Also machen wir die Raum-IDs VORHERSAGBAR und fragen sie einzeln ab.

1) SLOT-POOL (statt Server-Browser)
   Neben den privaten Zufalls-Codes (MP.makeCode, 4 Buchstaben) gibt es einen festen, im Code hinterlegten Pool oeffentlicher Codes, z.B. MP_SLOTS=["PUBA","PUBB","PUBC","PUBD","PUBE","PUBF","PUBG","PUBH"]. Raum-ID bleibt wie bisher pid(gameId,code) = "aban-traumhaus-PUBA" bzw. netRoomId() = "aban-lp-puba". Nur diese 8 Slots sind ueberhaupt auflistbar — das ist die Kernbeschraenkung des ganzen Entwurfs.

2) PROBE-PROTOKOLL (liefert Belegung + Namen)
   Der Lobby-Bildschirm erzeugt EINEN Wegwerf-Peer (anonyme ID) und oeffnet zu allen 8 Slot-IDs parallel je eine DataConnection mit label:"probe". Der Host antwortet auf dem Probe-Kanal genau eine Nachricht
     {t:"info", code, host:"<Hostname>", players:["Mia","Tom"], max:2, started:false, ver:1}
   und schliesst den Kanal sofort. Slot antwortet nicht innerhalb ~1800 ms (bzw. PeerJS-Fehler "peer-unavailable") = frei. Ergebnis = die Raumliste MIT Spielernamen, noch bevor man beitritt.

3) KRITISCH: Probe darf den Raum nicht belegen
   In js/mp.js:174-183 nimmt peer.on("connection") die erste Verbindung als `main` und weist danach ALLES ab ("Raum voll"). Eine Probe wuerde also den einzigen Gast-Slot fressen und den Raum dauerhaft blockieren. Deshalb MUSS vor der `if (mai


**Schritte:**

- 1. js/mp.js — Slot-Pool + Broker-Pin: Konstante MP_SLOTS (8 Codes aus ALPHA, mp.js:45) ergaenzen; mpPeerCfg(mp.js:36) um optionalen Parameter brokerIdx erweitern (Signatur mpPeerCfg(idx), Default = bisheriges localStorage-Verhalten), damit Probe/Slot-Hosting fest auf Broker 0 laufen koennen.
- 2. js/mp.js — Probe-Antwort im Host: in peerEngine.boot(), peer.on("connection") (mp.js:174-183) VOR der Zeile `if (main) { conn.close(); return; }` einen Zweig `if (conn.label === "probe")` einbauen: conn.on("open") -> conn.send(S._info ? S._info() : {t:"info"}) -> setTimeout(conn.close, 300); Verb
- 3. js/mp.js — neue API MP.probe(gameId, codes, cb, opts): erzeugt EINEN anonymen Peer (mpPeerCfg(0)), oeffnet je Code peer.connect(pid(gameId,code),{label:"probe",reliable:true}), sammelt die erste eingehende Nachricht je Verbindung, Timeout 1800 ms, ruft cb([{code, frei:true|false, info}]) und zers
- 4. js/mp.js — Engine B (?mp=local) nachziehen (nur fuer den Test-Modus): in localEngine (mp.js:215) auf der Host-Seite auf ein BroadcastChannel-Kommando {t:"who"} mit {t:"info",...} antworten und in MP.probe bei FORCE_LOCAL statt PeerJS diese BroadcastChannel-Variante nutzen — sonst ist die Raumlist
- 5. traumhaus.html — Lobby-Bildschirm bauen: neues Vollbild-Overlay #lobbyScreen (Markup neben #start, ca. traumhaus.html:247-271) mit Raumliste (#lobbyRooms), Spielerliste (#lobbyPlayers), #lobbyStart (nur Host), #lobbyReady/#lobbyLeave, Code-Feld + Link-Teilen als Fallback. Der bisherige Inline-Blo
- 6. traumhaus.html — Raumliste fuellen: Funktion lobbyScan() ruft MP.probe("traumhaus", MP_SLOTS, render) beim Oeffnen der Lobby und danach per setInterval alle 5000 ms; Interval beim Verlassen/Spielstart clearen. Zeilen-Klick: belegter Slot -> MP.join("traumhaus",code); freier Slot -> MP.hostSlot("t
- 7. traumhaus.html — Lobby-Protokoll einziehen (Kernaenderung): in onNetMsg (traumhaus.html:3600) den Zweig `m.t==="hallo"` (Zeile 3619) umbauen — NICHT mehr sofort {t:"state",sn:snapshot()} senden, sondern Namen in eine neue Liste mpRoster pushen und {t:"lobby",p:mpRoster} an alle senden; neue Zweig
- 8. traumhaus.html — Auto-Start entfernen: in hostBtn.onclick (traumhaus.html:5526-5541) das `if(st==="connected"&&!running)startGame();` (Zeile 5538) ersetzen durch 'Roster anzeigen + Start-Knopf freischalten'; MPs.setInfo(function(){return {code:MPs.code,host:myName,players:mpRoster.map(...),max:2,
- 9. lebenspfad.html — Probe-Antwort im Host: in NET.peer.on("connection") (lebenspfad.html:3569) das sofortige NET.conns.push(c) (Zeile 3570) entfernen und erst in den Zweigen m.t==="hallo"/"rejoin" pushen; neuen ersten Zweig `if(m.t==="probe"){ c.send(JSON.stringify({t:"roomInfo",code:NET.code,host:
- 10. lebenspfad.html — eigene Probe-Funktion lpProbe(codes,cb): analog zu MP.probe, aber mit peerCfg()/netRoomId() der Datei (lebenspfad.html:370 und 3386), fester Broker-Index 0, Wegwerf-Peer, 1800 ms Timeout, Peer am Ende destroy(). Slot-Pool-Konstante LP_SLOTS neben PEER_BROKERS anlegen; der beste
- 11. lebenspfad.html — Lobby zum eigenen Bildschirm machen: #netLobby (lebenspfad.html:294-303) aus dem #start-Overlay in ein eigenes Vollbild-Overlay #lobbyScreen verschieben; netLobbyShow() (3445) zeigt kuenftig dieses Overlay statt netSetup/netLobby umzuschalten, netHostReset() (3528) und joinRese
- 12. lebenspfad.html — Raumliste verdrahten: lobbyScan() ruft lpProbe(LP_SLOTS,...) beim Oeffnen des Startbildschirms und alle 5 s; belegter Slot mit started===false -> netCode.value=code + netJoinBtn.click() (nutzt die bestehende Retry-/Broker-Logik ab 3633); belegter Slot mit started===true -> ausg

**Grenzen:** 1. KEIN echter Server-Browser. Sichtbar sind nur die fest einprogrammierten Slot-Codes (8 pro Spiel). Private Raeume mit Zufallscode (MP.host/makeCode) tauchen NIE in der Liste auf — dafuer bleiben Code-Eingabe und Einladungslink (?raum=CODE / ?quick=1, lebenspfad.html:3743/3753) die einzigen Wege. Das ist bewusst so und muss im UI stehen ("Oeffentliche Raeume" vs. "Mit Code beitreten").

2. Durchprobieren aller Codes ist unmoeglich: 24^4 = 331'776 Kombinationen, jede Probe ist eine echte Signaling-+WebRTC-Verbindung (0,3-2 s, sinnvoll ~10 parallel). Ein Vollscan liegt bei Tagen bis Wochen und der Gratis-Broker (0.peerjs.com) wuerde vorher dichtmachen. Nicht bauen.

3. peer.listAllPeers() existiert zwar im vendorierten PeerJS (js/vendor/peerjs.min.js -> GET /{key}/peers), ist auf der PeerJS-Cloud aber deaktiviert und antwortet mit HTTP 401 (der Client wirft dann ServerError). Ob peerjs.9


### Entwurf 2 — Machbarkeit: gut

LOBBY ALS ERWEITERUNG DES BESTEHENDEN KOOP-OVERLAYS — "Slot-Scan" statt Server-Browser

IST-STAND (verifiziert):
• /home/user/aban-news-landing/js/mp.js — PeerJS, Peer-ID = pid(gameId,code) = "aban-<gameId>-<CODE>", 4 Buchstaben aus A–Z ohne I/O. API: MP.host / MP.join / MP._hostFixed(fester Code, noRegen) / MP.quick(room="PUBA"). Host nimmt GENAU EINE Nicht-"fast"-Verbindung an (peerEngine, peer.on("connection"): `if (main) { conn.close(); return; }`) → 1v1 hart.
• traumhaus.html — nutzt mp.js. Lobby-DOM existiert schon (#netSetup, #mpLobby, #mpCodeShow, #mpStatus, #mpBackBtn), zeigt aber KEINE Namen. Gast schickt beim Connect {t:"hallo",n:myName} (Zeile ~5554), Host antwortet SOFORT mit {t:"state",sn:snapshot()} (onNetMsg Zeile 3619) → Gast ruft in `m.t==="state"` direkt startGame(); Host startet in onStatus bei "connected". Es gibt also gar keine Lobby-Phase nach dem Verbinden.
• lebenspfad.html — EIGENER PeerJS-Stack (NET.*), NICHT mp.js. Peer-ID = netRoomId(code) = "aban-lp-<code kleingeschrieben>", bis 4 Spieler. Hat bereits eine echte Namens-Lobby VOR dem Start: hallo→welcome→lobby-Broadcast, netPlayersUpd() rendert Namens-Chips mit 👑/✅/⏳, Ready-Knopf, Host-Start-Knopf. Es fehlt dort NUR der Raum-Browser. Öffentlicher Raum = EIN fester Code "OFEN" (netHostBoot: `if(NET.pubWanted){NET.code="OFEN";}`).

KERNIDEE — 3 kleine Bausteine, keine neue Infrastruktur:

1) ÖFFENTLICHE SLOT-CODES statt eines einzigen Public-Raums.
   Heute existiert das Muster schon (PUBA in MP.qui


**Schritte:**

- SCHRITT 1 — js/mp.js: Probe-Protokoll (keine UI-Änderung, allein testbar). (a) Modul-Konstante MP_SLOTS = ["PUBA"…"PUBM"] (12, ohne I/O) neben MP_BROKERS anlegen und als MP.slots exportieren. (b) mkSession(): S._info = null und S.setInfo = function(o){S._info=o;} ergänzen, damit das Spiel dem Broker
- SCHRITT 2 — js/mp.js: mpPeerCfg(i) parametrisieren (Default = gespeicherter Index), damit ein Scan gezielt Broker 0 UND Broker 1 abfragen kann, OHNE den in localStorage gemerkten aban_broker zu verändern. mpNextBroker() bleibt unangetastet.
- SCHRITT 3 — js/mp.js: MP.hostPublic(gameId, opts) ergänzen. Läuft MP_SLOTS der Reihe nach durch, ruft je MP._hostFixed(gameId, slot) (noRegen=true → scheitert bei unavailable-id sauber mit "Public-Raum bereits belegt"), hängt sich an ready.catch/onStatus("closed") und probiert den nächsten Slot; erf
- SCHRITT 4 — js/mp.js: MP.list(gameId, cb, opts) ergänzen. `if (FORCE_LOCAL) { cb([]); return; }` (Engine B/BroadcastChannel kennt keine Labels — hier gibt es keine Liste). Sonst: EIN Probe-Peer new window.Peer(undefined, mpPeerCfg(idx)); für jeden Slot peer.connect(pid(gameId,slot), {label:"lobby", 
- SCHRITT 5 — traumhaus.html, HTML: In #netSetup (Zeilen ~258–263) zwei Elemente ergänzen: Button #mpPubBtn "🌍 Offenen Raum eröffnen" und Button #mpListBtn "🔎 Offene Räume" plus Container <div id="mpRooms"></div>. In #mpLobby (Zeilen 264–268) zusätzlich <div id="mpPlayers"></div> und den Host-Knopf <b
- SCHRITT 6 — traumhaus.html, JS ~5526–5558: hostBtn.onclick und joinBtn.onclick teilen sich fast identischen Code (onMessage/onStatus/ready.catch) → eine gemeinsame Funktion mpWire(sess, isHost) herausziehen, beide Handler darauf umstellen. Dabei window._roomCode IMMER aus sess.code setzen (Voice-Cha
- SCHRITT 7 — traumhaus.html: mpRefreshRooms() implementieren: MP.list("traumhaus", render) → #mpRooms zeigt je Zeile "🏠 <Name> · 1/2 · [Beitreten]" (Namen mit .slice(0,12).replace(/[<>&]/g,"") entschärfen, kein innerHTML mit Fremdtext), volle/laufende Räume ausgegraut. Klick auf Beitreten setzt #mpCo
- SCHRITT 8 — traumhaus.html: Lobby-Phase VOR dem Start (die einzige echte Verhaltensänderung). (a) onNetMsg Zeile 3619: `m.t==="hallo"` schickt NICHT mehr sofort {t:"state"}, sondern merkt sich m.n als partnerName, sendet {t:"lobby", h:myName, g:partnerName} und ruft renderMpLobby(). (b) Neuer Zweig 
- SCHRITT 9 — lebenspfad.html: Antwort auf die Probe. Im NET.peer.on("connection") Daten-Handler (~Zeile 3571) als ERSTEN Zweig, noch vor hallo/rejoin: `if(m.t==="info?"){ try{c.send(JSON.stringify({t:"info", n:NET.names[0]||"Raum", cnt:NET.names.length, max:4, run:!!(NET.started||running), code:NET.c
- SCHRITT 10 — lebenspfad.html: Mehrere öffentliche Räume. Slot-Liste neben PEER_BROKERS (~Zeile 360) definieren: LP_SLOTS=["OFEN","PUBA","PUBB","PUBC","PUBD","PUBE","PUBF","PUBG"] — "OFEN" MUSS drin bleiben, sonst brechen alte ?quick=1/?coop=1-Einladungslinks. In netHostBoot (Zeile 3534) `if(NET.pubW
- SCHRITT 11 — lebenspfad.html: netListRooms(cb) analog MP.list — eigener new Peer(undefined, peerCfg()), pro Slot connect(netRoomId(slot)) mit {t:"info?"}, 3,5-s-Timeouts, danach destroy. UI: nach #quickPlayBtn (Zeile ~281) Button "🔎 Offene Räume" + <div id="netRooms"></div>; Zeilen zeigen "<Hostname
- SCHRITT 12 — lebenspfad.html: quickPlayBtn.onclick (Zeile 3629) umbauen: erst netListRooms → gibt es einen nicht vollen, nicht laufenden Raum, dort beitreten (bisheriges Verhalten, nur zielgenauer); sonst netHostPubBtn-Pfad = eigenen Slot eröffnen. Der bestehende _pubFlip-Schutz gegen Host↔Join-Ping

**Grenzen:** GRENZEN — bewusst und benennbar, keine davon ist ein Show-Stopper:

1. KEIN echter Server-Browser. Sichtbar wird ausschliesslich, wer freiwillig einen der ~12 öffentlichen Slots belegt. Räume mit Zufalls-Code (MP.host / "Raum erstellen") bleiben unsichtbar — das ist Absicht (Freundes-Räume), muss dem User aber im Text stehen ("nur offene Räume").

2. Harte Obergrenze = Anzahl Slots. 12 Slots = maximal 12 gleichzeitig gelistete Räume; ist alles belegt, muss Hosten mit Code angeboten werden. Mehr Slots = längerer Scan (jeder Slot ist ein WebRTC-Connect). Über ~24 Slots wird die Liste träge; dann erst lohnt der Verzeichnis-Peer.

3. Vollständiges Durchprobieren ist unmöglich. 24^4 = 331'776 mögliche Codes; ein Scan pro ID → kein Brute-Force, nie.

4. BROKER-SPALTUNG ist die grösste reale Fehlerquelle. mp.js merkt den Broker-Index in localStorage aban_broker, lebenspfad in lp_broker — jeweil


### Entwurf 3 — Machbarkeit: gut

ENTWURF „Fester oeffentlicher Raum + Namensliste, ohne echte Raumsuche"

GRUNDIDEE: Statt eines Server-Browsers (den PeerJS nicht hat) gibt es pro Spiel eine HART KODIERTE Liste von 4–6 festen Raum-Codes (die „Slots"). Diese Liste IST die Serverliste. Ob ein Slot lebt und wer drinsitzt, wird per Probe-Verbindung erfragt — nicht per Verzeichnis.

BAUSTEIN 1 — Feste Slot-Codes (nur Buchstaben!): mp.js filtert in quick() `[^A-HJ-NP-Z]`, lebenspfad-Join filtert `[^A-Z]` → Ziffern fallen raus. Also z. B. OFEN, OFNB, OFNC, OFND, OFNE, OFNF. Lebenspfad nutzt OFEN bereits (lebenspfad.html:3535) → bleibt Slot 1, damit alte ?quick=1-Links weiter funktionieren.

BAUSTEIN 2 — Probe-Handshake (das Herzstueck): PeerJS erlaubt beim Verbinden ein frei waehlbares Label: `peer.connect(id, {label:"probe", reliable:true})`. Das ist echte, vorhandene API — mp.js nutzt dasselbe Muster schon fuer den unreliable-Kanal `label:"fast"` (js/mp.js:118 und die Auswertung in peer.on("connection") bei js/mp.js:176). Der Host beantwortet eine Verbindung mit Label "probe" mit `{t:"__room", names:[...], full:…, running:…}` und schliesst sie nach ~400 ms wieder. Entscheidend: Der Probe-Kanal darf NIE den Spieler-Slot belegen — in mp.js wuerde ihn sonst Zeile 181 (`if (main) {conn.close()} … main = conn`) als Gast annehmen, in lebenspfad Zeile 3570 (`NET.conns.push(c)`) als Geist-Gast. Deshalb wird die Label-Pruefung als ERSTE Zeile im connection-Handler eingezogen, vor jeder Slot-Logik.

BAUSTEIN 3 — Scanner st


**Schritte:**

- 1. js/mp.js — Probe-Serverseite (MUSS ZUERST LIVE SEIN). In peerEngine(), im Handler `peer.on("connection", function(conn){…})` (js/mp.js:174) als allererste Zeile vor dem fast-Zweig und vor `if (main)`: `if (conn.label === "probe") { conn.on("open", function(){ try{ conn.send({t:"__room", info: (S.
- 2. js/mp.js — Lobby-Info-Hook. In mkSession() (js/mp.js:55) ergaenzen: `S._lobby = null; S.setLobby = function(fn){ S._lobby = fn; };`. Das Spiel liefert damit {names:[…], full:…, running:…}. In quick() zusaetzlich durchreichen (die outer-Session muss setLobby an die jeweils aktive inner-Session wei
- 3. js/mp.js — MP.probe + MP.scan + MP.PUBLIC_ROOMS. Neu im window.MP-Objekt (js/mp.js:281): `PUBLIC_ROOMS: ["OFEN","OFNB","OFNC","OFND"]`; `probe(gameId, code, ms)` → Promise<{code, alive, info}>; `scan(gameId, codes, ms)` → EIN `new Peer(undefined, mpPeerCfg())`, pro Code ein `peer.connect(pid(game
- 4. traumhaus.html — Lobby + Namensliste (unabhaengig vom Scanner schon ein Gewinn). (a) HTML in #mpLobby (traumhaus.html:262–266) um `<div id="mpPlayers"></div>` und `<button id="mpStartBtn">▶ Los geht's</button>` erweitern. (b) In onNetMsg (traumhaus.html:3600): Zweig `m.t==="hallo"` (Zeile 3619) N
- 5. traumhaus.html — setLobby anmelden. Direkt nach `MPs=MP.host(...)` (traumhaus.html:5530), nach `MPs=MP.join(...)` (5547) und im neuen Public-Host-Pfad: `MPs.setLobby(function(){ return {names:[myName].concat(gastNamen), full: !!gastVerbunden, running: running}; });`
- 6. traumhaus.html — Raumliste-UI. Im #start-Overlay unter dem Koop-Kasten (traumhaus.html:257) einen Block `<div id="mpRooms"></div><button id="mpRefresh">🔄 Raeume aktualisieren</button>` einfuegen. Neue Funktionen im Netz-Block: `thScanRooms()` ruft `MP.scan("traumhaus", MP.PUBLIC_ROOMS)` und rende
- 7. lebenspfad.html — Probe-Serverseite. In netHostBoot(), im Handler `NET.peer.on("connection", function(c){…})` (lebenspfad.html:3567) VOR `NET.conns.push(c)`: `if (c.label === "probe") { c.on("open", function(){ try{ c.send(JSON.stringify({t:"__room", names: NET.names.slice(0,4), full: NET.names.l
- 8. lebenspfad.html — Scanner + Raumliste. Neue Funktion `netScanRooms()` neben netRoomId() (lebenspfad.html:3386): eigener `new Peer(undefined, peerCfg())`, pro Slot-Code `connect(netRoomId(code), {label:"probe"})`, 2,5 s Einzel-Timeout, dann destroy. Rendern in einen neuen Block `#netRooms` im #net
- 9. lebenspfad.html — Slot-Codes statt nur OFEN. In netHostBoot() Zeile 3535 `if(NET.pubWanted){NET.code="OFEN";}` ersetzen durch `NET.code = NET.pubCode || "OFEN";`, und im unavailable-id-Zweig (lebenspfad.html:3552) statt sofort auf Beitreten zu wechseln erst den naechsten freien Slot-Code probiere
- 10. Rollout-Reihenfolge beachten: Schritte 1+7 (Host-Seite antwortet auf Proben) muessen VOR den Scanner-UIs (6+8) live sein. Ein Host mit alter Version nimmt die Probe als echten Gast an — bei Traumhaus blockiert das den einzigen Slot, bei Lebenspfad erzeugt es einen Geisterspieler. Da beide Seiten
- 11. Test: zwei Browserprofile / zwei Geraete. (a) Gast oeffnet Slot 1, zweites Geraet sieht ihn in der Liste MIT Name, bevor irgendwer startet. (b) Beitreten → Name erscheint bei beiden. (c) Dritter Client probt denselben Raum → Traumhaus meldet „voll", Slot bleibt intakt und das laufende Spiel merk

**Grenzen:** EHRLICHE GRENZEN (bewusst so, kein Bug):

1. NUR die festen Slots sind sichtbar. Private Raeume mit gewuerfeltem 4-Buchstaben-Code (MP.host, traumhaus.html:5530 / netHostBoot ohne pubWanted) tauchen NIE in der Liste auf. Das ist kein Serverbrowser, sondern eine Anwesenheitsliste ueber bekannte Adressen.

2. Codes durchprobieren skaliert nicht. 24^4 = 331.776 moegliche Codes — durchsuchen unmoeglich. Jeder Probe-Versuch kostet 1–3 s und eine Broker-Verbindung; realistisch sind 4–6 Slots. Mehr Slots = laengerer Scan + Rate-Limit-Risiko beim Gratis-Broker.

3. PeerJS hat zwar `peer.listAllPeers()` in der API, aber die oeffentliche Cloud (0.peerjs.com) hat Discovery deaktiviert — der Aufruf liefert dort keine brauchbare Liste. Beim Ersatz-Broker peerjs.92k.de ist es nicht garantiert und kann jederzeit abgeschaltet werden. Deshalb wird bewusst NICHT darauf gebaut. Wer es trotzdem testen will:
