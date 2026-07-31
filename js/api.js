/* ==========================================================================
   TVU GPA Supporter - Storage & API Layer with Supabase (js/api.js)
   ========================================================================== */

import { supabase, CONFIG, setTotalRequiredCredits, convertGrade10To4 } from './config.js';

/**
 * Fetch all local courses from localStorage
 */
export function getLocalCourses() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_COURSES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading local courses:', err);
    return [];
  }
}

/**
 * Save array of courses to localStorage
 */
export function saveLocalCourses(courses) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_COURSES, JSON.stringify(courses));
    return true;
  } catch (err) {
    console.error('Error saving local courses:', err);
    return false;
  }
}

/**
 * Append courses to localStorage
 */
export function appendCourses(newCourses) {
  const current = getLocalCourses();

  const formatted = newCourses.map(course => ({
    id: course.id || 'crs_' + Math.random().toString(36).substring(2, 9),
    code: (course.code || '').trim().toUpperCase(),
    name: (course.name || '').trim(),
    credits: Number(course.credits) || 0,
    score10: course.score10 !== undefined && course.score10 !== null ? Number(course.score10) : null,
    letter: (course.letter || '').trim().toUpperCase(),
    semester: (course.semester || 'Học kỳ 1').trim(),
    createdAt: course.createdAt || new Date().toISOString()
  }));

  const merged = [...current, ...formatted];
  saveLocalCourses(merged);
  return merged;
}

/**
 * Clear all stored local data & student profile
 */
export function clearAllLocalData() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEY_COURSES);
    localStorage.removeItem('tvu_student_profile');
    localStorage.removeItem('tvu_total_credits');
    return true;
  } catch (err) {
    console.error('Error clearing local data:', err);
    return false;
  }
}

/* ==========================================================================
   Supabase Authentication & Data Persistence Operations
   ========================================================================== */

/**
 * Get current authenticated user session
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.warn('getCurrentUser Error:', err);
    return null;
  }
}

/**
 * Upsert student profile into Supabase 'profiles' table & update Auth user_metadata
 */
export async function saveProfileToSupabase(profileData = {}) {
  const user = await getCurrentUser();
  if (!user) return null;

  // 1. Update Supabase Auth user_metadata
  try {
    await supabase.auth.updateUser({
      data: profileData
    });
  } catch (e) {
    console.warn('Supabase updateUser metadata error:', e);
  }

  // 2. Build record payload for Supabase 'profiles' table
  const record = {
    id: user.id,
    created_at: new Date().toISOString(),
    full_name: profileData.name || profileData.full_name || '',
    student_id: profileData.mssv || profileData.username || profileData.student_id || '',
    email: profileData.email || user.email || '',
    phone: profileData.phone || '',
    class_name: profileData.className || profileData.class_name || '',
    major: profileData.major || '',
    faculty: profileData.faculty || 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
    years: profileData.years || '2022 - 2026'
  };

  // Attempt upserting into profiles table
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(record, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Supabase profiles upsert info:', error.message);
      // Fallback: If custom columns do not exist in Supabase profiles table yet, insert minimal { id }
      if (error.message && error.message.includes('Could not find')) {
        const { data: fallbackData } = await supabase
          .from('profiles')
          .upsert({ id: user.id, created_at: record.created_at }, { onConflict: 'id' })
          .select();
        return fallbackData;
      }
    } else {
      console.log('⚡ Đã đẩy dữ liệu tài khoản vào bảng profiles trên Supabase Cloud!', data);
    }
    return data;
  } catch (err) {
    console.warn('saveProfileToSupabase Error:', err);
    return null;
  }
}

/**
 * Sign Up a new user with Email, Password, and Full Student Metadata
 */
export async function signUp(email, password, profileData = {}) {
  checkProtocolWarning();

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profileData
      }
    });

    if (error) {
      console.error('Supabase SignUp Error:', error);
      throw new Error(formatSupabaseError(error));
    }

    // Save profile metadata locally
    const studentProfile = {
      name: profileData.name || '',
      username: profileData.username || profileData.mssv || '',
      mssv: profileData.mssv || profileData.username || '',
      phone: profileData.phone || '',
      className: profileData.className || '',
      major: profileData.major || '',
      faculty: profileData.faculty || 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
      years: profileData.years || '2022 - 2026',
      email: email,
      avatar: '<i class="ph-fill ph-graduation-cap"></i>'
    };
    localStorage.setItem('tvu_student_profile', JSON.stringify(studentProfile));

    // Automatically push record into Supabase 'profiles' table
    if (data && data.user) {
      await saveProfileToSupabase(studentProfile);
    }

    if (data && data.user && !data.session && !data.user.email_confirmed_at) {
      throw new Error('Tài khoản đã tạo! Vui lòng vào Supabase Dashboard -> Authentication -> Providers -> Email -> Tắt "Confirm email" để có thể đăng nhập ngay mà không cần xác minh email.');
    }

    return data;
  } catch (err) {
    console.error('signUp Catch:', err);
    throw err;
  }
}

