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
            const userId = req.user.userId;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: t(req, 'userNotFound')
                });
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
                department_id: user.department_id,
                department_name: user.department_name,
                position_id: user.position_id,
                position_title: user.position_title,
                last_login: user.last_login,
                created_at: user.created_at
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
            const userId = req.user.userId;
            const {
                first_name,
                last_name,
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

            req.session.user.first_name = result.data.first_name;
            req.session.user.last_name = result.data.last_name;

            res.json({
                success: true,
                message: t(req, 'profileUpdatedSuccess'),
                data: result.data
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
            if (is_active !== undefined) {filters.is_active = is_active === 'true';}
            if (search) {filters.search = search;}

            const users = await User.findAll(parseInt(page) || 1, parseInt(limit) || 20, filters);

            await ActivityLog.create({
                user_id: req.user.userId,
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
            const requestingUserId = req.user.user_id || req.user.userId || req.session.user.user_id;

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
                role: user.role,
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
                department_id,
                position_id,
                supervisor_id
            } = req.body;

            const userData = {
                employee_id,
                email,
                password,
                first_name,
                last_name,
                phone,
                role,
                department_id,
                position_id,
                supervisor_id,
                is_active: true
            };

            const result = await User.create(userData);

            if (!result.success) {
                return res.status(400).json(result);
            }

            await ActivityLog.logDataChange(
                req.user.userId,
                'Create',
                'users',
                result.data.user_id,
                null,
                userData,
                req.ip,
                req.get('User-Agent'),
                req.sessionID,
                `${userRole} created new user: ${employee_id}`
            );

            const responseData = {
                user_id: result.data.user_id,
                employee_id: result.data.employee_id,
                email: result.data.email,
                first_name: result.data.first_name,
                last_name: result.data.last_name,
                role: result.data.role
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
                req.user.userId,
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
                req.user.userId,
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
                req.user.userId,
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
            const userId = req.user.userId;

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
            const userId = req.user.userId;

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
            const userId = req.user.userId;
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
                user_id: req.user.userId,
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
                    currentUser.userId || currentUser.user_id,
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
            const currentUserId = currentUser.userId || currentUser.user_id;

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
    }
};

module.exports = userController;