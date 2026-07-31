/* ==========================================================================
   TVU GPA Supporter - Home Dashboard Controller (js/pages/index.js)
   ========================================================================== */

import { getLocalCourses, showToast, getCurrentUser } from '../api.js';
import { calculateTVUGPA, calculateSemesterSummaries, calculateSimulatedGPA } from '../calculator.js';
import { getTotalRequiredCredits, setTotalRequiredCredits } from '../config.js';
import { openAuthModal } from '../layout.js';

let semGPAChartInstance = null;
let creditsChartInstance = null;
let trendChartInstance = null;
let distChartInstance = null;

let currentMetricsCache = { earnedCredits: 0, gpa4: 0 };

document.addEventListener('DOMContentLoaded', () => {
  initTotalCreditsSetting();
  renderDashboard();
  initWhatIfCalculator();
});

// Robust auto-popup for login gate
setTimeout(async () => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      openAuthModal('login');
    }
  } catch (e) {
    openAuthModal('login');
  }
}, 600);

/**
 * Initialize Major Total Credits Input & Save Handler
 */
function initTotalCreditsSetting() {
  const input = document.getElementById('total-credits-input');
  const btnSave = document.getElementById('btn-save-total-credits');

  if (input) {
    input.value = getTotalRequiredCredits();
  }

  if (btnSave && input) {
    btnSave.addEventListener('click', () => {
      const val = parseInt(input.value);
      if (!val || val < 30 || val > 300) {
        showToast('Vui lòng nhập số tín chỉ hợp lệ (30 - 300)!', 'danger');
        return;
      }
      setTotalRequiredCredits(val);
      showToast(`Đã lưu tổng tín chỉ ngành học: ${val} Tín chỉ`, 'success');
      renderDashboard();
    });
  }
}

/**
 * Render Dashboard KPI cards, progress bar, and Chart.js analytics
 */
export function renderDashboard() {
  const courses = getLocalCourses();
  const metrics = calculateTVUGPA(courses);
  const totalRequiredCredits = getTotalRequiredCredits();

  currentMetricsCache = {
    earnedCredits: metrics.earnedCredits,
    gpa4: metrics.gpa4
  };

  // 1. Update Top KPI Cards
  const elGPA4 = document.getElementById('metric-gpa4');
  const elGPA10 = document.getElementById('metric-gpa10');
  const elCredits = document.getElementById('metric-credits');
  const elSub = document.getElementById('metric-credits-sub');

  if (elGPA4) elGPA4.textContent = metrics.gpa4.toFixed(2);
  if (elGPA10) elGPA10.textContent = metrics.gpa10.toFixed(2);
  if (elCredits) elCredits.textContent = `${metrics.earnedCredits} / ${totalRequiredCredits}`;
  if (elSub) elSub.textContent = `Tích lũy / Yêu cầu (${totalRequiredCredits} TC)`;

  // 2. Update Progress Bar
  const pct = Math.min(100, Math.round((metrics.earnedCredits / totalRequiredCredits) * 100));
  const elFill = document.getElementById('progress-fill');
  const elText = document.getElementById('progress-text');

  if (elFill) elFill.style.width = `${pct}%`;
  if (elText) elText.textContent = `${pct}% (${metrics.earnedCredits}/${totalRequiredCredits} Tín chỉ)`;

  // 3. Render Chart.js Analytics
  renderCharts(courses, metrics.annotatedCourses);

  // 4. Recalculate What-if Simulator
  updateWhatIfCalculation();
}

/**
 * Render Chart.js instances:
 * - Bar Chart for Semester GPA (Hệ 4)
 * - Bar Chart for Credits Earned Per Semester
 * - Line Chart for Semester GPA Trend
 * - Doughnut Chart for Grade Distribution
 */
