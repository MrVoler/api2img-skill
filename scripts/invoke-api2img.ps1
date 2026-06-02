$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeCli = Join-Path (Split-Path -Parent $scriptDir) "bin\install.js"

if (Test-Path -LiteralPath $nodeCli) {
  node $nodeCli @args
  exit $LASTEXITCODE
}

. (Join-Path $scriptDir "load-api2img-env.ps1")

$imageGenScript = Join-Path $env:USERPROFILE ".codex\skills\.system\imagegen\scripts\image_gen.py"

python $imageGenScript @args
