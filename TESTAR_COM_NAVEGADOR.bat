@echo off
chcp 65001 >nul
title QA Playwright Lab - Teste Visual
echo.
echo ==============================================
echo   QA PLAYWRIGHT LAB - TESTE VISUAL
 echo ==============================================
echo.
echo Navegador maximizado + execucao lenta + uma unica janela.
echo.
call npx playwright test tests/demo-completa.spec.js
pause
