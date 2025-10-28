// Test script to check API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAPIs() {
    console.log('Testing Organization API Endpoints...\n');

    try {
        // Test 1: Branches
        console.log('=== Test 1: GET /organization/api/branches ===');
        const branchesRes = await fetch(`${BASE_URL}/organization/api/branches`, {
            headers: { 'Cookie': 'connect.sid=test' }
        });
        const branchesData = await branchesRes.json();
        console.log('Status:', branchesRes.status);
        console.log('Response:', JSON.stringify(branchesData, null, 2));

        // Test 2: Offices
        console.log('\n=== Test 2: GET /organization/api/offices ===');
        const officesRes = await fetch(`${BASE_URL}/organization/api/offices`);
        const officesData = await officesRes.json();
        console.log('Status:', officesRes.status);
        console.log('Response:', JSON.stringify(officesData, null, 2));

        // Test 3: Divisions
        console.log('\n=== Test 3: GET /organization/api/divisions ===');
        const divisionsRes = await fetch(`${BASE_URL}/organization/api/divisions`);
        const divisionsData = await divisionsRes.json();
        console.log('Status:', divisionsRes.status);
        console.log('Response:', JSON.stringify(divisionsData, null, 2));

        // Test 4: Departments
        console.log('\n=== Test 4: GET /organization/api/departments ===');
        const deptsRes = await fetch(`${BASE_URL}/organization/api/departments`);
        const deptsData = await deptsRes.json();
        console.log('Status:', deptsRes.status);
        console.log('Response:', JSON.stringify(deptsData, null, 2));

        // Test 5: Positions
        console.log('\n=== Test 5: GET /organization/api/positions ===');
        const positionsRes = await fetch(`${BASE_URL}/organization/api/positions`);
        const positionsData = await positionsRes.json();
        console.log('Status:', positionsRes.status);
        console.log('Response:', JSON.stringify(positionsData, null, 2));

        console.log('\n✅ All API tests completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPIs();
