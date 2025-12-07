const {poolPromise, sql} = require('./config/database');

(async() => {
    try {
        const pool = await poolPromise;
        const page = 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';

        const request = pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit);

        // First query - COUNT
        console.log('Running COUNT query...');
        const countResult = await request.query(`
            SELECT COUNT(*) as total
            FROM Applicants a
            LEFT JOIN positions p ON a.position_id = p.position_id
            ${whereClause}
        `);
        console.log('Count result:', countResult.recordset[0].total);

        // Second query - main data
        console.log('Running main query...');
        const result = await request.query(`
            SELECT a.*,
                   p.position_name,
                   d.department_name,
                   ata.percentage as test_score,
                   ata.percentage,
                   CASE WHEN ata.percentage >= ISNULL(t.passing_marks, 60) THEN 1 ELSE 0 END as passed,
                   ata.started_at as test_start_time,
                   ata.completed_at as test_end_time,
                   CASE WHEN ata.status = 'Completed' THEN 1 ELSE 0 END as test_completed
            FROM Applicants a
            LEFT JOIN positions p ON a.position_id = p.position_id
            LEFT JOIN Departments d ON p.department_id = d.department_id
            LEFT JOIN ApplicantTestAttempts ata ON a.applicant_id = ata.applicant_id AND ata.status = 'Completed'
            LEFT JOIN Tests t ON ata.test_id = t.test_id
            ${whereClause}
            ORDER BY a.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);

        console.log('Main query result count:', result.recordset.length);
        console.log('Main query result:', JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
})();
