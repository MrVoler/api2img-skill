$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "load-api2img-env.ps1")

$imageGenScript = Join-Path $env:USERPROFILE ".codex\skills\.system\imagegen\scripts\image_gen.py"

if (-not (Test-Path -LiteralPath $imageGenScript)) {
  throw "Missing image generation CLI script: $imageGenScript"
}

python $imageGenScript @args
