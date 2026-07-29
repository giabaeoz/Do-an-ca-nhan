/* ==========================================================================
   TVU GPA Supporter - TVU Academic Calculator Engine (js/calculator.js)
   ========================================================================== */

import { getTotalRequiredCredits, convertGrade10To4, letterToScale4 } from './config.js';

/**
 * Helper: Identify Soft Skills courses (Kỹ năng mềm)
 * Credits must always be exactly 0.67 TC
 */
export function isSoftSkillCourse(course) {
  if (!course) return false;
  const name = (course.name || '').toLowerCase();
  const code = (course.code || '').trim().toUpperCase();
  return /^(150008|150010|150012)$/.test(code) || name.includes('kỹ năng mềm') || name.includes('knm');
}

/**
 * Helper: Identify Non-GPA subjects (Quân sự / QPAN, Kỹ năng mềm, Giáo dục thể chất)
 * These courses add to accumulated credits (tín chỉ tích lũy) when passed,
 * but do NOT contribute to GPA sum or GPA credit divisor.
 */
export function isNonGPACourse(course) {
  if (!course) return false;
  const name = (course.name || '').toLowerCase();
  const code = (course.code || '').trim().toUpperCase();
  const letter = (course.letter || '').trim().toUpperCase();

  if (letter === 'M' || letter === 'Đ' || letter === 'P') return true;

  if (
    name.includes('giáo dục thể chất') ||
    name.includes('gdtc') ||
    name.includes('kỹ năng mềm') ||
    name.includes('knm') ||
    name.includes('quốc phòng') ||
    name.includes('quân sự') ||
    name.includes('đường lối qp') ||
    name.includes('công tác quốc phòng') ||
    name.includes('quân sự chung') ||
    name.includes('kỹ thuật chiến đấu') ||
    name.includes('shđk') ||
    name.includes('sinh hoạt đầu khóa') ||
    name.includes('chuyên đề shđk') ||
    /^19[0-9]\./.test(code) ||
    /^(190081|190082|190083|190084|150008|150010|150012)$/.test(code)
  ) {
    return true;
  }
  return false;
}

/**
 * Extract Year and Semester number for chronological sorting
 */
