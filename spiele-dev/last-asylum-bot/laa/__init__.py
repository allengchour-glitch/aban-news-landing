"""laa – Bildschirm-Bot-Bausteine für Android-Spiele (Last Asylum).

Module:
  image    – Bild-Klasse, PNG lesen/schreiben (ohne PIL)
  adb      – Gerätezugriff über ADB (plus FakeDevice für Tests)
  matcher  – Template-Suche (normalisierte Kreuzkorrelation)
  config   – JSON-Konfiguration mit Regeln und Aufgaben
  engine   – die Bot-Schleife
  log      – Konsolen- und JSONL-Protokoll
"""

__version__ = "1.0.0"

__all__ = ["image", "adb", "matcher", "config", "engine", "log"]
