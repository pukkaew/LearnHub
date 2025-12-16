const User = require('../models/User');
const Department = require('../models/Department');
const Position = require('../models/Position');
const ActivityLog = require('../models/ActivityLog');
const { getTranslation } = require('../utils/languages');

// Helper function to get translation from request
const t = (req, key) => {
    const lang = req.language || req.session?.language || 'th';
    return getTranslation(lang, key);
};

const userController = {
    async getProfile(req, res) {
        try {
            const userId = req.user.user_id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            // Get user learning statistics
            let stats = { completed_courses: 0, in_progress_courses: 0, tests_passed: 0, badges_earned: 0 };
            try {
                stats = await User.getUserStatistics(userId) || stats;
            } catch (e) {
                console.log('Could not load user stats:', e.message);
            }

            const profileData = {
                user_id: user.user_id,
                employee_id: user.employee_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                profile_image: user.profile_image,
                role: user.role,
                role_name: user.role_name,
                department_id: user.department_id,
                department_name: user.department_name,
                position_id: user.position_id,
                position_name: user.position_name,
                last_login: user.last_login,
                created_at: user.created_at,
                // Learning stats
                completed_courses: stats.completed_courses || 0,
                in_progress_courses: stats.in_progress_courses || 0,
                tests_passed: stats.tests_passed || 0,
                badges_earned: stats.badges_earned || 0
            };

            res.json({
                success: true,
                data: profileData
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorLoadingProfile')
            });
        }
    },

    async updateProfile(req, res) {
        try {
            const userId = req.user.user_id;
            const {
                first_name,
                last_name,
                email,
                phone,
                department_id,
                position_id
            } = req.body;

            const oldUser = await User.findById(userId);
            if (!oldUser) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            const updateData = {};
            if (first_name !== undefined) {updateData.first_name = first_name;}
            if (last_name !== undefined) {updateData.last_name = last_name;}
            if (email !== undefined) {updateData.email = email;}
            if (phone !== undefined) {updateData.phone = phone;}
            if (department_id !== undefined) {updateData.department_id = department_id;}
            if (position_id !== undefined) {updateData.position_id = position_id;}

            const result = await User.update(userId, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                userId,
                'Update',
                'users',
                userId,
                {
                    first_name: oldUser.first_name,
                    last_name: oldUser.last_name,
                    email: oldUser.email,
                    phone: oldUser.phone,
                    department_id: oldUser.department_id,
                    position_id: oldUser.position_id
                },
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                'User updated profile'
            );

            // Fetch updated user data
            const updatedUser = await User.findById(userId);

            // Update session with new values
            if (updatedUser) {
                req.session.user.first_name = updatedUser.first_name;
                req.session.user.last_name = updatedUser.last_name;
                if (updatedUser.email) req.session.user.email = updatedUser.email;
                if (updatedUser.phone) req.session.user.phone = updatedUser.phone;
            }

            res.json({
                success: true,
                message: t(req, 'profileUpdatedSuccess'),
                data: updatedUser
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorUpdatingProfile')
            });
        }
    },

    async getAllUsers(req, res) {
        try {
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermission')
                });
            }

            const {
                role,
                department_id,
                is_active,
                search,
                page = 1,
                limit = 20
            } = req.query;

            const filters = {};
            if (role) {filters.role = role;}
            if (department_id) {filters.department_id = department_id;}
            // Handle is_active filter: 'all', '1', '0', undefined
            if (is_active !== undefined) {
                if (is_active === 'all') {
                    filters.is_active = 'all';
                } else if (is_active === '1' || is_active === 'true') {
                    filters.is_active = true;
                } else if (is_active === '0' || is_active === 'false') {
                    filters.is_active = false;
                }
            }
            // else: undefined → default to active only (handled in Model)
            if (search) {filters.search = search;}

            const users = await User.findAll(parseInt(page) || 1, parseInt(limit) || 20, filters);

            await ActivityLog.create({
                user_id: req.user.user_id,
                action: 'View_Users',
                table_name: 'users',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userRole} viewed users list`,
                severity: 'Info',
                module: 'User Management'
            });

            res.json({
                success: true,
                users: users.data || [],
                stats: {
                    total: users.total || 0,
                    active: users.active || 0,
                    pending: users.pending || 0,
                    new_this_month: users.new_this_month || 0
                },
                pagination: {
                    current_page: users.page || 1,
                    per_page: parseInt(limit) || 20,
                    total: users.total || 0,
                    total_pages: users.totalPages || 0
                }
            });

        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorLoadingUsers')
            });
        }
    },

    async getUserById(req, res) {
        try {
            const { user_id } = req.params;
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;
            const requestingUserId = req.user.user_id || req.session.user.user_id;

            if (!['Admin', 'HR'].includes(userRole) && user_id !== requestingUserId) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermission')
                });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            const userData = {
                user_id: user.user_id,
                employee_id: user.employee_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                profile_image: user.profile_image,
                role: user.role_name,  // Use role_name from database
                role_id: user.role_id,
                department_id: user.department_id,
                department_name: user.department_name,
                position_id: user.position_id,
                position_title: user.position_title,
                supervisor_id: user.supervisor_id,
                supervisor_name: user.supervisor_name,
                is_active: user.is_active,
                last_login: user.last_login,
                created_at: user.created_at
            };

            res.json({
                success: true,
                user: userData
            });

        } catch (error) {
            console.error('Get user by id error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorLoadingUserData')
            });
        }
    },

    async createUser(req, res) {
        try {
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermissionCreateUser')
                });
            }

            const {
                employee_id,
                email,
                password,
                first_name,
                last_name,
                phone,
                role,
                user_type,
                branch_id,
                office_id,
                division_id,
                department_id,
                position_id,
                supervisor_id
            } = req.body;

            // Debug: Log received data
            console.log('=== CREATE USER REQUEST ===');
            console.log('user_type:', user_type);
            console.log('role:', role);
            console.log('employee_id:', employee_id);
            console.log('email:', email);
            console.log('first_name:', first_name);
            console.log('last_name:', last_name);

            // Query role_id from database based on role name or user type
            const { poolPromise } = require('../config/database');
            const pool = await poolPromise;

            // Determine the role name to lookup
            let roleName;
            if (user_type === 'applicant') {
                roleName = 'Applicant';
            } else if (role && role.trim()) {
                roleName = role.charAt(0).toUpperCase() + role.slice(1);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Role is required for employee users'
                });
            }

            const roleResult = await pool.request()
                .input('roleName', roleName)
                .query('SELECT role_id FROM Roles WHERE role_name = @roleName');

            if (roleResult.recordset.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Role '${roleName}' not found in database. Please create the role first.`
                });
            }

            const role_id = roleResult.recordset[0].role_id;

            const userData = {
                employee_id,
                email,
                password,
                first_name,
                last_name,
                phone,
                role_id,
                branch_id: branch_id || null,
                office_id: office_id || null,
                division_id: division_id || null,
                department_id: department_id || null,
                position_id: position_id || null,
                supervisor_id: supervisor_id || null,
                is_active: true
            };

            const result = await User.create(userData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                req.user.user_id,
                'Create',
                'users',
                result.userId,
                null,
                userData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `${userRole} created new user: ${employee_id}`
            );

            const responseData = {
                user_id: result.userId,
                employee_id: userData.employee_id,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role_id: userData.role_id
            };

            res.status(201).json({
                success: true,
                message: t(req, 'userCreatedSuccess'),
                data: responseData
            });

        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorCreatingUser')
            });
        }
    },

    async updateUser(req, res) {
        try {
            const { user_id } = req.params;
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermissionEditUser')
                });
            }

            const oldUser = await User.findById(user_id);
            if (!oldUser) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            console.log('Received body:', req.body);
            console.log('Received files:', req.files);

            const {
                employee_id,
                email,
                first_name,
                last_name,
                phone,
                role,
                department_id,
                position_id,
                status
            } = req.body;

            const updateData = {};
            if (employee_id !== undefined && employee_id !== '') {updateData.employee_id = employee_id;}
            if (email !== undefined && email !== '') {updateData.email = email;}
            if (first_name !== undefined && first_name !== '') {updateData.first_name = first_name;}
            if (last_name !== undefined && last_name !== '') {updateData.last_name = last_name;}
            if (phone !== undefined && phone !== '') {updateData.phone = phone;}
            if (role !== undefined && role !== '') {updateData.role = role;}
            if (department_id !== undefined && department_id !== '') {updateData.department_id = department_id || null;}
            if (position_id !== undefined && position_id !== '') {updateData.position_id = position_id || null;}
            if (status !== undefined && status !== '') {
                updateData.is_active = status === 'active';
            }

            console.log('Update data:', updateData);

            const result = await User.update(user_id, updateData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                req.user.user_id,
                'Update',
                'users',
                user_id,
                {
                    employee_id: oldUser.employee_id,
                    email: oldUser.email,
                    first_name: oldUser.first_name,
                    last_name: oldUser.last_name,
                    phone: oldUser.phone,
                    role: oldUser.role,
                    branch_id: oldUser.branch_id,
                    office_id: oldUser.office_id,
                    division_id: oldUser.division_id,
                    department_id: oldUser.department_id,
                    position_id: oldUser.position_id,
                    is_active: oldUser.is_active
                },
                updateData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `${userRole} updated user: ${oldUser.employee_id}`
            );

            res.json({
                success: true,
                message: t(req, 'userUpdatedSuccess'),
                data: result.data
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorUpdatingUser')
            });
        }
    },

    async deactivateUser(req, res) {
        try {
            const { user_id } = req.params;
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermissionDeactivateUser')
                });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            const result = await User.update(user_id, { is_active: false });

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                req.user.user_id,
                'Deactivate',
                'users',
                user_id,
                { is_active: true },
                { is_active: false },
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `${userRole} deactivated user: ${user.employee_id}`
            );

            res.json({
                success: true,
                message: t(req, 'userDeactivatedSuccess')
            });

        } catch (error) {
            console.error('Deactivate user error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorDeactivatingUser')
            });
        }
    },

    async activateUser(req, res) {
        try {
            const { user_id } = req.params;
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermissionActivateUser')
                });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            const result = await User.update(user_id, { is_active: true });

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                req.user.user_id,
                'Activate',
                'users',
                user_id,
                { is_active: false },
                { is_active: true },
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `${userRole} activated user: ${user.employee_id}`
            );

            res.json({
                success: true,
                message: t(req, 'userActivatedSuccess')
            });

        } catch (error) {
            console.error('Activate user error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorActivatingUser')
            });
        }
    },

    async uploadProfileImage(req, res) {
        try {
            const userId = req.user.user_id;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: t(req, 'pleaseSelectImage')
                });
            }

            const imageUrl = `/uploads/profiles/${req.file.filename}`;

            const result = await User.update(userId, { profile_image: imageUrl });

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.create({
                user_id: userId,
                action: 'Update_Profile_Image',
                table_name: 'users',
                record_id: userId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: 'User uploaded profile image',
                severity: 'Info',
                module: 'User Management'
            });

            res.json({
                success: true,
                message: t(req, 'profileImageUploadedSuccess'),
                data: {
                    profile_image: imageUrl
                }
            });

        } catch (error) {
            console.error('Upload profile image error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorUploadingImage')
            });
        }
    },

    async getUserStats(req, res) {
        try {
            const userId = req.user.user_id;

            const stats = await User.getUserStatistics(userId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Get user stats error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorLoadingUserStats')
            });
        }
    },

    async renderProfile(req, res) {
        try {
            const userId = req.user.user_id;
            const user = await User.findById(userId);

            if (!user) {
                return res.render('error', {
                    title: t(req, 'pageNotFound') + ' - Rukchai Hongyen LearnHub',
                    user: req.session.user,
                    message: t(req, 'userNotFound'),
                    error: {}
                });
            }

            const departments = await Department.findAll({ is_active: true });
            const positions = await Position.findAll({ is_active: true });

            res.render('users/profile', {
                title: t(req, 'profile') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                profileData: user,
                departments: departments,
                positions: positions
            });

        } catch (error) {
            console.error('Render profile error:', error);
            res.render('error', {
                title: t(req, 'error') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                error: t(req, 'errorLoadingProfilePage')
            });
        }
    },

    async renderUserManagement(req, res) {
        try {
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.render('error', {
                    title: t(req, 'noAccessPermission') + ' - Rukchai Hongyen LearnHub',
                    user: req.session.user
                });
            }

            const departments = await Department.findAll({ is_active: true });
            const positions = await Position.findAll({ is_active: true });

            res.render('users/index', {
                title: t(req, 'usersManagement') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userRole: userRole,
                departments: departments,
                positions: positions
            });

        } catch (error) {
            console.error('Render user management error:', error);
            res.render('error', {
                title: t(req, 'error') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                error: t(req, 'errorLoadingUserManagementPage')
            });
        }
    },

    async exportUsers(req, res) {
        try {
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'noPermission')
                });
            }

            const {
                role,
                department_id,
                is_active,
                search,
                format = 'excel'
            } = req.query;

            const filters = {};
            if (role) {filters.role = role;}
            if (department_id) {filters.department_id = department_id;}
            if (is_active !== undefined) {filters.is_active = is_active === 'true';}
            if (search) {filters.search = search;}

            // Get all users without pagination for export
            const users = await User.findAll(1, 999999, filters);

            await ActivityLog.create({
                user_id: req.user.user_id,
                action: 'Export_Users',
                table_name: 'users',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.sessionID,
                description: `${userRole} exported users list`,
                severity: 'Info',
                module: 'User Management'
            });

            if (format === 'excel') {
                // Prepare data for Excel export
                const ExcelJS = require('exceljs');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Users');

                // Define columns
                worksheet.columns = [
                    { header: t(req, 'employeeId'), key: 'employee_id', width: 15 },
                    { header: t(req, 'firstName'), key: 'first_name', width: 20 },
                    { header: t(req, 'lastName'), key: 'last_name', width: 20 },
                    { header: t(req, 'emailAddress'), key: 'email', width: 30 },
                    { header: t(req, 'phoneNumber'), key: 'phone', width: 15 },
                    { header: t(req, 'role'), key: 'role', width: 15 },
                    { header: t(req, 'departments'), key: 'department_name', width: 25 },
                    { header: t(req, 'positionName'), key: 'position_title', width: 25 },
                    { header: t(req, 'status'), key: 'is_active', width: 10 },
                    { header: t(req, 'lastLogin'), key: 'last_login', width: 20 }
                ];

                // Add rows
                users.data.forEach(user => {
                    worksheet.addRow({
                        employee_id: user.employee_id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        phone: user.phone || '-',
                        role: user.role,
                        department_name: user.department_name || '-',
                        position_title: user.position_title || '-',
                        is_active: user.is_active ? t(req, 'statusActive') : t(req, 'statusInactive'),
                        last_login: user.last_login ? new Date(user.last_login).toLocaleString('th-TH') : '-'
                    });
                });

                // Style header row
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };

                // Set response headers
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=users_export_${Date.now()}.xlsx`);

                // Write to response
                await workbook.xlsx.write(res);
                res.end();
            } else {
                // Return JSON format
                res.json({
                    success: true,
                    data: users.data || []
                });
            }

        } catch (error) {
            console.error('Export users error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorExportingUsers')
            });
        }
    },

    async renderViewUser(req, res) {
        try {
            const { user_id } = req.params;
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.redirect('/dashboard');
            }

            const user = await User.findById(user_id);
            if (!user) {
                req.flash('error_msg', t(req, 'userNotFound'));
                return res.redirect('/users');
            }

            res.render('users/view', {
                title: t(req, 'userDetails') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userData: user,
                t: (key) => t(req, key)
            });

        } catch (error) {
            console.error('Render view user error:', error);
            req.flash('error_msg', t(req, 'errorLoadingUser'));
            res.redirect('/users');
        }
    },

    async renderEditUser(req, res) {
        try {
            const { user_id } = req.params;
            const userRole = req.user.role_name || req.user.role || req.session.user.role_name || req.session.user.role;

            if (!['Admin', 'HR'].includes(userRole)) {
                return res.redirect('/dashboard');
            }

            const user = await User.findById(user_id);
            if (!user) {
                req.flash('error_msg', t(req, 'userNotFound'));
                return res.redirect('/users');
            }

            // Debug: Check user data
            console.log('=== EDIT USER DEBUG ===');
            console.log('User ID:', user_id);
            console.log('User role_name:', user.role_name);
            console.log('User role_id:', user.role_id);
            console.log('Full user object keys:', Object.keys(user));

            res.render('users/edit', {
                title: t(req, 'editUser') + ' - Rukchai Hongyen LearnHub',
                user: req.session.user,
                userData: user,
                t: (key) => t(req, key)
            });

        } catch (error) {
            console.error('Render edit user error:', error);
            req.flash('error_msg', t(req, 'errorLoadingUser'));
            res.redirect('/users');
        }
    },

    async resetPassword(req, res) {
        try {
            const { user_id } = req.params;
            const currentUser = req.user || req.session.user;

            // Check if user has permission
            const userRole = currentUser.role_name || currentUser.role;
            if (!['Admin', 'HR'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'accessDenied')
                });
            }

            // Check if user exists
            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
            }

            // Generate temporary password (8 characters: letters and numbers)
            const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

            // Update password
            const result = await User.updatePassword(user_id, tempPassword);

            if (result.success) {
                // Log the activity
                await ActivityLog.logSecurityEvent(
                    currentUser.user_id,
                    'Password_Reset',
                    `Password reset for user: ${user.username}`,
                    'Info',
                    req.ip,
                    req.get('user-agent'),
                    req.sessionID
                );

                res.json({
                    success: true,
                    message: t(req, 'passwordResetSuccess'),
                    tempPassword: tempPassword // In production, this should be sent via email
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: t(req, 'passwordResetFailed')
                });
            }

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorResettingPassword')
            });
        }
    },

    async getUserActivity(req, res) {
        try {
            const { user_id } = req.params;
            const currentUser = req.user || req.session.user;

            // Check if user has permission to view activity
            const userRole = currentUser.role_name || currentUser.role;
            const currentUserId = currentUser.user_id;

            // Users can only view their own activity unless they're Admin or HR
            if (!['Admin', 'HR'].includes(userRole) && parseInt(user_id) !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    message: t(req, 'accessDenied')
                });
            }

            // Get query parameters for filtering
            const filters = {
                action: req.query.action,
                module: req.query.module,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };

            // Get user activity logs
            const activities = await ActivityLog.findByUser(parseInt(user_id), filters);

            // Get activity summary
            const summary = await ActivityLog.getActivitySummary(parseInt(user_id), 30);

            res.json({
                success: true,
                data: {
                    activities,
                    summary,
                    total: activities.length
                }
            });

        } catch (error) {
            console.error('Get user activity error:', error);
            res.status(500).json({
                success: false,
                message: t(req, 'errorLoadingActivity')
            });
        }
    },

    async getInstructors(req, res) {
        try {
            const { poolPromise, sql } = require('../config/database');
const { t } = require('../utils/languages');
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT DISTINCT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.profile_image,
                    p.position_name,
                    ou.unit_name_th as department_name,
                    r.role_name
                FROM users u
                LEFT JOIN user_roles r ON u.role_id = r.role_id
                LEFT JOIN Positions p ON u.position_id = p.position_id
                LEFT JOIN OrganizationUnits ou ON u.unit_id = ou.unit_id
                WHERE r.role_name IN ('Admin', 'Instructor')
                    AND u.is_active = 1
                ORDER BY u.first_name, u.last_name
            `);

            res.json({
                success: true,
                data: result.recordset
            });

        } catch (error) {
            console.error('Get instructors error:', error);
            res.status(500).json({
                success: false,
                message: req.t('errorLoadingInstructorList')
            });
        }
    }
};

module.exports = userController;