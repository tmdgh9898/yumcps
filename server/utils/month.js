function isValidMonth(month) {
  return /^\d{4}-\d{2}$/.test(month);
}

function monthToNumber(month) {
  const [year, mon] = month.split('-').map(Number);
  return year * 12 + (mon - 1);
}

function numberToMonth(value) {
  const year = Math.floor(value / 12);
  const month = (value % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthRange(startMonth, endMonth) {
  const start = monthToNumber(startMonth);
  const end = monthToNumber(endMonth);
  const months = [];
  for (let m = start; m <= end; m += 1) {
    months.push(numberToMonth(m));
  }
  return months;
}

module.exports = { isValidMonth, monthToNumber, numberToMonth, getMonthRange };
