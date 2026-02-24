const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { parseDailyLog } = require('./parser');
const { setupDatabase } = require('./db');

async function bulkImport() {
    // Ensure database and tables are created
    await setupDatabase();

    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const directories = [
        path.join(__dirname, '2025 당직일지'),
        path.join(__dirname, '2026 당직일지')
    ];

    console.log('Starting bulk import with filename priority...');

    // Clear existing data to avoid confusion (Optional but safer for clean state)
    // Actually, ON CONFLICT will handle it, but if dates change from 2025 to 2026, old 2025 records might stay.
    // Let's NOT clear, but just overwrite where dates match. 
    // Wait, if a file 성형외과의국일지20260101 was previously imported as 2025-01-01, we want to REMOVE that 2025-01-01 entry if it's wrong.
    // But 2025 files are also being imported. 

    for (const dir of directories) {
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
        console.log(`Processing ${files.length} files in ${path.basename(dir)}...`);

        let successCount = 0;
        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                const { stats, professorStats, professorCases } = parseDailyLog(filePath);

                // 파일명에서 날짜 우선 추출
                let date = stats.date;
                const match = file.match(/(\d{4})(\d{2})(\d{2})/);
                if (match) {
                    date = `${match[1]}-${match[2]}-${match[3]}`;
                }

                if (!date || date === 'Unknown') continue;

                // 일일 요약 저장
                await db.run(`
                    INSERT INTO daily_logs (
                        date, general_count, local_count, emergency_count, 
                        main_dept_count, other_dept_count, total_surgery_count,
                        admission_count, discharge_count, current_patient_count,
                        first_visit_count, re_visit_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(date) DO UPDATE SET
                        general_count=excluded.general_count,
                        local_count=excluded.local_count,
                        emergency_count=excluded.emergency_count,
                        main_dept_count=excluded.main_dept_count,
                        other_dept_count=excluded.other_dept_count,
                        total_surgery_count=excluded.total_surgery_count,
                        admission_count=excluded.admission_count,
                        discharge_count=excluded.discharge_count,
                        current_patient_count=excluded.current_patient_count,
                        first_visit_count=excluded.first_visit_count,
                        re_visit_count=excluded.re_visit_count
                `, [
                    date, stats.general_count, stats.local_count, stats.emergency_count,
                    stats.main_dept_count, stats.other_dept_count, stats.total_surgery_count,
                    stats.admission_count, stats.discharge_count, stats.current_patient_count,
                    stats.first_visit_count, stats.re_visit_count
                ]);

                // 교수님별 통계 저장
                for (const [name, pStats] of Object.entries(professorStats)) {
                    await db.run(`
                        INSERT INTO professor_stats (
                            date, professor_name, general_count, local_count, bpb_count, admission_count, discharge_count
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(date, professor_name) DO UPDATE SET
                            general_count=excluded.general_count,
                            local_count=excluded.local_count,
                            bpb_count=excluded.bpb_count,
                            admission_count=excluded.admission_count,
                            discharge_count=excluded.discharge_count
                    `, [date, name, pStats.general, pStats.local, pStats.bpb, pStats.admission, pStats.discharge]);
                }

                // 교수님별 상세 케이스 기록
                for (const c of professorCases) {
                    await db.run(`
                        INSERT INTO professor_cases (date, professor_name, patient_name, case_name, anesthesia, count)
                        VALUES (?, ?, ?, ?, ?, 1)
                        ON CONFLICT(date, professor_name, patient_name, case_name, anesthesia) DO UPDATE SET
                            count = count + 1
                    `, [stats.date, c.professor, c.patientName, c.caseName, c.anesthesia]);
                }
                successCount++;
            } catch (err) {
                console.error(`Error processing ${file}: ${err.message}`);
            }
        }
        console.log(`Success: ${successCount} / ${files.length} in ${path.basename(dir)}`);
    }
    console.log('Bulk import completed.');
}

bulkImport();
