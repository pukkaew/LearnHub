const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'ruxchai-learnhub-jwt-secret-key-super-secure-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ruxchai-learnhub-refresh-secret-key-super-secure-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class JWTUtils {
    // Generate access token
    static generateAccessToken(payload) {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'ruxchai-learnhub',
            audience: 'ruxchai-users'
        });
    }

    // Generate refresh token
    static generateRefreshToken(payload) {
        return jwt.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
            issuer: 'ruxchai-learnhub',
            audience: 'ruxchai-users'
        });
    }

    // Generate token pair
    static generateTokenPair(user) {
        const payload = {
            userId: user.userId,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken({ userId: user.userId });

        return {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES_IN
        };
    }

    // Verify access token
    static verifyAccessToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET, {
                issuer: 'ruxchai-learnhub',
                audience: 'ruxchai-users'
            });
        } catch (error) {
            throw new Error(`Invalid access token: ${error.message}`);
        }
    }

    // Verify refresh token
    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, JWT_REFRESH_SECRET, {
                issuer: 'ruxchai-learnhub',
                audience: 'ruxchai-users'
            });
        } catch (error) {
            throw new Error(`Invalid refresh token: ${error.message}`);
        }
    }

    // Decode token without verification (for expired tokens)
    static decodeToken(token) {
        return jwt.decode(token);
    }

    // Check if token is expired
    static isTokenExpired(token) {
        try {
            const decoded = this.decodeToken(token);
            return decoded.exp < Date.now() / 1000;
        } catch (error) {
            return true;
        }
    }

    // Extract token from Authorization header
    static extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            return null;
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];
    }

    // Generate secure random token for password reset, email verification, etc.
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Hash password
    static async hashPassword(password) {
        const bcrypt = require('bcryptjs');
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Compare password
    static async comparePassword(password, hashedPassword) {
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(password, hashedPassword);
    }

    // Generate API key
    static generateApiKey() {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(16).toString('hex');
        return `rux_${timestamp}_${randomPart}`;
    }

    // Validate API key format
    static validateApiKeyFormat(apiKey) {
        const pattern = /^rux_[a-z0-9]+_[a-f0-9]{32}$/;
        return pattern.test(apiKey);
    }

    // Create fingerprint for device/browser identification
    static createFingerprint(req) {
        const components = [
            req.get('User-Agent') || '',
            req.get('Accept-Language') || '',
            req.get('Accept-Encoding') || '',
            req.ip || '',
            req.get('X-Forwarded-For') || ''
        ];

        return crypto
            .createHash('sha256')
            .update(components.join('|'))
            .digest('hex');
    }

    // Generate CSRF token
    static generateCSRFToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Verify CSRF token
    static verifyCSRFToken(token, sessionToken) {
        return token && sessionToken && token === sessionToken;
    }
}

module.exports = JWTUtils;