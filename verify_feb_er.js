const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.get("SELECT SUM(er_suture_count) as total_suture FROM daily_logs WHERE date LIKE '2026-02%'", (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Total ER Suture for 2026-02:', row.total_suture);
    }
    db.close();
});
