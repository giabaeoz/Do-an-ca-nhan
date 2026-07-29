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
  const currentPath = window.location.pathname.toLowerCase();

  const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href').toLowerCase();
    if (!href || href === '#') return;

    if (currentPath.endsWith(href) || (href === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html')))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const dockItems = document.querySelectorAll('.bottom-dock .dock-item');
  dockItems.forEach(item => {
    const href = item.getAttribute('href').toLowerCase();
    if (!href || href === '#') return;

    if (currentPath.endsWith(href) || (href === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html')))) {
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
  await renderGlobalUserBadge();
  createGlobalAuthModal();
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

    if (user && user.email) {
      const displayName = (profile && profile.name) ? profile.name : (user.user_metadata?.name || user.email.split('@')[0]);
      const mssv = (profile && profile.mssv) ? profile.mssv : (user.user_metadata?.mssv || '');

      badgeContainer.innerHTML = `
        <a href="profile.html" class="badge badge-success" style="padding: 0.4rem 0.75rem; font-size: 0.82rem; font-weight: 700; text-decoration: none;" title="${user.email}">
          🎓 ${displayName} ${mssv ? `(${mssv})` : ''}
        </a>
        <button id="btn-global-sign-out" class="btn btn-secondary btn-sm" style="padding: 0.3rem 0.6rem;" title="Đăng xuất">🚪 Đăng xuất</button>
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
        <button id="btn-open-global-login" class="btn btn-secondary btn-sm">🔑 Đăng nhập</button>
        <button id="btn-open-global-register" class="btn btn-primary btn-sm">📝 Đăng ký Mới</button>
      `;

      const btnLogin = document.getElementById('btn-open-global-login');
      const btnRegister = document.getElementById('btn-open-global-register');

      if (btnLogin) {
        btnLogin.addEventListener('click', () => openAuthModal('login'));
      }
      if (btnRegister) {
        btnRegister.addEventListener('click', () => openAuthModal('register'));
      }
    }
  } catch (err) {
    console.warn('Auth Badge Error:', err);
  }
}

/**
 * Open global auth modal with selected mode ('login' or 'register')
 */
export function openAuthModal(mode = 'login') {
  const modal = document.getElementById('global-auth-modal');
  if (!modal) return;

  const tabLogin = document.getElementById('g-tab-login');
  const tabRegister = document.getElementById('g-tab-register');
  const formLogin = document.getElementById('g-form-login');
  const formRegister = document.getElementById('g-form-register');

  if (mode === 'register') {
    if (tabRegister) tabRegister.className = 'btn btn-primary btn-sm';
    if (tabLogin) tabLogin.className = 'btn btn-secondary btn-sm';
    if (formRegister) formRegister.style.display = 'block';
    if (formLogin) formLogin.style.display = 'none';
  } else {
    if (tabLogin) tabLogin.className = 'btn btn-primary btn-sm';
    if (tabRegister) tabRegister.className = 'btn btn-secondary btn-sm';
    if (formLogin) formLogin.style.display = 'block';
    if (formRegister) formRegister.style.display = 'none';
  }

  modal.classList.add('active');
}

/**
 * Inject global Auth Modal dialog if not already in DOM
 */
function createGlobalAuthModal() {
  if (document.getElementById('global-auth-modal')) return;

  const modalHtml = `
    <div id="global-auth-modal" class="modal-backdrop">
      <div class="modal-card" style="max-width: 600px; width: 92%; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div style="display: flex; gap: 0.5rem;">
            <button id="g-tab-login" class="btn btn-primary btn-sm"> Đăng nhập</button>
            <button id="g-tab-register" class="btn btn-secondary btn-sm"> Đăng ký Sinh viên Mới</button>
          </div>
          <button id="btn-close-global-auth" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem;">✕</button>
        </div>

        <!-- Form 1: Modal Login -->
        <form id="g-form-login">
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
            Đăng nhập bằng Mã số Sinh viên (MSSV) hoặc Email để đồng bộ dữ liệu trực tuyến.
          </p>
          <div class="form-group">
            <label class="form-label">Tên Đăng nhập / Mã SV (MSSV) hoặc Email *</label>
            <input type="text" id="g-login-email" class="form-input" placeholder="" required>
          </div>

          <div class="form-group">
            <label class="form-label">Mật khẩu *</label>
            <input type="password" id="g-login-password" class="form-input" placeholder="••••••••" required minlength="6">
          </div>

          <button type="submit" id="btn-g-submit-login" class="btn btn-primary" style="width: 100%; margin-top: 0.75rem;">
             Đăng nhập ngay
          </button>
        </form>

        <!-- Form 2: Modal Detailed Registration -->
        <form id="g-form-register" style="display: none;">
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
            Tạo tài khoản sinh viên mới để tự động đồng bộ bảng điểm trực tuyến.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Họ và Tên Sinh viên *</label>
              <input type="text" id="g-reg-name" class="form-input" placeholder="Ví dụ: Nguyễn Văn A" required>
            </div>

            <div class="form-group">
              <label class="form-label">Mã SV (MSSV) / Tên Đăng nhập *</label>
              <input type="text" id="g-reg-username" class="form-input" placeholder="Ví dụ: 110123456" required>
            </div>

            <div class="form-group">
              <label class="form-label">Email sinh viên *</label>
              <input type="email" id="g-reg-email" class="form-input" placeholder="sinhvien@st.tvu.edu.vn" required>
            </div>

            <div class="form-group">
              <label class="form-label">Số điện thoại</label>
              <input type="tel" id="g-reg-phone" class="form-input" placeholder="0912345678">
            </div>

            <div class="form-group">
              <label class="form-label">Mật khẩu đăng ký *</label>
              <input type="password" id="g-reg-password" class="form-input" placeholder="Tối thiểu 6 ký tự" required minlength="6">
            </div>

            <div class="form-group">
              <label class="form-label">Xác nhận Mật khẩu *</label>
              <input type="password" id="g-reg-confirm" class="form-input" placeholder="Nhập lại mật khẩu" required minlength="6">
            </div>

            <div class="form-group">
              <label class="form-label">Lớp học</label>
              <input type="text" id="g-reg-class" class="form-input" placeholder="Ví dụ: DA....">
            </div>

            <div class="form-group">
              <label class="form-label">Chuyên ngành</label>
              <input type="text" id="g-reg-major" class="form-input" placeholder="Nhập ngành của bạn">
            </div>
          </div>

          <button type="submit" id="btn-g-submit-register" class="btn btn-primary" style="width: 100%; margin-top: 1.25rem; font-size: 0.95rem; padding: 0.65rem;">
             Tạo Tài khoản Sinh viên Mới
          </button>
        </form>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('global-auth-modal');
  const btnClose = document.getElementById('btn-close-global-auth');
  const tabLogin = document.getElementById('g-tab-login');
  const tabRegister = document.getElementById('g-tab-register');

  const formLogin = document.getElementById('g-form-login');
  const formRegister = document.getElementById('g-form-register');

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }

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
          btnSubmit.innerHTML = `🔑 Đăng nhập ngay`;
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
      const phone = document.getElementById('g-reg-phone').value.trim();
      const password = document.getElementById('g-reg-password').value.trim();
      const confirmPassword = document.getElementById('g-reg-confirm').value.trim();
      const className = document.getElementById('g-reg-class').value.trim();
      const major = document.getElementById('g-reg-major').value.trim();

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
        phone,
        className,
        major,
        faculty: 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
        years: '2022 - 2026',
        email
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
          btnSubmit.innerHTML = `⚡ Tạo Tài khoản Sinh viên Mới`;
        }
      }
    });
  }
}
