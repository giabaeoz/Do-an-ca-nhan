import { getLocalCourses, saveGrades, fetchGrades, showToast } from '../api.js';
import { calculateTVUGPA, calculateSemesterSummaries, sortSemestersNewestFirst } from '../calculator.js';

let allCourses = [];
let activeSemesterFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  allCourses = await fetchGrades();
  renderGradesPage();
  initCourseModal();
});

/**
 * Main render method for Grades page
 */
function renderGradesPage() {
  const result = calculateTVUGPA(allCourses);
  renderSemesterTabs(result.annotatedCourses);
  renderGradesTable(result.annotatedCourses);
}

/**
 * Render semester filter tabs (Newest First)
 */
function renderSemesterTabs(courses) {
  const container = document.getElementById('semester-tabs');
  if (!container) return;

  const rawSemesters = Array.from(new Set(courses.map(c => c.semester || 'Học kỳ 1')));
  const semesters = sortSemestersNewestFirst(rawSemesters);
  
  container.innerHTML = `
    <button class="semester-tab ${activeSemesterFilter === 'ALL' ? 'active' : ''}" data-sem="ALL">Tất cả học kỳ</button>
    ${semesters.map(sem => `
      <button class="semester-tab ${activeSemesterFilter === sem ? 'active' : ''}" data-sem="${sem}">${sem}</button>
    `).join('')}
  `;

  container.querySelectorAll('.semester-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      activeSemesterFilter = e.target.getAttribute('data-sem');
      renderGradesPage();
    });
  });
}

/**
 * Render detailed transcript table (Newest First, Card Layout, 100% Fit Width)
 */
function renderGradesTable(courses) {
  const container = document.getElementById('grades-container');
  if (!container) return;

  if (!courses || courses.length === 0) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 3rem; text-align: center; color: var(--text-muted);">
        Chưa có môn học nào trong bảng điểm. Hãy qua trang <a href="import.html" style="color: var(--primary); font-weight: 700;">Nhập điểm</a> hoặc bấm <b>Thêm môn học</b> bên trên!
      </div>
    `;
    return;
  }

  const filtered = activeSemesterFilter === 'ALL' 
    ? courses 
    : courses.filter(c => (c.semester || 'Học kỳ 1') === activeSemesterFilter);

  const semesterSummaries = calculateSemesterSummaries(filtered);
  let html = '';

  semesterSummaries.forEach(summary => {
    html += `
      <div class="semester-card">
        <div class="semester-card-header">
          <div class="sem-header-title">
            <span class="sem-icon">📅</span>
            <h3>${summary.semester}</h3>
          </div>
          <span class="sem-course-count">${summary.courses.length} môn học</span>
        </div>

        <div class="semester-table-wrapper">
          <table class="grades-table">
            <thead>
              <tr>
                <th style="width: 12%;">Mã HP</th>
                <th style="width: 36%;">Tên môn học</th>
                <th style="width: 8%;">Số TC</th>
                <th style="width: 10%;">Điểm 10</th>
                <th style="width: 12%;">Điểm Chữ</th>
                <th style="width: 13%;">Trạng thái</th>
                <th style="width: 9%; text-align: right;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
    `;

    summary.courses.forEach((c) => {
      const scale4 = c.scale4 !== null && c.scale4 !== undefined ? c.scale4 : '-';
      const score10 = c.score10 !== null && c.score10 !== undefined ? c.score10 : '-';

      let statusBadge = '';
      if (!c.letter && c.score10 === null) {
        statusBadge = `<span class="badge badge-secondary">Đã đăng ký</span>`;
      } else if (c.isRetaken) {
        statusBadge = `<span class="badge badge-warning">Học lại</span>`;
      } else if (c.isNonGPA) {
        statusBadge = `<span class="badge badge-info" title="Học phần không tính điểm GPA">Không tính GPA</span>`;
      } else if (c.isExempt) {
        statusBadge = `<span class="badge badge-info">Miễn (M)</span>`;
      } else if (scale4 !== '-' && scale4 >= 1.0) {
        statusBadge = `<span class="badge badge-success">Đạt</span>`;
      } else {
        statusBadge = `<span class="badge badge-danger">Không đạt (F)</span>`;
      }

      html += `
        <tr class="${c.isRetaken ? 'is-retaken' : ''}">
          <td class="col-code">${c.code || '-'}</td>
          <td class="col-name course-name">${c.name}</td>
          <td class="col-credits">${c.credits} TC</td>
          <td class="col-score10"><b>${score10}</b></td>
          <td class="col-letter"><b>${c.letter || '-'}</b> ${scale4 !== '-' ? `(${scale4})` : ''}</td>
          <td class="col-status">${statusBadge}</td>
          <td class="col-actions">
            <button class="btn btn-secondary btn-sm btn-icon btn-edit-course" data-id="${c.id}" title="Sửa">✏️</button>
            <button class="btn btn-secondary btn-sm btn-icon btn-delete-course" data-id="${c.id}" title="Xóa" style="color: var(--danger);">🗑️</button>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <div class="sem-summary-footer">
          <div class="sem-kpi-card">
            <span class="sem-kpi-lbl">TÍN CHỈ HỌC KỲ</span>
            <span class="sem-kpi-val">${summary.semCredits} <small>TC</small></span>
          </div>

          <div class="sem-kpi-card sem-kpi-highlight-hk">
            <span class="sem-kpi-lbl">GPA HỌC KỲ</span>
            <div class="sem-kpi-gpa-group">
              <div class="gpa-pill primary">
                <span class="gpa-pill-val">${summary.semGPA4}</span>
                <span class="gpa-pill-scale">Hệ 4</span>
              </div>
              <div class="gpa-pill secondary">
                <span class="gpa-pill-val">${summary.semGPA10}</span>
                <span class="gpa-pill-scale">Hệ 10</span>
              </div>
            </div>
          </div>

          <div class="sem-kpi-card">
            <span class="sem-kpi-lbl">LŨY KẾ TÍCH LŨY</span>
            <span class="sem-kpi-val">${summary.cumCredits} <small>TC</small></span>
          </div>

          <div class="sem-kpi-card sem-kpi-highlight-cum">
            <span class="sem-kpi-lbl">GPA LŨY TIẾN TÍCH LŨY</span>
            <div class="sem-kpi-gpa-group">
              <div class="gpa-pill success">
                <span class="gpa-pill-val">${summary.cumGPA4}</span>
                <span class="gpa-pill-scale">Hệ 4</span>
              </div>
              <div class="gpa-pill secondary">
                <span class="gpa-pill-val">${summary.cumGPA10}</span>
                <span class="gpa-pill-scale">Hệ 10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-edit-course').forEach(btn => {
    btn.addEventListener('click', () => editCourse(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.btn-delete-course').forEach(btn => {
    btn.addEventListener('click', () => deleteCourse(btn.getAttribute('data-id')));
  });
}

