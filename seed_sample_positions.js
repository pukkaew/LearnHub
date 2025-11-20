const { poolPromise, sql } = require('./config/database');

async function seedSamplePositions() {
    try {
        const pool = await poolPromise;
        console.log('🔌 Connected to database\n');

        // Sample positions for different departments
        // department_id = 1 (default for all), position_type = 'EMPLOYEE' (only allowed value)
        const positions = [
            // สำนักงานใหญ่ (unit_id: 41)
            { name: 'CEO', unit_id: 41, department_id: 1, level: 1, position_type: 'EMPLOYEE' },
            { name: 'CFO', unit_id: 41, department_id: 1, level: 1, position_type: 'EMPLOYEE' },
            { name: 'COO', unit_id: 41, department_id: 1, level: 1, position_type: 'EMPLOYEE' },
            { name: 'HR Manager', unit_id: 41, department_id: 1, level: 2, position_type: 'EMPLOYEE' },
            { name: 'Finance Manager', unit_id: 41, department_id: 1, level: 2, position_type: 'EMPLOYEE' },

            // รักชัย (unit_id: 42)
            { name: 'Branch Manager (RC)', unit_id: 42, department_id: 1, level: 2, position_type: 'EMPLOYEE' },
            { name: 'Sales Supervisor (RC)', unit_id: 42, department_id: 1, level: 3, position_type: 'EMPLOYEE' },
            { name: 'Sales Officer (RC)', unit_id: 42, department_id: 1, level: 4, position_type: 'EMPLOYEE' },

            // สินชัย (unit_id: 43)
            { name: 'Branch Manager (SC)', unit_id: 43, department_id: 1, level: 2, position_type: 'EMPLOYEE' },
            { name: 'Warehouse Supervisor', unit_id: 43, department_id: 1, level: 3, position_type: 'EMPLOYEE' },
            { name: 'Warehouse Officer', unit_id: 43, department_id: 1, level: 4, position_type: 'EMPLOYEE' },

            // สำนักปฎิบัติการ (unit_id: 47)
            { name: 'Operations Manager', unit_id: 47, department_id: 1, level: 2, position_type: 'EMPLOYEE' },
            { name: 'Operations Officer', unit_id: 47, department_id: 1, level: 3, position_type: 'EMPLOYEE' },

            // พัฒนาองค์กร (unit_id: 46)
            { name: 'OD Manager', unit_id: 46, department_id: 1, level: 2, position_type: 'EMPLOYEE' },
            { name: 'Training Officer', unit_id: 46, department_id: 1, level: 3, position_type: 'EMPLOYEE' },

            // เทคโนโลยีสารสนเทศ (unit_id: 48)
            { name: 'IT Officer', unit_id: 48, department_id: 1, level: 3, position_type: 'EMPLOYEE' },
            { name: 'System Analyst', unit_id: 48, department_id: 1, level: 3, position_type: 'EMPLOYEE' },
            { name: 'Developer', unit_id: 48, department_id: 1, level: 4, position_type: 'EMPLOYEE' },
        ];

        console.log(`📝 Preparing to insert ${positions.length} positions\n`);

        let insertedCount = 0;
        let skippedCount = 0;

        for (const pos of positions) {
            try {
                // Check if position already exists
                const existing = await pool.request()
                    .input('name', sql.NVarChar(100), pos.name)
                    .input('unitId', sql.Int, pos.unit_id)
                    .query('SELECT position_id FROM positions WHERE position_name = @name AND unit_id = @unitId');

                if (existing.recordset.length > 0) {
                    console.log(`⏭️  Skipped: ${pos.name} (already exists)`);
                    skippedCount++;
                    continue;
                }

                // Insert new position
                await pool.request()
                    .input('name', sql.NVarChar(100), pos.name)
                    .input('unitId', sql.Int, pos.unit_id)
                    .input('departmentId', sql.Int, pos.department_id)
                    .input('level', sql.Int, pos.level)
                    .input('positionType', sql.NVarChar(50), pos.position_type)
                    .query(`
                        INSERT INTO positions (position_name, unit_id, department_id, level, position_type, is_active, created_at)
                        VALUES (@name, @unitId, @departmentId, @level, @positionType, 1, GETDATE())
                    `);

                insertedCount++;
                console.log(`✅ Added: ${pos.name} → unit_id: ${pos.unit_id} (level: ${pos.level})`);

            } catch (err) {
                console.error(`❌ Failed to insert ${pos.name}:`, err.message);
            }
        }

        console.log('\n═══════════════════════════════════════');
        console.log('📊 Summary:');
        console.log(`   Total positions: ${positions.length}`);
        console.log(`   Inserted:        ${insertedCount}`);
        console.log(`   Skipped:         ${skippedCount}`);
        console.log('═══════════════════════════════════════');

        if (insertedCount > 0) {
            console.log('\n🎉 Sample positions added successfully!');
            console.log('💡 Refresh your course creation page to see all positions');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

seedSamplePositions();
