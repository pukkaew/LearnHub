const { poolPromise, sql } = require('../config/database');

class Chapter {
    constructor(data) {
        this.chapter_id = data.chapter_id;
        this.course_id = data.course_id;
        this.title = data.title;
        this.description = data.description;
        this.order_index = data.order_index;
        this.duration_minutes = data.duration_minutes;
        this.is_published = data.is_published;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Get all chapters for a course
    static async findByCourseId(courseId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        c.*,
                        (SELECT COUNT(*) FROM lessons WHERE chapter_id = c.chapter_id) as lesson_count
                    FROM chapters c
                    WHERE c.course_id = @courseId
                    ORDER BY c.order_index, c.chapter_id
                `);

            return result.recordset.map(row => new Chapter(row));
        } catch (error) {
            console.error('Error finding chapters by course:', error);
            throw new Error(`Error finding chapters: ${error.message}`);
        }
    }

    // Get chapter by ID
    static async findById(chapterId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('chapterId', sql.Int, chapterId)
                .query(`
                    SELECT
                        c.*,
                        (SELECT COUNT(*) FROM lessons WHERE chapter_id = c.chapter_id) as lesson_count
                    FROM chapters c
                    WHERE c.chapter_id = @chapterId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            return new Chapter(result.recordset[0]);
        } catch (error) {
            console.error('Error finding chapter by id:', error);
            throw new Error(`Error finding chapter: ${error.message}`);
        }
    }

    // Create new chapter
    static async create(chapterData) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('courseId', sql.Int, chapterData.course_id)
                .input('title', sql.NVarChar(255), chapterData.title)
                .input('description', sql.NVarChar(sql.MAX), chapterData.description || null)
                .input('orderIndex', sql.Int, chapterData.order_index || 0)
                .input('durationMinutes', sql.Int, chapterData.duration_minutes || null)
                .input('isPublished', sql.Bit, chapterData.is_published ? 1 : 0)
                .query(`
                    INSERT INTO chapters (
                        course_id, title, description, order_index,
                        duration_minutes, is_published, created_at, updated_at
                    ) VALUES (
                        @courseId, @title, @description, @orderIndex,
                        @durationMinutes, @isPublished, GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() as chapter_id
                `);

            const chapterId = result.recordset[0].chapter_id;

            return {
                success: true,
                message: 'Chapter created successfully',
                data: await Chapter.findById(chapterId)
            };
        } catch (error) {
            console.error('Error creating chapter:', error);
            return {
                success: false,
                message: 'Error creating chapter',
                error: error.message
            };
        }
    }

    // Update chapter
    static async update(chapterId, updateData) {
        try {
            const pool = await poolPromise;

            let query = 'UPDATE chapters SET ';
            const setClauses = [];
            const request = pool.request().input('chapterId', sql.Int, chapterId);

            if (updateData.title !== undefined) {
                setClauses.push('title = @title');
                request.input('title', sql.NVarChar(255), updateData.title);
            }
            if (updateData.description !== undefined) {
                setClauses.push('description = @description');
                request.input('description', sql.NVarChar(sql.MAX), updateData.description);
            }
            if (updateData.order_index !== undefined) {
                setClauses.push('order_index = @orderIndex');
                request.input('orderIndex', sql.Int, updateData.order_index);
            }
            if (updateData.duration_minutes !== undefined) {
                setClauses.push('duration_minutes = @durationMinutes');
                request.input('durationMinutes', sql.Int, updateData.duration_minutes);
            }
            if (updateData.is_published !== undefined) {
                setClauses.push('is_published = @isPublished');
                request.input('isPublished', sql.Bit, updateData.is_published ? 1 : 0);
            }

            setClauses.push('updated_at = GETDATE()');
            query += setClauses.join(', ') + ' WHERE chapter_id = @chapterId';

            await request.query(query);

            return {
                success: true,
                message: 'Chapter updated successfully',
                data: await Chapter.findById(chapterId)
            };
        } catch (error) {
            console.error('Error updating chapter:', error);
            return {
                success: false,
                message: 'Error updating chapter',
                error: error.message
            };
        }
    }

    // Delete chapter
    static async delete(chapterId) {
        try {
            const pool = await poolPromise;

            await pool.request()
                .input('chapterId', sql.Int, chapterId)
                .query('DELETE FROM chapters WHERE chapter_id = @chapterId');

            return {
                success: true,
                message: 'Chapter deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting chapter:', error);
            return {
                success: false,
                message: 'Error deleting chapter',
                error: error.message
            };
        }
    }
}

module.exports = Chapter;
