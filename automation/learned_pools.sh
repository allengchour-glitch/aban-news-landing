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
  "#schweiz #foryou #luxestyle #fashionschweiz #fyp"
  "#ootdschweiz #schweizmode #herrenmode #damenmode #luxestyle"
  "#aestheticroom #premiumlifestyle #swisspremium #schweiz #fyp"
)
# Caption-Formel (Update 11.06., IG-Reel-Diagnose): Views kommen (100–174/Reel), aber 0 Engagement →
# Algo stoppt Verteilung. Darum JEDE Caption jetzt mit: Frage-CTA (Kommentar) + Save-CTA (📌) +
# Follow-CTA (Reichweite→Follower). Hook → Produkt+PREIS → Frage → Speichern/Folgen → WELCOME10 → Link.
CAPS=(
  "CHF 34.90 statt Designer-Preis 👀 %s — welche Farbe wäre deins? Kommentier 👇 📌 Speichern für später · folge für die Sommer-Drops · −10%% WELCOME10 🔗 Link in Bio"
  "%s unter CHF 40 ☀️ 1, 2 oder 3 — welches nimmst du? 👇 Folge für mehr Looks 🤍 −10%% WELCOME10 🔗 Link in Bio"
  "%s 🤍 Den Link willst du? Schreib LINK 👇 — kommt direkt · 📌 speicher's dir · −10%% WELCOME10 🔗 Link in Bio"
  "Speicher dir das 📌 %s ✨ Welche Variante? 👇 Folge für täglich neue Looks von deinem Schweizer Shop · −10%% WELCOME10 🔗 Link in Bio"
  "%s zum fairen Preis 🇨🇭 Schreib LINK 👇 für den Direkt-Link · folge @luxestyle.ch für mehr · −10%% WELCOME10 🔗 Link in Bio"
)