export function parseSemesterYear(semStr) {
  if (!semStr) return { year: 0, semNum: 0 };
  const yearMatch = semStr.match(/Năm học\s*(\d{4})/i) || semStr.match(/(\d{4})\s*-\s*\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 0;
  
  const semMatch = semStr.match(/(Học k[ỳy]|HK)\s*(\d+)/i);
  const semNum = semMatch ? parseInt(semMatch[2]) : 0;

  return { year, semNum };
}

/**
 * Sort semester string array newest first (e.g. 2026-2027 HK1 > 2025-2026 HK3 > 2025-2026 HK2 > 2024-2025 HK1)
 */
export function sortSemestersNewestFirst(semesterList = []) {
  return [...semesterList].sort((a, b) => {
    const semA = parseSemesterYear(a);
    const semB = parseSemesterYear(b);
    if (semA.year !== semB.year) {
      return semB.year - semA.year;
    }
    return semB.semNum - semA.semNum;
  });
}

/**
 * Sort semester string array oldest first
 */
export function sortSemestersOldestFirst(semesterList = []) {
  return [...semesterList].sort((a, b) => {
    const semA = parseSemesterYear(a);
    const semB = parseSemesterYear(b);
    if (semA.year !== semB.year) {
      return semA.year - semB.year;
    }
    return semA.semNum - semB.semNum;
  });
}

/**
 * Process list of courses according to TVU credit rules:
 * - Mark duplicate course codes so only highest scoring attempt counts for GPA & total credits
 * - Exempt grade 'M' & Non-GPA subjects (Quân sự, GDTC, KNM): Added to earned credits, but EXCLUDED from GPA sum & credit divisor
 * - Failed courses (Grade F / scale4 < 1.0): 0 earned credits AND EXCLUDED from GPA calculation
 * - Soft Skills courses (Kỹ năng mềm): Exact 0.67 TC
 * - Return annotated courses and overall metrics
 */
export function calculateTVUGPA(courses = []) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return {
      annotatedCourses: [],
      gpa4: 0,
      gpa10: 0,
      earnedCredits: 0,
      totalGPACredits: 0,
      exemptCredits: 0,
      passedCoursesCount: 0,
      retakenCoursesCount: 0
    };
  }

  // Group courses by course code to handle retaken courses
  const courseGroups = {};

  courses.forEach(c => {
    const code = (c.code || '').trim().toUpperCase();
    const isExempt = (c.letter || '').toUpperCase() === 'M' || (c.letter || '').toUpperCase() === 'P';
    const isNonGPA = isNonGPACourse(c);
    const hasGrade = (c.letter && c.letter !== '') || (c.score10 !== null && c.score10 !== undefined);
    const scale4 = isExempt ? null : (hasGrade ? (letterToScale4(c.letter) ?? (c.score10 !== null ? convertGrade10To4(c.score10).scale4 : 0)) : null);
    
    // Ensure Soft Skills credits are 0.67
    let credits = Number(c.credits) || 0;
    if (isSoftSkillCourse(c)) {
      credits = 0.67;
    }

    const enriched = {
      ...c,
      code,
      credits,
      scale4,
      isExempt,
      isNonGPA,
      hasGrade,
      isRetaken: false
    };

    if (!code) {
      const uid = 'nocode_' + Math.random();
      courseGroups[uid] = [enriched];
    } else {
      if (!courseGroups[code]) courseGroups[code] = [];
      courseGroups[code].push(enriched);
    }
  });

  const annotatedCourses = [];
  let retakenCoursesCount = 0;

  Object.values(courseGroups).forEach(group => {
    if (group.length === 1) {
      annotatedCourses.push(group[0]);
    } else {
      let bestIndex = 0;
      let maxScore = -1;

      group.forEach((item, idx) => {
        const score = item.isExempt ? 4.0 : (item.scale4 ?? -1);
        if (score > maxScore) {
          maxScore = score;
          bestIndex = idx;
        }
      });

      group.forEach((item, idx) => {
        if (idx !== bestIndex) {
          item.isRetaken = true;
          retakenCoursesCount++;
        }
        annotatedCourses.push(item);
      });
    }
  });

  let sumGradePoints4 = 0;
  let sumGradePoints10 = 0;
  let totalGPACredits = 0;
  let earnedCredits = 0;
  let exemptCredits = 0;
  let passedCoursesCount = 0;

  annotatedCourses.forEach(c => {
    let credits = Number(c.credits) || 0;
    if (isSoftSkillCourse(c)) {
      credits = 0.67;
      c.credits = 0.67;
    }

    if (c.isRetaken) return;

    // Skip un-graded courses (currently registered)
    if (!c.hasGrade) return;

    const scale4 = c.scale4 ?? 0;
    const isPassed = c.isExempt || scale4 >= 1.0;

    // USER RULE: Failed courses (F) do NOT earn credits, and are NOT calculated into semester GPA!
    if (!isPassed) {
      return;
    }

    earnedCredits += credits;
    passedCoursesCount++;

    // Exclude non-GPA courses (Quân sự, GDTC, KNM, Exempt M/P) from GPA sum & credit divisor
    if (c.isNonGPA || c.isExempt) {
      exemptCredits += credits;
      return;
    }

    const score10 = c.score10 !== null && c.score10 !== undefined ? Number(c.score10) : (scale4 * 2.5);

    sumGradePoints4 += (scale4 * credits);
    sumGradePoints10 += (score10 * credits);
    totalGPACredits += credits;
  });

  const gpa4 = totalGPACredits > 0 ? (sumGradePoints4 / totalGPACredits) : 0;
  const gpa10 = totalGPACredits > 0 ? (sumGradePoints10 / totalGPACredits) : 0;

  return {
    annotatedCourses,
    gpa4: Number(gpa4.toFixed(2)),
    gpa10: Number(gpa10.toFixed(2)),
    earnedCredits: Number(earnedCredits.toFixed(2)),
    totalGPACredits: Number(totalGPACredits.toFixed(2)),
    exemptCredits: Number(exemptCredits.toFixed(2)),
    passedCoursesCount,
    retakenCoursesCount
  };
}

/**
 * Calculate Cumulative GPA per semester (Returns newest semester first)
 */
export function calculateSemesterSummaries(courses = []) {
  const result = calculateTVUGPA(courses);
  const annotated = result.annotatedCourses;

  const semesterMap = {};
  annotated.forEach(c => {
    const sem = c.semester || 'Học kỳ 1';
    if (!semesterMap[sem]) semesterMap[sem] = [];
    semesterMap[sem].push(c);
  });

  const rawSemNames = Object.keys(semesterMap);
  const oldestFirstNames = sortSemestersOldestFirst(rawSemNames);

  const summaries = [];
  let cumCourses = [];

  oldestFirstNames.forEach(semName => {
    const semCourses = semesterMap[semName];
    cumCourses = [...cumCourses, ...semCourses];

    const semCalc = calculateTVUGPA(semCourses);
    const cumCalc = calculateTVUGPA(cumCourses);

    summaries.push({
      semester: semName,
      courses: semCourses,
      semGPA4: semCalc.gpa4,
      semGPA10: semCalc.gpa10,
      semCredits: semCalc.earnedCredits,
      cumGPA4: cumCalc.gpa4,
      cumGPA10: cumCalc.gpa10,
      cumCredits: cumCalc.earnedCredits
    });
  });

  // Return summaries sorted in newest-first order
  return [...summaries].sort((a, b) => {
    const semA = parseSemesterYear(a.semester);
    const semB = parseSemesterYear(b.semester);
    if (semA.year !== semB.year) {
      return semB.year - semA.year;
    }
    return semB.semNum - semA.semNum;
  });
}

