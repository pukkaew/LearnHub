const { poolPromise, sql } = require('./config/database');

async function checkApplicants() {
    try {
        const pool = await poolPromise;

        // ดึงข้อมูลผู้สมัครพร้อมตำแหน่ง
        const result = await pool.request().query(`
            SELECT TOP 10
                a.applicant_id,
                a.first_name,
                a.last_name,
                a.test_code,
                a.status,
                p.position_name,
                p.position_id,
                (SELECT COUNT(*) FROM PositionTestSets WHERE position_id = a.position_id AND is_active = 1) as test_count
            FROM Applicants a
            LEFT JOIN Positions p ON a.position_id = p.position_id
            ORDER BY a.applicant_id DESC
        `);

        console.log('=== Recent Applicants ===');
        if (result.recordset.length === 0) {
            console.log('No applicants found');
        } else {
            result.recordset.forEach(a => {
                console.log(`ID: ${a.applicant_id} | ${a.first_name} ${a.last_name}`);
                console.log(`  Position: ${a.position_name || 'N/A'} (ID: ${a.position_id})`);
                console.log(`  Test Code: ${a.test_code}`);
                console.log(`  Status: ${a.status}`);
                console.log(`  Tests assigned: ${a.test_count}`);
                console.log('');
            });
        }

        // ดึงตำแหน่งที่มี test sets
        console.log('\n=== Positions with Test Sets ===');
        const positions = await pool.request().query(`
            SELECT
                p.position_id,
                p.position_name,
                COUNT(pts.set_id) as test_count
            FROM Positions p
            INNER JOIN PositionTestSets pts ON p.position_id = pts.position_id AND pts.is_active = 1
            GROUP BY p.position_id, p.position_name
        `);

        if (positions.recordset.length === 0) {
            console.log('No positions with test sets found');
        } else {
            positions.recordset.forEach(p => {
                console.log(`${p.position_name} (ID: ${p.position_id}) - ${p.test_count} tests`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkApplicants();
