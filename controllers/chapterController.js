const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');

const chapterController = {
    // Render chapter management page for a course
    async renderChapterManagement(req, res) {
        try {
            const { course_id } = req.params;
            const course = await Course.findById(course_id);

            if (!course) {
                return res.status(404).render('error/404', {
                    message: req.t('courseNotFound')
                });
            }

            // Check if user has permission to manage this course
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).render('error/403', {
                    message: req.t('noPermissionManageCourse')
                });
            }

            res.render('chapters/index', {
                title: req.t('manageChapters'),
                course: course,
                user: req.user,
                t: req.t
            });
        } catch (error) {
            console.error('Render chapter management error:', error);
            res.status(500).render('error/500', {
                message: req.t('errorLoadingChapters')
            });
        }
    },

    // Get all chapters for a course
    async getChaptersByCourse(req, res) {
        try {
            const { course_id } = req.params;
            const chapters = await Chapter.findByCourseId(parseInt(course_id));

            res.json({
                success: true,
                data: chapters
            });
        } catch (error) {
            console.error('Get chapters error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingChapters'),
                error: error.message
            });
        }
    },

    // Get single chapter by ID
    async getChapterById(req, res) {
        try {
            const { chapter_id } = req.params;
            const chapter = await Chapter.findById(parseInt(chapter_id));

            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: req.t('chapterNotFound')
                });
            }

            res.json({
                success: true,
                data: chapter
            });
        } catch (error) {
            console.error('Get chapter error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingChapter'),
                error: error.message
            });
        }
    },

    // Create new chapter
    async createChapter(req, res) {
        try {
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionCreateChapter')
                });
            }

            // Check if user has permission for this course
            const course = await Course.findById(req.body.course_id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: req.t('courseNotFound')
                });
            }

            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionManageCourse')
                });
            }

            const chapterData = {
                course_id: req.body.course_id,
                title: req.body.title,
                description: req.body.description || null,
                order_index: req.body.order_index || 0,
                duration_minutes: req.body.duration_minutes || null,
                is_published: req.body.is_published || false
            };

            const result = await Chapter.create(chapterData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.logDataChange(
                userId,
                'Create',
                'chapters',
                result.data.chapter_id,
                null,
                chapterData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Created chapter: ${chapterData.title}`
            );

            res.status(201).json({
                success: true,
                message: req.t('chapterCreatedSuccess'),
                data: result.data
            });
        } catch (error) {
            console.error('Create chapter error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorCreatingChapter'),
                error: error.message
            });
        }
    },

    // Update chapter
    async updateChapter(req, res) {
        try {
            const { chapter_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            // Get existing chapter
            const chapter = await Chapter.findById(parseInt(chapter_id));
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: req.t('chapterNotFound')
                });
            }

            // Check course permission
            const course = await Course.findById(chapter.course_id);
            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionEditChapter')
                });
            }

            const updateData = {};
            if (req.body.title !== undefined) updateData.title = req.body.title;
            if (req.body.description !== undefined) updateData.description = req.body.description;
            if (req.body.order_index !== undefined) updateData.order_index = req.body.order_index;
            if (req.body.duration_minutes !== undefined) updateData.duration_minutes = req.body.duration_minutes;
            if (req.body.is_published !== undefined) updateData.is_published = req.body.is_published;

            const result = await Chapter.update(chapter_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.logDataChange(
                userId,
                'Update',
                'chapters',
                chapter_id,
                chapter,
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Updated chapter: ${updateData.title || chapter.title}`
            );

            res.json({
                success: true,
                message: req.t('chapterUpdatedSuccess'),
                data: result.data
            });
        } catch (error) {
            console.error('Update chapter error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorUpdatingChapter'),
                error: error.message
            });
        }
    },

    // Delete chapter
    async deleteChapter(req, res) {
        try {
            const { chapter_id } = req.params;
            const userRole = req.user.role_name;
            const userId = req.user.user_id;

            // Get existing chapter
            const chapter = await Chapter.findById(parseInt(chapter_id));
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: req.t('chapterNotFound')
                });
            }

            // Check course permission
            const course = await Course.findById(chapter.course_id);
            if (userRole === 'Instructor' && course.instructor_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionDeleteChapter')
                });
            }

            if (!['Admin', 'Instructor'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: req.t('noPermissionDeleteChapter')
                });
            }

            const result = await Chapter.delete(chapter_id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Log activity
            await ActivityLog.logDataChange(
                userId,
                'Delete',
                'chapters',
                chapter_id,
                chapter,
                null,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Deleted chapter: ${chapter.title}`
            );

            res.json({
                success: true,
                message: req.t('chapterDeletedSuccess')
            });
        } catch (error) {
            console.error('Delete chapter error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorDeletingChapter'),
                error: error.message
            });
        }
    },

    // Reorder chapters
    async reorderChapters(req, res) {
        try {
            const { course_id } = req.params;
            const { chapters } = req.body; // Array of {chapter_id, order_index}

            if (!Array.isArray(chapters)) {
                return res.status(400).json({
                    success: false,
                    message: req.t('invalidChapterOrder')
                });
            }

            // Update each chapter's order_index
            for (const item of chapters) {
                await Chapter.update(item.chapter_id, { order_index: item.order_index });
            }

            // Log activity
            await ActivityLog.logDataChange(
                req.user.user_id,
                'Update',
                'chapters',
                null,
                null,
                { course_id, reordered: chapters.length },
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `Reordered ${chapters.length} chapters`
            );

            res.json({
                success: true,
                message: req.t('chaptersReorderedSuccess')
            });
        } catch (error) {
            console.error('Reorder chapters error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorReorderingChapters'),
                error: error.message
            });
        }
    }
};

module.exports = chapterController;
