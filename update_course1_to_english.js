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

async function updateToEnglish() {
    try {
        await sql.connect(dbConfig);

        console.log('🌐 Updating Course 1 to English...\n');

        // Update courses table
        console.log('📝 Updating courses table...');
        await sql.query`
            UPDATE courses
            SET
                title = 'Information Security Fundamentals',
                category = 'Laws and Regulations',
                prerequisite_knowledge = 'No special prerequisites required',
                language = 'English'
            WHERE course_id = 1
        `;
        console.log('✅ Course data updated\n');

        // Update course_materials table
        console.log('📝 Updating course materials...');
        await sql.query`
            UPDATE course_materials
            SET
                title = 'Comparing Security Roles and Security Controls',
                content = 'Understanding the different security roles and implementing appropriate security controls to protect organizational assets.'
            WHERE course_id = 1
        `;
        console.log('✅ Course materials updated\n');

        // Verify updates
        console.log('📋 Verifying updates...\n');
        const course = await sql.query`SELECT title, category, prerequisite_knowledge, language FROM courses WHERE course_id = 1`;
        console.log('Course data:');
        console.log(course.recordset[0]);

        const materials = await sql.query`SELECT title, content FROM course_materials WHERE course_id = 1`;
        console.log('\nCourse materials:');
        console.log(materials.recordset[0]);

        console.log('\n🎉 Course 1 successfully updated to English!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        throw err;
    } finally {
        await sql.close();
    }
}

updateToEnglish()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Failed:', err);
        process.exit(1);
    });