/**
 * Sign In an existing user with MSSV/Username OR Email and Password
 */
export async function signIn(identifier, password) {
  checkProtocolWarning();

  // Clear any existing session/local data before authenticating new user
  clearAllLocalData();

  let targetEmail = identifier ? identifier.trim() : '';

  // If user entered MSSV / Username without '@' (e.g., 110123456 or MSSV)
  if (targetEmail && !targetEmail.includes('@')) {
    const candidateEmail = `${targetEmail.toLowerCase()}@st.tvu.edu.vn`;

    // Attempt 1: Direct TVU student email format (mssv@st.tvu.edu.vn)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: candidateEmail,
        password
      });

      if (!error && data && data.user) {
        const meta = data.user.user_metadata || {};
        const syncProfile = {
          name: meta.name || data.user.email.split('@')[0],
          username: meta.username || meta.mssv || targetEmail,
          mssv: meta.mssv || meta.username || targetEmail,
          phone: meta.phone || '',
          className: meta.className || '',
          major: meta.major || '',
          faculty: meta.faculty || 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
          years: meta.years || '2022 - 2026',
          email: data.user.email,
          avatar: '<i class="ph-fill ph-graduation-cap"></i>'
        };
        localStorage.setItem('tvu_student_profile', JSON.stringify(syncProfile));
        await saveProfileToSupabase(syncProfile);
        await syncCoursesWithSupabase();
        return data;
      }
    } catch (e) {
      // Continue to query profiles table if direct candidate fails
    }

    // Attempt 2: Query profiles table by student_id
    try {
      const { data: profs } = await supabase
        .from('profiles')
        .select('email')
        .eq('student_id', targetEmail)
        .limit(1);

      if (profs && profs.length > 0 && profs[0].email) {
        targetEmail = profs[0].email;
      } else {
        targetEmail = candidateEmail;
      }
    } catch (e) {
      targetEmail = candidateEmail;
    }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password
    });

    if (error) {
      console.error('Supabase SignIn Error:', error);
      throw new Error(formatSupabaseError(error));
    }

    // Sync student profile from user_metadata if available
    if (data && data.user) {
      const meta = data.user.user_metadata || {};
      const syncProfile = {
        name: meta.name || data.user.email.split('@')[0],
        username: meta.username || meta.mssv || '',
        mssv: meta.mssv || meta.username || '',
        phone: meta.phone || '',
        className: meta.className || '',
        major: meta.major || '',
        faculty: meta.faculty || 'Trường Kỹ thuật và Công nghệ - ĐH Trà Vinh',
        years: meta.years || '2022 - 2026',
        email: data.user.email,
        avatar: '<i class="ph-fill ph-graduation-cap"></i>'
      };
      localStorage.setItem('tvu_student_profile', JSON.stringify(syncProfile));

      // Push record to Supabase profiles table
      await saveProfileToSupabase(syncProfile);
    }

    // Pull new user's cloud grades immediately
    await fetchGrades();

    return data;
  } catch (err) {
    console.error('signIn Catch:', err);
    throw err;
  }
}

/**
 * Format friendly Supabase error messages
 */
function formatSupabaseError(error) {
  const msg = error.message || '';
  if (msg.includes('Email not confirmed')) {
    return '<i class="ph-bold ph-warning"></i> Email chưa được xác thực! Hướng dẫn sửa: Vào Supabase Dashboard -> Authentication -> Providers -> Email -> Tắt nút [Confirm email].';
  }
  if (msg.includes('Invalid login credentials')) {
    return '<i class="ph-bold ph-x-circle"></i> Mật khẩu hoặc Email không chính xác, hoặc tài khoản chưa được tạo.';
  }
  if (msg.includes('User already registered')) {
    return '<i class="ph-bold ph-warning"></i> Email này đã được đăng ký trước đó. Vui lòng bấm "Đăng nhập"!';
  }
  if (msg.includes('Password should be at least')) {
    return '<i class="ph-bold ph-warning"></i> Mật khẩu phải có tối thiểu 6 ký tự!';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return '🚫 Lỗi kết nối mạng hoặc CORS! Hãy chắc chắn bạn đang mở trang qua localhost (http://localhost:8080) thay vì mở trực tiếp file://.';
  }
  return `<i class="ph-bold ph-x-circle"></i> Lỗi Supabase: ${msg}`;
}

