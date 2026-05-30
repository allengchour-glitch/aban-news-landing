#!/usr/bin/env python3
"""KI-Tools Radar — multilingual static site generator.

Reads the curated AI-tools database (data/tools.json) + per-language content
packs (lang/<code>.json) + a German pro/contra critique (content/critique.de.json),
and renders a multilingual, SEO-oriented static site:
  - one localized site per language (de at root, others under /<code>/)
  - homepage + one page per tool + one page per category, per language
  - hreflang alternate links + language switcher + sitemap + robots + JSON-LD

Fully automatable, pure stdlib, no external deps. DSGVO-safe (system fonts, no tracking).

Usage:
    python generate.py
    python generate.py --out dist
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

# --- Brand tokens (from Aban News css/styles.css :root) ------------------------
ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "KI-Tools Radar"
BASE_URL = "https://ki-tools-radar.de"   # set to real domain before launch

# Languages: 'de' is the base (root). Others are loaded from lang/<code>.json.
# Add a code here + drop a lang/<code>.json to publish another language.
LANGUAGES = ["de", "en", "fr", "es", "it", "pt", "nl", "pl", "tr", "ja", "zh"]
LANG_NAMES = {
    "de": "Deutsch", "en": "English", "fr": "Français", "es": "Español",
    "it": "Italiano", "pt": "Português", "nl": "Nederlands", "pl": "Polski",
    "tr": "Türkçe", "ja": "日本語", "zh": "中文",
}

# Curated profession "tool stacks" — data-driven (top tools across given categories).
# High-intent SEO ("which AI tools do I need as a <profession>").
STACKS = [
    {"slug": "entwickler", "emoji": "💻", "cats": ["Coding", "Vibecoding", "No-Code"],
     "title": {"de": "KI-Stack für Entwickler", "en": "AI stack for developers",
               "fr": "Stack IA pour développeurs", "es": "Stack de IA para desarrolladores",
               "it": "Stack IA per sviluppatori", "pt": "Stack de IA para programadores",
               "nl": "AI-stack voor ontwikkelaars", "pl": "Stack AI dla programistów",
               "tr": "Geliştiriciler için YZ paketi", "ja": "開発者向けAIスタック",
               "zh": "开发者 AI 工具组合"}},
    {"slug": "texter", "emoji": "✍️", "cats": ["Writing", "Translation"],
     "title": {"de": "KI-Stack für Texter", "en": "AI stack for writers",
               "fr": "Stack IA pour rédacteurs", "es": "Stack de IA para redactores",
               "it": "Stack IA per copywriter", "pt": "Stack de IA para redatores",
               "nl": "AI-stack voor tekstschrijvers", "pl": "Stack AI dla copywriterów",
               "tr": "Metin yazarları için YZ paketi", "ja": "ライター向けAIスタック",
               "zh": "文案写作 AI 工具组合"}},
    {"slug": "marketing", "emoji": "📣", "cats": ["Marketing", "SEO"],
     "title": {"de": "KI-Stack für Marketing", "en": "AI stack for marketing",
               "fr": "Stack IA pour le marketing", "es": "Stack de IA para marketing",
               "it": "Stack IA per il marketing", "pt": "Stack de IA para marketing",
               "nl": "AI-stack voor marketing", "pl": "Stack AI dla marketingu",
               "tr": "Pazarlama için YZ paketi", "ja": "マーケティング向けAIスタック",
               "zh": "营销 AI 工具组合"}},
    {"slug": "designer", "emoji": "🎨", "cats": ["Image", "Design"],
     "title": {"de": "KI-Stack für Designer", "en": "AI stack for designers",
               "fr": "Stack IA pour designers", "es": "Stack de IA para diseñadores",
               "it": "Stack IA per designer", "pt": "Stack de IA para designers",
               "nl": "AI-stack voor ontwerpers", "pl": "Stack AI dla projektantów",
               "tr": "Tasarımcılar için YZ paketi", "ja": "デザイナー向けAIスタック",
               "zh": "设计师 AI 工具组合"}},
    {"slug": "video", "emoji": "🎬", "cats": ["Video", "Video-Editing", "Avatar"],
     "title": {"de": "KI-Stack für Video-Creator", "en": "AI stack for video creators",
               "fr": "Stack IA pour créateurs vidéo", "es": "Stack de IA para creadores de vídeo",
               "it": "Stack IA per video creator", "pt": "Stack de IA para criadores de vídeo",
               "nl": "AI-stack voor videomakers", "pl": "Stack AI dla twórców wideo",
               "tr": "Video üreticileri için YZ paketi", "ja": "動画クリエイター向けAIスタック",
               "zh": "视频创作者 AI 工具组合"}},
    {"slug": "podcaster", "emoji": "🎙️", "cats": ["Audio", "Voice", "Music"],
     "title": {"de": "KI-Stack für Podcaster", "en": "AI stack for podcasters",
               "fr": "Stack IA pour podcasteurs", "es": "Stack de IA para podcasters",
               "it": "Stack IA per podcaster", "pt": "Stack de IA para podcasters",
               "nl": "AI-stack voor podcasters", "pl": "Stack AI dla podcasterów",
               "tr": "Podcast'çiler için YZ paketi", "ja": "ポッドキャスター向けAIスタック",
               "zh": "播客 AI 工具组合"}},
    {"slug": "forschung", "emoji": "🔬", "cats": ["Research", "Knowledge", "RAG", "Data"],
     "title": {"de": "KI-Stack für Forschung & Studium", "en": "AI stack for research & study",
               "fr": "Stack IA pour la recherche", "es": "Stack de IA para investigación",
               "it": "Stack IA per ricerca e studio", "pt": "Stack de IA para pesquisa",
               "nl": "AI-stack voor onderzoek", "pl": "Stack AI do badań i nauki",
               "tr": "Araştırma için YZ paketi", "ja": "研究・学習向けAIスタック",
               "zh": "研究学习 AI 工具组合"}},
    {"slug": "gruender", "emoji": "🚀", "cats": ["Automation", "Agents", "Productivity", "Meetings"],
     "title": {"de": "KI-Stack für Gründer", "en": "AI stack for founders",
               "fr": "Stack IA pour fondateurs", "es": "Stack de IA para fundadores",
               "it": "Stack IA per founder", "pt": "Stack de IA para fundadores",
               "nl": "AI-stack voor oprichters", "pl": "Stack AI dla założycieli",
               "tr": "Girişimciler için YZ paketi", "ja": "起業家向けAIスタック",
               "zh": "创业者 AI 工具组合"}},
]

# --- Base (German) UI strings. Other languages override via lang/<code>.json["ui"]
UI_DE = {
    "tagline": "Ehrlich bewertete KI-Tools für den deutschsprachigen Raum",
    "all_tools": "← Alle Tools",
    "categories": "Kategorien",
    "home_heading": "{n} KI-Tools, ehrlich bewertet",
    "use_cases": "Einsatzgebiete",
    "editor_note": "Redaktions-Notiz",
    "dsgvo": "DSGVO",
    "pro": "Pro",
    "contra": "Contra",
    "alternatives": "Alternativen",
    "cta": "Zu {name}",
    "best_in": "Beste {cat}-Tools",
    "dach": "DACH-Relevanz",
    "free": "kostenlos",
    "price_from": "ab",
    "language": "Sprache",
    "privacy": "Datenschutz",
    "imprint": "Impressum",
    "data_note": "Daten: kuratiert, KI-unterstützt recherchiert",
    "disclosure": ("Transparenz: Einige Links sind Affiliate-Links (mit * markiert). "
                   "Kaufst du darüber, erhalten wir eine Provision — für dich ohne "
                   "Mehrkosten. Die Bewertungen sind davon unabhängig."),
    "meta_home": ("{n} KI-Tools für den DACH-Raum: ehrliche Bewertungen, Pricing, "
                  "DSGVO-Hinweise, Pro/Contra und Alternativen."),
    "meta_tool": "{name} im Test: Bewertung, Pro & Contra, Pricing, DSGVO, Alternativen.",
    "meta_cat": "Die besten {cat}-KI-Tools, ehrlich bewertet und verglichen.",
}


# --- Extra UI strings for the new page types (curated translations, all langs) -
NEW_UI = {
    "verdict": {"de": "Fazit", "en": "Verdict", "fr": "Verdict", "es": "Veredicto",
                "it": "Verdetto", "pt": "Veredito", "nl": "Conclusie", "pl": "Werdykt",
                "tr": "Sonuç", "ja": "結論", "zh": "结论"},
    "winner": {"de": "Vorne: {name}", "en": "Ahead: {name}", "fr": "En tête : {name}",
               "es": "Por delante: {name}", "it": "In testa: {name}", "pt": "À frente: {name}",
               "nl": "Voorop: {name}", "pl": "Na czele: {name}", "tr": "Önde: {name}",
               "ja": "優勢: {name}", "zh": "领先：{name}"},
    "tie": {"de": "Kopf-an-Kopf", "en": "Neck and neck", "fr": "Au coude-à-coude",
            "es": "Muy igualado", "it": "Testa a testa", "pt": "Empate técnico",
            "nl": "Nek aan nek", "pl": "Łeb w łeb", "tr": "Başa baş", "ja": "互角", "zh": "势均力敌"},
    "comparisons": {"de": "Vergleiche", "en": "Comparisons", "fr": "Comparatifs",
                    "es": "Comparativas", "it": "Confronti", "pt": "Comparações",
                    "nl": "Vergelijkingen", "pl": "Porównania", "tr": "Karşılaştırmalar",
                    "ja": "比較", "zh": "对比"},
    "by_use_case": {"de": "Nach Einsatzzweck", "en": "By use case", "fr": "Par cas d'usage",
                    "es": "Por caso de uso", "it": "Per caso d'uso", "pt": "Por caso de uso",
                    "nl": "Per toepassing", "pl": "Według zastosowania",
                    "tr": "Kullanım alanına göre", "ja": "用途別", "zh": "按用途"},
    "dsgvo_nav": {"de": "Top für DACH", "en": "Top for DACH", "fr": "Top pour DACH",
                  "es": "Top para DACH", "it": "Top per DACH", "pt": "Top para DACH",
                  "nl": "Top voor DACH", "pl": "Top dla DACH", "tr": "DACH için en iyi",
                  "ja": "DACH向けトップ", "zh": "DACH 首选"},
    "dsgvo_title": {
        "de": "Beste KI-Tools für den DACH-Raum",
        "en": "Best AI tools for the DACH region",
        "fr": "Meilleurs outils IA pour la région DACH",
        "es": "Mejores herramientas de IA para la región DACH",
        "it": "Migliori strumenti IA per l'area DACH",
        "pt": "Melhores ferramentas de IA para a região DACH",
        "nl": "Beste AI-tools voor de DACH-regio",
        "pl": "Najlepsze narzędzia AI dla regionu DACH",
        "tr": "DACH bölgesi için en iyi yapay zekâ araçları",
        "ja": "DACH地域に最適なAIツール",
        "zh": "DACH 地区最佳AI工具"},
    "dsgvo_intro": {
        "de": "Top-Tools für den deutschsprachigen Markt, nach DACH-Relevanz — mit Datenschutz-Hinweis, wo vorhanden.",
        "en": "Top tools for the German-speaking market, by DACH relevance — with data-protection notes where available.",
        "fr": "Meilleurs outils pour le marché germanophone, par pertinence DACH — avec notes RGPD si disponibles.",
        "es": "Mejores herramientas para el mercado germanoparlante, por relevancia DACH — con notas de privacidad si las hay.",
        "it": "Migliori strumenti per il mercato di lingua tedesca, per rilevanza DACH — con note privacy se disponibili.",
        "pt": "Melhores ferramentas para o mercado de língua alemã, por relevância DACH — com notas de privacidade quando houver.",
        "nl": "Toptools voor de Duitstalige markt, op DACH-relevantie — met privacynotities indien beschikbaar.",
        "pl": "Najlepsze narzędzia dla rynku niemieckojęzycznego, wg trafności DACH — z notami o prywatności, gdy są.",
        "tr": "Almanca konuşulan pazar için en iyi araçlar, DACH önemine göre — varsa gizlilik notlarıyla.",
        "ja": "ドイツ語圏市場向けのトップツール（DACH関連度順）。データ保護メモがある場合は併記。",
        "zh": "面向德语市场的顶级工具（按DACH相关度排序），如有数据保护说明则一并列出。"},
    "nl_title": {"de": "Täglich KI auf Deutsch", "en": "Daily AI, in plain language",
                 "fr": "L'IA au quotidien", "es": "IA cada día", "it": "IA ogni giorno",
                 "pt": "IA todos os dias", "nl": "Dagelijks AI", "pl": "Codziennie o AI",
                 "tr": "Her gün yapay zekâ", "ja": "毎日のAIニュース", "zh": "每日AI资讯"},
    "nl_text": {
        "de": "Kuratierte KI-News, 3–5 Min, kein Hype — von Aban News.",
        "en": "Curated AI news, 3–5 min, no hype — by Aban News.",
        "fr": "Actus IA triées, 3–5 min, sans hype — par Aban News.",
        "es": "Noticias de IA, 3–5 min, sin hype — de Aban News.",
        "it": "Notizie IA, 3–5 min, senza hype — da Aban News.",
        "pt": "Notícias de IA, 3–5 min, sem hype — da Aban News.",
        "nl": "Gecureerd AI-nieuws, 3–5 min, geen hype — van Aban News.",
        "pl": "Wyselekcjonowane newsy AI, 3–5 min, bez hype'u — od Aban News.",
        "tr": "Seçili YZ haberleri, 3–5 dk, abartısız — Aban News.",
        "ja": "厳選AIニュース、3〜5分、誇張なし — Aban News。",
        "zh": "精选AI新闻，3–5分钟，不浮夸 — Aban News。"},
    "nl_cta": {"de": "Kostenlos abonnieren", "en": "Subscribe free", "fr": "S'abonner gratuitement",
               "es": "Suscríbete gratis", "it": "Iscriviti gratis", "pt": "Assine grátis",
               "nl": "Gratis abonneren", "pl": "Subskrybuj za darmo", "tr": "Ücretsiz abone ol",
               "ja": "無料で購読", "zh": "免费订阅"},
    # --- Trending page ---
    "trending_nav": {"de": "Neu & Trending", "en": "New & trending", "fr": "Nouveautés & tendances",
                     "es": "Novedades y tendencias", "it": "Novità & tendenze", "pt": "Novidades & tendências",
                     "nl": "Nieuw & trending", "pl": "Nowe i popularne", "tr": "Yeni & popüler",
                     "ja": "新着＆トレンド", "zh": "最新与热门"},
    "trending_title": {"de": "Neu & Trending: zuletzt besprochene KI-Tools",
                       "en": "New & trending: recently covered AI tools",
                       "fr": "Nouveautés & tendances : outils IA récemment couverts",
                       "es": "Novedades: herramientas de IA cubiertas recientemente",
                       "it": "Novità: strumenti IA trattati di recente",
                       "pt": "Novidades: ferramentas de IA abordadas recentemente",
                       "nl": "Nieuw & trending: recent besproken AI-tools",
                       "pl": "Nowe i popularne: ostatnio omawiane narzędzia AI",
                       "tr": "Yeni & popüler: son ele alınan YZ araçları",
                       "ja": "新着＆トレンド：最近取り上げたAIツール",
                       "zh": "最新与热门：近期评测的AI工具"},
    "trending_intro": {"de": "Tools, die zuletzt im Aban-News-Newsletter besprochen wurden.",
                       "en": "Tools most recently covered in the Aban News newsletter.",
                       "fr": "Outils récemment présentés dans la newsletter Aban News.",
                       "es": "Herramientas tratadas recientemente en la newsletter Aban News.",
                       "it": "Strumenti trattati di recente nella newsletter Aban News.",
                       "pt": "Ferramentas abordadas recentemente na newsletter Aban News.",
                       "nl": "Tools die recent in de Aban News-nieuwsbrief zijn besproken.",
                       "pl": "Narzędzia ostatnio omawiane w newsletterze Aban News.",
                       "tr": "Aban News bülteninde son ele alınan araçlar.",
                       "ja": "Aban Newsで最近取り上げたツール。",
                       "zh": "Aban News 通讯近期评测的工具。"},
    # --- FAQ (per tool) ---
    "faq_heading": {"de": "Häufige Fragen", "en": "FAQ", "fr": "Questions fréquentes",
                    "es": "Preguntas frecuentes", "it": "Domande frequenti", "pt": "Perguntas frequentes",
                    "nl": "Veelgestelde vragen", "pl": "Najczęstsze pytania", "tr": "Sık sorulan sorular",
                    "ja": "よくある質問", "zh": "常见问题"},
    "faq_price": {"de": "Was kostet {name}?", "en": "How much does {name} cost?",
                  "fr": "Combien coûte {name} ?", "es": "¿Cuánto cuesta {name}?",
                  "it": "Quanto costa {name}?", "pt": "Quanto custa o {name}?",
                  "nl": "Wat kost {name}?", "pl": "Ile kosztuje {name}?",
                  "tr": "{name} ne kadar?", "ja": "{name}の料金は？", "zh": "{name} 多少钱？"},
    "faq_use": {"de": "Wofür eignet sich {name}?", "en": "What is {name} good for?",
                "fr": "À quoi sert {name} ?", "es": "¿Para qué sirve {name}?",
                "it": "A cosa serve {name}?", "pt": "Para que serve o {name}?",
                "nl": "Waarvoor is {name} geschikt?", "pl": "Do czego służy {name}?",
                "tr": "{name} ne için uygundur?", "ja": "{name}は何に向いている？",
                "zh": "{name} 适合做什么？"},
    "faq_alt": {"de": "Was sind Alternativen zu {name}?", "en": "What are alternatives to {name}?",
                "fr": "Quelles sont les alternatives à {name} ?", "es": "¿Qué alternativas hay a {name}?",
                "it": "Quali sono le alternative a {name}?", "pt": "Quais são as alternativas ao {name}?",
                "nl": "Wat zijn alternatieven voor {name}?", "pl": "Jakie są alternatywy dla {name}?",
                "tr": "{name} alternatifleri nelerdir?", "ja": "{name}の代替は？",
                "zh": "{name} 有哪些替代品？"},
    "faq_dach": {"de": "Ist {name} für den DACH-Raum geeignet?",
                 "en": "Is {name} suitable for the DACH region?",
                 "fr": "{name} convient-il à la région DACH ?",
                 "es": "¿Es {name} adecuado para la región DACH?",
                 "it": "{name} è adatto all'area DACH?",
                 "pt": "O {name} é adequado para a região DACH?",
                 "nl": "Is {name} geschikt voor de DACH-regio?",
                 "pl": "Czy {name} nadaje się dla regionu DACH?",
                 "tr": "{name} DACH bölgesi için uygun mu?",
                 "ja": "{name}はDACH地域に適している？",
                 "zh": "{name} 适合 DACH 地区吗？"},
    # --- Search + budget ---
    "search_ph": {"de": "Tool suchen…", "en": "Search tools…", "fr": "Rechercher un outil…",
                  "es": "Buscar herramienta…", "it": "Cerca strumento…", "pt": "Buscar ferramenta…",
                  "nl": "Tool zoeken…", "pl": "Szukaj narzędzia…", "tr": "Araç ara…",
                  "ja": "ツールを検索…", "zh": "搜索工具…"},
    "no_results": {"de": "Keine Treffer.", "en": "No results.", "fr": "Aucun résultat.",
                   "es": "Sin resultados.", "it": "Nessun risultato.", "pt": "Sem resultados.",
                   "nl": "Geen resultaten.", "pl": "Brak wyników.", "tr": "Sonuç yok.",
                   "ja": "結果なし。", "zh": "无结果。"},
    "budget_nav": {"de": "Nach Budget", "en": "By budget", "fr": "Par budget", "es": "Por presupuesto",
                   "it": "Per budget", "pt": "Por orçamento", "nl": "Per budget", "pl": "Według budżetu",
                   "tr": "Bütçeye göre", "ja": "予算別", "zh": "按预算"},
    "budget_free": {"de": "Kostenlose KI-Tools", "en": "Free AI tools", "fr": "Outils IA gratuits",
                    "es": "Herramientas de IA gratis", "it": "Strumenti IA gratuiti",
                    "pt": "Ferramentas de IA grátis", "nl": "Gratis AI-tools", "pl": "Darmowe narzędzia AI",
                    "tr": "Ücretsiz YZ araçları", "ja": "無料のAIツール", "zh": "免费AI工具"},
    "budget_under": {"de": "Beste KI-Tools unter {p} €", "en": "Best AI tools under €{p}",
                     "fr": "Meilleurs outils IA à moins de {p} €", "es": "Mejores herramientas de IA por menos de {p} €",
                     "it": "Migliori strumenti IA sotto i {p} €", "pt": "Melhores ferramentas de IA abaixo de {p} €",
                     "nl": "Beste AI-tools onder €{p}", "pl": "Najlepsze narzędzia AI poniżej {p} €",
                     "tr": "{p} € altı en iyi YZ araçları", "ja": "{p}ユーロ以下の最高AIツール",
                     "zh": "{p} 欧元以下最佳AI工具"},
    "tool_of_month": {"de": "Tool des Monats", "en": "Tool of the month", "fr": "Outil du mois",
                      "es": "Herramienta del mes", "it": "Strumento del mese", "pt": "Ferramenta do mês",
                      "nl": "Tool van de maand", "pl": "Narzędzie miesiąca", "tr": "Ayın aracı",
                      "ja": "今月のツール", "zh": "本月之选"},
    "related": {"de": "Verwandte Tools", "en": "Related tools", "fr": "Outils similaires",
                "es": "Herramientas relacionadas", "it": "Strumenti correlati", "pt": "Ferramentas relacionadas",
                "nl": "Gerelateerde tools", "pl": "Powiązane narzędzia", "tr": "İlgili araçlar",
                "ja": "関連ツール", "zh": "相关工具"},
    "az_nav": {"de": "Alle Tools A–Z", "en": "All tools A–Z", "fr": "Tous les outils A–Z",
               "es": "Todas las herramientas A–Z", "it": "Tutti gli strumenti A–Z",
               "pt": "Todas as ferramentas A–Z", "nl": "Alle tools A–Z", "pl": "Wszystkie narzędzia A–Z",
               "tr": "Tüm araçlar A–Z", "ja": "全ツール A–Z", "zh": "全部工具 A–Z"},
    "nf_title": {"de": "Seite nicht gefunden", "en": "Page not found", "fr": "Page introuvable",
                 "es": "Página no encontrada", "it": "Pagina non trovata", "pt": "Página não encontrada",
                 "nl": "Pagina niet gevonden", "pl": "Nie znaleziono strony", "tr": "Sayfa bulunamadı",
                 "ja": "ページが見つかりません", "zh": "页面未找到"},
    "nf_text": {"de": "Diese Seite gibt es nicht. Zurück zur Startseite mit allen KI-Tools.",
                "en": "This page doesn't exist. Back to the homepage with all AI tools.",
                "fr": "Cette page n'existe pas. Retour à l'accueil avec tous les outils IA.",
                "es": "Esta página no existe. Vuelve al inicio con todas las herramientas de IA.",
                "it": "Questa pagina non esiste. Torna alla home con tutti gli strumenti IA.",
                "pt": "Esta página não existe. Volte à página inicial com todas as ferramentas de IA.",
                "nl": "Deze pagina bestaat niet. Terug naar de homepage met alle AI-tools.",
                "pl": "Ta strona nie istnieje. Wróć na stronę główną ze wszystkimi narzędziami AI.",
                "tr": "Bu sayfa yok. Tüm YZ araçlarının olduğu ana sayfaya dön.",
                "ja": "このページは存在しません。すべてのAIツールがあるホームへ。",
                "zh": "页面不存在。返回包含所有AI工具的首页。"},
    "stack_nav": {"de": "Stacks für Berufe", "en": "Stacks by profession", "fr": "Stacks par métier",
                  "es": "Stacks por profesión", "it": "Stack per professione", "pt": "Stacks por profissão",
                  "nl": "Stacks per beroep", "pl": "Zestawy wg zawodu", "tr": "Mesleğe göre paketler",
                  "ja": "職業別スタック", "zh": "按职业的工具组合"},
    "vshub_nav": {"de": "Alle Vergleiche", "en": "All comparisons", "fr": "Tous les comparatifs",
                  "es": "Todas las comparativas", "it": "Tutti i confronti", "pt": "Todas as comparações",
                  "nl": "Alle vergelijkingen", "pl": "Wszystkie porównania", "tr": "Tüm karşılaştırmalar",
                  "ja": "すべての比較", "zh": "全部对比"},
    "vshub_title": {"de": "KI-Tool-Vergleiche", "en": "AI tool comparisons",
                    "fr": "Comparatifs d'outils IA", "es": "Comparativas de herramientas de IA",
                    "it": "Confronti tra strumenti IA", "pt": "Comparações de ferramentas de IA",
                    "nl": "AI-tool vergelijkingen", "pl": "Porównania narzędzi AI",
                    "tr": "YZ aracı karşılaştırmaları", "ja": "AIツール比較", "zh": "AI工具对比"},
    "stack_sub": {"de": "Die besten KI-Tools, kuratiert für diesen Beruf.",
                  "en": "The best AI tools, curated for this profession.",
                  "fr": "Les meilleurs outils IA, sélectionnés pour ce métier.",
                  "es": "Las mejores herramientas de IA para esta profesión.",
                  "it": "I migliori strumenti IA per questa professione.",
                  "pt": "As melhores ferramentas de IA para esta profissão.",
                  "nl": "De beste AI-tools, samengesteld voor dit beroep.",
                  "pl": "Najlepsze narzędzia AI dla tego zawodu.",
                  "tr": "Bu meslek için seçilmiş en iyi YZ araçları.",
                  "ja": "この職業向けに厳選した最高のAIツール。",
                  "zh": "为该职业精选的最佳 AI 工具。"},
    "glossary_nav": {"de": "Glossar", "en": "Glossary", "fr": "Glossaire", "es": "Glosario",
                     "it": "Glossario", "pt": "Glossário", "nl": "Woordenlijst", "pl": "Słownik",
                     "tr": "Sözlük", "ja": "用語集", "zh": "术语表"},
    "glossary_title": {"de": "KI-Glossar: Begriffe einfach erklärt",
                       "en": "AI glossary: key terms explained",
                       "fr": "Glossaire IA : les termes clés expliqués",
                       "es": "Glosario de IA: términos clave explicados",
                       "it": "Glossario IA: i termini chiave spiegati",
                       "pt": "Glossário de IA: termos-chave explicados",
                       "nl": "AI-woordenlijst: begrippen uitgelegd",
                       "pl": "Słownik AI: kluczowe pojęcia",
                       "tr": "YZ sözlüğü: temel terimler",
                       "ja": "AI用語集：重要語をやさしく解説",
                       "zh": "AI 术语表：核心概念解析"},
    "glossary_sub": {"de": "Die wichtigsten KI-Begriffe verständlich erklärt — mit passenden Tools.",
                     "en": "The most important AI terms, clearly explained — with matching tools.",
                     "fr": "Les termes IA essentiels, clairement expliqués — avec des outils adaptés.",
                     "es": "Los términos de IA más importantes, explicados — con herramientas afines.",
                     "it": "I termini IA più importanti, spiegati — con strumenti correlati.",
                     "pt": "Os termos de IA mais importantes, explicados — com ferramentas relacionadas.",
                     "nl": "De belangrijkste AI-begrippen, helder uitgelegd — met bijpassende tools.",
                     "pl": "Najważniejsze pojęcia AI, jasno wyjaśnione — z pasującymi narzędziami.",
                     "tr": "En önemli YZ terimleri, açıkça anlatıldı — ilgili araçlarla.",
                     "ja": "重要なAI用語をわかりやすく解説 — 関連ツール付き。",
                     "zh": "最重要的 AI 术语清晰解析 — 附相关工具。"},
}
# Newsletter box links to the existing owned audience (compounding revenue lever).
NEWSLETTER_URL = "https://abannews.de"


def slugify(value: str) -> str:
    value = value.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        value = value.replace(a, b)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "x"


def e(value) -> str:
    return html.escape(str(value if value is not None else ""))


# --- Localization loading ------------------------------------------------------

def load_locales(here: Path) -> dict:
    """Build {lang: {"ui": {...}, "tools": {id: {...}}}} for every language.

    German UI is the in-code base; German tool notes come from tools.json plus
    content/critique.de.json (pro/contra). Other languages come from lang/<code>.json,
    falling back to German for any missing string/field.
    """
    locales = {}
    de_critique = {}
    crit_path = here / "content" / "critique.de.json"
    if crit_path.exists():
        de_critique = json.loads(crit_path.read_text(encoding="utf-8")).get("tools", {})
    locales["de"] = {"ui": dict(UI_DE), "tools": de_critique}

    for code in LANGUAGES:
        if code == "de":
            continue
        path = here / "lang" / f"{code}.json"
        if not path.exists():
            continue
        pack = json.loads(path.read_text(encoding="utf-8"))
        ui = dict(UI_DE)
        ui.update(pack.get("ui", {}))
        locales[code] = {"ui": ui, "tools": pack.get("tools", {})}

    # Merge the extra (curated) UI strings for the new page types into every locale.
    for code, loc in locales.items():
        for key, trans in NEW_UI.items():
            loc["ui"][key] = trans.get(code, trans["de"])
    return locales


def page_path(lang: str, kind: str, slug: str = "") -> str:
    """URL path for a page in a language. de lives at root, others under /<code>/."""
    prefix = "" if lang == "de" else f"/{lang}"
    if kind == "home":
        return f"{prefix}/" if prefix else "/"
    if kind == "tool":
        return f"{prefix}/tool/{slug}.html"
    if kind == "cat":
        return f"{prefix}/kategorie/{slug}.html"
    if kind == "vs":
        return f"{prefix}/vergleich/{slug}.html"
    if kind == "uc":
        return f"{prefix}/fuer/{slug}.html"
    if kind == "dsgvo":
        return f"{prefix}/dsgvo.html"
    if kind == "trending":
        return f"{prefix}/neu.html"
    if kind == "budget":
        return f"{prefix}/preis/{slug}.html"
    if kind == "az":
        return f"{prefix}/tools.html"
    if kind == "stack":
        return f"{prefix}/stack/{slug}.html"
    if kind == "vshub":
        return f"{prefix}/vergleiche.html"
    if kind == "glossary":
        return f"{prefix}/glossar.html"
    if kind == "term":
        return f"{prefix}/glossar/{slug}.html"
    return prefix + "/"


def feed_path(lang: str) -> str:
    prefix = "" if lang == "de" else f"/{lang}"
    return f"{prefix}/feed.xml"


def out_file(out: Path, lang: str, kind: str, slug: str = "") -> Path:
    p = page_path(lang, kind, slug)
    if p.endswith("/"):
        p += "index.html"
    return out / p.lstrip("/")


# --- HTML shell ----------------------------------------------------------------

def hreflang_block(available: list[str], kind: str, slug: str = "") -> str:
    out = []
    for code in available:
        out.append(
            f'<link rel="alternate" hreflang="{code}" '
            f'href="{e(BASE_URL + page_path(code, kind, slug))}">'
        )
    out.append(
        f'<link rel="alternate" hreflang="x-default" '
        f'href="{e(BASE_URL + page_path("de", kind, slug))}">'
    )
    return "\n".join(out)


def lang_switcher(available: list[str], current: str, kind: str, slug: str = "") -> str:
    links = []
    for code in available:
        label = LANG_NAMES.get(code, code)
        if code == current:
            links.append(f'<strong>{e(label)}</strong>')
        else:
            links.append(f'<a href="{e(page_path(code, kind, slug))}">{e(label)}</a>')
    return " · ".join(links)


def page(*, lang, ui, title, description, body, canonical,
         available, kind, slug="", og_image=None):
    og_img = og_image or (BASE_URL + "/og/default.png")
    return f"""<!DOCTYPE html>