/**
 * Strategy Calculator: Required GPA for remaining credits to achieve Target GPA
 */
export function calculateGPAStrategy(currentGPA, earnedCredits, targetGPA = 3.20, totalProgramCredits = getTotalRequiredCredits()) {
  const remainingCredits = Math.max(0, totalProgramCredits - earnedCredits);

  if (remainingCredits === 0) {
    return {
      remainingCredits: 0,
      requiredGPA: 0,
      isAchieved: currentGPA >= targetGPA,
      feasibility: currentGPA >= targetGPA ? 'Đã đạt mục tiêu' : 'Đã kết thúc CTĐT',
      badgeClass: currentGPA >= targetGPA ? 'badge-success' : 'badge-danger'
    };
  }

  const targetPoints = targetGPA * totalProgramCredits;
  const currentPoints = currentGPA * earnedCredits;
  const requiredPoints = targetPoints - currentPoints;
  const requiredGPA = requiredPoints / remainingCredits;

  let feasibility = '';
  let badgeClass = '';

  if (requiredGPA > 4.0) {
    feasibility = 'Không khả thi (Yêu cầu GPA > 4.0)';
    badgeClass = 'badge-danger';
  } else if (requiredGPA > 3.6) {
    feasibility = 'Rất thách thức (Yêu cầu duy trì điểm A)';
    badgeClass = 'badge-warning';
  } else if (requiredGPA > 3.2) {
    feasibility = 'Khả thi (Yêu cầu duy trì điểm B+ trở lên)';
    badgeClass = 'badge-info';
  } else if (requiredGPA <= 0) {
    feasibility = 'Chắc chắn đạt mục tiêu!';
    badgeClass = 'badge-success';
  } else {
    feasibility = 'Hoàn toàn trong tầm tay';
    badgeClass = 'badge-success';
  }

  return {
    remainingCredits,
    requiredGPA: Math.max(0, Number(requiredGPA.toFixed(2))),
    feasibility,
    badgeClass,
    isAchieved: currentGPA >= targetGPA
  };
}

/**
 * What-if Calculator: Calculate new Cumulative GPA after adding simulated upcoming courses
 * @param {number} currentTotalCredits Current earned GPA credits (e.g., 50)
 * @param {number} currentGPA4 Current cumulative GPA on 4.0 scale (e.g., 2.67)
 * @param {Array} simulatedCoursesArray List of simulated course objects [{ name, credits, score10 }, ...]
 * @returns {Object} { baseGPA, newGPA4, newTotalCredits, addedCredits, gpaDiff }
 */
export function calculateSimulatedGPA(currentTotalCredits = 0, currentGPA4 = 0, simulatedCoursesArray = []) {
  const baseCredits = Math.max(0, Number(currentTotalCredits) || 0);
  const baseGPA = Math.max(0, Number(currentGPA4) || 0);
  let currentTotalPoints = baseGPA * baseCredits;

  let addedCredits = 0;
  let addedPoints = 0;

  if (Array.isArray(simulatedCoursesArray)) {
    simulatedCoursesArray.forEach(c => {
      const credits = Math.max(0, Number(c.credits) || 0);
      const score10 = c.score10 !== null && c.score10 !== undefined && !isNaN(c.score10) ? Number(c.score10) : null;

      if (credits > 0 && score10 !== null) {
        const grade4Obj = convertGrade10To4(score10);
        const scale4 = grade4Obj ? grade4Obj.scale4 : 0;
        
        // Include in GPA calculation if scale4 >= 1.0 (Passed)
        if (scale4 >= 1.0) {
          addedCredits += credits;
          addedPoints += (scale4 * credits);
        }
      }
    });
  }

  const newTotalCredits = baseCredits + addedCredits;
  const newTotalPoints = currentTotalPoints + addedPoints;
  const newGPA4 = newTotalCredits > 0 ? (newTotalPoints / newTotalCredits) : baseGPA;
  const gpaDiff = newGPA4 - baseGPA;

  return {
    baseGPA: Number(baseGPA.toFixed(2)),
    newGPA4: Number(newGPA4.toFixed(2)),
    newTotalCredits: Number(newTotalCredits.toFixed(2)),
    addedCredits: Number(addedCredits.toFixed(2)),
    gpaDiff: Number(gpaDiff.toFixed(2))
  };
}
