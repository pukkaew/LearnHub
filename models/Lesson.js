const { poolPromise, sql } = require('../config/database');

class Lesson {
    constructor(data) {
        this.lesson_id = data.lesson_id;
        this.chapter_id = data.chapter_id;
        this.title = data.title;
        this.description = data.description;
        this.content_type = data.content_type;
        this.content = data.content;
        this.video_url = data.video_url;
        this.video_duration = data.video_duration;
        this.order_index = data.order_index;
        this.duration_minutes = data.duration_minutes;
        this.is_required = data.is_required;
        this.is_preview = data.is_preview;
        this.is_published = data.is_published;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Get all lessons for a chapter
    static async findByChapterId(chapterId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('chapterId', sql.Int, chapterId)
                .query(`
                    SELECT l.*
                    FROM lessons l
                    WHERE l.chapter_id = @chapterId
                    ORDER BY l.order_index, l.lesson_id
                `);

            return result.recordset.map(row => new Lesson(row));
        } catch (error) {
            console.error('Error finding lessons by chapter:', error);
            throw new Error(`Error finding lessons: ${error.message}`);
        }
    }

    // Get lesson by ID
    static async findById(lessonId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('lessonId', sql.Int, lessonId)
                .query(`
                    SELECT l.*, c.title as chapter_title, c.course_id
                    FROM lessons l
                    JOIN chapters c ON l.chapter_id = c.chapter_id
                    WHERE l.lesson_id = @lessonId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new Lesson(result.recordset[0]);
        } catch (error) {
            console.error('Error finding lesson by id:', error);
            throw new Error(`Error finding lesson: ${error.message}`);
        }
    }

    // Create new lesson
    static async create(lessonData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('chapterId', sql.Int, lessonData.chapter_id)
                .input('title', sql.NVarChar(255), lessonData.title)
                .input('description', sql.NVarChar(sql.MAX), lessonData.description || null)
                .input('contentType', sql.NVarChar(50), lessonData.content_type || null)
                .input('content', sql.NVarChar(sql.MAX), lessonData.content || null)
                .input('videoUrl', sql.NVarChar(500), lessonData.video_url || null)
                .input('videoDuration', sql.Int, lessonData.video_duration || null)
                .input('orderIndex', sql.Int, lessonData.order_index || 0)
                .input('durationMinutes', sql.Int, lessonData.duration_minutes || null)
                .input('isRequired', sql.Bit, lessonData.is_required ? 1 : 0)
                .input('isPreview', sql.Bit, lessonData.is_preview ? 1 : 0)
                .input('isPublished', sql.Bit, lessonData.is_published ? 1 : 0)
                .query(`
                    INSERT INTO lessons (
                        chapter_id, title, description, content_type, content,
                        video_url, video_duration, order_index, duration_minutes,
                        is_required, is_preview, is_published, created_at, updated_at
                    ) VALUES (
                        @chapterId, @title, @description, @contentType, @content,
                        @videoUrl, @videoDuration, @orderIndex, @durationMinutes,
                        @isRequired, @isPreview, @isPublished, GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() as lesson_id
                `);

            const lessonId = result.recordset[0].lesson_id;

            return {
                success: true,
                message: 'Lesson created successfully',
                data: await Lesson.findById(lessonId)
            };
        } catch (error) {
            console.error('Error creating lesson:', error);
            return {
                success: false,
                message: 'Error creating lesson',
                error: error.message
            };
        }
    }

    // Update lesson
    static async update(lessonId, updateData) {
        try {
            const pool = await poolPromise;

            let query = 'UPDATE lessons SET ';
            const setClauses = [];
            const request = pool.request().input('lessonId', sql.Int, lessonId);

            if (updateData.title !== undefined) {
                setClauses.push('title = @title');
                request.input('title', sql.NVarChar(255), updateData.title);
            }
            if (updateData.description !== undefined) {
                setClauses.push('description = @description');
                request.input('description', sql.NVarChar(sql.MAX), updateData.description);
            }
            if (updateData.content_type !== undefined) {
                setClauses.push('content_type = @contentType');
                request.input('contentType', sql.NVarChar(50), updateData.content_type);
            }
            if (updateData.content !== undefined) {
                setClauses.push('content = @content');
                request.input('content', sql.NVarChar(sql.MAX), updateData.content);
            }
            if (updateData.video_url !== undefined) {
                setClauses.push('video_url = @videoUrl');
                request.input('videoUrl', sql.NVarChar(500), updateData.video_url);
            }
            if (updateData.video_duration !== undefined) {
                setClauses.push('video_duration = @videoDuration');
                request.input('videoDuration', sql.Int, updateData.video_duration);
            }
            if (updateData.order_index !== undefined) {
                setClauses.push('order_index = @orderIndex');
                request.input('orderIndex', sql.Int, updateData.order_index);
            }
            if (updateData.duration_minutes !== undefined) {
                setClauses.push('duration_minutes = @durationMinutes');
                request.input('durationMinutes', sql.Int, updateData.duration_minutes);
            }
            if (updateData.is_required !== undefined) {
                setClauses.push('is_required = @isRequired');
                request.input('isRequired', sql.Bit, updateData.is_required ? 1 : 0);
            }
            if (updateData.is_preview !== undefined) {
                setClauses.push('is_preview = @isPreview');
                request.input('isPreview', sql.Bit, updateData.is_preview ? 1 : 0);
            }
            if (updateData.is_published !== undefined) {
                setClauses.push('is_published = @isPublished');
                request.input('isPublished', sql.Bit, updateData.is_published ? 1 : 0);
            }

            setClauses.push('updated_at = GETDATE()');
            query += setClauses.join(', ') + ' WHERE lesson_id = @lessonId';

            await request.query(query);

            return {
                success: true,
                message: 'Lesson updated successfully',
                data: await Lesson.findById(lessonId)
            };
        } catch (error) {
            console.error('Error updating lesson:', error);
            return {
                success: false,
                message: 'Error updating lesson',
                error: error.message
            };
        }
    }

    // Delete lesson
    static async delete(lessonId) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('lessonId', sql.Int, lessonId)
                .query('DELETE FROM lessons WHERE lesson_id = @lessonId');

            return {
                success: true,
                message: 'Lesson deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting lesson:', error);
            return {
                success: false,
                message: 'Error deleting lesson',
                error: error.message
            };
        }
    }
}

module.exports = Lesson;
