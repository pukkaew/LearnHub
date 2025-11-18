const Course = require('./models/Course');

async function testEditPageAPI() {
    try {
        console.log('🔍 ตรวจสอบ API สำหรับหน้าแก้ไข\n');
        console.log('='.repeat(80));

        // 1. ตรวจสอบว่า Course มี ID 1 หรือไม่
        const course = await Course.findById(1);

        if (!course) {
            console.log('❌ ไม่พบ Course ID 1');
            console.log('💡 กรุณาสร้างหลักสูตรก่อน');
            process.exit(1);
        }

        console.log('\n✅ พบ Course ID 1');
        console.log(`ชื่อ: "${course.course_name || course.title}"\n`);
        console.log('='.repeat(80));

        // 2. ตรวจสอบฟิลด์ทั้งหมดที่ส่งกลับมา
        console.log('\n📊 ฟิลด์ทั้งหมดที่มีใน Course object:');
        console.log('='.repeat(80));

        const fields = Object.keys(course).sort();
        fields.forEach(field => {
            const value = course[field];
            let displayValue = value;

            if (value === null) displayValue = 'NULL';
            else if (value === undefined) displayValue = 'undefined';
            else if (typeof value === 'string' && value.length > 50) displayValue = value.substring(0, 50) + '...';
            else if (typeof value === 'object') displayValue = JSON.stringify(value).substring(0, 50) + '...';

            console.log(`  ${field}: ${displayValue}`);
        });

        // 3. ตรวจสอบฟิลด์ที่หน้าแก้ไขต้องการ
        console.log('\n\n📋 ฟิลด์ที่หน้าแก้ไขต้องการ:');
        console.log('='.repeat(80));

        const requiredFields = [
            // Basic Information
            { name: 'course_id', found: !!course.course_id, value: course.course_id },
            { name: 'course_name', found: !!course.course_name, value: course.course_name },
            { name: 'course_code', found: !!course.course_code, value: course.course_code },
            { name: 'category_id', found: !!course.category_id, value: course.category_id },
            { name: 'difficulty_level', found: !!course.difficulty_level, value: course.difficulty_level },
            { name: 'course_type', found: !!course.course_type, value: course.course_type },
            { name: 'language', found: !!course.language, value: course.language },
            { name: 'duration_hours', found: course.duration_hours !== null && course.duration_hours !== undefined, value: course.duration_hours },
            { name: 'duration_minutes', found: course.duration_minutes !== null && course.duration_minutes !== undefined, value: course.duration_minutes },

            // Course Details
            { name: 'description', found: !!course.description, value: course.description ? 'มี' : null },
            { name: 'learning_objectives', found: !!course.learning_objectives || !!course.objectives, value: course.learning_objectives || course.objectives },
            { name: 'prerequisite_knowledge', found: !!course.prerequisite_knowledge || !!course.prerequisites, value: course.prerequisite_knowledge || course.prerequisites },
            { name: 'target_audience', found: !!course.target_audience, value: course.target_audience },

            // Settings
            { name: 'max_enrollments', found: course.max_enrollments !== null && course.max_enrollments !== undefined, value: course.max_enrollments },
            { name: 'max_students', found: course.max_students !== null && course.max_students !== undefined, value: course.max_students },
            { name: 'passing_score', found: course.passing_score !== null && course.passing_score !== undefined, value: course.passing_score },
            { name: 'max_attempts', found: course.max_attempts !== null && course.max_attempts !== undefined, value: course.max_attempts },
            { name: 'certificate_validity', found: course.certificate_validity !== null && course.certificate_validity !== undefined, value: course.certificate_validity },

            // Dates
            { name: 'enrollment_start', found: !!course.enrollment_start || !!course.start_date, value: course.enrollment_start || course.start_date },
            { name: 'enrollment_end', found: !!course.enrollment_end || !!course.end_date, value: course.enrollment_end || course.end_date },

            // Image
            { name: 'course_image', found: !!course.course_image, value: course.course_image },
            { name: 'thumbnail_image', found: !!course.thumbnail_image || !!course.thumbnail, value: course.thumbnail_image || course.thumbnail },

            // Instructor
            { name: 'instructor_id', found: !!course.instructor_id, value: course.instructor_id },
            { name: 'instructor_name', found: !!course.instructor_name, value: course.instructor_name },

            // Checkboxes
            { name: 'is_mandatory', found: course.is_mandatory !== null && course.is_mandatory !== undefined, value: course.is_mandatory },
            { name: 'allow_certificate', found: course.allow_certificate !== null && course.allow_certificate !== undefined, value: course.allow_certificate },
            { name: 'is_public', found: course.is_public !== null && course.is_public !== undefined, value: course.is_public },

            // Status
            { name: 'status', found: !!course.status, value: course.status },
        ];

        const missingFields = [];
        const foundFields = [];
        const nullFields = [];

        requiredFields.forEach(field => {
            if (!field.found) {
                if (course[field.name] === null) {
                    nullFields.push(field.name);
                } else {
                    missingFields.push(field.name);
                }
            } else {
                foundFields.push(field.name);
            }
        });

        console.log(`\n✅ พบ: ${foundFields.length} ฟิลด์`);
        console.log(`⚠️  NULL: ${nullFields.length} ฟิลด์`);
        console.log(`❌ ไม่พบ: ${missingFields.length} ฟิลด์`);

        if (nullFields.length > 0) {
            console.log('\n⚠️  ฟิลด์ที่เป็น NULL (ไม่ได้กรอกตอนสร้าง):');
            nullFields.forEach(f => console.log(`  - ${f}`));
        }

        if (missingFields.length > 0) {
            console.log('\n❌ ฟิลด์ที่ไม่มีเลย (ไม่มีใน database):');
            missingFields.forEach(f => console.log(`  - ${f}`));
        }

        // 4. ตรวจสอบ mapping ของชื่อฟิลด์
        console.log('\n\n🔄 ตรวจสอบ Field Mapping:');
        console.log('='.repeat(80));

        const fieldMappings = [
            { edit: 'course_name', db: ['course_name', 'title'] },
            { edit: 'duration_hours', db: ['duration_hours'] },
            { edit: 'duration_minutes', db: ['duration_minutes'] },
            { edit: 'learning_objectives', db: ['learning_objectives', 'objectives'] },
            { edit: 'prerequisite_knowledge', db: ['prerequisite_knowledge', 'prerequisites'] },
            { edit: 'max_enrollments', db: ['max_enrollments', 'max_students'] },
            { edit: 'enrollment_start', db: ['enrollment_start', 'start_date'] },
            { edit: 'enrollment_end', db: ['enrollment_end', 'end_date'] },
            { edit: 'course_image', db: ['course_image', 'thumbnail_image', 'thumbnail'] },
        ];

        fieldMappings.forEach(mapping => {
            const foundIn = mapping.db.find(dbField => course[dbField] !== null && course[dbField] !== undefined);
            if (foundIn) {
                if (foundIn !== mapping.edit) {
                    console.log(`  ⚠️  ${mapping.edit} → ใช้จาก ${foundIn}`);
                } else {
                    console.log(`  ✅ ${mapping.edit} → ${foundIn}`);
                }
            } else {
                console.log(`  ❌ ${mapping.edit} → ไม่พบใน [${mapping.db.join(', ')}]`);
            }
        });

        // 5. ตรวจสอบโครงสร้างข้อมูลซับซ้อน
        console.log('\n\n📦 ตรวจสอบโครงสร้างข้อมูลซับซ้อน:');
        console.log('='.repeat(80));

        // learning_objectives
        if (course.learning_objectives || course.objectives) {
            const obj = course.learning_objectives || course.objectives;
            console.log('\n  learning_objectives:');
            console.log(`    Type: ${typeof obj}`);
            try {
                const parsed = typeof obj === 'string' ? JSON.parse(obj) : obj;
                console.log(`    Is Array: ${Array.isArray(parsed)}`);
                console.log(`    Length: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`    Example: "${parsed[0]}"`);
                }
            } catch (e) {
                console.log(`    ❌ Parse Error: ${e.message}`);
            }
        } else {
            console.log('\n  ❌ learning_objectives: ไม่มี');
        }

        // target_audience
        if (course.target_audience) {
            console.log('\n  target_audience:');
            console.log(`    Type: ${typeof course.target_audience}`);
            try {
                const parsed = typeof course.target_audience === 'string' ? JSON.parse(course.target_audience) : course.target_audience;
                console.log(`    Keys: ${Object.keys(parsed).join(', ')}`);
                if (parsed.positions) console.log(`    Positions: ${Array.isArray(parsed.positions) ? parsed.positions.length : 'Not array'}`);
                if (parsed.departments) console.log(`    Departments: ${Array.isArray(parsed.departments) ? parsed.departments.length : 'Not array'}`);
            } catch (e) {
                console.log(`    ❌ Parse Error: ${e.message}`);
            }
        } else {
            console.log('\n  ❌ target_audience: ไม่มี');
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ เสร็จสิ้นการตรวจสอบ');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

testEditPageAPI();
