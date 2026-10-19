param([int]$Port = 8000, [string]$SerialPort = '', [switch]$NoBrowser, [switch]$LaptopOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$localPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $localPython)) {
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3 -m venv .venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv .venv }
    else { throw 'Install Python 3.11+ from python.org and enable Add to PATH, then retry.' }
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the project virtual environment.' }
}
$requirementsHash = (Get-FileHash -LiteralPath requirements.txt -Algorithm SHA256).Hash
$stamp = Join-Path $PSScriptRoot '.venv\civixflow-hardware-requirements.txt'
if (-not (Test-Path -LiteralPath $stamp) -or (Get-Content -LiteralPath $stamp -Raw).Trim() -ne $requirementsHash) {
    & $localPython -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check the connection and retry.' }
    Set-Content -LiteralPath $stamp -Value $requirementsHash
}
$launchArgs = @('run.py','--port',$Port)
if ($SerialPort) { $launchArgs += @('--serial-port',$SerialPort) }
if ($NoBrowser) { $launchArgs += '--no-browser' }
if ($LaptopOnly) { $launchArgs += @('--host','127.0.0.1') }
& $localPython @launchArgs
exit $LASTEXITCODE
