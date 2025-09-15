@echo off
setlocal
REM Build concatenated CSS into dist\app.css
if not exist dist mkdir dist

> dist\app.css echo /* build: dist/app.css */

echo /* === styles.css === */>>dist\app.css
type styles.css>>dist\app.css

echo.>>dist\app.css & echo /* === css/theme.css === */>>dist\app.css & type css\theme.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/layout.css === */>>dist\app.css & type css\components\layout.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/header.css === */>>dist\app.css & type css\components\header.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/forms.css === */>>dist\app.css & type css\components\forms.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/density.css === */>>dist\app.css & type css\components\density.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/units.css === */>>dist\app.css & type css\components\units.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/help.css === */>>dist\app.css & type css\components\help.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/feed-prices.css === */>>dist\app.css & type css\components\feed-prices.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/alt-feed.css === */>>dist\app.css & type css\components\alt-feed.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/results.css === */>>dist\app.css & type css\components\results.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/results-clean.css === */>>dist\app.css & type css\components\results-clean.css>>dist\app.css
echo.>>dist\app.css & echo /* === css/components/ads.css === */>>dist\app.css & type css\components\ads.css>>dist\app.css

echo Built dist\app.css ^(✔^) 
pause
