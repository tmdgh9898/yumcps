const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { setupDatabase } = require('./db');
const { parseDailyLog } = require('./parser');
const { generateMonthlyReport } = require('./exporter');

const app = express();
const PROFESSORS = ['김용하', '김태곤', '이준호', '김일국', '김성은'];
const upload = multer({ dest: 'uploads/' });
const PORT = Number(process.env.PORT || 5000);
const rawCorsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000';
const allowedOrigins = rawCorsOrigins.split(',').map(v => v.trim()).filter(Boolean);
const CATEGORY_BASELINE_MONTHLY = {
    '2025-09': {
        headneck_congenital: 0,
        headneck_tumor: 3,
        headneck_trauma_infection_etc: 22,
        breast_trunk_leg_congenital: 0,
        breast_trunk_leg_tumor: 0,
        breast_trunk_leg_trauma_infection_etc: 35,
        hand_upper_congenital: 0,
        hand_upper_tumor: 1,
        hand_upper_trauma_infection_etc: 3,
        skin_tumor: 9,
        cosmetic: 15
    },
    '2025-10': {
        headneck_congenital: 0,
        headneck_tumor: 3,
        headneck_trauma_infection_etc: 19,
        breast_trunk_leg_congenital: 0,
        breast_trunk_leg_tumor: 7,
        breast_trunk_leg_trauma_infection_etc: 21,
        hand_upper_congenital: 0,
        hand_upper_tumor: 3,
        hand_upper_trauma_infection_etc: 1,
        skin_tumor: 10,
        cosmetic: 10
    },
    '2025-11': {
        headneck_congenital: 0,
        headneck_tumor: 5,
        headneck_trauma_infection_etc: 14,
        breast_trunk_leg_congenital: 1,
        breast_trunk_leg_tumor: 8,
        breast_trunk_leg_trauma_infection_etc: 22,
        hand_upper_congenital: 0,
        hand_upper_tumor: 1,
        hand_upper_trauma_infection_etc: 0,
        skin_tumor: 9,
        cosmetic: 11
    },
    '2025-12': {
        headneck_congenital: 0,
        headneck_tumor: 3,
        headneck_trauma_infection_etc: 12,
        breast_trunk_leg_congenital: 1,
        breast_trunk_leg_tumor: 1,
        breast_trunk_leg_trauma_infection_etc: 9,
        hand_upper_congenital: 0,
        hand_upper_tumor: 0,
        hand_upper_trauma_infection_etc: 0,
        skin_tumor: 14,
        cosmetic: 24
    },
    '2026-01': {
        headneck_congenital: 0,
        headneck_tumor: 1,
        headneck_trauma_infection_etc: 18,
        breast_trunk_leg_congenital: 0,
        breast_trunk_leg_tumor: 2,
        breast_trunk_leg_trauma_infection_etc: 15,
        hand_upper_congenital: 0,
        hand_upper_tumor: 0,
        hand_upper_trauma_infection_etc: 0,
        skin_tumor: 10,
        cosmetic: 21
    }
};

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json());

let db;

setupDatabase().then(database => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});

function isValidMonth(month) {
    return /^\d{4}-\d{2}$/.test(month);
}

function monthToNumber(month) {
    const [year, mon] = month.split('-').map(Number);
    return year * 12 + (mon - 1);
}

