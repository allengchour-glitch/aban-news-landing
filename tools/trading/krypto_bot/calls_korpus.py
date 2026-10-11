"""40 realistische Telegram-Call-Nachrichten (Formate echter Signal-Gruppen) + was ein Mensch daraus lesen würde (Soll).
Von einem Prüfer-Agenten zusammengestellt (Code-Prüfung Teil 3); Grundlage für test_calls.py.
Sonderfälle: «ausbruch» = Einstieg erst nach Durchbruch (wird nicht kopiert); 11 = deutsches «1,250» ist mehrdeutig
(als 1250 gelesen) — die Kursprüfung lehnt den Call dann ab, statt falsch zu handeln."""
# Soll: (symbol, richtung, einstieg[lo,hi] oder [] für Markt, ziele, stop) oder None (kein Call)
N = []


def n(name, text, soll):
    N.append((name, text, soll))


# 1 Binance-Killers (Long, mit «Short Term:/Mid Term:»-Zielen)
n("01 Binance Killers Long", """📍SIGNAL ID: 0598📍
COIN: $SKL/USDT (3-5x)
Direction: LONG📈
➖➖➖➖➖➖➖
Starting to get some volume, looks ready.
ENTRY: 0.0399 - 0.0415
OTE: 0.04055

TARGETS
Short Term: 0.04200 - 0.04300 - 0.04450 - 0.04600
Mid Term: 0.05500 - 0.06000 - 0.07000

STOP LOSS: 0.03720
➖➖➖➖➖➖➖
This message cannot be forwarded or replicated
- Binance Killers®""", ("SKLUSDT", "LONG", [0.0399, 0.0415], [0.042, 0.043, 0.0445, 0.046, 0.055, 0.06, 0.07], 0.0372))

# 2 Binance Killers Short
n("02 Binance Killers Short", """📍SIGNAL ID: 0601📍
COIN: $INJ/USDT (3-5x)
Direction: SHORT📉
➖➖➖➖➖➖➖
ENTRY: 24.10 - 24.80
OTE: 24.45

TARGETS
Short Term: 23.60 - 23.10 - 22.50
Mid Term: 21.00 - 19.50

STOP LOSS: 25.70
➖➖➖➖➖➖➖
- Binance Killers®""", ("INJUSDT", "SHORT", [24.1, 24.8], [23.6, 23.1, 22.5, 21.0, 19.5], 25.7))

# 3 Cornix-Standard (Wolf / viele Gruppen)
n("03 Cornix Long", """⚡️⚡️ #DOGE/USDT ⚡️⚡️
Exchanges: Binance Futures
Signal Type: Regular (Long)
Leverage: Cross (20.0X)

Entry Targets:
1) 0.16500
2) 0.16200

Take-Profit Targets:
1) 0.16800
2) 0.17100
3) 0.17500

Stop Targets:
1) 0.15700""", ("DOGEUSDT", "LONG", [0.162, 0.165], [0.168, 0.171, 0.175], 0.157))

# 4 Cornix Short
n("04 Cornix Short", """⚡️⚡️ #AVAX/USDT ⚡️⚡️
Exchanges: Binance Futures
Signal Type: Regular (Short)
Leverage: Isolated (10.0X)

Entry Zone:
28.90 - 29.40

Take-Profit Targets:
1) 28.20
2) 27.60
3) 26.80

Stop Targets:
1) 30.30""", ("AVAXUSDT", "SHORT", [28.9, 29.4], [28.2, 27.6, 26.8], 30.3))

# 5 Wolf-of-Trading-Stil mit Emoji-Zahlen (Short)
n("05 Wolf Short Keycap", """🐺 #SOL/USDT
🔴 SHORT
Leverage: 10x
Entry: 151.50 - 153.00
Targets:
1️⃣ 148.00
2️⃣ 145.50
3️⃣ 142.00
Stop: 156.20""", ("SOLUSDT", "SHORT", [151.5, 153.0], [148.0, 145.5, 142.0], 156.2))

