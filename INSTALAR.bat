@echo off
title QA Playwright Lab - Instalacao
echo ==========================================
echo   QA PLAYWRIGHT LAB - INSTALACAO
echo ==========================================
echo.
node --version || goto :node_error
npm --version || goto :node_error
npm install
if errorlevel 1 goto :error
npx playwright install chromium
if errorlevel 1 goto :error
echo.
echo Instalacao concluida.
pause
exit /b 0
:node_error
echo Node.js nao foi encontrado. Instale Node.js 20+ e tente novamente.
pause
exit /b 1
:error
echo Ocorreu um erro na instalacao. Veja as mensagens acima.
pause
exit /b 1
