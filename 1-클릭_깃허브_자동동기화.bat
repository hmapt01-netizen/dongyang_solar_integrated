@echo off
setlocal
title Dongyang Solar - GitHub Auto Sync
echo ==========================================================
echo   Dongyang Solar Hybrid PV - GitHub Auto Push
echo ==========================================================
echo.

set "PATH=C:\Users\lim\AppData\Local\Programs\Git\cmd;C:\Users\lim\AppData\Local\Programs\Git\bin;%PATH%"

echo [1/3] Staging all files (git add .)...
git add .

echo.
echo [2/3] Creating commit (git commit)...
git commit -m "update: auto sync"

echo.
echo [3/3] Pushing to GitHub (git push -u origin main)...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ==========================================================
    echo   SUCCESS: GitHub Sync Completed Successfully!
    echo ==========================================================
) else (
    echo ==========================================================
    echo   NOTICE: Check the message above for authentication.
    echo ==========================================================
)
echo.
pause