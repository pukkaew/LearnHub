const {poolPromise, sql} = require('./config/database');

(async() => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('offset', sql.Int, 0);
        request.input('limit', sql.Int, 10);

        const r = await request.query(`
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
            ORDER BY a.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);

        console.log('Result count:', r.recordset.length);
        console.log('Result:', JSON.stringify(r.recordset, null, 2));
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