/**
 * Course Modal Handlers
 */
function initCourseModal() {
  const modal = document.getElementById('course-modal');
  const btnAdd = document.getElementById('btn-add-course');
  const btnClose = document.getElementById('btn-close-modal');
  const form = document.getElementById('course-form');

  if (btnAdd && modal) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('course-id').value = '';
      document.getElementById('modal-title-text').textContent = 'Thêm môn học mới';
      modal.classList.add('active');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('course-id').value;
      const code = document.getElementById('course-code').value.trim();
      const name = document.getElementById('course-name').value.trim();
      const credits = parseInt(document.getElementById('course-credits').value) || 3;
      const letter = document.getElementById('course-letter').value.trim();
      const score10Input = document.getElementById('course-score10').value;
      const semester = document.getElementById('course-semester').value.trim();

      const score10 = score10Input !== '' ? parseFloat(score10Input) : null;

      if (!name) {
        showToast('Vui lòng nhập tên môn học!', 'danger');
        return;
      }

      if (id) {
        const index = allCourses.findIndex(c => c.id === id);
        if (index !== -1) {
          allCourses[index] = { ...allCourses[index], code, name, credits, letter, score10, semester };
        }
      } else {
        allCourses.push({
          id: 'crs_' + Math.random().toString(36).substring(2, 9),
          code,
          name,
          credits,
          letter,
          score10,
          semester: semester || 'Học kỳ 1',
          createdAt: new Date().toISOString()
        });
      }

      // Auto-sync to Supabase & LocalStorage
      await saveGrades(allCourses);
      showToast('Đã lưu môn học thành công!', 'success');
      modal.classList.remove('active');
      renderGradesPage();
    });
  }
}

function editCourse(id) {
  const course = allCourses.find(c => c.id === id);
  if (!course) return;

  document.getElementById('course-id').value = course.id;
  document.getElementById('course-code').value = course.code || '';
  document.getElementById('course-name').value = course.name || '';
  document.getElementById('course-credits').value = course.credits || 3;
  document.getElementById('course-letter').value = course.letter || 'B';
  document.getElementById('course-score10').value = course.score10 !== null && course.score10 !== undefined ? course.score10 : '';
  document.getElementById('course-semester').value = course.semester || 'Học kỳ 1';

  document.getElementById('modal-title-text').textContent = 'Chỉnh sửa môn học';
  document.getElementById('course-modal').classList.add('active');
}

async function deleteCourse(id) {
  allCourses = allCourses.filter(c => c.id !== id);
  await saveGrades(allCourses);
  showToast('Đã xóa môn học!', 'success');
  renderGradesPage();
}
