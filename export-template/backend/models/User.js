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
                .input('employeeId', sql.NVarChar(50), employeeId)
                .query(`
                    SELECT u.*, r.role_name
                    FROM Users u
                    JOIN Roles r ON u.role_id = r.role_id
                    WHERE (u.employee_id = @employeeId OR u.username = @employeeId) AND u.is_active = 1
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
                .input('departmentId', sql.Int, userData.department_id || null)
                .input('positionId', sql.Int, userData.position_id || null)
                .input('roleId', sql.Int, userData.role_id)
                .input('phone', sql.NVarChar(20), userData.phone || null)
                .query(`
                    INSERT INTO Users (
                        employee_id, username, password, email,
                        first_name, last_name,
                        department_id, position_id, role_id,
                        phone, is_active, email_verified, created_at, password_changed_at
                    )
                    OUTPUT INSERTED.user_id
                    VALUES (
                        @employeeId, @username, @password, @email,
                        @firstName, @lastName,
                        @departmentId, @positionId, @roleId,
                        @phone, 1, 0, GETDATE(), GETDATE()
                    )
                `);

            const insertedUserId = result.recordset[0]?.user_id;
            return { success: true, userId: insertedUserId };
        } catch (error) {
            if (error.message.includes('Violation of UNIQUE KEY') || error.message.includes('duplicate key')) {
                const message = error.message.toLowerCase();
                if (message.includes('employee_id')) {
                    throw new Error('Employee ID already exists');
                }
                if (message.includes('username')) {
                    throw new Error('Username already exists');
                }
                if (message.includes('email')) {
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

    // Update password
    static async updatePassword(userId, newPassword) {
        try {
            const pool = await poolPromise;
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

            let whereClause = 'WHERE 1=1';
            if (filters.is_active === undefined || filters.is_active === true || filters.is_active === '1') {
                whereClause += ' AND u.is_active = 1';
            } else if (filters.is_active === false || filters.is_active === '0') {
                whereClause += ' AND u.is_active = 0';
            }

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
}

module.exports = User;
