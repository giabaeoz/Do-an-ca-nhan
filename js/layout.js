/* ==========================================================================
   TVU GPA Supporter - Shared Layout & Global Supabase Auth (js/layout.js)
   ========================================================================== */

import { getCurrentUser, signIn, signUp, signOut, fetchGrades, showToast } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigationHighlight();
  initTheme();
  initGlobalAuth();
});

/**
 * Automatically highlight active link in Sidebar and Bottom Dock based on pathname
 */
function initNavigationHighlight() {
  const currentFilename = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

  const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const targetFilename = href.split('/').pop().toLowerCase();

    if (currentFilename === targetFilename || (targetFilename === 'index.html' && (currentFilename === '' || currentFilename === 'index.html'))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const dockItems = document.querySelectorAll('.bottom-dock .dock-item');
  dockItems.forEach(item => {
    const href = item.getAttribute('href');
    if (!href || href === '#') return;
    const targetFilename = href.split('/').pop().toLowerCase();

    if (currentFilename === targetFilename || (targetFilename === 'index.html' && (currentFilename === '' || currentFilename === 'index.html'))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Initialize theme (light / dark) from localStorage
 */
function initTheme() {
  const savedTheme = localStorage.getItem('tvu_gpa_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme');
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('tvu_gpa_theme', nextTheme);
    });
  });
}

/**
 * Initialize Global Supabase Auth Widget & Modal across all pages
 */
export async function initGlobalAuth() {
  createGlobalAuthModal();
  await renderGlobalUserBadge();
}

/**
 * Render dynamic user status & Login/Register buttons in top bar across ALL pages
 */
async function renderGlobalUserBadge() {
  const topBarActions = document.querySelector('.top-bar-actions');
  if (!topBarActions) return;

  let badgeContainer = document.getElementById('global-auth-widget');
  if (!badgeContainer) {
    badgeContainer = document.createElement('div');
    badgeContainer.id = 'global-auth-widget';
    badgeContainer.style.display = 'inline-flex';
    badgeContainer.style.alignItems = 'center';
    badgeContainer.style.gap = '0.5rem';
    topBarActions.prepend(badgeContainer);
  }

  try {
    const user = await getCurrentUser();

    // Read local profile if available
    let profile = null;
    try {
      const raw = localStorage.getItem('tvu_student_profile');
      if (raw) profile = JSON.parse(raw);
    } catch (e) { }

    // PERF: Batch DOM updates in next animation frame to prevent layout thrashing
    requestAnimationFrame(() => {
      if (user && user.email) {
        const displayName = (profile && profile.name) ? profile.name : (user.user_metadata?.name || user.email.split('@')[0]);
        const mssv = (profile && profile.mssv) ? profile.mssv : (user.user_metadata?.mssv || '');

        badgeContainer.innerHTML = `
          <a href="profile.html" class="badge badge-success" style="padding: 0.4rem 0.75rem; font-size: 0.82rem; font-weight: 700; text-decoration: none;" title="${user.email}">
            <i class="ph-bold ph-graduation-cap"></i> ${displayName} ${mssv ? `(${mssv})` : ''}
          </a>
          <button id="btn-global-sign-out" class="btn btn-secondary btn-sm" style="padding: 0.3rem 0.6rem;" title="Đăng xuất"><i class="ph-bold ph-sign-out"></i> Đăng xuất</button>
        `;

        const btnSignOut = document.getElementById('btn-global-sign-out');
        if (btnSignOut) {
          btnSignOut.addEventListener('click', async () => {
            await signOut();
            showToast('Đã đăng xuất tài khoản và xóa sạch dữ liệu.', 'success');
            setTimeout(() => window.location.reload(), 500);
          });
        }
      } else {
        badgeContainer.innerHTML = `
          <button id="btn-open-global-auth" class="btn btn-primary btn-sm"><i class="ph-bold ph-key"></i> Đăng nhập / Đăng ký</button>
        `;

        const btnAuth = document.getElementById('btn-open-global-auth');
        if (btnAuth) {
          btnAuth.addEventListener('click', () => openAuthModal('login'));
        }
      }
    });
  } catch (err) {
    console.warn('Auth Badge Error:', err);
  }
}

/**
 * Open global auth modal with selected mode ('login' or 'register')
 */
export function openAuthModal(mode = 'login') {
  let modal = document.getElementById('global-auth-modal');
  if (!modal) {
    createGlobalAuthModal();
    modal = document.getElementById('global-auth-modal');
  }
  if (!modal) return;

  const tabLogin = document.getElementById('g-tab-login');
  const tabRegister = document.getElementById('g-tab-register');
  const formLogin = document.getElementById('g-form-login');
  const formRegister = document.getElementById('g-form-register');

  // PERF: Batch DOM updates with requestAnimationFrame & className assignments
  requestAnimationFrame(() => {
    if (mode === 'register') {
      if (tabRegister) tabRegister.className = 'login-gate-tab active';
      if (tabLogin) tabLogin.className = 'login-gate-tab';
      if (formRegister) formRegister.className = 'login-gate-form active';
      if (formLogin) formLogin.className = 'login-gate-form';
    } else {
      if (tabLogin) tabLogin.className = 'login-gate-tab active';
      if (tabRegister) tabRegister.className = 'login-gate-tab';
      if (formLogin) formLogin.className = 'login-gate-form active';
      if (formRegister) formRegister.className = 'login-gate-form';
    }
    modal.classList.add('active');
  });
}

/**
 * Inject global Auth Modal dialog if not already in DOM
 */
function createGlobalAuthModal() {
  if (document.getElementById('global-auth-modal')) return;

  const isInPages = window.location.pathname.includes('/pages/');
  const logoPath = isInPages ? '../assets/images/logo.jpg' : 'assets/images/logo.jpg';

  const modalHtml = `
    <div id="global-auth-modal" class="modal-backdrop">
      <div class="login-gate-card" style="max-width: 500px; width: 92%; max-height: 90vh; overflow-y: auto; position: relative;">

        <!-- Nut dong -->
        <button id="btn-close-global-auth" class="login-gate-close" title="Dong">✕</button>

        <!-- Logo & Brand -->
        <div class="login-gate-logo">
          <img src="${logoPath}" alt="TVU GPA Helper Logo" style="width: 96px; height: 96px;">
          <h2>GPA Helper</h2>
          <p>Trà Vinh University</p>
        </div>

        <!-- Tab Switcher -->
        <div class="login-gate-tabs">
          <button id="g-tab-login" class="login-gate-tab active"><i class="ph-bold ph-sign-in"></i> Đăng nhập</button>
          <button id="g-tab-register" class="login-gate-tab"><i class="ph-bold ph-user-plus"></i> Đăng ký Mới</button>
        </div>

        <!-- Form 1: Dang nhap -->
        <form id="g-form-login" class="login-gate-form active">
          <div class="form-group">
            <label class="form-label">MSSV / Email Sinh viên *</label>
            <input type="text" id="g-login-email" class="form-input" placeholder="1100123456 hoặc email@st.tvu.edu.vn" required>
          </div>
          <div class="form-group">
            <label class="form-label">Mật khẩu *</label>
            <input type="password" id="g-login-password" class="form-input" placeholder="••••••••" required minlength="6">
          </div>
          <button type="submit" id="btn-g-submit-login" class="login-gate-btn-primary">
            <i class="ph-bold ph-sign-in"></i> Đăng nhập ngay
          </button>
        </form>

        <!-- Form 2: Dang ky -->
        <form id="g-form-register" class="login-gate-form">
          <div class="login-gate-reg-grid">
            <div class="form-group">
              <label class="form-label">Họ và Tên Sinh viên *</label>
              <input type="text" id="g-reg-name" class="form-input" placeholder="Nguyễn Văn A" required>
            </div>
            <div class="form-group">
              <label class="form-label">MSSV *</label>
              <input type="text" id="g-reg-username" class="form-input" placeholder="1100123456" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Sinh viên *</label>
              <input type="email" id="g-reg-email" class="form-input" placeholder="email@st.tvu.edu.vn" required>
            </div>
            <div class="form-group">
              <label class="form-label">Lớp học</label>
              <input type="text" id="g-reg-class" class="form-input" placeholder="DA23CNTT">
            </div>
            <div class="form-group">
              <label class="form-label">Mật khẩu *</label>
              <input type="password" id="g-reg-password" class="form-input" placeholder="Tối thiểu 6 ký tự" required minlength="6">
            </div>
            <div class="form-group">
              <label class="form-label">Xác nhận Mật khẩu *</label>
              <input type="password" id="g-reg-confirm" class="form-input" placeholder="Nhập lại mật khẩu" required minlength="6">
            </div>
          </div>

          <!-- Dropdown 1: Don vi dao tao (full width) -->
          <div class="form-group gate-reg-dropdown-row">
            <label class="form-label" for="g-reg-faculty"><i class="ph-bold ph-buildings"></i> Đơn vị đào tạo</label>
            <div class="gate-select-wrapper">
              <select id="g-reg-faculty" class="form-input gate-select">
                <option value="">-- Chọn Trường / Khoa --</option>
              </select>
              <span class="gate-select-arrow">▾</span>
            </div>
          </div>

          <!-- Dropdown 2 + 3: Nganh hoc & Khoa hoc (2 cot) -->
          <div class="gate-reg-dropdown-duo">
            <div class="form-group">
              <label class="form-label" for="g-reg-major"><i class="ph-bold ph-graduation-cap"></i> Ngành học</label>
              <div class="gate-select-wrapper">
                <select id="g-reg-major" class="form-input gate-select" disabled>
                  <option value="">-- Chọn đơn vị trước --</option>
                </select>
                <span class="gate-select-arrow">▾</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="g-reg-cohort"><i class="ph-bold ph-calendar-blank"></i> Khóa học</label>
              <div class="gate-select-wrapper">
                <select id="g-reg-cohort" class="form-input gate-select">
                  <option value="">-- Chọn khóa --</option>
                  <option value="2020">2020</option>
                  <option value="2021">2021</option>
                  <option value="2022">2022</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="Khác">Khác</option>
                </select>
                <span class="gate-select-arrow">▾</span>
              </div>
            </div>
          </div>

          <button type="submit" id="btn-g-submit-register" class="login-gate-btn-primary" style="margin-top: 1rem;">
            <i class="ph-bold ph-lightning"></i> Tạo Tài khoản Sinh viên Mới
          </button>
        </form>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Khoi tao cascading dropdowns TVU ngay sau khi inject HTML
  initGlobalTvuDropdowns();

  const modal = document.getElementById('global-auth-modal');
  const btnClose = document.getElementById('btn-close-global-auth');
  const tabLogin = document.getElementById('g-tab-login');
  const tabRegister = document.getElementById('g-tab-register');

  const formLogin = document.getElementById('g-form-login');
  const formRegister = document.getElementById('g-form-register');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Click ngoai card (backdrop) de dong
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Phim ESC de dong
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById('global-auth-modal');
      if (m) m.classList.remove('active');
    }
  });

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => openAuthModal('login'));
    tabRegister.addEventListener('click', () => openAuthModal('register'));
  }

  // Handle Modal Sign In submit
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('g-login-email').value.trim();
      const password = document.getElementById('g-login-password').value.trim();
      const btnSubmit = document.getElementById('btn-g-submit-login');

      if (!email || !password) {
        showToast('Vui lòng nhập Email và Mật khẩu!', 'danger');
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner"></span> Đang đăng nhập...`;
      }

      try {
        await signIn(email, password);
        showToast('Đăng nhập thành công! Đã tải dữ liệu của bạn.', 'success');
        modal.classList.remove('active');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        showToast(err.message, 'danger');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<i class="ph-bold ph-sign-in"></i> Đăng nhập ngay`;
        }
      }
    });
  }

  // Handle Modal Registration submit
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('g-reg-name').value.trim();
      const username = document.getElementById('g-reg-username').value.trim();
      const email = document.getElementById('g-reg-email').value.trim();
      const password = document.getElementById('g-reg-password').value.trim();
      const confirmPassword = document.getElementById('g-reg-confirm').value.trim();
      const className = document.getElementById('g-reg-class').value.trim();
      // 3 truong TVU moi
      const faculty = document.getElementById('g-reg-faculty')?.value.trim() || '';
      const major = document.getElementById('g-reg-major')?.value.trim() || '';
      const cohort = document.getElementById('g-reg-cohort')?.value.trim() || '';

      const btnSubmit = document.getElementById('btn-g-submit-register');

      if (!name || !username || !email || !password) {
        showToast('Vui lòng nhập đầy đủ các thông tin bắt buộc (*)!', 'danger');
        return;
      }

      if (password.length < 6) {
        showToast('Mật khẩu phải từ 6 ký tự trở lên!', 'danger');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp!', 'danger');
        return;
      }

      const profileData = {
        name,
        username,
        mssv: username,
        email,
        className,
        faculty,   // Don vi dao tao (Truong / Khoa)
        major,     // Nganh hoc
        cohort,    // Khoa hoc (nam nhap hoc)
      };

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner"></span> Đang tạo tài khoản sinh viên...`;
      }

      try {
        await signUp(email, password, profileData);
        showToast('🎉 Đăng ký thành công! Bạn có thể đăng nhập ngay.', 'success');
        openAuthModal('login');
        const inpEmail = document.getElementById('g-login-email');
        if (inpEmail) inpEmail.value = email;
      } catch (err) {
        showToast(err.message || 'Lỗi khi đăng ký!', 'danger');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<i class="ph-bold ph-lightning"></i> Tạo Tài khoản Sinh viên Mới`;
        }
      }
    });
  }
}

/* ==========================================================================
   TVU Structure Data & Cascading Dropdown Logic (Global Auth Modal)
   ========================================================================== */
const TVU_STRUCTURE = {
  "Trường Kỹ thuật và Công nghệ": [
    "Công nghệ thông tin - ABET", "Công nghệ thông tin (Tiếng Anh)", "Trí tuệ Nhân tạo",
    "Công nghệ kỹ thuật điện, điện tử - ABET", "Công nghệ kỹ thuật cơ điện tử",
    "Công nghệ kỹ thuật công trình xây dựng - ABET", "Công nghệ kỹ thuật điều khiển và tự động hóa",
    "Thiết kế vi mạch bán dẫn", "Công nghệ kỹ thuật cơ khí - ABET",
    "Kỹ thuật xây dựng công trình giao thông", "Công nghệ kỹ thuật ô tô",
    "Công nghệ kỹ thuật hóa học", "Kỹ thuật môi trường", "Quản lý Tài nguyên và Môi trường"
  ],
  "Trường Kinh tế, Luật": [
    "Kinh tế", "Kế toán", "Luật", "Quản trị kinh doanh", "Quản trị kinh doanh (Khởi nghiệp)",
    "Quản trị kinh doanh (Tiếng Anh)", "Tài chính - Ngân hàng",
    "Logistics và Quản lý Chuỗi cung ứng", "Thương mại điện tử",
    "Quản trị dịch vụ du lịch và lữ hành", "Quản trị văn phòng", "Quản lý nhà nước"
  ],
  "Trường Y Dược": [
    "Y Khoa", "Răng Hàm Mặt", "Dược học", "Điều dưỡng", "Kỹ thuật xét nghiệm y học",
    "Y tế công cộng", "Kỹ thuật phục hồi chức năng", "Y học dự phòng",
    "Kỹ thuật hình ảnh y học", "Hóa dược"
  ],
  "Trường Ngôn ngữ - Văn hóa - Nghệ thuật Khmer Nam Bộ và Nhân văn": [
    "Ngôn ngữ Anh", "Ngôn ngữ Trung Quốc", "Ngôn ngữ Khmer", "Văn hóa học",
    "Âm nhạc học", "Biểu diễn nhạc cụ truyền thống", "Giáo dục mầm non",
    "Giáo dục tiểu học", "Tâm lý học", "Công tác xã hội"
  ],
  "Khoa Nông nghiệp - Thuỷ sản": [
    "Nông nghiệp", "Nuôi trồng thủy sản", "Công nghệ Thực phẩm", "Thú y",
    "Công nghệ sinh học", "Bảo vệ Thực vật", "Công nghệ Nông nghiệp"
  ],
  "Khoa Lý luận Chính trị": ["Chính trị học"],
  "Khoa Giáo dục Thể chất": ["Quản lý thể dục thể thao"]
};

function initGlobalTvuDropdowns() {
  const facultySelect = document.getElementById('g-reg-faculty');
  const majorSelect = document.getElementById('g-reg-major');
  if (!facultySelect || !majorSelect) return;

  // Populate Dropdown 1: Don vi dao tao
  Object.keys(TVU_STRUCTURE).forEach(unit => {
    const opt = document.createElement('option');
    opt.value = unit;
    opt.textContent = unit;
    facultySelect.appendChild(opt);
  });

  // Cascading change: Don vi -> Nganh hoc
  facultySelect.addEventListener('change', () => {
    const selectedUnit = facultySelect.value;
    majorSelect.innerHTML = '';
    majorSelect.disabled = true;

    if (!selectedUnit) {
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '-- Chọn đơn vị trước --';
      majorSelect.appendChild(ph);
      return;
    }

    const majors = TVU_STRUCTURE[selectedUnit] || [];
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = '-- Chọn ngành học --';
    majorSelect.appendChild(defOpt);

    majors.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      majorSelect.appendChild(opt);
    });

    majorSelect.disabled = false;
    setTimeout(() => majorSelect.focus(), 80);
  });
}
