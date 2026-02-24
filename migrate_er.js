const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    db.run("ALTER TABLE daily_logs ADD COLUMN er_first_count INTEGER DEFAULT 0", (err) => {
        if (err) console.log("er_first_count already exists or error:", err.message);
    });
    db.run("ALTER TABLE daily_logs ADD COLUMN er_suture_count INTEGER DEFAULT 0", (err) => {
        if (err) console.log("er_suture_count already exists or error:", err.message);
        console.log("Migration finished.");
        db.close();
    });
});
