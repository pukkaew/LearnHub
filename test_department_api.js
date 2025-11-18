const fetch = require('node-fetch');

(async () => {
    try {
        const response = await fetch('http://localhost:3000/courses/api/target-departments');
        const departments = await response.json();

        console.log('\n📊 Department API Response:');
        console.log('Total departments:', departments.length);

        console.log('\n🔍 Looking for departments 1, 41, 48:');
        [1, 41, 48].forEach(id => {
            const dept = departments.find(d => d.unit_id === id);
            if (dept) {
                console.log(`  ✅ ID ${id}: ${dept.unit_name_th} (level_id: ${dept.level_id})`);
            } else {
                console.log(`  ❌ ID ${id}: NOT FOUND in API response`);
            }
        });

        console.log('\n📋 All departments with level_id = 1:');
        const level1 = departments.filter(d => d.level_id === 1);
        level1.forEach(d => {
            console.log(`  - ID ${d.unit_id}: ${d.unit_name_th}`);
        });

        if (level1.length === 0) {
            console.log('  ⚠️  No departments with level_id = 1 found!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();
