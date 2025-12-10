const { poolPromise, sql } = require('./config/database.js');

async function test() {
    const pool = await poolPromise;

    console.log('=== Testing getTestsByPosition(65) query ===\n');

    const result = await pool.request()
        .input('positionId', sql.Int, 65)
        .query(`
            -- Global tests
            SELECT
                NULL as set_id,
                @positionId as position_id,
                t.test_id,
                0 as test_order,
                'global' as test_category,
                1 as is_required,
                100 as weight_percent,
                NULL as passing_score_override,
                1 as is_active,
                t.created_at,
                t.updated_at,
                t.title as test_title,
                t.type as test_type,
                t.status as test_status,
                'global' as assignment_type,
                (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
            FROM Tests t
            WHERE t.is_global_applicant_test = 1
              AND t.status = 'Published'
              AND t.type IN ('job_application_test', 'aptitude_test', 'pre_employment_test')

            UNION ALL

            -- Tests from TestPositions
            SELECT
                tp.id as set_id,
                tp.position_id,
                t.test_id,
                tp.test_order,
                'position' as test_category,
                tp.is_required,
                tp.weight_percent,
                tp.passing_score_override,
                tp.is_active,
                tp.created_at,
                tp.created_at as updated_at,
                t.title as test_title,
                t.type as test_type,
                t.status as test_status,
                'position' as assignment_type,
                (SELECT COUNT(*) FROM Questions WHERE test_id = t.test_id AND is_active = 1) as question_count
            FROM TestPositions tp
            JOIN Tests t ON tp.test_id = t.test_id
            WHERE tp.position_id = @positionId
              AND tp.is_active = 1
              AND t.status = 'Published'
              AND t.is_global_applicant_test = 0

            ORDER BY test_order, created_at
        `);

    console.log('Total tests found:', result.recordset.length);
    result.recordset.forEach(t => {
        console.log('test_id:', t.test_id, '| title:', t.test_title, '| type:', t.assignment_type, '| test_type:', t.test_type);
    });

    process.exit(0);
}
test();
