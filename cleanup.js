const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function cleanup() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('--- Cleaning up Summary Data ---');

    // 1. migrate.js에 의해 삽입된 'YYYY-MM-01' 형식의 요약 데이터 식별 및 삭제
    // 상세 수술 내역(professor_cases) 중에서 count가 개별성이 아닌 합계 형태(보통 큰 수)였거나
    // migrate.js가 넣었던 특정 데이터들을 선별합니다.

    // 사실 가장 깔끔한 방법은 professor_cases 테이블을 한번 비우고 
    // bulk_import_v3.js를 다시 돌리는 것입니다. 
    // (벌크 임포트는 개별 일지에서 하나씩 count를 올리므로 가장 정확함)

    console.log('Dropping and resetting tables for a clean start...');

    await db.run("DROP TABLE IF EXISTS professor_cases");
    await db.run("DROP TABLE IF EXISTS professor_stats");
    await db.run("DELETE FROM daily_logs");

    console.log('Database cleaned and schema reset.');
}

cleanup();
