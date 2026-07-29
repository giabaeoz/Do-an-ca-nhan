/* ==========================================================================
   TVU GPA Supporter - Home Dashboard Controller (js/pages/index.js)
   ========================================================================== */

import { getLocalCourses, showToast } from '../api.js';
import { calculateTVUGPA, calculateSemesterSummaries, calculateSimulatedGPA } from '../calculator.js';
import { getTotalRequiredCredits, setTotalRequiredCredits } from '../config.js';

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

    semGPAChartInstance = new window.Chart(canvasSemGPA, {
      type: 'bar',
      data: {
        labels: semLabels.length > 0 ? semLabels : ['Chưa có dữ liệu'],
        datasets: [{
          label: 'GPA Học kỳ (Hệ 4)',
          data: semGPAData.length > 0 ? semGPAData : [0],
          backgroundColor: 'rgba(2, 132, 199, 0.85)',
          borderColor: '#0284c7',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 4.0,
            ticks: { stepSize: 0.5 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // --- 2. Bar Chart: Credits Earned Per Semester ---
  const canvasCredits = document.getElementById('chart-semester-credits');
  if (canvasCredits) {
    if (creditsChartInstance) creditsChartInstance.destroy();

    creditsChartInstance = new window.Chart(canvasCredits, {
      type: 'bar',
      data: {
        labels: semLabels.length > 0 ? semLabels : ['Chưa có dữ liệu'],
        datasets: [{
          label: 'Số Tín chỉ đạt',
          data: semCreditsData.length > 0 ? semCreditsData : [0],
          backgroundColor: '#6366f1',
          borderColor: '#4f46e5',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 5 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // --- 3. Line Chart: Semester GPA Trend ---
  const canvasTrend = document.getElementById('chart-gpa-trend');
  if (canvasTrend) {
    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new window.Chart(canvasTrend, {
      type: 'line',
      data: {
        labels: semLabels.length > 0 ? semLabels : ['Chưa có dữ liệu'],
        datasets: [
          {
            label: 'GPA Học kỳ (Hệ 4)',
            data: semGPAData.length > 0 ? semGPAData : [0],
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 5
          },
          {
            label: 'GPA Lũy tiến (Hệ 4)',
            data: cumGPAData.length > 0 ? cumGPAData : [0],
            borderColor: '#6366f1',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 4.0,
            ticks: { stepSize: 0.5 }
          }
        },
        plugins: {
          legend: { position: 'bottom' }
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

    distChartInstance = new window.Chart(canvasDist, {
      type: 'doughnut',
      data: {
        labels: distLabels.length > 0 ? distLabels : ['Chưa có môn đã chấm điểm'],
        datasets: [{
          data: distData.length > 0 ? distData : [1],
          backgroundColor: bgColors.length > 0 ? bgColors : ['#e2e8f0'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
  }
}


