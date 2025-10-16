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
                hire_date: user.hire_date,
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

            const offset = (parseInt(page) - 1) * parseInt(limit);
            filters.limit = parseInt(limit);
            filters.offset = offset;

            const users = await User.findAll(filters);

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
                data: users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: users.length
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
                hire_date: user.hire_date,
                is_active: user.is_active,
                last_login: user.last_login,
                created_at: user.created_at
            };

            res.json({
                success: true,
                data: userData
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
                supervisor_id,
                hire_date
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
                hire_date,
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

            const {
                employee_id,
                email,
                first_name,
                last_name,
                phone,
                role,
                department_id,
                position_id,
                supervisor_id,
                hire_date,
                is_active
            } = req.body;

            const updateData = {};
            if (employee_id !== undefined) {updateData.employee_id = employee_id;}
            if (email !== undefined) {updateData.email = email;}
            if (first_name !== undefined) {updateData.first_name = first_name;}
            if (last_name !== undefined) {updateData.last_name = last_name;}
            if (phone !== undefined) {updateData.phone = phone;}
            if (role !== undefined) {updateData.role = role;}
            if (department_id !== undefined) {updateData.department_id = department_id;}
            if (position_id !== undefined) {updateData.position_id = position_id;}
            if (supervisor_id !== undefined) {updateData.supervisor_id = supervisor_id;}
            if (hire_date !== undefined) {updateData.hire_date = hire_date;}
            if (is_active !== undefined) {updateData.is_active = is_active;}

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
                    department_id: oldUser.department_id,
                    position_id: oldUser.position_id,
                    supervisor_id: oldUser.supervisor_id,
                    hire_date: oldUser.hire_date,
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

            if (userRole !== 'Admin') {
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

            const result = await User.deactivate(user_id);

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
                `Admin deactivated user: ${user.employee_id}`
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
                title: 'โปรไฟล์ - Rukchai Hongyen LearnHub',
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
    }
};

module.exports = userController;