#!/usr/bin/env bash
# AUTO-GENERIERT aus tiktok_luxestyle.ch_2026-06-11.json (35 Videos, 10'766 Views) — NICHT manuell editieren.
# Datengetriebene Pools überschreiben die Defaults in auto_render.sh.
#
# LEHREN 2026-06-11:
#  · Reichweite ziehen: #schweiz Ø572 · #foryou Ø598 · #fyp Ø458 · #luxestyle Ø432 · #sommerkleid Ø400
#  · Nischen-Ästhetik-Tags (englisch, kategoriespezifisch) trugen das Top-Video (Diffuser 1'107).
#  · PREIS in der Caption = Top-Tier (Boho-Midi 796/774, Cardigan 778, Blazer 749, Preis-Anker 793).
#  · Schwäche: Engagement <1% auf Top-Videos → JEDE Caption braucht Frage-CTA („Welche Farbe? 👇").
# LEHRE 2026-06-13 (von Top-Dropship-/Influencer-Accounts gelernt — Playbook + eigene Daten):
#  · #luxestyle (Marken-Tag, Ø432) ist eine SACKGASSE — niemand sucht ihn → durch DISCOVERY-Tags ersetzen.
#  · Bewährte Discovery-/Kauf-Tags: #tiktokmademebuyit #produkttipp #musthave #gefundenauftiktok #lifehack.
#  · Mix-Regel: 1 breit (#fyp/#foryou) + 1–2 Discovery + 1–2 Nische/lokal (#schweiz/#bern). Kein reiner Marken-Spam.
TAGSETS=(
  "#tiktokmademebuyit #produkttipp #schweiz #fyp #musthave"
  "#gefundenauftiktok #schweizmode #ootdschweiz #foryou #lifehack"
  "#tiktokmademebuyit #aestheticroom #swisspremium #schweiz #musthave"
  "#schweiz #foryou #sommerkleid #produkttipp #fyp"
)
# Caption-Formel (Update 11.06., IG-Reel-Diagnose): Views kommen (100–174/Reel), aber 0 Engagement →
# Algo stoppt Verteilung. Darum JEDE Caption jetzt mit: Frage-CTA (Kommentar) + Save-CTA (📌) +
# Follow-CTA (Reichweite→Follower). Hook → Produkt+PREIS → Frage → Speichern/Folgen → WELCOME10 → Link.
# LEHRE 2026-06-13 (Playbook erfolgreicher Organik-Dropshipper): die ersten 1–2 Sek entscheiden.
#  PROBLEM-/NEUGIER-Hooks schlagen Katalog-Benennung. Eigener Beleg: „CHF X statt Y" / „80%% günstiger als
#  <Marke>" waren Top-Views. Format: Hook(Problem/Kontrast) → Produkt+PREIS → Frage → Speichern/Folgen → CTA.
CAPS=(
  "Wusste nicht, dass ich das brauche 👀 %s — und der Preis? Schau selbst 👇 📌 Speicher's dir · −10%% WELCOME10 → luxestyle.ch"
  "CHF 34.90 statt Designer-Preis 👀 %s — welche Farbe wäre deins? Kommentier 👇 📌 Speichern für später · folge für die Sommer-Drops · −10%% WELCOME10 → luxestyle.ch"
  "Stopp — das musst du sehen ✋ %s. Welche Variante nimmst du? 1, 2 oder 3? 👇 📌 Speichern · −10%% WELCOME10 → luxestyle.ch"
  "%s unter CHF 40 ☀️ 1, 2 oder 3 — welches nimmst du? 👇 Folge für mehr Looks 🤍 −10%% WELCOME10 → luxestyle.ch"
  "Das löst ein echtes Sommer-Problem 🌞 %s — genialer Preis. Speicher's dir 📌 Frage 👇 −10%% WELCOME10 → luxestyle.ch"
  "Dein nächster Lieblings-Look? %s 🤍 Frage in die Kommentare 👇 📌 Speicher's dir · −10%% WELCOME10 → luxestyle.ch"
  "%s zum fairen Preis 🇨🇭 Kommentier 1/2/3 👇 folge @luxestyle.ch für mehr · −10%% WELCOME10 → luxestyle.ch"
)
