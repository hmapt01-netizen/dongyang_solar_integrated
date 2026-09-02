/* ==========================================================================
   동양연합 영농형 태양광 통합 관제 플랫폼 - 통합 데이터 스토어
   (발전량 데이터 + AI 영농이행 데이터 + 사용자 권한계정 스토어)
   ========================================================================== */

// 1. 사용자 권한 계정 스토어 (RBAC Permission Store)
const USER_ACCOUNTS = {
  "owner12139": {
    username: "owner12139",
    name: "김진성 (원주 온누리3,4 발전사업자)",
    role: "owner",
    plantId: "12139",
    plantName: "[12139][원주] 온누리3,4 (200kW)",
    desc: "원주 온누리3,4 소유 발전사업자 (본인 발전소 전용 조회 권한)"
  },
  "owner12138": {
    username: "owner12138",
    name: "박철수 (원주 온누리1,2 발전사업자)",
    role: "owner",
    plantId: "12138",
    plantName: "[12138][원주] 온누리1,2 (200kW)",
    desc: "원주 온누리1,2 소유 발전사업자 (본인 발전소 전용 조회 권한)"
  },
  "official": {
    username: "official",
    name: "강원특별자치도 / 원주시 영농형 태양광 감독관",
    role: "official",
    plantId: "all",
    plantName: "🌐 [전체 사업장] 통합 관제 (5개 발전소)",
    desc: "지자체 영농 이행 행정 관리자 (AI CCTV & 지적 지도 관제 전용)"
  },
  "admin": {
    username: "admin",
    name: "K 에너지 솔루션 O&M 최고 시스템 관리자",
    role: "admin",
    plantId: "all",
    plantName: "🌐 [전체 사업장] 통합 관제",
    desc: "전체 시스템 통합 관리자 (발전 성능 & 영농이행 풀 관제)"
  }
};

// 1.5. 금융 및 정산 산정 기준 설정 (KPX 전력거래소 SMP & 에너지공단 REC 표준 단가)
const FINANCIAL_CONFIG = {
  smpUnitPrice: 131.0,         // SMP 단가 (원/kWh)
  recUnitPrice: 71800,        // REC 단가 (원/REC)
  agriPvWeight: 1.2,          // 영농형 태양광 REC 가중치
  co2FactorKgPerKwh: 0.4781,  // 온실가스 배출계수 (kgCO2/kWh)
  treeFactorPerKwh: 0.072     // 소나무 식재 환산계수 (그루/kWh)
};

// 실시간 발전량 기반 금융/환경 자동 산출 함수
function computePlantFinancials(plant, config = FINANCIAL_CONFIG) {
  const genKwh = plant.todayGenKwh || 0;
  const monthlyKwh = parseFloat(String(plant.monthlyGenKwh || '0').replace(/[^0-9.]/g, '')) || (genKwh * 30);
  const totalMwh = parseFloat(String(plant.addPowerMwh || '0').replace(/[^0-9.]/g, '')) || (monthlyKwh * 12 / 1000);

  // 1. 당일 수익 산출
  const todaySmpWon = Math.round(genKwh * config.smpUnitPrice);
  const todayRecWon = Math.round((genKwh / 1000) * config.agriPvWeight * config.recUnitPrice);
  const todayTotalWon = todaySmpWon + todayRecWon;
  const todayRevenueMan = (todayTotalWon / 10000).toFixed(1);

  // 2. 월간 수익 산출
  const monthlySmpMan = (monthlyKwh * config.smpUnitPrice / 10000).toFixed(1);
  const monthlyRecMan = ((monthlyKwh / 1000) * config.agriPvWeight * config.recUnitPrice / 10000).toFixed(1);
  const monthlyTotalMan = (parseFloat(monthlySmpMan) + parseFloat(monthlyRecMan)).toFixed(1);

  // 3. 누적 REC 및 정산금 산출
  const recAcc = (totalMwh * config.agriPvWeight).toFixed(2);
  const totalRecRevenueMan = (Math.round(totalMwh * config.agriPvWeight * config.recUnitPrice) / 10000).toFixed(1);

  // 4. 환경 기여도 산출
  const co2Kg = Math.round(genKwh * config.co2FactorKgPerKwh);
  const co2Ton = ((genKwh * config.co2FactorKgPerKwh) / 1000).toFixed(2);
  const treeCount = Math.round(genKwh * config.treeFactorPerKwh);

  return {
    todaySmpWon,
    todayRecWon,
    todayTotalWon,
    todayRevenueMan,
    todaySmpText: todaySmpWon.toLocaleString() + ' 원',
    todayRecText: todayRecWon.toLocaleString() + ' 원',
    todayTotalText: todayTotalWon.toLocaleString() + ' 원',
    monthlySmpText: monthlySmpMan + ' 만원',
    monthlyRecText: monthlyRecMan + ' 만원',
    monthlyTotalText: monthlyTotalMan + ' 만원',
    recAccText: recAcc + ' REC',
    totalRecRevenueText: totalRecRevenueMan + ' 만원',
    co2Kg,
    co2Ton,
    treeCount
  };
}

