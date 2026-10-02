@echo off
chcp 65001 >nul
title QA Playwright Lab - Regressao
echo.
echo ==============================================
echo   QA PLAYWRIGHT LAB - REGRESSAO PROFISSIONAL
echo ==============================================
echo.
echo Executando as suites independentes, sem a demo encadeada.
echo.
call npx playwright test --grep-invert @demo
pause
