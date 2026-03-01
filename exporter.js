const ExcelJS = require('exceljs');

async function generateMonthlyReport(monthData, professors, cases, outpatient) {
    const workbook = new ExcelJS.Workbook();

    // 1. 월별 요약 시트 (예: 2월)
    const monthName = monthData.split('-')[1].replace(/^0/, '');
    const sheet = workbook.addWorksheet(`${monthName}월`);

    sheet.getColumn(1).width = 25;
    for (let i = 2; i <= 10; i++) sheet.getColumn(i).width = 12;

    sheet.addRow([`${monthName}월`]).font = { bold: true, size: 14 };
    sheet.addRow([]);

    professors.forEach(prof => {
        sheet.addRow([`${prof.professor_name} 교수님`, null, null, null, null, null, null, null, null, null, 'CASE']).font = { bold: true };
        sheet.addRow(['General', prof.total_general, 'Local', prof.total_local, 'etc.', (prof.total_mac || 0) + (prof.total_bpb || 0) + (prof.total_snb || 0) + (prof.total_fnb || 0) + (prof.total_spinal || 0), '입원 환자', prof.total_admission, '외래 환자', prof.total_outpatient || 0]);

        // 상세 케이스 추가
        const profCases = cases.filter(c => c.professor_name === prof.professor_name);
        profCases.forEach(c => {
            sheet.addRow([c.case_name, c.total_count]);
        });
        sheet.addRow([]);
    });

    // 2. 퇴원 환자 수 시트
    const dischargeSheet = workbook.addWorksheet('퇴원 환자 수');
    dischargeSheet.addRow([null, null, 'ㅇ']);
    dischargeSheet.addRow(['2026 퇴원 (퇴원 + 전출)']);
    const header = ['담당교수', '합계', '기준', '점수'];
    dischargeSheet.addRow(header).font = { bold: true };

    professors.forEach(prof => {
        dischargeSheet.addRow([prof.professor_name, prof.total_discharge, '300명 미만', '0점']);
    });

    dischargeSheet.addRow([]);
    dischargeSheet.addRow(['2026 외래 환자 수']);
    dischargeSheet.addRow(['구분', '합계', '기준', '점수']);
    dischargeSheet.addRow(['초진', outpatient.total_first, '2500명 미만', '0점']);
    dischargeSheet.addRow(['재진', outpatient.total_re, '2500~3500명', '2점']);

    return workbook;
}

module.exports = { generateMonthlyReport };
