class WebcamProctoring {
    constructor(testSessionId, options = {}) {
        this.testSessionId = testSessionId;
        this.options = {
            enableFaceDetection: true,
            enableTabSwitchDetection: true,
            screenshotInterval: 30000, // 30 seconds
            warningDisplayTime: 5000,
            ...options
        };

        this.isActive = false;
        this.webcamStream = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.faceDetectionModel = null;

        // Violation tracking
        this.violations = {
            tabSwitches: 0,
            noFaceDetected: 0,
            multipleFaces: 0
        };

        // UI elements
        this.statusIndicator = null;
        this.warningModal = null;

        // Initialize
        this.init();
    }

    async init() {
        await this.setupUI();
        await this.initializeWebcam();
        await this.loadFaceDetectionModel();
        this.setupEventListeners();
        this.startProctoring();
    }

    async setupUI() {
        // Create status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.id = 'proctoring-status';
        this.statusIndicator.className = 'proctoring-status';
        this.statusIndicator.innerHTML = `
            <div class="status-content">
                <div class="webcam-indicator">
                    <i class="fas fa-video status-icon"></i>
                    <span class="status-text">กำลังเตรียมกล้อง...</span>
                </div>
                <div class="recording-indicator">
                    <div class="recording-dot"></div>
                    <span>กำลังบันทึก</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.statusIndicator);

        // Create warning modal
        this.warningModal = document.createElement('div');
        this.warningModal.id = 'proctoring-warning-modal';
        this.warningModal.className = 'proctoring-warning-modal hidden';
        this.warningModal.innerHTML = `
            <div class="warning-content">
                <div class="warning-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="warning-message"></div>
                <button class="warning-acknowledge-btn">รับทราบ</button>
            </div>
        `;
        document.body.appendChild(this.warningModal);

        // Create webcam preview (small corner window)
        this.webcamPreview = document.createElement('div');
        this.webcamPreview.id = 'webcam-preview';
        this.webcamPreview.className = 'webcam-preview';
        this.webcamPreview.innerHTML = `
            <video autoplay muted playsinline></video>
            <div class="preview-status">
                <i class="fas fa-video"></i>
            </div>
        `;
        document.body.appendChild(this.webcamPreview);

        // Create hidden canvas for face detection
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'none';
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);
    }

    async initializeWebcam() {
        try {
            this.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            this.video = this.webcamPreview.querySelector('video');
            this.video.srcObject = this.webcamStream;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
            });

            this.updateStatus('เชื่อมต่อกล้องสำเร็จ', 'success');

            // Notify server that webcam is enabled
            if (window.socket) {
                window.socket.emit('webcam_status_update', {
                    testSessionId: this.testSessionId,
                    isEnabled: true
                });
            }

        } catch (error) {
            console.error('เริ่มต้นกล้องไม่สำเร็จ:', error);
            this.updateStatus('ไม่สามารถเข้าถึงกล้องได้', 'error');
            this.handleWebcamError(error);
        }
    }

    async loadFaceDetectionModel() {
        try {
            // Using a simple face detection approach
            // In production, you might want to use libraries like face-api.js or MediaPipe
            this.faceDetectionModel = {
                detect: (imageData) => {
                    // Simplified face detection simulation
                    // Replace with actual face detection library
                    return this.simpleFaceDetection(imageData);
                }
            };
        } catch (error) {
            console.error('โหลดโมเดลตรวจจับใบหน้าไม่สำเร็จ:', error);
        }
    }

    setupEventListeners() {
        // Tab switch detection
        if (this.options.enableTabSwitchDetection) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.isActive) {
                    this.handleTabSwitch();
                }
            });

            window.addEventListener('focus', () => {
                if (this.isActive) {
                    this.handleWindowFocus();
                }
            });

            window.addEventListener('blur', () => {
                if (this.isActive) {
                    this.handleWindowBlur();
                }
            });
        }

        // Prevent right-click and certain keyboard shortcuts
        document.addEventListener('contextmenu', (e) => {
            if (this.isActive) {
                e.preventDefault();
                this.recordViolation('right_click_attempt');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                // Prevent common cheating shortcuts
                if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 't')) {
                    e.preventDefault();
                    this.recordViolation('keyboard_shortcut_attempt', { key: e.key });
                }
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                    e.preventDefault();
                    this.recordViolation('developer_tools_attempt');
                }
            }
        });

        // Warning modal acknowledge button
        this.warningModal.querySelector('.warning-acknowledge-btn').addEventListener('click', () => {
            this.hideWarning();
        });

        // Socket event listeners
        if (window.socket) {
            window.socket.on('proctoring_warning', (warning) => {
                this.showWarning(warning.message);
            });

            window.socket.on('test_terminated', (data) => {
                this.handleTestTermination(data);
            });
        }
    }

    startProctoring() {
        this.isActive = true;
        this.updateStatus('กำลังควบคุมการสอบ', 'active');

        // Start face detection if enabled
        if (this.options.enableFaceDetection && this.webcamStream) {
            this.startFaceDetection();
        }

        // Start screenshot capture
        this.startScreenshotCapture();

        console.log('เริ่มระบบควบคุมการสอบ');
    }

    startFaceDetection() {
        const detectFaces = () => {
            if (!this.isActive || !this.video || this.video.paused) {
                return;
            }

            try {
                // Draw current frame to canvas
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

                // Detect faces
                const faces = this.faceDetectionModel.detect(imageData);

                if (faces.length === 0) {
                    this.handleNoFaceDetected();
                } else if (faces.length > 1) {
                    this.handleMultipleFaces(faces.length);
                } else {
                    this.handleValidFace();
                }

            } catch (error) {
                console.error('การตรวจจับใบหน้าผิดพลาด:', error);
            }

            // Continue detection
            setTimeout(detectFaces, 1000); // Check every second
        };

        detectFaces();
    }

    simpleFaceDetection(imageData) {
        // Simplified face detection simulation
        // In a real implementation, use proper face detection libraries
        const brightness = this.calculateBrightness(imageData);
        const hasMovement = this.detectMovement(imageData);

        // Simple heuristic: if there's reasonable brightness and movement, assume face is present
        if (brightness > 50 && hasMovement) {
            return [{ confidence: 0.8, x: 100, y: 100, width: 200, height: 200 }];
        }
        return [];
    }

    calculateBrightness(imageData) {
        let sum = 0;
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        return sum / (data.length / 4);
    }

    detectMovement(imageData) {
        // Simple movement detection
        if (!this.lastImageData) {
            this.lastImageData = imageData;
            return true;
        }

        let diff = 0;
        const current = imageData.data;
        const last = this.lastImageData.data;

        for (let i = 0; i < current.length; i += 4) {
            diff += Math.abs(current[i] - last[i]);
        }

        this.lastImageData = imageData;
        return diff > 1000; // Threshold for movement
    }

    startScreenshotCapture() {
        const captureScreenshot = async () => {
            if (!this.isActive) {return;}

            try {
                const screenshot = await this.captureScreen();
                this.sendScreenshot(screenshot);
            } catch (error) {
                console.error('การจับภาพหน้าจอผิดพลาด:', error);
            }

            setTimeout(captureScreenshot, this.options.screenshotInterval);
        };

        captureScreenshot();
    }

    async captureScreen() {
        // Capture webcam frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        return this.canvas.toDataURL('image/jpeg', 0.7);
    }

    handleTabSwitch() {
        this.violations.tabSwitches++;
        this.recordViolation('tab_switch', {
            count: this.violations.tabSwitches,
            timestamp: new Date()
        });
    }

    handleWindowBlur() {
        this.updateStatus('ตรวจพบการเปลี่ยนหน้าต่าง', 'warning');
    }

    handleWindowFocus() {
        this.updateStatus('กลับสู่หน้าต่างการสอบ', 'active');
    }

    handleNoFaceDetected() {
        this.violations.noFaceDetected++;
        if (this.violations.noFaceDetected % 5 === 0) { // Report every 5 detections
            this.recordViolation('no_face_detected', {
                count: this.violations.noFaceDetected
            });
        }
        this.updateStatus('ไม่พบใบหน้า', 'warning');
    }

    handleMultipleFaces(count) {
        this.violations.multipleFaces++;
        this.recordViolation('multiple_faces', {
            faceCount: count,
            count: this.violations.multipleFaces
        });
        this.updateStatus(`พบใบหน้า ${count} คน`, 'error');
    }

    handleValidFace() {
        this.updateStatus('ตรวจพบใบหน้าปกติ', 'success');
    }

    recordViolation(type, data = {}) {
        if (window.socket) {
            window.socket.emit('proctoring_violation', {
                testSessionId: this.testSessionId,
                violationType: type,
                data: {
                    ...data,
                    timestamp: new Date(),
                    userAgent: navigator.userAgent
                }
            });
        }
    }

    sendScreenshot(imageData, violationType = null) {
        if (window.socket) {
            window.socket.emit('proctoring_screenshot', {
                testSessionId: this.testSessionId,
                imageData,
                violationType,
                timestamp: new Date()
            });
        }
    }

    handleWebcamError(error) {
        let message = 'ไม่สามารถเข้าถึงกล้องได้';

        if (error.name === 'NotAllowedError') {
            message = 'กรุณาอนุญาตการเข้าถึงกล้องเพื่อทำการสอบ';
        } else if (error.name === 'NotFoundError') {
            message = 'ไม่พบกล้องในอุปกรณ์';
        }

        this.showWarning(message);

        // Notify server about webcam issues
        this.recordViolation('webcam_error', {
            errorName: error.name,
            errorMessage: error.message
        });
    }

    updateStatus(message, type = 'info') {
        const statusText = this.statusIndicator.querySelector('.status-text');
        const statusIcon = this.statusIndicator.querySelector('.status-icon');

        statusText.textContent = message;

        // Update icon based on type
        const iconMap = {
            success: 'fas fa-video',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-video-slash',
            active: 'fas fa-video',
            info: 'fas fa-info-circle'
        };

        statusIcon.className = `status-icon ${iconMap[type] || 'fas fa-info-circle'}`;
        this.statusIndicator.className = `proctoring-status ${type}`;
    }

    showWarning(message) {
        const warningMessage = this.warningModal.querySelector('.warning-message');
        warningMessage.textContent = message;
        this.warningModal.classList.remove('hidden');

        // Auto-hide after specified time
        setTimeout(() => {
            this.hideWarning();
        }, this.options.warningDisplayTime);
    }

    hideWarning() {
        this.warningModal.classList.add('hidden');
    }

    handleTestTermination(data) {
        this.stopProctoring();

        // Show termination message
        alert(`การสอบถูกยุติ: ${data.message}`);

        // Redirect to results or appropriate page
        window.location.href = '/test-results';
    }

    stopProctoring() {
        this.isActive = false;

        // Stop webcam
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
        }

        // Clean up UI
        if (this.statusIndicator) {
            this.statusIndicator.remove();
        }
        if (this.warningModal) {
            this.warningModal.remove();
        }
        if (this.webcamPreview) {
            this.webcamPreview.remove();
        }

        // Notify server
        if (window.socket) {
            window.socket.emit('proctoring_ended', {
                testSessionId: this.testSessionId,
                endTime: new Date()
            });
        }

        console.log('หยุดระบบควบคุมการสอบ');
    }

    // Public methods for external control
    pause() {
        this.isActive = false;
        this.updateStatus('หยุดชั่วคราว', 'warning');
    }

    resume() {
        this.isActive = true;
        this.updateStatus('กำลังควบคุมการสอบ', 'active');
    }

    getCurrentViolations() {
        return this.violations;
    }

    isWebcamActive() {
        return this.webcamStream && this.webcamStream.active;
    }
}

// CSS styles for proctoring UI
const proctoringStyles = `
.proctoring-status {
    position: fixed;
    top: 10px;
    right: 10px;
    background: white;
    border-radius: 8px;
    padding: 10px 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 10000;
    font-size: 14px;
    border-left: 4px solid #10b981;
}

.proctoring-status.success {
    border-left-color: #10b981;
}

.proctoring-status.warning {
    border-left-color: #f59e0b;
}

.proctoring-status.error {
    border-left-color: #ef4444;
}

.proctoring-status.active {
    border-left-color: #3b82f6;
}

.status-content {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.webcam-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.recording-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #666;
}

.recording-dot {
    width: 8px;
    height: 8px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.webcam-preview {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 200px;
    height: 150px;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.webcam-preview video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.preview-status {
    position: absolute;
    top: 8px;
    left: 8px;
    color: white;
    font-size: 12px;
}

.proctoring-warning-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
}

.proctoring-warning-modal.hidden {
    display: none;
}

.warning-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

.warning-icon {
    font-size: 48px;
    color: #f59e0b;
    margin-bottom: 20px;
}

.warning-message {
    font-size: 18px;
    margin-bottom: 20px;
    line-height: 1.5;
    color: #333;
}

.warning-acknowledge-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.2s;
}

.warning-acknowledge-btn:hover {
    background: #2563eb;
}

@media (max-width: 768px) {
    .proctoring-status {
        top: 5px;
        right: 5px;
        font-size: 12px;
        padding: 8px 12px;
    }

    .webcam-preview {
        width: 120px;
        height: 90px;
        bottom: 10px;
        right: 10px;
    }

    .warning-content {
        margin: 20px;
        padding: 20px;
    }
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = proctoringStyles;
document.head.appendChild(styleSheet);

// Export for use
window.WebcamProctoring = WebcamProctoring;