const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { setupDatabase } = require('./db');

const officialData = [
    {
        month: '2025-09',
        김용하: 5, 김태곤: 4, 이준호: 21, 김일국: 13, 김성은: 1, total: 44,
        first: 174, re: 349
    },
    {
        month: '2025-10',
        김용하: 8, 김태곤: 3, 이준호: 9, 김일국: 10, 김성은: 5, total: 35,
        first: 144, re: 323
    },
    {
        month: '2025-11',
        김용하: 0, 김태곤: 4, 이준호: 12, 김일국: 12, 김성은: 1, total: 29,
        first: 123, re: 311
    },
    {
        month: '2025-12',
        김용하: 0, 김태곤: 2, 이준호: 24, 김일국: 9, 김성은: 4, total: 39,
        first: 146, re: 327
    },
    {
        month: '2026-01',
        김용하: 6, 김태곤: 0, 이준호: 11, 김일국: 7, 김성은: 5, total: 29,
        first: 125, re: 399
    }
];

async function applyOfficialStats() {
    await setupDatabase();
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('--- Applying Official Historical Data (Discharge + Outpatient) ---');

    for (const data of officialData) {
        const monthPattern = `${data.month}%`;

        // 1. Adjust Professor Stats (Discharge)
        const professors = ['김용하', '김태곤', '이준호', '김일국', '김성은'];
        for (const prof of professors) {
            const current = await db.get(`
                SELECT SUM(discharge_count) as total, MIN(id) as first_id
                FROM professor_stats
                WHERE date LIKE ? AND professor_name = ?
            `, [monthPattern, prof]);

            const diff = data[prof] - (current.total || 0);
            if (current.first_id) {
                await db.run("UPDATE professor_stats SET discharge_count = discharge_count + ? WHERE id = ?", [diff, current.first_id]);
            } else {
                // If no record exists for the month, insert on the 1st
                await db.run(`
                    INSERT INTO professor_stats (date, professor_name, discharge_count)
                    VALUES (?, ?, ?)
                `, [`${data.month}-01`, prof, data[prof]]);
            }
        }

        // 2. Adjust Daily Logs (Discharge, Outpatient)
        const currentDaily = await db.get(`
            SELECT SUM(discharge_count) as d_total, SUM(first_visit_count) as f_total, SUM(re_visit_count) as r_total, MIN(id) as first_id
            FROM daily_logs
            WHERE date LIKE ?
        `, [monthPattern]);

        const dDiff = data.total - (currentDaily.d_total || 0);
        const fDiff = data.first - (currentDaily.f_total || 0);
        const rDiff = data.re - (currentDaily.r_total || 0);

        if (currentDaily.first_id) {
            await db.run(`
                UPDATE daily_logs 
                SET discharge_count = discharge_count + ?, 
                    first_visit_count = first_visit_count + ?, 
                    re_visit_count = re_visit_count + ?
                WHERE id = ?
            `, [dDiff, fDiff, rDiff, currentDaily.first_id]);
        } else {
            await db.run(`
                INSERT INTO daily_logs (date, discharge_count, first_visit_count, re_visit_count)
                VALUES (?, ?, ?, ?)
            `, [`${data.month}-01`, data.total, data.first, data.re]);
        }

        console.log(`Adjusted official data for ${data.month}`);
    }

    console.log('Official data application completed.');
}

applyOfficialStats();
