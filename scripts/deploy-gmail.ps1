<#
============================================================================
  RENTLOG · Despliegue de la conexión Gmail REAL (puente "Conecta tu correo")
  --------------------------------------------------------------------------
  Deja el back-end listo en un solo paso. Hace TODO lo que falta:
    1) Aplica supabase/schema-gmail.sql          (Management API)
    2) Fija los 3 secrets en Supabase            (GOOGLE_CLIENT_ID / _SECRET / GMAIL_ENC_KEY)
    3) Despliega gmail-sync y gmail-oauth-callback (esta ultima --no-verify-jwt)
    4) Anade VITE_GOOGLE_CLIENT_ID a .env

  USO (desde la raiz del proyecto):
    .\scripts\deploy-gmail.ps1 -GoogleClientId "xxx.apps.googleusercontent.com" `
                               -GoogleClientSecret "GOCSPX-xxx" `
                               -SupabaseAccessToken "sbp_xxx"

  De donde sale cada valor:
    - GoogleClientId / GoogleClientSecret : Google Cloud Console -> Credenciales
      -> ID de cliente OAuth (tipo Aplicacion web). Redirect URI ya fijada:
      https://YOUR-PROJECT-REF.supabase.co/functions/v1/gmail-oauth-callback
    - SupabaseAccessToken : https://supabase.com/dashboard/account/tokens
      -> "Generate new token" (empieza por sbp_). Solo se usa aqui, no se guarda.

  Tras ejecutarlo con exito, el unico paso extra es redeploy web con la nueva
  var de entorno: en Vercel anade VITE_GOOGLE_CLIENT_ID y `npx vercel --prod`.
============================================================================
#>
param(
  [Parameter(Mandatory=$true)][string]$GoogleClientId,
  [Parameter(Mandatory=$true)][string]$GoogleClientSecret,
  [Parameter(Mandatory=$true)][string]$SupabaseAccessToken
)

$ErrorActionPreference = 'Stop'
$ProjectRef = 'YOUR-PROJECT-REF'
# Clave AES-256 con la que se cifran los refresh tokens de Gmail en la base de
# datos. Se toma de GMAIL_ENC_KEY, y si no existe se genera una nueva. Guardala
# en un gestor de secretos: si cambia, los tokens ya cifrados no se recuperan.
$GmailEncKey = if ($env:GMAIL_ENC_KEY) { $env:GMAIL_ENC_KEY } else {
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
}

$Root = Split-Path -Parent $PSScriptRoot
Write-Host "== Rentlog · deploy Gmail ==" -ForegroundColor Cyan

# --- 1) Aplicar schema-gmail.sql via Management API -------------------------
Write-Host "`n[1/4] Aplicando schema-gmail.sql..." -ForegroundColor Yellow
$sql = Get-Content -Raw (Join-Path $Root 'supabase\schema-gmail.sql')
$body = @{ query = $sql } | ConvertTo-Json -Compress
$resp = Invoke-RestMethod -Method Post `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
  -Headers @{ Authorization = "Bearer $SupabaseAccessToken"; 'Content-Type' = 'application/json' } `
  -Body $body
Write-Host "      schema aplicado OK." -ForegroundColor Green

# --- 2) Fijar secrets (via env-file para no romper con +,/,= del base64) ----
Write-Host "`n[2/4] Fijando secrets en Supabase..." -ForegroundColor Yellow
$env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken
$secretsFile = Join-Path $env:TEMP "rentlog-gmail-secrets.env"
@(
  "GOOGLE_CLIENT_ID=$GoogleClientId",
  "GOOGLE_CLIENT_SECRET=$GoogleClientSecret",
  "GMAIL_ENC_KEY=$GmailEncKey"
) | Set-Content -Path $secretsFile -Encoding utf8
try {
  & npx supabase secrets set --env-file $secretsFile --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw "supabase secrets set fallo (exit $LASTEXITCODE)" }
  Write-Host "      secrets fijados OK." -ForegroundColor Green
} finally {
  Remove-Item $secretsFile -ErrorAction SilentlyContinue
}

# --- 3) Desplegar las dos Edge Functions -----------------------------------
Write-Host "`n[3/4] Desplegando Edge Functions..." -ForegroundColor Yellow
& npx supabase functions deploy gmail-sync --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw "deploy gmail-sync fallo (exit $LASTEXITCODE)" }
& npx supabase functions deploy gmail-oauth-callback --no-verify-jwt --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw "deploy gmail-oauth-callback fallo (exit $LASTEXITCODE)" }
Write-Host "      funciones desplegadas OK." -ForegroundColor Green

# --- 4) Anadir VITE_GOOGLE_CLIENT_ID a .env local --------------------------
Write-Host "`n[4/4] Actualizando .env local..." -ForegroundColor Yellow
$envPath = Join-Path $Root '.env'
$envText = Get-Content -Raw $envPath
if ($envText -match 'VITE_GOOGLE_CLIENT_ID=') {
  $envText = [regex]::Replace($envText, 'VITE_GOOGLE_CLIENT_ID=.*', "VITE_GOOGLE_CLIENT_ID=$GoogleClientId")
  Set-Content -Path $envPath -Value $envText -Encoding utf8 -NoNewline
} else {
  Add-Content -Path $envPath -Value "VITE_GOOGLE_CLIENT_ID=$GoogleClientId" -Encoding utf8
}
Write-Host "      .env actualizado OK." -ForegroundColor Green

Write-Host "`n== LISTO ==" -ForegroundColor Cyan
Write-Host "Falta solo el redeploy web con la nueva variable:" -ForegroundColor White
Write-Host "  1) Vercel -> Project -> Settings -> Environment Variables -> anade:" -ForegroundColor Gray
Write-Host "     VITE_GOOGLE_CLIENT_ID = $GoogleClientId" -ForegroundColor Gray
Write-Host "  2) npx vercel --prod" -ForegroundColor Gray
Write-Host "`nLuego: entra en la app, Reservas -> Conecta tu correo -> Conectar Gmail." -ForegroundColor White
Write-Host "Recuerda: en modo Testing de Google, solo los correos anadidos como" -ForegroundColor White
Write-Host "'usuarios de prueba' podran conectar." -ForegroundColor White