function numberToMonth(value) {
    const year = Math.floor(value / 12);
    const month = (value % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthRange(startMonth, endMonth) {
    const start = monthToNumber(startMonth);
    const end = monthToNumber(endMonth);
    const months = [];
    for (let m = start; m <= end; m += 1) {
        months.push(numberToMonth(m));
    }
    return months;
}

async function processUploadedFile(file) {
    let filePath = null;
    let transactionStarted = false;

    try {
        if (!file) throw new Error('No file uploaded.');

        filePath = file.path;
        const { stats, professorStats, professorCases } = parseDailyLog(filePath, file.originalname);
        const dateStr = stats.date;
        await db.exec("BEGIN IMMEDIATE TRANSACTION");
        transactionStarted = true;

        // ?대떦 ?좎쭨??湲곗〈 ?곗씠????젣 (?ъ뾽濡쒕뱶 ???숆린??蹂댁옣)
        await db.run("DELETE FROM daily_logs WHERE date = ?", [dateStr]);
        await db.run("DELETE FROM professor_stats WHERE date = ?", [dateStr]);
        await db.run("DELETE FROM professor_cases WHERE date = ?", [dateStr]);

        // ?쇱씪 ?붿빟 ???
        await db.run(`
            INSERT INTO daily_logs (
                date, general_count, local_count, emergency_count, 
                main_dept_count, other_dept_count, total_surgery_count,
                admission_count, discharge_count, current_patient_count,
                first_visit_count, re_visit_count, er_first_count, er_suture_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                re_visit_count=excluded.re_visit_count,
                er_first_count=excluded.er_first_count,
                er_suture_count=excluded.er_suture_count
        `, [
            stats.date, stats.general_count, stats.local_count, stats.emergency_count,
            stats.main_dept_count, stats.other_dept_count, stats.total_surgery_count,
            stats.admission_count, stats.discharge_count, stats.current_patient_count,
            stats.first_visit_count, stats.re_visit_count, stats.er_first_count, stats.er_suture_count
        ]);

        // 援먯닔?섎퀎 ?듦퀎 ???
        for (const [name, pStats] of Object.entries(professorStats)) {
            await db.run(`
                INSERT INTO professor_stats (
                    date, professor_name, general_count, local_count, bpb_count, mac_count, snb_count, fnb_count, spinal_count, admission_count, discharge_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(date, professor_name) DO UPDATE SET
                    general_count=excluded.general_count,
                    local_count=excluded.local_count,
                    bpb_count=excluded.bpb_count,
                    mac_count=excluded.mac_count,
                    snb_count=excluded.snb_count,
                    fnb_count=excluded.fnb_count,
                    spinal_count=excluded.spinal_count,
                    admission_count=excluded.admission_count,
                    discharge_count=excluded.discharge_count
            `, [stats.date, name, pStats.general, pStats.local, pStats.bpb, pStats.mac || 0, pStats.snb || 0, pStats.fnb || 0, pStats.spinal || 0, pStats.admission, pStats.discharge]);
        }

        // 援먯닔?섎퀎 耳?댁뒪 ???
        for (const c of professorCases) {
            await db.run(`
                INSERT INTO professor_cases (date, professor_name, patient_name, case_name, anesthesia, diagnosis_code, count)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(date, professor_name, patient_name, case_name, anesthesia) DO UPDATE SET
                    count = count + 1,
                    diagnosis_code = COALESCE(excluded.diagnosis_code, professor_cases.diagnosis_code)
            `, [stats.date, c.professor, c.patientName, c.caseName, c.anesthesia, c.diagnosisCode || 'UNKNOWN']);
        }

        await db.exec("COMMIT");
        transactionStarted = false;
        await fs.promises.unlink(filePath).catch(() => {});
        return { ok: true, date: stats.date, fileName: file.originalname };
    } catch (error) {
        if (transactionStarted) {
            try {
                await db.exec("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }
        if (filePath) {
            await fs.promises.unlink(filePath).catch(() => {});
        }
        throw error;
    }
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        const result = await processUploadedFile(req.file);
        res.json({ message: 'Upload and parsing successful', date: result.date, fileName: result.fileName });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error: ' + error.message);
    }
});

app.post('/api/upload-multiple', upload.array('files', 100), async (req, res) => {
    try {
        const files = req.files || [];
        if (!files.length) return res.status(400).send('No files uploaded.');

        const results = [];
        const errors = [];

        for (const file of files) {
            try {
                const result = await processUploadedFile(file);
                results.push(result);
            } catch (error) {
                console.error(`Upload failed for ${file.originalname}:`, error.message);
                errors.push({ fileName: file.originalname, error: error.message });
            }
        }

        res.json({
            message: `Processed ${files.length} file(s). Success: ${results.length}, Failed: ${errors.length}`,
            successCount: results.length,
            failCount: errors.length,
            results,
            errors
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error: ' + error.message);
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const daily = await db.all('SELECT date, total_surgery_count, admission_count, discharge_count, er_first_count FROM daily_logs ORDER BY date DESC LIMIT 30');
        res.json(daily);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const rawMonths = String(req.query.months || '');
        const months = rawMonths
            .split(',')
            .map(m => m.trim())
            .filter(m => /^\d{4}-\d{2}$/.test(m));

        if (months.length === 0) {
            return res.status(400).send('No valid months provided.');
        }

        const placeholders = months.map(() => '?').join(',');

        const professorRows = await db.all(`
            SELECT
                substr(date, 1, 7) as month,
                professor_name,
                SUM(general_count) as total_general,
                SUM(local_count) as total_local,
                SUM(bpb_count) as total_bpb,
                SUM(mac_count) as total_mac,
                SUM(snb_count) as total_snb,
                SUM(fnb_count) as total_fnb,
                SUM(spinal_count) as total_spinal,
                SUM(admission_count) as total_admission,
                SUM(discharge_count) as total_discharge
            FROM professor_stats
            WHERE substr(date, 1, 7) IN (${placeholders})
            GROUP BY substr(date, 1, 7), professor_name
        `, months);

        const outpatientRows = await db.all(`
            SELECT
                substr(date, 1, 7) as month,
                SUM(first_visit_count) as total_first,
                SUM(re_visit_count) as total_re,
                SUM(er_first_count) as total_er_first,
                SUM(er_suture_count) as total_er_suture
            FROM daily_logs
            WHERE substr(date, 1, 7) IN (${placeholders})
            GROUP BY substr(date, 1, 7)
        `, months);

        const professorByMonth = new Map();
        for (const row of professorRows) {
            if (!professorByMonth.has(row.month)) professorByMonth.set(row.month, new Map());
            professorByMonth.get(row.month).set(row.professor_name, row);
        }

        const outpatientByMonth = new Map();
        for (const row of outpatientRows) {
            outpatientByMonth.set(row.month, row);
        }

        const reports = {};
        for (const month of months) {
            const monthProfessorMap = professorByMonth.get(month) || new Map();
            const sortedProfessors = PROFESSORS.map(pName => {
                const found = monthProfessorMap.get(pName);
                return found || {
                    professor_name: pName,
                    total_general: 0, total_local: 0, total_bpb: 0, total_mac: 0, total_snb: 0, total_fnb: 0, total_spinal: 0,
                    total_admission: 0, total_discharge: 0
                };
            });

            const outpatient = outpatientByMonth.get(month) || {
                total_first: 0,
                total_re: 0,
                total_er_first: 0,
                total_er_suture: 0
            };

            reports[month] = { professors: sortedProfessors, outpatient };
        }

        const recentLogs = await db.all('SELECT date, total_surgery_count, admission_count, discharge_count, er_first_count FROM daily_logs ORDER BY date DESC LIMIT 30');
        res.json({ reports, recentLogs });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/category-thresholds', async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT
                category_key,
                category_label,
                min_for_01,
                max_for_01,
                min_for_02,
                point_01,
                point_02,
                display_order,
                active
            FROM category_score_thresholds
            ORDER BY display_order ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/category-score', async (req, res) => {
    try {
        const today = new Date();
        const defaultEndMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const startMonth = String(req.query.start_month || '2025-09');
        const endMonth = String(req.query.end_month || defaultEndMonth);
        const multiplier = Number(req.query.multiplier ?? 2);

        if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
            return res.status(400).send('Invalid month format. Use YYYY-MM.');
        }
        if (monthToNumber(startMonth) > monthToNumber(endMonth)) {
            return res.status(400).send('start_month must be before or equal to end_month.');
        }
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
            return res.status(400).send('Invalid multiplier. Use a positive number.');
        }

        const months = getMonthRange(startMonth, endMonth);
        const placeholders = months.map(() => '?').join(',');

        const thresholds = await db.all(`
            SELECT
                category_key,
                category_label,
                min_for_01,
                max_for_01,
                min_for_02,
                point_01,
                point_02,
                display_order
            FROM category_score_thresholds
            WHERE active = 1
            ORDER BY display_order ASC
        `);

        if (!thresholds.length) {
            return res.status(400).send('No active thresholds found.');
        }

        const aggregatedRows = await db.all(`
            SELECT
                substr(pc.date, 1, 7) AS month,
                dcm.category_key AS category_key,
                SUM(pc.count) AS total_count
            FROM professor_cases pc
            JOIN diagnosis_category_map dcm
              ON UPPER(COALESCE(pc.diagnosis_code, '')) = dcm.diagnosis_code
            WHERE substr(pc.date, 1, 7) IN (${placeholders})
            GROUP BY substr(pc.date, 1, 7), dcm.category_key
        `, months);

        const monthlyCaseRows = await db.all(`
            SELECT
                substr(date, 1, 7) AS month,
                SUM(count) AS total_cases,
                SUM(CASE
                    WHEN diagnosis_code IS NULL OR diagnosis_code = '' OR UPPER(diagnosis_code) = 'UNKNOWN' THEN count
                    ELSE 0
                END) AS missing_or_unknown_cases
            FROM professor_cases
            WHERE substr(date, 1, 7) IN (${placeholders})
            GROUP BY substr(date, 1, 7)
        `, months);

        const categoryMonthMap = new Map();
        const categorizedByMonth = new Map();
        for (const row of aggregatedRows) {
            const key = `${row.category_key}::${row.month}`;
            const count = Number(row.total_count || 0);
            categoryMonthMap.set(key, count);
            categorizedByMonth.set(row.month, (categorizedByMonth.get(row.month) || 0) + count);
        }

        const rows = thresholds.map(t => {
            const monthlyCounts = months.map(month => {
                const baselineValue = CATEGORY_BASELINE_MONTHLY[month]?.[t.category_key];
                if (baselineValue !== undefined) return baselineValue;
                return categoryMonthMap.get(`${t.category_key}::${month}`) || 0;
            });
            const rawSum = monthlyCounts.reduce((acc, cur) => acc + cur, 0);
            const adjustedSum = rawSum * multiplier;

            let score = 0;
            if (adjustedSum >= Number(t.min_for_02)) {
                score = Number(t.point_02);
            } else if (adjustedSum >= Number(t.min_for_01) && adjustedSum <= Number(t.max_for_01)) {
                score = Number(t.point_01);
            }

            return {
                category_key: t.category_key,
                category_label: t.category_label,
                monthly_counts: monthlyCounts,
                raw_sum: rawSum,
                adjusted_sum: adjustedSum,
                threshold: {
                    min_for_01: Number(t.min_for_01),
                    max_for_01: Number(t.max_for_01),
                    min_for_02: Number(t.min_for_02),
                    point_01: Number(t.point_01),
                    point_02: Number(t.point_02)
                },
                score,
                is_met: score >= Number(t.point_02)
            };
        });

        const monthlyRawTotals = Array(months.length).fill(0);
        for (const row of rows) {
            row.monthly_counts.forEach((value, idx) => {
                monthlyRawTotals[idx] += value;
            });
        }
        const totalRawSum = monthlyRawTotals.reduce((acc, cur) => acc + cur, 0);
        const totalAdjustedSum = totalRawSum * multiplier;
        const metCount = rows.filter(r => r.is_met).length;
        const unmetCount = rows.length - metCount;
        const warnings = [];
        const monthlyCaseMap = new Map(monthlyCaseRows.map(r => [r.month, r]));
        for (const month of months) {
            if (CATEGORY_BASELINE_MONTHLY[month]) continue;
            const caseInfo = monthlyCaseMap.get(month);
            if (!caseInfo) continue;
            const totalCases = Number(caseInfo.total_cases || 0);
            const categorizedCases = Number(categorizedByMonth.get(month) || 0);
            const missingCases = Number(caseInfo.missing_or_unknown_cases || 0);
            if (totalCases > 0 && categorizedCases === 0) {
                warnings.push(`${month.replace('-', '.')} 데이터는 진단코드가 저장되지 않아 분야 점수가 0으로 보입니다. 해당 월 파일을 재업로드하면 정상 계산됩니다.`);
            } else if (missingCases > 0) {
                warnings.push(`${month.replace('-', '.')} 데이터 중 일부(${missingCases}건)는 진단코드가 없어 점수 계산에서 제외되었습니다.`);
            }
        }

        res.json({
            months,
            multiplier,
            rows,
            warnings,
            totals: {
                monthly_raw_totals: monthlyRawTotals,
                total_raw_sum: totalRawSum,
                total_adjusted_sum: totalAdjustedSum,
                met_count: metCount,
                unmet_count: unmetCount
            }
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.delete('/api/logs/:date', async (req, res) => {
    try {
        const { date } = req.params;
        await db.run("DELETE FROM daily_logs WHERE date = ?", [date]);
        await db.run("DELETE FROM professor_stats WHERE date = ?", [date]);
        await db.run("DELETE FROM professor_cases WHERE date = ?", [date]);
        res.json({ message: 'Data deleted successfully' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/report/:month', async (req, res) => {
    try {
        const month = req.params.month;
        const monthPattern = `${month}%`;

        const professorsList = await db.all(`
            SELECT professor_name,
                SUM(general_count) as total_general,
                SUM(local_count) as total_local,
                SUM(bpb_count) as total_bpb,
                SUM(mac_count) as total_mac,
                SUM(snb_count) as total_snb,
                SUM(fnb_count) as total_fnb,
                SUM(spinal_count) as total_spinal,
                SUM(admission_count) as total_admission,
                SUM(discharge_count) as total_discharge
            FROM professor_stats
            WHERE date LIKE ?
            GROUP BY professor_name
        `, [monthPattern]);

        // 二쇰Ц?섏떊 ?쒖꽌?濡??뺣젹
        const sortedProfessors = PROFESSORS.map(pName => {
            const found = professorsList.find(p => p.professor_name === pName);
            return found || {
                professor_name: pName,
                total_general: 0, total_local: 0, total_bpb: 0, total_mac: 0, total_snb: 0, total_fnb: 0, total_spinal: 0,
                total_admission: 0, total_discharge: 0
            };
        });

        const outpatientStats = await db.get(`
            SELECT
                SUM(first_visit_count) as total_first,
                SUM(re_visit_count) as total_re,
                SUM(er_first_count) as total_er_first,
                SUM(er_suture_count) as total_er_suture
            FROM daily_logs
            WHERE date LIKE ?
        `, [monthPattern]);

        res.json({ professors: sortedProfessors, outpatient: outpatientStats || { total_first: 0, total_re: 0, total_er_first: 0, total_er_suture: 0 } });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ?곸꽭 ?섏닠 ?댁뿭 議고쉶 API
app.get('/api/cases/:month/:professor', async (req, res) => {
    try {
        const { month, professor } = req.params;
        const cases = await db.all(`
            SELECT date, patient_name, case_name, anesthesia, SUM(count) as total_count
            FROM professor_cases
            WHERE date LIKE ? AND professor_name = ?
            GROUP BY date, patient_name, case_name, anesthesia
            ORDER BY date ASC, patient_name ASC
            `, [`${month}%`, professor]);
        res.json(cases);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/export/:month', async (req, res) => {
    try {
        const month = req.params.month;
        const monthPattern = `${month}%`;
        const professorsList = await db.all(`
            SELECT professor_name,
                SUM(general_count) as total_general,
                SUM(local_count) as total_local,
                SUM(bpb_count) as total_bpb,
                SUM(mac_count) as total_mac,
                SUM(snb_count) as total_snb,
                SUM(fnb_count) as total_fnb,
                SUM(spinal_count) as total_spinal,
                SUM(admission_count) as total_admission,
                SUM(discharge_count) as total_discharge
            FROM professor_stats
            WHERE date LIKE ?
            GROUP BY professor_name
        `, [monthPattern]);

        const professors = PROFESSORS.map(pName => {
            const found = professorsList.find(p => p.professor_name === pName);
            return found || {
                professor_name: pName,
                total_general: 0, total_local: 0, total_bpb: 0, total_mac: 0, total_snb: 0, total_fnb: 0, total_spinal: 0,
                total_admission: 0, total_discharge: 0
            };
        });

        const cases = await db.all(`
            SELECT professor_name, case_name, SUM(count) as total_count
            FROM professor_cases
            WHERE date LIKE ?
            GROUP BY professor_name, case_name
        `, [`${month}%`]);

        const outpatient = await db.get(`
            SELECT 
                SUM(first_visit_count) as total_first, 
                SUM(re_visit_count) as total_re,
                SUM(er_first_count) as total_er_first,
                SUM(er_suture_count) as total_er_suture
            FROM daily_logs
            WHERE date LIKE ?
        `, [`${month}%`]);

        const workbook = await generateMonthlyReport(month, professors, cases, outpatient || { total_first: 0, total_re: 0, total_er_first: 0, total_er_suture: 0 });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename = Report_${month}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