# 6 Wolf-Stil Long mit Emoji-Zahlen (billiger Coin)
n("06 Wolf Long Keycap", """🐺 #ADA/USDT
🟢 LONG
Leverage: 10x
Entry: 0.3520 - 0.3580
Targets:
1️⃣ 0.3650
2️⃣ 0.3720
3️⃣ 0.3850
Stop: 0.3420""", ("ADAUSDT", "LONG", [0.352, 0.358], [0.365, 0.372, 0.385], 0.342))

# 7 Fed Russian Insiders
n("07 Fed Russian Insiders", """🔥 #FLOKI/USDT (Long📈, x20) 🔥

Entry - 0.0001795
SL - 0.0001749

Take-Profit:
🥉 0.0001817 (40% of profit)
🥈 0.0001832 (60% of profit)
🥇 0.0001851 (80% of profit)
🚀 0.0001875 (100% of profit)""", ("FLOKIUSDT", "LONG", [0.0001795, 0.0001795], [0.0001817, 0.0001832, 0.0001851, 0.0001875], 0.0001749))

# 8 Fed Russian Insiders Short
n("08 Fed Russian Insiders Short", """🔥 #ARB/USDT (Short📉, x20) 🔥

Entry - 0.8120
SL - 0.8310

Take-Profit:
🥉 0.8040 (40% of profit)
🥈 0.7980 (60% of profit)
🥇 0.7890 (80% of profit)
🚀 0.7760 (100% of profit)""", ("ARBUSDT", "SHORT", [0.812, 0.812], [0.804, 0.798, 0.789, 0.776], 0.831))

# 9 Deutsche Gruppe Long
n("09 Deutsch Long", """🚀 Neues Signal: #LINK
Richtung: Long
Einstieg: 14,20 – 14,50
Ziele: 14,90 / 15,40 / 16,10
Stopp: 13,70
Hebel: 5x""", ("LINKUSDT", "LONG", [14.2, 14.5], [14.9, 15.4, 16.1], 13.7))

# 10 Deutsche Gruppe Short mit «Verkaufen»
n("10 Deutsch Short Verkaufen", """📉 SHORT #DOT
Verkaufen bei 7,85 – 7,95
Ziele: 7,60 / 7,40 / 7,10
Stopp: 8,15""", ("DOTUSDT", "SHORT", [7.85, 7.95], [7.6, 7.4, 7.1], 8.15))

# 11 Deutsch 3 Nachkommastellen mit Komma (Kurs ~1,25)
n("11 Deutsch Komma 3 Stellen", """Neuer Call 📣 #OP
Long
Einstieg: 1,250 – 1,280
Ziele: 1,320 / 1,360
Stopp: 1,190""", ("OPUSDT", "LONG", [1250.0, 1280.0], [1320.0, 1360.0], 1190.0, "mehrdeutig"))

# 12 Scalp Markt
n("12 Scalp Markt", "⚡ SCALP: #WIF LONG at market\nTP: 2.45 / 2.52\nSL: 2.31\nLev 25x", ("WIFUSDT", "LONG", [], [2.45, 2.52], 2.31))

# 13 Entry CMP
n("13 Entry CMP", "#NEAR/USDT SHORT\nEntry: CMP\nTP1: 5.10\nTP2: 4.95\nTP3: 4.70\nSL: 5.55\nLeverage: 10x", ("NEARUSDT", "SHORT", [], [5.1, 4.95, 4.7], 5.55))

# 14 Spot Buy/Sell
n("14 Spot Buy Sell", "#SPOT $FET\nBuy: 1.18 - 1.24\nSell: 1.35 - 1.48 - 1.65\nStop: 1.09", ("FETUSDT", "LONG", [1.18, 1.24], [1.35, 1.48, 1.65], 1.09))

# 15 Short mit «Sell» als Einstieg
n("15 Short Sell-Einstieg", "🔴 SHORT $DOGE\nSell between 0.1650 - 0.1680\nTargets: 0.1600 - 0.1550\nStop: 0.1720", ("DOGEUSDT", "SHORT", [0.165, 0.168], [0.16, 0.155], 0.172))

# 16 Spot Short «SELL» ohne Short-Wort, «Buy back»
n("16 Sell + Buy back", "#XRP/USDT SELL\nSell zone: 0.620 - 0.630\nBuy back: 0.600 / 0.580\nSL: 0.650", ("XRPUSDT", "SHORT", [0.62, 0.63], [0.6, 0.58], 0.65))

