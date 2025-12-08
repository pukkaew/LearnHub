const { poolPromise } = require('./config/database');

async function restoreCategories() {
    try {
        const pool = await poolPromise;

        console.log('=== Restoring Default Course Categories ===');

        // Default categories to insert
        const categories = [
            { name: 'การพัฒนาส่วนบุคคล', name_en: 'Personal Development', desc: 'หลักสูตรพัฒนาทักษะส่วนบุคคล', icon: 'fa-user-graduate', color: '#3B82F6', order: 1 },
            { name: 'ภาษา', name_en: 'Languages', desc: 'หลักสูตรภาษาต่างประเทศ', icon: 'fa-language', color: '#10B981', order: 2 },
            { name: 'เทคโนโลยี', name_en: 'Technology', desc: 'หลักสูตรเกี่ยวกับเทคโนโลยีและคอมพิวเตอร์', icon: 'fa-laptop-code', color: '#8B5CF6', order: 3 },
            { name: 'การจัดการ', name_en: 'Management', desc: 'หลักสูตรการบริหารและการจัดการ', icon: 'fa-tasks', color: '#F59E0B', order: 4 },
            { name: 'การตลาด', name_en: 'Marketing', desc: 'หลักสูตรการตลาดและการขาย', icon: 'fa-bullhorn', color: '#EF4444', order: 5 },
            { name: 'ความปลอดภัย', name_en: 'Safety', desc: 'หลักสูตรความปลอดภัยในการทำงาน', icon: 'fa-shield-alt', color: '#06B6D4', order: 6 },
            { name: 'การเงิน', name_en: 'Finance', desc: 'หลักสูตรการเงินและบัญชี', icon: 'fa-coins', color: '#84CC16', order: 7 },
            { name: 'ทักษะอาชีพ', name_en: 'Professional Skills', desc: 'หลักสูตรพัฒนาทักษะวิชาชีพ', icon: 'fa-briefcase', color: '#EC4899', order: 8 }
        ];

        for (const cat of categories) {
            await pool.request()
                .input('category_name', cat.name)
                .input('category_name_en', cat.name_en)
                .input('description', cat.desc)
                .input('category_icon', cat.icon)
                .input('category_color', cat.color)
                .input('display_order', cat.order)
                .input('is_active', true)
                .query(`
                    INSERT INTO CourseCategories (
                        category_name, category_name_en, description,
                        category_icon, category_color, display_order, is_active, created_at
                    ) VALUES (
                        @category_name, @category_name_en, @description,
                        @category_icon, @category_color, @display_order, @is_active, GETDATE()
                    )
                `);
            console.log(`Added: ${cat.name}`);
        }

        console.log('\n=== Categories restored successfully! ===');

        // Verify
        const result = await pool.request()
            .query('SELECT category_id, category_name FROM CourseCategories ORDER BY display_order');

        console.log('\nCategories in DB now:');
        result.recordset.forEach((cat, i) => {
            console.log(`${i + 1}. ${cat.category_name} (ID: ${cat.category_id})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

restoreCategories();
