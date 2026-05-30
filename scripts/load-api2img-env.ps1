# Loads api2img credentials for this PowerShell process only.
# The API key is stored as a DPAPI-encrypted file for the current Windows user.
# The base URL is stored in the dedicated CODEX_API2IMG_BASE_URL variable.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyFile = Join-Path $scriptDir "api2img-api-key.dpapi.txt"

$apiKey = $null
if (Test-Path -LiteralPath $keyFile) {
  $encryptedKey = (Get-Content -Raw -LiteralPath $keyFile).Trim()
  $secureKey = ConvertTo-SecureString -String $encryptedKey
  $credential = [System.Management.Automation.PSCredential]::new("api2img", $secureKey)
  $apiKey = $credential.GetNetworkCredential().Password
}

$baseUrl = [Environment]::GetEnvironmentVariable("CODEX_API2IMG_BASE_URL", "Process")
if ([string]::IsNullOrWhiteSpace($baseUrl)) {
  $baseUrl = [Environment]::GetEnvironmentVariable("CODEX_API2IMG_BASE_URL", "User")
}

$missing = @()
if ([string]::IsNullOrWhiteSpace($apiKey)) { $missing += "DPAPI encrypted API key" }
if ([string]::IsNullOrWhiteSpace($baseUrl)) { $missing += "CODEX_API2IMG_BASE_URL" }

if ($missing.Count -gt 0) {
  $configure = Join-Path $scriptDir "configure-api2img.ps1"
  throw @"
api2img is not configured. Missing: $($missing -join ', ')

Ask the user for the base URL, then have them enter the image API key only through the hidden terminal prompt:
powershell -NoProfile -ExecutionPolicy Bypass -File "$configure" -BaseUrl "<url>"

The key is entered interactively and saved with Windows DPAPI for the current user. The URL is saved only to CODEX_API2IMG_BASE_URL. This does not modify OPENAI_API_KEY or OPENAI_BASE_URL.
"@
}

$env:OPENAI_API_KEY = $apiKey
$env:OPENAI_BASE_URL = $baseUrl.TrimEnd("/")

Write-Host "api2img environment loaded for this PowerShell process only."
Write-Host "CODEX_API2IMG_BASE_URL=$env:OPENAI_BASE_URL"
