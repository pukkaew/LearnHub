const fs = require('fs');
const filePath = 'D:/App/LearnHub/controllers/courseController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the getCourseMaterials function
const oldPattern = /\/\/ Get course materials \(all types for content page\)\s+async getCourseMaterials\(req, res\) \{\s+try \{\s+const \{ course_id \} = req\.params;\s+const pool = await poolPromise;\s+\/\/ Get all materials for content page using SELECT \*\s+const result = await pool\.request\(\)\s+\.input\('courseId', sql\.Int, parseInt\(course_id\)\)\s+\.query\(`\s+SELECT \*\s+FROM course_materials\s+WHERE course_id = @courseId\s+ORDER BY order_index\s+`\);\s+const materials = result\.recordset\.map\(m => \(\{\s+material_id: m\.material_id,\s+title: m\.title,\s+description: m\.description \|\| m\.content \|\| '',\s+content: m\.content \|\| '',\s+material_type: m\.type \|\| m\.material_type \|\| 'text',\s+file_type: m\.type \|\| m\.material_type \|\| 'text',\s+file_url: m\.file_path \|\| m\.video_url \|\| m\.file_url \|\| '',\s+video_url: m\.video_url \|\| m\.file_path \|\| m\.file_url \|\| '',\s+file_size: m\.file_size \|\| 0,\s+mime_type: m\.mime_type \|\| '',\s+duration: m\.duration_minutes \? `\$\{m\.duration_minutes\} นาที` : \(m\.duration \|\| ''\),\s+is_downloadable: m\.is_downloadable !== false,\s+is_completed: false,\s+progress_percentage: 0\s+\}\)\);/;

const newCode = `// Get course materials (all types for content page)
    async getCourseMaterials(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Get all materials with user's progress
            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .input('userId', sql.Int, userId)
                .query(\`
                    SELECT cm.*,
                           ISNULL(ump.is_completed, 0) as user_completed,
                           ump.completed_at,
                           ump.time_spent_seconds
                    FROM course_materials cm
                    LEFT JOIN user_material_progress ump
                        ON cm.material_id = ump.material_id
                        AND cm.course_id = ump.course_id
                        AND ump.user_id = @userId
                    WHERE cm.course_id = @courseId
                    ORDER BY cm.order_index
                \`);

            const materials = result.recordset.map(m => ({
                material_id: m.material_id,
                title: m.title,
                description: m.description || m.content || '',
                content: m.content || '',
                material_type: m.type || m.material_type || 'text',
                file_type: m.type || m.material_type || 'text',
                file_url: m.file_path || m.video_url || m.file_url || '',
                video_url: m.video_url || m.file_path || m.file_url || '',
                file_size: m.file_size || 0,
                mime_type: m.mime_type || '',
                duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),
                is_downloadable: m.is_downloadable !== false,
                is_completed: m.user_completed === true || m.user_completed === 1,
                completed_at: m.completed_at,
                time_spent_seconds: m.time_spent_seconds || 0,
                progress_percentage: m.user_completed ? 100 : 0
            }));`;

if (content.includes('is_completed: false,')) {
    // Simple string replacement approach
    content = content.replace(
        `// Get all materials for content page using SELECT *
            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .query(\`
                    SELECT *
                    FROM course_materials
                    WHERE course_id = @courseId
                    ORDER BY order_index
                \`);

            const materials = result.recordset.map(m => ({
                material_id: m.material_id,
                title: m.title,
                description: m.description || m.content || '',
                content: m.content || '',
                material_type: m.type || m.material_type || 'text',
                file_type: m.type || m.material_type || 'text',
                file_url: m.file_path || m.video_url || m.file_url || '',
                video_url: m.video_url || m.file_path || m.file_url || '',
                file_size: m.file_size || 0,
                mime_type: m.mime_type || '',
                duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),
                is_downloadable: m.is_downloadable !== false,
                is_completed: false,
                progress_percentage: 0
            }));`,
        `const userId = req.user.user_id;

            // Get all materials with user's progress
            const result = await pool.request()
                .input('courseId', sql.Int, parseInt(course_id))
                .input('userId', sql.Int, userId)
                .query(\`
                    SELECT cm.*,
                           ISNULL(ump.is_completed, 0) as user_completed,
                           ump.completed_at,
                           ump.time_spent_seconds
                    FROM course_materials cm
                    LEFT JOIN user_material_progress ump
                        ON cm.material_id = ump.material_id
                        AND cm.course_id = ump.course_id
                        AND ump.user_id = @userId
                    WHERE cm.course_id = @courseId
                    ORDER BY cm.order_index
                \`);

            const materials = result.recordset.map(m => ({
                material_id: m.material_id,
                title: m.title,
                description: m.description || m.content || '',
                content: m.content || '',
                material_type: m.type || m.material_type || 'text',
                file_type: m.type || m.material_type || 'text',
                file_url: m.file_path || m.video_url || m.file_url || '',
                video_url: m.video_url || m.file_path || m.file_url || '',
                file_size: m.file_size || 0,
                mime_type: m.mime_type || '',
                duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),
                is_downloadable: m.is_downloadable !== false,
                is_completed: m.user_completed === true || m.user_completed === 1,
                completed_at: m.completed_at,
                time_spent_seconds: m.time_spent_seconds || 0,
                progress_percentage: m.user_completed ? 100 : 0
            }));`
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('File updated successfully');
} else {
    console.log('Pattern not found or already updated');
}
