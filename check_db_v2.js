const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkData() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('--- Database Records Summary ---');

    const dailyLogs = await db.all("SELECT strftime('%Y-%m', date) as month, COUNT(*) as cnt FROM daily_logs GROUP BY month");
    console.log('Daily Logs per Month:', dailyLogs);

    const profStats = await db.all("SELECT strftime('%Y-%m', date) as month, COUNT(*) as cnt FROM professor_stats GROUP BY month");
    console.log('Professor Stats per Month:', profStats);

    const profCases = await db.all("SELECT strftime('%Y-%m', date) as month, COUNT(*) as cnt FROM professor_cases GROUP BY month");
    console.log('Professor Cases per Month:', profCases);

    const recentCases = await db.all("SELECT date, professor_name, case_name FROM professor_cases ORDER BY date DESC LIMIT 10");
    console.log('Most Recent 10 Cases:', recentCases);
}

checkData();