<html lang="{e(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
{hreflang_block(available, kind, slug)}
<link rel="alternate" type="application/rss+xml" title="{e(SITE_NAME)}" href="{e(BASE_URL + feed_path(lang))}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(SITE_NAME)}">
<meta property="og:locale" content="{e(lang)}">
<meta property="og:image" content="{e(og_img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{e(og_img)}">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_HOVER};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,
"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}}
a{{color:var(--accent-h);}}
.wrap{{max-width:880px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
.langbar{{font-size:.82rem;color:var(--muted);margin-top:8px;}}
.langbar a{{color:var(--muted);}}
main{{padding:28px 0;}}
.card{{background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin:0 0 14px;}}
.card h2{{margin:0 0 6px;font-size:1.15rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.score{{display:inline-block;background:var(--success);color:#fff;border-radius:999px;
padding:2px 10px;font-size:.85rem;font-weight:600;}}
.meta{{color:var(--muted);font-size:.88rem;margin:6px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
padding:10px 18px;border-radius:8px;font-weight:600;margin-top:8px;}}
.cta:hover{{background:var(--accent-h);}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:12px 0;font-size:.92rem;}}
.pc{{display:flex;flex-wrap:wrap;gap:14px;margin:14px 0;}}
.pc>div{{flex:1;min-width:220px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 16px;}}
.pc h3{{margin:0 0 6px;font-size:1rem;}} .pc .pro h3{{color:var(--success);}} .pc .contra h3{{color:#b91c1c;}}
.pc ul{{margin:0;padding-left:18px;}}
.grid-meta{{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.88rem;color:var(--muted);}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin:22px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;}}
.nl strong{{font-size:1.05rem;}} .nl span{{color:var(--muted);flex:1;min-width:200px;}}
.nl .cta{{margin-top:0;}}
.subnav{{font-size:.9rem;margin:6px 0 0;}}
.search{{width:100%;padding:11px 14px;font-size:1rem;border:1px solid var(--border);border-radius:10px;margin:0 0 14px;}}
.search:focus{{outline:2px solid var(--accent);border-color:var(--accent);}}
.feat{{border:2px solid var(--accent);border-radius:14px;padding:8px 14px 2px;margin:14px 0;background:#fff;}}
.feat-label{{display:inline-block;background:var(--accent);color:#fff;font-weight:600;font-size:.82rem;border-radius:999px;padding:2px 12px;margin:4px 0 2px;}}
.feat .card{{border:none;margin:0;padding:10px 6px;}}
.azlist{{columns:2;column-gap:32px;padding-left:18px;}} @media(max-width:600px){{.azlist{{columns:1;}}}}
.azlist li{{margin:2px 0;}}
.vs-col{{display:flex;flex-wrap:wrap;gap:14px;}} .vs-col>div{{flex:1;min-width:240px;}}
.faq{{margin:22px 0;}} .faq h2{{font-size:1.1rem;margin:0 0 8px;}}
.faq details{{background:#fff;border:1px solid var(--border);border-radius:8px;padding:8px 14px;margin:0 0 8px;}}
.faq summary{{cursor:pointer;font-weight:600;}} .faq details p{{margin:8px 0 0;color:var(--muted);}}
.disclosure{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:24px;padding-top:14px;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="{e(page_path(lang,'home'))}"><h1>📡 {e(SITE_NAME)}</h1></a>
<div class="tag">{e(ui['tagline'])}</div>
<div class="langbar">🌐 {lang_switcher(available, lang, kind, slug)}</div>
</div></header>
<main><div class="wrap">
{body}
<aside class="nl">
<strong>📬 {e(ui['nl_title'])}</strong>
<span>{e(ui['nl_text'])}</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">{e(ui['nl_cta'])} →</a>
</aside>
<p class="disclosure">{e(ui['disclosure'])}</p>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/datenschutz.html">{e(ui['privacy'])}</a> ·
<a href="/impressum.html">{e(ui['imprint'])}</a> · {e(ui['data_note'])}
</div></footer>
</body>
</html>"""


# --- Content components --------------------------------------------------------

def price_str(tool, ui):
    p = tool.get("pricing", {})
    if p.get("paid_from_eur"):
        return f"{ui['price_from']} {p['paid_from_eur']} {p.get('currency','EUR')}"
    return ui["free"] if p.get("free_tier") else "—"


def affiliate_link(tool, aff):
    entry = aff.get(tool["id"])
    if entry and entry.get("affiliate_url"):
        return entry["affiliate_url"], True
    return tool.get("url", "#"), False


def tool_card(tool, aff, ui, lang):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    cats = "".join(f'<span class="chip">{e(c)}</span>' for c in tool.get("category", []))
    search = " ".join([tool["name"], tool.get("vendor", "")]
                      + tool.get("category", []) + tool.get("use_cases", [])).lower()
    return f"""<article class="card" data-s="{e(search)}">
<h2><a href="{e(page_path(lang,'tool',slugify(tool['id'])))}">{e(tool['name'])}</a>
<span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h2>
<div class="grid-meta">
<span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(price_str(tool, ui))}</span>
<span>🇩🇪 {e(ui['dach'])} {e(tool.get('dach_relevance','—'))}/10</span>
</div>
<p class="meta">{cats}</p>
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>
</article>"""


def jsonld(tool):
    p = tool.get("pricing", {})
    data = {
        "@context": "https://schema.org", "@type": "SoftwareApplication",
        "name": tool["name"], "applicationCategory": (tool.get("category") or ["AI"])[0],
        "operatingSystem": "Web", "url": tool.get("url"),
    }
    if tool.get("vendor"):
        data["author"] = {"@type": "Organization", "name": tool["vendor"]}
    if p.get("paid_from_eur") is not None or p.get("free_tier"):
        data["offers"] = {"@type": "Offer", "price": str(p.get("paid_from_eur", 0)),
                          "priceCurrency": p.get("currency", "EUR")}
    if tool.get("worth_it_score") is not None:
        data["review"] = {"@type": "Review",
                          "author": {"@type": "Organization", "name": SITE_NAME},
                          "reviewRating": {"@type": "Rating",
                                           "ratingValue": str(tool["worth_it_score"]),
                                           "bestRating": "10"}}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def breadcrumb(items, lang):
    """BreadcrumbList JSON-LD. items = [(name, path), ...] relative to BASE_URL."""
    elems = [{"@type": "ListItem", "position": i + 1, "name": name,
              "item": BASE_URL + path} for i, (name, path) in enumerate(items)]
    data = {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": elems}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def pro_contra(loc_tool, ui):
    pros = loc_tool.get("pro") or []
    contras = loc_tool.get("contra") or []
    if not pros and not contras:
        return ""
    pli = "".join(f"<li>{e(x)}</li>" for x in pros)
    cli = "".join(f"<li>{e(x)}</li>" for x in contras)
    return f"""<div class="pc">
<div class="pro"><h3>✓ {e(ui['pro'])}</h3><ul>{pli}</ul></div>
<div class="contra"><h3>✗ {e(ui['contra'])}</h3><ul>{cli}</ul></div>
</div>"""


def faq_section(tool, loc, ui, tools_by_id, lang):
    """Visible FAQ (accordion) + FAQPage JSON-LD, composed from tool data."""
    name = tool["name"]
    p = tool.get("pricing", {})
    qa = []
    # Price
    price = price_str(tool, ui)
    if p.get("model"):
        price = f"{price} ({p['model']})"
    qa.append((ui["faq_price"].format(name=name), price))
    # Use cases
    use_cases = loc.get("use_cases") or tool.get("use_cases", [])
    if use_cases:
        qa.append((ui["faq_use"].format(name=name), ", ".join(use_cases)))
    # Alternatives
    alt_names = [tools_by_id[a]["name"] for a in tool.get("alternatives", []) if a in tools_by_id]
    if alt_names:
        qa.append((ui["faq_alt"].format(name=name), ", ".join(alt_names)))
    # DACH suitability
    dach_a = f"{ui['dach']}: {tool.get('dach_relevance','—')}/10."
    dsgvo = loc.get("dsgvo_note") or tool.get("dsgvo_note")
    if dsgvo:
        dach_a += " " + dsgvo
    qa.append((ui["faq_dach"].format(name=name), dach_a))

    details = "".join(
        f"<details><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in qa)
    schema = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q,
                              "acceptedAnswer": {"@type": "Answer", "text": a}}
                             for q, a in qa]}
    script = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'
    return (f'<section class="faq"><h2>{e(ui["faq_heading"])}</h2>{details}</section>{script}')


def tool_page(tool, aff, ui, loc_tools, lang, available, tools_by_id=None, related=None):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    loc = loc_tools.get(tool["id"], {})
    note = loc.get("aban_note") or tool.get("aban_note")
    dsgvo = loc.get("dsgvo_note") or tool.get("dsgvo_note")
    use_cases = loc.get("use_cases") or tool.get("use_cases", [])
    uc = "".join(f'<span class="chip">{e(u)}</span>' for u in use_cases)
    alts = ", ".join(e(a) for a in tool.get("alternatives", [])) or "—"
    p = tool.get("pricing", {})
    price_extra = (f" · {ui['price_from']} {p['paid_from_eur']} {p.get('currency','EUR')}"
                   if p.get("paid_from_eur") else "")
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (tool["name"], page_path(lang, "tool", slugify(tool["id"])))], lang)
    body = f"""{jsonld(tool)}{crumb}
<p><a href="{e(page_path(lang,'home'))}">{e(ui['all_tools'])}</a></p>
<h1 style="margin:0">{e(tool['name'])} <span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h1>
<div class="grid-meta" style="margin:10px 0">
<span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(p.get('model','—'))}{e(price_extra)}</span>
<span>🇩🇪 {e(ui['dach'])} {e(tool.get('dach_relevance','—'))}/10</span>
</div>
<p><strong>{e(ui['use_cases'])}:</strong><br>{uc or '—'}</p>
{pro_contra(loc, ui)}
{'<div class="note"><strong>'+e(ui['editor_note'])+':</strong> '+e(note)+'</div>' if note else ''}
{'<div class="note"><strong>'+e(ui['dsgvo'])+':</strong> '+e(dsgvo)+'</div>' if dsgvo else ''}
<p><strong>{e(ui['alternatives'])}:</strong> {alts}</p>
{comparison_links(tool, tools_by_id or {}, ui, lang)}
{related_links(related, ui, lang)}
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>
{faq_section(tool, loc, ui, tools_by_id or {}, lang)}"""
    desc = (note or ui["meta_tool"].format(name=tool["name"]))[:155]
    return page(lang=lang, ui=ui,
                title=f"{tool['name']} — {SITE_NAME}", description=desc, body=body,
                canonical=BASE_URL + page_path(lang, "tool", slugify(tool["id"])),
                available=available, kind="tool", slug=slugify(tool["id"]),
                og_image=BASE_URL + f"/og/{slugify(tool['id'])}.png")


def vs_slug(a_id, b_id):
    x, y = sorted([slugify(a_id), slugify(b_id)])
    return f"{x}-vs-{y}"


def itemlist(members, lang):
    """ItemList JSON-LD for listing pages (Google list/carousel eligibility)."""
    elems = [{"@type": "ListItem", "position": i + 1,
              "url": BASE_URL + page_path(lang, "tool", slugify(t["id"])),
              "name": t["name"]} for i, t in enumerate(members)]
    data = {"@context": "https://schema.org", "@type": "ItemList",
            "itemListElement": elems}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def related_links(related, ui, lang):
    """Links to other tools sharing a category (internal linking / SEO)."""
    if not related:
        return ""
    links = " · ".join(
        f'<a href="{e(page_path(lang,"tool",slugify(r["id"])))}">{e(r["name"])}</a>'
        for r in related)
    return f'<p class="subnav"><strong>{e(ui["related"])}:</strong> {links}</p>'


def comparison_links(tool, tools_by_id, ui, lang):
    """Internal links from a tool page to its head-to-head comparisons."""
    alts = [tools_by_id[a] for a in tool.get("alternatives", []) if a in tools_by_id]
    if not alts:
        return ""
    links = " · ".join(
        f'<a href="{e(page_path(lang,"vs",vs_slug(tool["id"],a["id"])))}">'
        f'{e(tool["name"])} vs {e(a["name"])}</a>' for a in alts)
    return f'<p class="subnav"><strong>{e(ui["comparisons"])}:</strong> {links}</p>'


def vs_column(tool, aff, ui, loc_tools, lang):
    url, is_aff = affiliate_link(tool, aff)
    star = " *" if is_aff else ""
    loc = loc_tools.get(tool["id"], {})
    return f"""<div>
<h2 style="margin:0 0 6px"><a href="{e(page_path(lang,'tool',slugify(tool['id'])))}"
style="text-decoration:none;color:var(--text)">{e(tool['name'])}</a>
<span class="score">{e(tool.get('worth_it_score','—'))}/10</span></h2>
<div class="grid-meta"><span>🏢 {e(tool.get('vendor','—'))}</span>
<span>💶 {e(price_str(tool, ui))}</span>
<span>🇩🇪 {e(ui['dach'])} {e(tool.get('dach_relevance','—'))}/10</span></div>
{pro_contra(loc, ui)}
<a class="cta" href="{e(url)}" rel="sponsored nofollow" target="_blank">{e(ui['cta'].format(name=tool['name']))}{e(star)} →</a>
</div>"""


def comparison_page(a, b, aff, ui, loc_tools, lang, available):
    sa = a.get("worth_it_score") or 0
    sb = b.get("worth_it_score") or 0
    if abs(sa - sb) < 0.3:
        verdict = ui["tie"]
    else:
        verdict = ui["winner"].format(name=(a if sa > sb else b)["name"])
    slug = vs_slug(a["id"], b["id"])
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (f"{a['name']} vs {b['name']}", page_path(lang, "vs", slug))], lang)
    body = f"""{jsonld(a)}{jsonld(b)}{crumb}
<p><a href="{e(page_path(lang,'home'))}">{e(ui['all_tools'])}</a></p>
<h1 style="margin:0 0 4px">{e(a['name'])} vs {e(b['name'])}</h1>
<p class="note"><strong>{e(ui['verdict'])}:</strong> {e(verdict)}</p>
<div class="vs-col">{vs_column(a, aff, ui, loc_tools, lang)}{vs_column(b, aff, ui, loc_tools, lang)}</div>"""
    return page(lang=lang, ui=ui,
                title=f"{a['name']} vs {b['name']} — {SITE_NAME}",
                description=f"{a['name']} vs {b['name']}: {ui['verdict']}, Pro & Contra, Pricing, {ui['dsgvo']}.",
                body=body, canonical=BASE_URL + page_path(lang, "vs", slug),
                available=available, kind="vs", slug=slug)


def usecase_page(uc_display, uc_slug, members, aff, ui, lang, available):
    title = ui["best_in"].format(cat=uc_display)
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (title, page_path(lang, "uc", uc_slug))], lang)
    body = (f'{crumb}{itemlist(members, lang)}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>{e(title)}</h1>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui,
                title=ui["best_in"].format(cat=uc_display) + f" — {SITE_NAME}",
                description=ui["meta_cat"].format(cat=uc_display), body=body,
                canonical=BASE_URL + page_path(lang, "uc", uc_slug),
                available=available, kind="uc", slug=uc_slug)


def latest_issue(tool):
    """Highest newsletter issue number that mentioned the tool (recency proxy)."""
    nums = []
    for m in tool.get("ausgaben_mentions", []):
        try:
            nums.append(int(str(m)))
        except (TypeError, ValueError):
            pass
    return max(nums) if nums else 0


def trending_page(members, aff, ui, lang, available):
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (ui["trending_nav"], page_path(lang, "trending"))], lang)
    body = (f'{crumb}{itemlist(members, lang)}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>🆕 {e(ui["trending_title"])}</h1>\n<p class="meta">{e(ui["trending_intro"])}</p>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui, title=ui["trending_nav"] + f" — {SITE_NAME}",
                description=ui["trending_intro"], body=body,
                canonical=BASE_URL + page_path(lang, "trending"),
                available=available, kind="trending")


def rss_feed(members, ui, loc_tools, lang):
    """RSS 2.0 feed of recently-covered tools (freshness signal + subscribers)."""
    now = date.today().strftime("%a, %d %b %Y 00:00:00 +0000")
    items = []
    for t in members:
        loc = loc_tools.get(t["id"], {})
        desc = loc.get("aban_note") or t.get("aban_note") or ""
        link = BASE_URL + page_path(lang, "tool", slugify(t["id"]))
        items.append(
            f"<item><title>{e(t['name'])}</title><link>{e(link)}</link>"
            f"<guid>{e(link)}</guid><pubDate>{now}</pubDate>"
            f"<description>{e(desc)}</description></item>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0"><channel>'
            f"<title>{e(SITE_NAME)}</title><link>{e(BASE_URL + page_path(lang,'home'))}</link>"
            f"<description>{e(ui['tagline'])}</description><language>{e(lang)}</language>"
            f"<lastBuildDate>{now}</lastBuildDate>" + "".join(items) +
            "</channel></rss>")


def budget_page(title, slug, members, aff, ui, lang, available):
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (title, page_path(lang, "budget", slug))], lang)
    body = (f'{crumb}{itemlist(members, lang)}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>💶 {e(title)}</h1>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui, title=title + f" — {SITE_NAME}",
                description=title + ".", body=body,
                canonical=BASE_URL + page_path(lang, "budget", slug),
                available=available, kind="budget", slug=slug)


def site_schema(ui, lang):
    """WebSite + Organization JSON-LD for entity recognition / E-E-A-T."""
    data = [
        {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME,
         "url": BASE_URL + page_path(lang, "home"), "inLanguage": lang,
         "description": ui["tagline"]},
        {"@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME,
         "url": BASE_URL + "/", "description": ui["tagline"]},
    ]
    return "".join(
        f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
        for x in data)


def vshub_page(pairs, ui, lang, available):
    """Hub linking every comparison page (crawl depth + internal linking)."""
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (ui["vshub_title"], page_path(lang, "vshub"))], lang)
    items = sorted(pairs, key=lambda ab: ab[0]["name"].lower())
    links = "\n".join(
        f'<li><a href="{e(page_path(lang,"vs",vs_slug(a["id"],b["id"])))}">'
        f'{e(a["name"])} vs {e(b["name"])}</a></li>' for a, b in items)
    body = (f'{crumb}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>🆚 {e(ui["vshub_title"])}</h1>\n<ul class="azlist">{links}</ul>')
    return page(lang=lang, ui=ui, title=ui["vshub_title"] + f" — {SITE_NAME}",
                description=ui["vshub_title"] + ".", body=body,
                canonical=BASE_URL + page_path(lang, "vshub"),
                available=available, kind="vshub")


def load_glossary(here: Path):
    path = here / "content" / "glossary.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("terms", [])


def term_tools(term, tools_sorted, limit=6):
    """Tools related to a glossary term via shared category or use_case."""
    rel = set(term.get("rel", []))
    out = []
    for t in tools_sorted:
        if rel & (set(t.get("category", [])) | set(t.get("use_cases", []))):
            out.append(t)
        if len(out) >= limit:
            break
    return out


def term_page(term, related, aff, ui, lang, available):
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (ui["glossary_nav"], page_path(lang, "glossary")),
                        (term["term"], page_path(lang, "term", term["slug"]))], lang)
    schema = {"@context": "https://schema.org", "@type": "DefinedTerm",
              "name": term["term"], "description": term["de"],
              "inDefinedTermSet": BASE_URL + page_path(lang, "glossary")}
    sj = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'
    rel_html = ""
    if related:
        rel_html = (f'<h2 style="font-size:1.05rem;margin:18px 0 8px">{e(ui["related"])}</h2>\n'
                    + "\n".join(tool_card(t, aff, ui, lang) for t in related))
    body = (f'{crumb}{sj}<p><a href="{e(page_path(lang,"glossary"))}">← {e(ui["glossary_nav"])}</a></p>\n'
            f'<h1>{e(term["term"])}</h1>\n<p>{e(term["de"])}</p>\n{rel_html}')
    return page(lang=lang, ui=ui, title=f'{term["term"]} — {SITE_NAME}',
                description=term["de"][:155], body=body,
                canonical=BASE_URL + page_path(lang, "term", term["slug"]),
                available=available, kind="term", slug=term["slug"])


def glossary_page(terms, ui, lang, available):
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (ui["glossary_nav"], page_path(lang, "glossary"))], lang)
    links = "\n".join(
        f'<li><a href="{e(page_path(lang,"term",t["slug"]))}">{e(t["term"])}</a></li>'
        for t in sorted(terms, key=lambda x: x["term"].lower()))
    body = (f'{crumb}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>📖 {e(ui["glossary_title"])}</h1>\n'
            f'<p class="meta">{e(ui["glossary_sub"])}</p>\n<ul class="azlist">{links}</ul>')
    return page(lang=lang, ui=ui, title=ui["glossary_title"] + f" — {SITE_NAME}",
                description=ui["glossary_sub"], body=body,
                canonical=BASE_URL + page_path(lang, "glossary"),
                available=available, kind="glossary")


def az_page(tools, ui, lang, available):
    """Alphabetical A–Z index of all tools (navigation + crawl depth)."""
    items = sorted(tools, key=lambda t: t["name"].lower())
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (ui["az_nav"], page_path(lang, "az"))], lang)
    links = "\n".join(
        f'<li><a href="{e(page_path(lang,"tool",slugify(t["id"])))}">{e(t["name"])}</a>'
        f' <span class="meta">{e(t.get("worth_it_score","—"))}/10</span></li>' for t in items)
    body = (f'{crumb}{itemlist(items, lang)}'
            f'<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>{e(ui["az_nav"])}</h1>\n<ul class="azlist">{links}</ul>')
    return page(lang=lang, ui=ui, title=ui["az_nav"] + f" — {SITE_NAME}",
                description=ui["az_nav"] + ".", body=body,
                canonical=BASE_URL + page_path(lang, "az"),
                available=available, kind="az")


def stack_page(stack, members, aff, ui, lang, available):
    title = stack["title"].get(lang, stack["title"]["de"])
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (title, page_path(lang, "stack", stack["slug"]))], lang)
    body = (f'{crumb}{itemlist(members, lang)}'
            f'<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>{stack["emoji"]} {e(title)}</h1>\n<p class="meta">{e(ui["stack_sub"])}</p>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui, title=title + f" — {SITE_NAME}",
                description=f"{title}: {ui['stack_sub']}", body=body,
                canonical=BASE_URL + page_path(lang, "stack", stack["slug"]),
                available=available, kind="stack", slug=stack["slug"])


def notfound_page(ui, lang, available):
    body = (f'<h1>🤖 404 — {e(ui["nf_title"])}</h1>\n<p class="meta">{e(ui["nf_text"])}</p>\n'
            f'<a class="cta" href="{e(page_path(lang,"home"))}">{e(SITE_NAME)} →</a>')
    return page(lang=lang, ui=ui, title=f"404 — {SITE_NAME}", description=ui["nf_title"],
                body=body, canonical=BASE_URL + page_path(lang, "home"),
                available=available, kind="home")


def dsgvo_page(members, aff, ui, lang, available):
    crumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                        (ui["dsgvo_title"], page_path(lang, "dsgvo"))], lang)
    body = (f'{crumb}{itemlist(members, lang)}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
            f'<h1>🏆 {e(ui["dsgvo_title"])}</h1>\n<p class="meta">{e(ui["dsgvo_intro"])}</p>\n'
            + "\n".join(tool_card(t, aff, ui, lang) for t in members))
    return page(lang=lang, ui=ui, title=ui["dsgvo_title"] + f" — {SITE_NAME}",
                description=ui["dsgvo_intro"], body=body,
                canonical=BASE_URL + page_path(lang, "dsgvo"),
                available=available, kind="dsgvo")


# --- Legal pages ---------------------------------------------------------------
#
# Operator data is reused from the public Aban News imprint (same operator:
# Alleng Chour, Belp/CH). PROJECT-SPECIFIC blanks a human must confirm before
# launch are marked with [...] placeholders (domain, contact email).
LEGAL_DOMAIN = "[DOMAIN — z. B. ki-tools-radar.de]"
LEGAL_EMAIL = "[KONTAKT-E-MAIL — z. B. hallo@ki-tools-radar.de]"
OPERATOR = {
    "name": "Alleng Chour",
    "addr1": "Hühnerhubelstrasse 37",
    "addr2": "3123 Belp",
    "country": "Schweiz",
}


def imprint_page(ui, available):
    o = OPERATOR
    body = f"""<p><a href="/">← {e(ui['all_tools'])}</a></p>
<h1>Impressum</h1>
<h2>Angaben gemäß § 5 TMG (DE) / § 14 UGB (AT) / OR (CH)</h2>
<p><strong>{e(SITE_NAME)}</strong><br>
{e(o['name'])}<br>{e(o['addr1'])}<br>{e(o['addr2'])}<br>{e(o['country'])}</p>
<h2>Kontakt</h2>
<p>E-Mail: <a href="mailto:{e(LEGAL_EMAIL)}">{e(LEGAL_EMAIL)}</a><br>
Website: {e(LEGAL_DOMAIN)}</p>
<h2>Vertretungsberechtigte Person</h2>
<p>{e(o['name'])}</p>
<h2>Mehrwertsteuer-Status</h2>
<p>Diese Webseite wird von einer in der Schweiz ansässigen natürlichen Person betrieben.
Eine Eintragung im UID-Register erfolgt erst bei Überschreiten der Mehrwertsteuer-Pflicht.
Die Mehrwertsteuer wird gemäß Art. 10 Abs. 2 lit. a MWSTG (Schweiz) nicht erhoben, da der
Jahresumsatz unter CHF 100'000 liegt.</p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>{e(o['name'])}, {e(o['addr1'])}, {e(o['addr2'])}, {e(o['country'])}</p>
<h2>Haftung für Links</h2>
<p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter verantwortlich.</p>
<h2>Affiliate-Hinweis</h2>
<p>Diese Website enthält Affiliate-Links (mit * gekennzeichnet). Erfolgt über einen solchen
Link ein Kauf, erhalten wir eine Provision — ohne Mehrkosten für dich. Die Bewertungen sind
davon unabhängig.</p>
<h2>EU-Streitschlichtung</h2>
<p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a>.
Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
Verbraucherschlichtungsstelle teilzunehmen.</p>"""
    return page(lang="de", ui=ui, title=f"Impressum — {SITE_NAME}",
                description="Impressum und Anbieterkennzeichnung.", body=body,
                canonical=BASE_URL + "/impressum.html", available=available, kind="home")


def privacy_page(ui, available):
    body = f"""<p><a href="/">← {e(ui['all_tools'])}</a></p>
<h1>Datenschutzerklärung</h1>
<h2>1. Verantwortlicher</h2>
<p>{e(OPERATOR['name'])}, {e(OPERATOR['addr1'])}, {e(OPERATOR['addr2'])}, {e(OPERATOR['country'])}<br>
E-Mail: <a href="mailto:{e(LEGAL_EMAIL)}">{e(LEGAL_EMAIL)}</a></p>
<h2>2. Allgemeine Hinweise</h2>
<p>Diese Website ist als statische Seite ohne Nutzerkonten, ohne Tracking und ohne
Werbe-Cookies aufgebaut. Es werden nur die Daten verarbeitet, die technisch zur Auslieferung
der Seite nötig sind.</p>
<h2>3. Zugriff auf die Website (Server-Logs)</h2>
<p>Beim Aufruf erhebt unser Hosting-Anbieter automatisch Server-Logdaten (z. B. IP-Adresse,
Datum/Uhrzeit, abgerufene Seite, Browsertyp). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
(sicherer, fehlerfreier Betrieb). Die Daten werden nur kurzzeitig zur Betriebssicherheit
gespeichert.</p>
<h2>4. Hosting</h2>
<p>Die Website wird bei einem Anbieter mit Servern in der EU/EWR gehostet. Mit dem Anbieter
besteht ein Auftragsverarbeitungsvertrag (Art. 28 DSGVO). [Hosting-Anbieter eintragen, z. B.
Cloudflare Pages — vor Live-Gang prüfen.]</p>
<h2>5. Keine Cookies, kein Tracking</h2>
<p>Wir setzen keine Analyse- oder Marketing-Cookies und binden keine externen Schriftarten
oder Tracking-Dienste ein. Eine Einwilligung (Cookie-Banner) ist daher nicht erforderlich.</p>
<h2>6. Affiliate-Links</h2>
<p>Auf Produktseiten verlinken wir auf Anbieter (Affiliate-Links, mit * markiert). Erst wenn
du einen solchen Link anklickst, wirst du zum Anbieter weitergeleitet, der dann nach seiner
eigenen Datenschutzerklärung ein Cookie zur Provisionszuordnung setzen kann. Vorher findet
keine Übermittlung deiner Daten an die Anbieter statt.</p>
<h2>7. Newsletter</h2>
<p>Wenn du dich für unseren Newsletter (Aban News) interessierst, wirst du auf dessen eigene
Seite weitergeleitet; die Anmeldung und Datenverarbeitung erfolgt dort nach der dortigen
Datenschutzerklärung.</p>
<h2>8. Externe Links</h2>
<p>Diese Seite enthält Links zu externen Websites Dritter, auf deren Datenverarbeitung wir
keinen Einfluss haben.</p>
<h2>9. Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Wende dich dazu an die oben genannte
Kontaktadresse.</p>
<h2>10. Beschwerderecht</h2>
<p>Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung deiner
personenbezogenen Daten zu beschweren.</p>
<h2>11. SSL/TLS-Verschlüsselung</h2>
<p>Diese Seite nutzt aus Sicherheitsgründen eine TLS-Verschlüsselung (https).</p>
<h2>12. Änderungen</h2>
<p>Wir passen diese Datenschutzerklärung an, sobald sich Rechtslage oder Dienste ändern.
Stand: {date.today().strftime('%m/%Y')}.</p>"""
    return page(lang="de", ui=ui, title=f"Datenschutz — {SITE_NAME}",
                description="Datenschutzerklärung dieser Website.", body=body,
                canonical=BASE_URL + "/datenschutz.html", available=available, kind="home")


# --- Build ---------------------------------------------------------------------

def build(data_path: Path, aff_path: Path, out: Path, here: Path) -> int:
    db = json.loads(data_path.read_text(encoding="utf-8"))
    tools = db.get("tools", [])
    aff = {}
    if aff_path.exists():
        aff = json.loads(aff_path.read_text(encoding="utf-8")).get("links", {})

    locales = load_locales(here)
    glossary = load_glossary(here)
    available = [c for c in LANGUAGES if c in locales]

    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    tools_sorted = sorted(
        tools, key=lambda t: (t.get("worth_it_score", 0), t.get("dach_relevance", 0)),
        reverse=True)
    tools_by_id = {t["id"]: t for t in tools}
    categories = sorted({c for t in tools for c in t.get("category", [])})

    # Head-to-head pairs: (1) curated "alternatives" + (2) top tools within each
    # category (cross-tool permutations) — both deduped, both ids must exist.
    pairs = {}
    for t in tools:
        for alt in t.get("alternatives", []):
            if alt in tools_by_id and alt != t["id"]:
                key = tuple(sorted([t["id"], alt]))
                pairs[key] = (tools_by_id[key[0]], tools_by_id[key[1]])
    TOP_PER_CAT = 6
    by_cat = {}
    for t in tools_sorted:                      # already score-sorted
        for c in t.get("category", []):
            by_cat.setdefault(c, []).append(t)
    for members in by_cat.values():
        top = members[:TOP_PER_CAT]
        for i in range(len(top)):
            for j in range(i + 1, len(top)):
                key = tuple(sorted([top[i]["id"], top[j]["id"]]))
                pairs.setdefault(key, (tools_by_id[key[0]], tools_by_id[key[1]]))
    pairs = list(pairs.values())

    # Related tools: up to 4 others sharing a category (by score, excl. self).
    related_map = {}
    for t in tools:
        seen, rel = {t["id"]}, []
        for c in t.get("category", []):
            for cand in by_cat.get(c, []):
                if cand["id"] not in seen:
                    seen.add(cand["id"])
                    rel.append(cand)
        related_map[t["id"]] = rel[:4]

    # Tool of the month: deterministic monthly rotation through the top 20.
    _md = date.today()
    top20 = tools_sorted[:20]
    featured = top20[(_md.year * 12 + _md.month) % len(top20)] if top20 else None

    # Profession stacks: top tools across each stack's categories.
    stack_members = {}
    for st in STACKS:
        cats = set(st["cats"])
        members = [t for t in tools_sorted if cats & set(t.get("category", []))]
        stack_members[st["slug"]] = members[:8]

    # Trending = most-recently covered in the newsletter (fallback: top-rated).
    trending = sorted([t for t in tools if latest_issue(t) > 0],
                      key=latest_issue, reverse=True)[:24]
    if not trending:
        trending = tools_sorted[:24]

    # Use-case hubs (canonical English use_case -> members), only if >=3 tools.
    uc_map = {}
    for t in tools:
        for uc in t.get("use_cases", []):
            uc_map.setdefault(uc, []).append(t)
    use_cases = sorted([(uc, sorted(ms, key=lambda x: x.get("worth_it_score", 0), reverse=True))
                        for uc, ms in uc_map.items() if len(ms) >= 3])

    # Best-for-DACH list: strong DACH relevance (privacy notes shown where present).
    dsgvo_members = sorted(
        [t for t in tools if (t.get("dach_relevance") or 0) >= 7],
        key=lambda t: (t.get("dach_relevance", 0), t.get("worth_it_score", 0)), reverse=True)

    # Budget tiers: free + "under X €" (free tools count toward every budget).
    def _under(t, x):
        p = t.get("pricing", {})
        return bool(p.get("free_tier")) or (
            p.get("paid_from_eur") is not None and p["paid_from_eur"] <= x)

    def _by_score(ts):
        return sorted(ts, key=lambda t: t.get("worth_it_score", 0), reverse=True)

    BUDGETS = [10, 20, 50]
    budget_tiers = [("kostenlos", None,
                     _by_score([t for t in tools if t.get("pricing", {}).get("free_tier")]))]
    budget_tiers += [(f"unter-{x}-eur", x, _by_score([t for t in tools if _under(t, x)]))
                     for x in BUDGETS]

    pages = 0
    for lang in available:
        ui = locales[lang]["ui"]
        loc_tools = locales[lang]["tools"]

        # Homepage (with sub-navigation to DSGVO + use-case hubs)
        cat_links = " · ".join(
            f'<a href="{e(page_path(lang,"cat",slugify(c)))}">{e(c)}</a>' for c in categories)
        uc_links = " · ".join(
            f'<a href="{e(page_path(lang,"uc",slugify(uc)))}">{e(uc)}</a>' for uc, _ in use_cases)
        stack_links = " · ".join(
            f'<a href="{e(page_path(lang,"stack",st["slug"]))}">'
            f'{st["emoji"]} {e(st["title"].get(lang, st["title"]["de"]))}</a>' for st in STACKS)
        budget_links = " · ".join(
            [f'<a href="{e(page_path(lang,"budget","kostenlos"))}">0 €</a>']
            + [f'<a href="{e(page_path(lang,"budget",f"unter-{x}-eur"))}">&lt; {x} €</a>'
               for x in BUDGETS])
        subnav = (f'<p class="subnav">🏆 <a href="{e(page_path(lang,"dsgvo"))}">{e(ui["dsgvo_nav"])}</a>'
                  f' · 🆕 <a href="{e(page_path(lang,"trending"))}">{e(ui["trending_nav"])}</a>'
                  f' · 🔤 <a href="{e(page_path(lang,"az"))}">{e(ui["az_nav"])}</a>'
                  f' · 🆚 <a href="{e(page_path(lang,"vshub"))}">{e(ui["vshub_nav"])}</a>'
                  f' · 📖 <a href="{e(page_path(lang,"glossary"))}">{e(ui["glossary_nav"])}</a></p>\n'
                  f'<p class="subnav"><strong>{e(ui["budget_nav"])}:</strong> {budget_links}</p>\n'
                  f'<p class="subnav"><strong>{e(ui["stack_nav"])}:</strong> {stack_links}</p>\n'
                  f'<p class="subnav"><strong>{e(ui["by_use_case"])}:</strong> {uc_links}</p>')
        cards = "\n".join(tool_card(t, aff, ui, lang) for t in tools_sorted)
        search = (f'<input id="q" class="search" type="search" '
                  f'placeholder="{e(ui["search_ph"])}" aria-label="{e(ui["search_ph"])}">')
        feat_html = ""
        if featured:
            feat_html = (f'<div class="feat"><span class="feat-label">🏅 {e(ui["tool_of_month"])}</span>\n'
                         f'{tool_card(featured, aff, ui, lang)}</div>\n')
        home_body = (f'{site_schema(ui, lang)}{itemlist(tools_sorted, lang)}'
                     f'<p class="meta">{e(ui["categories"])}: {cat_links}</p>\n{subnav}\n{feat_html}'
                     f'<h2 style="margin:18px 0 12px">{e(ui["home_heading"].format(n=len(tools)))}</h2>\n'
                     f'{search}\n<p id="nores" hidden>{e(ui["no_results"])}</p>\n{cards}\n'
                     f'<script src="/search.js" defer></script>')
        of = out_file(out, lang, "home")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(page(lang=lang, ui=ui,
                           title=f"{SITE_NAME} — {ui['tagline']}",
                           description=ui["meta_home"].format(n=len(tools)),
                           body=home_body, canonical=BASE_URL + page_path(lang, "home"),
                           available=available, kind="home"), encoding="utf-8")
        pages += 1

        # Tool pages (with internal comparison + related links)
        for t in tools:
            of = out_file(out, lang, "tool", slugify(t["id"]))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(tool_page(t, aff, ui, loc_tools, lang, available, tools_by_id,
                                    related_map.get(t["id"])), encoding="utf-8")
            pages += 1

        # Category pages
        for c in categories:
            members = [t for t in tools_sorted if c in t.get("category", [])]
            ctitle = ui["best_in"].format(cat=c)
            ccrumb = breadcrumb([(SITE_NAME, page_path(lang, "home")),
                                 (ctitle, page_path(lang, "cat", slugify(c)))], lang)
            body = (f'{ccrumb}{itemlist(members, lang)}<p><a href="{e(page_path(lang,"home"))}">{e(ui["all_tools"])}</a></p>\n'
                    f'<h1>{e(ctitle)}</h1>\n'
                    + "\n".join(tool_card(t, aff, ui, lang) for t in members))
            of = out_file(out, lang, "cat", slugify(c))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(page(lang=lang, ui=ui,
                              title=ui["best_in"].format(cat=c) + f" — {SITE_NAME}",
                              description=ui["meta_cat"].format(cat=c), body=body,
                              canonical=BASE_URL + page_path(lang, "cat", slugify(c)),
                              available=available, kind="cat", slug=slugify(c)), encoding="utf-8")
            pages += 1

        # Comparison pages
        for a, b in pairs:
            of = out_file(out, lang, "vs", vs_slug(a["id"], b["id"]))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(comparison_page(a, b, aff, ui, loc_tools, lang, available),
                          encoding="utf-8")
            pages += 1

        # Use-case hub pages
        for uc, members in use_cases:
            of = out_file(out, lang, "uc", slugify(uc))
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(usecase_page(uc, slugify(uc), members, aff, ui, lang, available),
                          encoding="utf-8")
            pages += 1

        # DSGVO / DACH best-of page
        of = out_file(out, lang, "dsgvo")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(dsgvo_page(dsgvo_members, aff, ui, lang, available), encoding="utf-8")
        pages += 1

        # Trending page
        of = out_file(out, lang, "trending")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(trending_page(trending, aff, ui, lang, available), encoding="utf-8")
        pages += 1

        # Budget pages
        for slug, x, members in budget_tiers:
            title = ui["budget_free"] if x is None else ui["budget_under"].format(p=x)
            of = out_file(out, lang, "budget", slug)
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(budget_page(title, slug, members, aff, ui, lang, available),
                          encoding="utf-8")
            pages += 1

        # Profession stack pages
        for st in STACKS:
            of = out_file(out, lang, "stack", st["slug"])
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(stack_page(st, stack_members[st["slug"]], aff, ui, lang, available),
                          encoding="utf-8")
            pages += 1

        # A–Z index
        of = out_file(out, lang, "az")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(az_page(tools, ui, lang, available), encoding="utf-8")
        pages += 1

        # Comparison hub
        of = out_file(out, lang, "vshub")
        of.parent.mkdir(parents=True, exist_ok=True)
        of.write_text(vshub_page(pairs, ui, lang, available), encoding="utf-8")
        pages += 1

        # Glossary hub + term pages
        if glossary:
            of = out_file(out, lang, "glossary")
            of.parent.mkdir(parents=True, exist_ok=True)
            of.write_text(glossary_page(glossary, ui, lang, available), encoding="utf-8")
            pages += 1
            for term in glossary:
                of = out_file(out, lang, "term", term["slug"])
                of.parent.mkdir(parents=True, exist_ok=True)
                of.write_text(term_page(term, term_tools(term, tools_sorted),
                                        aff, ui, lang, available), encoding="utf-8")
                pages += 1

        # RSS feed (freshness signal + subscribers)
        feed = out / feed_path(lang).lstrip("/")
        feed.parent.mkdir(parents=True, exist_ok=True)
        feed.write_text(rss_feed(trending, ui, loc_tools, lang), encoding="utf-8")

    # Sitemaps: one per language + a sitemap index (better for large sites).
    today = date.today().isoformat()
    for lang in available:
        urls = ([BASE_URL + page_path(lang, "home"), BASE_URL + page_path(lang, "dsgvo"),
                 BASE_URL + page_path(lang, "trending"), BASE_URL + page_path(lang, "az")]
                + [BASE_URL + page_path(lang, "tool", slugify(t["id"])) for t in tools]
                + [BASE_URL + page_path(lang, "cat", slugify(c)) for c in categories]
                + [BASE_URL + page_path(lang, "vs", vs_slug(a["id"], b["id"])) for a, b in pairs]
                + [BASE_URL + page_path(lang, "uc", slugify(uc)) for uc, _ in use_cases]
                + [BASE_URL + page_path(lang, "budget", s) for s, _, _ in budget_tiers]
                + [BASE_URL + page_path(lang, "stack", st["slug"]) for st in STACKS]
                + [BASE_URL + page_path(lang, "vshub")]
                + ([BASE_URL + page_path(lang, "glossary")] if glossary else [])
                + [BASE_URL + page_path(lang, "term", t["slug"]) for t in glossary])
        sm = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for url in urls:
            sm.append(f"  <url><loc>{e(url)}</loc><lastmod>{today}</lastmod></url>")
        sm.append("</urlset>")
        (out / f"sitemap-{lang}.xml").write_text("\n".join(sm), encoding="utf-8")
    idx = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for lang in available:
        idx.append(f"  <sitemap><loc>{BASE_URL}/sitemap-{lang}.xml</loc>"
                   f"<lastmod>{today}</lastmod></sitemap>")
    idx.append("</sitemapindex>")
    (out / "sitemap.xml").write_text("\n".join(idx), encoding="utf-8")
    (out / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n", encoding="utf-8")

    # Branded 404 (Cloudflare/Netlify serve /404.html). German default.
    de_ui = locales["de"]["ui"]
    (out / "404.html").write_text(notfound_page(de_ui, "de", available), encoding="utf-8")

    # Legal pages (German, root — operator is Swiss/CH; reused Aban News data).
    (out / "impressum.html").write_text(imprint_page(de_ui, available), encoding="utf-8")
    (out / "datenschutz.html").write_text(privacy_page(de_ui, available), encoding="utf-8")

    # Static client-side search (no deps, no tracking, DSGVO-safe).
    (out / "search.js").write_text(SEARCH_JS, encoding="utf-8")

    # Open Graph images (Pillow); skipped gracefully if Pillow is unavailable.
    og_count = 0
    try:
        import og_images
        og_count = og_images.generate(tools, out, slugify)
    except ImportError:
        print("  (Pillow not installed — skipping OG image generation)")

    print(f"Built {pages} pages across {len(available)} languages "
          f"({', '.join(available)}) + {og_count} OG images + sitemap + RSS → {out}/")
    return pages


SEARCH_JS = """// KI-Tools Radar — client-side filter (no deps, no tracking)
(function () {
  var q = document.getElementById('q');
  if (!q) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('article.card'));
  var nores = document.getElementById('nores');
  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var show = !v || (c.dataset.s || '').indexOf(v) !== -1;
      c.style.display = show ? '' : 'none';
      if (show) n++;
    });
    if (nores) nores.hidden = n > 0;
  });
})();
"""


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here.parent / "data" / "tools.json"))
    ap.add_argument("--affiliate", default=str(here / "affiliate.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.affiliate), Path(args.out), here)


if __name__ == "__main__":
    main()
