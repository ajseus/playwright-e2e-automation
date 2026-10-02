@echo off
chcp 65001 >nul
title QA Playwright Lab - Demonstração Completa
echo.
echo ==============================================
echo   QA PLAYWRIGHT LAB - DEMONSTRACAO COMPLETA
echo ==============================================
echo.
echo Uma unica janela maximizada sera utilizada.
echo O Playwright fara logout entre os cenarios autenticados.
echo.
call npx playwright test tests/demo-completa.spec.js
pause
