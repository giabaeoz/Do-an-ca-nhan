/* ==========================================================================
   TVU GPA Supporter - System Settings Controller (js/pages/settings.js)
   ========================================================================== */

import { getLocalCourses, saveLocalCourses, clearAllLocalData, showToast, saveGrades } from '../api.js';
import { getTotalRequiredCredits, setTotalRequiredCredits } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  initAppearanceSettings();
  initAcademicConfig();
  initBackupRestore();
  initClearData();
});

/**
 * Initialize Dark Mode Theme selector, Language selector, and Grade Scale preference
 */
function initAppearanceSettings() {
  // 1. Theme Mode Switcher
  const themeBtns = document.querySelectorAll('.theme-option-btn');
  const currentTheme = localStorage.getItem('tvu_gpa_theme') || 'light';

  function updateThemeUI(activeTheme) {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('tvu_gpa_theme', activeTheme);

    themeBtns.forEach(btn => {
      const val = btn.getAttribute('data-theme-val');
      if (val === activeTheme) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'transparent';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'var(--bg-main)';
        btn.style.color = 'var(--text-main)';
        btn.style.borderColor = 'var(--border)';
      }
    });
  }

  updateThemeUI(currentTheme);

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTheme = btn.getAttribute('data-theme-val');
      updateThemeUI(targetTheme);
      showToast(`Đã chuyển sang giao diện ${targetTheme === 'dark' ? 'Ban đêm (Dark Mode) 🌙' : 'Ban ngày (Light Mode) ☀️'}`, 'info');
    });
  });

  // 2. Language Selector
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    const savedLang = localStorage.getItem('tvu_gpa_lang') || 'vi';
    langSelect.value = savedLang;

    langSelect.addEventListener('change', (e) => {
      const lang = e.target.value;
      localStorage.setItem('tvu_gpa_lang', lang);
      showToast(lang === 'en' ? 'Language switched to English! 🇬🇧' : 'Đã chuyển sang Tiếng Việt! 🇻🇳', 'success');
    });
  }

  // 3. Grade Scale Select
  const scaleSelect = document.getElementById('grade-scale-select');
  if (scaleSelect) {
    const savedScale = localStorage.getItem('tvu_gpa_scale') || '4';
    scaleSelect.value = savedScale;

    scaleSelect.addEventListener('change', (e) => {
      const scale = e.target.value;
      localStorage.setItem('tvu_gpa_scale', scale);
      showToast('Đã cập nhật định dạng thang điểm hiển thị!', 'success');
    });
  }
}

/**
 * Handle Total Required Credits config & presets
 */
function initAcademicConfig() {
  const inpCredits = document.getElementById('setting-total-credits');
  const btnSaveCredits = document.getElementById('btn-save-credits');
  const presetBtns = document.querySelectorAll('.preset-credit-btn');

  if (inpCredits) {
    inpCredits.value = getTotalRequiredCredits();
  }

  if (btnSaveCredits && inpCredits) {
    btnSaveCredits.addEventListener('click', () => {
      const val = parseInt(inpCredits.value, 10);
      if (isNaN(val) || val < 50 || val > 250) {
        showToast('Số tín chỉ phải nằm trong khoảng từ 50 đến 250 TC!', 'danger');
        return;
      }
      setTotalRequiredCredits(val);
      showToast(`Đã lưu tổng tín chỉ chương trình đào tạo: ${val} TC!`, 'success');
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      if (inpCredits && val) {
        inpCredits.value = val;
        setTotalRequiredCredits(parseInt(val, 10));
        showToast(`Đã chọn tổng số tín chỉ: ${val} TC!`, 'success');
      }
    });
  });
}

/**
 * Handle Backup JSON Download & Restore Upload
 */
function initBackupRestore() {
  const btnExport = document.getElementById('btn-export-json');
  const fileImport = document.getElementById('file-import-json');

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const courses = getLocalCourses();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        courses
      }, null, 2));

      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `tvu_gpa_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(dlAnchorElem);
      dlAnchorElem.click();
      dlAnchorElem.remove();

      showToast('Đã xuất tập tin sao lưu JSON!', 'success');
    });
  }

  if (fileImport) {
    fileImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && Array.isArray(parsed.courses)) {
            await saveGrades(parsed.courses);
            showToast(`Nhập dữ liệu thành công! Đã khôi phục ${parsed.courses.length} môn học.`, 'success');
            setTimeout(() => window.location.reload(), 400);
          } else {
            throw new Error('Tập tin không chứa định dạng danh sách môn học hợp lệ.');
          }
        } catch (err) {
          showToast(`Lỗi nhập tập tin: ${err.message}`, 'danger');
        }
      };
      reader.readAsText(file);
    });
  }
}

/**
 * Handle Data Reset
 */
function initClearData() {
  const btnReset = document.getElementById('btn-reset-data');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      clearAllLocalData();
      showToast('Đã xóa toàn bộ dữ liệu cục bộ!', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 400);
    });
  }
}
