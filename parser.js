const XLSX = require('xlsx');
const path = require('path');

const PROFESSORS = ['김용하', '김태곤', '이준호', '김일국', '김성은'];
const VALID_DIAGNOSIS_CODES = new Set('ABCDEFGHIJK'.split(''));

function toTrimmedText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function extractDiagnosisCode(rawValue) {
  const text = toTrimmedText(rawValue);
  if (!text) return null;

  const upper = text.toUpperCase();
  if (upper === 'UNKNOWN' || upper === '-') return null;

  const leadingMatch = upper.match(/^\s*([A-K])(?:[\s\.\)\]\-:：]|$)/);
  if (leadingMatch) return leadingMatch[1];

  const anyMatch = upper.match(/(?:^|[\s\(\[])([A-K])(?:[\s\.\)\]\-:：]|$)/);
  if (anyMatch) return anyMatch[1];

  return VALID_DIAGNOSIS_CODES.has(upper) ? upper : null;
}

// 행에서 특정 레이블 뒤의 숫자 값을 찾음 (레이블-값 쌍 구조)
function findValueByLabel(row, labels) {
  for (let i = 0; i < row.length - 1; i++) {
    const cell = toTrimmedText(row[i]);
    for (const label of labels) {
      if (cell === label || cell.toUpperCase() === label.toUpperCase()) {
        const val = Number(row[i + 1]);
        if (!isNaN(val)) return val;
      }
    }
  }
  return 0;
}

// 특정 레이블을 포함하는 행의 인덱스를 탐색 (최대 scanLimit 행까지)
function findRowIndex(rows, labels, scanLimit = 20) {
  for (let i = 0; i < Math.min(rows.length, scanLimit); i++) {
    const row = rows[i];
    if (!row) continue;
    for (const cell of row) {
      const text = toTrimmedText(cell);
      if (labels.some((l) => text === l || text.toUpperCase() === l.toUpperCase())) {
        return i;
      }
    }
  }
  return -1;
}

// 섹션 헤더 행에서 열 위치 맵 생성
function buildColumnMap(headerRow) {
  const map = { patientName: -1, charge: -1, diagnosis: -1, operationName: -1, anesthesia: -1 };
  if (!headerRow) return map;
  headerRow.forEach((cell, idx) => {
    const text = toTrimmedText(cell).toLowerCase();
    if (text === '이름') map.patientName = idx;
    else if (text === 'charge' || text === 'op team') map.charge = idx;
    else if (text === '진단') map.diagnosis = idx;
    else if (text === '수술명') map.operationName = idx;
    else if (text === '마취') map.anesthesia = idx;
  });
  // 못 찾으면 기존 기본값으로 폴백
  if (map.patientName < 0) map.patientName = 2;
  if (map.charge < 0) map.charge = 7;
  if (map.diagnosis < 0) map.diagnosis = 8;
  if (map.operationName < 0) map.operationName = 10;
  if (map.anesthesia < 0) map.anesthesia = 11;
  return map;
}

