/* ==========================================================================
   TVU GPA Helper - Auth Gate (js/auth-gate.js)
   Gate bat dau an (class hidden trong HTML).
   Chi HIEN len neu nguoi dung CHUA dang nhap.
   ========================================================================== */

import { getCurrentUser, signIn, signUp, showToast } from './api.js';

/* ==========================================================================
   Du lieu cau truc don vi / nganh hoc cua Dai hoc Tra Vinh (TVU)
   ========================================================================== */
const tvuStructure = {
  "Trường Kỹ thuật và Công nghệ": [
    "Công nghệ thông tin - ABET",
    "Công nghệ thông tin (Tiếng Anh)",
    "Trí tuệ Nhân tạo",
    "Công nghệ kỹ thuật điện, điện tử - ABET",
    "Công nghệ kỹ thuật cơ điện tử",
    "Công nghệ kỹ thuật công trình xây dựng - ABET",
    "Công nghệ kỹ thuật điều khiển và tự động hóa",
    "Thiết kế vi mạch bán dẫn",
    "Công nghệ kỹ thuật cơ khí - ABET",
    "Kỹ thuật xây dựng công trình giao thông",
    "Công nghệ kỹ thuật ô tô",
    "Công nghệ kỹ thuật hóa học",
    "Kỹ thuật môi trường",
    "Quản lý Tài nguyên và Môi trường"
  ],
  "Trường Kinh tế, Luật": [
    "Kinh tế",
    "Kế toán",
    "Luật",
    "Quản trị kinh doanh",
    "Quản trị kinh doanh (Khởi nghiệp)",
    "Quản trị kinh doanh (Tiếng Anh)",
    "Tài chính - Ngân hàng",
    "Logistics và Quản lý Chuỗi cung ứng",
    "Thương mại điện tử",
    "Quản trị dịch vụ du lịch và lữ hành",
    "Quản trị văn phòng",
    "Quản lý nhà nước"
  ],
  "Trường Y Dược": [
    "Y Khoa",
    "Răng Hàm Mặt",
    "Dược học",
    "Điều dưỡng",
    "Kỹ thuật xét nghiệm y học",
    "Y tế công cộng",
    "Kỹ thuật phục hồi chức năng",
    "Y học dự phòng",
    "Kỹ thuật hình ảnh y học",
    "Hóa dược"
  ],
  "Trường Ngôn ngữ - Văn hóa - Nghệ thuật Khmer Nam Bộ và Nhân văn": [
    "Ngôn ngữ Anh",
    "Ngôn ngữ Trung Quốc",
    "Ngôn ngữ Khmer",
    "Văn hóa học",
    "Âm nhạc học",
    "Biểu diễn nhạc cụ truyền thống",
    "Giáo dục mầm non",
    "Giáo dục tiểu học",
    "Tâm lý học",
    "Công tác xã hội"
  ],
  "Khoa Nông nghiệp - Thuỷ sản": [
    "Nông nghiệp",
    "Nuôi trồng thủy sản",
    "Công nghệ Thực phẩm",
    "Thú y",
    "Công nghệ sinh học",
    "Bảo vệ Thực vật",
    "Công nghệ Nông nghiệp"
  ],
  "Khoa Lý luận Chính trị": [
    "Chính trị học"
  ],
  "Khoa Giáo dục Thể chất": [
    "Quản lý thể dục thể thao"
  ]
};

/* ==========================================================================
   DOMContentLoaded - Khoi tao toan bo auth gate
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  const gate = document.getElementById('login-gate');
  if (!gate) return;

  // Kiem tra session - chi hien gate neu CHUA dang nhap
  try {
    const user = await getCurrentUser();
    if (user && user.email) {
      // Da dang nhap -> giu nguyen trang thai hidden, xoa khoi DOM
      gate.remove();
      return;
    }
  } catch (e) {
    // Loi khi lay session -> coi nhu chua dang nhap
  }

  // Chua dang nhap -> hien gate voi animation
  requestAnimationFrame(() => {
    gate.classList.remove('hidden');
  });

  // Khoi tao dropdowns TVU truoc khi bind form
  initTvuDropdowns();

  // Bind tat ca events
  bindTabSwitching();
  bindCloseActions();
  bindLoginForm();
  bindRegisterForm();
});

/* ==========================================================================
   initTvuDropdowns - Populate Dropdown 1 (Don vi dao tao) va xu ly change
   de enable/render Dropdown 2 (Nganh hoc) tuong ung.
   ========================================================================== */
function initTvuDropdowns() {
  const facultySelect = document.getElementById('gate-reg-faculty');
  const majorSelect = document.getElementById('gate-reg-major');
  if (!facultySelect || !majorSelect) return;

  // --- Populate Dropdown 1: Don vi dao tao ---
  Object.keys(tvuStructure).forEach(unit => {
    const opt = document.createElement('option');
    opt.value = unit;
    opt.textContent = unit;
    facultySelect.appendChild(opt);
  });

  // --- Cascading change event: Don vi -> Nganh hoc ---
  facultySelect.addEventListener('change', () => {
    const selectedUnit = facultySelect.value;

    // Reset Dropdown 2
    majorSelect.innerHTML = '';
    majorSelect.disabled = true;

    if (!selectedUnit) {
      // Khong chon -> tat Dropdown 2
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '-- Chọn đơn vị trước --';
      majorSelect.appendChild(placeholder);
      return;
    }

    // Co chon don vi -> enable va load nganh hoc
    const majors = tvuStructure[selectedUnit] || [];

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Chọn ngành học --';
    majorSelect.appendChild(defaultOpt);

    majors.forEach(major => {
      const opt = document.createElement('option');
      opt.value = major;
      opt.textContent = major;
      majorSelect.appendChild(opt);
    });

    // Enable Dropdown 2 voi hieu ung nhe
    majorSelect.disabled = false;
    majorSelect.style.transition = 'border-color 0.2s ease, opacity 0.2s ease';
    // Focus nhe vao Dropdown 2 de chi dan nguoi dung
    setTimeout(() => majorSelect.focus(), 80);
  });
}

