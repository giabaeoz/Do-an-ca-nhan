/* ==========================================================================
   TVU GPA Supporter - Semester GPA Predictor & Sandbox (js/pages/predict.js)
   ========================================================================== */

import { getLocalCourses, showToast } from '../api.js';
import { calculateTVUGPA, calculateSemesterSummaries, isNonGPACourse } from '../calculator.js';
import { convertGrade10To4, getTotalRequiredCredits } from '../config.js';

let realCourses = [];
let draftCourses = [];
let activeSemesterFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
  initPredictPage();
  initPredictActions();
});

/**
 * Initialize Predict Page: Clone real transcript into draft sandbox state
 */
function initPredictPage() {
  realCourses = getLocalCourses();
  
  // Create deep copy of real courses so sandbox edits never alter real storage
  draftCourses = realCourses.map(c => {
    const nonGPA = isNonGPACourse(c);
    const hasOfficialScore = c.hasGrade || (c.score10 !== null && c.score10 !== undefined && !isNaN(c.score10));
    // If course is non-GPA (SHĐK, letter M), treat as completed/evaluated (isGraded = true)
    const isGraded = hasOfficialScore || nonGPA;
    return {
      ...c,
      isNonGPA: nonGPA,
      isGraded,
      predictedScore10: isGraded ? c.score10 : (c.predictedScore10 !== undefined ? c.predictedScore10 : null)
    };
  });

  // Automatically find first incomplete semester to prioritize as default tab
  autoSelectDefaultSemesterTab();

  renderPredictDashboard();
}

/**
 * Auto-select the first semester that contains un-graded courses (excluding Non-GPA/SHĐK/M)
 */
function autoSelectDefaultSemesterTab() {
  const summaries = calculateSemesterSummaries(draftCourses);
  let firstIncompleteSem = null;

  for (const sem of summaries) {
    const hasUnfinished = sem.courses.some(c => !c.isGraded && !c.isNonGPA);
    if (hasUnfinished) {
      firstIncompleteSem = sem.semester;
      break;
    }
  }

  activeSemesterFilter = firstIncompleteSem ? firstIncompleteSem : 'ALL';
}

/**
 * Render Predict Dashboard: Top KPI comparison cards, Semester Filter Tabs, & Semester Tables
 */
