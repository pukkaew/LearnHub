const Lesson = require('../models/Lesson');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');
const { poolPromise, sql } = require('../config/database');

const lessonController = {
    // Render lesson management page for a chapter
    async renderLessonManagement(req, res) {
        try {
            const { chapter_id } = req.params;
            const chapter = await Chapter.findById(parseInt(chapter_id));

            if (!chapter) {
                return res.status(404).render('error/404', {
                    message: req.t('chapterNotFound')
                });
            }

            const course = await Course.findById(chapter.course_id);
            if (!course) {
                return res.status(404).render('error/404', {
                    message: req.t('courseNotFound')
                });
            }

            // Check if user has permission
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).render('error/403', {
                    message: req.t('noPermissionManageLessons')
                });
            }

            res.render('lessons/index', {
                title: req.t('manageLessons'),
                chapter: chapter,
                course: course,
                user: req.user,
                t: req.t
            });
        } catch (error) {
            console.error('Render lesson management error:', error);
            res.status(500).render('error/500', {
                message: req.t('errorLoadingLessons')
            });
        }
    },

    // Get all lessons for a chapter
    async getLessonsByChapter(req, res) {
        try {
            const { chapter_id } = req.params;
            const lessons = await Lesson.findByChapterId(parseInt(chapter_id));

            res.json({
                success: true,
                data: lessons
            });
        } catch (error) {
            console.error('Get lessons error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingLessons'),
                error: error.message
            });
        }
    },

    // Get single lesson by ID
    async getLessonById(req, res) {
        try {
            const { lesson_id } = req.params;
            const lesson = await Lesson.findById(parseInt(lesson_id));

            if (!lesson) {
                return res.status(404).json({
                    success: false,
                    message: req.t('lessonNotFound')
                });
            }

            res.json({
                success: true,
                data: lesson
            });
        } catch (error) {
            console.error('Get lesson error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingLesson'),
                error: error.message
            });
        }
    },

    // Create new lesson
    async createLesson(req, res) {
        try {
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionCreateLesson')
                });
            }

            // Check if user has permission for this chapter's course
            const chapter = await Chapter.findById(req.body.chapter_id);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: req.t('chapterNotFound')
                });
            }

            const course = await Course.findById(chapter.course_id);
            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionManageLessons')
                });
            }

            const lessonData = {
                chapter_id: req.body.chapter_id,
                title: req.body.title,
                description: req.body.description || null,
                content_type: req.body.content_type || null,
                content: req.body.content || null,
                video_url: req.body.video_url || null,
                video_duration: req.body.video_duration || null,
                order_index: req.body.order_index || 0,
                duration_minutes: req.body.duration_minutes || null,
                is_required: req.body.is_required || false,
                is_preview: req.body.is_preview || false,
                is_published: req.body.is_published || false
            };

            const result = await Lesson.create(lessonData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.logDataChange(
                userId,
                'Create',
                'lessons',
                result.data.lesson_id,
                null,
                lessonData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created lesson: ${lessonData.title}`
            );

            res.status(201).json({
                success: true,
                message: req.t('lessonCreatedSuccess'),
                data: result.data
            });
        } catch (error) {
            console.error('Create lesson error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorCreatingLesson'),
                error: error.message
            });
        }
    },

    // Update lesson
    async updateLesson(req, res) {
        try {
            const { lesson_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            // Get existing lesson
            const lesson = await Lesson.findById(parseInt(lesson_id));
            if (!lesson) {
                return res.status(404).json({
                    success: false,
                    message: req.t('lessonNotFound')
                });
            }

            // Check chapter/course permission
            const chapter = await Chapter.findById(lesson.chapter_id);
            const course = await Course.findById(chapter.course_id);

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditLesson')
                });
            }

            const updateData = {};
            if (req.body.title !== undefined) updateData.title = req.body.title;
            if (req.body.description !== undefined) updateData.description = req.body.description;
            if (req.body.content_type !== undefined) updateData.content_type = req.body.content_type;
            if (req.body.content !== undefined) updateData.content = req.body.content;
            if (req.body.video_url !== undefined) updateData.video_url = req.body.video_url;
            if (req.body.video_duration !== undefined) updateData.video_duration = req.body.video_duration;
            if (req.body.order_index !== undefined) updateData.order_index = req.body.order_index;
            if (req.body.duration_minutes !== undefined) updateData.duration_minutes = req.body.duration_minutes;
            if (req.body.is_required !== undefined) updateData.is_required = req.body.is_required;
            if (req.body.is_preview !== undefined) updateData.is_preview = req.body.is_preview;
            if (req.body.is_published !== undefined) updateData.is_published = req.body.is_published;

            const result = await Lesson.update(lesson_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.logDataChange(
                userId,
                'Update',
                'lessons',
                lesson_id,
                lesson,
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated lesson: ${updateData.title || lesson.title}`
            );

            res.json({
                success: true,
                message: req.t('lessonUpdatedSuccess'),
                data: result.data
            });
        } catch (error) {
            console.error('Update lesson error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingLesson'),
                error: error.message
            });
        }
    },

    // Delete lesson
    async deleteLesson(req, res) {
        try {
            const { lesson_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            // Get existing lesson
            const lesson = await Lesson.findById(parseInt(lesson_id));
            if (!lesson) {
                return res.status(404).json({
                    success: false,
                    message: req.t('lessonNotFound')
                });
            }

            // Check chapter/course permission
            const chapter = await Chapter.findById(lesson.chapter_id);
            const course = await Course.findById(chapter.course_id);

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionDeleteLesson')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionDeleteLesson')
                });
            }

            const result = await Lesson.delete(lesson_id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.logDataChange(
                userId,
                'Delete',
                'lessons',
                lesson_id,
                lesson,
                null,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Deleted lesson: ${lesson.title}`
            );

            res.json({
                success: true,
                message: req.t('lessonDeletedSuccess')
            });
        } catch (error) {
            console.error('Delete lesson error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorDeletingLesson'),
                error: error.message
            });
        }
    },

    // Reorder lessons within a chapter
    async reorderLessons(req, res) {
        try {
            const { chapter_id } = req.params;
            const { lessons } = req.body; // Array of {lesson_id, order_index}

            if (!Array.isArray(lessons)) {
                return res.status(400).json({
                    success: false,
                    message: req.t('invalidLessonOrder')
                });
            }

            // Update each lesson's order_index
            for (const item of lessons) {
                await Lesson.update(item.lesson_id, { order_index: item.order_index });
            }

            // Log activity
            await ActivityLog.logDataChange(
                req.user.user_id,
                'Update',
                'lessons',
                null,
                null,
                { chapter_id, reordered: lessons.length },
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Reordered ${lessons.length} lessons`
            );

            res.json({
                success: true,
                message: req.t('lessonsReorderedSuccess')
            });
        } catch (error) {
            console.error('Reorder lessons error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorReorderingLessons'),
                error: error.message
            });
        }
    },

    // ============================================
    // Learning Progress Tracking APIs
    // ============================================

    // Get lesson progress for a user
    async getLessonProgress(req, res) {
        try {
            const { lesson_id } = req.params;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .query(`
                    SELECT lp.*, l.min_time_seconds, l.min_video_percent, l.quiz_passing_score,
                           l.require_time_tracking, l.require_video_completion, l.require_quiz_pass,
                           l.duration_minutes, l.video_duration
                    FROM lesson_progress lp
                    RIGHT JOIN lessons l ON lp.lesson_id = l.lesson_id AND lp.user_id = @userId
                    WHERE l.lesson_id = @lessonId
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lesson not found'
                });
            }

            const progress = result.recordset[0];

            // Calculate completion requirements
            const requirements = {
                time: {
                    required: progress.require_time_tracking,
                    current: progress.time_spent_seconds || 0,
                    minimum: progress.min_time_seconds || (progress.duration_minutes * 60 * 0.8) || 60,
                    met: progress.time_requirement_met || false
                },
                video: {
                    required: progress.require_video_completion,
                    current: progress.video_progress_percent || 0,
                    minimum: progress.min_video_percent || 80,
                    met: progress.video_requirement_met || false
                },
                quiz: {
                    required: progress.require_quiz_pass,
                    score: progress.quiz_score || 0,
                    passingScore: progress.quiz_passing_score || 70,
                    met: progress.quiz_passed || false
                }
            };

            // Check if all requirements are met
            const canComplete =
                (!requirements.time.required || requirements.time.met) &&
                (!requirements.video.required || requirements.video.met) &&
                (!requirements.quiz.required || requirements.quiz.met);

            res.json({
                success: true,
                data: {
                    progress_id: progress.progress_id,
                    is_completed: progress.is_completed || false,
                    completed_at: progress.completed_at,
                    requirements,
                    canComplete
                }
            });
        } catch (error) {
            console.error('Get lesson progress error:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting lesson progress',
                error: error.message
            });
        }
    },

    // Track time spent on lesson
    async trackTime(req, res) {
        try {
            const { lesson_id } = req.params;
            const { seconds, session_id } = req.body;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Get lesson info with course_id
            const lessonInfo = await pool.request()
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .query(`
                    SELECT l.lesson_id, l.min_time_seconds, l.duration_minutes, c.course_id
                    FROM lessons l
                    JOIN chapters ch ON l.chapter_id = ch.chapter_id
                    JOIN courses c ON ch.course_id = c.course_id
                    WHERE l.lesson_id = @lessonId
                `);

            if (lessonInfo.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lesson not found'
                });
            }

            const lesson = lessonInfo.recordset[0];
            const minTimeRequired = lesson.min_time_seconds || (lesson.duration_minutes * 60 * 0.8) || 60;

            // Upsert lesson_progress
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .input('courseId', sql.Int, lesson.course_id)
                .input('seconds', sql.Int, seconds)
                .input('minTimeRequired', sql.Int, minTimeRequired)
                .query(`
                    MERGE lesson_progress AS target
                    USING (SELECT @userId as user_id, @lessonId as lesson_id) AS source
                    ON target.user_id = source.user_id AND target.lesson_id = source.lesson_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            time_spent_seconds = time_spent_seconds + @seconds,
                            min_time_required_seconds = @minTimeRequired,
                            time_requirement_met = CASE
                                WHEN (time_spent_seconds + @seconds) >= @minTimeRequired THEN 1
                                ELSE 0
                            END,
                            last_accessed_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (user_id, lesson_id, course_id, time_spent_seconds, min_time_required_seconds, time_requirement_met)
                        VALUES (@userId, @lessonId, @courseId, @seconds, @minTimeRequired,
                                CASE WHEN @seconds >= @minTimeRequired THEN 1 ELSE 0 END);
                `);

            // Log time session
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .input('seconds', sql.Int, seconds)
                .input('ip', sql.NVarChar(45), req.ip)
                .input('userAgent', sql.NVarChar(500), req.get('User-Agent'))
                .query(`
                    INSERT INTO lesson_time_logs (user_id, lesson_id, session_start, session_end, duration_seconds, ip_address, user_agent)
                    VALUES (@userId, @lessonId, DATEADD(SECOND, -@seconds, GETDATE()), GETDATE(), @seconds, @ip, @userAgent)
                `);

            // Get updated progress
            const updatedProgress = await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .query(`
                    SELECT time_spent_seconds, time_requirement_met
                    FROM lesson_progress
                    WHERE user_id = @userId AND lesson_id = @lessonId
                `);

            res.json({
                success: true,
                data: updatedProgress.recordset[0]
            });
        } catch (error) {
            console.error('Track time error:', error);
            res.status(500).json({
                success: false,
                message: 'Error tracking time',
                error: error.message
            });
        }
    },

    // Track video progress
    async trackVideoProgress(req, res) {
        try {
            const { lesson_id } = req.params;
            const { progress_percent, current_position } = req.body;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Get lesson info
            const lessonInfo = await pool.request()
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .query(`
                    SELECT l.lesson_id, l.min_video_percent, c.course_id
                    FROM lessons l
                    JOIN chapters ch ON l.chapter_id = ch.chapter_id
                    JOIN courses c ON ch.course_id = c.course_id
                    WHERE l.lesson_id = @lessonId
                `);

            if (lessonInfo.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lesson not found'
                });
            }

            const lesson = lessonInfo.recordset[0];
            const minVideoPercent = lesson.min_video_percent || 80;

            // Upsert video progress
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .input('courseId', sql.Int, lesson.course_id)
                .input('progressPercent', sql.Decimal(5, 2), progress_percent)
                .input('currentPosition', sql.Int, current_position || 0)
                .input('minVideoPercent', sql.Int, minVideoPercent)
                .query(`
                    MERGE lesson_progress AS target
                    USING (SELECT @userId as user_id, @lessonId as lesson_id) AS source
                    ON target.user_id = source.user_id AND target.lesson_id = source.lesson_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            video_progress_percent = CASE
                                WHEN @progressPercent > video_progress_percent THEN @progressPercent
                                ELSE video_progress_percent
                            END,
                            video_last_position_seconds = @currentPosition,
                            video_requirement_met = CASE
                                WHEN (CASE WHEN @progressPercent > video_progress_percent THEN @progressPercent ELSE video_progress_percent END) >= @minVideoPercent THEN 1
                                ELSE 0
                            END,
                            last_accessed_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (user_id, lesson_id, course_id, video_progress_percent, video_last_position_seconds, video_requirement_met)
                        VALUES (@userId, @lessonId, @courseId, @progressPercent, @currentPosition,
                                CASE WHEN @progressPercent >= @minVideoPercent THEN 1 ELSE 0 END);
                `);

            // Get updated progress
            const updatedProgress = await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .query(`
                    SELECT video_progress_percent, video_requirement_met
                    FROM lesson_progress
                    WHERE user_id = @userId AND lesson_id = @lessonId
                `);

            res.json({
                success: true,
                data: updatedProgress.recordset[0]
            });
        } catch (error) {
            console.error('Track video progress error:', error);
            res.status(500).json({
                success: false,
                message: 'Error tracking video progress',
                error: error.message
            });
        }
    },

    // Complete lesson (validates all requirements)
    async completeLesson(req, res) {
        try {
            const { lesson_id } = req.params;
            const userId = req.user.user_id;
            const pool = await poolPromise;

            // Get lesson requirements and progress
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .query(`
                    SELECT lp.*, l.require_time_tracking, l.require_video_completion, l.require_quiz_pass,
                           l.min_time_seconds, l.min_video_percent, l.quiz_passing_score, l.duration_minutes,
                           c.course_id
                    FROM lessons l
                    JOIN chapters ch ON l.chapter_id = ch.chapter_id
                    JOIN courses c ON ch.course_id = c.course_id
                    LEFT JOIN lesson_progress lp ON l.lesson_id = lp.lesson_id AND lp.user_id = @userId
                    WHERE l.lesson_id = @lessonId
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lesson not found'
                });
            }

            const data = result.recordset[0];

            // Check requirements
            const timeRequired = data.require_time_tracking;
            const videoRequired = data.require_video_completion;
            const quizRequired = data.require_quiz_pass;

            const minTime = data.min_time_seconds || (data.duration_minutes * 60 * 0.8) || 60;
            const minVideo = data.min_video_percent || 80;

            const timeMet = !timeRequired || (data.time_spent_seconds >= minTime);
            const videoMet = !videoRequired || (data.video_progress_percent >= minVideo);
            const quizMet = !quizRequired || data.quiz_passed;

            if (!timeMet) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('timeRequirementNotMet') : 'Time requirement not met',
                    required: minTime,
                    current: data.time_spent_seconds || 0
                });
            }

            if (!videoMet) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('videoRequirementNotMet') : 'Video completion requirement not met',
                    required: minVideo,
                    current: data.video_progress_percent || 0
                });
            }

            if (!quizMet) {
                return res.status(400).json({
                    success: false,
                    message: req.t ? req.t('quizRequirementNotMet') : 'Quiz requirement not met'
                });
            }

            // Mark lesson as completed
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('lessonId', sql.Int, parseInt(lesson_id))
                .input('courseId', sql.Int, data.course_id)
                .query(`
                    MERGE lesson_progress AS target
                    USING (SELECT @userId as user_id, @lessonId as lesson_id) AS source
                    ON target.user_id = source.user_id AND target.lesson_id = source.lesson_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            is_completed = 1,
                            completed_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (user_id, lesson_id, course_id, is_completed, completed_at)
                        VALUES (@userId, @lessonId, @courseId, 1, GETDATE());
                `);

            // Update course progress
            await this.updateCourseProgress(userId, data.course_id);

            res.json({
                success: true,
                message: req.t ? req.t('lessonCompleted') : 'Lesson completed successfully'
            });
        } catch (error) {
            console.error('Complete lesson error:', error);
            res.status(500).json({
                success: false,
                message: 'Error completing lesson',
                error: error.message
            });
        }
    },

    // Helper: Update course progress based on completed lessons
    async updateCourseProgress(userId, courseId) {
        try {
            const pool = await poolPromise;

            // Calculate progress percentage
            const progressResult = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM lessons l
                         JOIN chapters ch ON l.chapter_id = ch.chapter_id
                         WHERE ch.course_id = @courseId AND l.is_published = 1) as total_lessons,
                        (SELECT COUNT(*) FROM lesson_progress lp
                         JOIN lessons l ON lp.lesson_id = l.lesson_id
                         JOIN chapters ch ON l.chapter_id = ch.chapter_id
                         WHERE ch.course_id = @courseId AND lp.user_id = @userId AND lp.is_completed = 1) as completed_lessons
                `);

            const { total_lessons, completed_lessons } = progressResult.recordset[0];
            const progressPercent = total_lessons > 0 ? Math.round((completed_lessons / total_lessons) * 100) : 0;

            // Update user_courses
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, courseId)
                .input('progress', sql.Decimal(5, 2), progressPercent)
                .query(`
                    UPDATE user_courses
                    SET progress = @progress,
                        status = CASE
                            WHEN @progress >= 100 THEN 'completed'
                            WHEN @progress > 0 THEN 'active'
                            ELSE status
                        END,
                        completion_date = CASE
                            WHEN @progress >= 100 AND completion_date IS NULL THEN GETDATE()
                            ELSE completion_date
                        END,
                        last_access_date = GETDATE()
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            return { success: true, progress: progressPercent };
        } catch (error) {
            console.error('Update course progress error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's learning time summary
    async getLearningTimeSummary(req, res) {
        try {
            const userId = req.user.user_id;
            const { course_id } = req.query;
            const pool = await poolPromise;

            let query = `
                SELECT
                    SUM(lp.time_spent_seconds) as total_time_seconds,
                    COUNT(CASE WHEN lp.is_completed = 1 THEN 1 END) as completed_lessons,
                    COUNT(lp.lesson_id) as started_lessons
                FROM lesson_progress lp
                WHERE lp.user_id = @userId
            `;

            const request = pool.request().input('userId', sql.Int, userId);

            if (course_id) {
                query += ' AND lp.course_id = @courseId';
                request.input('courseId', sql.Int, parseInt(course_id));
            }

            const result = await request.query(query);

            res.json({
                success: true,
                data: {
                    total_time_seconds: result.recordset[0].total_time_seconds || 0,
                    total_time_formatted: formatDuration(result.recordset[0].total_time_seconds || 0),
                    completed_lessons: result.recordset[0].completed_lessons || 0,
                    started_lessons: result.recordset[0].started_lessons || 0
                }
            });
        } catch (error) {
            console.error('Get learning time summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting learning time summary',
                error: error.message
            });
        }
    }
};

// Helper function to format duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

module.exports = lessonController;
