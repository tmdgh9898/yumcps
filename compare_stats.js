const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkDiscrepancies() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01'];

    console.log('--- Current DB Stats vs Image Data ---');
    for (const month of months) {
        const stats = await db.all(`
            SELECT professor_name, SUM(discharge_count) as db_count
            FROM professor_stats
            WHERE date LIKE ?
            GROUP BY professor_name
        `, [`${month}%`]);

        const total = await db.get(`
            SELECT SUM(discharge_count) as total
            FROM daily_logs
            WHERE date LIKE ?
        `, [`${month}%`]);

        console.log(`\nMonth: ${month}`);
        console.log(`Daily Logs Total: ${total.total}`);
        console.log('Professor Breakdown:', stats);
    }
}

checkDiscrepancies();