/**
 * Warn user if opening via file:// protocol
 */
function checkProtocolWarning() {
  if (window.location.protocol === 'file:') {
    showToast('<i class="ph-bold ph-warning"></i> Bạn đang mở trang web dạng file:// trực tiếp. Vui lòng chạy qua web server (http://localhost:8080) để không bị chặn kết nối Supabase!', 'danger');
  }
}

/**
 * Sign Out current user & clear all local student profile and course data
 */
export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase SignOut Warning:', err);
  }

  // PURGE ALL USER DATA ON LOGOUT
  clearAllLocalData();
  return true;
}

/**
 * Save Grades: Deletes existing grades for current user in Supabase 'grades' table,
 * then inserts new array records. Also updates localStorage.
 */
export async function saveGrades(gradesArray) {
  saveLocalCourses(gradesArray);

  const user = await getCurrentUser();
  if (!user) {
    console.warn('<i class="ph-bold ph-lightning"></i> Đã lưu cục bộ. Để đồng bộ lên Supabase Cloud, vui lòng Đăng nhập ở phần Cài đặt.');
    return gradesArray;
  }

  const { error: deleteError } = await supabase
    .from('grades')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.warn('Supabase Delete Error:', deleteError);
  }

  if (!gradesArray || gradesArray.length === 0) {
    return [];
  }

  const records = gradesArray.map(item => {
    const score10 = item.score10 !== null && item.score10 !== undefined && !isNaN(item.score10) ? Number(item.score10) : null;
    const letter = (item.letter || '').trim().toUpperCase();
    const grade4Obj = score10 !== null ? convertGrade10To4(score10) : null;
    const grade4 = grade4Obj ? grade4Obj.scale4 : null;

    const creditsNum = typeof item.credits === 'number' ? item.credits : (parseFloat(item.credits) || 0);

    return {
      user_id: user.id,
      course_code: (item.code || '').trim().toUpperCase(),
      course_name: (item.name || '').trim(),
      credits: Math.round(creditsNum),
      grade_10: score10,
      grade_4: grade4,
      grade_letter: letter,
      semester_name: item.semester || 'Học kỳ 1'
    };
  });

  const { data: insertedData, error: insertError } = await supabase
    .from('grades')
    .insert(records)
    .select();

  if (insertError) {
    console.error('Supabase Batch Insert Error:', insertError);
    throw new Error(formatSupabaseError(insertError));
  }

  return insertedData;
}

/**
 * Fetch Grades: Fetches all grades for current user from Supabase 'grades' table.
 */
export async function fetchGrades() {
  const user = await getCurrentUser();
  if (!user) {
    return getLocalCourses();
  }

  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Supabase Fetch Grades Error:', error);
    return getLocalCourses();
  }

  if (data && Array.isArray(data)) {
    const formatted = data.map(item => ({
      id: item.id ? String(item.id) : 'crs_' + Math.random().toString(36).substring(2, 9),
      code: item.course_code || item.code || '',
      name: item.course_name || item.name || '',
      credits: Number(item.credits) || 0,
      score10: item.grade_10 !== null && item.grade_10 !== undefined ? Number(item.grade_10) : (item.score10 !== null && item.score10 !== undefined ? Number(item.score10) : null),
      letter: item.grade_letter !== undefined ? item.grade_letter : (item.letter || ''),
      semester: item.semester_name || item.semester || 'Học kỳ 1'
    }));

    saveLocalCourses(formatted);
    return formatted;
  }

  return getLocalCourses();
}

/**
 * Update Profile Settings: Upserts configuration settings into Supabase 'profiles' table.
 */
export async function updateSettings(totalCredits, targetGPA) {
  if (totalCredits) setTotalRequiredCredits(totalCredits);

  const user = await getCurrentUser();
  if (!user) return true;

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      total_credits: Number(totalCredits) || 150,
      target_gpa: Number(targetGPA) || 3.20,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Supabase Profile Upsert Error:', error);
    throw new Error(formatSupabaseError(error));
  }

  return data;
}

/**
 * Toast notification renderer helper
 */
export function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '<i class="ph-bold ph-check"></i>' : '<i class="ph-bold ph-warning"></i>'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // PERF: CSS class-based animation instead of inline styles CSSOM thrashing
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4500);
}
