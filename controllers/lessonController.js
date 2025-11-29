const Lesson = require('../models/Lesson');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');

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
    }
};

module.exports = lessonController;
