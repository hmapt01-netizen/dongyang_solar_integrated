/* ==========================================================================
   동양연합 영농형 태양광 통합 관제 플랫폼 - 차팅 엔진
   (발전량 RassiCharts + AI 영농이행 AgriCharts)
   ========================================================================== */

// 1. 발전량 및 설비 차트 엔진
let RassiCharts = {
  hourlyChart: null,
  monthlyChart: null,
  yearlyChart: null,
  recChart: null,
  smpChart: null,

  initAll: function(plantData) {
    this.initHourlyChart(plantData);
    this.initMonthlyChart(plantData);
    this.initYearlyChart(plantData);
    this.initRecMarketChart();
    this.initSmpMarketChart();
  },

  updatePlantCharts: function(plantData) {
    if (!plantData) return;

    if (this.hourlyChart) {
      this.hourlyChart.data.datasets[0].data = plantData.hourly || [0, 15, 65, 110, 75, 26, 0, 0];
      this.hourlyChart.data.datasets[1].data = plantData.hourlyPredict || [0, 20, 75, 130, 95, 40, 5, 0];
      this.hourlyChart.update();
    } else {
      this.initHourlyChart(plantData);
    }

    if (this.monthlyChart) {
      this.monthlyChart.data.datasets[0].data = plantData.monthlyTrend || [510, 680, 550, 320, 710, 650];
      this.monthlyChart.update();
    } else {
      this.initMonthlyChart(plantData);
    }

    if (!this.yearlyChart) {
      this.initYearlyChart(plantData);
    } else {
      this.yearlyChart.update();
    }

    if (!this.recChart) this.initRecMarketChart();
    if (!this.smpChart) this.initSmpMarketChart();
  },


  initHourlyChart: function(plantData) {
    const ctx = document.getElementById('hourlyGenChart')?.getContext('2d');
    if (!ctx) return;

    const hours = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h'];
    const actualData = plantData?.hourly || [0, 15, 65, 110, 75, 26, 0, 0];
    const aiPredictData = plantData?.hourlyPredict || [0, 20, 75, 130, 95, 40, 5, 0];

    const gradientActual = ctx.createLinearGradient(0, 0, 0, 150);
    gradientActual.addColorStop(0, 'rgba(75, 107, 85, 0.35)');
    gradientActual.addColorStop(1, 'rgba(75, 107, 85, 0.0)');

    if (this.hourlyChart) this.hourlyChart.destroy();

    this.hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: '실시간 (kWh)',
            data: actualData,
            borderColor: '#4b6b55',
            backgroundColor: gradientActual,
            borderWidth: 3,
            fill: true,
            tension: 0.45,
            pointRadius: 5,
            pointBackgroundColor: '#4b6b55',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          },
          {
            label: 'AI 예측 (kWh)',
            data: aiPredictData,
            borderColor: '#e07a5f',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.45,
            pointRadius: 3,
            pointBackgroundColor: '#e07a5f'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  initMonthlyChart: function(plantData) {
    const ctx = document.getElementById('monthlyGenChart')?.getContext('2d');
    if (!ctx) return;

    const days = Array.from({length: 21}, (_, i) => `${i+1}일`);
    const trendData = plantData?.monthlyTrend || [510, 680, 550, 320, 710, 650, 490, 580];

    if (this.monthlyChart) this.monthlyChart.destroy();

    this.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: '일별 발전량 (kWh)',
          data: trendData,
          backgroundColor: 'rgba(75, 107, 85, 0.75)',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
          x: { grid: { display: false } }
        }
      }
    });
  },

  initYearlyChart: function(plantData) {
    const ctx = document.getElementById('yearlyGenChart')?.getContext('2d');
    if (!ctx) return;

    if (this.yearlyChart) this.yearlyChart.destroy();

    this.yearlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월'],
        datasets: [{
          label: '월별 누적 발전량 (kWh)',
          data: [10640, 17466, 24883, 27664, 32681, 32433, 14953],
          backgroundColor: '#81b29a',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  },

  initRecMarketChart: function() {
    const ctx = document.getElementById('recMarketChart')?.getContext('2d');
    if (!ctx) return;

    if (this.recChart) this.recChart.destroy();

    const gradientRec = ctx.createLinearGradient(0, 0, 0, 120);
    gradientRec.addColorStop(0, 'rgba(224, 122, 95, 0.25)');
    gradientRec.addColorStop(1, 'rgba(224, 122, 95, 0.0)');

    this.recChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['6/11', '6/25', '7/02', '7/09', '7/16', '7/23(실시간)'],
        datasets: [
          {
            label: '육지 종가 (원)',
            data: [71500, 72300, 73100, 72800, 73600, 74800],
            borderColor: '#e07a5f',
            backgroundColor: gradientRec,
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointHitRadius: 30,
            pointBackgroundColor: '#e07a5f'
          },
          {
            label: '육지 평균가 (원)',
            data: [71000, 72000, 72900, 72500, 73200, 74350],
            borderColor: '#4b6b55',
            borderWidth: 1.5,
            borderDash: [4, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 7,
            pointHitRadius: 30
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        hover: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#475569', font: { size: 9.5, weight: '700' }, boxWidth: 10 } },
          tooltip: {
            enabled: true, mode: 'index', intersect: false, padding: 10,
            backgroundColor: 'rgba(15, 23, 42, 0.92)', titleColor: '#ffffff', bodyColor: '#f97316',
            titleFont: { size: 12, weight: 'bold' }, bodyFont: { size: 12.5, weight: 'bold' }, cornerRadius: 8
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9, weight: '700' } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              color: '#64748b', font: { size: 8.5, weight: '700' },
              callback: function(value) { return (value / 10000).toFixed(1) + '만'; }
            }
          }
        }
      }
    });
  },

  initSmpMarketChart: function() {
    const ctx = document.getElementById('smpMarketChart')?.getContext('2d');
    if (!ctx) return;

    if (this.smpChart) this.smpChart.destroy();

    const gradientSmp = ctx.createLinearGradient(0, 0, 0, 120);
    gradientSmp.addColorStop(0, 'rgba(224, 122, 95, 0.25)');
    gradientSmp.addColorStop(1, 'rgba(224, 122, 95, 0.0)');

    this.smpChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['6/11', '6/25', '7/02', '7/09', '7/16', '7/23(실시간)'],
        datasets: [
          {
            label: '육지 SMP (원)',
            data: [122.1, 124.5, 128.4, 126.0, 130.2, 132.5],
            borderColor: '#e07a5f',
            backgroundColor: gradientSmp,
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointHitRadius: 30,
            pointBackgroundColor: '#e07a5f'
          },
          {
            label: '제주 SMP (원)',
            data: [124.0, 126.2, 130.1, 128.5, 132.0, 134.8],
            borderColor: '#4b6b55',
            borderWidth: 1.5,
            borderDash: [4, 4],
            fill: false,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 7,
            pointHitRadius: 30
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        hover: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#475569', font: { size: 9.5, weight: '700' }, boxWidth: 10 } },
          tooltip: {
            enabled: true, mode: 'index', intersect: false, padding: 10,
            backgroundColor: 'rgba(15, 23, 42, 0.92)', titleColor: '#ffffff', bodyColor: '#f97316',
            titleFont: { size: 12, weight: 'bold' }, bodyFont: { size: 12.5, weight: 'bold' }, cornerRadius: 8
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9, weight: '700' } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              color: '#64748b', font: { size: 8.5, weight: '700' },
              callback: function(value) { return value + '원'; }
            }
          }
        }
      }
    });
  }

};

