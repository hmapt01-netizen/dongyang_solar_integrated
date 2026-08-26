# 📘 [문서 01] 동양연합 영농형 태양광 관제 플랫폼 - 백엔드 API 연동 규격서

> **문서 버전**: v2.0 (2026.08.24)  
> **시스템명**: 동양연합 영농형 태양광 통합 관제 플랫폼  
> **대상 독자**: 백엔드 개발자, 데이터 엔지니어, SI 연동 담당자

---

## 📑 목차 (Table of Contents)

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [사용자 인증 및 권한(RBAC) 체계](#2-사용자-인증-및-권한rbac-체계)
3. [REST API 엔드포인트 상세 규격](#3-rest-api-엔드포인트-상세-규격)
   - [API 1. 발전소 기본 목록 조회 (`GET /plants`)](#api-1-발전소-기본-목록-조회)
   - [API 2. 발전소 실시간 계측 및 환경 센서 데이터 (`GET /plants/{id}/realtime`)](#api-2-발전소-실시간-계측-및-환경-센서-데이터)
   - [API 3. 시계열 발전량 차트 데이터 (`GET /plants/{id}/charts`)](#api-3-시계열-발전량-차트-데이터)
   - [API 4. 이상징후 및 법령 준수 검토 (`GET /plants/{id}/risk-center`)](#api-4-이상징후-및-법령-준수-검토)
   - [API 5. AI CCTV 영상 증빙 데이터 (`GET /plants/{id}/video-evidence`)](#api-5-ai-cctv-영상-증빙-데이터)
   - [API 6. 사업장 상세 및 영농 이행 이력 (`GET /plants/{id}/agri-detail`)](#api-6-사업장-상세-및-영농-이행-이력)
   - [API 7. 행정 조치 명령 전송 (`POST /actions/request-photo`, `POST /actions/schedule-inspection`)](#api-7-행정-조치-명령-전송)
4. [프론트엔드 연동 포인트 (`js/app.js`)](#4-프론트엔드-연동-포인트)
5. [백엔드 샘플 구현 예제 (Python FastAPI / Node.js Express)](#5-백엔드-샘플-구현-예제)

---

## 1. 시스템 아키텍처 개요

본 플랫폼은 **태양광 발전 O&M 관제**와 **지자체 영농 이행(농지법 준수) 행정 관제**가 하나로 통합된 차세대 하이브리드 관제 시스템입니다.

```
┌───────────────────────────┐      ┌───────────────────────────┐
│ 현장 태양광 인버터 / RTU  │      │   지능형 AI CCTV 카메라   │
│ (전압, 전류, 전력, 발전량)│      │ (작업자, 농기계, 작물 탐지)│
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │ Modbus-TCP / MQTT                │ RTSP / ONVIF
              ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│                   백엔드 서버 & 수집 데이터베이스             │
│            (Node.js / Python FastAPI / Spring Boot)          │
└──────────────────────────────┬───────────────────────────────┘
                               │ REST API (JSON over HTTPS)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│         동양연합 프론트엔드 엔진 (DongyangApp & RassiCharts)   │
│   - 온실가스(0.4781 kgCO2/kWh) 및 SMP/REC 금융 자동 연산 엔진 │
│   - 5개 발전소 실시간 동기화 & 지자체 행정 보고서 원클릭 PDF 출력 │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 사용자 인증 및 권한(RBAC) 체계

로그인 시 백엔드는 사용자 정보와 함께 `JWT Token` 및 `role`을 반환합니다:

| 역할 (Role) | 대상 사용자 | 조회 가능 발전소 | 접근 가능 메뉴 |
| :--- | :--- | :--- | :--- |
| **`owner12139`** | 온누리3,4 발전사업자 | [12139] 온누리3,4 (단일) | 대시보드, 설비, 달력, 보고서, 영농정보 |
| **`owner12138`** | 온누리1,2 발전사업자 | [12138] 온누리1,2 (단일) | 대시보드, 설비, 달력, 보고서, 영농정보 |
| **`official`** | 지자체 농정 감독관 | 5개 사업장 전체 | 영농 종합관제, 사업장상세, 이상징후, CCTV증빙, 이행리포트, 현장점검 |
| **`admin`** | 동양연합 최고 관리자 | 5개 사업장 전체 | **전체 14개 메뉴 풀액세스 (발전 성능 + 영농 행정 풀관제)** |

* **인증 헤더 규격**:  
  모든 API 요청 시 `Authorization: Bearer <JWT_ACCESS_TOKEN>` 헤더를 포함해야 합니다.

---

## 3. REST API 엔드포인트 상세 규격

### API 1. 발전소 기본 목록 조회
* **Endpoint**: `GET /api/v1/plants`
* **Response (JSON)**:
```json
{
  "success": true,
  "data": [
    { "id": "12139", "name": "[12139][원주] 온누리3,4 (200kW)", "capacityKw": 200, "lat": 37.3422, "lng": 127.9201, "status": "watch" },
    { "id": "12138", "name": "[12138][원주] 온누리1,2 (200kW)", "capacityKw": 200, "lat": 37.3380, "lng": 127.9150, "status": "normal" },
    { "id": "12140", "name": "[12140][원주] 온누리5,6 (300kW)", "capacityKw": 300, "lat": 37.3850, "lng": 127.9950, "status": "watch" },
    { "id": "12141", "name": "[12141][횡성] 청정영농형1호 (500kW)", "capacityKw": 500, "lat": 37.4917, "lng": 127.9846, "status": "normal" },
    { "id": "12142", "name": "[12142][춘천] 소양강 영농태양광 (150kW)", "capacityKw": 150, "lat": 37.8813, "lng": 127.6521, "status": "normal" }
  ]
}
```

---

### API 2. 발전소 실시간 계측 및 환경 센서 데이터 (`MRT_DB` 매핑)
* **Endpoint**: `GET /api/v1/plants/{plantId}/realtime`
* **Response (JSON)**:
```json
{
  "success": true,
  "data": {
    "plantId": "12139",
    "name": "[원주] 온누리3,4 (200kW)",
    "capacityKw": 200,
    "currentPowerKw": 13.7,
    "todayGenKwh": 348,
    "todayGenHours": 1.74,
    "targetGenKwh": 410,
    "yesterdayGenKwh": 410,
    "monthlyGenKwh": "14,953 kWh",
    "addPowerMwh": "102.4",
    "weather": {
      "cond": "☀️ 맑음",
      "temp": "28.2°C",
      "humidity": "55 %",
      "windSpeed": "1.8 m/s",
      "windDir": "남서풍 (SW)",
      "rainfall": "0.0 mm",
      "inclinedIrr": "854 W/m²",
      "horizontalIrr": "812 W/m²",
      "uvIndex": "5.4 (보통)",
      "lightLux": "68,400 Lux"
    },
    "aiDiagnostics": {
      "subject": "인버터-2 DC 입력 전압 미세 강하 감지",
      "desc": "인버터-2 DC 전압이 613V로 정상 대비 -2.5% 출현. 스트링 3번 접속반 모듈 표면 세척 권장."
    },
    "inverters": [
      {
        "id": 1,
        "seq": 869,
        "name": "인버터 #1",
        "powerKw": 9.6,
        "runHours": 1.3,
        "todayGenKwh": 78,
        "addPowerMwh": 102.4,
        "state": "가동",
        "comm": "17:15:09",
        "dcV": 624.5,
        "dcA": 15.4,
        "gridRS": 382.5,
        "gridST": 382.1,
        "gridTR": 382.8,
        "gridR": 14.5,
        "gridS": 14.4,
        "gridT": 14.5,
        "freq": 60.0,
        "factor": 99.9,
        "temp": 42.1,
        "mppt": [
          { "ch": 1, "volt": 624.5, "curr": 3.85, "power": 2.40 },
          { "ch": 2, "volt": 624.0, "curr": 3.85, "power": 2.40 },
          { "ch": 3, "volt": 625.0, "curr": 3.85, "power": 2.41 },
          { "ch": 4, "volt": 624.5, "curr": 3.85, "power": 2.40 }
        ]
      },
      {
        "id": 2,
        "seq": 870,
        "name": "인버터 #2",
        "powerKw": 8.3,
        "runHours": 1.1,
        "todayGenKwh": 67,
        "addPowerMwh": 98.2,
        "state": "가동",
        "comm": "17:15:10",
        "dcV": 613.0,
        "dcA": 13.5,
        "gridRS": 381.8,
        "gridST": 381.9,
        "gridTR": 382.0,
        "gridR": 12.5,
        "gridS": 12.6,
        "gridT": 12.5,
        "freq": 60.0,
        "factor": 99.8,
        "temp": 44.5,
        "mppt": [
          { "ch": 1, "volt": 613.0, "curr": 3.38, "power": 2.07 },
          { "ch": 2, "volt": 613.2, "curr": 3.37, "power": 2.07 },
          { "ch": 3, "volt": 612.8, "curr": 3.38, "power": 2.07 },
          { "ch": 4, "volt": 613.0, "curr": 3.37, "power": 2.07 }
        ]
      }
    ]
  }
}
```

---

### API 3. 시계열 발전량 차트 데이터
* **Endpoint**: `GET /api/v1/plants/{plantId}/charts`
* **Response (JSON)**:
```json
{
  "success": true,
  "data": {
    "hourlyLabels": ["06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h"],
    "hourlyActual": [0, 15, 65, 110, 75, 26, 0, 0],
    "hourlyPredict": [0, 20, 75, 130, 95, 40, 5, 0],
    "monthlyTrend": [510, 680, 550, 320, 710, 650, 490, 580, 610, 390, 750, 690, 520, 480, 640, 720, 590, 310, 670, 740, 291]
  }
}
```

---

### API 4. 이상징후 및 법령 준수 검토
* **Endpoint**: `GET /api/v1/plants/{plantId}/risk-center`
* **Response (JSON)**:
```json
{
  "success": true,
  "data": {
    "plantId": "12139",
    "siteName": "[원주] 온누리3,4",
    "status": "관찰 대상",
    "cards": [
      { "title": "장기 무활동", "desc": "연속 무활동 4일 감지 (허용 14일 이내 관리 중).", "badge": "정상 (4일)", "badgeClass": "badge-success" },
      { "title": "작물 불일치", "desc": "신고작물(콩)과 영상 탐지 작물 94% 일치.", "badge": "일치 (우수)", "badgeClass": "badge-success" },
      { "title": "미경작구역 증가", "desc": "북측 경계부 미경작 의심구역 2.1% 증가.", "badge": "관찰 (+2.1%)", "badgeClass": "badge-warning" },
      { "title": "차량 장기주차", "desc": "농기계 출입로 일시 주차 외 특이사항 없음.", "badge": "미탐지", "badgeClass": "badge-success" },
      { "title": "자재·폐기물 적치", "desc": "농자재 정리 상태 양호, 불법 폐기물 미탐지.", "badge": "미탐지", "badgeClass": "badge-success" },
      { "title": "카메라 장애", "desc": "카메라 4대 신호 수신 가동률 100%.", "badge": "양호 (정상)", "badgeClass": "badge-success" }
    ],
    "compliance": [
      { "item": "영농의무", "evidence": "영농 이벤트 27건 탐지 (경운·파종·제초)", "aiResult": "이행", "decision": "인정", "badgeClass": "badge-success" },
      { "item": "적합작물 재배의무", "evidence": "신고작물 콩 / 영상확인 콩 (일치율 94%)", "aiResult": "일치", "decision": "인정", "badgeClass": "badge-success" },
      { "item": "농지 타용도 사용금지", "evidence": "장기주차·적치 미탐지 (북측 2.1% 관찰)", "aiResult": "관찰 권고", "decision": "보류 (관찰)", "badgeClass": "badge-warning" },
      { "item": "발전설비 영농방해", "evidence": "작업동선 및 트랙터 접근성 확보", "aiResult": "이상 없음", "decision": "인정", "badgeClass": "badge-success" }
    ]
  }
}
```

---

### API 5. AI CCTV 영상 증빙 데이터
* **Endpoint**: `GET /api/v1/plants/{plantId}/video-evidence`
* **Response (JSON)**:
```json
{
  "success": true,
  "data": {
    "siteName": "[원주] 온누리3,4",
    "camList": [
      { "id": "CAM01", "name": "CAM 01 (서측 진입로 & 1구역)", "status": "LIVE 1080P", "aiTag": "🤖 AI 경운 작업 감지", "crop": "작물: 콩", "time": "2027-04-10 14:22:05" },
      { "id": "CAM02", "name": "CAM 02 (중앙 관수 & 2구역)", "status": "LIVE 1080P", "aiTag": "🤖 AI 관수 분사 탐지", "crop": "작물: 콩", "time": "2027-04-10 14:22:05" },
      { "id": "CAM03", "name": "CAM 03 (동측 생육 관측구)", "status": "LIVE 1080P", "aiTag": "🤖 AI 정상 생장 판독", "crop": "초장: 24cm", "time": "2027-04-10 14:22:05" },
      { "id": "CAM04", "name": "CAM 04 (북측 경계 & 농기계 통로)", "status": "LIVE 1080P", "aiTag": "⚠️ 미경작 의심 구역", "crop": "면적: 2.1%", "time": "2027-04-10 14:22:05" }
    ]
  }
}
```

---

### API 6. 사업장 상세 및 영농 이행 이력
* **Endpoint**: `GET /api/v1/plants/{plantId}/agri-detail`
* **Response (JSON)**:
```json
{
  "success": true,
  "data": {
    "siteId": "12139",
    "name": "[12139][원주] 온누리3,4 (200kW)",
    "complianceScore": 85,
    "cropMatch": true,
    "permitCrop": "콩",
    "aiCrop": "콩 (일치)",
    "areaRatio": 85,
    "eventsCount": 27,
    "inactiveDays": 4,
    "permitArea": 4000,
    "actualArea": 3400,
    "timeline": [
      { "date": "2027-04-15", "title": "🚜 트랙터 경운 및 정지 작업", "cam": "CAM01", "confidence": "98%", "review": "인정" },
      { "date": "2027-04-08", "title": "🌱 콩 파종 및 이랑 성형", "cam": "CAM02", "confidence": "95%", "review": "인정" },
      { "date": "2027-03-28", "title": "💧 기비 시비 및 토양 개량", "cam": "CAM01", "confidence": "92%", "review": "인정" }
    ]
  }
}
```

---

### API 7. 행정 조치 명령 전송
* **사진 제출 요청**: `POST /api/v1/actions/request-photo`
  - Body: `{ "plantId": "12139", "targetZone": "북측 경계부", "dueDate": "2027-04-30" }`
* **현장점검 배정**: `POST /api/v1/actions/schedule-inspection`
  - Body: `{ "plantId": "12139", "inspector": "김영호 주무관", "scheduledDate": "2027-05-02" }`

---

## 4. 프론트엔드 연동 포인트

프론트엔드(`js/app.js`)는 백엔드 API를 다음과 같이 호출하도록 연동되어 있습니다:

```javascript
// 발전소 실시간 데이터 수신 및 화면 자동 갱신
async function loadPlantRealtimeData(plantId) {
  const res = await fetch(`/api/v1/plants/${plantId}/realtime`, {
    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
  });
  const json = await res.json();
  if (json.success) {
    RASSI_DATA.plants[plantId] = json.data;
    DongyangApp.switchPlant(plantId); // 전체 UI 및 금융 계산 자동 갱신
  }
}
```

---

## 5. 백엔드 샘플 구현 예제 (Python FastAPI)

```python
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel

app = FastAPI(title="동양연합 영농형 태양광 관제 API", version="2.0")

@app.get("/api/v1/plants/{plant_id}/realtime")
def get_plant_realtime(plant_id: str):
    # MRT_DB에서 데이터 조회 후 반환
    return {
        "success": True,
        "data": {
            "plantId": plant_id,
            "todayGenKwh": 348,
            "currentPowerKw": 13.7,
            "addPowerMwh": 102.4
        }
    }
```