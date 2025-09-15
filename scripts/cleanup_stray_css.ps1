$rootFiles = @(
  "ads.css","alt-feed.css","density.css","feed-prices.css","forms.css",
  "header.css","help.css","layout.css","metric-bands.css","results-clean.css",
  "results.css","results-fun.css","units.css","theme.css","app.css"
)
foreach ($f in $rootFiles) {
  $root = Join-Path $PWD $f
  $comp = Join-Path $PWD "css\components\$f"
  $theme = Join-Path $PWD "css\theme.css"
  if (Test-Path $root) {
    if ($f -eq "theme.css") {
      if (Test-Path $theme) { Remove-Item $root -Force }
    } elseif ($f -eq "app.css") {
      Remove-Item $root -Force
    } elseif (Test-Path $comp) {
      Remove-Item $root -Force
    }
  }
}
Write-Host "Stray CSS cleaned."
