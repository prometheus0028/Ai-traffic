/**
 * AI Traffic Command Center - Real-Time Telemetry & Predictive Analytics Charts
 * Hardened with defensive try-catch guards.
 */

export class TelemetryCharts {
  constructor() {
    this.waitChart = null;
    this.congestionChart = null;
    this.initCharts();
  }

  initCharts() {
    if (typeof Chart === 'undefined') {
      setTimeout(() => {
        try { this.initCharts(); } catch (e) {}
      }, 500);
      return;
    }

    try {
      // Configure Chart.js global dark defaults
      Chart.defaults.color = '#94a3b8';
      Chart.defaults.borderColor = 'rgba(51, 65, 85, 0.4)';
      Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

      // 1. Average Wait Time Comparison Chart (AI vs Fixed Baseline)
      const waitCanvas = document.getElementById('waitComparisonChart');
      if (waitCanvas) {
        const ctx = waitCanvas.getContext('2d');
        this.waitChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'AI Adaptive Mode',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 5,
              },
              {
                label: 'Legacy Fixed-Timer Baseline',
                data: [],
                borderColor: '#f59e0b',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.35,
                pointRadius: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { boxWidth: 12, font: { size: 11 } },
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}s wait`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Avg Wait (s)', font: { size: 10 } },
                grid: { color: 'rgba(51, 65, 85, 0.3)' },
              },
              x: {
                grid: { display: false },
                ticks: { maxTicksLimit: 6, font: { size: 9 } },
              },
            },
          },
        });
      }

      // 2. Congestion % & Predictive Horizon Chart
      const congCanvas = document.getElementById('congestionTrendChart');
      if (congCanvas) {
        const ctx = congCanvas.getContext('2d');
        this.congestionChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Live Congestion %',
                data: [],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                pointRadius: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { boxWidth: 12, font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Congestion: ${ctx.parsed.y}%`,
                },
              },
            },
            scales: {
              y: {
                min: 0,
                max: 100,
                title: { display: true, text: 'Congestion %', font: { size: 10 } },
                grid: { color: 'rgba(51, 65, 85, 0.3)' },
              },
              x: {
                grid: { display: false },
                ticks: { maxTicksLimit: 6, font: { size: 9 } },
              },
            },
          },
        });
      }
    } catch (err) {
      console.error('Chart init error:', err);
    }
  }

  /**
   * Update charts with fresh telemetry history from state store
   */
  update(history) {
    if (!history || !history.timestamps) return;

    try {
      if (this.waitChart && history.timestamps.length > 0) {
        this.waitChart.data.labels = [...history.timestamps];
        this.waitChart.data.datasets[0].data = [...history.aiWaitTimes];
        this.waitChart.data.datasets[1].data = [...history.fixedWaitTimes];
        this.waitChart.update('none');
      }

      if (this.congestionChart && history.timestamps.length > 0) {
        this.congestionChart.data.labels = [...history.timestamps];
        this.congestionChart.data.datasets[0].data = [...history.congestionLevels];
        this.congestionChart.update('none');
      }
    } catch (err) {
      console.error('Chart update render error:', err);
    }
  }
}
