const { poolPromise, sql } = require('../config/database');

const materialProgressController = {
    // Mark material as complete
    async markMaterialComplete(req, res) {
        try {
            const { course_id, material_id } = req.params;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Check if user is enrolled in the course
            const enrollment = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT enrollment_id FROM user_courses
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            if (enrollment.recordset.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: req.t ? req.t('notEnrolledInCourse') : 'Not enrolled in this course'
                });
            }

            // Check if progress record exists
            const existingProgress = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('materialId', sql.Int, parseInt(material_id))
                .query(`
                    SELECT progress_id, is_completed FROM user_material_progress
                    WHERE user_id = @userId AND course_id = @courseId AND material_id = @materialId
                `);

            if (existingProgress.recordset.length > 0) {
                // Update existing record
                await pool.request()
                    .input('progressId', sql.Int, existingProgress.recordset[0].progress_id)
                    .query(`
                        UPDATE user_material_progress
                        SET is_completed = 1, completed_at = GETDATE(), updated_at = GETDATE()
                        WHERE progress_id = @progressId
                    `);
            } else {
                // Insert new record
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('courseId', sql.Int, parseInt(course_id))
                    .input('materialId', sql.Int, parseInt(material_id))
                    .query(`
                        INSERT INTO user_material_progress (user_id, course_id, material_id, is_completed, completed_at)
                        VALUES (@userId, @courseId, @materialId, 1, GETDATE())
                    `);
            }

            // Calculate and update overall course progress
            const progressResult = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId) as total_materials,
                        (SELECT COUNT(*) FROM user_material_progress WHERE user_id = @userId AND course_id = @courseId AND is_completed = 1) as completed_materials
                `);

            const { total_materials, completed_materials } = progressResult.recordset[0];
            const progressPercentage = total_materials > 0 ? Math.round((completed_materials / total_materials) * 100) : 0;

            // Update enrollment progress
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('progress', sql.Decimal(5, 2), progressPercentage)
                .query(`
                    UPDATE user_courses
                    SET progress = @progress,
                        status = CASE WHEN @progress >= 100 THEN 'completed' ELSE 'active' END,
                        completion_date = CASE WHEN @progress >= 100 AND completion_date IS NULL THEN GETDATE() ELSE completion_date END,
                        last_access_date = GETDATE()
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            res.json({
                success: true,
                message: req.t ? req.t('materialMarkedComplete') : 'Material marked as complete',
                data: {
                    progress_percentage: progressPercentage,
                    completed_materials,
                    total_materials
                }
            });
        } catch (error) {
            console.error('Mark material complete error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get user's material progress for a course
    async getMaterialProgress(req, res) {
        try {
            const { course_id } = req.params;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT material_id, is_completed, completed_at, time_spent_seconds
                    FROM user_material_progress
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            res.json({
                success: true,
                data: result.recordset
            });
        } catch (error) {
            console.error('Get material progress error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = materialProgressController;
