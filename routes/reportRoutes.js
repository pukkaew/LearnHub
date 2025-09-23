const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { poolPromise, sql } = require('../config/database');

// Render reports main page
router.get('/', authMiddleware.requireAuth, async (req, res) => {
    try {
        res.render('reports/index', {
            title: 'รายงาน - Rukchai Hongyen LearnHub',
            user: req.session.user
        });
    } catch (error) {
        console.error('Render reports error:', error);
        res.render('error', {
            title: 'เกิดข้อผิดพลาด - Rukchai Hongyen LearnHub',
            user: req.session.user,
            error: 'ไม่สามารถโหลดหน้ารายงานได้'
        });
    }
});

// Get learning progress report
router.get('/learning-progress', authMiddleware.requireManager(), async (req, res) => {
    try {
        const { startDate, endDate, departmentId, courseId } = req.query;
        const pool = await poolPromise;

        let whereClause = 'WHERE u.is_active = 1';
        const request = pool.request();

        if (startDate && endDate) {
            whereClause += ' AND ce.enrollment_date BETWEEN @startDate AND @endDate';
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }

        if (departmentId) {
            whereClause += ' AND u.department_id = @departmentId';
            request.input('departmentId', sql.Int, departmentId);
        }

        if (courseId) {
            whereClause += ' AND c.course_id = @courseId';
            request.input('courseId', sql.Int, courseId);
        }

        const result = await request.query(`
            SELECT
                u.employee_id,
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                d.department_name,
                c.course_name,
                ce.enrollment_date,
                ce.progress_percentage,
                ce.completion_date,
                ce.final_score,
                ce.status,
                ce.time_spent
            FROM Users u
            LEFT JOIN user_courses ce ON u.user_id = ce.user_id
            LEFT JOIN Courses c ON ce.course_id = c.course_id
            LEFT JOIN Departments d ON u.department_id = d.department_id
            ${whereClause}
            ORDER BY u.employee_id, ce.enrollment_date DESC
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Learning progress report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
        });
    }
});

// Get test results report
router.get('/test-results', authMiddleware.requireManager(), async (req, res) => {
    try {
        const { startDate, endDate, testId, departmentId } = req.query;
        const pool = await poolPromise;

        let whereClause = 'WHERE u.is_active = 1 AND ta.status = \'Completed\'';
        const request = pool.request();

        if (startDate && endDate) {
            whereClause += ' AND ta.start_time BETWEEN @startDate AND @endDate';
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }

        if (testId) {
            whereClause += ' AND t.test_id = @testId';
            request.input('testId', sql.Int, testId);
        }

        if (departmentId) {
            whereClause += ' AND u.department_id = @departmentId';
            request.input('departmentId', sql.Int, departmentId);
        }

        const result = await request.query(`
            SELECT
                u.employee_id,
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                d.department_name,
                t.test_name,
                ta.start_time,
                ta.end_time,
                ta.time_taken,
                ta.score,
                ta.max_score,
                ta.percentage,
                ta.passed,
                ta.attempt_number
            FROM Users u
            LEFT JOIN TestAttempts ta ON u.user_id = ta.user_id
            LEFT JOIN Tests t ON ta.test_id = t.test_id
            LEFT JOIN Departments d ON u.department_id = d.department_id
            ${whereClause}
            ORDER BY u.employee_id, ta.start_time DESC
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Test results report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
        });
    }
});

