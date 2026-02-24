const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkData() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const cases = await db.all("SELECT date, professor_name, case_name FROM professor_cases WHERE date LIKE '2026-02%' LIMIT 5");
    console.log('2026-02 Cases:', cases);

    const counts = await db.all("SELECT date, COUNT(*) as cnt FROM daily_logs GROUP BY strftime('%Y-%m', date)");
    console.log('Monthly Daily Log Counts:', counts);

    // Check for "2026-02-16" specifically
    const specific = await db.all("SELECT * FROM professor_cases WHERE date = '2026-02-16'");
    console.log('2026-02-16 specific cases:', specific.length);
}

checkData();
