param(
  [string] $BaseUrl,

  [switch] $UpdateKey,

  [switch] $Clear,

  [switch] $NoRelaunch,

  [ValidateSet("auto", "zh", "en")]
  [string] $Language = "auto"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyFile = Join-Path $scriptDir "api2img-api-key.dpapi.txt"

$keyExists = Test-Path -LiteralPath $keyFile
$shouldPromptKey = $UpdateKey -or -not $keyExists

function Resolve-Language {
  param([string] $RequestedLanguage)

  if ($RequestedLanguage -in @("zh", "en")) {
    return $RequestedLanguage
  }

  if ([System.Globalization.CultureInfo]::CurrentUICulture.Name -like "zh*") {
    return "zh"
  }

  return "en"
}

function Decode-Text {
  param([string] $Base64Text)
  [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64Text))
}

$resolvedLanguage = Resolve-Language -RequestedLanguage $Language

$messages = @{
  en = @{
    NoChanges = "No changes requested. Provide -BaseUrl, pass -UpdateKey to replace the saved API key, or pass -Clear to remove api2img configuration."
    ClearCannotCombine = "-Clear cannot be combined with -BaseUrl or -UpdateKey."
    Cleared = "api2img configuration cleared:"
    KeyCleared = "API key=<DPAPI key file removed>"
    UrlCleared = "CODEX_API2IMG_BASE_URL=<removed>"
    LegacyKeyCleared = "CODEX_API2IMG_API_KEY=<legacy user variable removed if present>"
    OpenedWindow = "api2img needs an API key. Opened a visible PowerShell window for hidden key entry."
    EnterKey = "Enter the api2img API key. Input is hidden and will be saved with Windows DPAPI for this user."
    Prompt = "API key"
    Saved = "api2img configuration saved:"
    KeySaved = "API key=<DPAPI encrypted for current Windows user>"
    KeyPreserved = "API key=<existing DPAPI key preserved>"
  }
  zh = @{
    NoChanges = (Decode-Text "5rKh5pyJ6ZyA6KaB5L+u5pS555qE6YWN572u44CC6K+35o+Q5L6bIC1CYXNlVXJs77yM5oiW5L2/55SoIC1VcGRhdGVLZXkg5pu/5o2i5bey5L+d5a2Y55qEIEFQSSBrZXnvvIzkuZ/lj6/ku6Xkvb/nlKggLUNsZWFyIOa4heepuiBhcGkyaW1nIOmFjee9ruOAgg==")
    ClearCannotCombine = (Decode-Text "LUNsZWFyIOS4jeiDveWSjCAtQmFzZVVybCDmiJYgLVVwZGF0ZUtleSDlkIzml7bkvb/nlKjjgII=")
    Cleared = (Decode-Text "YXBpMmltZyDphY3nva7lt7LmuIXnqbrvvJo=")
    KeyCleared = (Decode-Text "QVBJIGtleT085bey5Yig6ZmkIERQQVBJIGtleSDmlofku7Y+")
    UrlCleared = (Decode-Text "Q09ERVhfQVBJMklNR19CQVNFX1VSTD085bey56e76ZmkPg==")
    LegacyKeyCleared = (Decode-Text "Q09ERVhfQVBJMklNR19BUElfS0VZPTzlt7Lnp7vpmaTml6fniYjnlKjmiLflj5jph4/vvIzlpoLlrZjlnKg+")
    OpenedWindow = (Decode-Text "YXBpMmltZyDpnIDopoEgQVBJIGtleeOAguW3suaJk+W8gOS4gOS4quWPr+ingeeahCBQb3dlclNoZWxsIOeql+WPo++8jOivt+WcqOWFtuS4rei+k+WFpemakOiXj+eahCBrZXnjgII=")
    EnterKey = (Decode-Text "6K+36L6T5YWlIGFwaTJpbWcgQVBJIGtleeOAgui+k+WFpeWGheWuueS8mumakOiXj++8jOW5tuS8muS9v+eUqOW9k+WJjSBXaW5kb3dzIOeUqOaIt+eahCBEUEFQSSDliqDlr4bkv53lrZjjgII=")
    Prompt = "API key"
    Saved = (Decode-Text "YXBpMmltZyDphY3nva7lt7Lkv53lrZjvvJo=")
    KeySaved = (Decode-Text "QVBJIGtleT085bey5L2/55So5b2T5YmNIFdpbmRvd3Mg55So5oi355qEIERQQVBJIOWKoOWvhuS/neWtmD4=")
    KeyPreserved = (Decode-Text "QVBJIGtleT085L+d55WZ546w5pyJIERQQVBJIOWKoOWvhiBrZXk+")
  }
}

