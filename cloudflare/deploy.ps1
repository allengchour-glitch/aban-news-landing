# LuxeStyle Autopilot + Gelato — geführtes Deploy (Windows PowerShell)
# ----------------------------------------------------------------------
# Ausführen auf dem PC (im Ordner cloudflare/):   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
# Macht: npm install → wrangler login → R2+KV anlegen → deploy → Secrets → gelato_map hochladen → final deploy.
# Secrets werden per sicherer Eingabe abgefragt (NICHTS wird ins Repo geschrieben).

$ErrorActionPreference = "Stop"
function Step($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ask($t){ Read-Host $t }
function AskSecret($name){
  $s = Read-Host "Secret '$name' (leer = überspringen)" -AsSecureString
  $p = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  if([string]::IsNullOrWhiteSpace($p)){ Write-Host "  übersprungen." -ForegroundColor DarkGray; return }
  $p | npx wrangler secret put $name
}

Set-Location $PSScriptRoot

Step "1/8  Node/npm prüfen"
node -v; npm -v

Step "2/8  Abhängigkeiten installieren"
npm install

Step "3/8  Bei Cloudflare anmelden (Browser öffnet sich)"
npx wrangler login

Step "4/8  R2-Bucket + KV-Namespace anlegen"
try { npx wrangler r2 bucket create luxestyle-autopilot } catch { Write-Host "  (Bucket existiert evtl. schon — ok)" -ForegroundColor DarkGray }
Write-Host "KV-Namespace anlegen … die ausgegebene id gleich in wrangler.toml eintragen:" -ForegroundColor Yellow
npx wrangler kv namespace create STATE
$kvId = Ask "KV-Namespace-id hier einfügen (aus der Ausgabe oben)"
if(-not [string]::IsNullOrWhiteSpace($kvId)){
  (Get-Content wrangler.toml) -replace 'REPLACE_WITH_KV_NAMESPACE_ID', $kvId | Set-Content wrangler.toml
  Write-Host "  ✓ wrangler.toml aktualisiert." -ForegroundColor Green
}

Step "5/8  Erst-Deploy (um die Worker-URL zu erfahren)"
npx wrangler deploy
$pub = Ask "Die workers.dev-URL aus der Ausgabe oben hier einfügen (z.B. https://luxestyle-autopilot.DEIN-NAME.workers.dev)"
if(-not [string]::IsNullOrWhiteSpace($pub)){
  (Get-Content wrangler.toml) -replace 'PUBLIC_BASE = "[^"]*"', ('PUBLIC_BASE = "' + $pub + '"') | Set-Content wrangler.toml
  Write-Host "  ✓ PUBLIC_BASE gesetzt." -ForegroundColor Green
}

Step "6/8  Secrets setzen (sichere Eingabe — leer lässt aus)"
Write-Host "Social-Autopilot (optional, wenn du IG/FB posten willst):" -ForegroundColor Yellow
AskSecret "GEMINI_API_KEY"
AskSecret "IG_USER_ID"
AskSecret "IG_ACCESS_TOKEN"
AskSecret "FB_PAGE_ID"
AskSecret "FB_PAGE_ACCESS_TOKEN"
AskSecret "THREADS_ACCESS_TOKEN"
AskSecret "LUMA_API_KEY"
AskSecret "RUN_KEY"
Write-Host "Gelato-Fulfillment (für eigenes Design → echter Druck):" -ForegroundColor Yellow
AskSecret "GELATO_API_KEY"
AskSecret "SHOPIFY_WEBHOOK_SECRET"

Step "7/8  Gelato-Map in KV hochladen (vorgebaut: 50 DTG-Varianten)"
if(Test-Path "gelato_map.json"){
  npx wrangler kv key put --binding=STATE gelato_map --path=gelato_map.json
  Write-Host "  ✓ gelato_map hochgeladen." -ForegroundColor Green
} else { Write-Host "  gelato_map.json nicht gefunden — übersprungen." -ForegroundColor DarkGray }

Step "8/8  Final deployen"
npx wrangler deploy

Write-Host "`n✅ Fertig. Noch manuell in Shopify: Webhook 'Bestellungserstellung' → $pub/webhooks/orders/create" -ForegroundColor Green
Write-Host "   Signatur-Secret dort = das, was du als SHOPIFY_WEBHOOK_SECRET gesetzt hast." -ForegroundColor Green
Write-Host "   Gelato-Test: GELATO_DRAFT='1' (in wrangler.toml) lässt Aufträge als Entwurf laufen. Passt alles → auf '0' + erneut deploy." -ForegroundColor Green
