const fs = require('fs');
const path = require('path');
const { parseDailyLog } = require('./parser');

function checkDates() {
    const dir = path.join(__dirname, '2026 당직일지');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const { stats } = parseDailyLog(filePath);
        let date = stats.date;
        if (!date || date === 'Unknown') {
            const match = file.match(/(\d{4})(\d{2})(\d{2})/);
            if (match) {
                date = `${match[1]}-${match[2]}-${match[3]} (from filename)`;
            }
        }
        console.log(`${file} => ${date}`);
    });
}

checkDates();
