@echo off
setlocal
chcp 65001 > nul
title 동양연합 영농형 태양광 - GitHub 자동 동기화

echo ==========================================================
echo   동양연합 영농형 태양광 관제 플랫폼 - GitHub 자동 동기화
echo ==========================================================
echo.

set "PATH=C:\Users\lim\AppData\Local\Programs\Git\cmd;C:\Users\lim\AppData\Local\Programs\Git\bin;%PATH%"

echo [1/3] 변경된 파일들을 수집하고 있습니다...
git add .

echo.
echo [2/3] 커밋을 생성하고 있습니다...
git commit -m "update: 관제 플랫폼 및 규격서 자동 동기화"

echo.
echo [3/3] 깃허브(GitHub)로 업로드(Push)를 진행합니다...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ==========================================================
    echo   GitHub 동기화가 성공적으로 완료되었습니다!
    echo ==========================================================
) else (
    echo ==========================================================
    echo   오류가 발생했습니다.
    echo ==========================================================
)
echo.
pause