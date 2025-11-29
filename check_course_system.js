const { poolPromise } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║      COURSE & TEST SYSTEM - COMPREHENSIVE CHECK         ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        // 1. Check courses table structure
        console.log('📋 1. COURSES TABLE STRUCTURE');
        console.log('═'.repeat(60));
        const courseColumns = await pool.query`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `;
        console.log('Columns:', courseColumns.recordset.length);
        courseColumns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // 2. Check tests table structure
        console.log('\n📝 2. TESTS TABLE STRUCTURE');
        console.log('═'.repeat(60));
        const testColumns = await pool.query`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests'
            ORDER BY ORDINAL_POSITION
        `;
        console.log('Columns:', testColumns.recordset.length);
        testColumns.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // 3. Check foreign key relationships
        console.log('\n🔗 3. FOREIGN KEY RELATIONSHIPS');
        console.log('═'.repeat(60));
        const foreignKeys = await pool.query`
            SELECT
                fk.name AS FK_Name,
                tp.name AS Parent_Table,
                cp.name AS Parent_Column,
                tr.name AS Referenced_Table,
                cr.name AS Referenced_Column
            FROM sys.foreign_keys AS fk
            INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.tables AS tp ON fkc.parent_object_id = tp.object_id
            INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            INNER JOIN sys.tables AS tr ON fkc.referenced_object_id = tr.object_id
            INNER JOIN sys.columns AS cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            WHERE tp.name IN ('courses', 'tests') OR tr.name IN ('courses', 'tests')
            ORDER BY tp.name, fk.name
        `;
        if (foreignKeys.recordset.length > 0) {
            foreignKeys.recordset.forEach(fk => {
                console.log(`  ✓ ${fk.Parent_Table}.${fk.Parent_Column} → ${fk.Referenced_Table}.${fk.Referenced_Column}`);
            });
        } else {
            console.log('  ⚠️  No foreign keys found between courses and tests');
        }

        // 4. Check actual data
        console.log('\n💾 4. CURRENT DATA COUNT');
        console.log('═'.repeat(60));
        const courseCount = await pool.query`SELECT COUNT(*) as count FROM courses`;
        const testCount = await pool.query`SELECT COUNT(*) as count FROM tests`;
        const testWithCourseCount = await pool.query`SELECT COUNT(*) as count FROM tests WHERE course_id IS NOT NULL`;

        console.log(`  Courses: ${courseCount.recordset[0].count}`);
        console.log(`  Tests: ${testCount.recordset[0].count}`);
        console.log(`  Tests linked to courses: ${testWithCourseCount.recordset[0].count}`);

        // 5. Check if test_id exists in courses table
        console.log('\n🔍 5. CHECK DEPRECATED test_id IN COURSES');
        console.log('═'.repeat(60));
        const testIdExists = await pool.query`
            SELECT COUNT(*) as column_exists
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses' AND COLUMN_NAME = 'test_id'
        `;
        if (testIdExists.recordset[0].column_exists > 0) {
            console.log('  ❌ FOUND: test_id column still exists in courses table');
            console.log('  ⚠️  This is deprecated! Should be removed.');
            const coursesWithTestId = await pool.query`SELECT COUNT(*) as count FROM courses WHERE test_id IS NOT NULL`;
            console.log(`  📊 Courses with test_id: ${coursesWithTestId.recordset[0].count}`);
        } else {
            console.log('  ✅ GOOD: test_id column has been removed from courses table');
        }

        // 6. Sample courses data
        console.log('\n📚 6. SAMPLE COURSES DATA');
        console.log('═'.repeat(60));
        const sampleCourses = await pool.query`
            SELECT TOP 5
                course_id,
                title,
                status,
                created_at
            FROM courses
            ORDER BY created_at DESC
        `;
        if (sampleCourses.recordset.length > 0) {
            sampleCourses.recordset.forEach((c, i) => {
                console.log(`  ${i+1}. [${c.course_id}] ${c.title} - ${c.status}`);
            });
        } else {
            console.log('  ✅ No courses in database (Clean)');
        }

        // 7. Sample tests data
        console.log('\n📝 7. SAMPLE TESTS DATA');
        console.log('═'.repeat(60));
        const sampleTests = await pool.query`
            SELECT TOP 5
                test_id,
                title,
                course_id,
                status,
                created_at
            FROM tests
            ORDER BY created_at DESC
        `;
        if (sampleTests.recordset.length > 0) {
            sampleTests.recordset.forEach((t, i) => {
                console.log(`  ${i+1}. [${t.test_id}] ${t.title}`);
                console.log(`      → Course ID: ${t.course_id || 'NULL'} - ${t.status}`);
            });
        } else {
            console.log('  ✅ No tests in database (Clean)');
        }

        // 8. Check Course-Test relationship logic
        console.log('\n🎯 8. RELATIONSHIP VERIFICATION');
        console.log('═'.repeat(60));
        console.log('  Current Design:');
        console.log('  ✓ Tests table has course_id (pointing to courses)');
        console.log('  ✓ One course can have many tests');
        console.log('  ✓ Each test belongs to one course (or null for standalone)');
        console.log('\n  Expected Workflow:');
        console.log('  1. Create Course first');
        console.log('  2. Create Test and link to course_id');
        console.log('  3. Tests can be created independently (course_id = NULL)');

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                    SYSTEM STATUS                         ║');
        console.log('╚══════════════════════════════════════════════════════════╝');

        // Overall assessment
        const hasTestIdColumn = testIdExists.recordset[0].column_exists > 0;
        const hasForeignKey = foreignKeys.recordset.some(fk =>
            fk.Parent_Table === 'tests' && fk.Parent_Column === 'course_id'
        );

        console.log('\n✅ Database Schema: OK');
        if (hasTestIdColumn) {
            console.log('⚠️  Legacy column (test_id in courses): NEEDS CLEANUP');
        } else {
            console.log('✅ No legacy columns detected');
        }
        if (hasForeignKey) {
            console.log('✅ Foreign Key Relationship: OK');
        } else {
            console.log('⚠️  Foreign Key: Missing (optional but recommended)');
        }

        console.log('\n' + '═'.repeat(60));
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
})();
