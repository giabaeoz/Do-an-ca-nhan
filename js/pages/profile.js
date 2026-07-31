/* ==========================================================================
   TVU GPA Supporter - Profile & Account Controller (js/pages/profile.js)
   ========================================================================== */

import { getCurrentUser, signOut, updateSettings, showToast } from '../api.js';
import { supabase } from '../config.js';

const STORAGE_KEY_PROFILE = 'tvu_student_profile';

document.addEventListener('DOMContentLoaded', async () => {
  loadProfileData();
  initProfileForm();
  initAuthAccount();
});

/**
 * Read local student profile data from localStorage
 */
export function getStudentProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading student profile:', err);
  }
  return {
    name: '',
    mssv: '',
    className: '',
    major: '',
    faculty: 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
    years: '2022 - 2026',
    avatar: '<i class="ph-fill ph-graduation-cap"></i>'
  };
}

/**
 * Load and render profile header & form inputs
 */
async function loadProfileData() {
  let profile = getStudentProfile();
  const user = await getCurrentUser();

  // If user is authenticated via Supabase, merge user_metadata into profile
  if (user && user.user_metadata && Object.keys(user.user_metadata).length > 0) {
    const meta = user.user_metadata;
    profile = {
      name: meta.name || profile.name || user.email.split('@')[0],
      username: meta.username || meta.mssv || profile.username || '',
      mssv: meta.mssv || meta.username || profile.mssv || '',
      phone: meta.phone || profile.phone || '',
      className: meta.className || profile.className || '',
      major: meta.major || profile.major || '',
      faculty: meta.faculty || profile.faculty || 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
      years: meta.years || profile.years || '2022 - 2026',
      email: user.email,
      avatar: '<i class="ph-fill ph-graduation-cap"></i>'
    };
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch (e) { }
  }

  const elDisplayName = document.getElementById('profile-display-name');
  const elDisplayMeta = document.getElementById('profile-display-meta');

  if (elDisplayName) {
    elDisplayName.textContent = profile.name || (user ? user.email.split('@')[0] : 'Sinh viên TVU');
  }
  if (elDisplayMeta) {
    const mssvStr = profile.mssv ? `Mã SV: ${profile.mssv}` : 'Mã SV: Chưa cập nhật';
    const classStr = profile.className ? `Lớp: ${profile.className}` : 'Lớp: Chưa cập nhật';
    const majorStr = profile.major ? profile.major : 'Công nghệ thông tin';
    elDisplayMeta.textContent = `${mssvStr} • ${classStr} • ${majorStr}`;
  }

  // Populate form fields
  const inpName = document.getElementById('prof-name');
  const inpMssv = document.getElementById('prof-mssv');
  const inpClass = document.getElementById('prof-class');
  const inpMajor = document.getElementById('prof-major');
  const inpFaculty = document.getElementById('prof-faculty');
  const inpYears = document.getElementById('prof-years');

  if (inpName) inpName.value = profile.name || '';
  if (inpMssv) inpMssv.value = profile.mssv || '';
  if (inpClass) inpClass.value = profile.className || '';
  if (inpMajor) inpMajor.value = profile.major || '';
  if (inpFaculty) inpFaculty.value = profile.faculty || 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh';
  if (inpYears) inpYears.value = profile.years || '2022 - 2026';
}

/**
 * Handle student info form submission
 */
function initProfileForm() {
  const form = document.getElementById('profile-info-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('prof-name').value.trim();
    const mssv = document.getElementById('prof-mssv').value.trim();
    const className = document.getElementById('prof-class').value.trim();
    const major = document.getElementById('prof-major').value.trim();
    const faculty = document.getElementById('prof-faculty').value.trim();
    const years = document.getElementById('prof-years').value.trim();

    if (!name) {
      showToast('Vui lòng nhập Họ và Tên!', 'danger');
      return;
    }

    const updatedProfile = {
      name,
      username: mssv,
      mssv,
      className,
      major,
      faculty,
      years,
      avatar: '<i class="ph-fill ph-graduation-cap"></i>'
    };

    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updatedProfile));

      // Sync metadata to Supabase Cloud if user is authenticated
      const user = await getCurrentUser();
      if (user) {
        await supabase.auth.updateUser({ data: updatedProfile });
      }

      showToast('Đã lưu thông tin cá nhân sinh viên thành công!', 'success');
      await loadProfileData();
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi lưu thông tin!', 'danger');
    }
  });
}

/**
 * Handle Supabase authentication status & password update
 */
async function initAuthAccount() {
  const user = await getCurrentUser();
  const elCloudEmail = document.getElementById('cloud-account-email');
  const elCloudBadge = document.getElementById('profile-cloud-badge');
  const btnLogout = document.getElementById('btn-logout');
  const formPass = document.getElementById('password-change-form');

  if (user) {
    if (elCloudEmail) elCloudEmail.innerHTML = `<i class="ph-bold ph-lightning"></i> Email Cloud: ${user.email}`;
    if (elCloudBadge) {
      elCloudBadge.className = 'badge badge-success';
      elCloudBadge.innerHTML = '<i class="ph-bold ph-check-circle" style="color:var(--success)"></i> Đã kết nối Supabase Cloud Sync';
    }
    if (btnLogout) {
      btnLogout.style.display = 'inline-flex';
      btnLogout.addEventListener('click', async () => {
        await signOut();
        showToast('Đã đăng xuất khỏi tài khoản Cloud!', 'info');
        setTimeout(() => location.reload(), 1000);
      });
    }
  } else {
    if (elCloudEmail) elCloudEmail.innerHTML = '<i class="ph-bold ph-lightbulb"></i> Email Cloud: Chưa đăng nhập (Chế độ lưu Cục bộ)';
    if (elCloudBadge) {
      elCloudBadge.className = 'badge badge-secondary';
      elCloudBadge.innerHTML = '<i class="ph-bold ph-cloud"></i> Chế độ Khách (Lưu LocalStorage)';
    }
    if (btnLogout) btnLogout.style.display = 'none';
  }

  if (formPass) {
    formPass.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = document.getElementById('new-password').value.trim();

      if (!user) {
        showToast('Bạn chưa đăng nhập tài khoản Supabase Cloud! Vui lòng Đăng nhập ở trang Cài đặt.', 'warning');
        return;
      }

      if (!newPass || newPass.length < 6) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'danger');
        return;
      }

      try {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;

        showToast('Cập nhật mật khẩu mới thành công!', 'success');
        document.getElementById('new-password').value = '';
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Lỗi khi cập nhật mật khẩu!', 'danger');
      }
    });
  }
}