// 2. AI 영농이행 차트 엔진
const AgriCharts = {
  instances: {},

  initDashboardCharts: function() {
    this.renderActivityTrendChart();
    this.renderComplianceDistChart();
  },

  renderActivityTrendChart: function() {
    const ctx = document.getElementById('activityTrendChart');
    if (!ctx) return;

    if (this.instances.activityTrend) {
      this.instances.activityTrend.destroy();
    }

    this.instances.activityTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['03.01', '03.05', '03.10', '03.15', '03.20', '03.25', '03.30'],
        datasets: [
          {
            label: '농기계 탐지',
            data: [1, 2, 0, 1, 3, 0, 1],
            borderColor: '#3d5a47',
            backgroundColor: 'rgba(61, 90, 71, 0.15)',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5
          },
          {
            label: '작업자 탐지',
            data: [2, 4, 1, 3, 5, 2, 1],
            borderColor: '#d06245',
            backgroundColor: 'rgba(208, 98, 69, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { weight: 'bold' } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  renderComplianceDistChart: function() {
    const ctx = document.getElementById('complianceDistChart');
    if (!ctx) return;

    if (this.instances.complianceDist) {
      this.instances.complianceDist.destroy();
    }

    this.instances.complianceDist = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['정상 이행 (401소)', '관찰 필요 (28소)', '현장점검 (18소)', '시정 검토 (5소)'],
        datasets: [{
          data: [401, 28, 18, 5],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { weight: 'bold' } } }
        },
        cutout: '70%'
      }
    });
  }
};