// Get user activity report
router.get('/user-activity', authMiddleware.requireManager(), async (req, res) => {
    try {
        const { startDate, endDate, userId, activityType } = req.query;
        const pool = await poolPromise;

        let whereClause = 'WHERE ua.created_date IS NOT NULL';
        const request = pool.request();

        if (startDate && endDate) {
            whereClause += ' AND ua.created_date BETWEEN @startDate AND @endDate';
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }

        if (userId) {
            whereClause += ' AND ua.user_id = @userId';
            request.input('userId', sql.Int, userId);
        }

        if (activityType) {
            whereClause += ' AND ua.activity_type = @activityType';
            request.input('activityType', sql.NVarChar(50), activityType);
        }

        const result = await request.query(`
            SELECT
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                u.employee_id,
                d.department_name,
                ua.activity_type,
                ua.description,
                ua.created_date,
                ua.ip_address
            FROM UserActivities ua
            LEFT JOIN Users u ON ua.user_id = u.user_id
            LEFT JOIN Departments d ON u.department_id = d.department_id
            ${whereClause}
            ORDER BY ua.created_date DESC
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('User activity report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
        });
    }
});

// Get course statistics
router.get('/course-stats', authMiddleware.requireManager(), async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT
                c.course_name,
                c.course_code,
                cat.category_name,
                CONCAT(instructor.first_name, ' ', instructor.last_name) as instructor_name,
                COUNT(ce.enrollment_id) as total_enrollments,
                COUNT(CASE WHEN ce.status = 'Completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN ce.status = 'Active' THEN 1 END) as active_count,
                COUNT(CASE WHEN ce.status = 'Dropped' THEN 1 END) as dropped_count,
                AVG(CAST(ce.final_score as FLOAT)) as avg_score,
                AVG(CAST(ce.progress_percentage as FLOAT)) as avg_progress
            FROM Courses c
            LEFT JOIN user_courses ce ON c.course_id = ce.course_id
            LEFT JOIN CourseCategories cat ON c.category_id = cat.category_id
            LEFT JOIN Users instructor ON c.instructor_id = instructor.user_id
            WHERE c.is_active = 1
            GROUP BY c.course_id, c.course_name, c.course_code, cat.category_name,
                     instructor.first_name, instructor.last_name
            ORDER BY total_enrollments DESC
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Course statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
        });
    }
});

// Get department performance
router.get('/department-performance', authMiddleware.requireHR(), async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT
                d.department_name,
                d.department_code,
                COUNT(DISTINCT u.user_id) as total_employees,
                COUNT(DISTINCT ce.enrollment_id) as total_enrollments,
                COUNT(DISTINCT CASE WHEN ce.status = 'Completed' THEN ce.enrollment_id END) as completed_courses,
                AVG(CAST(ce.final_score as FLOAT)) as avg_score,
                COUNT(DISTINCT ta.attempt_id) as total_test_attempts,
                COUNT(DISTINCT CASE WHEN ta.passed = 1 THEN ta.attempt_id END) as passed_tests
            FROM Departments d
            LEFT JOIN Users u ON d.department_id = u.department_id AND u.is_active = 1
            LEFT JOIN user_courses ce ON u.user_id = ce.user_id
            LEFT JOIN TestAttempts ta ON u.user_id = ta.user_id AND ta.status = 'Completed'
            WHERE d.is_active = 1
            GROUP BY d.department_id, d.department_name, d.department_code
            ORDER BY total_employees DESC
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Department performance error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
        });
    }
});

// Get certificate report
router.get('/certificates', authMiddleware.requireManager(), async (req, res) => {
    try {
        const { startDate, endDate, departmentId } = req.query;
        const pool = await poolPromise;

        let whereClause = 'WHERE cert.is_active = 1';
        const request = pool.request();

        if (startDate && endDate) {
            whereClause += ' AND cert.issued_date BETWEEN @startDate AND @endDate';
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }

        if (departmentId) {
            whereClause += ' AND u.department_id = @departmentId';
            request.input('departmentId', sql.Int, departmentId);
        }

        const result = await request.query(`
            SELECT
                cert.certificate_code,
                CONCAT(u.first_name, ' ', u.last_name) as recipient_name,
                u.employee_id,
                d.department_name,
                c.course_name,
                t.test_name,
                cert.certificate_type,
                cert.issued_date,
                cert.valid_until,
                CONCAT(issuer.first_name, ' ', issuer.last_name) as issued_by_name
            FROM Certificates cert
            LEFT JOIN Users u ON cert.user_id = u.user_id
            LEFT JOIN Departments d ON u.department_id = d.department_id
            LEFT JOIN Courses c ON cert.course_id = c.course_id
            LEFT JOIN Tests t ON cert.test_id = t.test_id
            LEFT JOIN Users issuer ON cert.issued_by = issuer.user_id
            ${whereClause}
            ORDER BY cert.issued_date DESC
        `);

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Certificate report error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
        });
    }
});

// Export learning progress to CSV
router.get('/export/learning-progress', authMiddleware.requireManager(), async (req, res) => {
    try {
        const { startDate, endDate, departmentId, courseId } = req.query;
        const pool = await poolPromise;

        let whereClause = 'WHERE u.is_active = 1';
        const request = pool.request();

        if (startDate && endDate) {
            whereClause += ' AND ce.enrollment_date BETWEEN @startDate AND @endDate';
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }

        if (departmentId) {
            whereClause += ' AND u.department_id = @departmentId';
            request.input('departmentId', sql.Int, departmentId);
        }

        if (courseId) {
            whereClause += ' AND c.course_id = @courseId';
            request.input('courseId', sql.Int, courseId);
        }

        const result = await request.query(`
            SELECT
                u.employee_id as 'รหัสพนักงาน',
                CONCAT(u.first_name, ' ', u.last_name) as 'ชื่อ-นามสกุล',
                d.department_name as 'แผนก',
                c.course_name as 'ชื่อหลักสูตร',
                FORMAT(ce.enrollment_date, 'dd/MM/yyyy') as 'วันที่ลงทะเบียน',
                ce.progress_percentage as 'ความคืบหน้า (%)',
                FORMAT(ce.completion_date, 'dd/MM/yyyy') as 'วันที่เสร็จสิ้น',
                ce.final_score as 'คะแนนสุดท้าย',
                ce.status as 'สถานะ',
                ce.time_spent as 'เวลาที่ใช้ (นาที)'
            FROM Users u
            LEFT JOIN user_courses ce ON u.user_id = ce.user_id
            LEFT JOIN Courses c ON ce.course_id = c.course_id
            LEFT JOIN Departments d ON u.department_id = d.department_id
            ${whereClause}
            ORDER BY u.employee_id, ce.enrollment_date DESC
        `);

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="learning-progress-report.csv"');

        // Add BOM for proper UTF-8 encoding in Excel
        res.write('\uFEFF');

        // Convert to CSV
        const data = result.recordset;
        if (data.length > 0) {
            // Headers
            const headers = Object.keys(data[0]).join(',');
            res.write(headers + '\n');

            // Data rows
            data.forEach(row => {
                const values = Object.values(row).map(value =>
                    value !== null && value !== undefined ? `"${String(value).replace(/"/g, '""')}"` : '""'
                );
                res.write(values.join(',') + '\n');
            });
        }

        res.end();
    } catch (error) {
        console.error('Export learning progress error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่งออกรายงาน'
        });
    }
});

module.exports = router;