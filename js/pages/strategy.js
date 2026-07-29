/* ==========================================================================
   TVU GPA Supporter - Strategy Simulator Controller (js/pages/strategy.js)
   ========================================================================== */

import { getLocalCourses } from '../api.js';
import { calculateTVUGPA, calculateGPAStrategy } from '../calculator.js';
import { getTotalRequiredCredits } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  initStrategySimulator();
});

/**
 * Initialize Target GPA Slider and Scenario calculations
 */
function initStrategySimulator() {
  const courses = getLocalCourses();
  const metrics = calculateTVUGPA(courses);

  const slider = document.getElementById('target-gpa-slider');
  const inputVal = document.getElementById('target-gpa-val');

  if (slider && inputVal) {
    updateStrategyDisplay(metrics.gpa4, metrics.earnedCredits, parseFloat(slider.value));

    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value).toFixed(2);
      inputVal.textContent = val;
      updateStrategyDisplay(metrics.gpa4, metrics.earnedCredits, parseFloat(val));
    });
  }
}

/**
 * Update strategy metrics and graduation honors status
 */
function updateStrategyDisplay(currentGPA, earnedCredits, targetGPA = 3.20) {
  const totalCredits = getTotalRequiredCredits();
  const strategy = calculateGPAStrategy(currentGPA, earnedCredits, targetGPA, totalCredits);

  const elCurGPA = document.getElementById('strategy-current-gpa');
  const elEarnedCredits = document.getElementById('strategy-earned-credits');
  const elRemCredits = document.getElementById('strategy-rem-credits');
  const elReqGPA = document.getElementById('strategy-req-gpa');
  const elStatus = document.getElementById('strategy-status');

  if (elCurGPA) elCurGPA.textContent = currentGPA.toFixed(2);
  if (elEarnedCredits) elEarnedCredits.textContent = `${earnedCredits} TC`;
  if (elRemCredits) elRemCredits.textContent = `${strategy.remainingCredits} TC`;
  if (elReqGPA) elReqGPA.textContent = strategy.requiredGPA > 0 ? strategy.requiredGPA.toFixed(2) : '0.00';
  if (elStatus) {
    elStatus.textContent = strategy.feasibility;
    elStatus.className = `badge ${strategy.badgeClass}`;
  }

  updateHonorsTier(targetGPA);
}

/**
 * Render Graduation Honors Tier
 */
function updateHonorsTier(targetGPA) {
  const elTier = document.getElementById('honors-tier-badge');
  if (!elTier) return;

  if (targetGPA >= 3.60) {
    elTier.textContent = '🏆 Bằng Xuất sắc (GPA ≥ 3.60)';
    elTier.className = 'badge badge-success';
  } else if (targetGPA >= 3.20) {
    elTier.textContent = '🥇 Bằng Giỏi (GPA ≥ 3.20)';
    elTier.className = 'badge badge-info';
  } else if (targetGPA >= 2.50) {
    elTier.textContent = '🥈 Bằng Khá (GPA ≥ 2.50)';
    elTier.className = 'badge badge-warning';
  } else {
    elTier.textContent = '🥉 Bằng Trung bình (GPA ≥ 2.00)';
    elTier.className = 'badge badge-muted';
  }
}