/* ==========================================================================
   dismissGate - Tat modal voi animation fade-out
   ========================================================================== */
function dismissGate(animate = true) {
  const gate = document.getElementById('login-gate');
  if (!gate) return;
  if (animate) {
    // PERF: Start dismiss animation on next frame to prevent stutter
    requestAnimationFrame(() => {
      gate.classList.add('hidden');
      setTimeout(() => gate.remove(), 380);
    });
  } else {
    gate.remove();
  }
}

/* ==========================================================================
   bindTabSwitching - Chuyen doi tab Dang nhap / Dang ky
   ========================================================================== */
function bindTabSwitching() {
  const tabLogin = document.getElementById('gate-tab-login');
  const tabRegister = document.getElementById('gate-tab-register');
  const formLogin = document.getElementById('gate-form-login');
  const formRegister = document.getElementById('gate-form-register');

  tabLogin?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      tabLogin.className = 'login-gate-tab active';
      tabRegister.className = 'login-gate-tab';
      formLogin.className = 'login-gate-form active';
      formRegister.className = 'login-gate-form';
    });
  });
  tabRegister?.addEventListener('click', () => {
    requestAnimationFrame(() => {
      tabRegister.className = 'login-gate-tab active';
      tabLogin.className = 'login-gate-tab';
      formRegister.className = 'login-gate-form active';
      formLogin.className = 'login-gate-form';
    });
  });
}

/* ==========================================================================
   bindCloseActions - Dong modal (nut X, click ben ngoai, phim Escape, guest)
   ========================================================================== */
function bindCloseActions() {
  const gate = document.getElementById('login-gate');

  document.getElementById('gate-close-btn')?.addEventListener('click', () => dismissGate());

  gate?.addEventListener('click', (e) => {
    if (e.target === gate) dismissGate();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('login-gate')) dismissGate();
  });

  ['gate-btn-guest', 'gate-btn-guest-reg'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => dismissGate());
  });
}

/* ==========================================================================
   bindLoginForm - Xu ly submit form Dang nhap
   ========================================================================== */
function bindLoginForm() {
  document.getElementById('gate-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('gate-login-email').value.trim();
    const password = document.getElementById('gate-login-password').value.trim();
    const btn = document.getElementById('gate-btn-login');

    if (!email || !password) {
      showToast('Vui lòng nhập MSSV/Email và mật khẩu!', 'danger');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';

    try {
      await signIn(email, password);
      showToast('Đăng nhập thành công!', 'success');
      setTimeout(() => { dismissGate(); window.location.reload(); }, 600);
    } catch (err) {
      showToast(err.message || 'Sai thông tin đăng nhập!', 'danger');
      btn.disabled = false;
      btn.textContent = '🔑 Đăng nhập ngay';
    }
  });
}

/* ==========================================================================
   bindRegisterForm - Xu ly submit form Dang ky
   Thu thap them 3 truong TVU: faculty (don vi dao tao), major (nganh hoc),
   cohort (khoa hoc) va gui len signUp metadata.
   ========================================================================== */
function bindRegisterForm() {
  document.getElementById('gate-register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('gate-reg-name').value.trim();
    const username = document.getElementById('gate-reg-username').value.trim();
    const email = document.getElementById('gate-reg-email').value.trim();
    const cls = document.getElementById('gate-reg-class').value.trim();
    const password = document.getElementById('gate-reg-password').value.trim();
    const confirm = document.getElementById('gate-reg-confirm').value.trim();
    const btn = document.getElementById('gate-btn-register');

    // --- 3 truong TVU moi ---
    const faculty = document.getElementById('gate-reg-faculty')?.value.trim() || '';
    const major = document.getElementById('gate-reg-major')?.value.trim() || '';
    const cohort = document.getElementById('gate-reg-cohort')?.value.trim() || '';

    // Validation co ban
    if (!name || !username || !email || !password) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc (*)', 'danger');
      return;
    }
    if (password.length < 6) {
      showToast('Mật khẩu phải từ 6 ký tự trở lên!', 'danger');
      return;
    }
    if (password !== confirm) {
      showToast('Mật khẩu xác nhận không khớp!', 'danger');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang tạo tài khoản...';

    try {
      await signUp(email, password, {
        name,
        username,
        mssv: username,
        email,
        className: cls,
        // 3 truong ca nhan hoa TVU
        faculty,          // Don vi dao tao (Truong/Khoa)
        major,            // Nganh hoc
        cohort,           // Khoa hoc (nam nhap hoc)
      });
      showToast('Đăng ký thành công! Hãy đăng nhập để tiếp tục.', 'success');
      // Chuyen sang tab dang nhap va pre-fill email
      document.getElementById('gate-tab-login').click();
      const inp = document.getElementById('gate-login-email');
      if (inp) inp.value = email;
    } catch (err) {
      showToast(err.message || 'Đăng ký thất bại!', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = '⚡ Tạo Tài khoản Sinh viên';
    }
  });
}
