const Course = require('./models/Course');

async function checkTargetAudience() {
    try {
        console.log('🔍 ตรวจสอบ target_audience ของ Course ID 1\n');

        const course = await Course.findById(1);

        console.log('📊 ข้อมูล target_audience:');
        console.log('Type:', typeof course.target_audience);
        console.log('Value:', course.target_audience);
        console.log('JSON:', JSON.stringify(course.target_audience));

        if (typeof course.target_audience === 'string') {
            console.log('\n📝 Parse JSON:');
            try {
                const parsed = JSON.parse(course.target_audience);
                console.log('Parsed:', parsed);
                console.log('Keys:', Object.keys(parsed));
                if (parsed.positions) console.log('Positions:', parsed.positions);
                if (parsed.departments) console.log('Departments:', parsed.departments);
            } catch (e) {
                console.log('Parse error:', e.message);
            }
        } else if (typeof course.target_audience === 'object') {
            console.log('\n📝 Object keys:');
            console.log('Keys:', Object.keys(course.target_audience));
            console.log('Has positions?', 'positions' in course.target_audience);
            console.log('Has departments?', 'departments' in course.target_audience);
            if (course.target_audience.positions) {
                console.log('Positions:', course.target_audience.positions);
            }
            if (course.target_audience.departments) {
                console.log('Departments:', course.target_audience.departments);
            }
        }

        console.log('\n\n🔍 ตรวจสอบว่า Course มีข้อมูลอื่นที่เกี่ยวข้องหรือไม่:');
        const allKeys = Object.keys(course);
        const targetKeys = allKeys.filter(k =>
            k.includes('target') ||
            k.includes('position') ||
            k.includes('department') ||
            k.includes('audience')
        );
        console.log('Related keys:', targetKeys);
        targetKeys.forEach(key => {
            const value = course[key];
            const display = typeof value === 'string' && value.length > 100
                ? value.substring(0, 100) + '...'
                : JSON.stringify(value);
            console.log(`  ${key}: ${display}`);
        });

        // Check if there are separate position/department fields
        console.log('\n\n🔍 ตรวจสอบว่ามีฟิลด์แยกหรือไม่:');
        const posFields = allKeys.filter(k => k.toLowerCase().includes('position'));
        const deptFields = allKeys.filter(k => k.toLowerCase().includes('department'));
        console.log('Position fields:', posFields);
        console.log('Department fields:', deptFields);

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

checkTargetAudience();
