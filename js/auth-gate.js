/* ==========================================================================
   TVU GPA Helper - Auth Gate (js/auth-gate.js)
   Gate bat dau an (class hidden trong HTML).
   Chi HIEN len neu nguoi dung CHUA dang nhap.
   ========================================================================== */

import { getCurrentUser, signIn, signUp, showToast } from './api.js';

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

  // Bind tat ca events
  bindTabSwitching();
  bindCloseActions();
  bindLoginForm();
  bindRegisterForm();
});

/* ---- Tat modal ---- */
function dismissGate(animate = true) {
  const gate = document.getElementById('login-gate');
  if (!gate) return;
  if (animate) {
    gate.classList.add('hidden');
    setTimeout(() => gate.remove(), 380);
  } else {
    gate.remove();
  }
}

/* ---- Chuyen tab ---- */
function bindTabSwitching() {
  const tabLogin    = document.getElementById('gate-tab-login');
  const tabRegister = document.getElementById('gate-tab-register');
  const formLogin   = document.getElementById('gate-form-login');
  const formRegister= document.getElementById('gate-form-register');

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active');    tabRegister.classList.remove('active');
    formLogin.classList.add('active');  formRegister.classList.remove('active');
  });
  tabRegister?.addEventListener('click', () => {
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    formRegister.classList.add('active'); formLogin.classList.remove('active');
  });
}

/* ---- Dong modal ---- */
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

/* ---- Xu ly form dang nhap ---- */
function bindLoginForm() {
  document.getElementById('gate-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('gate-login-email').value.trim();
    const password = document.getElementById('gate-login-password').value.trim();
    const btn      = document.getElementById('gate-btn-login');

    if (!email || !password) {
      showToast('Vui long nhap MSSV/Email va mat khau!', 'danger');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Dang dang nhap...';

    try {
      await signIn(email, password);
      showToast('Dang nhap thanh cong!', 'success');
      setTimeout(() => { dismissGate(); window.location.reload(); }, 600);
    } catch (err) {
      showToast(err.message || 'Sai thong tin dang nhap!', 'danger');
      btn.disabled = false;
      btn.textContent = 'Dang nhap ngay';
    }
  });
}

/* ---- Xu ly form dang ky ---- */
function bindRegisterForm() {
  document.getElementById('gate-register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('gate-reg-name').value.trim();
    const username = document.getElementById('gate-reg-username').value.trim();
    const email    = document.getElementById('gate-reg-email').value.trim();
    const cls      = document.getElementById('gate-reg-class').value.trim();
    const major    = document.getElementById('gate-reg-major').value.trim();
    const password = document.getElementById('gate-reg-password').value.trim();
    const confirm  = document.getElementById('gate-reg-confirm').value.trim();
    const btn      = document.getElementById('gate-btn-register');

    if (!name || !username || !email || !password) {
      showToast('Vui long nhap day du thong tin bat buoc (*)', 'danger');
      return;
    }
    if (password.length < 6) {
      showToast('Mat khau phai tu 6 ky tu tro len!', 'danger');
      return;
    }
    if (password !== confirm) {
      showToast('Mat khau xac nhan khong khop!', 'danger');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Dang tao tai khoan...';

    try {
      await signUp(email, password, {
        name, username, mssv: username, email,
        className: cls, major,
        faculty: 'Truong KT&CN - DH Tra Vinh',
        years: '2022 - 2026'
      });
      showToast('Dang ky thanh cong! Hay dang nhap de tiep tuc.', 'success');
      document.getElementById('gate-tab-login').click();
      const inp = document.getElementById('gate-login-email');
      if (inp) inp.value = email;
    } catch (err) {
      showToast(err.message || 'Dang ky that bai!', 'danger');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Tao Tai khoan Sinh vien';
    }
  });
}
