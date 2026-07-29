/* ==========================================================================
   TVU GPA Supporter - Import / Parser Controller (js/pages/import.js)
   ========================================================================== */

import { getLocalCourses, saveGrades, showToast } from '../api.js';
import { parseTVUPortalText } from '../parser.js';

document.addEventListener('DOMContentLoaded', () => {
  initImportUI();
  renderImportedSummary();
});

/**
 * Initialize Textarea dropzone and analyze button
 */
function initImportUI() {
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnSample = document.getElementById('btn-sample-data');
  const textarea = document.getElementById('portal-textarea');

  if (btnAnalyze && textarea) {
    btnAnalyze.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) {
        showToast('Vui lòng dán văn bản bảng điểm từ Portal TVU vào ô bên trên!', 'danger');
        return;
      }

      btnAnalyze.disabled = true;
      const originalText = btnAnalyze.innerHTML;
      btnAnalyze.innerHTML = `<span class="spinner"></span> Đang phân tích...`;

      try {
        const parsed = parseTVUPortalText(text);
        if (parsed.length === 0) {
          showToast('Không nhận diện được môn học. Vui lòng kiểm tra lại văn bản dán!', 'danger');
        } else {
          await saveGrades(parsed);
          showToast(`⚡ Đã phân tích và lưu thành công ${parsed.length} môn học vào Supabase & hệ thống!`, 'success');
          textarea.value = '';
          renderImportedSummary();
        }
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Có lỗi xảy ra khi phân tích dữ liệu!', 'danger');
      } finally {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = originalText;
      }
    });
  }

  if (btnSample && textarea) {
    btnSample.addEventListener('click', () => {
      textarea.value = `Học kỳ 1 - Năm học 2026 - 2027
1	180053	183	Lịch sử Đảng Cộng sản Việt Nam	2							
2	220034	04	Chuyên đề Linux	3							
3	220086	10	Lập trình ứng dụng trên Windows	3							
4	220239	02	Phân tích và thiết kế hệ thống thông tin	3							
5	220265	08	Thực tập đồ án cơ sở ngành	3							
6	220267	10	Điện toán đám mây	3							
7	320045	08	Thống kê và phân tích dữ liệu	3							
- Điểm trung bình học kỳ hệ 4:	
- Điểm trung bình học kỳ hệ 10:	
- Số tín chỉ đạt học kỳ:	
- Điểm trung bình tích lũy hệ 4:	3.14
- Điểm trung bình tích lũy hệ 10:	7.85
- Số tín chỉ tích lũy:	74.01
Học kỳ 3 - Năm học 2025 - 2026
1	180001	65	Tư tưởng Hồ Chí Minh	2							
- Điểm trung bình học kỳ hệ 4:	
- Điểm trung bình học kỳ hệ 10:	
- Số tín chỉ đạt học kỳ:	
- Điểm trung bình tích lũy hệ 4:	3.14
- Điểm trung bình tích lũy hệ 10:	7.85
- Số tín chỉ tích lũy:	74.01
Học kỳ 2 - Năm học 2025 - 2026
1	110057	02	Quy hoạch tuyến tính	2							
2	180052	38_11	Chủ nghĩa xã hội khoa học	2							
3	220018	02	Mạng máy tính	3							
4	220101	04	Hệ điều hành	3							
5	220236	01	Thiết kế Web	3	9.3			9.3	4.0	A	
6	220237	02	Lý thuyết xếp hàng	2	9.9			9.9	4.0	A	
7	220250	04	Anh văn chuyên ngành công nghệ thông tin	3							
8	410294	37_26	Anh văn không chuyên 4	3							
- Điểm trung bình học kỳ hệ 4:	4.00
- Điểm trung bình học kỳ hệ 10:	9.54
- Số tín chỉ đạt học kỳ:	5
- Điểm trung bình tích lũy hệ 4:	3.14
- Điểm trung bình tích lũy hệ 10:	7.85
- Số tín chỉ tích lũy:	74.01
- Phân loại điểm trung bình HK:	Xuất sắc
Học kỳ 1 - Năm học 2025 - 2026
1	110002	05	Vi tích phân A2	2	8.7			8.7	3.5	B+	
2	110079	05	Kiến trúc máy tính	3	9.3			9.3	4.0	A	
3	180051	41	Kinh tế chính trị Mác - Lênin	2	8.3			8.3	3.5	B+	
4	193.15	35	Giáo dục thể chất 3 (bóng chuyền)	1	7.4			7.4	3.0	B	
5	220096	05	Cơ sở dữ liệu	3	8.5			8.5	3.5	B+	
6	220099	05	Lập trình hướng đối tượng	3	8.8			8.8	3.5	B+	
7	220100	05	Lý thuyết đồ thị	3	9.1			9.1	4.0	A	
8	410293	34	Anh văn không chuyên 3	3	8.6			8.6	3.5	B+	
- Điểm trung bình học kỳ hệ 4:	3.66
- Điểm trung bình học kỳ hệ 10:	8.78
- Số tín chỉ đạt học kỳ:	20
- Điểm trung bình tích lũy hệ 4:	3.05
- Điểm trung bình tích lũy hệ 10:	7.67
- Số tín chỉ tích lũy:	69.01
- Phân loại điểm trung bình HK:	Xuất sắc
Học kỳ 2 - Năm học 2024 - 2025
1	110003	02	Toán rời rạc	2	5.8			5.8	2.0	C	
2	150008	20	Kỹ năng mềm - Làm việc nhóm	0.67	10.0			10.0	4.0	A
3	150010	19	Kỹ năng mềm - Quản lý tài chính cá nhân	0.67	8.2			8.2	3.5	B+	
4	150012	11	Kỹ năng mềm - Thuyết trình	0.67	8.9			8.9	3.5	B+	
5	170011	03	Tiếng Việt thực hành	2	6.9			6.9	2.5	C+	
6	180050	46	Triết học Mác - Lênin	3	6.7			6.7	2.5	C+	
7	192.08	27	Giáo dục thể chất 2 (bóng đá)	1	7.2			7.2	3.0	B	
8	220233	02	Đại số đại cương	2	6.3			6.3	2.0	C	
9	220234	02	Cấu trúc dữ liệu và giải thuật	4	7.2			7.2	3.0	B	
10	290000	17	Phương pháp nghiên cứu khoa học	2	7.6			7.6	3.0	B	
11	640033	10	Logic học đại cương	2	6.6			6.6	2.5	C+	
- Điểm trung bình học kỳ hệ 4:	2.56
- Điểm trung bình học kỳ hệ 10:	6.78
- Số tín chỉ đạt học kỳ:	20.01
- Điểm trung bình tích lũy hệ 4:	2.67
- Điểm trung bình tích lũy hệ 10:	6.97
- Số tín chỉ tích lũy:	49.01
- Phân loại điểm trung bình HK:	Khá
Học kỳ 1 - Năm học 2024 - 2025
1	000025	01	Chuyên đề 1 (SHĐK)	0							
2	000026	01	Chuyên đề 2 (SHĐK)	0							
3	000027	01	Chuyên đề 3 (SHĐK)	0							
4	110001	02	Đại số tuyến tính	2	6.9			6.9	2.5	C+	
5	110042	02	Vi tích phân A1	3	6.8			6.8	2.5	C+	
6	190081	03	Học phần I: Đường lối QP và an ninh của ĐCSVN	3	8.9			8.9	3.5	B+	
7	190082	03	Học phần II: Công tác quốc phòng và an ninh	2	6.9			6.9	2.5	C+	
8	190083	72	Học phần III: Quân sự chung	1	7.8			7.8	3.0	B	
9	190084	72	Học phần IV: Kỹ thuật chiến đấu bộ binh và chiến thuật	2	8.3			8.3	3.5	B+	
10	191.00	71	Giáo dục thể chất 1 (Điền kinh)	1	6.3			6.3	2.0	C	
11	220092	02	Nhập môn công nghệ thông tin	2	9.1			9.1	4.0	A	
12	220228	02	Kỹ thuật lập trình	4	6.7			6.7	2.5	C+	
13	410291		Anh văn không chuyên 1	3	M			M		M	
14	410292		Anh văn không chuyên 2	4	M			M		M	
15	450015	03	Pháp luật đại cương	2	7.3			7.3	3.0	B	
- Điểm trung bình học kỳ hệ 4:	2.81
- Điểm trung bình học kỳ hệ 10:	7.22
- Số tín chỉ đạt học kỳ:	29
- Điểm trung bình tích lũy hệ 4:	2.81
- Điểm trung bình tích lũy hệ 10:	7.22
- Số tín chỉ tích lũy:	29
- Phân loại điểm trung bình HK:	Khá`;
      showToast('Đã điền dữ liệu dán Portal TVU đầy đủ 44 môn! Bấm "Phân tích & Lưu bảng điểm" để lưu vào Supabase.', 'success');
    });
  }
}