# 17 DCA-Einstiege
n("17 DCA", """#APT/USDT LONG
Entry 1: 8.40
Entry 2: 8.15 (DCA)
Entry 3: 7.90 (DCA)
TP: 8.80 / 9.20 / 9.80
SL: 7.55""", ("APTUSDT", "LONG", [7.9, 8.4], [8.8, 9.2, 9.8], 7.55))

# 18 Preise mit Leerzeichen als Tausender
n("18 Leerzeichen-Tausender", "#BNB SHORT\nEntry: 1 012 - 1 020\nTP: 995 / 980\nSL: 1 045", ("BNBUSDT", "SHORT", [1012.0, 1020.0], [995.0, 980.0], 1045.0))

# 19 $-Zeichen
n("19 Dollarzeichen", "$SUI LONG 🚀\nEntry: $3.42 - $3.50\nTP: $3.65, $3.80, $4.00\nSL: $3.28", ("SUIUSDT", "LONG", [3.42, 3.5], [3.65, 3.8, 4.0], 3.28))

# 20 Unicode-Fettschrift
n("20 Fettschrift", "🔥 𝐋𝐎𝐍𝐆 #𝐒𝐎𝐋\n𝐄𝐧𝐭𝐫𝐲: 145.2 - 147.8\n𝐓𝐏: 150 / 155\n𝐒𝐋: 140", ("SOLUSDT", "LONG", [145.2, 147.8], [150.0, 155.0], 140.0))

# 21 Emojis zwischen Zahlen
n("21 Emojis zwischen Zahlen", "#TIA LONG\nEntry: 5.20🔹5.35\nTP: 5.60🔸5.90🔸6.30\nSL: 4.95", ("TIAUSDT", "LONG", [5.2, 5.35], [5.6, 5.9, 6.3], 4.95))

# 22 Update TP hit (ohne SL)
n("22 Update TP hit", "#SOL/USDT Take-Profit target 1 ✅\nProfit: 45.4% 📈\nPeriod: 2 Hours 13 Minutes ⏰", None)

# 23 Update: Call mit Haken wiederholt (TP getroffen, SL steht drin)
n("23 Update Wiederholung mit SL", """✅✅ #AVAX/USDT LONG — ALL TARGETS HIT 🎯
Entry: 28.40 - 28.90
TP1 29.50 ✅ TP2 30.20 ✅ TP3 31.00 ✅
SL: 27.60
+68% with 20x 🔥""", None)

# 24 Werbung
n("24 Werbung", """💎 VIP-Gruppe — 92% Trefferquote!
Letzte Woche: #PEPE +340%, #WIF +210% 🚀
Jetzt beitreten: nur 99 USDT/Monat 👉 @vip_admin
Long & Short Signale täglich, Entry, TP und SL inklusive""", None)

# 25 Short mit «Sell» im Text (Short-Wort vorhanden)
n("25 Short mit Sell-Text", "#ETH/USDT SHORT\nSell the rally into resistance.\nEntry: 3450 - 3500\nTargets: 3400 - 3350 - 3300\nStop loss: 3560", ("ETHUSDT", "SHORT", [3450.0, 3500.0], [3400.0, 3350.0, 3300.0], 3560.0))

# 26 Ausbruch («Buy above»)
n("26 Breakout Long above", "#RNDR LONG on breakout\nBuy above 7.80 (4H close)\nTP: 8.30 / 8.90\nSL: 7.40", ("RNDRUSDT", "LONG", [7.8, 7.8], [8.3, 8.9], 7.4, "ausbruch"))

# 27 «Short below»
n("27 Breakdown Short below", "#LTC SHORT below 82.50 👇\nTargets: 80.00 / 77.50\nSL: 85.20", ("LTCUSDT", "SHORT", [82.5, 82.5], [80.0, 77.5], 85.2, "ausbruch"))

# 28 Stop in Prozent
n("28 Stop in Prozent", "#SEI/USDT LONG\nEntry: 0.4120 - 0.4200\nTP: 0.4400 / 0.4600\nSL: 5% below entry", ("SEIUSDT", "LONG", [0.412, 0.42], [0.44, 0.46], 0.3952))

