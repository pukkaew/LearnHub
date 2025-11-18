const Course = require('./models/Course');

async function testUpdateTargetAudience() {
    try {
        console.log('🧪 ทดสอบการบันทึก target_audience\n');
        console.log('='.repeat(80));

        const courseId = 1;

        // 1. Check current data
        console.log('\n📊 ข้อมูลปัจจุบัน:');
        const courseBefore = await Course.findById(courseId);
        console.log('target_audience:', courseBefore.target_audience);

        // 2. Update with new target audience
        console.log('\n✏️  อัปเดตข้อมูล...');
        const updateData = {
            target_positions: ['1', '2'], // Example position IDs
            target_departments: ['1', '2', '3'], // Example department IDs
            course_type: 'Required',
            language: 'Thai',
            prerequisite_knowledge: 'มีความรู้พื้นฐานคอมพิวเตอร์',
            max_attempts: 3,
            certificate_validity: '12'
        };

        console.log('ข้อมูลที่จะอัปเดต:');
        console.log('  target_positions:', updateData.target_positions);
        console.log('  target_departments:', updateData.target_departments);
        console.log('  course_type:', updateData.course_type);
        console.log('  language:', updateData.language);

        const result = await Course.update(courseId, updateData);

        if (result.success) {
            console.log('\n✅ อัปเดตสำเร็จ!');

            // 3. Check updated data
            console.log('\n📊 ข้อมูลหลังอัปเดต:');
            const courseAfter = await Course.findById(courseId);

            console.log('\ntarget_audience:');
            console.log('  Type:', typeof courseAfter.target_audience);
            console.log('  Value:', courseAfter.target_audience);

            if (courseAfter.target_audience && typeof courseAfter.target_audience === 'object') {
                console.log('  Positions:', courseAfter.target_audience.positions);
                console.log('  Departments:', courseAfter.target_audience.departments);
            }

            console.log('\nฟิลด์อื่นๆ:');
            console.log('  course_type:', courseAfter.course_type);
            console.log('  language:', courseAfter.language);
            console.log('  prerequisite_knowledge:', courseAfter.prerequisite_knowledge);
            console.log('  max_attempts:', courseAfter.max_attempts);
            console.log('  certificate_validity:', courseAfter.certificate_validity);

            console.log('\n' + '='.repeat(80));
            console.log('✅ การทดสอบเสร็จสมบูรณ์');
        } else {
            console.log('\n❌ อัปเดตล้มเหลว:', result.message);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

testUpdateTargetAudience();
