const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '2026 당직일지', '성형외과의국일지20260219 목 최.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Rows 100-150 for 2026-02-19:');
rows.slice(100, 150).forEach((row, i) => {
    if (row && row.length > 0) {
        console.log(`${100 + i}: ${JSON.stringify(row)}`);
    }
});
