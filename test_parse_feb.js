const { parseDailyLog } = require('./parser');
const path = require('path');

const filePath = path.join(__dirname, '2026 당직일지', '성형외과의국일지20260216 월 준.xlsx');
try {
    const result = parseDailyLog(filePath);
    console.log('Result for 2026-02-16:');
    console.log('Date:', result.stats.date);
    console.log('ER First:', result.stats.er_first_count);
    console.log('ER Suture:', result.stats.er_suture_count);
} catch (err) {
    console.error('Error parsing file:', err);
}
