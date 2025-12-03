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

            // Calculate and update overall course progress (only count required materials)
            const progressResult = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId AND is_required = 1) as total_materials,
                        (SELECT COUNT(*) FROM user_material_progress ump
                         INNER JOIN course_materials cm ON ump.material_id = cm.material_id
                         WHERE ump.user_id = @userId AND ump.course_id = @courseId AND ump.is_completed = 1 AND cm.is_required = 1) as completed_materials
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
                    SELECT material_id, is_completed, completed_at, time_spent_seconds,
                           video_progress_percent, video_last_position
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
    },

    // Get single material progress
    async getSingleMaterialProgress(req, res) {
        try {
            const { course_id, material_id } = req.params;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('materialId', sql.Int, parseInt(material_id))
                .query(`
                    SELECT material_id, is_completed, completed_at, time_spent_seconds,
                           video_progress_percent, video_last_position
                    FROM user_material_progress
                    WHERE user_id = @userId AND course_id = @courseId AND material_id = @materialId
                `);

            // Get material requirements (from course_materials)
            const materialInfo = await pool.request()
                .input('materialId', sql.Int, parseInt(material_id))
                .query(`
                    SELECT min_video_percent, min_time_seconds
                    FROM course_materials
                    WHERE material_id = @materialId
                `);

            const progress = result.recordset[0] || {
                video_progress_percent: 0,
                time_spent_seconds: 0,
                is_completed: false
            };

            const requirements = materialInfo.recordset[0] || {
                min_video_percent: 80,
                min_time_seconds: 0
            };

            const canComplete =
                (progress.video_progress_percent || 0) >= (requirements.min_video_percent || 80) &&
                (progress.time_spent_seconds || 0) >= (requirements.min_time_seconds || 0);

            res.json({
                success: true,
                data: {
                    ...progress,
                    requirements: {
                        video: {
                            required: true,
                            minimum: requirements.min_video_percent || 80,
                            current: progress.video_progress_percent || 0,
                            met: (progress.video_progress_percent || 0) >= (requirements.min_video_percent || 80)
                        },
                        time: {
                            required: (requirements.min_time_seconds || 0) > 0,
                            minimum: requirements.min_time_seconds || 0,
                            current: progress.time_spent_seconds || 0,
                            met: (progress.time_spent_seconds || 0) >= (requirements.min_time_seconds || 0)
                        }
                    },
                    canComplete,
                    is_completed: progress.is_completed || false
                }
            });
        } catch (error) {
            console.error('Get single material progress error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Track time spent on material
    async trackTime(req, res) {
        try {
            const { course_id, material_id } = req.params;
            const { seconds } = req.body;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Upsert time tracking
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('materialId', sql.Int, parseInt(material_id))
                .input('seconds', sql.Int, seconds || 0)
                .query(`
                    MERGE user_material_progress AS target
                    USING (SELECT @userId as user_id, @courseId as course_id, @materialId as material_id) AS source
                    ON target.user_id = source.user_id AND target.course_id = source.course_id AND target.material_id = source.material_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            time_spent_seconds = ISNULL(time_spent_seconds, 0) + @seconds,
                            updated_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (user_id, course_id, material_id, time_spent_seconds)
                        VALUES (@userId, @courseId, @materialId, @seconds);
                `);

            res.json({ success: true, message: 'Time tracked' });
        } catch (error) {
            console.error('Track time error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Track video progress
    async trackVideoProgress(req, res) {
        try {
            const { course_id, material_id } = req.params;
            const { progress_percent, current_position } = req.body;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Upsert video progress (only update if new progress is higher)
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('materialId', sql.Int, parseInt(material_id))
                .input('progressPercent', sql.Decimal(5, 2), progress_percent || 0)
                .input('currentPosition', sql.Int, current_position || 0)
                .query(`
                    MERGE user_material_progress AS target
                    USING (SELECT @userId as user_id, @courseId as course_id, @materialId as material_id) AS source
                    ON target.user_id = source.user_id AND target.course_id = source.course_id AND target.material_id = source.material_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            video_progress_percent = CASE
                                WHEN @progressPercent > ISNULL(video_progress_percent, 0) THEN @progressPercent
                                ELSE video_progress_percent
                            END,
                            video_last_position = @currentPosition,
                            updated_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (user_id, course_id, material_id, video_progress_percent, video_last_position)
                        VALUES (@userId, @courseId, @materialId, @progressPercent, @currentPosition);
                `);

            // Get updated progress
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .input('materialId', sql.Int, parseInt(material_id))
                .query(`
                    SELECT video_progress_percent FROM user_material_progress
                    WHERE user_id = @userId AND course_id = @courseId AND material_id = @materialId
                `);

            res.json({
                success: true,
                data: result.recordset[0] || { video_progress_percent: progress_percent }
            });
        } catch (error) {
            console.error('Track video progress error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = materialProgressController;
