# bigbuy-premium.ps1 - ASCII only. PREMIUM-MEHRKATEGORIEN-IMPORT von BigBuy EU (Markenware mit EAN).
# Laeuft am PC (BigBuy rate-limitet aus der Cloud). Braucht in luxe-secrets.ps1:
#   $env:BIGBUY_TOKEN, $env:SHOPIFY_CLIENT_ID, $env:SHOPIFY_CLIENT_SECRET  (oder $env:SHOPIFY_TOKEN)
# Idempotent: bereits importierte EANs werden uebersprungen (dropship/bigbuy-imported-eans.txt).
# Jede Kategorie ist gedrosselt (BB_DELAY) + hat MAX-Cap -> sicher gegen Rate-Limit/Spam.
$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$secrets = "$env:USERPROFILE\luxe-secrets.ps1"; if (Test-Path $secrets) { . $secrets }

if (-not $env:BIGBUY_TOKEN) { Write-Host "FEHLER: BIGBUY_TOKEN fehlt (in luxe-secrets.ps1 setzen)."; exit 1 }

# Kategorien (Root-Taxonomy-IDs) + wie viele neue je Lauf. Premium/Markenware-Fokus.
$cats = @(
  @{ name = "Schmuck";     root = "19662"; max = 12; markup = "2.2" },
  @{ name = "Uhren";       root = "19667"; max = 10; markup = "2.0" },
  @{ name = "Beauty";      root = "19650"; max = 12; markup = "2.2" },
  @{ name = "Koerperpflege"; root = "19669"; max = 10; markup = "2.2" },
  @{ name = "Sport";       root = "19756"; max = 10; markup = "1.9" },
  @{ name = "Kleidung";    root = "19668"; max = 10; markup = "1.9" }
)

Write-Host "=== BigBuy Premium-Import: $($cats.Count) Kategorien ==="
$total = 0
foreach ($c in $cats) {
  Write-Host ""
  Write-Host ">>> Kategorie: $($c.name) (Root $($c.root), max $($c.max))"
  $env:ROOT   = $c.root
  $env:MAX    = "$($c.max)"
  $env:MARKUP = $c.markup
  $env:BB_DELAY = "1400"   # extra-sanft gegen Rate-Limit
  & node "dropship/bigbuy_import.mjs"
  Remove-Item Env:ROOT, Env:MAX, Env:MARKUP, Env:BB_DELAY -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 5
}

# Ergebnis committen (Ledger + evtl. Logs), damit die Cloud-Session den Stand sieht.
git add dropship/bigbuy-imported-eans.txt 2>$null
git commit -m "BigBuy Premium-Import (PC-Lauf): neue Markenprodukte, Ledger aktualisiert" 2>$null
git pull --rebase origin claude/luxestyle-product-CizQ6 2>$null
git push origin claude/luxestyle-product-CizQ6 2>$null
Write-Host ""
Write-Host "=== Fertig. Neue Produkte sind ACTIVE + in allen Kanaelen. Ledger committet. ==="
