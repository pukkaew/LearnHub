const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class CryptoUtils {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.saltRounds = 12;
        this.jwtSecret = process.env.JWT_SECRET || 'ruxchai-default-secret-key';
        this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
    }

    // Password hashing
    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            throw new Error('Error hashing password: ' + error.message);
        }
    }

    async verifyPassword(password, hashedPassword) {
        try {
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            throw new Error('Error verifying password: ' + error.message);
        }
    }

    // JWT token generation and verification
    generateJWTToken(payload, expiresIn = '24h') {
        try {
            return jwt.sign(payload, this.jwtSecret, { expiresIn });
        } catch (error) {
            throw new Error('Error generating JWT token: ' + error.message);
        }
    }

    verifyJWTToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Random token generation
    generateRandomToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    generateSecureToken(length = 32) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;

        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        return result;
    }

    // UUID generation
    generateUUID() {
        return crypto.randomUUID();
    }

    // Encryption and decryption
    encrypt(text) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, { iv });

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            throw new Error('Error encrypting data: ' + error.message);
        }
    }

    decrypt(encryptedData) {
        try {
            const { encrypted, iv, authTag } = encryptedData;

            const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, {
                iv: Buffer.from(iv, 'hex')
            });
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error('Error decrypting data: ' + error.message);
        }
    }

    // Simple encryption for non-sensitive data
    simpleEncrypt(text) {
        try {
            const cipher = crypto.createCipher('aes192', this.jwtSecret);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted;
        } catch (error) {
            throw new Error('Error encrypting: ' + error.message);
        }
    }

    simpleDecrypt(encryptedText) {
        try {
            const decipher = crypto.createDecipher('aes192', this.jwtSecret);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            throw new Error('Error decrypting: ' + error.message);
        }
    }

    // Hashing
    generateHash(data, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(data).digest('hex');
    }

    generateSHA256(data) {
        return this.generateHash(data, 'sha256');
    }

    generateMD5(data) {
        return this.generateHash(data, 'md5');
    }

    // HMAC
    generateHMAC(data, secret = null, algorithm = 'sha256') {
        const key = secret || this.jwtSecret;
        return crypto.createHmac(algorithm, key).update(data).digest('hex');
    }

    verifyHMAC(data, signature, secret = null, algorithm = 'sha256') {
        const expectedSignature = this.generateHMAC(data, secret, algorithm);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    // Key generation
    generateKey(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    generateKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }

    // API key generation
    generateAPIKey(prefix = 'ruxchai') {
        const timestamp = Date.now().toString(36);
        const random = this.generateSecureToken(16);
        return `${prefix}_${timestamp}_${random}`;
    }

    // Session token generation
    generateSessionToken() {
        const timestamp = Date.now();
        const random = this.generateRandomToken(16);
        const combined = `${timestamp}_${random}`;
        return this.generateSHA256(combined);
    }

    // Password reset token
    generatePasswordResetToken(userId, email) {
        const payload = {
            userId: userId,
            email: email,
            type: 'password_reset',
            timestamp: Date.now()
        };

        return this.generateJWTToken(payload, '1h');
    }

    verifyPasswordResetToken(token) {
        try {
            const decoded = this.verifyJWTToken(token);

            if (decoded.type !== 'password_reset') {
                throw new Error('Invalid token type');
            }

            // Check if token is not older than 1 hour
            const tokenAge = Date.now() - decoded.timestamp;
            if (tokenAge > 3600000) { // 1 hour in milliseconds
                throw new Error('Token expired');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid password reset token');
        }
    }

    // Email verification token
    generateEmailVerificationToken(userId, email) {
        const payload = {
            userId: userId,
            email: email,
            type: 'email_verification',
            timestamp: Date.now()
        };

        return this.generateJWTToken(payload, '24h');
    }

    verifyEmailVerificationToken(token) {
        try {
            const decoded = this.verifyJWTToken(token);

            if (decoded.type !== 'email_verification') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid email verification token');
        }
    }

    // Test invitation token for applicants
    generateTestInvitationToken(applicantId, testId) {
        const payload = {
            applicantId: applicantId,
            testId: testId,
            type: 'test_invitation',
            timestamp: Date.now()
        };

        return this.generateJWTToken(payload, '7d');
    }

    verifyTestInvitationToken(token) {
        try {
            const decoded = this.verifyJWTToken(token);

            if (decoded.type !== 'test_invitation') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid test invitation token');
        }
    }

    // Certificate verification code
    generateCertificateCode(userId, courseId) {
        const data = `${userId}_${courseId}_${Date.now()}`;
        return this.generateSHA256(data).substring(0, 16).toUpperCase();
    }

    // File integrity checking
    generateFileChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = require('fs').createReadStream(filePath);

            stream.on('error', reject);
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
    }

    verifyFileIntegrity(filePath, expectedChecksum) {
        return this.generateFileChecksum(filePath)
            .then(actualChecksum => actualChecksum === expectedChecksum);
    }

    // URL-safe encoding
    base64URLEncode(str) {
        return Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    base64URLDecode(str) {
        str += new Array(5 - str.length % 4).join('=');
        return Buffer.from(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64').toString();
    }

    // Time-based one-time password (TOTP) - for 2FA
    generateTOTP(secret, window = 0) {
        const epoch = Math.round(Date.now() / 1000.0);
        const time = Math.floor(epoch / 30) + window;

        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
        hmac.update(Buffer.alloc(8));

        // Convert time to buffer
        const timeBuffer = Buffer.alloc(8);
        for (let i = 7; i >= 0; i--) {
            timeBuffer[i] = time & 0xff;
            time >> 8;
        }

        hmac.update(timeBuffer);
        const hash = hmac.digest();

        const offset = hash[hash.length - 1] & 0x0f;
        const binary = ((hash[offset] & 0x7f) << 24) |
                      ((hash[offset + 1] & 0xff) << 16) |
                      ((hash[offset + 2] & 0xff) << 8) |
                      (hash[offset + 3] & 0xff);

        const otp = binary % 1000000;
        return otp.toString().padStart(6, '0');
    }

    // Generate backup codes
    generateBackupCodes(count = 8) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = this.generateSecureToken(8);
            codes.push(code.match(/.{1,4}/g).join('-'));
        }
        return codes;
    }

    // Secure comparison to prevent timing attacks
    secureCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(a, 'utf8'),
            Buffer.from(b, 'utf8')
        );
    }

    // Generate nonce for CSP
    generateNonce(length = 16) {
        return crypto.randomBytes(length).toString('base64');
    }

    // Rate limiting token
    generateRateLimitToken(identifier, action) {
        const data = `${identifier}_${action}_${Date.now()}`;
        return this.generateSHA256(data);
    }

    // Mask sensitive data
    maskEmail(email) {
        const [username, domain] = email.split('@');
        const maskedUsername = username.length > 2 ?
            username.substring(0, 2) + '*'.repeat(username.length - 2) :
            '*'.repeat(username.length);
        return `${maskedUsername}@${domain}`;
    }

    maskPhone(phone) {
        if (phone.length < 4) {return '*'.repeat(phone.length);}
        return phone.substring(0, 3) + '*'.repeat(phone.length - 6) + phone.substring(phone.length - 3);
    }

    // Generate secure random password
    generateSecurePassword(length = 12) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const allChars = lowercase + uppercase + numbers + symbols;
        let password = '';

        // Ensure at least one character from each category
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    // Validate password strength
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        const score = [
            password.length >= minLength,
            hasUppercase,
            hasLowercase,
            hasNumbers,
            hasSpecial
        ].filter(Boolean).length;

        let strength = 'weak';
        if (score >= 5) {strength = 'strong';}
        else if (score >= 3) {strength = 'medium';}

        return {
            score: score,
            strength: strength,
            requirements: {
                minLength: password.length >= minLength,
                hasUppercase: hasUppercase,
                hasLowercase: hasLowercase,
                hasNumbers: hasNumbers,
                hasSpecial: hasSpecial
            }
        };
    }
}

module.exports = new CryptoUtils();