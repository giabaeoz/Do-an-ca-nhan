/* ==========================================================================
   TVU GPA Supporter - Smart TVU Portal Transcript Parser (js/parser.js)
   ========================================================================== */

import { convertGrade10To4 } from './config.js';

/**
 * Parse raw text pasted from TVU Student Portal
 * @param {string} rawText 
 * @returns {Array} List of extracted course objects
 */
export function parseTVUPortalText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const parsedCourses = [];

  let currentSemester = 'Học kỳ 1';

  const HEADER_NOISE = [
    'STT', 'MÃ HỌC PHẦN', 'TÊN HỌC PHẦN', 'SỐ TÍN CHỈ', 'SỐ TC',
    'ĐIỂM THI', 'ĐIỂM TỔNG KẾT', 'ĐIỂM CHỮ', 'ĐIỂM HỆ 4', 'ĐIỂM HỆ 10',
    'TRANG CHỦ', 'TRẠNG THÁI', 'GHI CHÚ', 'ĐẠI HỌC TRÀ VINH', 'TVU'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Skip summary noise lines starting with "-" or portal summary headers
    if (line.startsWith('-') || upperLine.includes('ĐIỂM TRUNG BÌNH') || upperLine.includes('SỐ TÍN CHỈ') || upperLine.includes('PHÂN LOẠI')) {
      continue;
    }

    // Check if line is a Semester header
    if (upperLine.includes('HỌC KỲ') || upperLine.includes('HỌC KÌ') || upperLine.match(/HK\s*\d+/i) || upperLine.includes('NĂM HỌC')) {
      currentSemester = cleanSemesterName(line);
      continue;
    }

    // Skip header noise lines
    if (HEADER_NOISE.some(noise => upperLine === noise || upperLine.startsWith(noise))) {
      continue;
    }

    // Strategy 1: Explicit Tab-Separated Line Parser (Primary for TVU Portal Copy-Paste)
    if (line.includes('\t')) {
      const tabCourse = extractCourseFromTabbedLine(line, currentSemester);
      if (tabCourse) {
        parsedCourses.push(tabCourse);
        continue;
      }
    }

    // Strategy 2: Concatenated Line Parser (Only for non-tabbed text)
    const concatCourse = extractCourseFromConcatLine(line, currentSemester);
    if (concatCourse) {
      parsedCourses.push(concatCourse);
      continue;
    }

    // Strategy 3: Multi-Space Delimited Line Fallback
    const spaceCourse = extractCourseFromSpacedLine(line, currentSemester);
    if (spaceCourse) {
      parsedCourses.push(spaceCourse);
    }
  }

  return parsedCourses;
}

/**
 * Standardize Semester naming (e.g. Học kỳ 1 - Năm học 2026 - 2027)
 */
function cleanSemesterName(raw) {
  const match = raw.match(/(Học k[ỳy]\s*\d+[^,\n]*|HK\s*\d+[^,\n]*)/i);
  if (match) {
    return match[0].replace(/\s+/g, ' ').trim();
  }
  return raw.substring(0, 50).trim();
}

/**
 * Strategy 1: Tab-Separated TVU Portal Line Parser
 * Handles:
 * - STT \t Code \t SubClass \t Name \t Credits \t Scores... \t Letter
 * - Float credits (e.g. 0.67)
 * - Zero credits (e.g. 0)
 * - Registered courses without grades
 * - Exempt grades (M, P)
 */
function extractCourseFromTabbedLine(line, semester) {
  const rawTokens = line.split('\t').map(t => t.trim());
  if (rawTokens.length < 3) return null;

  let startIndex = 0;
  if (/^\d{1,3}$/.test(rawTokens[0])) {
    startIndex = 1;
  }

  const code = rawTokens[startIndex];
  if (!code || !/^[A-Z0-9._-]{3,15}$/i.test(code)) {
    return null;
  }

  let nameIndex = startIndex + 1;
  const potentialSubClass = rawTokens[nameIndex];
  if (potentialSubClass !== undefined && (potentialSubClass === '' || /^(\d{1,4}|\d{1,3}_\d{1,3})$/.test(potentialSubClass))) {
    nameIndex = startIndex + 2;
  }

  const name = rawTokens[nameIndex];
  if (!name || name.length < 2) return null;

  // Credits token is the next non-empty token after nameIndex
  let creditsIndex = -1;
  for (let k = nameIndex + 1; k < rawTokens.length; k++) {
    if (rawTokens[k] !== '') {
      creditsIndex = k;
      break;
    }
  }

  if (creditsIndex === -1) return null;

  const creditsVal = parseFloat(rawTokens[creditsIndex]);
  const credits = isNaN(creditsVal) ? 3 : creditsVal;

  // Remaining non-empty tokens after credits
  const remainingTokens = rawTokens.slice(creditsIndex + 1).filter(Boolean);

  let score10 = null;
  let letter = '';

  if (remainingTokens.length > 0) {
    const letterTok = remainingTokens.find(tok => /^(A|B\+|B|C\+|C|D\+|D|F|M|P)$/i.test(tok));
    if (letterTok) {
      letter = letterTok.toUpperCase();
    }

    if (letter === 'M' || letter === 'P') {
      score10 = null;
    } else {
      const numericFloats = remainingTokens
        .map(t => parseFloat(t))
        .filter(n => !isNaN(n) && n >= 0 && n <= 10);

      if (numericFloats.length > 0) {
        if (letter) {
          const matched = numericFloats.find(n => convertGrade10To4(n).letter === letter);
          score10 = matched !== undefined ? matched : numericFloats[0];
        } else {
          score10 = numericFloats[0];
          letter = convertGrade10To4(score10).letter;
        }
      }
    }
  }

  return {
    code,
    name,
    credits,
    score10,
    letter,
    semester
  };
}

