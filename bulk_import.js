const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { parseDailyLog } = require('./parser');

async function bulkImport() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const directories = [
        path.join(__dirname, '2025 당직일지'),
        path.join(__dirname, '2026 당직일지')
    ];

    console.log('Starting bulk import...');

    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            console.log(`Directory not found: ${dir}`);
            continue;
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
        console.log(`Processing ${files.length} files in ${path.basename(dir)}...`);

        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                const { stats, professorStats, professorCases } = parseDailyLog(filePath);

                if (!stats.date || stats.date === 'Unknown') {
                    // 파일명에서 날짜 유추 시도 (20260216.xlsx)
                    const match = file.match(/(\d{4})(\d{2})(\d{2})/);
                    if (match) {
                        stats.date = `${match[1]}-${match[2]}-${match[3]}`;
                    } else {
                        console.log(`Skipping file with unknown date: ${file}`);
                        continue;
                    }
                }

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
                    stats.date, stats.general_count, stats.local_count, stats.emergency_count,
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
                    `, [stats.date, name, pStats.general, pStats.local, pStats.bpb, pStats.admission, pStats.discharge]);
                }

                // 교수님별 케이스 저장
                for (const c of professorCases) {
                    await db.run(`
                        INSERT INTO professor_cases (date, professor_name, case_name, count)
                        VALUES (?, ?, ?, 1)
                        ON CONFLICT(date, professor_name, case_name) DO UPDATE SET
                            count = count + 1
                    `, [stats.date, c.professor, c.caseName]);
                }

                process.stdout.write('.');
            } catch (err) {
                console.error(`\nError processing ${file}: ${err.message}`);
            }
        }
        console.log(`\nFinished ${path.basename(dir)}`);
    }

    console.log('Bulk import completed.');
}

bulkImport();
