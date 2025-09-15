param(
  [string]$Path = 'index.html'
)

$ErrorActionPreference = 'Stop'
$c = Get-Content -Raw -LiteralPath $Path

# Target common mojibake sequences observed in this repo
$c = $c.Replace('�?"','—')
$c = $c.Replace('�?~','''')
$c = $c.Replace('�?T','''')
$c = $c.Replace('�Y?" ','')
$c = $c.Replace('Your flock�?Ts','Your flock''s')
$c = $c.Replace('Ad (320�50)','Ad (320×50)')
$c = $c.Replace('More details �-�','More details')
$c = $c.Replace('FCR Calculator �?" Poultry Feed Conversion Ratio','FCR Calculator — Poultry Feed Conversion Ratio')

Set-Content -LiteralPath $Path -Value $c -Encoding utf8 -NoNewline