function renderPredictDashboard() {
  const realMetrics = calculateTVUGPA(realCourses);
  const draftMetrics = calculatePredictiveGPA(draftCourses);
  const totalRequiredCredits = getTotalRequiredCredits();

  // 1. Update Top KPI Cards
  const elRealGPA = document.getElementById('predict-real-gpa');
  const elNewGPA = document.getElementById('predict-new-gpa');
  const elDiffPill = document.getElementById('predict-gpa-diff-pill');
  const elCredits = document.getElementById('predict-new-credits');

  if (elRealGPA) elRealGPA.textContent = realMetrics.gpa4.toFixed(2);
  if (elNewGPA) elNewGPA.textContent = draftMetrics.gpa4.toFixed(2);

  if (elDiffPill) {
    const diff = draftMetrics.gpa4 - realMetrics.gpa4;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)} GPA` : `${diff.toFixed(2)} GPA`;
    elDiffPill.textContent = diffStr;
    elDiffPill.className = `badge ${diff >= 0 ? 'badge-success' : 'badge-danger'}`;
  }

  if (elCredits) {
    elCredits.textContent = `${draftMetrics.earnedCredits} / ${totalRequiredCredits} TC`;
  }

  // 2. Render Semester Filter Tabs
  renderPredictSemesterTabs();

  // 3. Render Grouped Semester Tables
  renderPredictSemesterTables();
}

/**
 * Calculate GPA for predictive draft courses (combining official scores + predicted scores)
 */
function calculatePredictiveGPA(coursesArray) {
  const evalCourses = coursesArray.map(c => {
    const activeScore = c.isGraded ? c.score10 : c.predictedScore10;
    if (activeScore !== null && activeScore !== undefined && !isNaN(activeScore)) {
      const g4 = convertGrade10To4(activeScore);
      return {
        ...c,
        score10: activeScore,
        letter: g4.letter,
        scale4: g4.scale4,
        hasGrade: true
      };
    }
    return { ...c };
  });

  return calculateTVUGPA(evalCourses);
}

/**
 * Render Single Semester Selector Dropdown (Prioritizes Incomplete Semesters)
 */
function renderPredictSemesterTabs() {
  const select = document.getElementById('predict-semester-select');
  if (!select) return;

  const summaries = calculateSemesterSummaries(draftCourses);

  let optionsHtml = `
    <option value="ALL" ${activeSemesterFilter === 'ALL' ? 'selected' : ''}>🌐 Tất cả học kỳ (${summaries.length})</option>
  `;

  summaries.forEach(sem => {
    const hasUnfinished = sem.courses.some(c => !c.isGraded && !c.isNonGPA);
    const labelTag = hasUnfinished ? '🟡 [CẦN DỰ ĐOÁN]' : '🟢 [Đã xong]';
    const isSelected = activeSemesterFilter === sem.semester;

    optionsHtml += `
      <option value="${sem.semester}" ${isSelected ? 'selected' : ''}>
        ${labelTag} ${sem.semester}
      </option>
    `;
  });

  select.innerHTML = optionsHtml;

  // Listen to select dropdown change
  select.onchange = (e) => {
    activeSemesterFilter = e.target.value;
    renderPredictSemesterTables();
  };
}

/**
 * Render Grouped Semester Tables with Editable Grade Inputs for Un-graded courses
 */
function renderPredictSemesterTables() {
  const container = document.getElementById('predict-semesters-container');
  if (!container) return;

  if (draftCourses.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2.5rem 1rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
        <h3 style="font-weight: 800;">Chưa có dữ liệu bảng điểm</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.25rem;">Vui lòng nhập điểm Portal hoặc tải dữ liệu để bắt đầu dự đoán GPA.</p>
        <a href="import.html" class="btn btn-primary" style="display: inline-flex;">📥 Nhập điểm ngay</a>
      </div>
    `;
    return;
  }

  // Calculate real summaries and predictive summaries per semester
  const realSummaries = calculateSemesterSummaries(realCourses);
  
  // Calculate predictive summaries with current draft scores
  const evalDraftCourses = draftCourses.map(c => {
    const activeScore = c.isGraded ? c.score10 : c.predictedScore10;
    if (activeScore !== null && activeScore !== undefined && !isNaN(activeScore)) {
      const g4 = convertGrade10To4(activeScore);
      return {
        ...c,
        score10: activeScore,
        letter: g4.letter,
        scale4: g4.scale4,
        hasGrade: true
      };
    }
    return { ...c };
  });

  const predictiveSummaries = calculateSemesterSummaries(evalDraftCourses);

  const realSemMap = {};
  realSummaries.forEach(s => { realSemMap[s.semester] = s; });

  // Filter semesters based on activeSemesterFilter
  const displaySummaries = activeSemesterFilter === 'ALL'
    ? predictiveSummaries
    : predictiveSummaries.filter(s => s.semester === activeSemesterFilter);

  if (displaySummaries.length === 0) {
    container.innerHTML = `<div class="card" style="text-align: center; padding: 2rem;">Không tìm thấy học kỳ đã chọn.</div>`;
    return;
  }

  let html = '';

  displaySummaries.forEach(sem => {
    const realSem = realSemMap[sem.semester] || { semGPA4: 0, semCredits: 0 };
    const semGPA4Diff = sem.semGPA4 - realSem.semGPA4;
    const semDiffStr = semGPA4Diff >= 0 ? `(+${semGPA4Diff.toFixed(2)})` : `(${semGPA4Diff.toFixed(2)})`;
    const semDiffColor = semGPA4Diff >= 0 ? 'var(--success)' : 'var(--danger)';

    const hasUnfinished = sem.courses.some(c => !c.isGraded && !c.isNonGPA);

    html += `
      <div class="card semester-card" style="margin-bottom: 1.5rem; padding: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary); display: inline-flex; align-items: center; gap: 0.4rem;">
              <svg class="svg-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              ${sem.semester.toUpperCase()}
            </h3>
            ${hasUnfinished 
              ? `<span class="badge badge-warning" style="font-size: 0.75rem; font-weight: 700;">Cần dự đoán</span>` 
              : `<span class="badge badge-success" style="font-size: 0.75rem; font-weight: 700;">Đã có điểm</span>`}
          </div>
          <span class="badge badge-secondary" style="font-weight: 700;">${sem.courses.length} Học phần</span>
        </div>

        <!-- Clean Streamlined Table -->
        <div class="table-responsive" style="overflow-x: auto;">
          <table class="grades-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-main); text-align: left; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 0.6rem 0.75rem;">Học phần & Tín chỉ</th>
                <th style="padding: 0.6rem 0.75rem; text-align: center;">Điểm gốc</th>
                <th style="padding: 0.6rem 0.75rem; text-align: center; width: 180px;">Điểm 10 Dự đoán</th>
                <th style="padding: 0.6rem 0.75rem; text-align: center;">Hệ 4</th>
                <th style="padding: 0.6rem 0.75rem; text-align: center; width: 40px;"></th>
              </tr>
            </thead>
            <tbody>
    `;

    sem.courses.forEach((c) => {
      const isNonGPA = c.isNonGPA || isNonGPACourse(c);
      const isCompleted = c.isGraded || isNonGPA;
      const currentScoreVal = isCompleted
        ? (c.score10 !== null && c.score10 !== undefined ? c.score10.toFixed(1) : (c.letter || 'M'))
        : (c.predictedScore10 !== null && c.predictedScore10 !== undefined ? c.predictedScore10 : '');

      const currentLetter = c.letter || (isNonGPA ? 'M' : '-');
      const currentScale4 = c.scale4 !== null && c.scale4 !== undefined ? c.scale4.toFixed(1) : '-';

      html += `
        <tr style="border-bottom: 1px solid var(--border); font-size: 0.88rem;" data-id="${c.id}" data-sem="${sem.semester}">
          <td style="padding: 0.75rem;">
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${c.name}</div>
            <div style="display: flex; gap: 0.4rem; align-items: center; margin-top: 0.2rem;">
              <span style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${c.code || '-'}</span>
              <span class="badge badge-secondary" style="font-size: 0.72rem; padding: 0.1rem 0.35rem;">${c.credits} TC</span>
            </div>
          </td>
          
          <td style="padding: 0.75rem; text-align: center;">
            ${isNonGPA 
              ? `<span class="badge badge-secondary" style="font-weight: 700;">🔒 Miễn học (${c.letter || 'M'})</span>`
              : (isCompleted 
                ? `<span class="badge badge-success" style="font-weight: 700;">🔒 ${c.score10.toFixed(1)} (${c.letter})</span>` 
                : `<span class="badge badge-secondary" style="font-size: 0.75rem; opacity: 0.8;">Chưa có</span>`)}
          </td>
          
          <td style="padding: 0.75rem; text-align: center;">
            ${isCompleted ? `
              <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">🔒 ${isNonGPA ? 'Không tính GPA' : 'Đã có điểm gốc'}</span>
            ` : `
              <div style="display: inline-flex; align-items: center; gap: 0.4rem;">
                <input type="number" 
                       class="form-input predict-score-input" 
                       data-id="${c.id}" 
                       value="${currentScoreVal}" 
                       placeholder="Nhập 0-10" 
                       min="0" 
                       max="10" 
                       step="any" 
                       lang="en"
                       style="width: 90px; text-align: center; padding: 0.35rem 0.4rem; font-weight: 800; color: var(--primary); border: 2px solid var(--primary); border-radius: var(--radius-sm);">
                <span class="badge ${getLetterBadgeClass(currentLetter)}" id="letter-badge-${c.id}" style="min-width: 28px; text-align: center;">${currentLetter}</span>
              </div>
            `}
          </td>

          <td style="padding: 0.75rem; text-align: center; font-weight: 800;" id="scale4-text-${c.id}">
            ${currentScale4}
          </td>

          <td style="padding: 0.75rem; text-align: center;">
            ${c.isCustomPredict ? `<button type="button" class="btn btn-secondary btn-sm btn-delete-predict-course" data-id="${c.id}" style="padding: 0.25rem 0.45rem; color: var(--danger);" title="Xóa môn này"><svg class="svg-icon" style="width: 0.9rem; height: 0.9rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : ''}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <!-- Clean 1-Line Semester Summary Footer -->
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;" id="sem-footer-${sem.semester.replace(/\s+/g, '_')}">
          <div style="font-size: 0.88rem; color: var(--text-muted);">
            GPA HK Thực tế: <b style="color: var(--text-main);">${realSem.semGPA4.toFixed(2)}</b> • Tổng tín chỉ: <b>${sem.semCredits} TC</b>
          </div>
          <div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">
            GPA HK Dự đoán: <span style="color: var(--primary); font-size: 1.15rem;" id="sem-gpa-${sem.semester.replace(/\s+/g, '_')}">${sem.semGPA4.toFixed(2)}</span>
            <span style="color: ${semDiffColor}; font-size: 0.85rem; margin-left: 0.25rem;" id="sem-diff-${sem.semester.replace(/\s+/g, '_')}">${semDiffStr}</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Attach real-time input event listeners for prediction inputs
  const inputs = container.querySelectorAll('.predict-score-input');
  inputs.forEach(inp => {
    inp.addEventListener('input', (e) => handleScoreInputChange(e));
    inp.addEventListener('change', (e) => handleScoreInputChange(e));
  });

  // Attach delete buttons for custom added prediction courses
  const deleteBtns = container.querySelectorAll('.btn-delete-predict-course');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      draftCourses = draftCourses.filter(c => c.id !== id);
      renderPredictDashboard();
      showToast('Đã xóa môn dự đoán khỏi danh sách bản nháp.', 'info');
    });
  });
}

