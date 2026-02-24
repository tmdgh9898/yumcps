const { CATEGORY_BASELINE_MONTHLY } = require('../constants/domain');
const { getMonthRange, isValidMonth, monthToNumber } = require('../utils/month');
const { monthExpr } = require('../repositories/reportRepository');

async function getCategoryThresholds(db) {
  return db.all(`
    SELECT
      category_key,
      category_label,
      min_for_01,
      max_for_01,
      min_for_02,
      point_01,
      point_02,
      display_order,
      active
    FROM category_score_thresholds
    ORDER BY display_order ASC
  `);
}

async function getCategoryScore(db, dbType, startMonth, endMonth, multiplier) {
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
    throw new Error('Invalid month format. Use YYYY-MM.');
  }
  if (monthToNumber(startMonth) > monthToNumber(endMonth)) {
    throw new Error('start_month must be before or equal to end_month.');
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error('Invalid multiplier. Use a positive number.');
  }

  const months = getMonthRange(startMonth, endMonth);
  const placeholders = months.map(() => '?').join(',');
  const m = monthExpr(dbType, 'pc.date');
  const m2 = monthExpr(dbType);

  const thresholds = await db.all(`
    SELECT
      category_key,
      category_label,
      min_for_01,
      max_for_01,
      min_for_02,
      point_01,
      point_02,
      display_order
    FROM category_score_thresholds
    WHERE active = 1
    ORDER BY display_order ASC
  `);

  if (!thresholds.length) {
    throw new Error('No active thresholds found.');
  }

  const aggregatedRows = await db.all(
    `SELECT
      ${m} AS month,
      dcm.category_key AS category_key,
      SUM(pc.count) AS total_count
    FROM professor_cases pc
    JOIN diagnosis_category_map dcm
      ON UPPER(SUBSTR(TRIM(COALESCE(pc.diagnosis_code, '')), 1, 1)) = dcm.diagnosis_code
    WHERE ${m} IN (${placeholders})
    GROUP BY ${m}, dcm.category_key`,
    months
  );

  const monthlyCaseRows = await db.all(
    `SELECT
      ${m2} AS month,
      SUM(count) AS total_cases,
      SUM(CASE
        WHEN diagnosis_code IS NULL
          OR TRIM(diagnosis_code) = ''
          OR UPPER(TRIM(diagnosis_code)) = 'UNKNOWN'
          OR TRIM(diagnosis_code) = '-'
          OR UPPER(SUBSTR(TRIM(diagnosis_code), 1, 1)) NOT IN ('A','B','C','D','E','F','G','H','I','J','K')
        THEN count
        ELSE 0
      END) AS missing_or_unknown_cases
    FROM professor_cases
    WHERE ${m2} IN (${placeholders})
    GROUP BY ${m2}`,
    months
  );

  const categoryMonthMap = new Map();
  const categorizedByMonth = new Map();
  for (const row of aggregatedRows) {
    const key = `${row.category_key}::${row.month}`;
    const count = Number(row.total_count || 0);
    categoryMonthMap.set(key, count);
    categorizedByMonth.set(row.month, (categorizedByMonth.get(row.month) || 0) + count);
  }

  const rows = thresholds.map((t) => {
    const monthlyCounts = months.map((month) => {
      const baselineValue = CATEGORY_BASELINE_MONTHLY[month]?.[t.category_key];
      if (baselineValue !== undefined) return baselineValue;
      return categoryMonthMap.get(`${t.category_key}::${month}`) || 0;
    });

    const rawSum = monthlyCounts.reduce((acc, cur) => acc + cur, 0);
    const adjustedSum = rawSum * multiplier;

    let score = 0;
    if (adjustedSum >= Number(t.min_for_02)) score = Number(t.point_02);
    else if (adjustedSum >= Number(t.min_for_01) && adjustedSum <= Number(t.max_for_01)) score = Number(t.point_01);

    return {
      category_key: t.category_key,
      category_label: t.category_label,
      monthly_counts: monthlyCounts,
      raw_sum: rawSum,
      adjusted_sum: adjustedSum,
      threshold: {
        min_for_01: Number(t.min_for_01),
        max_for_01: Number(t.max_for_01),
        min_for_02: Number(t.min_for_02),
        point_01: Number(t.point_01),
        point_02: Number(t.point_02),
      },
      score,
      is_met: score >= Number(t.point_02),
    };
  });

  const monthlyRawTotals = Array(months.length).fill(0);
  for (const row of rows) {
    row.monthly_counts.forEach((value, idx) => {
      monthlyRawTotals[idx] += value;
    });
  }

  const totalRawSum = monthlyRawTotals.reduce((acc, cur) => acc + cur, 0);
  const totalAdjustedSum = totalRawSum * multiplier;
  const metCount = rows.filter((r) => r.is_met).length;
  const unmetCount = rows.length - metCount;
  const warnings = [];
  const monthlyCaseMap = new Map(monthlyCaseRows.map((r) => [r.month, r]));

  for (const month of months) {
    if (CATEGORY_BASELINE_MONTHLY[month]) continue;
    const caseInfo = monthlyCaseMap.get(month);
    if (!caseInfo) continue;
    const totalCases = Number(caseInfo.total_cases || 0);
    const categorizedCases = Number(categorizedByMonth.get(month) || 0);
    const missingCases = Number(caseInfo.missing_or_unknown_cases || 0);

    if (totalCases > 0 && categorizedCases === 0) {
      warnings.push(`${month.replace('-', '.')} data has no stored diagnosis code; category score appears as 0.`);
    } else if (missingCases > 0) {
      warnings.push(`${month.replace('-', '.')} has ${missingCases} cases without diagnosis code; excluded from score.`);
    }
  }

  return {
    months,
    multiplier,
    rows,
    warnings,
    totals: {
      monthly_raw_totals: monthlyRawTotals,
      total_raw_sum: totalRawSum,
      total_adjusted_sum: totalAdjustedSum,
      met_count: metCount,
      unmet_count: unmetCount,
    },
  };
}

module.exports = { getCategoryThresholds, getCategoryScore };
