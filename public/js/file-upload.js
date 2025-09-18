// File Upload Component with Progress Bar
class FileUploadComponent {
    constructor(options = {}) {
        this.options = {
            maxFiles: 5,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/*', 'application/pdf', 'text/*'],
            uploadUrl: '/api/upload',
            chunkSize: 1024 * 1024, // 1MB chunks
            autoUpload: true,
            multiple: true,
            showPreview: true,
            enableChunking: true,
            ...options
        };

        this.files = [];
        this.uploads = new Map();
        this.totalProgress = 0;

        this.init();
    }

    init() {
        this.createUploadArea();
        this.bindEvents();
    }

    createUploadArea() {
        if (this.options.container) {
            this.container = typeof this.options.container === 'string'
                ? document.querySelector(this.options.container)
                : this.options.container;
        } else {
            this.container = document.createElement('div');
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = `
            <div class="file-upload-component">
                <div class="upload-area" id="upload-area">
                    <div class="upload-content">
                        <div class="upload-icon">
                            <i class="fas fa-cloud-upload-alt text-4xl text-gray-400"></i>
                        </div>
                        <div class="upload-text">
                            <h3 class="text-lg font-semibold text-gray-700">อัปโหลดไฟล์</h3>
                            <p class="text-gray-500">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                            <p class="text-sm text-gray-400 mt-2">
                                ไฟล์สูงสุด ${this.formatFileSize(this.options.maxFileSize)}
                                จำนวนสูงสุด ${this.options.maxFiles} ไฟล์
                            </p>
                        </div>
                        <input type="file" id="file-input" class="hidden"
                               ${this.options.multiple ? 'multiple' : ''}
                               accept="${this.options.allowedTypes.join(',')}">
                    </div>
                </div>

                <div class="upload-progress" id="upload-progress" style="display: none;">
                    <div class="overall-progress mb-4">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-medium text-gray-700">ความคืบหน้าโดยรวม</span>
                            <span class="text-sm text-gray-500" id="overall-percentage">0%</span>
                        </div>
                        <div class="progress-bar bg-gray-200 rounded-full h-2">
                            <div class="progress-fill bg-blue-500 h-2 rounded-full transition-all duration-300"
                                 id="overall-progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

                <div class="file-list" id="file-list">
                    <!-- Uploaded files will appear here -->
                </div>

                <div class="upload-controls mt-4" style="display: none;" id="upload-controls">
                    <button class="btn btn-primary" id="upload-btn">
                        <i class="fas fa-upload mr-2"></i>อัปโหลดไฟล์
                    </button>
                    <button class="btn btn-secondary ml-2" id="clear-btn">
                        <i class="fas fa-trash mr-2"></i>ล้างทั้งหมด
                    </button>
                </div>
            </div>
        `;

        this.setupStyles();
    }

    setupStyles() {
        if (document.querySelector('#file-upload-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'file-upload-styles';
        styles.textContent = `
            .file-upload-component {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
            }

            .upload-area {
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                padding: 40px 20px;
                text-align: center;
                background: #f9fafb;
                transition: all 0.3s ease;
                cursor: pointer;
            }

            .upload-area:hover {
                border-color: #3b82f6;
                background: #eff6ff;
            }

            .upload-area.dragover {
                border-color: #3b82f6;
                background: #dbeafe;
                transform: scale(1.02);
            }

            .file-item {
                display: flex;
                align-items: center;
                padding: 12px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                margin-bottom: 8px;
                background: white;
                transition: all 0.3s ease;
            }

            .file-item:hover {
                shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .file-icon {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                margin-right: 12px;
                font-size: 18px;
            }

            .file-icon.image { background: #fef3c7; color: #f59e0b; }
            .file-icon.document { background: #fca5a5; color: #ef4444; }
            .file-icon.video { background: #c7d2fe; color: #6366f1; }
            .file-icon.other { background: #e5e7eb; color: #6b7280; }

            .file-info {
                flex: 1;
                min-width: 0;
            }

            .file-name {
                font-weight: 500;
                color: #374151;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .file-size {
                font-size: 0.875rem;
                color: #6b7280;
            }

            .file-progress {
                margin-top: 8px;
            }

            .progress-bar {
                width: 100%;
                height: 4px;
                background: #f3f4f6;
                border-radius: 2px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                border-radius: 2px;
                transition: width 0.3s ease;
            }

            .file-status {
                display: flex;
                align-items: center;
                margin-left: 12px;
                font-size: 0.875rem;
            }

            .file-status.uploading { color: #3b82f6; }
            .file-status.completed { color: #10b981; }
            .file-status.error { color: #ef4444; }

            .file-actions {
                display: flex;
                gap: 8px;
                margin-left: 12px;
            }

            .btn {
                display: inline-flex;
                align-items: center;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                text-decoration: none;
                transition: all 0.2s ease;
                cursor: pointer;
                border: none;
            }

            .btn-primary {
                background: #3b82f6;
                color: white;
            }

            .btn-primary:hover {
                background: #2563eb;
            }

            .btn-secondary {
                background: #6b7280;
                color: white;
            }

            .btn-secondary:hover {
                background: #4b5563;
            }

            .btn-danger {
                background: #ef4444;
                color: white;
                padding: 4px 8px;
                font-size: 0.75rem;
            }

            .btn-danger:hover {
                background: #dc2626;
            }

            .preview-image {
                width: 40px;
                height: 40px;
                object-fit: cover;
                border-radius: 6px;
                margin-right: 12px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .animate-spin {
                animation: spin 1s linear infinite;
            }
        `;

        document.head.appendChild(styles);
    }

    bindEvents() {
        const uploadArea = this.container.querySelector('#upload-area');
        const fileInput = this.container.querySelector('#file-input');
        const uploadBtn = this.container.querySelector('#upload-btn');
        const clearBtn = this.container.querySelector('#clear-btn');

        // Click to select files
        uploadArea.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(Array.from(e.dataTransfer.files));
        });

        // Upload button
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadAll());
        }

        // Clear button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
    }

    handleFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));

        if (this.files.length + validFiles.length > this.options.maxFiles) {
            this.showError(`สามารถอัปโหลดได้สูงสุด ${this.options.maxFiles} ไฟล์`);
            return;
        }

        validFiles.forEach(file => {
            const fileId = this.generateFileId();
            const fileData = {
                id: fileId,
                file: file,
                name: file.name,
                size: file.size,
                type: this.getFileType(file),
                status: 'pending',
                progress: 0,
                url: null
            };

            this.files.push(fileData);
            this.renderFileItem(fileData);

            if (this.options.autoUpload) {
                this.uploadFile(fileData);
            }
        });

        this.updateControls();
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.options.maxFileSize) {
            this.showError(`ไฟล์ ${file.name} ใหญ่เกินไป (สูงสุด ${this.formatFileSize(this.options.maxFileSize)})`);
            return false;
        }

        // Check file type
        const isValidType = this.options.allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
        });

        if (!isValidType) {
            this.showError(`ประเภทไฟล์ ${file.name} ไม่ได้รับอนุญาต`);
            return false;
        }

        return true;
    }

    async uploadFile(fileData) {
        fileData.status = 'uploading';
        this.updateFileItem(fileData);

        try {
            if (this.options.enableChunking && fileData.size > this.options.chunkSize) {
                await this.uploadFileChunked(fileData);
            } else {
                await this.uploadFileNormal(fileData);
            }

            fileData.status = 'completed';
            this.updateFileItem(fileData);
            this.onFileComplete(fileData);

        } catch (error) {
            fileData.status = 'error';
            fileData.error = error.message;
            this.updateFileItem(fileData);
            this.onFileError(fileData, error);
        }
    }

    async uploadFileNormal(fileData) {
        const formData = new FormData();
        formData.append('file', fileData.file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    fileData.progress = Math.round((e.loaded / e.total) * 100);
                    this.updateFileItem(fileData);
                    this.updateOverallProgress();
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    fileData.url = response.url || response.data?.url;
                    fileData.response = response;
                    resolve(response);
                } else {
                    reject(new Error('Upload failed'));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });

            xhr.open('POST', this.options.uploadUrl);
            xhr.send(formData);
        });
    }

    async uploadFileChunked(fileData) {
        const file = fileData.file;
        const chunkSize = this.options.chunkSize;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = fileData.id;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('chunk', chunk);
            formData.append('chunkIndex', chunkIndex);
            formData.append('totalChunks', totalChunks);
            formData.append('fileName', file.name);
            formData.append('fileId', fileId);

            await this.uploadChunk(formData, fileData, chunkIndex, totalChunks);
        }
    }

    async uploadChunk(formData, fileData, chunkIndex, totalChunks) {
        const response = await fetch(`${this.options.uploadUrl}/chunked`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Chunk upload failed');
        }

        const result = await response.json();

        // Update progress
        fileData.progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        this.updateFileItem(fileData);
        this.updateOverallProgress();

        if (result.completed) {
            fileData.url = result.url || result.filePath;
            fileData.response = result;
        }

        return result;
    }

    renderFileItem(fileData) {
        const fileList = this.container.querySelector('#file-list');

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.id = `file-${fileData.id}`;

        const iconClass = this.getFileIconClass(fileData.type);

        fileItem.innerHTML = `
            ${this.options.showPreview && fileData.type === 'image' ?
                `<img class="preview-image" src="${URL.createObjectURL(fileData.file)}" alt="Preview">` :
                `<div class="file-icon ${fileData.type}"><i class="${iconClass}"></i></div>`
            }

            <div class="file-info">
                <div class="file-name">${fileData.name}</div>
                <div class="file-size">${this.formatFileSize(fileData.size)}</div>
                <div class="file-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <div class="file-status pending">
                <i class="fas fa-clock mr-1"></i>รอการอัปโหลด
            </div>

            <div class="file-actions">
                <button class="btn btn-danger remove-btn" onclick="fileUploader.removeFile('${fileData.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        fileList.appendChild(fileItem);
    }

    updateFileItem(fileData) {
        const fileItem = this.container.querySelector(`#file-${fileData.id}`);
        if (!fileItem) return;

        const progressElement = fileItem.querySelector('.file-progress');
        const progressFill = fileItem.querySelector('.progress-fill');
        const statusElement = fileItem.querySelector('.file-status');

        // Update progress
        if (fileData.status === 'uploading') {
            progressElement.style.display = 'block';
            progressFill.style.width = `${fileData.progress}%`;
        }

        // Update status
        statusElement.className = `file-status ${fileData.status}`;

        switch (fileData.status) {
            case 'uploading':
                statusElement.innerHTML = `<i class="fas fa-spinner animate-spin mr-1"></i>${fileData.progress}%`;
                break;
            case 'completed':
                statusElement.innerHTML = '<i class="fas fa-check mr-1"></i>เสร็จสิ้น';
                progressElement.style.display = 'none';
                break;
            case 'error':
                statusElement.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>ผิดพลาด';
                progressElement.style.display = 'none';
                break;
            default:
                statusElement.innerHTML = '<i class="fas fa-clock mr-1"></i>รอการอัปโหลด';
        }
    }

    updateOverallProgress() {
        const totalFiles = this.files.length;
        if (totalFiles === 0) return;

        const totalProgress = this.files.reduce((sum, file) => sum + file.progress, 0);
        const averageProgress = Math.round(totalProgress / totalFiles);

        const progressContainer = this.container.querySelector('#upload-progress');
        const progressFill = this.container.querySelector('#overall-progress-fill');
        const progressText = this.container.querySelector('#overall-percentage');

        if (totalFiles > 0 && averageProgress > 0) {
            progressContainer.style.display = 'block';
            progressFill.style.width = `${averageProgress}%`;
            progressText.textContent = `${averageProgress}%`;
        }
    }

    updateControls() {
        const controls = this.container.querySelector('#upload-controls');
        const uploadBtn = this.container.querySelector('#upload-btn');

        if (this.files.length > 0) {
            controls.style.display = 'block';

            if (!this.options.autoUpload) {
                const pendingFiles = this.files.filter(f => f.status === 'pending');
                uploadBtn.disabled = pendingFiles.length === 0;
                uploadBtn.innerHTML = pendingFiles.length > 0 ?
                    `<i class="fas fa-upload mr-2"></i>อัปโหลด ${pendingFiles.length} ไฟล์` :
                    '<i class="fas fa-check mr-2"></i>อัปโหลดครบแล้ว';
            }
        } else {
            controls.style.display = 'none';
        }
    }

    uploadAll() {
        const pendingFiles = this.files.filter(f => f.status === 'pending');
        pendingFiles.forEach(fileData => this.uploadFile(fileData));
    }

    removeFile(fileId) {
        const index = this.files.findIndex(f => f.id === fileId);
        if (index !== -1) {
            this.files.splice(index, 1);

            const fileItem = this.container.querySelector(`#file-${fileId}`);
            if (fileItem) {
                fileItem.remove();
            }

            this.updateControls();
            this.updateOverallProgress();
        }
    }

    clearAll() {
        this.files = [];
        this.container.querySelector('#file-list').innerHTML = '';
        this.container.querySelector('#upload-progress').style.display = 'none';
        this.updateControls();
    }

    // Utility methods
    generateFileId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getFileType(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) return 'document';
        return 'other';
    }

    getFileIconClass(type) {
        switch (type) {
            case 'image': return 'fas fa-image';
            case 'video': return 'fas fa-video';
            case 'document': return 'fas fa-file-alt';
            default: return 'fas fa-file';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        // Create or update error message
        let errorDiv = this.container.querySelector('.upload-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'upload-error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4';
            this.container.insertBefore(errorDiv, this.container.firstChild);
        }

        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>${message}`;

        // Auto hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.remove();
        }, 5000);
    }

    // Event callbacks
    onFileComplete(fileData) {
        if (this.options.onFileComplete) {
            this.options.onFileComplete(fileData);
        }
    }

    onFileError(fileData, error) {
        if (this.options.onFileError) {
            this.options.onFileError(fileData, error);
        }
    }

    onAllComplete() {
        if (this.options.onAllComplete) {
            this.options.onAllComplete(this.files);
        }
    }

    // Public API
    getFiles() {
        return this.files;
    }

    getCompletedFiles() {
        return this.files.filter(f => f.status === 'completed');
    }

    getUploadUrls() {
        return this.getCompletedFiles().map(f => f.url).filter(url => url);
    }
}

// Global instance for easy access
window.FileUploadComponent = FileUploadComponent;