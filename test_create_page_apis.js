const fetch = require('node-fetch');

(async () => {
    try {
        console.log('\n🔍 Testing Create Course Page APIs...\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Test positions API
        console.log('1️⃣ Testing /courses/api/target-positions');
        try {
            const posResponse = await fetch('http://localhost:3000/courses/api/target-positions');
            const posData = await posResponse.json();

            if (posData.success && posData.data) {
                console.log(`   ✅ Success! Got ${posData.data.length} positions`);
                console.log('   First 3 positions:');
                posData.data.slice(0, 3).forEach(p => {
                    console.log(`      - ID ${p.position_id}: ${p.position_name}`);
                });
            } else {
                console.log('   ❌ Failed:', posData.message || 'Unknown error');
            }
        } catch (e) {
            console.log('   ❌ Error:', e.message);
        }

        console.log('\n2️⃣ Testing /courses/api/target-departments');
        try {
            const deptResponse = await fetch('http://localhost:3000/courses/api/target-departments');
            const deptData = await deptResponse.json();

            if (deptData.success && deptData.data) {
                console.log(`   ✅ Success! Got ${deptData.data.length} departments`);
                console.log('   First 3 departments:');
                deptData.data.slice(0, 3).forEach(d => {
                    console.log(`      - ID ${d.unit_id}: ${d.unit_name_th} (level_id: ${d.level_id})`);
                });
            } else {
                console.log('   ❌ Failed:', deptData.message || 'Unknown error');
            }
        } catch (e) {
            console.log('   ❌ Error:', e.message);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Check if "ผู้จัดการฝ่ายสารสนเทศ" exists
        console.log('🔎 Searching for "ผู้จัดการฝ่ายสารสนเทศ"...\n');

        const posResponse = await fetch('http://localhost:3000/courses/api/target-positions');
        const posData = await posResponse.json();

        if (posData.success && posData.data) {
            const found = posData.data.find(p =>
                p.position_name && p.position_name.includes('ผู้จัดการฝ่ายสารสนเทศ')
            );

            if (found) {
                console.log(`✅ Found! ID: ${found.position_id}, Name: ${found.position_name}`);
            } else {
                console.log('❌ NOT FOUND!');
                console.log('\nAll positions containing "ผู้จัดการ":');
                const managers = posData.data.filter(p =>
                    p.position_name && p.position_name.includes('ผู้จัดการ')
                );
                managers.forEach(m => {
                    console.log(`   - ID ${m.position_id}: ${m.position_name}`);
                });
            }
        }

        console.log('\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
