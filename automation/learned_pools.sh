#!/usr/bin/env bash
# AUTO-GENERIERT von automation/brain/brain.mjs v2 — NICHT manuell editieren (Aenderungen in knowledge.json).
# Gehirn-Stand: 3 Report(s) gelernt · Bayes-Shrinkage · Verlierer geblockt (#luxestyle #luxestylech #deutschland #germany #deutschershop #berlin #munchen #hamburg).
# CAPS sind nach gelerntem Hook-Typ sortiert (bester Typ zuerst: mundart > preis_vergleich > generisch).
TAGSETS=(
  "#fyp #tiktokmademebuyit #produkttipp #bohostyle #swisspremium"
  "#foryou #musthave #gefundenauftiktok #premiumlifestyle #wellness"
  "#fyp #lifehack #tiktokmademebuyit #sommerkleid #cardigan"
  "#foryou #produkttipp #musthave #schweiz #sommerschuhe"
)
CAPS=(
  "Mach dis eigete Teil 🐻🇨🇭 %s – dis Design, dini Sprüch. 💾 Speicher der das · 👇 Was chiem uf DIS Teil? −10%% WELCOME10 → luxestyle.ch"
  "Hoi zäme 🇨🇭 %s zum fäine Priis – wettsch das? 👇 Schrib's i d Kommentär · 📌 Speicher der's · −10%% WELCOME10 → luxestyle.ch"
  "CHF 34.90 statt Designer-Preis 👀 %s — welche Farbe wäre deins? Kommentier 👇 📌 Speichern für später · folge für die Sommer-Drops · −10%% WELCOME10 → luxestyle.ch"
  "Das löst ein echtes Sommer-Problem 🌞 %s — genialer Preis. Speicher's dir 📌 Frage 👇 −10%% WELCOME10 → luxestyle.ch"
  "Gliche Person, ganz anders Gfüehl ✨ %s — vorhär/nachhär. ↗️ Teile mit öpperem wo es Upgrade bruucht · −10%% WELCOME10 → luxestyle.ch"
  "Viu Style für wenig Gäud 🤍 %s — schnäu si, isch fasch weg! 📌 Spicher der's · –10%% WELCOME10 → luxestyle.ch"
  "Du gsesch eifach mega us drmit ✨ %s — hol dr's, solang's no git 🛍️ 💾 spicher's · –10%% WELCOME10 → luxestyle.ch"
  "Das git's so chuum i de Schwiz 👀 %s — lueg dir das a! 💾 Speichere · 👇 1, 2 oder 3? −10%% WELCOME10 → luxestyle.ch"
  "%s unter CHF 40 ☀️ 1, 2 oder 3 — welches nimmst du? 👇 Folge für mehr Looks 🤍 −10%% WELCOME10 → luxestyle.ch"
  "Dein nächster Lieblings-Look? %s 🤍 Frage in die Kommentare 👇 📌 Speicher's dir · −10%% WELCOME10 → luxestyle.ch"
  "%s zum fairen Preis 🇨🇭 Kommentier 1/2/3 👇 folge @luxestyle.ch für mehr · −10%% WELCOME10 → luxestyle.ch"
  "POV: Du hesch ändlich es Teil gfunde, wo niemmer hett 👀 %s — 📌 speicher der's · welä Look? 👇 −10%% WELCOME10 → luxestyle.ch"
  "Gold oder Silber: was passt zu dir? 👇 %s — schrib's i d Kommentär · 📌 speicher's · −10%% WELCOME10 → luxestyle.ch"
  "Schick das dere Fründin, wo immer fragt «woher hesch das?» 👀 %s · ↗️ teile · 🛒 Bio-Link · −10%% WELCOME10 → luxestyle.ch"
  "Drü Looks mit eim Teil — speicher der das 💾 %s · welä zersch? 👇 −10%% WELCOME10 → luxestyle.ch"
  "Lueg mau das aa 😍 %s — äuä ds beschte Teil vom Summer, gäu? 💾 Spicher dr's 👇 –10%% WELCOME10 → luxestyle.ch"
  "Das mues i ha 👀 %s — wele nimmsch? Schrib's i d Kommentär 👇 –10%% WELCOME10 → luxestyle.ch"
  "Es perfekts Gschänk, gäu? 🎁 %s — teil das mit dyre beschte Fründin 💛 –10%% WELCOME10 → luxestyle.ch"
  "Wusste nicht, dass ich das brauche 👀 %s — und der Preis? Schau selbst 👇 📌 Speicher's dir · −10%% WELCOME10 → luxestyle.ch"
  "Stopp — das musst du sehen ✋ %s. Welche Variante nimmst du? 1, 2 oder 3? 👇 📌 Speichern · −10%% WELCOME10 → luxestyle.ch"
)