/**
 * Handle real-time prediction score input change without losing input focus
 */
function handleScoreInputChange(e) {
  const courseId = e.target.getAttribute('data-id');
  let valStr = e.target.value.trim().replace(',', '.');

  const course = draftCourses.find(c => c.id === courseId);
  if (!course || course.isGraded) return;

  if (valStr === '' || isNaN(valStr)) {
    course.predictedScore10 = null;
  } else {
    const val = Math.max(0, Math.min(10, parseFloat(valStr)));
    course.predictedScore10 = val;
  }

  // Update DOM elements directly for this row so input focus is NOT destroyed while typing decimals
  const activeScore = course.predictedScore10;
  let letter = '-';
  let scale4Text = '-';

  if (activeScore !== null && !isNaN(activeScore)) {
    const g4 = convertGrade10To4(activeScore);
    letter = g4.letter;
    scale4Text = g4.scale4.toFixed(1);
  }

  const elBadge = document.getElementById(`letter-badge-${courseId}`);
  const elScale4 = document.getElementById(`scale4-text-${courseId}`);

  if (elBadge) {
    elBadge.textContent = letter;
    elBadge.className = `badge ${getLetterBadgeClass(letter)}`;
  }
  if (elScale4) {
    elScale4.textContent = scale4Text;
  }

  // Update Top KPI Cards & Semester Summaries
  const realMetrics = calculateTVUGPA(realCourses);
  const draftMetrics = calculatePredictiveGPA(draftCourses);
  const totalRequiredCredits = getTotalRequiredCredits();

  const elNewGPA = document.getElementById('predict-new-gpa');
  const elDiffPill = document.getElementById('predict-gpa-diff-pill');
  const elCredits = document.getElementById('predict-new-credits');

  if (elNewGPA) elNewGPA.textContent = draftMetrics.gpa4.toFixed(2);
  if (elDiffPill) {
    const diff = draftMetrics.gpa4 - realMetrics.gpa4;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)} GPA` : `${diff.toFixed(2)} GPA`;
    elDiffPill.textContent = diffStr;
    elDiffPill.className = `badge ${diff >= 0 ? 'badge-success' : 'badge-danger'}`;
  }
  if (elCredits) {
    elCredits.textContent = `${draftMetrics.earnedCredits} / ${totalRequiredCredits} TC`;
  }

  // Update semester footer text in DOM
  const semKey = course.semester ? course.semester.replace(/\s+/g, '_') : '';
  const elSemGPA = document.getElementById(`sem-gpa-${semKey}`);
  const elSemDiff = document.getElementById(`sem-diff-${semKey}`);

  if (elSemGPA || elSemDiff) {
    const realSummaries = calculateSemesterSummaries(realCourses);
    const evalDraftCourses = draftCourses.map(c => {
      const s = c.isGraded ? c.score10 : c.predictedScore10;
      if (s !== null && s !== undefined && !isNaN(s)) {
        const g4 = convertGrade10To4(s);
        return { ...c, score10: s, letter: g4.letter, scale4: g4.scale4, hasGrade: true };
      }
      return { ...c };
    });
    const predictiveSummaries = calculateSemesterSummaries(evalDraftCourses);
    const semSum = predictiveSummaries.find(s => s.semester === course.semester);
    const realSem = realSummaries.find(s => s.semester === course.semester) || { semGPA4: 0 };

    if (semSum) {
      if (elSemGPA) elSemGPA.textContent = semSum.semGPA4.toFixed(2);
      if (elSemDiff) {
        const d = semSum.semGPA4 - realSem.semGPA4;
        elSemDiff.textContent = d >= 0 ? `(+${d.toFixed(2)})` : `(${d.toFixed(2)})`;
        elSemDiff.style.color = d >= 0 ? 'var(--success)' : 'var(--danger)';
      }
    }
  }
}

/**
 * Initialize Reset Button & Add Course Modal
 */
function initPredictActions() {
  const btnReset = document.getElementById('btn-reset-predict');
  const btnAddModal = document.getElementById('btn-add-predict-course');
  const modal = document.getElementById('modal-add-predict-course');
  const btnCloseModal = document.getElementById('btn-close-predict-modal');
  const formAdd = document.getElementById('form-add-predict-course');

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      initPredictPage();
      showToast('Đã khôi phục toàn bộ bản nháp dự đoán về trạng thái gốc!', 'success');
    });
  }

  if (btnAddModal && modal) {
    btnAddModal.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }

  if (btnCloseModal && modal) {
    btnCloseModal.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (formAdd && modal) {
    formAdd.addEventListener('submit', (e) => {
      e.preventDefault();

      const semester = document.getElementById('modal-predict-sem').value;
      const code = document.getElementById('modal-predict-code').value.trim() || 'PRED' + Math.floor(Math.random() * 1000);
      const name = document.getElementById('modal-predict-name').value.trim();
      const credits = parseFloat(document.getElementById('modal-predict-credits').value) || 3;
      const score10 = parseFloat(document.getElementById('modal-predict-score').value);

      if (!name) {
        showToast('Vui lòng nhập tên môn học dự đoán!', 'danger');
        return;
      }

      const newPredictCourse = {
        id: 'predict_' + Date.now(),
        code,
        name,
        credits,
        isGraded: false,
        predictedScore10: score10,
        score10: null,
        letter: null,
        scale4: null,
        semester,
        isCustomPredict: true
      };

      draftCourses.push(newPredictCourse);
      modal.classList.remove('active');
      formAdd.reset();

      activeSemesterFilter = semester;
      renderPredictDashboard();
      showToast(`Đã thêm môn "${name}" vào học kỳ ${semester} để dự đoán!`, 'success');
    });
  }
}

/**
 * Return CSS Badge Class based on letter grade
 */
function getLetterBadgeClass(letter) {
  if (!letter) return 'badge-secondary';
  const l = letter.toUpperCase();
  if (l === 'A') return 'badge-success';
  if (l === 'B+' || l === 'B') return 'badge-primary';
  if (l === 'C+' || l === 'C') return 'badge-warning';
  if (l === 'F') return 'badge-danger';
  return 'badge-secondary';
}
