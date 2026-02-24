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

function parseDailyLog(filePath, originalFileName) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = '출력';
  const sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let dateStr;
  const nameToMatch = originalFileName || path.basename(filePath);
  const dateMatch = nameToMatch.match(/(\d{8})/);

  if (dateMatch) {
    const d = dateMatch[1];
    dateStr = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
  } else {
    const dateVal = rows[1]?.[11];
    if (typeof dateVal === 'number') {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      dateStr = date.toISOString().split('T')[0];
    } else {
      dateStr = toTrimmedText(dateVal, 'Unknown');
    }
  }

  const stats = {
    date: dateStr,
    admission_count: Number(rows[7]?.[1]) || 0,
    discharge_count: Number(rows[7]?.[3]) || 0,
    current_patient_count: Number(rows[7]?.[5]) || 0,
    first_visit_count: Number(rows[7]?.[7]) || 0,
    re_visit_count: Number(rows[7]?.[9]) || 0,
    general_count: Number(rows[9]?.[1]) || 0,
    local_count: Number(rows[9]?.[3]) || 0,
    emergency_count: Number(rows[9]?.[5]) || 0,
    main_dept_count: Number(rows[9]?.[7]) || 0,
    other_dept_count: Number(rows[9]?.[9]) || 0,
    total_surgery_count: Number(rows[9]?.[11]) || 0,
    er_first_count: 0,
    er_suture_count: 0,
  };

  const professorStats = {};
  const professorCases = [];

  for (const professor of PROFESSORS) {
    professorStats[professor] = {
      general: 0,
      local: 0,
      bpb: 0,
      mac: 0,
      snb: 0,
      fnb: 0,
      spinal: 0,
      admission: 0,
      discharge: 0,
    };
  }

  let currentSection = '';

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const firstCell = toTrimmedText(row[0]).toUpperCase();
    if (firstCell.includes('ADMISSION') || firstCell.includes('입원')) {
      currentSection = 'ADMISSION';
    } else if (firstCell.includes('DISCHARGE') || firstCell.includes('퇴원')) {
      currentSection = 'DISCHARGE';
    } else if (firstCell.includes('OPERATION') || firstCell.includes('수술')) {
      if (firstCell.includes('EMERGENCY') || firstCell.includes('응급')) currentSection = 'EMERGENCY_OP';
      else currentSection = 'OP';
    } else if (firstCell.includes('EMERGENCY ROOM') || firstCell.includes('응급실')) {
      currentSection = 'ER';
    }

    const isCaseRow = /^\d+$/.test(toTrimmedText(row[0]));
    if (!isCaseRow) continue;

    if (['ADMISSION', 'DISCHARGE', 'OP', 'EMERGENCY_OP'].includes(currentSection)) {
      const charge = toTrimmedText(row[7]);
      if (charge) {
        for (const professor of PROFESSORS) {
          if (!charge.includes(professor)) continue;

          if (currentSection === 'ADMISSION') professorStats[professor].admission += 1;
          if (currentSection === 'DISCHARGE') professorStats[professor].discharge += 1;

          if (currentSection === 'OP' || currentSection === 'EMERGENCY_OP') {
            const anesthesiaRaw = toTrimmedText(row[11], 'Unknown');
            const cleanAnesthesia = anesthesiaRaw.replace(/^[A-Z]\.\s*/, '');
            const anesthesiaUpper = cleanAnesthesia.toUpperCase();

            if (anesthesiaUpper.includes('GENERAL')) professorStats[professor].general += 1;
            else if (anesthesiaUpper.includes('LOCAL')) professorStats[professor].local += 1;
            else if (anesthesiaUpper.includes('MAC')) professorStats[professor].mac += 1;
            else if (anesthesiaUpper.includes('BPB')) professorStats[professor].bpb += 1;
            else if (anesthesiaUpper.includes('SNB')) professorStats[professor].snb += 1;
            else if (anesthesiaUpper.includes('FNB')) professorStats[professor].fnb += 1;
            else if (anesthesiaUpper.includes('SPINAL')) professorStats[professor].spinal += 1;

            const caseName = toTrimmedText(row[10]);
            const patientName = toTrimmedText(row[2], 'Unknown');
            const diagnosisCode = extractDiagnosisCode(row[8]);

            if (caseName) {
              professorCases.push({
                professor,
                caseName,
                patientName,
                date: dateStr,
                anesthesia: cleanAnesthesia,
                diagnosisCode,
              });
            }
          }
        }
      }
    }

    if (currentSection === 'ER') {
      stats.er_first_count += 1;
      const possibleColumns = [9, 10, 11];
      const hasSuture = possibleColumns.some((idx) => String(row[idx] || '').toLowerCase().includes('primary closure'));
      if (hasSuture) {
        stats.er_suture_count += 1;
      }
    }
  }

  let sumAdmission = 0;
  let sumDischarge = 0;
  let sumGeneral = 0;
  let sumLocal = 0;
  let sumTotalOp = 0;

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