/**
 * Render quick summary of all imported courses
 */
function renderImportedSummary() {
  const container = document.getElementById('imported-preview-list');
  if (!container) return;

  const courses = getLocalCourses();

  if (!courses || courses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem;">
        <p>Chưa có dữ liệu môn học. Dán bảng điểm bên trên và bấm 'Phân tích'!</p>
      </div>
    `;
    return;
  }

  const recent = [...courses].reverse();
  container.innerHTML = recent.map(c => {
    let badgeClass = 'badge-success';
    let badgeText = c.letter;
    if (!c.letter && c.score10 === null) {
      badgeClass = 'badge-secondary';
      badgeText = 'Đã đăng ký';
    } else if (c.letter === 'M' || c.letter === 'P') {
      badgeClass = 'badge-info';
    } else if (c.letter === 'F') {
      badgeClass = 'badge-danger';
    }

    return `
      <div class="parsed-item-card">
        <div>
          <div class="parsed-item-title">${c.name}</div>
          <div class="parsed-item-meta">${c.code || 'Mã môn N/A'} • ${c.credits} TC • ${c.semester}</div>
        </div>
        <div>
          <span class="badge ${badgeClass}">
            ${badgeText} ${c.score10 !== null && c.score10 !== undefined ? `(${c.score10})` : ''}
          </span>
        </div>
      </div>
    `;
  }).join('');
}
