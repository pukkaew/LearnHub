const sql = require('mssql');
const database = require('../config/database');

class Department {
    static async create(departmentData) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('name', sql.NVarChar(255), departmentData.name)
                .input('code', sql.VarChar(50), departmentData.code)
                .input('description', sql.NText, departmentData.description)
                .input('manager_id', sql.UniqueIdentifier, departmentData.manager_id)
                .input('parent_department_id', sql.UniqueIdentifier, departmentData.parent_department_id)
                .input('location', sql.NVarChar(255), departmentData.location)
                .input('cost_center', sql.VarChar(50), departmentData.cost_center)
                .input('budget', sql.Decimal(15, 2), departmentData.budget)
                .input('is_active', sql.Bit, departmentData.is_active !== undefined ? departmentData.is_active : true)
                .input('created_by', sql.UniqueIdentifier, departmentData.created_by)
                .query(`
                    INSERT INTO Departments
                    (department_name, department_code, department_description, manager_id, parent_department_id,
                     location, cost_center, budget, is_active, created_by)
                    OUTPUT INSERTED.*
                    VALUES
                    (@name, @code, @description, @manager_id, @parent_department_id,
                     @location, @cost_center, @budget, @is_active, @created_by)
                `);

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error creating department:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Department code already exists' };
            }
            return { success: false, message: 'Failed to create department' };
        }
    }

    static async findById(departmentId) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query(`
                    SELECT d.*,
                           m.first_name + ' ' + m.last_name as manager_name,
                           p.name as parent_department_name,
                           c.first_name + ' ' + c.last_name as created_by_name
                    FROM Departments d
                    LEFT JOIN Users m ON d.manager_id = m.user_id
                    LEFT JOIN Departments p ON d.parent_department_id = p.department_id
                    LEFT JOIN Users c ON d.created_by = c.user_id
                    WHERE d.department_id = @department_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error finding department:', error);
            return null;
        }
    }

    static async findAll(filters = {}) {
        try {
            const pool = await database.getConnection();
            let query = `
                SELECT d.*,
                       m.first_name + ' ' + m.last_name as manager_name,
                       p.name as parent_department_name,
                       (SELECT COUNT(*) FROM Users u WHERE u.department_id = d.department_id AND u.is_active = 1) as employee_count,
                       (SELECT COUNT(*) FROM JobPositions jp WHERE jp.department_id = d.department_id AND jp.is_active = 1) as position_count
                FROM Departments d
                LEFT JOIN Users m ON d.manager_id = m.user_id
                LEFT JOIN Departments p ON d.parent_department_id = p.department_id
                WHERE 1=1
            `;

            const request = pool.request();

            if (filters.is_active !== undefined) {
                query += ' AND d.is_active = @is_active';
                request.input('is_active', sql.Bit, filters.is_active);
            }

            if (filters.parent_department_id) {
                query += ' AND d.parent_department_id = @parent_department_id';
                request.input('parent_department_id', sql.UniqueIdentifier, filters.parent_department_id);
            }

            if (filters.manager_id) {
                query += ' AND d.manager_id = @manager_id';
                request.input('manager_id', sql.UniqueIdentifier, filters.manager_id);
            }

            if (filters.search) {
                query += ' AND (d.name LIKE @search OR d.code LIKE @search OR d.description LIKE @search)';
                request.input('search', sql.NVarChar(255), `%${filters.search}%`);
            }

            query += ' ORDER BY d.name';

            const result = await request.query(query);
            return result.recordset;
        } catch (error) {
            console.error('Error finding Departments:', error);
            return [];
        }
    }

    static async update(departmentId, updateData) {
        try {
            const pool = await database.getConnection();

            let setClause = [];
            const request = pool.request().input('department_id', sql.UniqueIdentifier, departmentId);

            const allowedFields = [
                'name', 'code', 'description', 'manager_id', 'parent_department_id',
                'location', 'cost_center', 'budget', 'is_active'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    setClause.push(`${field} = @${field}`);

                    if (field === 'name' || field === 'location') {
                        request.input(field, sql.NVarChar(255), updateData[field]);
                    } else if (field === 'code' || field === 'cost_center') {
                        request.input(field, sql.VarChar(50), updateData[field]);
                    } else if (field === 'description') {
                        request.input(field, sql.NText, updateData[field]);
                    } else if (field === 'manager_id' || field === 'parent_department_id') {
                        request.input(field, sql.UniqueIdentifier, updateData[field]);
                    } else if (field === 'budget') {
                        request.input(field, sql.Decimal(15, 2), updateData[field]);
                    } else if (field === 'is_active') {
                        request.input(field, sql.Bit, updateData[field]);
                    }
                }
            });

            if (setClause.length === 0) {
                return { success: false, message: 'No valid fields to update' };
            }

            setClause.push('updated_at = GETDATE()');

            const result = await request.query(`
                UPDATE Departments
                SET ${setClause.join(', ')}
                OUTPUT INSERTED.*
                WHERE department_id = @department_id
            `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Department not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error updating department:', error);
            if (error.number === 2627) {
                return { success: false, message: 'Department code already exists' };
            }
            return { success: false, message: 'Failed to update department' };
        }
    }

    static async delete(departmentId) {
        try {
            const pool = await database.getConnection();

            const employeeCheck = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query('SELECT COUNT(*) as count FROM Users WHERE department_id = @department_id');

            if (employeeCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete department with existing employees' };
            }

            const positionCheck = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query('SELECT COUNT(*) as count FROM JobPositions WHERE department_id = @department_id');

            if (positionCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete department with existing positions' };
            }

            const childCheck = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query('SELECT COUNT(*) as count FROM Departments WHERE parent_department_id = @department_id');

            if (childCheck.recordset[0].count > 0) {
                return { success: false, message: 'Cannot delete department with child Departments' };
            }

            const result = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query('DELETE FROM Departments WHERE department_id = @department_id');

            if (result.rowsAffected[0] === 0) {
                return { success: false, message: 'Department not found' };
            }

            return { success: true, message: 'Department deleted successfully' };
        } catch (error) {
            console.error('Error deleting department:', error);
            return { success: false, message: 'Failed to delete department' };
        }
    }

    static async getDepartmentHierarchy() {
        try {
            const pool = await database.getConnection();

            const result = await pool.request().query(`
                WITH DepartmentHierarchy AS (
                    SELECT
                        department_id,
                        name,
                        code,
                        parent_department_id,
                        0 as level,
                        CAST(name AS NVARCHAR(1000)) as path
                    FROM Departments
                    WHERE parent_department_id IS NULL AND is_active = 1

                    UNION ALL

                    SELECT
                        d.department_id,
                        d.name,
                        d.code,
                        d.parent_department_id,
                        dh.level + 1,
                        CAST(dh.path + ' > ' + d.name AS NVARCHAR(1000))
                    FROM Departments d
                    INNER JOIN DepartmentHierarchy dh ON d.parent_department_id = dh.department_id
                    WHERE d.is_active = 1
                )
                SELECT
                    dh.*,
                    d.manager_id,
                    m.first_name + ' ' + m.last_name as manager_name,
                    (SELECT COUNT(*) FROM Users u WHERE u.department_id = dh.department_id AND u.is_active = 1) as employee_count
                FROM DepartmentHierarchy dh
                LEFT JOIN Departments d ON dh.department_id = d.department_id
                LEFT JOIN Users m ON d.manager_id = m.user_id
                ORDER BY dh.path
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department hierarchy:', error);
            return [];
        }
    }

    static async getDepartmentEmployees(departmentId, includeSubDepartments = false) {
        try {
            const pool = await database.getConnection();

            let query = `
                SELECT u.user_id, u.employee_id, u.first_name, u.last_name, u.email,
                       u.role, u.position, u.hire_date, u.is_active,
                       d.name as department_name
                FROM Users u
                LEFT JOIN Departments d ON u.department_id = d.department_id
            `;

            const request = pool.request();

            if (includeSubDepartments) {
                query += `
                    WHERE u.department_id IN (
                        WITH DeptHierarchy AS (
                            SELECT department_id FROM Departments WHERE department_id = @department_id
                            UNION ALL
                            SELECT d.department_id FROM Departments d
                            INNER JOIN DeptHierarchy dh ON d.parent_department_id = dh.department_id
                        )
                        SELECT department_id FROM DeptHierarchy
                    )
                `;
            } else {
                query += ' WHERE u.department_id = @department_id';
            }

            query += ' ORDER BY u.last_name, u.first_name';

            const result = await request
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query(query);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department employees:', error);
            return [];
        }
    }

    static async getDepartmentStatistics(departmentId) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .query(`
                    SELECT
                        d.name as department_name,
                        COUNT(u.user_id) as total_employees,
                        COUNT(CASE WHEN u.is_active = 1 THEN 1 END) as active_employees,
                        COUNT(CASE WHEN u.role = 'Manager' THEN 1 END) as managers,
                        COUNT(CASE WHEN u.role = 'Instructor' THEN 1 END) as instructors,
                        COUNT(CASE WHEN u.role = 'Learner' THEN 1 END) as learners,
                        COUNT(jp.position_id) as total_positions,
                        COUNT(CASE WHEN jp.is_active = 1 THEN 1 END) as active_positions,
                        COUNT(a.applicant_id) as total_applicants,
                        AVG(CASE WHEN ta.total_score IS NOT NULL THEN ta.total_score END) as avg_test_score
                    FROM Departments d
                    LEFT JOIN Users u ON d.department_id = u.department_id
                    LEFT JOIN JobPositions jp ON d.department_id = jp.department_id
                    LEFT JOIN Applicants a ON jp.position_id = a.position_id
                    LEFT JOIN TestAttempts ta ON a.applicant_id = ta.applicant_id
                    WHERE d.department_id = @department_id
                    GROUP BY d.department_id, d.name
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error getting department statistics:', error);
            return null;
        }
    }

    static async findTopLevelDepartments() {
        try {
            const pool = await database.getConnection();

            const result = await pool.request().query(`
                SELECT d.*,
                       m.first_name + ' ' + m.last_name as manager_name,
                       (SELECT COUNT(*) FROM Departments child WHERE child.parent_department_id = d.department_id) as child_count,
                       (SELECT COUNT(*) FROM Users u WHERE u.department_id = d.department_id AND u.is_active = 1) as employee_count
                FROM Departments d
                LEFT JOIN Users m ON d.manager_id = m.user_id
                WHERE d.parent_department_id IS NULL AND d.is_active = 1
                ORDER BY d.name
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding top level Departments:', error);
            return [];
        }
    }

    static async findChildDepartments(parentDepartmentId) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('parent_department_id', sql.UniqueIdentifier, parentDepartmentId)
                .query(`
                    SELECT d.*,
                           m.first_name + ' ' + m.last_name as manager_name,
                           (SELECT COUNT(*) FROM Departments child WHERE child.parent_department_id = d.department_id) as child_count,
                           (SELECT COUNT(*) FROM Users u WHERE u.department_id = d.department_id AND u.is_active = 1) as employee_count
                    FROM Departments d
                    LEFT JOIN Users m ON d.manager_id = m.user_id
                    WHERE d.parent_department_id = @parent_department_id AND d.is_active = 1
                    ORDER BY d.name
                `);

            return result.recordset;
        } catch (error) {
            console.error('Error finding child Departments:', error);
            return [];
        }
    }

    static async validateDepartmentCode(code, excludeDepartmentId = null) {
        try {
            const pool = await database.getConnection();
            const request = pool.request()
                .input('code', sql.VarChar(50), code);

            let query = 'SELECT department_id FROM Departments WHERE code = @code';

            if (excludeDepartmentId) {
                query += ' AND department_id != @exclude_department_id';
                request.input('exclude_department_id', sql.UniqueIdentifier, excludeDepartmentId);
            }

            const result = await request.query(query);
            return result.recordset.length === 0;
        } catch (error) {
            console.error('Error validating department code:', error);
            return false;
        }
    }

    static async getDepartmentBudgetSummary() {
        try {
            const pool = await database.getConnection();

            const result = await pool.request().query(`
                SELECT
                    d.name as department_name,
                    d.budget,
                    COUNT(u.user_id) as employee_count,
                    CASE
                        WHEN COUNT(u.user_id) > 0 THEN d.budget / COUNT(u.user_id)
                        ELSE 0
                    END as budget_per_employee,
                    (SELECT SUM(budget) FROM Departments child WHERE child.parent_department_id = d.department_id) as child_departments_budget
                FROM Departments d
                LEFT JOIN Users u ON d.department_id = u.department_id AND u.is_active = 1
                WHERE d.is_active = 1 AND d.budget IS NOT NULL
                GROUP BY d.department_id, d.name, d.budget
                ORDER BY d.budget DESC
            `);

            return result.recordset;
        } catch (error) {
            console.error('Error getting department budget summary:', error);
            return [];
        }
    }

    static async updateManager(departmentId, managerId) {
        try {
            const pool = await database.getConnection();

            const result = await pool.request()
                .input('department_id', sql.UniqueIdentifier, departmentId)
                .input('manager_id', sql.UniqueIdentifier, managerId)
                .query(`
                    UPDATE Departments
                    SET manager_id = @manager_id, updated_at = GETDATE()
                    OUTPUT INSERTED.*
                    WHERE department_id = @department_id
                `);

            if (result.recordset.length === 0) {
                return { success: false, message: 'Department not found' };
            }

            return { success: true, data: result.recordset[0] };
        } catch (error) {
            console.error('Error updating department manager:', error);
            return { success: false, message: 'Failed to update department manager' };
        }
    }
}

module.exports = Department;