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
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function updateCourseToEnglish() {
    try {
        console.log('🌐 Updating Course 1 to English...\n');

        await sql.connect(dbConfig);

        // Update course description (only update if it's in Thai)
        await sql.query`
            UPDATE courses
            SET
                description = 'A foundational course in information security covering the fundamentals of securing data, information, and information systems. Learn about the three core security principles (confidentiality, integrity, and availability), other essential components, the security-functionality-usability triangle, attack patterns, threat types and vulnerabilities, cyber threats, security trends, and risk management and mitigation strategies.'
            WHERE course_id = 1
        `;

        console.log('✅ Course description updated to English\n');

        // Update lessons to English
        await sql.query`
            UPDATE lessons
            SET
                title = 'Comparing Security Roles and Security Controls',
                content = 'Understanding the different security roles and implementing appropriate security controls to protect organizational assets.'
            WHERE course_id = 1
        `;

        console.log('✅ Lessons updated to English\n');
        console.log('🎉 Course 1 updated to English successfully!\n');

    } catch (err) {
        console.error('❌ Error:', err);
        throw err;
    } finally {
        await sql.close();
    }
}

// Run update
updateCourseToEnglish()
    .then(() => {
        console.log('✅ All done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
