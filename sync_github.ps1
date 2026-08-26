# --------------------------------------------------------------------------
# 동양연합 영농형 태양광 프로젝트 - 깃허브(GitHub) 1-클릭 자동 업로드 스크립트
# --------------------------------------------------------------------------
$ErrorActionPreference = "Stop"
$env:Path = "C:\Users\lim\AppData\Local\Programs\Git\cmd;C:\Users\lim\AppData\Local\Programs\Git\bin;" + $env:Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  동양연합 영농형 태양광 관제 플랫폼 - GitHub 자동 동기화  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. 깃 저장소 확인
if (!(Test-Path ".git")) {
    Write-Host "[1/4] Git 저장소 초기화 중..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# 2. Remote URL 확인
$remoteUrl = git remote get-url origin 2>$null
if (!$remoteUrl) {
    Write-Host ""
    Write-Host "⚠️  아직 연동된 깃허브(GitHub) 저장소 주소가 없습니다." -ForegroundColor Yellow
    Write-Host "GitHub에서 생성하신 저장소 주소(URL)를 입력해 주세요." -ForegroundColor White
    Write-Host "예시: https://github.com/사용자아이디/저장소이름.git" -ForegroundColor Gray
    Write-Host ""
    $inputUrl = Read-Host "GitHub 저장소 URL 입력"
    if ([string]::IsNullOrWhiteSpace($inputUrl)) {
        Write-Host "❌ URL이 입력되지 않아 동기화를 취소합니다." -ForegroundColor Red
        Exit 1
    }
    git remote add origin $inputUrl.Trim()
    Write-Host "✅ 원격 저장소(origin) 등록 완료: $inputUrl" -ForegroundColor Green
} else {
    Write-Host "[1/4] 연결된 GitHub 저장소: $remoteUrl" -ForegroundColor Green
}

# 3. 변경 사항 스테이징
Write-Host "[2/4] 변경된 모든 파일 수집 중 (git add .)..." -ForegroundColor Yellow
git add .

# 4. 커밋 생성
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$status = git status --porcelain
if ($status) {
    Write-Host "[3/4] 변경 내용 커밋 생성 중..." -ForegroundColor Yellow
    git commit -m "update: $timestamp 관제 플랫폼 및 규격서 자동 동기화"
} else {
    Write-Host "[3/4] 새롭게 변경된 파일이 없습니다 (최신 상태)." -ForegroundColor Cyan
}

# 5. 깃허브 푸시
Write-Host "[4/4] 깃허브(GitHub)로 업로드(Push) 전송 중..." -ForegroundColor Yellow
try {
    git push -u origin main
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " 🎉 GitHub 동기화가 성공적으로 완료되었습니다! ($timestamp) " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "⚠️ 푸시 중 오류가 발생했습니다. (GitHub 로그인/토큰 또는 권한 확인 필요)" -ForegroundColor Red
    Write-Host "에러 상세: $_" -ForegroundColor Red
}

