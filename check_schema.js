const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.all("PRAGMA table_info(daily_logs)", (err, rows) => {
    if (err) console.error(err);
    console.log("daily_logs columns:", rows.map(r => r.name));
    db.close();
});
