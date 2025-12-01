const { poolPromise, sql } = require('./config/database');

async function createUserMaterialProgressTable() {
    try {
        const pool = await poolPromise;

        // Check if table exists
        const tableCheck = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'user_material_progress'
        `);

        if (tableCheck.recordset.length > 0) {
            console.log('Table user_material_progress already exists');
            return;
        }

        // Create the table
        await pool.request().query(`
            CREATE TABLE user_material_progress (
                progress_id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                course_id INT NOT NULL,
                material_id INT NOT NULL,
                is_completed BIT DEFAULT 0,
                completed_at DATETIME NULL,
                time_spent_seconds INT DEFAULT 0,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_ump_user FOREIGN KEY (user_id) REFERENCES users(user_id),
                CONSTRAINT FK_ump_course FOREIGN KEY (course_id) REFERENCES courses(course_id),
                CONSTRAINT FK_ump_material FOREIGN KEY (material_id) REFERENCES course_materials(material_id),
                CONSTRAINT UQ_user_material UNIQUE (user_id, course_id, material_id)
            )
        `);

        console.log('Table user_material_progress created successfully');

        // Create index for faster queries
        await pool.request().query(`
            CREATE INDEX IX_ump_user_course ON user_material_progress(user_id, course_id)
        `);

        console.log('Index created successfully');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

createUserMaterialProgressTable();
