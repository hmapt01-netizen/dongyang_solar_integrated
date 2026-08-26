@echo off
chcp 65001 > nul
title 동양연합 태양광 관제 - 깃허브 자동 업로드
echo ==========================================================
echo   동양연합 영농형 태양광 관제 플랫폼 - GitHub 자동 동기화
echo ==========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0sync_github.ps1"
echo.
pause
