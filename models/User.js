const { poolPromise, sql } = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class User {
    constructor(data) {
        this.user_id = data.user_id;
        this.employee_id = data.employee_id;
        this.username = data.username;
        this.email = data.email;
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.first_name_en = data.first_name_en;
        this.last_name_en = data.last_name_en;
        this.department_id = data.department_id;
        this.position_id = data.position_id;
        this.role_id = data.role_id;
        this.supervisor_id = data.supervisor_id;
        this.phone_internal = data.phone_internal;
        this.phone_mobile = data.phone_mobile;
        this.line_id = data.line_id;
        this.profile_image = data.profile_image;
        this.hire_date = data.hire_date;
        this.is_active = data.is_active;
    }

    // Find user by ID
    static async findById(userId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT u.*,
                           r.role_name,
                           d.department_name,
                           p.position_name,
                           CONCAT(s.first_name, ' ', s.last_name) as supervisor_name
                    FROM Users u
                    LEFT JOIN Roles r ON u.role_id = r.role_id
                    LEFT JOIN Departments d ON u.department_id = d.department_id
                    LEFT JOIN Positions p ON u.position_id = p.position_id
                    LEFT JOIN Users s ON u.supervisor_id = s.user_id
                    WHERE u.user_id = @userId AND u.is_active = 1
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
            const userId = uuidv4();
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Generate username from employee ID if not provided
            const username = userData.username || userData.employee_id;

            const result = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .input('employeeId', sql.NVarChar(20), userData.employee_id)
                .input('username', sql.NVarChar(50), username)
                .input('passwordHash', sql.NVarChar(255), hashedPassword)
                .input('email', sql.NVarChar(100), userData.email)
                .input('firstName', sql.NVarChar(100), userData.first_name)
                .input('lastName', sql.NVarChar(100), userData.last_name)
                .input('firstNameEn', sql.NVarChar(100), userData.first_name_en || null)
                .input('lastNameEn', sql.NVarChar(100), userData.last_name_en || null)
                .input('departmentId', sql.UniqueIdentifier, userData.department_id || null)
                .input('positionId', sql.UniqueIdentifier, userData.position_id || null)
                .input('roleId', sql.UniqueIdentifier, userData.role_id)
                .input('supervisorId', sql.UniqueIdentifier, userData.supervisor_id || null)
                .input('phoneInternal', sql.NVarChar(20), userData.phone_internal || null)
                .input('phoneMobile', sql.NVarChar(20), userData.phone_mobile || null)
                .input('lineId', sql.NVarChar(50), userData.line_id || null)
                .input('hireDate', sql.Date, userData.hire_date || null)
                .input('createdBy', sql.UniqueIdentifier, userData.created_by || null)
                .query(`
                    INSERT INTO Users (
                        user_id, employee_id, username, password_hash, email,
                        first_name, last_name, first_name_en, last_name_en,
                        department_id, position_id, role_id, supervisor_id,
                        phone_internal, phone_mobile, line_id, hire_date,
                        created_by, created_date, is_active, must_change_password
                    ) VALUES (
                        @userId, @employeeId, @username, @passwordHash, @email,
                        @firstName, @lastName, @firstNameEn, @lastNameEn,
                        @departmentId, @positionId, @roleId, @supervisorId,
                        @phoneInternal, @phoneMobile, @lineId, @hireDate,
                        @createdBy, GETDATE(), 1, 1
                    )
                `);

            return { success: true, userId: userId };
        } catch (error) {
            if (error.message.includes('Violation of UNIQUE KEY')) {
                if (error.message.includes('employee_id')) {
                    throw new Error('Employee ID already exists');
                }
                if (error.message.includes('username')) {
                    throw new Error('Username already exists');
                }
                if (error.message.includes('email')) {
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
                .input('userId', sql.UniqueIdentifier, userId)
                .input('modifiedBy', sql.UniqueIdentifier, updateData.modified_by || null);

            // Add fields to update dynamically
            if (updateData.email !== undefined) {
                updateFields.push('email = @email');
                request.input('email', sql.NVarChar(100), updateData.email);
            }
            if (updateData.first_name !== undefined) {
                updateFields.push('first_name = @firstName');
                request.input('firstName', sql.NVarChar(100), updateData.first_name);
            }
            if (updateData.last_name !== undefined) {
                updateFields.push('last_name = @lastName');
                request.input('lastName', sql.NVarChar(100), updateData.last_name);
            }
            if (updateData.department_id !== undefined) {
                updateFields.push('department_id = @departmentId');
                request.input('departmentId', sql.UniqueIdentifier, updateData.department_id);
            }
            if (updateData.position_id !== undefined) {
                updateFields.push('position_id = @positionId');
                request.input('positionId', sql.UniqueIdentifier, updateData.position_id);
            }
            if (updateData.phone_internal !== undefined) {
                updateFields.push('phone_internal = @phoneInternal');
                request.input('phoneInternal', sql.NVarChar(20), updateData.phone_internal);
            }
            if (updateData.phone_mobile !== undefined) {
                updateFields.push('phone_mobile = @phoneMobile');
                request.input('phoneMobile', sql.NVarChar(20), updateData.phone_mobile);
            }
            if (updateData.line_id !== undefined) {
                updateFields.push('line_id = @lineId');
                request.input('lineId', sql.NVarChar(50), updateData.line_id);
            }
            if (updateData.profile_image !== undefined) {
                updateFields.push('profile_image = @profileImage');
                request.input('profileImage', sql.NVarChar(500), updateData.profile_image);
            }

            if (updateFields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            updateFields.push('modified_date = GETDATE()');
            updateFields.push('modified_by = @modifiedBy');
            updateFields.push('version = version + 1');

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

    // Update password
    static async updatePassword(userId, oldPassword, newPassword) {
        try {
            const pool = await poolPromise;

            // First verify old password
            const user = await this.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isValidPassword) {
                return { success: false, message: 'Current password is incorrect' };
            }

            // Check password history (last 5 passwords)
            const historyResult = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .query(`
                    SELECT TOP 5 old_value
                    FROM AuditLog
                    WHERE table_name = 'Users'
                    AND record_id = @userId
                    AND action = 'UPDATE'
                    AND old_value LIKE '%password_hash%'
                    ORDER BY changed_date DESC
                `);

            // Check if new password matches any of the last 5
            for (const record of historyResult.recordset) {
                if (record.old_value) {
                    try {
                        const oldData = JSON.parse(record.old_value);
                        if (oldData.password_hash && await bcrypt.compare(newPassword, oldData.password_hash)) {
                            return { success: false, message: 'Password cannot be the same as last 5 passwords' };
                        }
                    } catch (e) {
                        // Skip if JSON parse fails
                    }
                }
            }

            // Update password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const result = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .input('passwordHash', sql.NVarChar(255), hashedPassword)
                .query(`
                    UPDATE Users
                    SET password_hash = @passwordHash,
                        password_changed_date = GETDATE(),
                        must_change_password = 0,
                        modified_date = GETDATE()
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

    // Verify password
    static async verifyPassword(username, password) {
        try {
            const user = await this.findByUsername(username);
            if (!user) {
                return { success: false, message: 'Invalid username or password' };
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                // Update failed login count
                const pool = await poolPromise;
                await pool.request()
                    .input('username', sql.NVarChar(50), username)
                    .query(`
                        UPDATE Users
                        SET failed_login_count = failed_login_count + 1,
                            account_locked = CASE
                                WHEN failed_login_count >= 4 THEN 1
                                ELSE account_locked
                            END,
                            account_locked_until = CASE
                                WHEN failed_login_count >= 4 THEN DATEADD(minute, 30, GETDATE())
                                ELSE account_locked_until
                            END
                        WHERE username = @username
                    `);

                return { success: false, message: 'Invalid username or password' };
            }

            // Check if account is locked
            if (user.account_locked) {
                if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
                    return { success: false, message: 'Account is locked. Please try again later.' };
                }
                // Unlock if time has passed
                const pool = await poolPromise;
                await pool.request()
                    .input('userId', sql.UniqueIdentifier, user.user_id)
                    .query(`
                        UPDATE Users
                        SET account_locked = 0,
                            account_locked_until = NULL,
                            failed_login_count = 0
                        WHERE user_id = @userId
                    `);
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
                .input('userId', sql.UniqueIdentifier, userId)
                .query(`
                    UPDATE Users
                    SET last_login_date = GETDATE(),
                        login_count = login_count + 1,
                        failed_login_count = 0,
                        account_locked = 0,
                        account_locked_until = NULL
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

            let whereClause = 'WHERE u.is_active = 1';
            const request = pool.request()
                .input('offset', sql.Int, offset)
                .input('limit', sql.Int, limit);

            // Add filters
            if (filters.department_id) {
                whereClause += ' AND u.department_id = @departmentId';
                request.input('departmentId', sql.UniqueIdentifier, filters.department_id);
            }
            if (filters.position_id) {
                whereClause += ' AND u.position_id = @positionId';
                request.input('positionId', sql.UniqueIdentifier, filters.position_id);
            }
            if (filters.role_id) {
                whereClause += ' AND u.role_id = @roleId';
                request.input('roleId', sql.UniqueIdentifier, filters.role_id);
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
                ORDER BY u.created_date DESC
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
    static async delete(userId, deletedBy) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .input('deletedBy', sql.UniqueIdentifier, deletedBy)
                .query(`
                    UPDATE Users
                    SET is_active = 0,
                        modified_by = @deletedBy,
                        modified_date = GETDATE()
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

    // Get user's subordinates
    static async getSubordinates(supervisorId) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .input('supervisorId', sql.UniqueIdentifier, supervisorId)
                .query(`
                    SELECT u.*,
                           r.role_name,
                           d.department_name,
                           p.position_name
                    FROM Users u
                    LEFT JOIN Roles r ON u.role_id = r.role_id
                    LEFT JOIN Departments d ON u.department_id = d.department_id
                    LEFT JOIN Positions p ON u.position_id = p.position_id
                    WHERE u.supervisor_id = @supervisorId AND u.is_active = 1
                    ORDER BY u.first_name, u.last_name
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Error fetching subordinates: ${error.message}`);
        }
    }

    // Request password reset
    static async requestPasswordReset(email) {
        try {
            const pool = await poolPromise;
            const resetToken = uuidv4();
            const expires = new Date(Date.now() + 3600000); // 1 hour

            const result = await pool.request()
                .input('email', sql.NVarChar(100), email)
                .input('resetToken', sql.NVarChar(255), resetToken)
                .input('expires', sql.DateTime, expires)
                .query(`
                    UPDATE Users
                    SET password_reset_token = @resetToken,
                        password_reset_expires = @expires
                    WHERE email = @email AND is_active = 1
                `);

            if (result.rowsAffected[0] > 0) {
                return { success: true, token: resetToken };
            }

            return { success: false, message: 'Email not found' };
        } catch (error) {
            throw new Error(`Error requesting password reset: ${error.message}`);
        }
    }

    // Reset password with token
    static async resetPasswordWithToken(token, newPassword) {
        try {
            const pool = await poolPromise;

            // Check if token is valid
            const userResult = await pool.request()
                .input('token', sql.NVarChar(255), token)
                .query(`
                    SELECT user_id
                    FROM Users
                    WHERE password_reset_token = @token
                    AND password_reset_expires > GETDATE()
                    AND is_active = 1
                `);

            if (userResult.recordset.length === 0) {
                return { success: false, message: 'Invalid or expired reset token' };
            }

            const userId = userResult.recordset[0].user_id;
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password and clear reset token
            const result = await pool.request()
                .input('userId', sql.UniqueIdentifier, userId)
                .input('passwordHash', sql.NVarChar(255), hashedPassword)
                .query(`
                    UPDATE Users
                    SET password_hash = @passwordHash,
                        password_reset_token = NULL,
                        password_reset_expires = NULL,
                        password_changed_date = GETDATE(),
                        must_change_password = 0,
                        modified_date = GETDATE()
                    WHERE user_id = @userId
                `);

            return {
                success: result.rowsAffected[0] > 0,
                message: result.rowsAffected[0] > 0 ? 'Password reset successfully' : 'Failed to reset password'
            };
        } catch (error) {
            throw new Error(`Error resetting password: ${error.message}`);
        }
    }
}

module.exports = User;