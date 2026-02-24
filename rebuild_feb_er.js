const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parseDailyLog } = require('./parser');

const db = new sqlite3.Database('database.sqlite');
const logsDir = path.join(__dirname, '2026 당직일지');

const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

db.serialize(() => {
    console.log(`Processing ${files.length} files from ${logsDir}...`);

    files.forEach(file => {
        const filePath = path.join(logsDir, file);
        try {
            const { stats, professorStats, professorCases } = parseDailyLog(filePath, file);
            if (stats.date.startsWith('2026-02')) {
                console.log(`Updating ${stats.date} (ER Suture: ${stats.er_suture_count})`);

                db.run(`
                    UPDATE daily_logs 
                    SET er_first_count = ?, er_suture_count = ?
                    WHERE date = ?
                `, [stats.er_first_count, stats.er_suture_count, stats.date]);
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    });

    console.log('Update complete.');
});