// 2. 발전 성능 데이터 (Solar PV Generation Dataset)
const RASSI_DATA = {
  plants: {
    "12139": {
      id: "12139",
      name: "[원주] 온누리3,4 (200kW)",
      shortName: "온누리3,4",
      capacityKw: 200,
      currentPowerKw: 13.70,
      todayGenKwh: 348,
      todayGenHours: 1.74,
      cardCurrentPower: "13.70 kW",
      cardTodayGen: "348 kWh",
      cardTodayGenHours: "1.74 시간",
      cardTodaySmp: "45,587 원",
      cardTodayRec: "24,993 원",
      cardTodayTotal: "70,580 원",
      cardMonthlyGen: "15,323 kWh",
      cardMonthlySmp: "200.7 만원",
      cardMonthlyRec: "110.0 만원",
      cardMonthlyTotal: "310.8 만원",
      cardTotalRec: "3,231 만원",
      cardTemp: "28.2°C",
      cardStatus: "정상작동",
      targetGenKwh: 410,
      todayRevenueMan: 5.9,
      co2ReducedTon: 0.14,
      cropType: "콩 / 감자 시범구",
      shadingRatio: "28.5 %",
      soilMoisture: "42.0 %",
      soilTemp: "21.5 °C",
      cropGrowthIndex: "94.2 %",
      aiSubject: "인버터-2 DC 입력 전압 미세 강하 감지",
      aiDesc: "인버터-2 DC 전압이 613V로 정상 대비 -2.5% 출현. 스트링 3번 접속반 모듈 표면 세척 및 커넥터 점검 권장.",
      inverters: [
        { id: 1, powerKw: 9.6, runHours: 1.3, todayGenKwh: 78, state: "가동", comm: "17:15:09", dcV: 624.5, dcA: 15.4, acV: "382.5, 382.1, 382.8", acA: "14.5, 14.4, 14.5", temp: 42.1 },
        { id: 2, powerKw: 8.3, runHours: 1.1, todayGenKwh: 67, state: "가동", comm: "17:15:10", dcV: 613.0, dcA: 13.5, acV: "381.8, 381.9, 382.0", acA: "12.5, 12.6, 12.5", temp: 44.5 },
        { id: 3, powerKw: 9.6, runHours: 1.3, todayGenKwh: 78, state: "가동", comm: "17:15:09", dcV: 625.1, dcA: 15.3, acV: "382.6, 382.4, 382.9", acA: "14.6, 14.5, 14.6", temp: 41.8 },
        { id: 4, powerKw: 8.3, runHours: 1.1, todayGenKwh: 68, state: "가동", comm: "17:15:10", dcV: 622.8, dcA: 13.3, acV: "382.1, 382.0, 382.5", acA: "12.6, 12.5, 12.6", temp: 43.2 }
      ],
      hourly: [0, 15, 65, 110, 75, 26, 0, 0],
      hourlyPredict: [0, 20, 75, 130, 95, 40, 5, 0],
      yesterdayGenKwh: 410,
      monthlyTrend: [510, 680, 550, 320, 710, 650, 490, 580, 610, 390, 750, 690, 520, 480, 640, 720, 590, 310, 670, 740, 291],
      monthlyGenKwh: "14,953 kWh",
      smpDaily: "37,994 원",
      smpMonthly: "195 만원",
      recRevenue: "3,231.0 만원",
      recAcc: "449.51 REC",
      dcPower: "37.8 kW", dcVolt: "622.8 V", dcCurr: "55.9 A",
      acPower: "35.8 kW", acVolt: "382.8 V", acFreq: "60.0 Hz",
      owner: "김진성 (010-3574-1072)",
      manager: "김진성 (010-3574-1072)",
      contractor: "(주)동양연합엔지니어링",
      address: "세종특별시 대평로 71, 펠리체타워1 402호",
      inverterModel: "Hyundai HPC-060HL-D1-OU (4대)"
    },
    "12138": {
      id: "12138",
      name: "[원주] 온누리1,2 (200kW)",
      shortName: "온누리1,2",
      capacityKw: 200,
      currentPowerKw: 15.20,
      todayGenKwh: 382,
      todayGenHours: 1.91,
      cardCurrentPower: "15.20 kW",
      cardTodayGen: "382 kWh",
      cardTodayGenHours: "1.91 시간",
      cardTodaySmp: "50,042 원",
      cardTodayRec: "27,450 원",
      cardTodayTotal: "77,492 원",
      cardMonthlyGen: "16,840 kWh",
      cardMonthlySmp: "220.5 만원",
      cardMonthlyRec: "121.0 만원",
      cardMonthlyTotal: "341.5 만원",
      cardTotalRec: "3,550 만원",
      cardTemp: "27.8°C",
      cardStatus: "정상작동",
      targetGenKwh: 430,
      todayRevenueMan: 7.1,
      co2ReducedTon: 0.17,
      cropType: "옥수수 / 배추 시범구",
      shadingRatio: "25.0 %",
      soilMoisture: "48.5 %",
      soilTemp: "22.1 °C",
      cropGrowthIndex: "96.8 %",
      aiSubject: "모든 인버터 및 스트링 전압 정상 가동 중",
      aiDesc: "전체 4대 인버터 가동률 100% 달성. 모듈 표면 일사량 850W/m² 수광 상태 양호.",
      inverters: [
        { id: 1, powerKw: 11.2, runHours: 1.6, todayGenKwh: 92, state: "가동", comm: "17:15:08", dcV: 632.1, dcA: 17.8, acV: "384.0, 383.8, 384.2", acA: "16.8, 16.7, 16.8", temp: 40.5 },
        { id: 2, powerKw: 10.5, runHours: 1.5, todayGenKwh: 85, state: "가동", comm: "17:15:09", dcV: 628.4, dcA: 16.8, acV: "383.5, 383.2, 383.9", acA: "15.8, 15.7, 15.8", temp: 41.2 },
        { id: 3, powerKw: 10.8, runHours: 1.5, todayGenKwh: 86, state: "가동", comm: "17:15:08", dcV: 630.0, dcA: 17.2, acV: "384.1, 383.9, 384.3", acA: "16.2, 16.1, 16.2", temp: 39.8 },
        { id: 4, powerKw: 10.0, runHours: 1.4, todayGenKwh: 82, state: "가동", comm: "17:15:10", dcV: 627.1, dcA: 16.0, acV: "383.0, 382.9, 383.2", acA: "15.1, 15.0, 15.1", temp: 42.0 }
      ],
      hourly: [0, 22, 80, 135, 88, 32, 0, 0],
      hourlyPredict: [0, 25, 90, 145, 98, 42, 5, 0],
      yesterdayGenKwh: 430,
      monthlyTrend: [540, 710, 580, 390, 740, 680, 520, 620, 640, 420, 780, 710, 560, 510, 680, 750, 620, 340, 700, 760, 345],
      monthlyGenKwh: "16,210 kWh",
      smpDaily: "45,022 원",
      smpMonthly: "211 만원",
      recRevenue: "3,510.0 만원",
      recAcc: "488.20 REC",
      dcPower: "44.8 kW", dcVolt: "630.2 V", dcCurr: "66.5 A",
      acPower: "42.5 kW", acVolt: "384.1 V", acFreq: "60.0 Hz",
      owner: "박철수 (010-9876-5432)",
      manager: "박철수 (010-9876-5432)",
      contractor: "(주)동양연합엔지니어링",
      address: "세종특별시 대평로 71, 펠리체타워1 402호",
      inverterModel: "Hyundai HPC-060HL-D1-OU (4대)"
    },
    "12140": {
      id: "12140",
      name: "[원주] 온누리5,6 (300kW)",
      shortName: "온누리5,6",
      capacityKw: 300,
      currentPowerKw: 23.40,
      todayGenKwh: 584,
      todayGenHours: 1.95,
      cardCurrentPower: "23.40 kW",
      cardTodayGen: "584 kWh",
      cardTodayGenHours: "1.95 시간",
      cardTodaySmp: "76,504 원",
      cardTodayRec: "41,950 원",
      cardTodayTotal: "118,454 원",
      cardMonthlyGen: "25,720 kWh",
      cardMonthlySmp: "336.8 만원",
      cardMonthlyRec: "184.8 만원",
      cardMonthlyTotal: "521.6 만원",
      cardTotalRec: "5,430 만원",
      cardTemp: "28.5°C",
      cardStatus: "정상작동",
      targetGenKwh: 650,
      todayRevenueMan: 10.6,
      co2ReducedTon: 0.25,
      cropType: "마늘 / 양파 재배구",
      shadingRatio: "30.2 %",
      soilMoisture: "39.5 %",
      soilTemp: "23.0 °C",
      cropGrowthIndex: "93.1 %",
      aiSubject: "인버터-4 방열 팬 필터 미세 먼지 쌓임 경고",
      aiDesc: "인버터-4 내부 온도가 47.8°C로 지속 상승 중. 주기적 방열 필터 청소 권장.",
      inverters: [
        { id: 1, powerKw: 11.0, runHours: 1.7, todayGenKwh: 90, state: "가동", comm: "17:15:09", dcV: 628.5, dcA: 17.5, acV: "383.5, 383.2, 383.8", acA: "16.5, 16.4, 16.5", temp: 41.5 },
        { id: 2, powerKw: 10.8, runHours: 1.6, todayGenKwh: 88, state: "가동", comm: "17:15:08", dcV: 626.0, dcA: 17.2, acV: "383.0, 382.8, 383.3", acA: "16.2, 16.1, 16.2", temp: 42.0 },
        { id: 3, powerKw: 10.6, runHours: 1.6, todayGenKwh: 86, state: "가동", comm: "17:15:09", dcV: 625.0, dcA: 17.0, acV: "382.8, 382.5, 383.1", acA: "15.9, 15.8, 15.9", temp: 41.8 },
        { id: 4, powerKw: 10.9, runHours: 1.7, todayGenKwh: 89, state: "가동", comm: "17:15:10", dcV: 627.5, dcA: 17.4, acV: "383.2, 383.0, 383.5", acA: "16.4, 16.3, 16.4", temp: 47.8 },
        { id: 5, powerKw: 10.5, runHours: 1.6, todayGenKwh: 84, state: "가동", comm: "17:15:09", dcV: 624.0, dcA: 16.8, acV: "382.5, 382.2, 382.9", acA: "15.8, 15.7, 15.8", temp: 43.1 },
        { id: 6, powerKw: 10.4, runHours: 1.5, todayGenKwh: 83, state: "가동", comm: "17:15:10", dcV: 623.5, dcA: 16.6, acV: "382.1, 382.0, 382.5", acA: "15.6, 15.5, 15.6", temp: 42.8 }
      ],
      hourly: [0, 35, 120, 195, 130, 48, 0, 0],
      hourlyPredict: [0, 40, 135, 215, 145, 55, 8, 0],
      yesterdayGenKwh: 650,
      monthlyTrend: [820, 1050, 890, 540, 1120, 1020, 790, 920, 980, 640, 1190, 1080, 850, 780, 1010, 1140, 930, 520, 1040, 1150, 520],
      monthlyGenKwh: "24,180 kWh",
      smpDaily: "67,860 원",
      smpMonthly: "314 만원",
      recRevenue: "5,240.0 만원",
      recAcc: "729.10 REC",
      dcPower: "67.8 kW", dcVolt: "628.5 V", dcCurr: "100.8 A",
      acPower: "64.2 kW", acVolt: "383.5 V", acFreq: "60.0 Hz",
      owner: "이성호 (010-1122-3344)",
      manager: "이성호 (010-1122-3344)",
      contractor: "(주)동양연합엔지니어링",
      address: "세종특별시 대평로 71, 펠리체타워1 402호",
      inverterModel: "Hyundai HPC-060HL-D1-OU (6대)"
    },
    "12141": {
      id: "12141",
      name: "[횡성] 청정영농형1호 (500kW)",
      shortName: "청정영농형1호",
      capacityKw: 500,
      currentPowerKw: 38.60,
      todayGenKwh: 965,
      todayGenHours: 1.93,
      cardCurrentPower: "38.60 kW",
      cardTodayGen: "965 kWh",
      cardTodayGenHours: "1.93 시간",
      cardTodaySmp: "126,415 원",
      cardTodayRec: "69,320 원",
      cardTodayTotal: "195,735 원",
      cardMonthlyGen: "42,460 kWh",
      cardMonthlySmp: "556.2 만원",
      cardMonthlyRec: "305.2 만원",
      cardMonthlyTotal: "861.4 만원",
      cardTotalRec: "8,970 만원",
      cardTemp: "26.9°C",
      cardStatus: "정상작동",
      targetGenKwh: 1100,
      todayRevenueMan: 18.2,
      co2ReducedTon: 0.43,
      cropType: "인삼 / 음지 약용작물",
      shadingRatio: "34.0 %",
      soilMoisture: "51.2 %",
      soilTemp: "19.8 °C",
      cropGrowthIndex: "98.5 %",
      aiSubject: "대용량 500kW 계통 연계 인버터 전 구조 최고 효율 가동 중",
      aiDesc: "전체 인버터 정상 가동 완료. 한전 변전소 역전송 전압 안정 상태 유지 중.",
      inverters: [
        { id: 1, powerKw: 11.5, runHours: 1.8, todayGenKwh: 95, state: "가동", comm: "17:15:08", dcV: 635.0, dcA: 18.2, acV: "384.5, 384.2, 384.8", acA: "17.2, 17.1, 17.2", temp: 39.5 },
        { id: 2, powerKw: 11.2, runHours: 1.7, todayGenKwh: 92, state: "가동", comm: "17:15:09", dcV: 632.4, dcA: 17.8, acV: "384.0, 383.8, 384.3", acA: "16.8, 16.7, 16.8", temp: 40.1 },
        { id: 3, powerKw: 11.4, runHours: 1.8, todayGenKwh: 94, state: "가동", comm: "17:15:08", dcV: 634.1, dcA: 18.0, acV: "384.2, 384.0, 384.5", acA: "17.0, 16.9, 17.0", temp: 39.8 },
        { id: 4, powerKw: 11.0, runHours: 1.7, todayGenKwh: 90, state: "가동", comm: "17:15:10", dcV: 630.5, dcA: 17.5, acV: "383.5, 383.3, 383.8", acA: "16.5, 16.4, 16.5", temp: 41.0 }
      ],
      hourly: [0, 55, 180, 290, 195, 75, 0, 0],
      hourlyPredict: [0, 65, 210, 320, 220, 85, 12, 0],
      yesterdayGenKwh: 1100,
      recAcc: "1,244.80 REC",
      dcPower: "119.2 kW", dcVolt: "635.0 V", dcCurr: "176.4 A",
      acPower: "112.8 kW", acVolt: "385.0 V", acFreq: "60.0 Hz",
      owner: "최동수 (010-5566-7788)",
      manager: "최동수 (010-5566-7788)",
      contractor: "(주)동양연합엔지니어링",
      address: "세종특별시 대평로 71, 펠리체타워1 402호",
      inverterModel: "Hyundai HPC-060HL-D1-OU (10대)"
    },
    "12142": {
      id: "12142",
      name: "[춘천] 소양강 영농태양광 (150kW)",
      shortName: "소양강 영농태양광",
      capacityKw: 150,
      currentPowerKw: 11.50,
      todayGenKwh: 289,
      todayGenHours: 1.93,
      cardCurrentPower: "11.50 kW",
      cardTodayGen: "289 kWh",
      cardTodayGenHours: "1.93 시간",
      cardTodaySmp: "37,859 원",
      cardTodayRec: "20,760 원",
      cardTodayTotal: "58,619 원",
      cardMonthlyGen: "12,710 kWh",
      cardMonthlySmp: "166.5 만원",
      cardMonthlyRec: "91.3 만원",
      cardMonthlyTotal: "257.8 만원",
      cardTotalRec: "2,680 만원",
      cardTemp: "27.2°C",
      cardStatus: "정상작동",
      targetGenKwh: 320,
      todayRevenueMan: 5.1,
      co2ReducedTon: 0.12,
      cropType: "들깨 / 산나물 시범구",
      shadingRatio: "26.8 %",
      soilMoisture: "44.2 %",
      soilTemp: "20.9 °C",
      cropGrowthIndex: "95.4 %",
      aiSubject: "토양 습도 센서 관수 작업 완료 후 수치 정상 회귀",
      aiDesc: "하부 작물 들깨 구역 자동 관수 시스템 작동 정상 완료.",
      inverters: [
        { id: 1, powerKw: 10.5, runHours: 1.7, todayGenKwh: 85, state: "가동", comm: "17:15:09", dcV: 620.5, dcA: 16.9, acV: "381.8, 381.5, 382.0", acA: "15.8, 15.7, 15.8", temp: 39.0 },
        { id: 2, powerKw: 10.4, runHours: 1.6, todayGenKwh: 82, state: "가동", comm: "17:15:08", dcV: 619.0, dcA: 16.8, acV: "381.5, 381.2, 381.9", acA: "15.6, 15.5, 15.6", temp: 40.2 },
        { id: 3, powerKw: 10.3, runHours: 1.6, todayGenKwh: 81, state: "가동", comm: "17:15:10", dcV: 618.5, dcA: 16.6, acV: "381.2, 381.0, 381.5", acA: "15.5, 15.4, 15.5", temp: 40.8 }
      ],
      hourly: [0, 18, 55, 95, 62, 22, 0, 0],
      hourlyPredict: [0, 22, 65, 110, 72, 28, 4, 0],
      yesterdayGenKwh: 320,
      monthlyTrend: [410, 530, 440, 270, 560, 510, 390, 460, 480, 310, 590, 540, 420, 380, 490, 570, 460, 250, 520, 580, 248],
      monthlyGenKwh: "11,850 kWh",
      smpDaily: "32,364 원",
      smpMonthly: "154 만원",
      recRevenue: "2,560.0 만원",
      recAcc: "356.70 REC",
      dcPower: "32.9 kW", dcVolt: "620.5 V", dcCurr: "48.9 A",
      acPower: "31.2 kW", acVolt: "381.8 V", acFreq: "60.0 Hz",
      owner: "정민우 (010-9988-7766)",
      manager: "정민우 (010-9988-7766)",
      contractor: "(주)동양연합엔지니어링",
      address: "세종특별시 대평로 71, 펠리체타워1 402호",
      inverterModel: "Hyundai HPC-060HL-D1-OU (3대)"
    }
  },

  yearlyRecords: [
    { month: "1월", genKwh: 10640, avgHours: 2.72 },
    { month: "2월", genKwh: 17466, avgHours: 3.71 },
    { month: "3월", genKwh: 24883, avgHours: 4.01 },
    { month: "4월", genKwh: 27664, avgHours: 4.61 },
    { month: "5월", genKwh: 32681, avgHours: 5.26 },
    { month: "6월", genKwh: 32433, avgHours: 5.40 },
    { month: "7월", genKwh: 14953, avgHours: 3.56 }
  ],

  calendarDays: Array.from({length: 21}, (_, i) => ({
    day: i + 1,
    weather: i % 3 === 0 ? '☀️' : (i % 3 === 1 ? '☁️' : '⛈️'),
    gen: 500 + (i * 17) % 300,
    rev: (6.5 + (i * 0.3) % 4).toFixed(1)
  })),

  errorLogs: [
    { time: "2026-07-21 16:40", plant: "온누리3,4", device: "인버터-2 / 스트링3", type: "DC 전압 미세 강하", status: "warning", statusText: "주의", desc: "인버터-2 DC 전압 613V (정상 대비 -2.5%). 모듈 surface 세척 및 접속반 커넥터 조임 권장", stateText: "진단 완료" },
    { time: "2026-07-20 14:15", plant: "온누리1,2", device: "인버터-4", type: "내부 온도 과열 주의", status: "resolved", statusText: "해제", desc: "인버터 내부 온도 49.2°C 도달. 방열 팬 필터 청소 후 정상 복구 완료", stateText: "해제 완료" },
    { time: "2026-07-18 09:30", plant: "청정영농형1호", device: "통신 게이트웨이", type: "RS-485 통신 일시 지연", status: "resolved", statusText: "해제", desc: "순간 통신 패킷 재전송 성공. 자동 동기화 복구됨", stateText: "해제 완료" }
  ]
};

