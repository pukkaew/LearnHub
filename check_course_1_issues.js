const sql = require('mssql');

const config = {
    server: 'DESKTOP-66CEAMH\\SQLEXPRESS',
    database: 'LearnHub',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    authentication: {
        type: 'ntlm',
        options: {
            domain: '',
            userName: '',
            password: ''
        }
    }
};

async function checkCourse1() {
    try {
        await sql.connect(config);
        console.log('Connected to database\n');

        // 1. Check Course basic data
        console.log('=== 1. COURSE DATA ===');
        const courseResult = await sql.query`
            SELECT course_id, title, target_audience, learning_objectives
            FROM courses
            WHERE course_id = 1
        `;
        console.log('Course:', JSON.stringify(courseResult.recordset[0], null, 2));

        // 2. Check course materials (lessons with video)
        console.log('\n=== 2. COURSE MATERIALS (LESSONS) ===');
        const materialsResult = await sql.query`
            SELECT material_id, title, file_path, type, duration_minutes
            FROM course_materials
            WHERE course_id = 1
            ORDER BY order_index
        `;
        console.log(`Found ${materialsResult.recordset.length} lessons:`);
        materialsResult.recordset.forEach(lesson => {
            console.log(`\n- ${lesson.title}`);
            console.log(`  Duration: ${lesson.duration_minutes} min`);
            console.log(`  Type: ${lesson.type}`);
            console.log(`  Video URL (file_path): ${lesson.file_path || 'NULL ❌'}`);
        });

        // 3. Parse target_audience if it exists
        console.log('\n=== 3. TARGET AUDIENCE ANALYSIS ===');
        const targetAudience = courseResult.recordset[0].target_audience;
        if (targetAudience) {
            try {
                const parsed = JSON.parse(targetAudience);
                console.log('Parsed target_audience:', JSON.stringify(parsed, null, 2));
                console.log(`\nPositions: ${parsed.positions ? parsed.positions.length : 0} selected`);
                console.log(`Departments: ${parsed.departments ? parsed.departments.length : 0} selected`);

                if (parsed.positions && parsed.positions.length > 0) {
                    console.log('\nSelected positions:');
                    parsed.positions.forEach(p => console.log(`  - ${p}`));
                }

                if (parsed.departments && parsed.departments.length > 0) {
                    console.log('\nSelected departments:');
                    parsed.departments.forEach(d => console.log(`  - ${d}`));
                }
            } catch (e) {
                console.error('Failed to parse target_audience:', e.message);
                console.log('Raw value:', targetAudience);
            }
        } else {
            console.log('❌ target_audience is NULL!');
        }

        // 4. Check learning objectives
        console.log('\n=== 4. LEARNING OBJECTIVES ===');
        const objectives = courseResult.recordset[0].learning_objectives;
        if (objectives) {
            try {
                const parsed = JSON.parse(objectives);
                console.log(`Found ${parsed.length} objectives:`);
                parsed.forEach((obj, i) => {
                    console.log(`  ${i + 1}. ${obj}`);
                });
            } catch (e) {
                console.error('Failed to parse learning_objectives:', e.message);
            }
        } else {
            console.log('❌ learning_objectives is NULL!');
        }

        await sql.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkCourse1();
