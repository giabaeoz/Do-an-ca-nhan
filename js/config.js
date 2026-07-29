/* ==========================================================================
   TVU GPA Supporter - System Configuration & Supabase Init (js/config.js)
   ========================================================================== */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase Credentials
export const SUPABASE_URL = 'https://uhqvankajktrkbydfixk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_pKLKuuSiLu2Bwp4hpUxIPg_3OdOFa6h';

// Initialized Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// System Constants
export const CONFIG = {
  DEFAULT_TOTAL_CREDITS: 150,
  STORAGE_KEY_COURSES: 'tvu_gpa_courses_v1',
  STORAGE_KEY_SETTINGS: 'tvu_gpa_settings_v1',
  
  // TVU Academic Grade Scale Standards
  GRADE_SCALE: [
    { min10: 9.0, max10: 10.0, letter: 'A',  scale4: 4.0, description: 'Xuất sắc' },
    { min10: 8.0, max10: 8.9,  letter: 'B+', scale4: 3.5, description: 'Giỏi' },
    { min10: 7.0, max10: 7.9,  letter: 'B',  scale4: 3.0, description: 'Khá giỏi' },
    { min10: 6.5, max10: 6.9,  letter: 'C+', scale4: 2.5, description: 'Khá' },
    { min10: 5.5, max10: 6.4,  letter: 'C',  scale4: 2.0, description: 'Trung bình khá' },
    { min10: 5.0, max10: 5.4,  letter: 'D+', scale4: 1.5, description: 'Trung bình' },
    { min10: 4.0, max10: 4.9,  letter: 'D',  scale4: 1.0, description: 'Trung bình yếu' },
    { min10: 0.0, max10: 3.9,  letter: 'F',  scale4: 0.0, description: 'Kém (Nợ môn)' },
  ],

  SPECIAL_GRADES: {
    'M': { letter: 'M', scale4: null, description: 'Miễn (Được tính tín chỉ, KHÔNG chia GPA)' },
    'P': { letter: 'P', scale4: null, description: 'Đạt (Không chia GPA)' }
  }
};

/**
 * Get total required major credits from settings (default 150)
 */
export function getTotalRequiredCredits() {
  try {
    const settings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SETTINGS) || '{}');
    return settings.totalRequiredCredits ? parseInt(settings.totalRequiredCredits) : CONFIG.DEFAULT_TOTAL_CREDITS;
  } catch (err) {
    return CONFIG.DEFAULT_TOTAL_CREDITS;
  }
}

/**
 * Save total required major credits to settings
 */
export function setTotalRequiredCredits(credits) {
  try {
    const settings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_SETTINGS) || '{}');
    settings.totalRequiredCredits = parseInt(credits) || CONFIG.DEFAULT_TOTAL_CREDITS;
    localStorage.setItem(CONFIG.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Error saving total credits:', err);
    return false;
  }
}

/**
 * Convert numeric scale 10 grade to scale 4 & letter grade according to TVU rules
 */
export function convertGrade10To4(score10) {
  if (score10 === null || score10 === undefined || isNaN(score10)) {
    return { scale4: 0, letter: 'F' };
  }
  const score = parseFloat(score10);
  const match = CONFIG.GRADE_SCALE.find(g => score >= g.min10 && score <= g.max10);
  if (match) {
    return { scale4: match.scale4, letter: match.letter };
  }
  if (score < 4.0) return { scale4: 0.0, letter: 'F' };
  return { scale4: 4.0, letter: 'A' };
}

/**
 * Get scale 4 score from letter grade
 */
export function letterToScale4(letter) {
  if (!letter) return 0;
  const l = letter.trim().toUpperCase();
  if (l === 'M' || l === 'P') return null; // Exempt
  const match = CONFIG.GRADE_SCALE.find(g => g.letter.toUpperCase() === l);
  return match ? match.scale4 : 0;
}