function renderCharts(courses, annotatedCourses) {
  if (typeof window.Chart === 'undefined') {
    console.warn('Chart.js library is not loaded');
    return;
  }

  const summaries = calculateSemesterSummaries(courses);
  const chronologicalSummaries = [...summaries].reverse();
  const semLabels = chronologicalSummaries.map(s => s.semester);
  const semCreditsData = chronologicalSummaries.map(s => s.semCredits);
  const semGPAData = chronologicalSummaries.map(s => s.semGPA4);
  const cumGPAData = chronologicalSummaries.map(s => s.cumGPA4);

  // --- 1. Bar Chart: Semester GPA (Hệ 4) ---
  const canvasSemGPA = document.getElementById('chart-semester-gpa');
  if (canvasSemGPA) {
    if (semGPAChartInstance) semGPAChartInstance.destroy();

    const ctxBar1 = canvasSemGPA.getContext('2d');
    const gradBar1 = ctxBar1.createLinearGradient(0, 0, 0, canvasSemGPA.offsetHeight || 260);
    gradBar1.addColorStop(0, 'rgba(2, 132, 199, 0.85)');
    gradBar1.addColorStop(1, 'rgba(2, 132, 199, 0.35)');

    const hasBar1 = semGPAData.length > 0;

    semGPAChartInstance = new window.Chart(canvasSemGPA, {
      type: 'bar',
      data: {
        labels: hasBar1 ? semLabels : ['Chưa có dữ liệu'],
        datasets: [{
          label: 'GPA học kỳ',
          data: hasBar1 ? semGPAData : [0],
          backgroundColor: gradBar1,
          borderColor: '#0284c7',
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11, weight: '600' }, color: '#64748b', maxRotation: 30 }
          },
          y: {
            min: 0,
            max: 4.0,
            border: { display: false, dash: [4, 4] },
            grid: { color: 'rgba(148, 163, 184, 0.18)', drawTicks: false },
            ticks: {
              stepSize: 0.5,
              font: { size: 11, weight: '600' },
              color: '#64748b',
              padding: 8,
              callback: (v) => v.toFixed(1)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (item) => `  GPA học kỳ: ${Number(item.raw).toFixed(2)}`
            }
          }
        }
      }
    });
  }

  // --- 2. Bar Chart: Credits Earned Per Semester ---
  const canvasCredits = document.getElementById('chart-semester-credits');
  if (canvasCredits) {
    if (creditsChartInstance) creditsChartInstance.destroy();

    const ctxBar2 = canvasCredits.getContext('2d');
    const gradBar2 = ctxBar2.createLinearGradient(0, 0, 0, canvasCredits.offsetHeight || 260);
    gradBar2.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
    gradBar2.addColorStop(1, 'rgba(99, 102, 241, 0.35)');

    const hasBar2 = semCreditsData.length > 0;

    creditsChartInstance = new window.Chart(canvasCredits, {
      type: 'bar',
      data: {
        labels: hasBar2 ? semLabels : ['Chưa có dữ liệu'],
        datasets: [{
          label: 'Tín chỉ đạt',
          data: hasBar2 ? semCreditsData : [0],
          backgroundColor: gradBar2,
          borderColor: '#6366f1',
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11, weight: '600' }, color: '#64748b', maxRotation: 30 }
          },
          y: {
            beginAtZero: true,
            border: { display: false, dash: [4, 4] },
            grid: { color: 'rgba(148, 163, 184, 0.18)', drawTicks: false },
            ticks: {
              stepSize: 5,
              font: { size: 11, weight: '600' },
              color: '#64748b',
              padding: 8
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (item) => `  Tín chỉ đạt: ${item.raw} TC`
            }
          }
        }
      }
    });
  }


  // --- 3. Line Chart: Semester GPA Trend (Redesigned) ---
  const canvasTrend = document.getElementById('chart-gpa-trend');
  if (canvasTrend) {
    if (trendChartInstance) trendChartInstance.destroy();

    const ctx = canvasTrend.getContext('2d');

    // Gradient fill cho GPA hoc ky
    const gradientSem = ctx.createLinearGradient(0, 0, 0, canvasTrend.offsetHeight || 260);
    gradientSem.addColorStop(0, 'rgba(2, 132, 199, 0.22)');
    gradientSem.addColorStop(1, 'rgba(2, 132, 199, 0)');

    // Gradient fill cho GPA luy tien
    const gradientCum = ctx.createLinearGradient(0, 0, 0, canvasTrend.offsetHeight || 260);
    gradientCum.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
    gradientCum.addColorStop(1, 'rgba(99, 102, 241, 0)');

    const hasData = semGPAData.length > 0;

    trendChartInstance = new window.Chart(canvasTrend, {
      type: 'line',
      data: {
        labels: hasData ? semLabels : ['Chưa có dữ liệu'],
        datasets: [
          {
            label: 'GPA học kỳ',
            data: hasData ? semGPAData : [0],
            borderColor: '#0284c7',
            backgroundColor: gradientSem,
            fill: true,
            tension: 0.42,
            borderWidth: 2.5,
            pointBackgroundColor: '#0284c7',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#0284c7',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2.5
          },
          {
            label: 'GPA lũy tiến',
            data: hasData ? cumGPAData : [0],
            borderColor: '#6366f1',
            backgroundColor: gradientCum,
            fill: true,
            tension: 0.42,
            borderWidth: 2,
            borderDash: [6, 3],
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#6366f1',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              font: { size: 11, weight: '600' },
              color: '#64748b',
              maxRotation: 30
            }
          },
          y: {
            min: 0,
            max: 4.0,
            border: {
              display: false,
              dash: [4, 4]
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.18)',
              drawTicks: false
            },
            ticks: {
              stepSize: 0.5,
              font: { size: 11, weight: '600' },
              color: '#64748b',
              padding: 8,
              callback: (v) => v.toFixed(1)
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: { size: 12, weight: '600' },
              color: '#475569',
              boxWidth: 8,
              boxHeight: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            callbacks: {
              title: (items) => items[0]?.label || '',
              label: (item) => {
                const val = typeof item.raw === 'number' ? item.raw.toFixed(2) : item.raw;
                return `  ${item.dataset.label}: ${val}`;
              }
            }
          }
        }
      }
    });
  }


  // --- 4. Doughnut Chart: Grade Distribution ---
  const gradeCounts = { 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D+': 0, 'D': 0, 'F': 0, 'M': 0 };

  annotatedCourses.forEach(c => {
    if (c.isRetaken) return;
    if (!c.hasGrade && !c.letter && c.score10 === null) return;
    if (!c.letter && c.score10 === null) return;

    const l = (c.letter || '').toUpperCase().trim();
    if (gradeCounts[l] !== undefined) {
      gradeCounts[l]++;
    }
  });

  const distLabels = Object.keys(gradeCounts).filter(k => gradeCounts[k] > 0);
  const distData = distLabels.map(k => gradeCounts[k]);

  const colorMap = {
    'A': '#10b981', 'B+': '#0284c7', 'B': '#38bdf8', 'C+': '#f59e0b',
    'C': '#fbbf24', 'D+': '#f97316', 'D': '#ef4444', 'F': '#dc2626', 'M': '#6366f1'
  };
  const bgColors = distLabels.map(k => colorMap[k] || '#94a3b8');

  const canvasDist = document.getElementById('chart-grade-dist');
  if (canvasDist) {
    if (distChartInstance) distChartInstance.destroy();

    const hasDist = distLabels.length > 0;
    const total = distData.reduce((s, v) => s + v, 0);

    distChartInstance = new window.Chart(canvasDist, {
      type: 'doughnut',
      data: {
        labels: hasDist ? distLabels : ['Chưa có dữ liệu'],
        datasets: [{
          data: hasDist ? distData : [1],
          backgroundColor: hasDist ? bgColors : ['#e2e8f0'],
          borderColor: '#ffffff',
          borderWidth: 2.5,
          hoverBorderColor: '#ffffff',
          hoverBorderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14,
              font: { size: 12, weight: '600' },
              color: '#475569',
              boxWidth: 9,
              boxHeight: 9,
              generateLabels: (chart) => {
                const data = chart.data;
                if (!data.labels.length) return [];
                return data.labels.map((label, i) => ({
                  text: `${label}  (${data.datasets[0].data[i]})`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].backgroundColor[i],
                  pointStyle: 'circle',
                  index: i
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (item) => {
                const val = item.raw;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return `  ${item.label}: ${val} môn (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}


