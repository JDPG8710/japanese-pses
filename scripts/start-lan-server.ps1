param(
  [ValidateRange(1, 65535)]
  [int]$Port = 4173
)

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pythonCandidates = @()

# Windows Defender Firewall ですでに許可されている Python を優先する。
try {
  $pythonCandidates += Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction Stop |
    Where-Object { $_.DisplayName -match '^Python|python\.exe' } |
    Get-NetFirewallApplicationFilter |
    Select-Object -ExpandProperty Program -Unique
} catch {
  # 管理権限がなくても通常の Python 検出へ進む。
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCommand) { $pythonCandidates += $pythonCommand.Source }
$pythonPath = $pythonCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $pythonPath) { throw 'Python が見つかりません。Python 3 をインストールしてから再実行してください。' }

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) { throw "ポート $Port はすでに使用中です。既存サーバーを終了してから再実行してください。" }

$lanAddresses = Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress -Unique

Write-Host "Japanese PSES LAN サーバーを 0.0.0.0:$Port で起動します。"
Write-Host "このPC: http://127.0.0.1:$Port/"
foreach ($address in $lanAddresses) { Write-Host "同じLANの端末: http://${address}:$Port/" }
Write-Host '終了するには Ctrl+C を押してください。'

Push-Location -LiteralPath $projectRoot
try {
  & $pythonPath -m http.server $Port --bind 0.0.0.0
} finally {
  Pop-Location
}
