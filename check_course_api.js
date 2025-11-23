require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};

async function checkCourseAPI() {
    try {
        await sql.connect(dbConfig);

        console.log('📋 Checking what API returns for Course 1...\n');

        // Get instructor info
        const course = await sql.query`
            SELECT
                c.*,
                u.name as instructor_name,
                u.avatar as instructor_avatar,
                u.bio as instructor_bio
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.user_id
            WHERE c.course_id = 1
        `;

        if (course.recordset.length > 0) {
            const c = course.recordset[0];
            console.log('Course data from API query:');
            console.log('  instructor_id:', c.instructor_id);
            console.log('  instructor_name:', c.instructor_name);
            console.log('  instructor_avatar:', c.instructor_avatar);
            console.log('  instructor_bio:', c.instructor_bio);
            console.log('  instructor_title:', c.instructor_title); // This should be undefined
            console.log();

            // Check if user exists
            if (c.instructor_id) {
                const user = await sql.query`SELECT * FROM users WHERE user_id = ${c.instructor_id}`;
                console.log('Instructor user data:');
                console.log(user.recordset[0]);
            } else {
                console.log('  No instructor_id assigned to this course');
            }
        }

        console.log('\n📚 Checking course materials/lessons...\n');
        const materials = await sql.query`
            SELECT * FROM course_materials WHERE course_id = 1 ORDER BY order_index
        `;

        materials.recordset.forEach((m, i) => {
            console.log(`Material ${i + 1}:`);
            console.log('  title:', m.title);
            console.log('  type:', m.type);
            console.log('  order_index:', m.order_index);
            console.log();
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sql.close();
    }
}

checkCourseAPI();
