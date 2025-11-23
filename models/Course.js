const { poolPromise, sql } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Course {
    constructor(data) {
        this.course_id = data.course_id;
        this.course_code = data.course_code;
        this.course_name = data.course_name;
        this.course_name_en = data.course_name_en;
        this.category_id = data.category_id;
        this.course_type = data.course_type;
        this.difficulty_level = data.difficulty_level;
        this.language = data.language;
        this.description = data.description;
        this.objectives = data.objectives;
        this.target_audience = data.target_audience;
        this.prerequisites = data.prerequisites;
        this.duration_hours = data.duration_hours;
        this.max_students = data.max_students;
        this.thumbnail_image = data.thumbnail_image;
        this.intro_video_url = data.intro_video_url;
        this.instructor_id = data.instructor_id;
        this.instructor_name = data.instructor_name;
        this.passing_score = data.passing_score;
        this.max_attempts = data.max_attempts;
        this.show_correct_answers = data.show_correct_answers;
        this.is_published = data.is_published;
        this.is_active = data.is_active;
    }

    // Find course by ID with full details
    static async findById(courseId) {
        try {
            // Validate courseId is a valid integer
            const parsedCourseId = parseInt(courseId);
            if (isNaN(parsedCourseId) || parsedCourseId <= 0) {
                throw new Error('Validation failed for parameter \'courseId\'. Invalid number.');
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT c.*,
                           c.category as category_name,
                           COALESCE(c.instructor_name, CONCAT(u.first_name, ' ', u.last_name)) as instructor_display_name,
                           c.instructor_name as instructor_name_direct,
                           u.profile_image as instructor_image,
                           u.email as instructor_email,
                           NULL as instructor_bio,
                           CASE
                               WHEN p.position_name IS NOT NULL AND ou.unit_name_th IS NOT NULL THEN CONCAT(p.position_name, ' - ', ou.unit_name_th)
                               WHEN p.position_name IS NOT NULL THEN p.position_name
                               WHEN ou.unit_name_th IS NOT NULL THEN ou.unit_name_th
                               ELSE NULL
                           END as instructor_title,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                           (SELECT AVG(CAST(grade as FLOAT)) FROM user_courses
                            WHERE course_id = c.course_id AND grade IS NOT NULL) as avg_score,
                           (SELECT COUNT(*) FROM course_materials WHERE course_id = c.course_id AND type = 'video') as lesson_count,
                           (SELECT COUNT(*) FROM course_materials WHERE course_id = c.course_id) as material_count,
                           0 as avg_rating,
                           0 as rating_count
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    LEFT JOIN Positions p ON u.position_id = p.position_id
                    LEFT JOIN OrganizationUnits ou ON u.department_id = ou.unit_id
                    WHERE c.course_id = @courseId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const course = result.recordset[0];

            // Use instructor_display_name as the main instructor_name
            course.instructor_name = course.instructor_display_name;

            // Get prerequisites (if table exists, otherwise empty array)
            course.prerequisites_list = [];

            // Get lessons/materials
            const lessonsResult = await pool.request()
                .input('courseId', sql.Int, parsedCourseId)
                .query(`
                    SELECT *
                    FROM course_materials
                    WHERE course_id = @courseId
                    ORDER BY order_index
                `);

            // Map file_path to video_url for frontend
            course.lessons = lessonsResult.recordset.map(lesson => ({
                ...lesson,
                video_url: lesson.file_path || null
            }));

            // Parse learning_objectives if it's a JSON string
            try {
                if (course.learning_objectives && typeof course.learning_objectives === 'string') {
                    // Decode HTML entities before parsing
                    const decoded = course.learning_objectives
                        .replace(/&quot;/g, '"')
                        .replace(/&#34;/g, '"')
                        .replace(/&apos;/g, "'")
                        .replace(/&#39;/g, "'")
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&');

                    course.learning_objectives = JSON.parse(decoded);
                } else if (!course.learning_objectives) {
                    course.learning_objectives = [];
                }
            } catch (e) {
                console.error('Failed to parse learning_objectives:', e.message, course.learning_objectives);
                course.learning_objectives = [];
            }

            // Parse target_audience if it's a JSON string
            try {
                if (course.target_audience && typeof course.target_audience === 'string') {
                    course.target_audience = JSON.parse(course.target_audience);
                } else if (!course.target_audience) {
                    course.target_audience = {};
                }
            } catch (e) {
                course.target_audience = {};
            }

            // Add field aliases and defaults for view compatibility
            course.instructor_avatar = course.instructor_image;
            course.instructor_title = course.instructor_title || null;
            course.instructor_bio = course.instructor_bio || '';
            course.prerequisites_text = course.prerequisite_knowledge || '';
            course.full_description = course.description;
            course.rating = course.avg_rating || 0;
            course.rating_count = course.rating_count || 0;
            course.course_name = course.title; // Alias for compatibility

            return course;
        } catch (error) {
            throw new Error(`Error finding course: ${error.message}`);
        }
    }

    // Helper function to convert empty objects/arrays to null
    static normalizeValue(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        if (typeof value === 'object' && Object.keys(value).length === 0) {
            return null;
        }
        return value;
    }

    // Create new course
    static async create(courseData) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        try {
            // Begin transaction
            await transaction.begin();
            console.log('🔄 Transaction started for course creation');

            // Debug logging
            console.log('Course.create received data:', {
                instructor_id: courseData.instructor_id,
                instructor_name: courseData.instructor_name,
                course_name: courseData.course_name,
                category_id: courseData.category_id,
                allKeys: Object.keys(courseData)
            });

            // Get category name from category_id or use provided category
            let categoryName = courseData.category || 'General';
            if (courseData.category_id && !courseData.category) {
                // If category_id is provided but no category name, try to get it
                const categoryResult = await transaction.request()
                    .input('categoryId', sql.Int, parseInt(courseData.category_id))
                    .query('SELECT category_name FROM CourseCategories WHERE category_id = @categoryId');

                if (categoryResult.recordset.length > 0) {
                    categoryName = categoryResult.recordset[0].category_name;
                }
            }

            // Convert duration hours and minutes to hours
            let durationHours = 0;
            if (courseData.duration_hours) {
                durationHours = parseFloat(courseData.duration_hours);
                console.log('🔍 DEBUG duration_hours:', {
                    original: courseData.duration_hours,
                    type: typeof courseData.duration_hours,
                    parsed: durationHours
                });
            }
            if (courseData.duration_minutes) {
                const minutesPart = parseInt(courseData.duration_minutes) / 60;
                durationHours += minutesPart;
                console.log('🔍 DEBUG duration_minutes:', {
                    original: courseData.duration_minutes,
                    minutesPart: minutesPart,
                    total: durationHours
                });
            }
            console.log('🔍 FINAL durationHours:', durationHours);

            // Normalize thumbnail value (handle empty objects from form uploads)
            const thumbnailValue = this.normalizeValue(courseData.course_image) ||
                                   this.normalizeValue(courseData.thumbnail_image) ||
                                   this.normalizeValue(courseData.thumbnail);

            // Prepare JSON data for complex fields
            const learningObjectivesJson = courseData.learning_objectives ?
                JSON.stringify(courseData.learning_objectives) : null;

            // Handle target_audience - convert positions and departments arrays to JSON
            // Even if both are empty, store as {} to indicate "open for all"
            let targetAudienceJson = null;

            // DEBUG: Log incoming data
            console.log('🔍 DEBUG target_audience data:');
            console.log('  target_positions:', courseData.target_positions);
            console.log('  target_departments:', courseData.target_departments);

            const positions = Array.isArray(courseData.target_positions) ?
                courseData.target_positions.filter(p => p && p !== 'all') : [];
            const departments = Array.isArray(courseData.target_departments) ?
                courseData.target_departments.filter(d => d && d !== 'all') : [];

            console.log('  Filtered positions:', positions);
            console.log('  Filtered departments:', departments);

            // Only create targetAudience if at least one is selected
            // If neither selected = null = open for everyone
            if (positions.length > 0 || departments.length > 0) {
                targetAudienceJson = JSON.stringify({
                    positions: positions.map(p => typeof p === 'string' && !isNaN(p) ? parseInt(p) : p),
                    departments: departments.map(d => typeof d === 'string' && !isNaN(d) ? parseInt(d) : d)
                });
                console.log('  ✅ Created targetAudienceJson:', targetAudienceJson);
            } else {
                console.log('  ⚠️  No positions or departments selected → target_audience = NULL');
            }

            // Insert course with all columns (using transaction)
            const result = await transaction.request()
                .input('courseCode', sql.NVarChar(50), courseData.course_code || null)
                .input('title', sql.NVarChar(255), courseData.course_name || courseData.title || 'Untitled Course')
                .input('description', sql.NVarChar(sql.MAX), courseData.description || '')
                .input('category', sql.NVarChar(100), categoryName)
                .input('difficultyLevel', sql.NVarChar(50), courseData.difficulty_level || 'Beginner')
                .input('courseType', sql.NVarChar(50), courseData.course_type || null)
                .input('language', sql.NVarChar(20), courseData.language || null)
                .input('instructorId', sql.Int, courseData.instructor_id ? parseInt(courseData.instructor_id) : null)
                .input('instructorName', sql.NVarChar(255), courseData.instructor_name || null)
                .input('thumbnail', sql.NVarChar(500), thumbnailValue)
                .input('durationHours', sql.Decimal(5, 2), durationHours)
                .input('price', sql.Decimal(10, 2), courseData.price || 0)
                .input('isFree', sql.Bit, courseData.is_free !== false)
                .input('status', sql.NVarChar(50), courseData.status || 'Published')
                .input('enrollmentLimit', sql.Int, courseData.max_enrollments || courseData.enrollment_limit || courseData.max_students || null)
                .input('maxStudents', sql.Int, courseData.max_students || courseData.max_enrollments || courseData.enrollment_limit || null)
                .input('startDate', sql.DateTime2, courseData.enrollment_start || courseData.start_date || null)
                .input('endDate', sql.DateTime2, courseData.enrollment_end || courseData.end_date || null)
                .input('testId', sql.Int, courseData.test_id || null)
                .input('learningObjectives', sql.NVarChar(sql.MAX), learningObjectivesJson)
                .input('targetAudience', sql.NVarChar(sql.MAX), targetAudienceJson)
                .input('prerequisiteKnowledge', sql.NVarChar(sql.MAX), courseData.prerequisite_knowledge || null)
                .input('introVideoUrl', sql.NVarChar(500), courseData.intro_video_url || null)
                .input('passingScore', sql.Int, courseData.passing_score || null)
                .input('maxAttempts', sql.Int, courseData.max_attempts || null)
                .input('showCorrectAnswers', sql.Bit, courseData.show_correct_answers || false)
                .input('isPublished', sql.Bit, courseData.is_published !== false)
                .input('certificateValidity', sql.NVarChar(50), courseData.certificate_validity ? String(courseData.certificate_validity) : null)
                .query(`
                    INSERT INTO courses (
                        course_code, title, description, category, difficulty_level, course_type, language,
                        instructor_id, instructor_name, thumbnail, duration_hours, price, is_free, status,
                        enrollment_limit, max_students, start_date, end_date, test_id,
                        learning_objectives, target_audience, prerequisite_knowledge, intro_video_url,
                        passing_score, max_attempts, show_correct_answers, is_published, certificate_validity,
                        created_at, updated_at
                    ) VALUES (
                        @courseCode, @title, @description, @category, @difficultyLevel, @courseType, @language,
                        @instructorId, @instructorName, @thumbnail, @durationHours, @price, @isFree, @status,
                        @enrollmentLimit, @maxStudents, @startDate, @endDate, @testId,
                        @learningObjectives, @targetAudience, @prerequisiteKnowledge, @introVideoUrl,
                        @passingScore, @maxAttempts, @showCorrectAnswers, @isPublished, @certificateValidity,
                        GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() AS course_id;
                `);

            const newCourseId = result.recordset[0].course_id;

            // Insert lessons if provided (using transaction)
            if (courseData.lessons && Array.isArray(courseData.lessons) && courseData.lessons.length > 0) {
                console.log(`📚 Inserting ${courseData.lessons.length} lessons...`);
                for (let i = 0; i < courseData.lessons.length; i++) {
                    const lesson = courseData.lessons[i];
                    await transaction.request()
                        .input('courseId', sql.Int, newCourseId)
                        .input('title', sql.NVarChar(255), lesson.title || `บทที่ ${i + 1}`)
                        .input('content', sql.NVarChar(sql.MAX), lesson.description || '')
                        .input('type', sql.NVarChar(50), 'lesson')
                        .input('filePath', sql.NVarChar(500), lesson.video_url || null)
                        .input('orderIndex', sql.Int, i + 1)
                        .input('duration', sql.Int, lesson.duration || 0)
                        .query(`
                            INSERT INTO course_materials (
                                course_id, title, content, type, file_path, order_index, duration_minutes, created_at
                            ) VALUES (
                                @courseId, @title, @content, @type, @filePath, @orderIndex, @duration, GETDATE()
                            )
                        `);
                    console.log(`  ✅ Lesson ${i + 1} inserted successfully`);
                }
            }

            // Commit transaction
            await transaction.commit();
            console.log('✅ Transaction committed successfully');

            // Return data in format expected by controller
            return {
                success: true,
                data: {
                    course_id: newCourseId
                }
            };
        } catch (error) {
            // Rollback transaction on error
            try {
                await transaction.rollback();
                console.log('⚠️ Transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('❌ Error rolling back transaction:', rollbackError);
            }

            console.error('❌ Course.create error:', error);
            return {
                success: false,
                message: `Error creating course: ${error.message}`
            };
        }
    }

    // Update course
    static async update(courseId, updateData) {
        try {
            const pool = await poolPromise;

            // Build dynamic update query
            const updateFields = [];
            const request = pool.request()
                .input('courseId', sql.Int, courseId)
                .input('modifiedBy', sql.Int, updateData.modified_by || null);

            // Add fields to update dynamically
            if (updateData.course_name !== undefined || updateData.title !== undefined) {
                const titleValue = updateData.course_name || updateData.title;
                updateFields.push('title = @title');
                request.input('title', sql.NVarChar(255), titleValue);
            }
            if (updateData.category !== undefined) {
                updateFields.push('category = @category');
                request.input('category', sql.NVarChar(100), updateData.category);
            }
            if (updateData.course_type !== undefined) {
                updateFields.push('course_type = @courseType');
                request.input('courseType', sql.NVarChar(20), updateData.course_type);
            }
            if (updateData.difficulty_level !== undefined) {
                updateFields.push('difficulty_level = @difficultyLevel');
                request.input('difficultyLevel', sql.NVarChar(20), updateData.difficulty_level);
            }
            if (updateData.description !== undefined) {
                updateFields.push('description = @description');
                request.input('description', sql.NVarChar(sql.MAX), updateData.description);
            }
            if (updateData.objectives !== undefined) {
                updateFields.push('objectives = @objectives');
                request.input('objectives', sql.NVarChar(sql.MAX), updateData.objectives);
            }
            if (updateData.duration_hours !== undefined || updateData.duration_minutes !== undefined) {
                // Combine hours and minutes into total hours
                let totalHours = parseFloat(updateData.duration_hours) || 0;
                totalHours += (parseFloat(updateData.duration_minutes) || 0) / 60;
                updateFields.push('duration_hours = @durationHours');
                request.input('durationHours', sql.Decimal(5, 2), totalHours);
            }
            if (updateData.passing_score !== undefined) {
                updateFields.push('passing_score = @passingScore');
                const passingScore = updateData.passing_score === '' || updateData.passing_score === null
                    ? null
                    : parseFloat(updateData.passing_score);
                request.input('passingScore', sql.Decimal(5, 2), passingScore);
            }
            if (updateData.thumbnail_image !== undefined || updateData.course_image !== undefined || updateData.thumbnail !== undefined) {
                const thumbnailValue = updateData.course_image || updateData.thumbnail_image || updateData.thumbnail;
                updateFields.push('thumbnail = @thumbnail');
                request.input('thumbnail', sql.NVarChar(500), thumbnailValue);
            }
            if (updateData.language !== undefined) {
                updateFields.push('language = @language');
                request.input('language', sql.NVarChar(20), updateData.language);
            }
            if (updateData.prerequisite_knowledge !== undefined) {
                updateFields.push('prerequisite_knowledge = @prerequisiteKnowledge');
                request.input('prerequisiteKnowledge', sql.NVarChar(sql.MAX), updateData.prerequisite_knowledge);
            }
            if (updateData.learning_objectives !== undefined) {
                const objectivesJson = typeof updateData.learning_objectives === 'string'
                    ? updateData.learning_objectives
                    : JSON.stringify(updateData.learning_objectives);
                updateFields.push('learning_objectives = @learningObjectives');
                request.input('learningObjectives', sql.NVarChar(sql.MAX), objectivesJson);
            }
            if (updateData.target_positions !== undefined || updateData.target_departments !== undefined) {
                const positions = Array.isArray(updateData.target_positions) && updateData.target_positions.length > 0
                    ? updateData.target_positions
                    : [];
                const departments = Array.isArray(updateData.target_departments) && updateData.target_departments.length > 0
                    ? updateData.target_departments
                    : [];

                // If both are empty, store null instead of empty object
                const targetAudienceJson = (positions.length > 0 || departments.length > 0)
                    ? JSON.stringify({ positions, departments })
                    : null;

                updateFields.push('target_audience = @targetAudience');
                request.input('targetAudience', sql.NVarChar(sql.MAX), targetAudienceJson);
            }
            if (updateData.max_enrollments !== undefined || updateData.max_students !== undefined) {
                const maxStudents = updateData.max_enrollments || updateData.max_students;
                const maxStudentsValue = maxStudents === '' || maxStudents === null
                    ? null
                    : parseInt(maxStudents);
                updateFields.push('max_students = @maxStudents');
                request.input('maxStudents', sql.Int, maxStudentsValue);
                updateFields.push('enrollment_limit = @enrollmentLimit');
                request.input('enrollmentLimit', sql.Int, maxStudentsValue);
            }
            if (updateData.enrollment_start !== undefined || updateData.start_date !== undefined) {
                const startDate = updateData.enrollment_start || updateData.start_date;
                updateFields.push('start_date = @startDate');
                request.input('startDate', sql.DateTime2, startDate || null);
            }
            if (updateData.enrollment_end !== undefined || updateData.end_date !== undefined) {
                const endDate = updateData.enrollment_end || updateData.end_date;
                updateFields.push('end_date = @endDate');
                request.input('endDate', sql.DateTime2, endDate || null);
            }
            if (updateData.max_attempts !== undefined) {
                updateFields.push('max_attempts = @maxAttempts');
                const maxAttempts = updateData.max_attempts === '' || updateData.max_attempts === null
                    ? null
                    : parseInt(updateData.max_attempts);
                request.input('maxAttempts', sql.Int, maxAttempts);
            }
            if (updateData.certificate_validity !== undefined) {
                updateFields.push('certificate_validity = @certificateValidity');
                request.input('certificateValidity', sql.NVarChar(50), updateData.certificate_validity ? String(updateData.certificate_validity) : null);
            }
            if (updateData.status !== undefined) {
                updateFields.push('status = @status');
                request.input('status', sql.NVarChar(50), updateData.status);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            const updateQuery = `
                UPDATE courses
                SET ${updateFields.join(', ')}
                WHERE course_id = @courseId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Course updated successfully' : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error updating course: ${error.message}`);
        }
    }

    // Publish/Unpublish course
    static async togglePublish(courseId, publish = true) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('isPublished', sql.Bit, publish)
                .query(`
                    UPDATE courses
                    SET is_published = @isPublished,
                        published_date = CASE WHEN @isPublished = 1 THEN GETDATE() ELSE published_date END,
                        modified_date = GETDATE()
                    WHERE course_id = @courseId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0
                    ? (publish ? 'Course published successfully' : 'Course unpublished successfully')
                    : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error publishing course: ${error.message}`);
        }
    }

    // Get all courses with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE c.status IN (\'Active\', \'Published\')';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.category) {
                whereClause += ' AND c.category = @category';
                request.input('category', sql.NVarChar(100), filters.category);
            }
            if (filters.instructor_id) {
                whereClause += ' AND c.instructor_id = @instructorId';
                request.input('instructorId', sql.Int, filters.instructor_id);
            }
            if (filters.difficulty_level) {
                whereClause += ' AND c.difficulty_level = @difficultyLevel';
                request.input('difficultyLevel', sql.NVarChar(50), filters.difficulty_level);
            }
            if (filters.status) {
                whereClause = 'WHERE c.status = @status'; // Replace default
                request.input('status', sql.NVarChar(50), filters.status);
            }
            if (filters.search) {
                whereClause += ` AND (
                    c.title LIKE @search OR
                    c.description LIKE @search OR
                    c.category LIKE @search
                )`;
                request.input('search', sql.NVarChar(200), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM courses c
                ${whereClause}
            `);

            // Get paginated data with additional info
            const result = await request.query(`
                SELECT c.*,
                       c.category as category_name,
                       CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                       u.profile_image as instructor_image,
                       (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                       0 as rating,
                       0 as rating_count,
                       NULL as enrollment_status,
                       0 as progress_percentage
                FROM courses c
                LEFT JOIN users u ON c.instructor_id = u.user_id
                ${whereClause}
                ORDER BY c.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

            return {
                data: result.recordset,
                total: countResult.recordset[0].total,
                page: page,
                totalPages: Math.ceil(countResult.recordset[0].total / limit)
            };
        } catch (error) {
            throw new Error(`Error fetching courses: ${error.message}`);
        }
    }

    // Get popular courses
    static async getPopular(limit = 10) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) c.*,
                           c.category as category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           u.profile_image as instructor_image,
                           COUNT(e.user_id) as enrolled_count,
                           AVG(CAST(e.grade as FLOAT)) as avg_score,
                           0 as rating,
                           0 as rating_count,
                           NULL as enrollment_status,
                           0 as progress_percentage
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    LEFT JOIN user_courses e ON c.course_id = e.course_id
                    WHERE c.status IN ('Active', 'Published')
                    GROUP BY c.course_id, c.title, c.description, c.category, c.difficulty_level,
                             c.instructor_id, c.thumbnail, c.duration_hours, c.price, c.is_free,
                             c.status, c.enrollment_limit, c.start_date, c.end_date,
                             c.created_at, c.updated_at, c.test_id, u.first_name, u.last_name, u.profile_image
                    ORDER BY COUNT(e.user_id) DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching popular courses: ${error.message}`);
        }
    }

    // Get recommended courses for user
    static async getRecommended(userId, limit = 5) {
        try {
            const pool = await poolPromise;

            // Get user's position and completed courses
            const userResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT position_id, department_id
                    FROM users
                    WHERE user_id = @userId
                `);

            if (userResult.recordset.length === 0) {
                return [];
            }

            const user = userResult.recordset[0];

            // Get recommended courses based on position requirements and not yet enrolled
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('positionId', sql.Int, user.position_id || 0)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) c.*,
                           c.category as category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                           u.profile_image as instructor_image,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                           0 as rating,
                           0 as rating_count,
                           NULL as enrollment_status,
                           0 as progress_percentage
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    WHERE c.status IN ('Active', 'Published')
                    AND c.course_id NOT IN (
                        SELECT course_id
                        FROM user_courses
                        WHERE user_id = @userId
                    )
                    ORDER BY c.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching recommended courses: ${error.message}`);
        }
    }

    // Get courses by instructor
    static async getByInstructor(instructorId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('instructorId', sql.Int, instructorId)
                .query(`
                    SELECT c.*,
                           c.category as category_name,
                           (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count,
                           (SELECT COUNT(*) FROM course_materials WHERE course_id = c.course_id) as lesson_count
                    FROM courses c
                    WHERE c.instructor_id = @instructorId
                    ORDER BY c.created_at DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching instructor courses: ${error.message}`);
        }
    }

    // Add lesson to course
    static async addLesson(courseId, lessonData) {
        try {
            const pool = await poolPromise;
            const lessonId = uuidv4();

            const result = await pool.request()
                .input('lessonId', sql.Int, lessonId)
                .input('courseId', sql.Int, courseId)
                .input('lessonOrder', sql.Int, lessonData.lesson_order)
                .input('lessonTitle', sql.NVarChar(200), lessonData.lesson_title)
                .input('lessonDescription', sql.NVarChar(sql.MAX), lessonData.lesson_description || null)
                .input('lessonType', sql.NVarChar(20), lessonData.lesson_type)
                .input('contentUrl', sql.NVarChar(500), lessonData.content_url || null)
                .input('durationMinutes', sql.Int, lessonData.duration_minutes || 0)
                .input('isMandatory', sql.Bit, lessonData.is_mandatory !== false)
                .input('minTimeMinutes', sql.Int, lessonData.min_time_minutes || 0)
                .query(`
                    INSERT INTO course_materials (
                        material_id, course_id, title, type, content,
                        order_index, duration_minutes, is_required,
                        created_at
                    ) VALUES (
                        @lessonId, @courseId, @lessonTitle, @lessonType,
                        @lessonDescription, @lessonOrder, @durationMinutes,
                        @isMandatory, GETDATE()
                    )
                `);

            // Update course duration
            await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    UPDATE courses
                    SET duration_hours = (
                        SELECT SUM(duration_minutes) / 60.0
                        FROM course_materials
                        WHERE course_id = @courseId
                    )
                    WHERE course_id = @courseId
                `);

            return {
                success: true,
                lessonId: lessonId
            };
        } catch (error) {
            throw new Error(`Error adding lesson: ${error.message}`);
        }
    }

    // Delete course (soft delete)
    static async delete(courseId, deletedBy) {
        try {
            const pool = await poolPromise;

            // Check if there are active enrollments
            const enrollmentCheck = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM user_courses
                    WHERE course_id = @courseId
                    AND completion_status IN ('IN_PROGRESS', 'NOT_STARTED')
                `);

            if (enrollmentCheck.recordset[0].count > 0) {
                return {
                    success: false,
                    message: 'Cannot delete course with active enrollments'
                };
            }

            const result = await pool.request()
                .input('courseId', sql.Int, courseId)
                .input('deletedBy', sql.Int, deletedBy)
                .query(`
                    UPDATE courses
                    SET is_active = 0,
                        is_published = 0,
                        modified_by = @deletedBy,
                        modified_date = GETDATE()
                    WHERE course_id = @courseId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Course deleted successfully' : 'Course not found'
            };
        } catch (error) {
            throw new Error(`Error deleting course: ${error.message}`);
        }
    }

    // Get course categories
    static async getCategories() {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query(`
                    SELECT
                        cc.category_id,
                        cc.category_name,
                        cc.category_name_en,
                        cc.description,
                        cc.category_icon,
                        cc.category_color,
                        cc.display_order,
                        COUNT(c.course_id) as course_count
                    FROM CourseCategories cc
                    LEFT JOIN courses c ON cc.category_name = c.category
                                        AND c.status IN ('Active', 'Published')
                    WHERE cc.is_active = 1
                    GROUP BY cc.category_id, cc.category_name, cc.category_name_en,
                             cc.description, cc.category_icon, cc.category_color, cc.display_order
                    ORDER BY cc.display_order, cc.category_name
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching categories: ${error.message}`);
        }
    }

    // Get course progress details for all students
    static async getCourseProgressDetails(courseId, filters = {}) {
        try {
            const pool = await poolPromise;
            let whereClause = 'WHERE e.course_id = @courseId';
            const request = pool.request().input('courseId', sql.Int, courseId);

            // Add filters
            if (filters.status) {
                whereClause += ' AND e.completion_status = @status';
                request.input('status', sql.NVarChar(20), filters.status);
            }
            if (filters.department_id) {
                whereClause += ' AND u.department_id = @departmentId';
                request.input('departmentId', sql.Int, filters.department_id);
            }
            if (filters.min_progress !== undefined) {
                whereClause += ' AND e.progress_percentage >= @minProgress';
                request.input('minProgress', sql.Decimal(5,2), filters.min_progress);
            }

            const result = await request.query(`
                SELECT
                    e.enrollment_id,
                    e.user_id,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.employee_id,
                    u.email,
                    u.profile_image,
                    ou.unit_name_th as department_name,
                    p.position_name_th as position_name,
                    e.enrollment_date,
                    e.progress_percentage,
                    e.completion_status,
                    e.grade,
                    e.last_accessed,
                    e.completed_at,
                    e.certificate_number,
                    DATEDIFF(DAY, e.enrollment_date, GETDATE()) as days_enrolled,
                    0 as lessons_completed,
                    (SELECT COUNT(*) FROM course_materials WHERE course_id = @courseId) as total_lessons
                FROM user_courses e
                JOIN users u ON e.user_id = u.user_id
                LEFT JOIN OrganizationUnits ou ON u.department_id = ou.unit_id
                LEFT JOIN Positions p ON u.position_id = p.position_id
                ${whereClause}
                ORDER BY e.enrollment_date DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching course progress details: ${error.message}`);
        }
    }

    // Get course statistics
    static async getCourseStatistics(courseId) {
        try {
            const pool = await poolPromise;

            // Get overall stats
            const overallStats = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        COUNT(*) as total_enrollments,
                        SUM(CASE WHEN completion_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
                        SUM(CASE WHEN completion_status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_count,
                        SUM(CASE WHEN completion_status = 'NOT_STARTED' THEN 1 ELSE 0 END) as not_started_count,
                        SUM(CASE WHEN completion_status = 'DROPPED' THEN 1 ELSE 0 END) as dropped_count,
                        AVG(CAST(grade as FLOAT)) as avg_score,
                        AVG(CAST(progress_percentage as FLOAT)) as avg_progress,
                        CAST(
                            CASE
                                WHEN COUNT(*) > 0
                                THEN (CAST(SUM(CASE WHEN completion_status = 'COMPLETED' THEN 1 ELSE 0 END) as FLOAT) / COUNT(*)) * 100
                                ELSE 0
                            END as DECIMAL(5,2)
                        ) as completion_rate
                    FROM user_courses
                    WHERE course_id = @courseId
                `);

            // Get department-wise stats
            const departmentStats = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        ou.unit_name_th as department_name,
                        ou.unit_id as department_id,
                        COUNT(*) as enrollment_count,
                        SUM(CASE WHEN e.completion_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
                        AVG(CAST(e.grade as FLOAT)) as avg_score,
                        AVG(CAST(e.progress_percentage as FLOAT)) as avg_progress
                    FROM user_courses e
                    JOIN users u ON e.user_id = u.user_id
                    LEFT JOIN OrganizationUnits ou ON u.department_id = ou.unit_id
                    WHERE e.course_id = @courseId
                    GROUP BY ou.unit_id, ou.unit_name_th
                    ORDER BY enrollment_count DESC
                `);

            // Get enrollment trend (last 12 months)
            const enrollmentTrend = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        FORMAT(enrollment_date, 'yyyy-MM') as month,
                        COUNT(*) as enrollment_count
                    FROM user_courses
                    WHERE course_id = @courseId
                    AND enrollment_date >= DATEADD(MONTH, -12, GETDATE())
                    GROUP BY FORMAT(enrollment_date, 'yyyy-MM')
                    ORDER BY month DESC
                `);

            // Get completion trend
            const completionTrend = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        FORMAT(completed_at, 'yyyy-MM') as month,
                        COUNT(*) as completion_count,
                        AVG(CAST(grade as FLOAT)) as avg_score
                    FROM user_courses
                    WHERE course_id = @courseId
                    AND completion_status = 'COMPLETED'
                    AND completed_at IS NOT NULL
                    AND completed_at >= DATEADD(MONTH, -12, GETDATE())
                    GROUP BY FORMAT(completed_at, 'yyyy-MM')
                    ORDER BY month DESC
                `);

            // Get lesson completion stats (simplified for course_materials table)
            const lessonStats = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT
                        m.material_id as lesson_id,
                        m.title as lesson_title,
                        m.order_index as lesson_order,
                        0 as students_completed,
                        0 as avg_time_minutes
                    FROM course_materials m
                    WHERE m.course_id = @courseId
                    GROUP BY m.material_id, m.title, m.order_index
                    ORDER BY m.order_index
                `);

            // Get top performers
            const topPerformers = await pool.request()
                .input('courseId', sql.Int, courseId)
                .query(`
                    SELECT TOP 10
                        u.user_id,
                        CONCAT(u.first_name, ' ', u.last_name) as user_name,
                        u.profile_image,
                        e.grade,
                        e.progress_percentage,
                        e.completed_at,
                        ou.unit_name_th as department_name
                    FROM user_courses e
                    JOIN users u ON e.user_id = u.user_id
                    LEFT JOIN OrganizationUnits ou ON u.department_id = ou.unit_id
                    WHERE e.course_id = @courseId
                    AND e.grade IS NOT NULL
                    ORDER BY e.grade DESC, e.completed_at ASC
                `);

            return {
                overall: overallStats.recordset[0],
                by_department: departmentStats.recordset,
                enrollment_trend: enrollmentTrend.recordset,
                completion_trend: completionTrend.recordset,
                lesson_stats: lessonStats.recordset,
                top_performers: topPerformers.recordset
            };
        } catch (error) {
            throw new Error(`Error fetching course statistics: ${error.message}`);
        }
    }
}

module.exports = Course;