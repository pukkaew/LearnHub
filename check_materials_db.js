const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'Tit@5562',
    server: 'localhost',
    database: 'LearnHub',
    options: { encrypt: false, trustServerCertificate: true }
};

sql.connect(config).then(async pool => {
    const result = await pool.request().query(`
        SELECT material_id, title, type, material_type, file_path, file_url
        FROM course_materials
        WHERE course_id = 1
        ORDER BY order_index
    `);
    console.log('Course 1 Materials:');
    result.recordset.forEach(m => {
        console.log(`  ID: ${m.material_id}, type: ${m.type}, material_type: ${m.material_type}, title: ${m.title}`);
        console.log(`    file_path: ${m.file_path || '(none)'}`);
    });
    sql.close();
}).catch(err => console.error(err));
