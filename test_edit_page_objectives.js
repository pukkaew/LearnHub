// Test to debug learning objectives on edit page
const { poolPromise, sql } = require('./config/database');

async function testEditPageObjectives() {
    try {
        const pool = await poolPromise;

        // Get a course to test
        const result = await pool.request()
            .query('SELECT TOP 1 course_id, title, learning_objectives FROM courses ORDER BY course_id DESC');

        if (result.recordset.length === 0) {
            console.log('No courses found');
            process.exit(0);
        }

        const course = result.recordset[0];
        console.log('=== RAW DATABASE DATA ===');
        console.log('Course ID:', course.course_id);
        console.log('Title:', course.title);
        console.log('learning_objectives (raw):', course.learning_objectives);
        console.log('Type:', typeof course.learning_objectives);

        // Simulate what Course.findById does (lines 99-108)
        console.log('\n=== AFTER Course.findById PROCESSING ===');
        let processedObjectives;
        try {
            if (course.learning_objectives && typeof course.learning_objectives === 'string') {
                processedObjectives = JSON.parse(course.learning_objectives);
                console.log('Parsed from string:', processedObjectives);
            } else if (!course.learning_objectives) {
                processedObjectives = [];
                console.log('Was null/undefined, set to empty array:', processedObjectives);
            } else {
                processedObjectives = course.learning_objectives;
                console.log('Already parsed:', processedObjectives);
            }
        } catch (e) {
            processedObjectives = [];
            console.log('Parse error, set to empty array:', processedObjectives);
        }

        console.log('Final learning_objectives:', processedObjectives);
        console.log('Is Array:', Array.isArray(processedObjectives));
        console.log('Length:', processedObjectives.length);

        // Simulate what populateForm does (lines 578-598)
        console.log('\n=== SIMULATING populateForm() ===');
        console.log('Line 583: if (course.learning_objectives || course.objectives)');
        console.log('  course.learning_objectives:', processedObjectives);
        console.log('  Truthy check:', !!processedObjectives);

        if (processedObjectives || undefined) {
            const objectives = processedObjectives || undefined;
            console.log('✓ Entered if block');
            console.log('  objectives =', objectives);

            const objectivesArray = typeof objectives === 'string' ? JSON.parse(objectives) : objectives;
            console.log('  objectivesArray =', objectivesArray);
            console.log('  Is Array:', Array.isArray(objectivesArray));
            console.log('  Length:', objectivesArray ? objectivesArray.length : 'N/A');

            console.log('\nLine 588: if (Array.isArray(objectivesArray) && objectivesArray.length > 0)');
            if (Array.isArray(objectivesArray) && objectivesArray.length > 0) {
                console.log('✓ Would call: objectivesArray.forEach(obj => addObjective(obj))');
                console.log('  Would add', objectivesArray.length, 'objectives:', objectivesArray);
            } else {
                console.log('✓ ELSE: Should call addObjective(\'\')');
                console.log('  Expected console output: "⚠️ Learning objectives is empty array, adding default objective"');
                console.log('  Expected console output: "🎯 addObjective called: { value: \'\', objectiveCount: 1, containerExists: true }"');
                console.log('  Expected result: ONE EMPTY INPUT FIELD SHOULD APPEAR');
            }
        } else {
            console.log('✗ Did NOT enter if block - THIS IS THE BUG!');
        }

        console.log('\n=== CRITICAL ANALYSIS ===');
        console.log('Empty array [] is truthy in JavaScript:', !![]);
        console.log('So the code SHOULD enter the if block and call addObjective()');
        console.log('\nPOSSIBLE ISSUES:');
        console.log('1. Is objectives-container element present in DOM when populateForm runs?');
        console.log('2. Is addObjective() function defined before populateForm is called?');
        console.log('3. Are there any JavaScript errors preventing execution?');
        console.log('4. Is populateForm actually being called?');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

testEditPageObjectives();
