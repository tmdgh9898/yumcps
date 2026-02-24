const XLSX = require('xlsx');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const PROFESSORS = ['김용하', '김태곤', '이준호', '김일국', '김성은'];

async function importHistorical() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const workbook = XLSX.readFile('d:/monthlyreport/dec.xlsx');

    // 1. '퇴원 환자 수' 시트에서 초진/재진 및 교수님별 퇴원 합계 추출 (9월~1월)
    const dischargeSheet = workbook.Sheets['퇴원 환자 수'];
    const dData = XLSX.utils.sheet_to_json(dischargeSheet, { header: 1 });

    const months = ['09', '10', '11', '12', '01'];
    const years = ['2025', '2025', '2025', '2025', '2026'];

    // 외래 데이터 (초진/재진)
    const firstVisitRow = dData[15]; // [초진, 174, 144, 123, 146, 125, ...]
    const reVisitRow = dData[16];    // [재진, 349, 323, 311, 327, 399, ...]

    for (let i = 0; i < months.length; i++) {
        const date = `${years[i]}-${months[i]}-01`; // 월별 합계이므로 1일로 저장
        await db.run(`
            INSERT INTO daily_logs (date, first_visit_count, re_visit_count)
            VALUES (?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                first_visit_count=excluded.first_visit_count,
                re_visit_count=excluded.re_visit_count
        `, [date, firstVisitRow[i + 1] || 0, reVisitRow[i + 1] || 0]);
    }

    // 교수님별 퇴원 데이터
    for (let rowIndex = 3; rowIndex <= 7; rowIndex++) {
        const row = dData[rowIndex];
        const profName = row[0];
        if (PROFESSORS.includes(profName)) {
            for (let i = 0; i < months.length; i++) {
                const date = `${years[i]}-${months[i]}-01`;
                await db.run(`
                    INSERT INTO professor_stats (date, professor_name, discharge_count)
                    VALUES (?, ?, ?)
                    ON CONFLICT(date, professor_name) DO UPDATE SET
                        discharge_count=excluded.discharge_count
                `, [date, profName, row[i + 1] || 0]);
            }
        }
    }

    // 2. 월별 상세 시트 (12월, 1월)에서 Gen/Loc/BPB/Admission 추출
    const detailSheets = [
        { name: '12월', date: '2025-12-01' },
        { name: '1월', date: '2026-01-01' }
    ];

    for (const dSheet of detailSheets) {
        const sheet = workbook.Sheets[dSheet.name];
        if (!sheet) continue;
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        rows.forEach((row, idx) => {
            const profMatch = PROFESSORS.find(p => row[0] && row[0].includes(p));
            if (profMatch && rows[idx + 1] && rows[idx + 1][0] === 'General') {
                const statsRow = rows[idx + 1];
                // [General, 10, Local, 0, BPB, 0, 입원 환자, 7, 외래 환자, 54]
                db.run(`
                    UPDATE professor_stats SET
                        general_count = ?,
                        local_count = ?,
                        bpb_count = ?,
                        admission_count = ?
                    WHERE date = ? AND professor_name = ?
                `, [statsRow[1], statsRow[3], statsRow[5], statsRow[7], dSheet.date, profMatch]);

                // 케이스 수집 (statsRow 아래부터 빈 줄 전까지)
                let caseIdx = idx + 2;
                while (rows[caseIdx] && rows[caseIdx][0] && !PROFESSORS.some(p => rows[caseIdx][0].includes(p))) {
                    const caseRow = rows[caseIdx];
                    if (caseRow[0] && caseRow[1]) {
                        db.run(`
                            INSERT INTO professor_cases (date, professor_name, case_name, count)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(date, professor_name, case_name) DO UPDATE SET
                                count = excluded.count
                        `, [dSheet.date, profMatch, caseRow[0], caseRow[1]]);
                    }
                    caseIdx++;
                }
            }
        });
    }

    console.log('Historical data migration completed.');
}

importHistorical();
