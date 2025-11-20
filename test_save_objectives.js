const { poolPromise, sql } = require('./config/database');

async function testSaveObjectives() {
    try {
        const pool = await poolPromise;
        console.log('🔌 Connected to database\n');

        // Test data
        const testObjectives = ["วัตถุประสงค์ 1", "วัตถุประสงค์ 2", "วัตถุประสงค์ 3"];
        const jsonString = JSON.stringify(testObjectives);

        console.log('📝 Original data:');
        console.log('   Array:', testObjectives);
        console.log('   JSON string:', jsonString);
        console.log('   Type:', typeof jsonString);
        console.log('');

        // Test INSERT
        console.log('🧪 Test 1: INSERT with JSON.stringify');
        const insertResult = await pool.request()
            .input('title', sql.NVarChar(255), 'Test Save Objectives')
            .input('code', sql.NVarChar(20), 'TEST-SAVE-OBJ')
            .input('description', sql.NVarChar(sql.MAX), 'Test description')
            .input('category', sql.NVarChar(100), 'Test Category')
            .input('instructorId', sql.Int, 17)
            .input('learningObjectives', sql.NVarChar(sql.MAX), jsonString)
            .query(`
                INSERT INTO courses (
                    title, course_code, description, category,
                    instructor_id, learning_objectives, status, created_at
                )
                OUTPUT INSERTED.course_id
                VALUES (
                    @title, @code, @description, @category,
                    @instructorId, @learningObjectives, 'Draft', GETDATE()
                )
            `);

        const courseId = insertResult.recordset[0].course_id;
        console.log('✅ Inserted course_id:', courseId);

        // Read back
        const selectResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query('SELECT learning_objectives FROM courses WHERE course_id = @courseId');

        const savedData = selectResult.recordset[0].learning_objectives;
        console.log('');
        console.log('📖 Data read from database:');
        console.log('   Raw:', savedData);
        console.log('   Type:', typeof savedData);
        console.log('   Length:', savedData.length);
        console.log('   Contains &quot;:', savedData.includes('&quot;'));
        console.log('   Contains ":', savedData.includes('"'));
        console.log('');

        // Try to parse
        try {
            const parsed = JSON.parse(savedData);
            console.log('✅ JSON.parse() SUCCESS');
            console.log('   Parsed:', parsed);
        } catch (err) {
            console.log('❌ JSON.parse() FAILED');
            console.log('   Error:', err.message);

            // Try with decoding
            const decoded = savedData
                .replace(/&quot;/g, '"')
                .replace(/&#34;/g, '"');

            console.log('');
            console.log('🔧 After decoding:');
            console.log('   Decoded:', decoded);

            try {
                const parsedDecoded = JSON.parse(decoded);
                console.log('✅ JSON.parse() with decoding SUCCESS');
                console.log('   Parsed:', parsedDecoded);
            } catch (err2) {
                console.log('❌ JSON.parse() with decoding FAILED');
                console.log('   Error:', err2.message);
            }
        }

        // Cleanup
        await pool.request()
            .input('courseId', sql.Int, courseId)
            .query('DELETE FROM courses WHERE course_id = @courseId');

        console.log('');
        console.log('🧹 Test course deleted');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

testSaveObjectives();
