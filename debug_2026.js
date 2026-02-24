const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function debug() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    const dailyLogs = await db.all("SELECT date FROM daily_logs WHERE date LIKE '2026%'");
    console.log('2026 Daily Logs:', dailyLogs.length, dailyLogs.slice(0, 5));

    const profCases = await db.all("SELECT date, professor_name, case_name FROM professor_cases WHERE date LIKE '2026%'");
    console.log('2026 Professor Cases:', profCases.length, profCases.slice(0, 5));
}

debug();
