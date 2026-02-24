const XLSX = require('xlsx');
const path = require('path');

const PROFESSORS = ['김용하', '김태곤', '이준호', '김일국', '김성은'];

function parseDailyLog(filePath, originalFileName) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = '異쒕젰';
    const sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // ?좎쭨 異붿텧 (?뚯씪紐낆뿉??癒쇱? ?쒕룄, ?덈릺硫??묒? ?대? ?媛?
    let dateStr;
    const nameToMatch = originalFileName || path.basename(filePath);
    const dateMatch = nameToMatch.match(/(\d{8})/);

    if (dateMatch) {
        const d = dateMatch[1];
        dateStr = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
    } else {
        const dateVal = rows[1][11];
        if (typeof dateVal === 'number') {
            const date = new Date((dateVal - 25569) * 86400 * 1000);
            dateStr = date.toISOString().split('T')[0];
        } else {
            dateStr = dateVal ? dateVal.toString() : 'Unknown';
        }
    }

    const stats = {
        date: dateStr,
        admission_count: rows[7][1] || 0,
        discharge_count: rows[7][3] || 0,
        current_patient_count: rows[7][5] || 0,
        first_visit_count: rows[7][7] || 0,
        re_visit_count: rows[7][9] || 0,
        general_count: rows[9][1] || 0,
        local_count: rows[9][3] || 0,
        emergency_count: rows[9][5] || 0,
        main_dept_count: rows[9][7] || 0,
        other_dept_count: rows[9][9] || 0,
        total_surgery_count: rows[9][11] || 0,
        er_first_count: 0,
        er_suture_count: 0,
    };

    const professorStats = {};
    const professorCases = []; // [{professor, case, date}]

    PROFESSORS.forEach(p => {
        professorStats[p] = { general: 0, local: 0, bpb: 0, mac: 0, snb: 0, fnb: 0, spinal: 0, admission: 0, discharge: 0 };
    });

    let currentSection = '';
    rows.forEach((row, index) => {
        if (!row || row.length === 0) return;
        const firstCell = row[0] ? row[0].toString().toUpperCase() : '';

        // ?ㅻ뜑 留ㅼ묶 (?곸뼱/?쒓뎅??紐⑤몢 吏??
        if (firstCell.includes('ADMISSION') || firstCell.includes('?낆썝')) currentSection = 'ADMISSION';
        else if (firstCell.includes('DISCHARGE') || firstCell.includes('?댁썝')) currentSection = 'DISCHARGE';
        else if (firstCell.includes('OPERATION') || firstCell.includes('?섏닠')) {
            if (firstCell.includes('EMERGENCY') || firstCell.includes('?묎툒')) currentSection = 'EMERGENCY_OP';
            else currentSection = 'OP';
        } else if (firstCell.includes('EMERGENCY ROOM')) {
            currentSection = 'ER';
        }

        const chargeIdx = 7;
        const diagnosisIdx = 8;
        const caseIdx = 10; // 수술명(K열)
        const anaesthesiaIdx = 11;

        if (['ADMISSION', 'DISCHARGE', 'OP', 'EMERGENCY_OP'].includes(currentSection)) {
            if (row[0] && row[0].toString().match(/^\d+$/)) {
                const charge = row[chargeIdx];
                if (charge && typeof charge === 'string') {
                    PROFESSORS.forEach(prof => {
                        if (charge.includes(prof)) {
                            if (currentSection === 'ADMISSION') professorStats[prof].admission++;
                            if (currentSection === 'DISCHARGE') professorStats[prof].discharge++;
                            if (currentSection === 'OP' || currentSection === 'EMERGENCY_OP') {
                                let anaesthesiaRaw = row[anaesthesiaIdx] ? row[anaesthesiaIdx].toString().trim() : 'Unknown';

                                // Clean prefix (A. General -> General, E. Local -> Local)
                                let cleanAnaesthesia = anaesthesiaRaw.replace(/^[A-Z]\.\s*/, '');

                                if (cleanAnaesthesia.includes('General')) professorStats[prof].general++;
                                else if (cleanAnaesthesia.includes('Local')) professorStats[prof].local++;
                                else if (cleanAnaesthesia.includes('MAC')) professorStats[prof].mac++;
                                else if (cleanAnaesthesia.includes('BPB')) professorStats[prof].bpb++;
                                else if (cleanAnaesthesia.includes('SNB')) professorStats[prof].snb++;
                                else if (cleanAnaesthesia.includes('FNB')) professorStats[prof].fnb++;
                                else if (cleanAnaesthesia.includes('Spinal')) professorStats[prof].spinal++;

                                // ?섏닠紐?Case) 諛?留덉랬 異붿텧
                                const caseName = row[caseIdx] ? row[caseIdx].toString().trim() : '';
                                const patientName = row[2] ? row[2].toString().trim() : 'Unknown';
                                const diagnosisText = row[diagnosisIdx] ? row[diagnosisIdx].toString().trim() : '';
                                const diagnosisMatch = diagnosisText.match(/^\s*([A-Za-z])\s*\./);
                                const diagnosisCode = diagnosisMatch ? diagnosisMatch[1].toUpperCase() : 'UNKNOWN';
                                if (caseName) {
                                    professorCases.push({
                                        professor: prof,
                                        caseName,
                                        patientName,
                                        date: dateStr,
                                        anesthesia: cleanAnaesthesia,
                                        diagnosisCode
                                    });
                                }
                            }
                        }
                    });
                }
            }
        }

        if (currentSection === 'ER' && row[0] && row[0].toString().match(/^\d+$/)) {
            stats.er_first_count++;
            // ?섏닠紐?K?????먯꽌 Primary closure 寃??- 議곌툑 ??踰붿쐞瑜??볧???泥댄겕
            const possibleColumns = [9, 10, 11];
            const hasSuture = possibleColumns.some(idx => row[idx] && row[idx].toString().includes('Primary closure'));
            if (hasSuture) {
                stats.er_suture_count++;
            }
        }
    });

    // 留뚯빟 ?붿빟 ?뚯씠釉?stats)??鍮꾩뼱?덈떎硫? 由ъ뒪?몄뿉??異붿텧??媛믪쑝濡?蹂댁젙
    let sumAdmission = 0;
    let sumDischarge = 0;
    let sumGeneral = 0;
    let sumLocal = 0;
    let sumTotalOp = 0;

    Object.values(professorStats).forEach(p => {
        sumAdmission += p.admission;
        sumDischarge += p.discharge;
        sumGeneral += p.general;
        sumLocal += p.local;
        sumTotalOp += (p.general + p.local + p.mac + p.bpb + p.snb + p.fnb + p.spinal);
    });

    if (!stats.admission_count) stats.admission_count = sumAdmission;
    if (!stats.discharge_count) stats.discharge_count = sumDischarge;
    if (!stats.general_count) stats.general_count = sumGeneral;
    if (!stats.local_count) stats.local_count = sumLocal;
    if (!stats.total_surgery_count) stats.total_surgery_count = sumTotalOp;

    return { stats, professorStats, professorCases };
}

module.exports = { parseDailyLog };



