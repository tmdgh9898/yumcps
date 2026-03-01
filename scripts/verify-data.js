const { setupDatabase } = require('../server/db');

async function main() {
  const db = await setupDatabase();

  const totalDaily = await db.get('SELECT COUNT(*) AS c FROM daily_logs');
  const totalProfStats = await db.get('SELECT COUNT(*) AS c FROM professor_stats');
  const totalCases = await db.get('SELECT COUNT(*) AS c FROM professor_cases');

  const monthlyDaily = await db.all(`
    SELECT substr(date, 1, 7) AS month,
           COUNT(*) AS days,
           SUM(admission_count) AS admissions,
           SUM(discharge_count) AS discharges,
           SUM(total_surgery_count) AS surgeries,
           SUM(first_visit_count) AS first_visits,
           SUM(re_visit_count) AS re_visits,
           SUM(er_first_count) AS er_first,
           SUM(er_suture_count) AS er_suture
    FROM daily_logs
    GROUP BY substr(date, 1, 7)
    ORDER BY month
  `);

  const monthlyProfessor = await db.all(`
    SELECT substr(date, 1, 7) AS month,
           professor_name,
           SUM(general_count + local_count + bpb_count + mac_count + snb_count + fnb_count + spinal_count) AS ops,
           SUM(admission_count) AS admissions,
           SUM(discharge_count) AS discharges
    FROM professor_stats
    GROUP BY substr(date, 1, 7), professor_name
    ORDER BY month, professor_name
  `);

  const diagnosisQuality = await db.all(`
    SELECT substr(date, 1, 7) AS month,
           SUM(count) AS total_cases,
           SUM(CASE WHEN diagnosis_code IS NULL OR diagnosis_code = '' OR UPPER(diagnosis_code) = 'UNKNOWN' THEN count ELSE 0 END) AS unknown_cases
    FROM professor_cases
    GROUP BY substr(date, 1, 7)
    ORDER BY month
  `);

  const payload = {
    totals: {
      daily_logs: Number(totalDaily?.c || 0),
      professor_stats: Number(totalProfStats?.c || 0),
      professor_cases: Number(totalCases?.c || 0),
    },
    monthly_daily: monthlyDaily,
    monthly_professor: monthlyProfessor,
    diagnosis_quality: diagnosisQuality,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
