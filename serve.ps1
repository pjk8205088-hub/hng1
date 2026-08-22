param([int]$Port = 8001)
$ErrorActionPreference = 'Stop'
python -m http.server $Port --directory (Join-Path $PSScriptRoot 'public')