/**
 * Strategy 2: Concatenated TVU Portal Raw Line Parser (NO TABS)
 */
function extractCourseFromConcatLine(line, semester) {
  if (line.includes('\t')) return null;

  const regex = /^\s*(\d{1,2})\s*([A-Z0-9._-]{3,15})\s*(.+?)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)\s*([ABCDF][+]?|M|P)\s*$/i;
  let match = line.match(regex);

  if (!match) {
    const exemptRegex = /^\s*(\d{1,2})\s*([A-Z0-9._-]{3,15})\s*(.+?)\s*(\d+(?:\.\d+)?)\s*(M|P)\s*/i;
    match = line.match(exemptRegex);

    if (match) {
      return {
        code: match[2],
        name: match[3].trim(),
        credits: parseFloat(match[4]),
        score10: null,
        letter: match[5].toUpperCase(),
        semester
      };
    }
    return null;
  }

  const code = match[2];
  const name = match[3].trim();
  const credits = parseFloat(match[4]);
  const score10 = parseFloat(match[5]);
  const letter = match[8].toUpperCase();

  return {
    code,
    name,
    credits: isNaN(credits) ? 3 : credits,
    score10: isNaN(score10) ? null : score10,
    letter,
    semester
  };
}

/**
 * Strategy 3: Multi-Space Delimited Line Parser
 */
function extractCourseFromSpacedLine(line, semester) {
  const rawTokens = line.trim().split(/\s+/);
  if (rawTokens.length < 3) return null;

  let startIndex = 0;
  if (/^\d{1,3}$/.test(rawTokens[0])) {
    startIndex = 1;
  }

  const code = rawTokens[startIndex];
  if (!code || !/^[A-Z0-9._-]{3,15}$/i.test(code)) {
    return null;
  }

  let nameStartIndex = startIndex + 1;
  const potentialSubClass = rawTokens[nameStartIndex];
  if (potentialSubClass !== undefined && (potentialSubClass === '' || /^(\d{1,4}|\d{1,3}_\d{1,3})$/.test(potentialSubClass))) {
    nameStartIndex = startIndex + 2;
  }

  let creditsIndex = -1;
  for (let k = nameStartIndex + 1; k < rawTokens.length; k++) {
    const tok = rawTokens[k];
    if (tok === '') continue;

    if (/^\d+(\.\d+)?$/.test(tok)) {
      const tokensAfter = rawTokens.slice(k + 1).filter(Boolean);
      const allAfterAreGrades = tokensAfter.every(t =>
        /^(A|B\+|B|C\+|C|D\+|D|F|M|P)$/i.test(t) || (/^\d+(\.\d+)?$/.test(t) && parseFloat(t) <= 10.0)
      );

      if (tokensAfter.length === 0 || allAfterAreGrades) {
        creditsIndex = k;
        break;
      }
    }
  }

  if (creditsIndex === -1) return null;

  const nameTokens = rawTokens.slice(nameStartIndex, creditsIndex).filter(Boolean);
  if (nameTokens.length === 0) return null;
  const name = nameTokens.join(' ');

  const creditsVal = parseFloat(rawTokens[creditsIndex]);
  const credits = isNaN(creditsVal) ? 3 : creditsVal;

  const remainingTokens = rawTokens.slice(creditsIndex + 1).filter(Boolean);
  let score10 = null;
  let letter = '';

  if (remainingTokens.length > 0) {
    const letterTok = remainingTokens.find(tok => /^(A|B\+|B|C\+|C|D\+|D|F|M|P)$/i.test(tok));
    if (letterTok) letter = letterTok.toUpperCase();

    if (letter === 'M' || letter === 'P') {
      score10 = null;
    } else {
      const numericFloats = remainingTokens.map(t => parseFloat(t)).filter(n => !isNaN(n) && n >= 0 && n <= 10);
      if (numericFloats.length > 0) {
        if (letter) {
          const matched = numericFloats.find(n => convertGrade10To4(n).letter === letter);
          score10 = matched !== undefined ? matched : numericFloats[0];
        } else {
          score10 = numericFloats[0];
          letter = convertGrade10To4(score10).letter;
        }
      }
    }
  }

  return { code, name, credits, score10, letter, semester };
}