function parseDailyLog(filePath, originalFileName) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = '출력';
  const sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // 날짜: 파일명에서 추출, 없으면 "날짜 :" 레이블 옆 셀에서 탐색
  let dateStr;
  const nameToMatch = originalFileName || path.basename(filePath);
  const dateMatch = nameToMatch.match(/(\d{8})/);

  if (dateMatch) {
    const d = dateMatch[1];
    dateStr = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
  } else {
    let dateVal = null;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i] || [];
      for (let j = 0; j < row.length - 1; j++) {
        if (toTrimmedText(row[j]).includes('날짜')) {
          dateVal = row[j + 1];
          break;
        }
      }
      if (dateVal !== null) break;
    }
    if (typeof dateVal === 'number') {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      dateStr = date.toISOString().split('T')[0];
    } else {
      dateStr = toTrimmedText(dateVal, 'Unknown');
    }
  }

  // 요약 통계: "입원" 레이블이 있는 행 탐색
  const patientStatsRowIdx = findRowIndex(rows, ['입원', 'ADMISSION'], 15);
  const surgeryStatsRowIdx = findRowIndex(rows, ['전신', 'GENERAL'], 15);

  const patientRow = patientStatsRowIdx >= 0 ? (rows[patientStatsRowIdx] || []) : [];
  const surgeryRow = surgeryStatsRowIdx >= 0 ? (rows[surgeryStatsRowIdx] || []) : [];

  const stats = {
    date: dateStr,
    admission_count:       findValueByLabel(patientRow, ['입원']),
    discharge_count:       findValueByLabel(patientRow, ['퇴원']),
    current_patient_count: findValueByLabel(patientRow, ['재원']),
    first_visit_count:     findValueByLabel(patientRow, ['초진']),
    re_visit_count:        findValueByLabel(patientRow, ['재진']),
    general_count:         findValueByLabel(surgeryRow, ['전신']),
    local_count:           findValueByLabel(surgeryRow, ['국소']),
    emergency_count:       findValueByLabel(surgeryRow, ['응급']),
    main_dept_count:       findValueByLabel(surgeryRow, ['본과']),
    other_dept_count:      findValueByLabel(surgeryRow, ['타과']),
    total_surgery_count:   findValueByLabel(surgeryRow, ['합계']),
    er_first_count: 0,
    er_suture_count: 0,
  };

  const professorStats = {};
  const professorCases = [];

  for (const professor of PROFESSORS) {
    professorStats[professor] = { general: 0, local: 0, bpb: 0, mac: 0, snb: 0, fnb: 0, spinal: 0, admission: 0, discharge: 0 };
  }

  let currentSection = '';
  let currentColMap = buildColumnMap(null); // 기본값

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const firstCell = toTrimmedText(row[0]).toUpperCase();

    // 섹션 감지
    if (firstCell === 'ADMISSION' || firstCell === '입원환자') {
      currentSection = 'ADMISSION';
      continue;
    } else if (firstCell === 'DISCHARGE' || firstCell === '퇴원환자') {
      currentSection = 'DISCHARGE';
      continue;
    } else if (firstCell.startsWith('EMERGENCY OPERATION') || firstCell.includes('응급수술')) {
      currentSection = 'EMERGENCY_OP';
      continue;
    } else if (firstCell === 'OPERATION' || firstCell === '수술환자') {
      currentSection = 'OP';
      continue;
    } else if (firstCell.startsWith('EMERGENCY ROOM') || firstCell.includes('응급실')) {
      currentSection = 'ER';
      continue;
    }

    // 헤더 행 감지: 등록번호 / 이름 / Charge 등이 있는 행 → 열 위치 맵 갱신
    const isHeaderRow = row.some((cell) => {
      const t = toTrimmedText(cell).toLowerCase();
      return t === '이름' || t === 'charge' || t === 'op team' || t === '등록번호';
    });
    if (isHeaderRow && currentSection) {
      currentColMap = buildColumnMap(row);
      continue;
    }

    // 케이스 데이터 행: 첫 번째 셀이 숫자(등록번호)인 경우
    const isDataRow = /^\d{5,}$/.test(toTrimmedText(row[0]));
    if (!isDataRow || !currentSection) continue;

    if (['ADMISSION', 'DISCHARGE', 'OP', 'EMERGENCY_OP'].includes(currentSection)) {
      const charge = toTrimmedText(row[currentColMap.charge]);
      if (charge) {
        for (const professor of PROFESSORS) {
          if (!charge.includes(professor)) continue;

          if (currentSection === 'ADMISSION') professorStats[professor].admission += 1;
          if (currentSection === 'DISCHARGE') professorStats[professor].discharge += 1;

          if (currentSection === 'OP' || currentSection === 'EMERGENCY_OP') {
            const anesthesiaRaw = toTrimmedText(row[currentColMap.anesthesia], 'Unknown');
            const cleanAnesthesia = anesthesiaRaw.replace(/^[A-Z]\.\s*/, '');
            const anesthesiaUpper = cleanAnesthesia.toUpperCase();

            if (anesthesiaUpper.includes('GENERAL')) professorStats[professor].general += 1;
            else if (anesthesiaUpper.includes('LOCAL')) professorStats[professor].local += 1;
            else if (anesthesiaUpper.includes('MAC')) professorStats[professor].mac += 1;
            else if (anesthesiaUpper.includes('BPB')) professorStats[professor].bpb += 1;
            else if (anesthesiaUpper.includes('SNB')) professorStats[professor].snb += 1;
            else if (anesthesiaUpper.includes('FNB')) professorStats[professor].fnb += 1;
            else if (anesthesiaUpper.includes('SPINAL')) professorStats[professor].spinal += 1;

            const caseName = toTrimmedText(row[currentColMap.operationName]);
            const patientName = toTrimmedText(row[currentColMap.patientName], 'Unknown');
            const diagnosisCode = extractDiagnosisCode(row[currentColMap.diagnosis]);

            if (caseName) {
              professorCases.push({ professor, caseName, patientName, date: dateStr, anesthesia: cleanAnesthesia, diagnosisCode });
            }
          }
        }
      }
    }

    if (currentSection === 'ER') {
      stats.er_first_count += 1;
      const hasSuture = row.some((cell) => String(cell || '').toLowerCase().includes('primary closure'));
      if (hasSuture) stats.er_suture_count += 1;
    }
  }

  // 파싱된 케이스 합산값으로 보완 (요약 셀이 비어있을 경우)
  let sumAdmission = 0, sumDischarge = 0, sumGeneral = 0, sumLocal = 0, sumTotalOp = 0;
  for (const p of Object.values(professorStats)) {
    sumAdmission += p.admission;
    sumDischarge += p.discharge;
    sumGeneral += p.general;
    sumLocal += p.local;
    sumTotalOp += p.general + p.local + p.mac + p.bpb + p.snb + p.fnb + p.spinal;
  }

  if (!stats.admission_count) stats.admission_count = sumAdmission;
  if (!stats.discharge_count) stats.discharge_count = sumDischarge;
  if (!stats.general_count) stats.general_count = sumGeneral;
  if (!stats.local_count) stats.local_count = sumLocal;
  if (!stats.total_surgery_count) stats.total_surgery_count = sumTotalOp;

  return { stats, professorStats, professorCases };
}

module.exports = { parseDailyLog };