# 29 Ziele mit «Target 1 →»
n("29 Target Pfeil", "#BCH/USDT SHORT\nEntry: 492 - 498\nTarget 1 → 485\nTarget 2 → 476\nTarget 3 → 465\nStop → 506", ("BCHUSDT", "SHORT", [492.0, 498.0], [485.0, 476.0, 465.0], 506.0))

# 30 Vorheriger Erfolg im neuen Call erwähnt (Paar zuerst)
n("30 Erfolg + neuer Call", """Last call #AVAX/USDT smashed all targets ✅ +85%
New signal 👇
#OP LONG
Entry: CMP
Targets: 1.60 - 1.70 - 1.85
SL: 1.45""", ("OPUSDT", "LONG", [], [1.6, 1.7, 1.85], 1.45))

# 31 Themen-Hashtag vor dem Coin
n("31 Hashtag vorn", """#MEME season is back 🔥
$PEPE LONG
Entry: CMP
Targets: 0.0000110 - 0.0000115 - 0.0000120
SL: 0.0000098""", ("PEPEUSDT", "LONG", [], [0.000011, 0.0000115, 0.000012], 0.0000098))

# 32 Risiko-Hinweis mit USDT
n("32 Risiko-Hinweis USDT", "#ATOM LONG\nEntry: 6.10 - 6.25\nTP: 6.50 / 6.80\nSL: 5.85\nRisk only 2% of your USDT balance", ("ATOMUSDT", "LONG", [6.1, 6.25], [6.5, 6.8], 5.85))

# 33 Haltedauer nach den Zielen (Short)
n("33 Haltedauer Short", "#AAVE/USDT SHORT\nEntry: 182 - 186\nTargets: 176 / 170 / 162\nHolding period: 2-3 days\nSL: 192", ("AAVEUSDT", "SHORT", [182.0, 186.0], [176.0, 170.0, 162.0], 192.0))

# 34 Bewertung «Risk 3/10» nach den Zielen (Long billiger Coin)
n("34 Risk-Skala Long", "#JASMY LONG\nEntry: 0.0182 - 0.0186\nTargets: 0.0195 / 0.0205\nRisk: 3/10\nSL: 0.0174", ("JASMYUSDT", "LONG", [0.0182, 0.0186], [0.0195, 0.0205], 0.0174))

# 35 Ziele in Prozent
n("35 Ziele in Prozent", "#ONDO LONG\nEntry: 1.05 - 1.08\nTP: 3% / 6% / 10%\nSL: 0.99", ("ONDOUSDT", "LONG", [1.05, 1.08], [1.09695, 1.1289, 1.1715], 0.99))

# 36 Deutsche Stop-Bewegung (Update mit Zahl)
n("36 Update SL nachziehen", "#LINK Long Update: TP1 erreicht ✅ — Stopp auf Einstieg 14,35 nachziehen", None)

# 37 Hebel mit Bindestrich
n("37 Hebel Bindestrich Short", "#ICP/USDT SHORT\nEntry: 9.80 - 9.95\nLeverage - 20\nTP: 9.50 / 9.20\nSL: 10.25", ("ICPUSDT", "SHORT", [9.8, 9.95], [9.5, 9.2], 10.25))

# 38 Stop ohne führende Null
n("38 Stop ohne Null", "#XLM LONG\nEntry 0.512 - 0.520\nTP 0.535 / 0.550\nSL .490", ("XLMUSDT", "LONG", [0.512, 0.52], [0.535, 0.55], 0.49))

# 39 Long-term Bemerkung in Short-Call
n("39 Short mit long-term", "#UNI SHORT 📉\nEntry: CMP\nTargets: 9.40 / 9.10\nLong-term still bullish, this is a quick scalp.", ("UNIUSDT", "SHORT", [], [9.4, 9.1], None))

# 40 Target #1
n("40 Target Raute", "#FIL/USDT SHORT\nEntry: 3.95 - 4.02\nTarget #1: 3.85\nTarget #2: 3.72\nTarget #3: 3.60\nStop: 4.15", ("FILUSDT", "SHORT", [3.95, 4.02], [3.85, 3.72, 3.6], 4.15))
