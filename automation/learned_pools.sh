#!/usr/bin/env bash
# AUTO-GENERIERT aus tiktok_luxestyle.ch_2026-06-11.json (35 Videos, 10'766 Views) — NICHT manuell editieren.
# Datengetriebene Pools überschreiben die Defaults in auto_render.sh.
#
# LEHREN 2026-06-11:
#  · Reichweite ziehen: #schweiz Ø572 · #foryou Ø598 · #fyp Ø458 · #luxestyle Ø432 · #sommerkleid Ø400
#  · Nischen-Ästhetik-Tags (englisch, kategoriespezifisch) trugen das Top-Video (Diffuser 1'107).
#  · PREIS in der Caption = Top-Tier (Boho-Midi 796/774, Cardigan 778, Blazer 749, Preis-Anker 793).
#  · Schwäche: Engagement <1% auf Top-Videos → JEDE Caption braucht Frage-CTA („Welche Farbe? 👇").
TAGSETS=(
  "#schweiz #foryou #luxestyle #sommerkleid #fyp"
  "#ootdschweiz #schweizmode #fashionschweiz #sommerkleid #luxestyle"
  "#aestheticroom #premiumlifestyle #swisspremium #schweiz #fyp"
)
# Caption-Formel: Nutzen-Hook → Produkt+PREIS → Frage-CTA (Kommentare!) → WELCOME10 → Link.
CAPS=(
  "CHF 34.90 statt Designer-Preis 👀 %s — welche Farbe wäre deins? Kommentier 👇 −10%% Code WELCOME10 → luxestyle.ch"
  "%s unter CHF 40 ☀️ 1, 2 oder 3 — welches nimmst du? 👇 WELCOME10 = −10%% → luxestyle.ch"
  "Dein nächster Lieblings-Look? %s 🤍 Sag uns deine Grösse-Frage in den Kommentaren 👇 −10%% WELCOME10 → luxestyle.ch"
  "Spa-Feeling für zuhause ✨ %s — würdest du’s testen? 👇 Schweizer Shop · −10%% WELCOME10 → luxestyle.ch"
  "%s zum fairen Preis 🇨🇭 Welche Variante gefällt dir? Kommentier 1/2/3 👇 −10%% WELCOME10 → luxestyle.ch"
)
