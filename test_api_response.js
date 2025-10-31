const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('\n=== Testing API Endpoints ===\n');

        // Test 1: Get offices under branch 29
        console.log('1. GET /organization/api/offices?branch_id=29');
        const officesResponse = await fetch('http://localhost:3000/organization/api/offices?branch_id=29');
        const offices = await officesResponse.json();
        console.log('Response:', JSON.stringify(offices, null, 2));

        if (offices.length > 0) {
            const firstOffice = offices[0];
            console.log(`\n2. GET /organization/api/divisions?office_id=${firstOffice.office_id}`);
            const divisionsResponse = await fetch(`http://localhost:3000/organization/api/divisions?office_id=${firstOffice.office_id}`);
            const divisions = await divisionsResponse.json();
            console.log('Response:', JSON.stringify(divisions, null, 2));

            console.log(`\n3. GET /organization/api/departments?office_id=${firstOffice.office_id}`);
            const deptResponse = await fetch(`http://localhost:3000/organization/api/departments?office_id=${firstOffice.office_id}`);
            const departments = await deptResponse.json();
            console.log('Response:', JSON.stringify(departments, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAPI();