// 3. AI 영농이행 행정 관제 데이터 (Agri-PV Compliance Dataset)
const AGRI_ADMIN_DATA = {
  summary: {
    totalSites: 5,
    normalSites: 3,
    watchSites: 2,
    inspectionSites: 0,
    actionSites: 0,
    reportingPeriod: "2027.03.01 - 2027.03.31",
    authority: "강원특별자치도 / 원주시·횡성군·춘천시",
    generatedAt: "2027.04.02 09:00"
  },

  sites: {
    "12139": {
      id: "12139",
      name: "[12139][원주] 온누리3,4 (200kW)",
      code: "[원주] 온누리3,4",
      capacity: "200 kW",
      permitNo: "2027-AGPV-12139",
      address: "강원특별자치도 원주시 지정면 간현리 428",
      lat: 37.3422,
      lng: 127.9201,
      permitCrop: "콩",
      aiCrop: "콩",
      subCrop: "콩 / 감자 시범구",
      cropMatch: true,
      cropVerificationStatus: "콩 (AI 특정 완료 94%)",
      cropVerificationBadge: "badge-success",
      permitArea: 4000,
      actualArea: 3400,
      areaRatio: 85,
      complianceScore: 85,
      status: "관찰 필요",
      statusBadge: "badge-warning",
      riskLevel: "관찰",
      riskBadge: "badge-warning",
      eventsCount: 27,
      inactiveDays: 4,
      otherUseCount: 0,
      workerDetections: 18,
      machineryDetections: 8,
      mainActivity: "경운·파종·제초",
      manager: "김진성 (소유주)",
      reviewDate: "2027.04.04",
      decision: "관찰 유지",
      scores: { farmingDuty: 86, cropCompliance: 92, landUseAppropriateness: 85 },
      activities: [
        { type: "경운", count: 3, confidence: "95%", status: "확인", badge: "badge-success" },
        { type: "파종", count: 2, confidence: "94%", status: "확인", badge: "badge-success" },
        { type: "제초", count: 4, confidence: "90%", status: "확인", badge: "badge-success" },
        { type: "수확", count: 0, confidence: "-", status: "시기 전", badge: "badge-warning" }
      ],
      timeline: [
        { date: "03.02 09:20", title: "03.02 토양 경운·정지", desc: "카메라 01 · 트랙터 로터리 작업 · 신뢰도 96%", cam: "CAM01", confidence: "96%", review: "인정" },
        { date: "03.06 08:55", title: "03.06 파종 작업 (A구역)", desc: "카메라 02 · 작업자 2명 (파종기 가동) · 신뢰도 94%", cam: "CAM02", confidence: "94%", review: "인정" },
        { date: "03.18 15:12", title: "03.18 1차 제초 및 관수", desc: "카메라 03 · 작업자 1명 · 신뢰도 91%", cam: "CAM03", confidence: "91%", review: "인정" },
        { date: "03.28 10:42", title: "03.28 새순 발아 및 작물 특정", desc: "AI 엽형 분석 엔진 · 콩(신고작물) 일치율 94% 판정", cam: "CAM03", confidence: "94%", review: "인정" }
      ],
      anomalies: [
        { title: "북측 미경작 의심구역", desc: "전월 대비 2.1% 증가 · 다음 리포트 재확인 권고", status: "관찰", badge: "badge-warning" },
        { title: "장기 무활동", desc: "연속 무활동 4일 (기준 14일 이내)", status: "정상", badge: "badge-success" },
        { title: "작물 불일치", desc: "신고작물(콩)과 AI 영상 판정 작물 100% 일치", status: "미탐지", badge: "badge-success" }
      ],
      cameraEvidence: {
        camId: "CAM03",
        timestamp: "2027.03.28 10:42:16",
        gps: "37.3422, 127.9201",
        videoUrl: "CAM03-0328-1042",
        classification: "새순 발아 및 작물 특정",
        confidence: 94,
        workers: 2,
        machinery: 1,
        zone: "B구역 (남측 진입로)",
        decisionBasis: [
          "새순 발아 및 잎 형상 패턴 분석 완료",
          "콩(두류) 표준 엽형 일치율 94%",
          "경작구역 내 균일 군락 형성"
        ],
        reviewHistory: [
          { reviewer: "강원도 영농 감독관", time: "2027.04.03 14:21", action: "인정", badge: "badge-success" }
        ]
      }
    },
    "12138": {
      id: "12138",
      name: "[12138][원주] 온누리1,2 (200kW)",
      code: "[원주] 온누리1,2",
      capacity: "200 kW",
      permitNo: "2027-AGPV-12138",
      address: "강원특별자치도 원주시 지정면 안창리 115",
      lat: 37.3380,
      lng: 127.9150,
      permitCrop: "옥수수",
      aiCrop: "옥수수",
      subCrop: "옥수수 / 배추 시범구",
      cropMatch: true,
      cropVerificationStatus: "옥수수 (AI 특정 완료 98%)",
      cropVerificationBadge: "badge-success",
      permitArea: 3800,
      actualArea: 3496,
      areaRatio: 92,
      complianceScore: 91,
      status: "정상 이행",
      statusBadge: "badge-success",
      riskLevel: "정상",
      riskBadge: "badge-success",
      eventsCount: 24,
      inactiveDays: 3,
      otherUseCount: 0,
      workerDetections: 15,
      machineryDetections: 6,
      mainActivity: "경운·제초",
      manager: "박철수 (소유주)",
      reviewDate: "2027.04.03",
      decision: "정상 처리",
      scores: { farmingDuty: 94, cropCompliance: 92, landUseAppropriateness: 90 },
      activities: [
        { type: "경운", count: 2, confidence: "96%", status: "확인", badge: "badge-success" },
        { type: "파종", count: 1, confidence: "92%", status: "확인", badge: "badge-success" },
        { type: "제초", count: 3, confidence: "91%", status: "확인", badge: "badge-success" }
      ],
      timeline: [
        { date: "02.25 10:00", title: "02.25 트랙터 경운 및 정지", desc: "카메라 01 · 트랙터 1대 · 신뢰도 97%", cam: "CAM01", confidence: "97%", review: "인정" },
        { date: "03.04 10:15", title: "03.04 파종 작업 (전 구역)", desc: "카메라 01 · 작업자 3명 · 신뢰도 95%", cam: "CAM01", confidence: "95%", review: "인정" },
        { date: "03.20 14:20", title: "03.20 새순 발아 및 작물 특정", desc: "AI 엽형 분석 · 옥수수(신고작물) 일치율 98% 판정", cam: "CAM02", confidence: "98%", review: "인정" },
        { date: "04.05 11:30", title: "04.05 생육 상태 점검", desc: "카메라 01 · 정상 군락 형성 확인 · 신뢰도 96%", cam: "CAM01", confidence: "96%", review: "인정" }
      ],
      anomalies: [
        { title: "장기 무활동", desc: "연속 무활동 3일 (정상)", status: "정상", badge: "badge-success" }
      ],
      cameraEvidence: {
        camId: "CAM01",
        timestamp: "2027.03.12 14:20:00",
        gps: "37.3380, 127.9150",
        videoUrl: "CAM01-0312-1420",
        classification: "파종 작업",
        confidence: 92,
        workers: 3,
        machinery: 1,
        zone: "A구역",
        decisionBasis: ["작업자 3명 파종 행위 탐지", "경작 구역 정지 작업"],
        reviewHistory: [{ reviewer: "강원도 영농 감독관", time: "2027.04.03", action: "인정", badge: "badge-success" }]
      }
    },
    "12140": {
      id: "12140",
      name: "[12140][원주] 온누리5,6 (300kW)",
      code: "[원주] 온누리5,6",
      capacity: "300 kW",
      permitNo: "2027-AGPV-12140",
      address: "강원특별자치도 원주시 소초면 흥양리 88",
      lat: 37.3850,
      lng: 127.9950,
      permitCrop: "마늘/양파",
      aiCrop: "마늘/양파",
      subCrop: "마늘/양파 / 배추 시범구",
      cropMatch: true,
      cropVerificationStatus: "판별 대기 (새순 발아 전)",
      cropVerificationBadge: "badge-info",
      permitArea: 6000,
      actualArea: 5400,
      areaRatio: 90,
      complianceScore: 88,
      status: "관찰 필요",
      statusBadge: "badge-warning",
      riskLevel: "관찰",
      riskBadge: "badge-warning",
      eventsCount: 18,
      inactiveDays: 7,
      otherUseCount: 0,
      workerDetections: 10,
      machineryDetections: 4,
      mainActivity: "물대기·경운",
      manager: "이성호 (소유주)",
      reviewDate: "2027.04.02",
      decision: "관찰 유지",
      scores: { farmingDuty: 88, cropCompliance: 90, landUseAppropriateness: 86 },
      activities: [
        { type: "경운", count: 3, confidence: "94%", status: "확인", badge: "badge-success" },
        { type: "관수", count: 5, confidence: "90%", status: "확인", badge: "badge-success" }
      ],
      timeline: [
        { date: "03.08 11:00", title: "03.08 토양 로터리 작업", desc: "카메라 01 · 농기계 1대 · 신뢰도 94%", cam: "CAM01", confidence: "94%", review: "인정" },
        { date: "03.20 13:40", title: "03.20 모종 정식 작업", desc: "카메라 02 · 이앙기 1대 / 작업자 2명 · 신뢰도 93%", cam: "CAM02", confidence: "93%", review: "인정" },
        { date: "04.02 10:30", title: "04.02 1차 포장 제초 점검", desc: "카메라 01 · 작업자 1명 · 신뢰도 92%", cam: "CAM01", confidence: "92%", review: "인정" }
      ],
      anomalies: [
        { title: "동측 경계 미경작 의심구역", desc: "전월 대비 1.5% 증가", status: "관찰", badge: "badge-warning" }
      ],
      cameraEvidence: {
        camId: "CAM02",
        timestamp: "2027.03.08 11:00:00",
        gps: "37.3850, 127.9950",
        videoUrl: "CAM02-0308-1100",
        classification: "토양 로터리 작업",
        confidence: 94,
        workers: 1,
        machinery: 1,
        zone: "C구역",
        decisionBasis: ["트랙터 이동 궤적 탐지"],
        reviewHistory: [{ reviewer: "강원도 영농 감독관", time: "2027.04.02", action: "인정", badge: "badge-success" }]
      }
    },
    "12141": {
      id: "12141",
      name: "[12141][횡성] 청정영농형1호 (500kW)",
      code: "[횡성] 청정영농형1호",
      capacity: "500 kW",
      permitNo: "2027-AGPV-12141",
      address: "강원특별자치도 횡성군 횡성읍 학곡리 502",
      lat: 37.4917,
      lng: 127.9846,
      permitCrop: "사과/인삼",
      aiCrop: "사과/인삼",
      subCrop: "사과 / 인삼 영농구",
      cropMatch: true,
      cropVerificationStatus: "사과/인삼 (AI 특정 완료 99%)",
      cropVerificationBadge: "badge-success",
      permitArea: 9500,
      actualArea: 8550,
      areaRatio: 90,
      complianceScore: 95,
      status: "정상 이행",
      statusBadge: "badge-success",
      riskLevel: "정상",
      riskBadge: "badge-success",
      eventsCount: 35,
      inactiveDays: 2,
      otherUseCount: 0,
      workerDetections: 22,
      machineryDetections: 10,
      mainActivity: "전정·전지·관수",
      manager: "최동수 (소유주)",
      reviewDate: "2027.04.01",
      decision: "정상 처리",
      scores: { farmingDuty: 98, cropCompliance: 96, landUseAppropriateness: 94 },
      activities: [
        { type: "전지", count: 8, confidence: "97%", status: "확인", badge: "badge-success" },
        { type: "방제", count: 4, confidence: "95%", status: "확인", badge: "badge-success" }
      ],
      timeline: [
        { date: "03.05 09:00", title: "03.05 과수 전정 작업", desc: "카메라 01 · 작업자 4명 · 신뢰도 97%", cam: "CAM01", confidence: "97%", review: "인정" },
        { date: "03.25 10:30", title: "03.25 기비 시비 및 관수", desc: "카메라 02 · 관수 시설 가동 · 신뢰도 95%", cam: "CAM02", confidence: "95%", review: "인정" },
        { date: "04.15 14:00", title: "04.15 인공 수분 및 개화 관리", desc: "카메라 02 · 작업자 3명 · 신뢰도 95%", cam: "CAM02", confidence: "95%", review: "인정" }
      ],
      anomalies: [
        { title: "장기 무활동", desc: "연속 무활동 2일 (정상)", status: "정상", badge: "badge-success" }
      ],
      cameraEvidence: {
        camId: "CAM01",
        timestamp: "2027.03.05 09:00:00",
        gps: "37.4917, 127.9846",
        videoUrl: "CAM01-0305-0900",
        classification: "과수 전정 작업",
        confidence: 97,
        workers: 4,
        machinery: 1,
        zone: "전 구역",
        decisionBasis: ["전정 가위 및 사다리 장비 감지", "가지치기 영농 활동 패턴"],
        reviewHistory: [{ reviewer: "강원도 영농 감독관", time: "2027.04.01", action: "인정", badge: "badge-success" }]
      }
    },
    "12142": {
      id: "12142",
      name: "[12142][춘천] 소양강 영농태양광 (150kW)",
      code: "[춘천] 소양강 영농",
      capacity: "150 kW",
      permitNo: "2027-AGPV-12142",
      address: "강원특별자치도 춘천시 서면 당림리 310",
      lat: 37.8813,
      lng: 127.6521,
      permitCrop: "콩 (두류)",
      aiCrop: "콩/완두 (유사)",
      subCrop: "들깨 / 산나물 시범구",
      cropMatch: false,
      cropVerificationStatus: "유사 작물 감지 (현장 확인 권고)",
      cropVerificationBadge: "badge-warning",
      permitArea: 3000,
      actualArea: 2550,
      areaRatio: 85,
      complianceScore: 82,
      status: "관찰 필요",
      statusBadge: "badge-warning",
      riskLevel: "관찰",
      riskBadge: "badge-warning",
      eventsCount: 16,
      inactiveDays: 5,
      otherUseCount: 0,
      workerDetections: 8,
      machineryDetections: 3,
      mainActivity: "로터리·파종",
      manager: "정민우 (소유주)",
      reviewDate: "2027.04.02",
      decision: "관찰 유지",
      scores: { farmingDuty: 82, cropCompliance: 80, landUseAppropriateness: 84 },
      activities: [
        { type: "경운", count: 2, confidence: "93%", status: "확인", badge: "badge-success" },
        { type: "파종", count: 1, confidence: "90%", status: "확인", badge: "badge-success" }
      ],
      timeline: [
        { date: "03.05 10:00", title: "03.05 토양 경운 작업", desc: "카메라 01 · 트랙터 1대 · 신뢰도 93%", cam: "CAM01", confidence: "93%", review: "인정" },
        { date: "03.15 14:00", title: "03.15 파종 작업", desc: "카메라 02 · 작업자 2명 · 신뢰도 90%", cam: "CAM02", confidence: "90%", review: "인정" },
        { date: "04.02 11:20", title: "04.02 새순 엽형 분석 (유사 감지)", desc: "AI 엽형 분석 · 두류 계열 유사 엽형 (신뢰도 68% - 현장 확인 권고)", cam: "CAM01", confidence: "68%", review: "보류" }
      ],
      anomalies: [
        { title: "작물 특정 불명확 (유사 엽형)", desc: "두류 유사 작물 감지 · 현장 사진 제출 요청 권고", status: "관찰", badge: "badge-warning" }
      ],
      cameraEvidence: {
        camId: "CAM01",
        timestamp: "2027.04.02 11:20:00",
        gps: "37.8813, 127.6521",
        videoUrl: "CAM01-0402-1120",
        classification: "새순 엽형 분석 (유사 작물 감지)",
        confidence: 68,
        workers: 0,
        machinery: 0,
        zone: "남측 재배구",
        decisionBasis: [
          "두류 계열(콩/완두) 유사 잎 형상 감지",
          "원거리 해상도 한계로 세부 품종 특정 불명확",
          "사업자 근접 촬영 사진 제출 필요"
        ],
        reviewHistory: [{ reviewer: "강원도 영농 감독관", time: "2027.04.02", action: "보류", badge: "badge-warning" }]
      }
    }
  },



  priorityWatchlist: [
    { id: "12140", name: "[12140] [원주] 온누리5,6", issue: "동측 경계 미경작 1.5% 관찰", level: "관찰", badge: "badge-medium" },
    { id: "12139", name: "[12139] [원주] 온누리3,4", issue: "북측 경계 미경작 2.1% 관찰", level: "관찰", badge: "badge-medium" },
    { id: "12138", name: "[12138] [원주] 온누리1,2", issue: "정상 이행 (영농활동 지속)", level: "정상", badge: "badge-low" },
    { id: "12141", name: "[12141] [횡성] 청정영농형1호", issue: "정상 이행 (과수 전정 진행)", level: "정상", badge: "badge-low" },
    { id: "12142", name: "[12142] [춘천] 소양강 영농", issue: "정상 이행 (관수 작업 진행)", level: "정상", badge: "badge-low" }
  ],

  recentReports: [
    { id: "12139", name: "[12139] [원주] 온누리3,4 (200kW)", crop: "콩 / 감자", events: "27건", area: "85%", result: "관찰 필요", badge: "badge-warning" },
    { id: "12138", name: "[12138] [원주] 온누리1,2 (200kW)", crop: "옥수수 / 배추", events: "24건", area: "92%", result: "정상 이행", badge: "badge-success" },
    { id: "12140", name: "[12140] [원주] 온누리5,6 (300kW)", crop: "벼 / 들깨", events: "18건", area: "90%", result: "관찰 필요", badge: "badge-warning" },
    { id: "12141", name: "[12141] [횡성] 청정영농형1호 (500kW)", crop: "사과 / 인삼", events: "35건", area: "90%", result: "정상 이행", badge: "badge-success" },
    { id: "12142", name: "[12142] [춘천] 소양강 영농 (150kW)", crop: "블루베리 / 고추", events: "22건", area: "93%", result: "정상 이행", badge: "badge-success" }
  ]
};
