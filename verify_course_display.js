const Course = require('./models/Course');

async function verifyCourseDisplay() {
    try {
        console.log('🔍 Verifying Course Display Data\n');
        console.log('='.repeat(80));

        const courseId = 2;
        console.log(`\n📊 Fetching course ID: ${courseId}\n`);

        const course = await Course.findById(courseId);

        if (!course) {
            console.error('❌ Course not found!');
            process.exit(1);
        }

        console.log('✅ Course retrieved successfully\n');
        console.log('='.repeat(80));
        console.log('FIELD VERIFICATION:');
        console.log('='.repeat(80));

        // Header Section
        console.log('\n📍 HEADER SECTION:');
        console.log('─'.repeat(80));
        console.log(`✓ Title: "${course.title || course.course_name}"`);
        console.log(`✓ Course Code: "${course.course_code}"`);
        console.log(`✓ Category: "${course.category_name || 'N/A'}"`);
        console.log(`✓ Difficulty: "${course.difficulty_level}" → Should display as:`);
        if (course.difficulty_level) {
            const diffMap = {
                'beginner': 'เริ่มต้น',
                'intermediate': 'ปานกลาง',
                'advanced': 'ขั้นสูง'
            };
            const normalizedLevel = course.difficulty_level.toLowerCase();
            console.log(`   "${diffMap[normalizedLevel] || course.difficulty_level}"`);
        }
        console.log(`✓ Instructor: "${course.instructor_name || 'ไม่ระบุ'}"`);
        console.log(`✓ Duration: ${course.duration_hours || 0} ชั่วโมง`);

        // Sidebar Section
        console.log('\n📍 SIDEBAR - ข้อมูลคอร์ส:');
        console.log('─'.repeat(80));

        // Language
        console.log(`✓ Language: "${course.language}" → Should display as:`);
        const langMap = {
            'th': 'ภาษาไทย',
            'en': 'ภาษาอังกฤษ',
            'th-en': 'ไทย-อังกฤษ'
        };
        console.log(`   "${langMap[course.language] || course.language}"`);
        if (!langMap[course.language]) {
            console.log(`   ⚠️  WARNING: Language "${course.language}" not in mapping!`);
        }

        // Course Type
        console.log(`✓ Course Type: "${course.course_type}" → Should display as:`);
        const typeMap = {
            'mandatory': 'บังคับ',
            'elective': 'เลือก',
            'recommended': 'แนะนำ'
        };
        console.log(`   "${typeMap[course.course_type] || course.course_type}"`);
        if (!typeMap[course.course_type]) {
            console.log(`   ⚠️  WARNING: Course type "${course.course_type}" not in mapping!`);
        }

        // Max Students
        console.log(`✓ Max Students: ${course.max_students || 'NULL'}`);
        if (course.max_students) {
            console.log(`   Should display: "${course.max_students} คน"`);
        } else {
            console.log(`   Should display: "ไม่จำกัด"`);
        }

        console.log(`✓ Passing Score: ${course.passing_score || 'NULL'}%`);
        console.log(`✓ Max Attempts: ${course.max_attempts || 'NULL'} ครั้ง`);
        console.log(`✓ Certificate: "${course.certificate_validity || 'NULL'}"`);
        if (course.certificate_validity) {
            console.log(`   Should display: "มี (${course.certificate_validity})"`);
        }

        // Overview Tab
        console.log('\n📍 TAB "ภาพรวม":');
        console.log('─'.repeat(80));

        console.log(`✓ Intro Video: "${course.intro_video_url || 'NULL'}"`);

        // Learning Objectives
        const objectives = Array.isArray(course.learning_objectives)
            ? course.learning_objectives
            : (course.learning_objectives ? JSON.parse(course.learning_objectives) : []);
        console.log(`✓ Learning Objectives: ${objectives.length} items`);
        objectives.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj.substring(0, 60)}${obj.length > 60 ? '...' : ''}`);
        });

        // Target Audience
        console.log(`✓ Target Audience:`);
        if (course.target_audience) {
            const targetAudience = typeof course.target_audience === 'string'
                ? JSON.parse(course.target_audience)
                : course.target_audience;

            if (targetAudience.positions) {
                const positionMap = {
                    'all': 'ทุกตำแหน่ง',
                    'manager': 'ผู้จัดการ',
                    'supervisor': 'หัวหน้างาน',
                    'staff': 'พนักงานทั่วไป',
                    'executive': 'ผู้บริหาร',
                    'specialist': 'ผู้เชี่ยวชาญ',
                    'developer': 'นักพัฒนา',
                    'engineer': 'วิศวกร',
                    'analyst': 'นักวิเคราะห์'
                };
                const positions = targetAudience.positions.map(p => positionMap[p] || p).join(', ');
                console.log(`   Positions: ${positions}`);
            }

            if (targetAudience.departments) {
                const departmentMap = {
                    'all': 'ทุกแผนก',
                    'IT': 'ไอที',
                    'Development': 'พัฒนา',
                    'Technology': 'เทคโนโลยี',
                    'Digital': 'ดิจิทัล',
                    'HR': 'ทรัพยากรบุคคล',
                    'Finance': 'การเงิน',
                    'Marketing': 'การตลาด',
                    'Sales': 'ฝ่ายขาย'
                };
                const departments = targetAudience.departments.map(d => departmentMap[d] || d).join(', ');
                console.log(`   Departments: ${departments}`);
            }
        }

        console.log(`✓ Prerequisites: "${course.prerequisite_knowledge ? course.prerequisite_knowledge.substring(0, 60) + '...' : 'ไม่มี'}"`);

        // Curriculum Tab
        console.log('\n📍 TAB "หลักสูตร":');
        console.log('─'.repeat(80));

        const lessons = Array.isArray(course.lessons)
            ? course.lessons
            : (course.lessons ? JSON.parse(course.lessons) : []);
        console.log(`✓ Lessons: ${lessons.length} บท`);
        lessons.forEach((lesson, i) => {
            console.log(`   ${i + 1}. ${lesson.title}`);
            console.log(`      Duration: ${lesson.duration_minutes || lesson.duration || 0} นาที`);
            if (lesson.description || lesson.content) {
                const desc = (lesson.description || lesson.content).substring(0, 60);
                console.log(`      Description: ${desc}${desc.length >= 60 ? '...' : ''}`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('CRITICAL CHECKS:');
        console.log('='.repeat(80));

        const checks = [];

        // Check 1: Language
        if (course.language && !langMap[course.language]) {
            checks.push(`❌ Language "${course.language}" not mapped correctly`);
        } else if (course.language && langMap[course.language]) {
            checks.push(`✅ Language mapped: "${course.language}" → "${langMap[course.language]}"`);
        }

        // Check 2: Course Type
        if (course.course_type && !typeMap[course.course_type]) {
            checks.push(`❌ Course type "${course.course_type}" not mapped correctly`);
        } else if (course.course_type && typeMap[course.course_type]) {
            checks.push(`✅ Course type mapped: "${course.course_type}" → "${typeMap[course.course_type]}"`);
        }

        // Check 3: Max Students
        if (course.max_students) {
            checks.push(`✅ Max students: ${course.max_students} (should display as "${course.max_students} คน")`);
        } else {
            checks.push(`⚠️  Max students is NULL (should display as "ไม่จำกัด")`);
        }

        // Check 4: No Price Field
        if (course.price !== undefined) {
            checks.push(`⚠️  Price field exists with value: ${course.price} (should not be displayed)`);
        } else {
            checks.push(`✅ No price field (correct)`);
        }

        checks.forEach(check => console.log(check));

        console.log('\n' + '='.repeat(80));
        console.log('🎯 NEXT STEP:');
        console.log('─'.repeat(80));
        console.log('1. Open browser and go to: http://localhost:3000/courses/2');
        console.log('2. Use the checklist in FIELD_VERIFICATION_CHECKLIST.md');
        console.log('3. Verify ALL fields match what is shown above');
        console.log('4. Report any mismatches with screenshots');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

verifyCourseDisplay();
