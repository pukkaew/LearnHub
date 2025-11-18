const JWTUtils = require('../utils/jwtUtils');
const { poolPromise } = require('../config/database');
const ActivityLog = require('../models/ActivityLog');

class JWTAuthMiddleware {
    // Verify JWT token middleware
    static async verifyToken(req, res, next) {
        try {
            // Extract token from header or cookie
            let token = JWTUtils.extractTokenFromHeader(req.get('Authorization'));

            // Fallback to cookie if no Authorization header
            if (!token && req.cookies && req.cookies.accessToken) {
                token = req.cookies.accessToken;
            }

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่',
                    error: 'NO_TOKEN'
                });
            }

            // Verify token
            const decoded = JWTUtils.verifyAccessToken(token);

            // Fetch user data from database to ensure user still exists and is active
            const pool = await poolPromise;
            const result = await pool.request()
                .input('userId', decoded.userId)
                .query(`
                    SELECT
                        u.userId,
                        u.email,
                        u.firstName,
                        u.lastName,
                        u.role,
                        u.departmentId,
                        u.isActive,
                        u.lastLoginAt,
                        d.name as departmentName
                    FROM Users u
                    LEFT JOIN Departments d ON u.departmentId = d.departmentId
                    WHERE u.userId = @userId AND u.isActive = 1
                `);

            if (result.recordset.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'ผู้ใช้ไม่มีอยู่ในระบบหรือถูกระงับการใช้งาน',
                    error: 'USER_NOT_FOUND'
                });
            }

            const user = result.recordset[0];

            // Check if user data in token matches database
            if (user.email !== decoded.email || user.role !== decoded.role) {
                return res.status(401).json({
                    success: false,
                    message: 'ข้อมูลผู้ใช้ในโทเคนไม่ตรงกับฐานข้อมูล กรุณาเข้าสู่ระบบใหม่',
                    error: 'TOKEN_USER_MISMATCH'
                });
            }

            // Attach user data to request
            req.user = user;
            req.tokenData = decoded;

            next();

        } catch (error) {
            console.error('JWT verification error:', error);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'โทเคนหมดอายุ กรุณาเข้าสู่ระบบใหม่',
                    error: 'TOKEN_EXPIRED'
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'โทเคนไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
                    error: 'INVALID_TOKEN'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
                error: 'AUTH_ERROR'
            });
        }
    }

    // Optional JWT verification (for public routes that can work with or without auth)
    static async optionalAuth(req, res, next) {
        try {
            let token = JWTUtils.extractTokenFromHeader(req.get('Authorization'));

            if (!token && req.cookies && req.cookies.accessToken) {
                token = req.cookies.accessToken;
            }

            if (token) {
                try {
                    const decoded = JWTUtils.verifyAccessToken(token);

                    const pool = await poolPromise;
                    const result = await pool.request()
                        .input('userId', decoded.userId)
                        .query(`
                            SELECT
                                u.userId,
                                u.email,
                                u.firstName,
                                u.lastName,
                                u.role,
                                u.departmentId,
                                u.isActive,
                                d.name as departmentName
                            FROM Users u
                            LEFT JOIN Departments d ON u.departmentId = d.departmentId
                            WHERE u.userId = @userId AND u.isActive = 1
                        `);

                    if (result.recordset.length > 0) {
                        req.user = result.recordset[0];
                        req.tokenData = decoded;
                    }
                } catch (error) {
                    // Ignore token errors in optional auth
                    console.log('Optional auth token error:', error.message);
                }
            }

            next();

        } catch (error) {
            // In optional auth, continue even if there's an error
            next();
        }
    }

    // Role-based authorization
    static requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'กรุณาเข้าสู่ระบบ',
                    error: 'AUTHENTICATION_REQUIRED'
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                // Log unauthorized access attempt
                ActivityLog.create({
                    user_id: req.user.user_id,
                    action: 'Unauthorized_Access_Attempt',
                    table_name: 'security',
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    description: `User with role ${req.user.role} attempted to access resource requiring roles: ${allowedRoles.join(', ')}`,
                    severity: 'Warning',
                    module: 'Authorization'
                }).catch(console.error);

                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงทรัพยากรนี้',
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            next();
        };
    }

    // Department-based authorization
    static requireDepartment(allowedDepartments) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'กรุณาเข้าสู่ระบบ',
                    error: 'AUTHENTICATION_REQUIRED'
                });
            }

            if (!allowedDepartments.includes(req.user.departmentId)) {
                return res.status(403).json({
                    success: false,
                    message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลของแผนกนี้',
                    error: 'DEPARTMENT_ACCESS_DENIED'
                });
            }

            next();
        };
    }

    // API Key verification for external APIs
    static async verifyApiKey(req, res, next) {
        try {
            const apiKey = req.get('X-API-Key');

            if (!apiKey) {
                return res.status(401).json({
                    success: false,
                    message: 'ไม่พบ API Key',
                    error: 'NO_API_KEY'
                });
            }

            if (!JWTUtils.validateApiKeyFormat(apiKey)) {
                return res.status(401).json({
                    success: false,
                    message: 'รูปแบบ API Key ไม่ถูกต้อง',
                    error: 'INVALID_API_KEY_FORMAT'
                });
            }

            // Check API key in database
            const pool = await poolPromise;
            const result = await pool.request()
                .input('apiKey', apiKey)
                .query(`
                    SELECT
                        ak.apiKeyId,
                        ak.userId,
                        ak.name,
                        ak.permissions,
                        ak.isActive,
                        ak.expiresAt,
                        u.email,
                        u.role,
                        u.isActive as userActive
                    FROM ApiKeys ak
                    INNER JOIN Users u ON ak.userId = u.userId
                    WHERE ak.apiKey = @apiKey
                    AND ak.isActive = 1
                    AND u.isActive = 1
                    AND (ak.expiresAt IS NULL OR ak.expiresAt > GETDATE())
                `);

            if (result.recordset.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'API Key ไม่ถูกต้องหรือหมดอายุ',
                    error: 'INVALID_API_KEY'
                });
            }

            const apiKeyData = result.recordset[0];
            req.apiKey = apiKeyData;
            req.user = {
                userId: apiKeyData.userId,
                email: apiKeyData.email,
                role: apiKeyData.role,
                isActive: apiKeyData.userActive
            };

            // Log API usage
            ActivityLog.create({
                user_id: apiKeyData.userId,
                action: 'API_Access',
                table_name: 'api_keys',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                description: `API access using key: ${apiKeyData.name}`,
                severity: 'Info',
                module: 'API'
            }).catch(console.error);

            next();

        } catch (error) {
            console.error('API Key verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบ API Key',
                error: 'API_KEY_ERROR'
            });
        }
    }

    // Refresh token endpoint
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'ไม่พบ Refresh Token',
                    error: 'NO_REFRESH_TOKEN'
                });
            }

            // Verify refresh token
            const decoded = JWTUtils.verifyRefreshToken(refreshToken);

            // Check if refresh token exists in database and is valid
            const pool = await poolPromise;
            const tokenResult = await pool.request()
                .input('userId', decoded.userId)
                .input('refreshToken', refreshToken)
                .query(`
                    SELECT rt.token_id, rt.revoked, rt.expires_at
                    FROM refresh_tokens rt
                    WHERE rt.user_id = @userId
                    AND rt.token = @refreshToken
                    AND rt.revoked = 0
                    AND rt.expires_at > GETDATE()
                `);

            if (tokenResult.recordset.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ',
                    error: 'INVALID_REFRESH_TOKEN'
                });
            }

            // Get user data
            const userResult = await pool.request()
                .input('userId', decoded.userId)
                .query(`
                    SELECT
                        u.userId,
                        u.email,
                        u.firstName,
                        u.lastName,
                        u.role,
                        u.departmentId,
                        u.isActive
                    FROM Users u
                    WHERE u.userId = @userId AND u.isActive = 1
                `);

            if (userResult.recordset.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'ผู้ใช้ไม่มีอยู่ในระบบ',
                    error: 'USER_NOT_FOUND'
                });
            }

            const user = userResult.recordset[0];

            // Generate new token pair
            const tokens = JWTUtils.generateTokenPair(user);

            // Store new refresh token in database
            await pool.request()
                .input('userId', user.userId)
                .input('refreshToken', tokens.refreshToken)
                .input('expiresAt', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
                .query(`
                    INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
                    VALUES (@userId, @refreshToken, @expiresAt, GETDATE())
                `);

            // Invalidate old refresh token
            await pool.request()
                .input('refreshToken', refreshToken)
                .query(`
                    UPDATE refresh_tokens
                    SET revoked = 1, revoked_at = GETDATE()
                    WHERE token = @refreshToken
                `);

            res.json({
                success: true,
                message: 'ต่ออายุโทเคนเรียบร้อย',
                data: tokens
            });

        } catch (error) {
            console.error('Refresh token error:', error);
            return res.status(401).json({
                success: false,
                message: 'ไม่สามารถต่ออายุโทเคนได้',
                error: 'REFRESH_TOKEN_ERROR'
            });
        }
    }
}

module.exports = JWTAuthMiddleware;