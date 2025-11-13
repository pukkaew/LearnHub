const { poolPromise, sql } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    constructor(data) {
        this.user_id = data.user_id;
        this.username = data.username;
        this.email = data.email;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.role_id = data.role_id;
        this.department_id = data.department_id;
        this.position_id = data.position_id;
        this.employee_id = data.employee_id;
        this.phone = data.phone;
        this.profile_image = data.profile_image;
        this.is_active = data.is_active;
        this.email_verified = data.email_verified;
        this.last_login = data.last_login;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Find user by ID
    static async findById(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT u.*,
                           r.role_name,
                           d.department_name,
                           p.position_name,
                           p.level as position_level
                    FROM Users u
                    LEFT JOIN Roles r ON u.role_id = r.role_id
                    LEFT JOIN Departments d ON u.department_id = d.department_id
                    LEFT JOIN Positions p ON u.position_id = p.position_id
                    WHERE u.user_id = @userId
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding user: ${error.message}`);
        }
    }

    // Find user by username
    static async findByUsername(username) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('username', sql.NVarChar(50), username)
                .query(`
                    SELECT u.*, r.role_name
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE u.username = @username AND u.is_active = 1
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by username: ${error.message}`);
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('email', sql.NVarChar(100), email)
                .query(`
                    SELECT u.*, r.role_name
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE u.email = @email AND u.is_active = 1
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error.message}`);
        }
    }

    // Find user by employee ID
    static async findByEmployeeId(employeeId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('employeeId', sql.NVarChar(20), employeeId)
                .query(`
                    SELECT u.*, r.role_name
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE u.employee_id = @employeeId AND u.is_active = 1
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by employee ID: ${error.message}`);
        }
    }

    // Create new user
    static async create(userData) {
        try {
            const pool = await poolPromise;
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Generate username from employee ID if not provided
            const username = userData.username || userData.employee_id;

            const result = await pool.request()
                .input('employeeId', sql.NVarChar(20), userData.employee_id)
                .input('username', sql.NVarChar(50), username)
                .input('password', sql.NVarChar(255), hashedPassword)
                .input('email', sql.NVarChar(100), userData.email)
                .input('firstName', sql.NVarChar(50), userData.first_name)
                .input('lastName', sql.NVarChar(50), userData.last_name)
                .input('branchId', sql.Int, userData.branch_id || null)
                .input('officeId', sql.Int, userData.office_id || null)
                .input('divisionId', sql.Int, userData.division_id || null)
                .input('departmentId', sql.Int, userData.department_id || null)
                .input('positionId', sql.Int, userData.position_id || null)
                .input('roleId', sql.Int, userData.role_id)
                .input('phone', sql.NVarChar(20), userData.phone || null)
                .query(`
                    INSERT INTO Users (
                        employee_id, username, password, email,
                        first_name, last_name,
                        branch_id, office_id, division_id, department_id, position_id, role_id,
                        phone, is_active, email_verified, created_at, password_changed_at
                    )
                    OUTPUT INSERTED.user_id
                    VALUES (
                        @employeeId, @username, @password, @email,
                        @firstName, @lastName,
                        @branchId, @officeId, @divisionId, @departmentId, @positionId, @roleId,
                        @phone, 1, 0, GETDATE(), GETDATE()
                    )
                `);

            const insertedUserId = result.recordset[0]?.user_id;
            return { success: true, userId: insertedUserId };
        } catch (error) {
            if (error.message.includes('Violation of UNIQUE KEY') || error.message.includes('duplicate key')) {
                const message = error.message.toLowerCase();
                if (message.includes('employee_id') || message.includes('uq__users__c52e0ba4')) {
                    throw new Error('Employee ID already exists');
                }
                if (message.includes('username') || message.includes('uq__users__f3dbc572')) {
                    throw new Error('Username already exists');
                }
                if (message.includes('email') || message.includes('uq__users__ab6e6164') || message.includes('uq__users__a9e107487')) {
                    throw new Error('Email already exists');
                }
            }
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    // Update user
    static async update(userId, updateData) {
        try {
            const pool = await poolPromise;

            // Build dynamic update query
            const updateFields = [];
            const request = pool.request()
                .input('userId', sql.Int, userId);

            // Add fields to update dynamically
            if (updateData.email !== undefined) {
                updateFields.push('email = @email');
                request.input('email', sql.NVarChar(100), updateData.email);
            }
            if (updateData.first_name !== undefined) {
                updateFields.push('first_name = @firstName');
                request.input('firstName', sql.NVarChar(50), updateData.first_name);
            }
            if (updateData.last_name !== undefined) {
                updateFields.push('last_name = @lastName');
                request.input('lastName', sql.NVarChar(50), updateData.last_name);
            }
            if (updateData.department_id !== undefined) {
                updateFields.push('department_id = @departmentId');
                request.input('departmentId', sql.Int, updateData.department_id);
            }
            if (updateData.position_id !== undefined) {
                updateFields.push('position_id = @positionId');
                request.input('positionId', sql.Int, updateData.position_id);
            }
            if (updateData.phone !== undefined) {
                updateFields.push('phone = @phone');
                request.input('phone', sql.NVarChar(20), updateData.phone);
            }
            if (updateData.profile_image !== undefined) {
                updateFields.push('profile_image = @profileImage');
                request.input('profileImage', sql.NVarChar(255), updateData.profile_image);
            }
            if (updateData.date_of_birth !== undefined) {
                updateFields.push('date_of_birth = @dateOfBirth');
                request.input('dateOfBirth', sql.Date, updateData.date_of_birth);
            }
            if (updateData.gender !== undefined) {
                updateFields.push('gender = @gender');
                request.input('gender', sql.NVarChar(10), updateData.gender);
            }
            if (updateData.bio !== undefined) {
                updateFields.push('bio = @bio');
                request.input('bio', sql.NVarChar(500), updateData.bio);
            }
            if (updateData.employee_id !== undefined) {
                updateFields.push('employee_id = @employeeId');
                request.input('employeeId', sql.NVarChar(50), updateData.employee_id);
            }
            if (updateData.role !== undefined) {
                // Convert role_name to role_id
                const roleResult = await pool.request()
                    .input('roleName', sql.NVarChar(50), updateData.role)
                    .query('SELECT role_id FROM roles WHERE role_name = @roleName');

                if (roleResult.recordset.length > 0) {
                    updateFields.push('role_id = @roleId');
                    request.input('roleId', sql.Int, roleResult.recordset[0].role_id);
                } else {
                    throw new Error(`Invalid role: ${updateData.role}`);
                }
            }
            if (updateData.supervisor_id !== undefined) {
                updateFields.push('supervisor_id = @supervisorId');
                request.input('supervisorId', sql.Int, updateData.supervisor_id);
            }
            if (updateData.is_active !== undefined) {
                updateFields.push('is_active = @isActive');
                request.input('isActive', sql.Bit, updateData.is_active);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            const updateQuery = `
                UPDATE Users
                SET ${updateFields.join(', ')}
                WHERE user_id = @userId
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'User updated successfully' : 'User not found'
            };
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    }

    // Update password (direct - no verification, used by reset/register)
    static async updatePassword(userId, newPassword) {
        try {
            const pool = await poolPromise;

            // Hash the new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('password', sql.NVarChar(255), hashedPassword)
                .query(`
                    UPDATE Users
                    SET password = @password,
                        password_changed_at = GETDATE(),
                        updated_at = GETDATE()
                    WHERE user_id = @userId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Password updated successfully' : 'Failed to update password'
            };
        } catch (error) {
            throw new Error(`Error updating password: ${error.message}`);
        }
    }

    // Change password (with old password verification)
    static async changePassword(userId, oldPassword, newPassword) {
        try {
            const pool = await poolPromise;

            // First verify old password
            const user = await this.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            const isValidPassword = await bcrypt.compare(oldPassword, user.password);
            if (!isValidPassword) {
                return { success: false, message: 'Current password is incorrect' };
            }

            // Update password using updatePassword method
            return await this.updatePassword(userId, newPassword);
        } catch (error) {
            throw new Error(`Error changing password: ${error.message}`);
        }
    }

    // Verify password
    static async verifyPassword(username, password) {
        try {
            const user = await this.findByUsername(username);
            if (!user) {
                return { success: false, message: 'Invalid username or password' };
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return { success: false, message: 'Invalid username or password' };
            }

            return { success: true, user: user };
        } catch (error) {
            throw new Error(`Error verifying password: ${error.message}`);
        }
    }

    // Update login info
    static async updateLoginInfo(userId) {
        try {
            const pool = await poolPromise;
            await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    UPDATE Users
                    SET last_login = GETDATE()
                    WHERE user_id = @userId
                `);
        } catch (error) {
            throw new Error(`Error updating login info: ${error.message}`);
        }
    }

    // Get all users with pagination
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            // Handle is_active filter
            // Default: show only active users
            // 'all' or null: show all users
            // true/1: show active only
            // false/0: show inactive only
            let whereClause = 'WHERE 1=1';
            if (filters.is_active === undefined || filters.is_active === true || filters.is_active === '1') {
                // Default or explicitly active
                whereClause += ' AND u.is_active = 1';
            } else if (filters.is_active === false || filters.is_active === '0') {
                // Explicitly inactive
                whereClause += ' AND u.is_active = 0';
            }
            // else: 'all' or null → no is_active filter

            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.department_id) {
                whereClause += ' AND u.department_id = @departmentId';
                request.input('departmentId', sql.Int, filters.department_id);
            }
            if (filters.position_id) {
                whereClause += ' AND u.position_id = @positionId';
                request.input('positionId', sql.Int, filters.position_id);
            }
            if (filters.role_id) {
                whereClause += ' AND u.role_id = @roleId';
                request.input('roleId', sql.Int, filters.role_id);
            }
            if (filters.role) {
                // Handle role name filter (case-insensitive)
                whereClause += ' AND LOWER(r.role_name) = LOWER(@roleName)';
                request.input('roleName', sql.NVarChar(50), filters.role);
            }
            if (filters.search) {
                whereClause += ` AND (
                    u.first_name LIKE @search OR
                    u.last_name LIKE @search OR
                    u.email LIKE @search OR
                    u.employee_id LIKE @search
                )`;
                request.input('search', sql.NVarChar(100), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Users u
                ${whereClause}
            `);

            // Get paginated data
            const result = await request.query(`
                SELECT u.*,
                       r.role_name,
                       d.department_name,
                       p.position_name
                FROM Users u
                LEFT JOIN Roles r ON u.role_id = r.role_id
                LEFT JOIN Departments d ON u.department_id = d.department_id
                LEFT JOIN Positions p ON u.position_id = p.position_id
                ${whereClause}
                ORDER BY u.created_at ASC
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
            throw new Error(`Error fetching users: ${error.message}`);
        }
    }

    // Delete user (soft delete)
    static async delete(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    UPDATE Users
                    SET is_active = 0,
                        updated_at = GETDATE()
                    WHERE user_id = @userId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'User deleted successfully' : 'User not found'
            };
        } catch (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }

    // Get users by department
    static async getByDepartment(departmentId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('departmentId', sql.Int, departmentId)
                .query(`
                    SELECT u.*,
                           r.role_name,
                           d.department_name,
                           p.position_name
                    FROM Users u
                    LEFT JOIN Roles r ON u.role_id = r.role_id
                    LEFT JOIN Departments d ON u.department_id = d.department_id
                    LEFT JOIN Positions p ON u.position_id = p.position_id
                    WHERE u.department_id = @departmentId AND u.is_active = 1
                    ORDER BY u.first_name, u.last_name
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching users by department: ${error.message}`);
        }
    }

    // ==========================================
    // APPLICANT-SPECIFIC METHODS
    // ==========================================

    // Find user by ID card number (for applicant login)
    static async findByIdCardNumber(idCardNumber) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('idCardNumber', sql.NVarChar(13), idCardNumber)
                .query(`
                    SELECT u.*, r.role_name
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE u.id_card_number = @idCardNumber
                        AND u.user_type = 'APPLICANT'
                        AND u.is_active = 1
                `);

            return result.recordset[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by ID card number: ${error.message}`);
        }
    }

    // Create applicant
    static async createApplicant(applicantData) {
        try {
            const pool = await poolPromise;
            const hashedPassword = await bcrypt.hash(applicantData.password, 10);

            // Get default applicant role (role_id = 4 or find by role_name = 'Applicant')
            const roleResult = await pool.request().query(`
                SELECT role_id
                FROM Roles
                WHERE role_name = 'Applicant'
            `);

            if (roleResult.recordset.length === 0) {
                throw new Error('Applicant role not found. Please create "Applicant" role first.');
            }

            const applicantRoleId = roleResult.recordset[0].role_id;

            const result = await pool.request()
                .input('idCardNumber', sql.NVarChar(13), applicantData.id_card_number)
                .input('password', sql.NVarChar(255), hashedPassword)
                .input('email', sql.NVarChar(100), applicantData.email || null)
                .input('firstName', sql.NVarChar(50), applicantData.first_name)
                .input('lastName', sql.NVarChar(50), applicantData.last_name)
                .input('phone', sql.NVarChar(20), applicantData.phone || null)
                .input('appliedPosition', sql.NVarChar(100), applicantData.applied_position)
                .input('autoDisable', sql.Bit, applicantData.auto_disable_after_test || 0)
                .input('roleId', sql.Int, applicantRoleId)
                .query(`
                    INSERT INTO Users (
                        user_type, id_card_number, password, email,
                        first_name, last_name, phone,
                        applied_position, auto_disable_after_test,
                        role_id, status, is_active, email_verified,
                        created_at, password_changed_at
                    )
                    OUTPUT INSERTED.user_id
                    VALUES (
                        'APPLICANT', @idCardNumber, @password, @email,
                        @firstName, @lastName, @phone,
                        @appliedPosition, @autoDisable,
                        @roleId, 'ACTIVE', 1, 0,
                        GETDATE(), GETDATE()
                    )
                `);

            const insertedUserId = result.recordset[0]?.user_id;
            return { success: true, userId: insertedUserId };
        } catch (error) {
            if (error.message.includes('Violation of UNIQUE KEY') || error.message.includes('duplicate key')) {
                if (error.message.includes('id_card_number') || error.message.toLowerCase().includes('uq_users_id_card_number')) {
                    throw new Error('ID card number already exists');
                }
            }
            throw new Error(`Error creating applicant: ${error.message}`);
        }
    }

    // Update applicant status (ACTIVE, DISABLED, etc.)
    static async updateStatus(userId, status) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .input('status', sql.NVarChar(20), status)
                .query(`
                    UPDATE Users
                    SET status = @status,
                        updated_at = GETDATE()
                    WHERE user_id = @userId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Status updated successfully' : 'User not found'
            };
        } catch (error) {
            throw new Error(`Error updating user status: ${error.message}`);
        }
    }

    // Get all applicants with pagination
    static async getAllApplicants(page = 1, limit = 20, filters = {}) {
        try {
            const pool = await poolPromise;
            const offset = (page - 1) * limit;

            let whereClause = "WHERE u.user_type = 'APPLICANT' AND u.is_active = 1";
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.applied_position) {
                whereClause += ' AND u.applied_position = @appliedPosition';
                request.input('appliedPosition', sql.NVarChar(100), filters.applied_position);
            }
            if (filters.status) {
                whereClause += ' AND u.status = @status';
                request.input('status', sql.NVarChar(20), filters.status);
            }
            if (filters.search) {
                whereClause += ` AND (
                    u.first_name LIKE @search OR
                    u.last_name LIKE @search OR
                    u.id_card_number LIKE @search OR
                    u.email LIKE @search
                )`;
                request.input('search', sql.NVarChar(100), `%${filters.search}%`);
            }

            // Get total count
            const countResult = await request.query(`
                SELECT COUNT(*) as total
                FROM Users u
                ${whereClause}
            `);

            // Get paginated data with test statistics
            const result = await request.query(`
                SELECT u.*,
                    (SELECT COUNT(*) FROM ApplicantTestAssignments WHERE applicant_id = u.user_id AND is_active = 1) as total_tests_assigned,
                    (SELECT COUNT(*) FROM ApplicantTestAssignments WHERE applicant_id = u.user_id AND status = 'COMPLETED') as tests_completed,
                    (SELECT COUNT(*) FROM ApplicantTestResults WHERE applicant_id = u.user_id AND passed = 1) as tests_passed
                FROM Users u
                ${whereClause}
                ORDER BY u.created_at DESC
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
            throw new Error(`Error fetching applicants: ${error.message}`);
        }
    }

    // Update applicant info
    static async updateApplicant(userId, updateData) {
        try {
            const pool = await poolPromise;

            const updateFields = [];
            const request = pool.request()
                .input('userId', sql.Int, userId);

            if (updateData.first_name !== undefined) {
                updateFields.push('first_name = @firstName');
                request.input('firstName', sql.NVarChar(50), updateData.first_name);
            }
            if (updateData.last_name !== undefined) {
                updateFields.push('last_name = @lastName');
                request.input('lastName', sql.NVarChar(50), updateData.last_name);
            }
            if (updateData.email !== undefined) {
                updateFields.push('email = @email');
                request.input('email', sql.NVarChar(100), updateData.email);
            }
            if (updateData.phone !== undefined) {
                updateFields.push('phone = @phone');
                request.input('phone', sql.NVarChar(20), updateData.phone);
            }
            if (updateData.applied_position !== undefined) {
                updateFields.push('applied_position = @appliedPosition');
                request.input('appliedPosition', sql.NVarChar(100), updateData.applied_position);
            }
            if (updateData.auto_disable_after_test !== undefined) {
                updateFields.push('auto_disable_after_test = @autoDisable');
                request.input('autoDisable', sql.Bit, updateData.auto_disable_after_test);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('updated_at = GETDATE()');

            const updateQuery = `
                UPDATE Users
                SET ${updateFields.join(', ')}
                WHERE user_id = @userId AND user_type = 'APPLICANT'
            `;

            const result = await request.query(updateQuery);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Applicant updated successfully' : 'Applicant not found'
            };
        } catch (error) {
            throw new Error(`Error updating applicant: ${error.message}`);
        }
    }

    // Validate Thai ID card number (checksum algorithm)
    static validateThaiIdCard(idCardNumber) {
        if (!idCardNumber || idCardNumber.length !== 13) {
            return false;
        }

        if (!/^\d{13}$/.test(idCardNumber)) {
            return false;
        }

        // Thai ID card checksum validation
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(idCardNumber.charAt(i)) * (13 - i);
        }

        const checkDigit = (11 - (sum % 11)) % 10;
        return checkDigit === parseInt(idCardNumber.charAt(12));
    }

    // Get applicant statistics
    static async getApplicantStatistics() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    COUNT(*) as total_applicants,
                    SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'DISABLED' THEN 1 ELSE 0 END) as disabled,
                    (SELECT COUNT(DISTINCT applicant_id) FROM ApplicantTestResults WHERE passed = 1) as applicants_with_passed_tests,
                    (SELECT COUNT(DISTINCT applied_position) FROM Users WHERE user_type = 'APPLICANT') as total_positions
                FROM Users
                WHERE user_type = 'APPLICANT' AND is_active = 1
            `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Error getting applicant statistics: ${error.message}`);
        }
    }
}

module.exports = User;