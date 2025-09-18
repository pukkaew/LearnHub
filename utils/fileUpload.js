const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const crypto = require('crypto');

class FileUploadService {
    constructor() {
        this.uploadsDir = path.join(__dirname, '../uploads');
        this.tempDir = path.join(this.uploadsDir, 'temp');
        this.initDirectories();
    }

    async initDirectories() {
        try {
            await fs.mkdir(this.uploadsDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'images'), { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'documents'), { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'videos'), { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'avatars'), { recursive: true });
            console.log('📁 Upload directories initialized');
        } catch (error) {
            console.error('❌ Failed to create upload directories:', error);
        }
    }

    // Generate unique filename
    generateFilename(originalname, prefix = '') {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(originalname);
        const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        return `${prefix}${timestamp}_${randomString}_${baseName}${ext}`;
    }

    // File filter for different types
    createFileFilter(allowedTypes) {
        return (req, file, cb) => {
            const fileType = file.mimetype.split('/')[0];
            const fileExt = path.extname(file.originalname).toLowerCase();

            if (allowedTypes.includes(fileType) || allowedTypes.includes(fileExt)) {
                cb(null, true);
            } else {
                cb(new Error(`ประเภทไฟล์ไม่ได้รับอนุญาต. อนุญาตเฉพาะ: ${allowedTypes.join(', ')}`), false);
            }
        };
    }

    // Image upload configuration
    createImageUpload(maxSize = 5 * 1024 * 1024) { // 5MB default
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(this.uploadsDir, 'images'));
            },
            filename: (req, file, cb) => {
                cb(null, this.generateFilename(file.originalname, 'img_'));
            }
        });

        return multer({
            storage,
            limits: { fileSize: maxSize },
            fileFilter: this.createFileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
        });
    }

    // Document upload configuration
    createDocumentUpload(maxSize = 10 * 1024 * 1024) { // 10MB default
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(this.uploadsDir, 'documents'));
            },
            filename: (req, file, cb) => {
                cb(null, this.generateFilename(file.originalname, 'doc_'));
            }
        });

        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv'
        ];

        return multer({
            storage,
            limits: { fileSize: maxSize },
            fileFilter: this.createFileFilter(allowedTypes)
        });
    }

    // Video upload configuration
    createVideoUpload(maxSize = 100 * 1024 * 1024) { // 100MB default
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(this.uploadsDir, 'videos'));
            },
            filename: (req, file, cb) => {
                cb(null, this.generateFilename(file.originalname, 'vid_'));
            }
        });

        return multer({
            storage,
            limits: { fileSize: maxSize },
            fileFilter: this.createFileFilter(['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'])
        });
    }

    // Avatar upload configuration
    createAvatarUpload(maxSize = 2 * 1024 * 1024) { // 2MB default
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(this.uploadsDir, 'avatars'));
            },
            filename: (req, file, cb) => {
                cb(null, this.generateFilename(file.originalname, 'avatar_'));
            }
        });

        return multer({
            storage,
            limits: { fileSize: maxSize },
            fileFilter: this.createFileFilter(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
        });
    }

    // Process uploaded image (resize, optimize)
    async processImage(filePath, options = {}) {
        try {
            const {
                width = null,
                height = null,
                quality = 85,
                format = 'jpeg',
                createThumbnail = false,
                thumbnailSize = 200
            } = options;

            const outputPath = filePath.replace(path.extname(filePath), `_processed.${format}`);
            let sharpInstance = sharp(filePath);

            // Resize if dimensions provided
            if (width || height) {
                sharpInstance = sharpInstance.resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Apply format and quality
            if (format === 'jpeg') {
                sharpInstance = sharpInstance.jpeg({ quality });
            } else if (format === 'png') {
                sharpInstance = sharpInstance.png({ quality });
            } else if (format === 'webp') {
                sharpInstance = sharpInstance.webp({ quality });
            }

            await sharpInstance.toFile(outputPath);

            // Create thumbnail if requested
            let thumbnailPath = null;
            if (createThumbnail) {
                thumbnailPath = filePath.replace(path.extname(filePath), `_thumb.${format}`);
                await sharp(filePath)
                    .resize(thumbnailSize, thumbnailSize, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .jpeg({ quality: 80 })
                    .toFile(thumbnailPath);
            }

            // Remove original if processing was successful
            await fs.unlink(filePath);

            return {
                success: true,
                processedPath: outputPath,
                thumbnailPath,
                filename: path.basename(outputPath)
            };

        } catch (error) {
            console.error('Image processing error:', error);
            throw error;
        }
    }

    // Get file information
    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const ext = path.extname(filePath).toLowerCase();

            let fileType = 'other';
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                fileType = 'image';
            } else if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
                fileType = 'document';
            } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
                fileType = 'video';
            }

            return {
                filename: path.basename(filePath),
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                type: fileType,
                extension: ext,
                created: stats.birthtime,
                modified: stats.mtime
            };
        } catch (error) {
            throw new Error('ไม่สามารถอ่านข้อมูลไฟล์ได้');
        }
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Delete file
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            return { success: true };
        } catch (error) {
            console.error('File deletion error:', error);
            return { success: false, error: error.message };
        }
    }

    // Clean up old temporary files
    async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
        try {
            const files = await fs.readdir(this.tempDir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`🗑️  Cleaned up temp file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Temp cleanup error:', error);
        }
    }

    // Validate file before upload
    validateFile(file, options = {}) {
        const {
            maxSize = 10 * 1024 * 1024, // 10MB default
            allowedExtensions = [],
            allowedMimeTypes = []
        } = options;

        const errors = [];

        // Check file size
        if (file.size > maxSize) {
            errors.push(`ไฟล์ใหญ่เกินไป (สูงสุด ${this.formatFileSize(maxSize)})`);
        }

        // Check extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
            errors.push(`นามสกุลไฟล์ไม่ได้รับอนุญาต (อนุญาต: ${allowedExtensions.join(', ')})`);
        }

        // Check MIME type
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
            errors.push(`ประเภทไฟล์ไม่ได้รับอนุญาต (อนุญาต: ${allowedMimeTypes.join(', ')})`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Generate upload progress tracking
    createProgressTracker() {
        const progress = {
            uploaded: 0,
            total: 0,
            percentage: 0
        };

        return {
            progress,
            update: (uploaded, total) => {
                progress.uploaded = uploaded;
                progress.total = total;
                progress.percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;
            }
        };
    }

    // Chunked upload for large files
    async handleChunkedUpload(req, res, options = {}) {
        const {
            chunkIndex,
            totalChunks,
            fileName,
            fileId
        } = req.body;

        const chunkDir = path.join(this.tempDir, fileId);
        await fs.mkdir(chunkDir, { recursive: true });

        const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);

        try {
            // Save chunk
            await fs.writeFile(chunkPath, req.file.buffer);

            // Check if all chunks are uploaded
            const uploadedChunks = await fs.readdir(chunkDir);

            if (uploadedChunks.length === parseInt(totalChunks)) {
                // Merge chunks
                const finalPath = path.join(this.uploadsDir, 'documents', fileName);
                const writeStream = require('fs').createWriteStream(finalPath);

                for (let i = 0; i < totalChunks; i++) {
                    const chunkData = await fs.readFile(path.join(chunkDir, `chunk_${i}`));
                    writeStream.write(chunkData);
                }

                writeStream.end();

                // Clean up chunks
                await fs.rmdir(chunkDir, { recursive: true });

                return {
                    success: true,
                    completed: true,
                    filePath: finalPath,
                    fileName: fileName
                };
            }

            return {
                success: true,
                completed: false,
                uploadedChunks: uploadedChunks.length,
                totalChunks: parseInt(totalChunks)
            };

        } catch (error) {
            console.error('Chunked upload error:', error);
            throw error;
        }
    }
}

// Export singleton instance
const fileUploadService = new FileUploadService();

module.exports = fileUploadService;