if ($Clear -and (-not [string]::IsNullOrWhiteSpace($BaseUrl) -or $UpdateKey)) {
  throw $messages[$resolvedLanguage].ClearCannotCombine
}

if ($Clear) {
  if (Test-Path -LiteralPath $keyFile) {
    Remove-Item -LiteralPath $keyFile -Force
  }
  [Environment]::SetEnvironmentVariable("CODEX_API2IMG_BASE_URL", $null, "User")
  [Environment]::SetEnvironmentVariable("CODEX_API2IMG_API_KEY", $null, "User")
  Remove-Item Env:\CODEX_API2IMG_BASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\CODEX_API2IMG_API_KEY -ErrorAction SilentlyContinue

  Write-Host $messages[$resolvedLanguage].Cleared
  Write-Host $messages[$resolvedLanguage].KeyCleared
  Write-Host $messages[$resolvedLanguage].UrlCleared
  Write-Host $messages[$resolvedLanguage].LegacyKeyCleared
  exit 0
}

if ([string]::IsNullOrWhiteSpace($BaseUrl) -and -not $shouldPromptKey) {
  throw $messages[$resolvedLanguage].NoChanges
}

function Quote-Argument {
  param([string] $Value)
  '"' + ($Value -replace '"', '\"') + '"'
}

if ($shouldPromptKey -and -not $NoRelaunch -and ([Console]::IsInputRedirected -or [Console]::IsOutputRedirected)) {
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-NoExit",
    "-File", (Quote-Argument $PSCommandPath),
    "-NoRelaunch",
    "-Language", $resolvedLanguage
  )

  if (-not [string]::IsNullOrWhiteSpace($BaseUrl)) {
    $arguments += @("-BaseUrl", (Quote-Argument $BaseUrl))
  }

  if ($UpdateKey) {
    $arguments += "-UpdateKey"
  }

  Start-Process powershell -ArgumentList ($arguments -join " ")
  Write-Host $messages[$resolvedLanguage].OpenedWindow
  exit 0
}

if ($shouldPromptKey) {
  Write-Host $messages[$resolvedLanguage].EnterKey
  $secureKey = Read-Host -Prompt $messages[$resolvedLanguage].Prompt -AsSecureString
  $encryptedKey = ConvertFrom-SecureString -SecureString $secureKey
  Set-Content -LiteralPath $keyFile -Value $encryptedKey -Encoding ASCII

  # Remove the legacy plaintext user variable if it exists from an older api2img setup.
  if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("CODEX_API2IMG_API_KEY", "User"))) {
    [Environment]::SetEnvironmentVariable("CODEX_API2IMG_API_KEY", $null, "User")
  }
}

if (-not [string]::IsNullOrWhiteSpace($BaseUrl)) {
  [Environment]::SetEnvironmentVariable("CODEX_API2IMG_BASE_URL", $BaseUrl.TrimEnd("/"), "User")
}

Write-Host $messages[$resolvedLanguage].Saved
if ($shouldPromptKey) {
  Write-Host $messages[$resolvedLanguage].KeySaved
} else {
  Write-Host $messages[$resolvedLanguage].KeyPreserved
}
if (-not [string]::IsNullOrWhiteSpace($BaseUrl)) {
  Write-Host "CODEX_API2IMG_BASE_URL=$($BaseUrl.TrimEnd('/'))"
}
