const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

class FileUploadService {
    constructor() {
        this.uploadDir = path.join(__dirname, '../public/uploads');
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.allowedDocumentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        this.allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

        this.initializeDirectories();
    }

    async initializeDirectories() {
        try {
            const directories = [
                path.join(this.uploadDir, 'avatars'),
                path.join(this.uploadDir, 'courses'),
                path.join(this.uploadDir, 'articles'),
                path.join(this.uploadDir, 'documents'),
                path.join(this.uploadDir, 'videos'),
                path.join(this.uploadDir, 'temp')
            ];

            for (const dir of directories) {
                await fs.mkdir(dir, { recursive: true });
            }

            console.log('Upload directories initialized successfully');
        } catch (error) {
            console.error('Error initializing upload directories:', error);
        }
    }

    // Generic file upload configuration
    createUploadMiddleware(options = {}) {
        const {
            destination = 'temp',
            fileTypes = [],
            maxSize = this.maxFileSize,
            fieldName = 'file'
        } = options;

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(this.uploadDir, destination);
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });

        const fileFilter = (req, file, cb) => {
            if (fileTypes.length === 0 || fileTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Invalid file type. Allowed types: ${fileTypes.join(', ')}`), false);
            }
        };

        return multer({
            storage: storage,
            limits: {
                fileSize: maxSize
            },
            fileFilter: fileFilter
        }).single(fieldName);
    }

    // Avatar upload middleware
    avatarUpload() {
        return this.createUploadMiddleware({
            destination: 'avatars',
            fileTypes: this.allowedImageTypes,
            maxSize: 2 * 1024 * 1024, // 2MB for avatars
            fieldName: 'avatar'
        });
    }

    // Course image upload middleware
    courseImageUpload() {
        return this.createUploadMiddleware({
            destination: 'courses',
            fileTypes: this.allowedImageTypes,
            maxSize: 5 * 1024 * 1024, // 5MB for course images
            fieldName: 'course_image'
        });
    }

    // Article image upload middleware
    articleImageUpload() {
        return this.createUploadMiddleware({
            destination: 'articles',
            fileTypes: this.allowedImageTypes,
            maxSize: 5 * 1024 * 1024, // 5MB for article images
            fieldName: 'featured_image'
        });
    }

    // Document upload middleware
    documentUpload() {
        return this.createUploadMiddleware({
            destination: 'documents',
            fileTypes: [...this.allowedDocumentTypes, ...this.allowedImageTypes],
            maxSize: 10 * 1024 * 1024, // 10MB for documents
            fieldName: 'document'
        });
    }

    // Video upload middleware
    videoUpload() {
        return this.createUploadMiddleware({
            destination: 'videos',
            fileTypes: this.allowedVideoTypes,
            maxSize: 100 * 1024 * 1024, // 100MB for videos
            fieldName: 'video'
        });
    }

    // Multiple files upload
    createMultipleUploadMiddleware(options = {}) {
        const {
            destination = 'temp',
            fileTypes = [],
            maxSize = this.maxFileSize,
            fieldName = 'files',
            maxCount = 10
        } = options;

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(this.uploadDir, destination);
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });

        const fileFilter = (req, file, cb) => {
            if (fileTypes.length === 0 || fileTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Invalid file type. Allowed types: ${fileTypes.join(', ')}`), false);
            }
        };

        return multer({
            storage: storage,
            limits: {
                fileSize: maxSize
            },
            fileFilter: fileFilter
        }).array(fieldName, maxCount);
    }

    // Process uploaded image (resize, optimize)
    async processImage(filePath, options = {}) {
        try {
            const {
                width = null,
                height = null,
                quality = 80,
                format = 'jpeg',
                thumbnail = false
            } = options;

            const processedPath = filePath.replace(path.extname(filePath), `_processed.${format}`);

            let processor = sharp(filePath);

            // Resize if dimensions provided
            if (width || height) {
                processor = processor.resize(width, height, {
                    fit: 'cover',
                    withoutEnlargement: true
                });
            }

            // Set format and quality
            if (format === 'jpeg') {
                processor = processor.jpeg({ quality });
            } else if (format === 'png') {
                processor = processor.png({ quality });
            } else if (format === 'webp') {
                processor = processor.webp({ quality });
            }

            await processor.toFile(processedPath);

            // Create thumbnail if requested
            if (thumbnail) {
                const thumbnailPath = filePath.replace(path.extname(filePath), `_thumb.${format}`);
                await sharp(filePath)
                    .resize(150, 150, { fit: 'cover' })
                    .jpeg({ quality: 70 })
                    .toFile(thumbnailPath);

                return {
                    original: filePath,
                    processed: processedPath,
                    thumbnail: thumbnailPath
                };
            }

            return {
                original: filePath,
                processed: processedPath
            };
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    // Generate avatar variations
    async processAvatar(filePath) {
        try {
            const avatarSizes = [
                { suffix: '_small', width: 50, height: 50 },
                { suffix: '_medium', width: 100, height: 100 },
                { suffix: '_large', width: 200, height: 200 }
            ];

            const results = {};
            const baseName = path.basename(filePath, path.extname(filePath));
            const dirName = path.dirname(filePath);

            for (const size of avatarSizes) {
                const outputPath = path.join(dirName, `${baseName}${size.suffix}.jpg`);

                await sharp(filePath)
                    .resize(size.width, size.height, { fit: 'cover' })
                    .jpeg({ quality: 85 })
                    .toFile(outputPath);

                results[size.suffix.substring(1)] = outputPath;
            }

            return results;
        } catch (error) {
            console.error('Error processing avatar:', error);
            throw error;
        }
    }

    // Validate file
    validateFile(file, options = {}) {
        const {
            allowedTypes = [],
            maxSize = this.maxFileSize,
            requiredFields = []
        } = options;

        const errors = [];

        if (!file) {
            errors.push('No file provided');
            return { valid: false, errors };
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
            errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check file size
        if (file.size > maxSize) {
            errors.push(`File size too large. Maximum size: ${this.formatFileSize(maxSize)}`);
        }

        // Check required fields
        for (const field of requiredFields) {
            if (!file[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Delete file
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            console.log('File deleted successfully:', filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    // Delete multiple files
    async deleteFiles(filePaths) {
        const results = await Promise.allSettled(
            filePaths.map(filePath => this.deleteFile(filePath))
        );

        return results.map((result, index) => ({
            filePath: filePaths[index],
            success: result.status === 'fulfilled' && result.value,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }

    // Get file info
    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const extension = path.extname(filePath).toLowerCase();

            const info = {
                path: filePath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                extension: extension,
                mimeType: this.getMimeType(extension),
                created: stats.birthtime,
                modified: stats.mtime,
                isImage: this.allowedImageTypes.includes(this.getMimeType(extension)),
                isDocument: this.allowedDocumentTypes.includes(this.getMimeType(extension)),
                isVideo: this.allowedVideoTypes.includes(this.getMimeType(extension))
            };

            // Get image dimensions if it's an image
            if (info.isImage) {
                try {
                    const metadata = await sharp(filePath).metadata();
                    info.width = metadata.width;
                    info.height = metadata.height;
                } catch (error) {
                    console.error('Error getting image metadata:', error);
                }
            }

            return info;
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }

    // Clean up temporary files
    async cleanupTempFiles(olderThanHours = 24) {
        try {
            const tempDir = path.join(this.uploadDir, 'temp');
            const files = await fs.readdir(tempDir);
            const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime.getTime() < cutoffTime) {
                    await this.deleteFile(filePath);
                    deletedCount++;
                }
            }

            console.log(`Cleaned up ${deletedCount} temporary files`);
            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up temporary files:', error);
            return 0;
        }
    }

    // Get disk usage
    async getDiskUsage() {
        try {
            const directories = ['avatars', 'courses', 'articles', 'documents', 'videos', 'temp'];
            const usage = {};

            for (const dir of directories) {
                const dirPath = path.join(this.uploadDir, dir);
                usage[dir] = await this.getDirectorySize(dirPath);
            }

            const totalSize = Object.values(usage).reduce((sum, size) => sum + size, 0);

            return {
                directories: usage,
                total: totalSize,
                totalFormatted: this.formatFileSize(totalSize)
            };
        } catch (error) {
            console.error('Error getting disk usage:', error);
            return null;
        }
    }

    // Helper methods
    async getDirectorySize(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            let totalSize = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            }

            return totalSize;
        } catch (error) {
            return 0;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMimeType(extension) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg'
        };

        return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }

    // Generate unique filename
    generateUniqueFilename(originalName) {
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);

        return `${baseName}_${timestamp}_${random}${extension}`;
    }

    // Get upload URL
    getUploadUrl(filePath) {
        const relativePath = path.relative(path.join(__dirname, '../public'), filePath);
        return `/${relativePath.replace(/\\/g, '/')}`;
    }
}

module.exports = new FileUploadService();