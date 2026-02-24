const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const erData = [
    { month: '2025-09', first: 18, suture: 14 },
    { month: '2025-10', first: 56, suture: 47 },
    { month: '2025-11', first: 40, suture: 29 },
    { month: '2025-12', first: 45, suture: 39 },
    { month: '2026-01', first: 35, suture: 28 },
];

db.serialize(async () => {
    for (const data of erData) {
        // 해당 월의 첫 번째 데이터 날짜 찾기
        db.get("SELECT date FROM daily_logs WHERE date LIKE ? ORDER BY date ASC LIMIT 1", [`${data.month}%`], (err, row) => {
            if (row) {
                console.log(`Updating ${row.date} with ER stats: ${data.first}/${data.suture}`);
                db.run("UPDATE daily_logs SET er_first_count = ?, er_suture_count = ? WHERE date = ?", [data.first, data.suture, row.date]);
            } else {
                const dummyDate = `${data.month}-01`;
                console.log(`Inserting dummy date ${dummyDate} with ER stats: ${data.first}/${data.suture}`);
                db.run("INSERT INTO daily_logs (date, er_first_count, er_suture_count) VALUES (?, ?, ?)", [dummyDate, data.first, data.suture]);
            }
        });
    }
});
