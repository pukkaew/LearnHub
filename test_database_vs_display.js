const { poolPromise, sql } = require('./config/database');
const Course = require('./models/Course');

async function testDatabaseVsDisplay() {
    try {
        console.log('🔍 DATABASE vs DISPLAY VERIFICATION\n');
        console.log('='.repeat(90));

        const pool = await poolPromise;

        // Get latest course ID
        const latest = await pool.request().query(`
            SELECT TOP 1 course_id
            FROM courses
            ORDER BY created_at DESC
        `);

        if (latest.recordset.length === 0) {
            console.log('❌ No courses found');
            process.exit(1);
        }

        const courseId = latest.recordset[0].course_id;
        console.log(`📌 Testing Course ID: ${courseId}\n`);

        // STEP 1: Get RAW data from database
        console.log('📊 STEP 1: RAW DATABASE DATA');
        console.log('─'.repeat(90));

        const rawResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT
                    course_id,
                    title,
                    description,
                    category,
                    difficulty_level,
                    course_type,
                    language,
                    instructor_name,
                    duration_hours,
                    price,
                    max_students,
                    passing_score,
                    max_attempts,
                    learning_objectives,
                    target_audience,
                    prerequisite_knowledge,
                    certificate_validity,
                    is_published
                FROM courses
                WHERE course_id = @courseId
            `);

        const rawData = rawResult.recordset[0];

        console.log('Field                        Raw DB Value');
        console.log('─'.repeat(90));
        console.log(`title                        ${rawData.title}`);
        console.log(`difficulty_level             ${rawData.difficulty_level}`);
        console.log(`course_type                  ${rawData.course_type}`);
        console.log(`language                     ${rawData.language}`);
        console.log(`instructor_name              ${rawData.instructor_name}`);
        console.log(`duration_hours               ${rawData.duration_hours}`);
        console.log(`price                        ${rawData.price}`);
        console.log(`max_students                 ${rawData.max_students}`);
        console.log(`passing_score                ${rawData.passing_score}`);
        console.log(`max_attempts                 ${rawData.max_attempts}`);
        console.log(`certificate_validity         ${rawData.certificate_validity}`);

        // Get materials count
        const materialsResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`SELECT COUNT(*) as count FROM course_materials WHERE course_id = @courseId`);

        console.log(`lessons (count)              ${materialsResult.recordset[0].count}`);
        console.log('');

        // STEP 2: Get data via Course.findById()
        console.log('🔄 STEP 2: DATA VIA Course.findById()');
        console.log('─'.repeat(90));

        const processedData = await Course.findById(courseId);

        console.log('Field                        Processed Value');
        console.log('─'.repeat(90));
        console.log(`title                        ${processedData.title}`);
        console.log(`course_name (alias)          ${processedData.course_name}`);
        console.log(`difficulty_level             ${processedData.difficulty_level}`);
        console.log(`course_type                  ${processedData.course_type}`);
        console.log(`language                     ${processedData.language}`);
        console.log(`instructor_name              ${processedData.instructor_name}`);
        console.log(`duration_hours               ${processedData.duration_hours}`);
        console.log(`price                        ${processedData.price}`);
        console.log(`max_students                 ${processedData.max_students}`);
        console.log(`passing_score                ${processedData.passing_score}`);
        console.log(`max_attempts                 ${processedData.max_attempts}`);
        console.log(`certificate_validity         ${processedData.certificate_validity}`);
        console.log(`lessons.length               ${processedData.lessons?.length || 0}`);
        console.log('');

        // STEP 3: What should be displayed
        console.log('🎨 STEP 3: WHAT SHOULD BE DISPLAYED ON SCREEN');
        console.log('─'.repeat(90));

        // Simulate display functions
        const getDifficultyText = (level) => {
            if (!level) return 'ไม่ระบุ';
            const texts = {
                'beginner': 'เริ่มต้น',
                'intermediate': 'ปานกลาง',
                'advanced': 'ขั้นสูง'
            };
            return texts[level.toLowerCase()] || level;
        };

        const getCourseTypeText = (type) => {
            const map = { 'Online': 'ออนไลน์', 'Onsite': 'ในสถานที่', 'Hybrid': 'ผสมผสาน' };
            return map[type] || type || 'ไม่ระบุ';
        };

        const getLanguageText = (lang) => {
            const map = { 'th': 'ไทย', 'en': 'English', 'zh': '中文' };
            return map[lang] || lang || 'ไม่ระบุ';
        };

        console.log('Display Field                Expected Display Value');
        console.log('─'.repeat(90));
        console.log(`Page Title                   ${processedData.title || processedData.course_name || 'หลักสูตร'} - Rukchai...`);
        console.log(`Course Title (Header)        ${processedData.title || processedData.course_name}`);
        console.log(`Difficulty Badge             ${getDifficultyText(processedData.difficulty_level)}`);
        console.log(`Course Type                  ${getCourseTypeText(processedData.course_type)}`);
        console.log(`Language                     ${getLanguageText(processedData.language)}`);
        console.log(`Instructor                   ${processedData.instructor_name || 'ไม่ระบุ'}`);
        console.log(`Duration                     ${processedData.duration_hours || 0} ชั่วโมง`);
        console.log(`Price                        ${processedData.price ? Number(processedData.price).toLocaleString('th-TH') + ' บาท' : 'ฟรี'}`);
        console.log(`Max Students                 ${processedData.max_students ? processedData.max_students + ' คน' : 'ไม่จำกัด'}`);
        console.log(`Passing Score                ${processedData.passing_score ? processedData.passing_score + '%' : 'ไม่ระบุ'}`);
        console.log(`Max Attempts                 ${processedData.max_attempts ? processedData.max_attempts + ' ครั้ง' : 'ไม่จำกัด'}`);
        console.log(`Certificate                  ${processedData.certificate_validity ? 'มี (' + processedData.certificate_validity + ')' : 'ไม่มี'}`);
        console.log(`Lessons Count                ${processedData.lessons?.length || 0} บท`);
        console.log('');

        // STEP 4: Comparison
        console.log('='.repeat(90));
        console.log('📋 COMPARISON RESULTS');
        console.log('='.repeat(90));
        console.log('');

        const comparisons = [
            {
                field: 'Title',
                raw: rawData.title,
                processed: processedData.title,
                display: processedData.title || processedData.course_name
            },
            {
                field: 'Difficulty',
                raw: rawData.difficulty_level,
                processed: processedData.difficulty_level,
                display: getDifficultyText(processedData.difficulty_level)
            },
            {
                field: 'Course Type',
                raw: rawData.course_type,
                processed: processedData.course_type,
                display: getCourseTypeText(processedData.course_type)
            },
            {
                field: 'Language',
                raw: rawData.language,
                processed: processedData.language,
                display: getLanguageText(processedData.language)
            },
            {
                field: 'Instructor',
                raw: rawData.instructor_name,
                processed: processedData.instructor_name,
                display: processedData.instructor_name || 'ไม่ระบุ'
            },
            {
                field: 'Duration',
                raw: rawData.duration_hours,
                processed: processedData.duration_hours,
                display: processedData.duration_hours + ' ชั่วโมง'
            },
            {
                field: 'Price',
                raw: rawData.price,
                processed: parseFloat(processedData.price),
                display: Number(processedData.price).toLocaleString('th-TH') + ' บาท'
            },
            {
                field: 'Max Students',
                raw: rawData.max_students,
                processed: processedData.max_students,
                display: processedData.max_students + ' คน'
            },
            {
                field: 'Passing Score',
                raw: rawData.passing_score,
                processed: processedData.passing_score,
                display: processedData.passing_score + '%'
            },
            {
                field: 'Max Attempts',
                raw: rawData.max_attempts,
                processed: processedData.max_attempts,
                display: processedData.max_attempts + ' ครั้ง'
            }
        ];

        console.log('Field            Raw DB  →  Processed  →  Display                   Status');
        console.log('─'.repeat(90));

        let allMatch = true;
        comparisons.forEach(comp => {
            const rawToProcessed = comp.raw == comp.processed;
            const match = rawToProcessed;

            const icon = match ? '✅' : '❌';
            const rawStr = String(comp.raw || 'NULL').substring(0, 12);
            const procStr = String(comp.processed || 'NULL').substring(0, 12);
            const dispStr = String(comp.display || 'NULL').substring(0, 20);

            console.log(`${icon} ${comp.field.padEnd(14)} ${rawStr.padEnd(8)} ${procStr.padEnd(12)} ${dispStr}`);

            if (!match) allMatch = false;
        });

        console.log('');
        console.log('='.repeat(90));
        if (allMatch) {
            console.log('✅ SUCCESS! All data from DATABASE → Course Model → DISPLAY matches!');
            console.log('');
            console.log('🌐 กรุณาเปิดเว็บเบราว์เซอร์และไปที่:');
            console.log(`   http://localhost:3000/courses/${courseId}`);
            console.log('');
            console.log('และเปรียบเทียบกับค่าด้านบน ถ้าแสดงไม่ตรง กรุณาส่ง screenshot มาให้ดู');
        } else {
            console.log('❌ MISMATCH! Some data is not matching between layers!');
        }
        console.log('='.repeat(90));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

testDatabaseVsDisplay();
