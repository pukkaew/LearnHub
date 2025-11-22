// Course Creation 4-Step Wizard JavaScript
let currentStep = 1;
const totalSteps = 4;

document.addEventListener('DOMContentLoaded', function() {
    initializeWizard();
    loadInitialData();
});

function initializeWizard() {
    initializeTranslations();  // โหลดคำแปลก่อนอื่น
    updateStepDisplay();
    setupEventListeners();
    setupRichTextEditor();
    setupFileHandlers();
    setupAutoSave();
    setupDateTimePickers();
}

function changeStep(direction) {
    const nextStep = currentStep + direction;

    if (nextStep < 1 || nextStep > totalSteps) {return;}

    // Validate current step before moving
    if (direction > 0 && !validateStep(currentStep)) {
        return;
    }

    currentStep = nextStep;
    updateStepDisplay();
}

function updateStepDisplay() {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        const circleElement = document.getElementById(`step-${i}-circle`);

        if (stepElement) {
            stepElement.style.display = i === currentStep ? 'block' : 'none';
        }

        if (circleElement) {
            if (i < currentStep) {
                // Completed step
                circleElement.className = 'w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mb-2';
                circleElement.innerHTML = '<i class="fas fa-check"></i>';
            } else if (i === currentStep) {
                // Current step
                circleElement.className = 'w-10 h-10 bg-ruxchai-primary rounded-full flex items-center justify-center text-white font-semibold mb-2';
                circleElement.innerHTML = i;
            } else {
                // Future step
                circleElement.className = 'w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold mb-2';
                circleElement.innerHTML = i;
            }
        }
    }

    // Update progress bar
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // Update navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (prevBtn) {prevBtn.style.display = currentStep > 1 ? 'block' : 'none';}
    if (nextBtn) {nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';}
    if (submitBtn) {submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';}
}

function validateStep(step) {
    switch (step) {
    case 1:
        return validateStep1();
    case 2:
        return validateStep2();
    case 3:
        return validateStep3();
    case 4:
        return validateStep4();
    default:
        return true;
    }
}

function validateStep1() {
    const required = ['course_name', 'category_id', 'difficulty_level', 'course_type', 'language'];
    for (const field of required) {
        const element = document.getElementById(field) || document.querySelector(`[name="${field}"]`);
        if (!element || !element.value.trim()) {
            showError(`กรุณากรอกข้อมูล: ${getFieldLabel(field)}`);
            element?.focus();
            return false;
        }
    }

    // Validate course name length (minimum 10 characters)
    const courseName = document.getElementById('course_name');
    if (courseName && courseName.value.trim().length < 10) {
        showError('ชื่อหลักสูตรต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
        courseName.focus();
        return false;
    }

    // instructor_name is optional, so we don't validate it
    return true;
}

function validateStep2() {
    const description = document.getElementById('description');
    if (!description || description.textContent.trim().length < 50) {
        showError('กรุณากรอกคำอธิบายหลักสูตรอย่างน้อย 50 ตัวอักษร');
        description?.focus();
        return false;
    }

    // Validate objectives
    const objectives = document.querySelectorAll('input[name="objectives[]"]');
    let validObjectives = 0;
    objectives.forEach(obj => {
        if (obj.value.trim()) {validObjectives++;}
    });

    if (validObjectives < 3) {
        showError('กรุณากรอกวัตถุประสงค์การเรียนรู้อย่างน้อย 3 ข้อ');
        return false;
    }

    // Validate duration_hours
    const durationHours = document.getElementById('duration_hours');
    if (!durationHours || !durationHours.value || parseFloat(durationHours.value) <= 0) {
        showError('กรุณาระบุระยะเวลาเรียนอย่างน้อย 1 ชั่วโมง หรือมากกว่า');
        durationHours?.focus();
        return false;
    }

    // Target positions and departments are OPTIONAL
    // If neither selected = open for everyone
    // If only positions = all departments for those positions
    // If only departments = all positions in those departments
    // If both = positions AND departments (OR logic for enrollment)

    return true;
}

function validateStep3() {
    // Course image is now optional - will use default if not uploaded

    // Validate lessons
    const lessonTitles = document.querySelectorAll('input[name="lesson_titles[]"]');
    let validLessons = 0;
    lessonTitles.forEach(lesson => {
        if (lesson.value.trim()) {validLessons++;}
    });

    if (validLessons < 1) {
        showError('กรุณาเพิ่มบทเรียนอย่างน้อย 1 บท');
        return false;
    }

    return true;
}

function validateStep4() {
    // Check if creating new test
    const assessmentType = document.querySelector('input[name="assessment_type"]:checked');
    if (assessmentType && assessmentType.value === 'create_new') {
        // Validate test duration
        const testDuration = document.getElementById('new_test_duration');
        if (testDuration && testDuration.value) {
            const duration = parseFloat(testDuration.value);
            if (duration < 5 || duration > 480) {
                showError('ระยะเวลาข้อสอบต้องอยู่ระหว่าง 5-480 นาที');
                testDuration.focus();
                return false;
            }
        }

        // Validate passing score
        const passingScore = document.getElementById('new_passing_score');
        if (passingScore && passingScore.value !== '') {
            const score = parseFloat(passingScore.value);
            if (isNaN(score) || score < 0 || score > 100) {
                showError('เกณฑ์การผ่านต้องอยู่ระหว่าง 0-100');
                passingScore.focus();
                return false;
            }
        }

        // Validate max attempts
        const maxAttempts = document.getElementById('new_max_attempts');
        if (maxAttempts && maxAttempts.value !== '') {
            const attempts = parseInt(maxAttempts.value);
            if (isNaN(attempts) || attempts < 0) {
                showError('จำนวนครั้งที่สอบได้ต้องเป็นจำนวนเต็มบวกหรือ 0 (ไม่จำกัด)');
                maxAttempts.focus();
                return false;
            }
        }
    }

    return true;
}

function getFieldLabel(fieldName) {
    const labels = {
        'course_name': 'ชื่อหลักสูตร',
        'category_id': 'หมวดหมู่',
        'difficulty_level': 'ระดับความยาก',
        'course_type': 'ประเภทหลักสูตร',
        'language': 'ภาษาที่ใช้สอน',
        'instructor_name': 'ผู้สอน'
    };
    return labels[fieldName] || fieldName;
}

// Rich Text Editor Functions
function setupRichTextEditor() {
    const editor = document.getElementById('description');
    const hiddenInput = document.getElementById('description-input');
    const charCount = document.getElementById('char-count');

    if (!editor) {return;}

    editor.addEventListener('input', function() {
        const text = this.textContent;
        if (charCount) {
            charCount.textContent = `${text.length}/1000 ตัวอักษร`;
            if (text.length > 1000) {
                charCount.className = 'text-xs text-red-500';
            } else {
                charCount.className = 'text-xs text-gray-500';
            }
        }

        if (hiddenInput) {
            hiddenInput.value = this.innerHTML;
        }
    });

    editor.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    });
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('description').focus();
}

// Learning Objectives Management
function addObjective() {
    const container = document.getElementById('learning-objectives');
    const count = container.children.length + 1;

    const div = document.createElement('div');
    div.className = 'flex items-start space-x-2';
    div.innerHTML = `
        <span class="text-gray-400 mt-2">${count}.</span>
        <input type="text" name="objectives[]" required
               class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
               placeholder="ผู้เรียนสามารถ...">
        <button type="button" onclick="removeObjective(this)" class="mt-2 text-red-600 hover:text-red-800">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
    updateObjectiveNumbers();
}

function removeObjective(button) {
    const container = document.getElementById('learning-objectives');
    if (container.children.length > 3) {
        button.closest('div').remove();
        updateObjectiveNumbers();
    }
}

function updateObjectiveNumbers() {
    const container = document.getElementById('learning-objectives');
    const spans = container.querySelectorAll('span');
    spans.forEach((span, index) => {
        span.textContent = `${index + 1}.`;
    });
}

// Lessons Management
function addLesson() {
    const container = document.getElementById('lessons-container');
    const lessonNumber = container.children.length + 1;

    const div = document.createElement('div');
    div.className = 'lesson-item border border-gray-200 rounded-lg p-4 bg-gray-50';
    div.setAttribute('data-lesson', lessonNumber);
    div.innerHTML = `
        <div class="flex items-start justify-between mb-3">
            <div class="flex items-center">
                <i class="fas fa-grip-vertical text-gray-400 mr-3 cursor-move"></i>
                <span class="font-medium text-gray-700">บทที่ ${lessonNumber}:</span>
            </div>
            <button type="button" onclick="removeLesson(this)" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>

        <!-- ชื่อและระยะเวลา -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input type="text" name="lesson_titles[]"
                   class="rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                   placeholder="ชื่อบทเรียน">
            <input type="number" name="lesson_durations[]" min="1"
                   class="rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                   placeholder="ระยะเวลา (นาที)">
        </div>

        <!-- คำอธิบาย -->
        <textarea name="lesson_descriptions[]" rows="2"
                  class="w-full mb-3 rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                  placeholder="คำอธิบายบทเรียน"></textarea>

        <!-- วิดีโอบทเรียน -->
        <div class="bg-white rounded-md border border-gray-200 p-3 mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-video mr-1 text-blue-600"></i>วิดีโอบทเรียน
            </label>
            <div class="space-y-2">
                <div class="flex items-center gap-2">
                    <input type="file" name="lesson_videos[]" accept="video/*"
                           class="hidden lesson-video-file" onchange="handleLessonVideoUpload(this)">
                    <button type="button" onclick="this.previousElementSibling.click()"
                            class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50">
                        <i class="fas fa-upload mr-2"></i>อัปโหลดวิดีโอ
                    </button>
                    <span class="text-xs text-gray-500 lesson-video-name"></span>
                </div>
                <div class="flex items-center">
                    <span class="text-xs text-gray-500 mr-2">หรือ</span>
                    <input type="text" name="lesson_video_urls[]"
                           class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                           placeholder="ใส่ลิงก์ YouTube/Vimeo (เช่น https://www.youtube.com/watch?v=...)">
                </div>
                <p class="text-xs text-gray-500">
                    <i class="fas fa-info-circle mr-1"></i>MP4, AVI, MOV (ไม่เกิน 500MB) หรือใส่ลิงก์วิดีโอ
                </p>
            </div>
        </div>

        <!-- เอกสารประกอบบทเรียน -->
        <div class="bg-white rounded-md border border-gray-200 p-3">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-file-pdf mr-1 text-red-600"></i>เอกสารประกอบ
            </label>
            <div class="space-y-2">
                <input type="file" name="lesson_documents[]" multiple
                       accept=".pdf,.ppt,.pptx,.doc,.docx,.xlsx,.xls"
                       class="hidden lesson-documents-file" onchange="handleLessonDocumentsUpload(this)">
                <button type="button" onclick="this.previousElementSibling.click()"
                        class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50">
                    <i class="fas fa-paperclip mr-2"></i>แนบเอกสาร
                </button>
                <div class="lesson-documents-list text-xs text-gray-600"></div>
                <p class="text-xs text-gray-500">
                    <i class="fas fa-info-circle mr-1"></i>PDF, PPT, DOC, Excel (ไม่เกิน 50MB/ไฟล์)
                </p>
            </div>
        </div>

        <!-- แบบทดสอบย่อย (Knowledge Check) -->
        <div class="bg-amber-50 rounded-md border border-amber-200 p-3 mt-3">
            <div class="flex items-center justify-between mb-2">
                <label class="flex items-center text-sm font-medium text-gray-700">
                    <input type="checkbox" name="lesson_has_quiz[]" class="rounded border-gray-300 text-ruxchai-primary mr-2" onchange="toggleLessonQuiz(this)">
                    <i class="fas fa-clipboard-check mr-1 text-amber-600"></i>เพิ่มแบบทดสอบย่อยท้ายบทเรียน
                </label>
            </div>
            <div class="lesson-quiz-options" style="display: none;">
                <p class="text-xs text-gray-600 mb-2">
                    <i class="fas fa-info-circle mr-1"></i>แบบทดสอบย่อยจะเปิดให้ทำอัตโนมัติเมื่อผู้เรียนดูบทเรียนจบ
                </p>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="text-xs text-gray-600">จำนวนข้อ</label>
                        <input type="number" name="lesson_quiz_questions[]" min="1" value="5"
                               class="w-full text-sm rounded border-gray-300 focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                               placeholder="5">
                    </div>
                    <div>
                        <label class="text-xs text-gray-600">เวลาทำ (นาที)</label>
                        <input type="number" name="lesson_quiz_duration[]" min="1" value="10"
                               class="w-full text-sm rounded border-gray-300 focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                               placeholder="10">
                    </div>
                    <div>
                        <label class="text-xs text-gray-600">คะแนนผ่าน (%)</label>
                        <input type="number" name="lesson_quiz_passing[]" min="0" max="100" value="60"
                               class="w-full text-sm rounded border-gray-300 focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                               placeholder="60">
                    </div>
                    <div>
                        <label class="text-xs text-gray-600">ทำได้กี่ครั้ง</label>
                        <input type="number" name="lesson_quiz_attempts[]" min="1" value="3"
                               class="w-full text-sm rounded border-gray-300 focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                               placeholder="3">
                    </div>
                </div>
                <div class="mt-2 flex items-center gap-3">
                    <label class="flex items-center text-xs text-gray-600">
                        <input type="checkbox" name="lesson_quiz_required[]" class="rounded border-gray-300 text-ruxchai-primary mr-1">
                        ต้องทำก่อนไปบทถัดไป
                    </label>
                    <label class="flex items-center text-xs text-gray-600">
                        <input type="checkbox" name="lesson_quiz_graded[]" class="rounded border-gray-300 text-ruxchai-primary mr-1">
                        นับคะแนนรวม
                    </label>
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);
}

// Toggle lesson quiz options
function toggleLessonQuiz(checkbox) {
    const lessonItem = checkbox.closest('.lesson-item');
    const quizOptions = lessonItem.querySelector('.lesson-quiz-options');
    if (quizOptions) {
        quizOptions.style.display = checkbox.checked ? 'block' : 'none';
    }
}

function removeLesson(button) {
    const container = document.getElementById('lessons-container');
    if (container.children.length > 1) {
        button.closest('.lesson-item').remove();
        updateLessonNumbers();
    }
}

function updateLessonNumbers() {
    const lessons = document.querySelectorAll('.lesson-item');
    lessons.forEach((lesson, index) => {
        const span = lesson.querySelector('span');
        if (span) {
            span.textContent = `บทที่ ${index + 1}:`;
        }
        lesson.setAttribute('data-lesson', index + 1);
    });
}

// Lesson Video Upload Handler
function handleLessonVideoUpload(input) {
    const file = input.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('video/')) {
            showError('กรุณาเลือกไฟล์วิดีโอเท่านั้น');
            input.value = '';
            return;
        }

        // Validate file size (500MB max)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            showError('ขนาดไฟล์ต้องไม่เกิน 500MB');
            input.value = '';
            return;
        }

        // Display file name
        const lessonItem = input.closest('.lesson-item');
        const nameDisplay = lessonItem.querySelector('.lesson-video-name');
        if (nameDisplay) {
            nameDisplay.textContent = `📹 ${file.name} (${formatFileSize(file.size)})`;
            nameDisplay.classList.add('text-green-600');
        }
    }
}

// Lesson Documents Upload Handler
function handleLessonDocumentsUpload(input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;

    const lessonItem = input.closest('.lesson-item');
    const docsList = lessonItem.querySelector('.lesson-documents-list');
    if (!docsList) return;

    // Clear previous list
    docsList.innerHTML = '';

    let hasError = false;
    const maxSize = 50 * 1024 * 1024; // 50MB per file

    files.forEach((file, index) => {
        // Validate file type
        const validTypes = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xlsx', '.xls'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (!validTypes.includes(fileExt)) {
            showError(`ไฟล์ ${file.name} ไม่ใช่ประเภทที่รองรับ`);
            hasError = true;
            return;
        }

        // Validate file size
        if (file.size > maxSize) {
            showError(`ไฟล์ ${file.name} มีขนาดเกิน 50MB`);
            hasError = true;
            return;
        }

        // Create file item display
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between py-1 px-2 bg-gray-50 rounded mt-1';
        fileItem.innerHTML = `
            <span class="flex items-center text-gray-700">
                <i class="fas fa-file-${getFileIcon(fileExt)} mr-2 text-gray-500"></i>
                <span class="text-xs">${file.name}</span>
                <span class="text-xs text-gray-500 ml-2">(${formatFileSize(file.size)})</span>
            </span>
        `;
        docsList.appendChild(fileItem);
    });

    if (hasError) {
        input.value = '';
        docsList.innerHTML = '';
    }
}

// Helper function to get file icon
function getFileIcon(extension) {
    const icons = {
        '.pdf': 'pdf',
        '.ppt': 'powerpoint',
        '.pptx': 'powerpoint',
        '.doc': 'word',
        '.docx': 'word',
        '.xlsx': 'excel',
        '.xls': 'excel'
    };
    return icons[extension] || 'alt';
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Assessment/Test Management
function toggleTestOptions() {
    const assessmentType = document.querySelector('input[name="assessment_type"]:checked').value;
    const existingSection = document.getElementById('existing-test-section');
    const createSection = document.getElementById('create-test-section');

    // Hide all sections first
    if (existingSection) existingSection.style.display = 'none';
    if (createSection) createSection.style.display = 'none';

    // Show relevant section
    if (assessmentType === 'existing' && existingSection) {
        existingSection.style.display = 'block';
    } else if (assessmentType === 'create_new' && createSection) {
        createSection.style.display = 'block';
    }
}

async function loadAvailableTests() {
    try {
        const response = await fetch('/courses/api/tests/available');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('selected_test_id');
            if (select) {
                // Clear existing options except first one
                while (select.options.length > 1) {
                    select.remove(1);
                }

                // Add tests
                result.data.forEach(test => {
                    const option = document.createElement('option');
                    option.value = test.test_id;
                    option.textContent = test.title || test.test_name;  // Support both field names
                    option.dataset.detail = JSON.stringify(test);
                    select.appendChild(option);
                });

                // Add change event listener
                select.addEventListener('change', function() {
                    const selectedOption = this.options[this.selectedIndex];
                    const infoDiv = document.getElementById('selected-test-info');
                    const detailP = document.getElementById('test-info-detail');

                    if (selectedOption.dataset.detail && infoDiv && detailP) {
                        const test = JSON.parse(selectedOption.dataset.detail);
                        let details = `${test.title || test.test_name}`;
                        if (test.total_questions) {
                            details += ` - ${test.total_questions} ข้อ`;
                        }
                        if (test.passing_score) {
                            details += `, เกณฑ์ผ่าน ${test.passing_score}%`;
                        }
                        const duration = test.time_limit || test.duration_minutes;  // Support both field names
                        if (duration) {
                            details += `, เวลา ${duration} นาที`;
                        }
                        if (test.test_type) {
                            const typeNames = {
                                'final_exam': 'สอบปลายภาค',
                                'practice_test': 'แบบฝึกหัด',
                                'chapter_quiz': 'แบบทดสอบรายบท',
                                'lesson_quiz': 'แบบทดสอบรายบท',
                                'standalone_test': 'ข้อสอบอิสระ'
                            };
                            details += ` (${typeNames[test.test_type] || test.test_type})`;
                        }

                        detailP.textContent = details;
                        infoDiv.style.display = 'block';
                    } else if (infoDiv) {
                        infoDiv.style.display = 'none';
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading tests:', error);
    }
}

// External Links Management
function addExternalLink() {
    const container = document.getElementById('external-links');
    const div = document.createElement('div');
    div.className = 'flex space-x-2';
    div.innerHTML = `
        <input type="url" name="external_links[]"
               class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
               placeholder="https://example.com">
        <button type="button" onclick="removeLink(this)" class="text-red-600 hover:text-red-800">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeLink(button) {
    button.closest('div').remove();
}

// File Handling
function setupFileHandlers() {
    const courseImage = document.getElementById('course_image');
    if (courseImage) {
        courseImage.addEventListener('change', previewCourseImage);
    }

    const materials = document.getElementById('course_materials');
    if (materials) {
        materials.addEventListener('change', handleMaterialsUpload);
    }
}

function previewCourseImage(input) {
    if (!input || !input.files || input.files.length === 0) {
        return;
    }

    const file = input.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            input.value = '';
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            showError('ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('course-image-preview');
            if (preview) {
                preview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

function handleMaterialsUpload(event) {
    const input = event.target;
    if (!input || !input.files) {
        console.error('❌ No files selected');
        return;
    }

    const files = Array.from(input.files);
    const list = document.getElementById('materials-list');

    files.forEach(file => {
        // Validate file size (50MB)
        if (file.size > 50 * 1024 * 1024) {
            showError(`ไฟล์ ${file.name} มีขนาดเกิน 50MB`);
            return;
        }

        // Create file item
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-gray-50 rounded';
        div.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-file-alt text-gray-500 mr-2"></i>
                <span class="text-sm">${file.name}</span>
                <span class="text-xs text-gray-500 ml-2">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" onclick="removeMaterial(this)" class="text-red-600 hover:text-red-800">
                <i class="fas fa-times"></i>
            </button>
        `;
        list.appendChild(div);
    });
}

function removeMaterial(button) {
    button.closest('div').remove();
}

function formatFileSize(bytes) {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Auto-save functionality
function setupAutoSave() {
    // Disabled auto-save for now
    // setInterval(saveDraft, 60000); // Auto-save every minute
}

async function saveDraft() {
    // Draft functionality temporarily disabled
    // Will be implemented with proper draft endpoint
    console.log('Draft save is currently disabled');
}

// DateTime Pickers Setup
function setupDateTimePickers() {
    // Initialize Flatpickr for enrollment start date
    flatpickr("#enrollment_start", {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true,
        minDate: "today",
        locale: {
            firstDayOfWeek: 1
        },
        onChange: function(selectedDates, dateStr, instance) {
            // Update minDate for enrollment_end
            const endPicker = document.getElementById('enrollment_end')._flatpickr;
            if (endPicker && selectedDates.length > 0) {
                endPicker.set('minDate', selectedDates[0]);
            }
        }
    });

    // Initialize Flatpickr for enrollment end date
    flatpickr("#enrollment_end", {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true,
        minDate: "today",
        locale: {
            firstDayOfWeek: 1
        }
    });

    // Initialize Flatpickr for test available_from date
    flatpickr("#new_available_from", {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true,
        minDate: "today",
        locale: {
            firstDayOfWeek: 1
        },
        onChange: function(selectedDates, dateStr, instance) {
            // Update minDate for available_until
            const untilPicker = document.getElementById('new_available_until')._flatpickr;
            if (untilPicker && selectedDates.length > 0) {
                untilPicker.set('minDate', selectedDates[0]);
            }
        }
    });

    // Initialize Flatpickr for test available_until date
    flatpickr("#new_available_until", {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        time_24hr: true,
        minDate: "today",
        locale: {
            firstDayOfWeek: 1
        }
    });

    console.log('✅ DateTime pickers initialized');
}

// Data Loading
async function loadInitialData() {
    await Promise.all([
        loadCategories(),
        loadPositions(),
        loadDepartments(),
        loadPrerequisites(),
        loadAvailableTests()
    ]);
    generateCourseCode();
}

async function loadCategories() {
    try {
        const response = await fetch('/courses/api/categories');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('category_id');
            result.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.category_id;
                option.textContent = category.category_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Test Type Configurations - คุณสมบัติของแต่ละประเภท (8 แบบ - เหมาะสมกับระบบอบรม)
// ชื่อและคำอธิบายจะดึงจาก window.testTypeTranslations ที่ set จาก EJS
const TEST_TYPE_CONFIG = {
    // ก่อน-หลังอบรม
    'pre_training_assessment': {
        title: '', // Will be set from translations
        detail: '', // Will be set from translations
        tags: [
            { icon: 'times-circle', text: 'ไม่นับคะแนน', color: 'gray' },
            { icon: 'info-circle', text: 'ไม่บังคับ', color: 'gray' },
            { icon: 'redo', text: 'ทำได้ 1 ครั้ง', color: 'gray' }
        ],
        defaults: { is_graded: false, is_required: false, is_passing_required: false, max_attempts: 1, score_weight: 0, show_answer: 'immediately' }
    },
    'post_training_assessment': {
        title: 'แบบทดสอบหลังอบรม (Post-training Assessment)',
        detail: 'ทดสอบหลังอบรมจบ เปรียบเทียบกับก่อนอบรม เพื่อวัดความก้าวหน้า',
        tags: [
            { icon: 'check-circle', text: 'นับคะแนน', color: 'blue' },
            { icon: 'info-circle', text: 'ควรทำ', color: 'blue' },
            { icon: 'redo', text: 'ทำซ้ำได้ 2 ครั้ง', color: 'blue' }
        ],
        defaults: { is_graded: true, is_required: true, is_passing_required: false, max_attempts: 2, score_weight: 20, show_answer: 'after_close' }
    },

    // ระหว่างอบรม
    'knowledge_check': {
        title: 'แบบทดสอบย่อย (Knowledge Check)',
        detail: 'ทดสอบย่อยระหว่างอบรม เช็คความเข้าใจแต่ละหัวข้อ นับคะแนน 10-15%',
        tags: [
            { icon: 'check-circle', text: 'นับคะแนน', color: 'blue' },
            { icon: 'info-circle', text: 'ควรทำ', color: 'blue' },
            { icon: 'redo', text: 'ทำซ้ำได้ 2-3 ครั้ง', color: 'blue' }
        ],
        defaults: { is_graded: true, is_required: true, is_passing_required: false, max_attempts: 3, score_weight: 10, show_answer: 'immediately' }
    },
    'progress_assessment': {
        title: 'แบบประเมินความก้าวหน้า (Progress Assessment)',
        detail: 'ประเมินความก้าวหน้าต่อเนื่องระหว่างอบรม เช็คจุดที่เข้าใจและควรทบทวน',
        tags: [
            { icon: 'check-circle', text: 'นับคะแนน', color: 'blue' },
            { icon: 'exclamation-circle', text: 'ต้องทำ', color: 'orange' },
            { icon: 'redo', text: 'ทำซ้ำได้ 2 ครั้ง', color: 'blue' }
        ],
        defaults: { is_graded: true, is_required: true, is_passing_required: false, max_attempts: 2, score_weight: 15, show_answer: 'immediately' }
    },

    // หลัก
    'midcourse_assessment': {
        title: 'แบบทดสอบกลางหลักสูตร (Mid-course Assessment)',
        detail: 'ทดสอบกลางหลักสูตร สำหรับหลักสูตรยาว นับคะแนน 30-40%',
        tags: [
            { icon: 'check-circle', text: 'นับคะแนน', color: 'blue' },
            { icon: 'exclamation-circle', text: 'ต้องทำ', color: 'orange' },
            { icon: 'redo', text: 'ทำได้ 1 ครั้ง', color: 'red' }
        ],
        defaults: { is_graded: true, is_required: true, is_passing_required: true, max_attempts: 1, score_weight: 30, show_answer: 'after_close' }
    },
    'final_assessment': {
        title: 'แบบทดสอบท้ายหลักสูตร (Final Assessment)',
        detail: 'ทดสอบหลักเพื่อจบหลักสูตร นับคะแนน 40-50% ต้องผ่านถึงจะได้ Certificate',
        tags: [
            { icon: 'check-circle', text: 'นับคะแนน', color: 'blue' },
            { icon: 'exclamation-circle', text: 'ต้องทำ', color: 'orange' },
            { icon: 'redo', text: 'ทำได้ 1 ครั้ง', color: 'red' }
        ],
        defaults: { is_graded: true, is_required: true, is_passing_required: true, max_attempts: 1, score_weight: 50, show_answer: 'after_close' }
    },
    'certification_assessment': {
        title: 'แบบทดสอบรับใบประกาศนียบัตร (Certification Assessment)',
        detail: 'ทดสอบเพื่อรับ Certificate อย่างเป็นทางการ เข้มงวดสูงสุด',
        tags: [
            { icon: 'check-circle', text: 'นับคะแนน', color: 'blue' },
            { icon: 'exclamation-circle', text: 'ต้องทำ', color: 'orange' },
            { icon: 'redo', text: 'ทำได้ 1 ครั้ง', color: 'red' }
        ],
        defaults: { is_graded: true, is_required: true, is_passing_required: true, max_attempts: 1, score_weight: 100, show_answer: 'never' }
    },

    // ฝึกหัด
    'practice_exercise': {
        title: 'แบบฝึกหัด (Practice Exercise)',
        detail: 'ฝึกทำได้ไม่จำกัด ไม่นับคะแนน เหมาะสำหรับฝึกฝนและทบทวน',
        tags: [
            { icon: 'times-circle', text: 'ไม่นับคะแนน', color: 'gray' },
            { icon: 'info-circle', text: 'ไม่บังคับ', color: 'gray' },
            { icon: 'redo', text: 'ทำซ้ำได้ไม่จำกัด', color: 'green' }
        ],
        defaults: { is_graded: false, is_required: false, is_passing_required: false, max_attempts: null, score_weight: 0, show_answer: 'immediately' }
    }
};

// Initialize translations from server-side - โหลดคำแปลจากเซิร์ฟเวอร์
function initializeTranslations() {
    if (window.testTypeTranslations) {
        Object.keys(TEST_TYPE_CONFIG).forEach(key => {
            if (window.testTypeTranslations.testTypes[key]) {
                TEST_TYPE_CONFIG[key].title = window.testTypeTranslations.testTypes[key];
            }
            if (window.testTypeTranslations.testTypeDescriptions[key]) {
                TEST_TYPE_CONFIG[key].detail = window.testTypeTranslations.testTypeDescriptions[key];
            }
        });
        console.log('✅ Initialized test type translations');
    } else {
        console.warn('⚠️  testTypeTranslations not found');
    }
}

// Handle test type change - เมื่อเปลี่ยนประเภทข้อสอบ
function handleTestTypeChange() {
    const selectElement = document.getElementById('new_test_type');
    const testType = selectElement.value;
    const config = TEST_TYPE_CONFIG[testType];

    if (!config) return;

    // Update description
    document.getElementById('test-type-title').textContent = config.title;
    document.getElementById('test-type-detail').textContent = config.detail;

    // Update tags
    const tagsContainer = document.getElementById('test-type-tags');
    tagsContainer.innerHTML = config.tags.map(tag => {
        const colorClass = tag.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                          tag.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                          tag.color === 'red' ? 'bg-red-100 text-red-800' :
                          tag.color === 'green' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}">
            <i class="fas fa-${tag.icon} mr-1"></i> ${tag.text}
        </span>`;
    }).join('');

    // Apply defaults
    const defaults = config.defaults;

    // Checkboxes
    document.getElementById('new_is_graded').checked = defaults.is_graded;
    document.getElementById('new_is_required').checked = defaults.is_required;
    document.getElementById('new_is_passing_required').checked = defaults.is_passing_required;

    // Max attempts (null = unlimited)
    const maxAttemptsInput = document.getElementById('new_max_attempts');
    if (defaults.max_attempts === null) {
        maxAttemptsInput.value = '';
        maxAttemptsInput.placeholder = 'ไม่จำกัด';
    } else {
        maxAttemptsInput.value = defaults.max_attempts;
        maxAttemptsInput.placeholder = `เช่น ${defaults.max_attempts}`;
    }

    // Score weight
    document.getElementById('new_score_weight').value = defaults.score_weight || '';

    // Show answer
    document.getElementById('new_show_answer').value = defaults.show_answer;

    // Show/hide available dates based on test type
    const availableDatesSection = document.querySelector('#step-4 .space-y-6 > div:has(#new_available_from)');
    if (availableDatesSection) {
        // Test types that require scheduled dates
        const scheduledTypes = [
            'pre_training_assessment',
            'post_training_assessment',
            'midcourse_assessment',
            'final_assessment',
            'certification_assessment'
        ];

        if (scheduledTypes.includes(testType)) {
            availableDatesSection.style.display = 'block';
        } else {
            availableDatesSection.style.display = 'none';
            // Clear date values when hidden
            document.getElementById('new_available_from').value = '';
            document.getElementById('new_available_until').value = '';
        }
    }

    console.log(`✅ Changed test type to: ${config.title}`);
}

// Toggle proctoring options visibility
function toggleProctoringOptions() {
    const checkbox = document.getElementById('new_enable_proctoring');
    const options = document.getElementById('proctoring-options');

    if (checkbox && options) {
        options.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Store all positions for filtering
let allPositions = [];

async function loadPositions() {
    try {
        const response = await fetch('/courses/api/target-positions');
        const result = await response.json();

        if (result.success) {
            allPositions = result.data; // Store for cascading
            const select = document.getElementById('target_positions');
            select.innerHTML = '';

            // Add all positions initially
            result.data.forEach(position => {
                const option = document.createElement('option');
                option.value = position.position_id;
                option.textContent = position.position_name;
                option.dataset.unitId = position.unit_id || '';
                option.dataset.level = position.level || '';
                select.appendChild(option);
            });

            console.log(`✅ Loaded ${result.data.length} positions`);
        }
    } catch (error) {
        console.error('❌ Error loading positions:', error);
        const select = document.getElementById('target_positions');
        select.innerHTML = '<option value="" disabled>ไม่สามารถโหลดข้อมูลได้</option>';
    }
}

async function loadDepartments() {
    try {
        const response = await fetch('/courses/api/target-departments');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('target_departments');
            // Clear loading message
            select.innerHTML = '';

            // Group by level_id for better organization
            const grouped = {};
            result.data.forEach(dept => {
                const levelId = dept.level_id || 0;
                if (!grouped[levelId]) grouped[levelId] = [];
                grouped[levelId].push(dept);
            });

            // Add departments sorted by level
            Object.keys(grouped).sort((a, b) => a - b).forEach(levelId => {
                grouped[levelId].forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.unit_id;
                    // Add indentation based on level for visual hierarchy
                    const indent = dept.level_id > 1 ? '  '.repeat(dept.level_id - 1) : '';
                    option.textContent = `${indent}${dept.unit_name_th}`;
                    option.dataset.levelId = dept.level_id;
                    option.dataset.levelCode = dept.level_code || '';
                    select.appendChild(option);
                });
            });

            console.log(`✅ Loaded ${result.data.length} departments`);
        }
    } catch (error) {
        console.error('❌ Error loading departments:', error);
        const select = document.getElementById('target_departments');
        select.innerHTML = '<option value="" disabled>ไม่สามารถโหลดข้อมูลได้</option>';
    }
}

async function loadPrerequisites() {
    try {
        const response = await fetch('/courses/api/list');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('prerequisites');
            result.data.forEach(course => {
                const option = document.createElement('option');
                option.value = course.course_id;
                option.textContent = `${course.course_code} - ${course.course_name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading prerequisites:', error);
    }
}

function generateCourseCode() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const code = `CRS-${year}-${random}`;

    const input = document.getElementById('course_code');
    if (input) {
        input.value = code;
    }
}

// Form Submission
async function submitCourse() {
    if (!validateStep(currentStep)) {return;}

    try {
        showLoading('กำลังสร้างหลักสูตร...');

        // Step 1: Upload course image first (if selected)
        let courseImagePath = null;
        const courseImageInput = document.getElementById('course_image');
        if (courseImageInput && courseImageInput.files.length > 0) {
            courseImagePath = await uploadCourseImage(courseImageInput.files[0]);
            if (!courseImagePath) {
                hideLoading();
                showError('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
                return;
            }
        }

        // Step 2: Handle test creation/selection
        const assessmentType = document.querySelector('input[name="assessment_type"]:checked')?.value;
        let testId = null;

        let coursePassingScore = null;
        let courseMaxAttempts = null;

        if (assessmentType === 'create_new') {
            // Create new test first
            const testData = {
                test_name: document.getElementById('new_test_name')?.value,
                test_description: document.getElementById('new_test_description')?.value,
                passing_score: document.getElementById('new_passing_score')?.value || 70,
                max_attempts: document.getElementById('new_max_attempts')?.value || 3,
                duration_minutes: document.getElementById('new_test_duration')?.value || 60,
                randomize_questions: document.querySelector('input[name="new_randomize_questions"]')?.checked !== false,
                randomize_answers: document.querySelector('input[name="new_randomize_choices"]')?.checked !== false,
                show_results_immediately: document.getElementById('new_show_answer')?.value === 'immediately'
            };

            if (!testData.test_name) {
                hideLoading();
                showError('กรุณากรอกชื่อข้อสอบ');
                return;
            }

            // Store test scores to copy to course
            coursePassingScore = testData.passing_score;
            courseMaxAttempts = testData.max_attempts;

            const testResponse = await fetch('/courses/api/tests/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            const testResult = await testResponse.json();
            if (testResult.success) {
                testId = testResult.data.test_id;
            } else {
                hideLoading();
                showError(testResult.message || 'เกิดข้อผิดพลาดในการสร้างข้อสอบ');
                return;
            }
        } else if (assessmentType === 'existing') {
            testId = document.getElementById('selected_test_id')?.value || null;
            if (!testId) {
                hideLoading();
                showError('กรุณาเลือกข้อสอบ');
                return;
            }
        }

        // Step 3: Collect course data
        const formData = collectFormData();
        formData.test_id = testId;
        formData.assessment_type = assessmentType;

        // Set passing_score and max_attempts from test settings
        const passingScoreValue = document.getElementById('new_passing_score')?.value;
        const maxAttemptsValue = document.getElementById('new_max_attempts')?.value;

        formData.passing_score = coursePassingScore ||
                                 (passingScoreValue ? parseInt(passingScoreValue) : null);
        formData.max_attempts = courseMaxAttempts ||
                                (maxAttemptsValue ? parseInt(maxAttemptsValue) : null);

        // Ensure max_students is set (may be null if not specified)
        if (formData.max_enrollments) {
            formData.max_students = parseInt(formData.max_enrollments) || null;
        } else if (!formData.max_students) {
            formData.max_students = null;  // Ensure it's null, not undefined
        }

        // Add course image path if uploaded
        if (courseImagePath) {
            formData.thumbnail = courseImagePath;
            formData.course_image = courseImagePath;
        }

        // Log data AFTER all processing
        console.log('🔍 FINAL DATA TO SEND:');
        console.log('  passing_score:', formData.passing_score);
        console.log('  max_attempts:', formData.max_attempts);
        console.log('  max_students:', formData.max_students);
        console.log('  target_departments:', formData.target_departments);
        console.log('  target_positions:', formData.target_positions);

        // Step 4: Create course
        const response = await fetch('/courses/api/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            const courseId = result.data.course_id;

            // Step 5: Upload materials if any
            showLoading('กำลังอัปโหลดเอกสารประกอบการเรียน...');
            await uploadMaterials(courseId);

            hideLoading();
            showSuccess('สร้างหลักสูตรเรียบร้อยแล้ว');
            setTimeout(() => {
                window.location.href = `/courses/${courseId}`;
            }, 1500);
        } else {
            hideLoading();
            showError(result.message || 'เกิดข้อผิดพลาดในการสร้างหลักสูตร');
        }
    } catch (error) {
        console.error('Submit course error:', error);
        hideLoading();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

// Upload course image and return the path
async function uploadCourseImage(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/courses/api/upload/image', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success && result.data) {
            console.log('Image uploaded successfully:', result.data.path);
            return result.data.path;
        } else {
            console.error('Image upload failed:', result.message);
            return null;
        }
    } catch (error) {
        console.error('Upload image error:', error);
        return null;
    }
}

// Upload course materials after course creation
async function uploadMaterials(courseId) {
    const input = document.getElementById('course_materials');

    if (!input || !input.files || input.files.length === 0) {
        console.log('ℹ️ No materials to upload');
        return;
    }

    try {
        const formData = new FormData();

        // Append all files
        Array.from(input.files).forEach(file => {
            formData.append('materials', file);
        });

        console.log(`📤 Uploading ${input.files.length} material files...`);

        const response = await fetch(`/courses/api/${courseId}/materials`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ Uploaded ${input.files.length} materials successfully`);
        } else {
            console.error('❌ Materials upload failed:', result.message);
            showError('อัปโหลดเอกสารประกอบไม่สำเร็จ');
        }
    } catch (error) {
        console.error('❌ Upload materials error:', error);
        showError('เกิดข้อผิดพลาดในการอัปโหลดเอกสารประกอบ');
    }
}

async function uploadFiles(courseId) {
    const files = [
        { input: 'course_image', endpoint: 'image' },
        { input: 'intro_video', endpoint: 'video' },
        { input: 'course_materials', endpoint: 'materials' }
    ];

    for (const file of files) {
        const input = document.getElementById(file.input);
        if (input && input.files.length > 0) {
            const formData = new FormData();

            if (input.multiple) {
                Array.from(input.files).forEach(f => {
                    formData.append(file.input, f);
                });
            } else {
                formData.append(file.input, input.files[0]);
            }

            try {
                await fetch(`/courses/api/${courseId}/${file.endpoint}`, {
                    method: 'POST',
                    body: formData
                });
            } catch (error) {
                console.error(`Upload ${file.endpoint} failed:`, error);
            }
        }
    }
}

// Convert Thai date format (DD/MM/YYYY HH:MM) to ISO format
function convertThaiDateToISO(dateString) {
    if (!dateString || dateString.trim() === '') {
        return null;
    }

    try {
        // Parse DD/MM/YYYY HH:MM format
        const parts = dateString.trim().split(' ');
        if (parts.length !== 2) {
            console.warn('Invalid date format:', dateString);
            return null;
        }

        const dateParts = parts[0].split('/');
        const timeParts = parts[1].split(':');

        if (dateParts.length !== 3 || timeParts.length !== 2) {
            console.warn('Invalid date/time format:', dateString);
            return null;
        }

        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const year = parseInt(dateParts[2]);
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1]);

        // Create Date object
        const date = new Date(year, month, day, hour, minute);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateString);
            return null;
        }

        // Return ISO string
        return date.toISOString();
    } catch (error) {
        console.error('Error converting date:', error);
        return null;
    }
}

function collectFormData() {
    const form = document.getElementById('create-course-form');
    const formData = new FormData(form);
    const data = {};

    // Basic fields
    for (let [key, value] of formData.entries()) {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }

    // Rich text description
    const description = document.getElementById('description');
    if (description) {
        data.description = description.innerHTML;
    }

    // Learning objectives
    const objectives = Array.from(document.querySelectorAll('input[name="objectives[]"]'))
        .map(input => input.value.trim())
        .filter(value => value);
    data.learning_objectives = objectives;

    // Multi-select fields - manually collect selected values
    const targetDepartments = document.getElementById('target_departments');
    if (targetDepartments) {
        data.target_departments = Array.from(targetDepartments.selectedOptions)
            .map(option => option.value)
            .filter(value => value);
    }

    const targetPositions = document.getElementById('target_positions');
    if (targetPositions) {
        data.target_positions = Array.from(targetPositions.selectedOptions)
            .map(option => option.value)
            .filter(value => value);
    }

    // Lessons
    const lessons = [];
    const lessonTitles = document.querySelectorAll('input[name="lesson_titles[]"]');
    const lessonDurations = document.querySelectorAll('input[name="lesson_durations[]"]');
    const lessonDescriptions = document.querySelectorAll('textarea[name="lesson_descriptions[]"]');
    const lessonVideoUrls = document.querySelectorAll('input[name="lesson_video_urls[]"]');

    for (let i = 0; i < lessonTitles.length; i++) {
        if (lessonTitles[i].value.trim()) {
            lessons.push({
                title: lessonTitles[i].value.trim(),
                duration: parseInt(lessonDurations[i].value) || 0,
                description: lessonDescriptions[i].value.trim(),
                video_url: lessonVideoUrls[i] ? lessonVideoUrls[i].value.trim() : null
            });
        }
    }
    data.lessons = lessons;

    // External links
    const links = Array.from(document.querySelectorAll('input[name="external_links[]"]'))
        .map(input => input.value.trim())
        .filter(value => value);
    data.external_links = links;

    // Test-related checkboxes (explicitly handle unchecked states)
    data.new_randomize_questions = document.getElementById('new_randomize_questions')?.checked || false;
    data.new_randomize_choices = document.getElementById('new_randomize_choices')?.checked || false;
    data.new_show_results_immediately = document.getElementById('new_show_results_immediately')?.checked || false;
    data.new_enable_proctoring = document.getElementById('new_enable_proctoring')?.checked || false;

    // New test properties checkboxes
    data.new_is_graded = document.getElementById('new_is_graded')?.checked || false;
    data.new_is_required = document.getElementById('new_is_required')?.checked || false;
    data.new_is_passing_required = document.getElementById('new_is_passing_required')?.checked || false;
    data.new_show_score_breakdown = document.getElementById('new_show_score_breakdown')?.checked || false;

    // Convert duration_hours + duration_minutes to single value
    const hours = parseInt(data.duration_hours) || 0;
    const minutes = parseInt(data.duration_minutes) || 0;
    data.duration_hours = hours + (minutes / 60);
    delete data.duration_minutes;

    // Convert Thai date format to ISO
    if (data.enrollment_start) {
        data.enrollment_start = convertThaiDateToISO(data.enrollment_start);
    }
    if (data.enrollment_end) {
        data.enrollment_end = convertThaiDateToISO(data.enrollment_end);
    }

    // Map field names to match backend expectations
    data.title = data.course_name;  // Backend expects 'title' not 'course_name'
    data.max_students = data.max_enrollments ? parseInt(data.max_enrollments) : null;
    delete data.max_enrollments;

    // Map certificate validity from dropdown values to days
    const certValidityMap = {
        'unlimited': null,  // ไม่มีกำหนด
        '1year': '365',
        '2years': '730',
        '3years': '1095'
    };
    if (data.certificate_validity && certValidityMap[data.certificate_validity] !== undefined) {
        data.certificate_validity = certValidityMap[data.certificate_validity];
    }

    return data;
}

// Event Listeners
function setupEventListeners() {
    const form = document.getElementById('create-course-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            submitCourse();
        });
    }

    // Enhanced multi-select behavior
    setupEnhancedMultiSelect();

    // Cascading dropdown: Department → Position
    const deptSelect = document.getElementById('target_departments');
    const posSelect = document.getElementById('target_positions');

    if (deptSelect && posSelect) {
        deptSelect.addEventListener('change', function() {
            filterPositionsByDepartment();
        });
    }
}

// Enhanced multi-select: Click to toggle selection
function setupEnhancedMultiSelect() {
    const selects = ['target_departments', 'target_positions'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Click to toggle (without needing Ctrl)
        select.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'OPTION' && !e.target.disabled) {
                e.preventDefault();

                // Toggle selection
                e.target.selected = !e.target.selected;

                // Apply blue color to selected options
                if (e.target.selected) {
                    e.target.style.backgroundColor = '#3b82f6';
                    e.target.style.color = 'white';
                } else {
                    e.target.style.backgroundColor = '';
                    e.target.style.color = '';
                }

                // Trigger change event for cascading
                select.dispatchEvent(new Event('change'));
            }
        });

        // Prevent default selection behavior
        select.addEventListener('click', function(e) {
            e.preventDefault();
        });
    });

    // Clear buttons
    const clearDeptBtn = document.getElementById('clear-departments-btn');
    const clearPosBtn = document.getElementById('clear-positions-btn');

    if (clearDeptBtn) {
        clearDeptBtn.addEventListener('click', function() {
            const deptSelect = document.getElementById('target_departments');
            if (deptSelect) {
                // Deselect all options and clear colors
                Array.from(deptSelect.options).forEach(opt => {
                    opt.selected = false;
                    opt.style.backgroundColor = '';
                    opt.style.color = '';
                });
                // Trigger change for cascading
                deptSelect.dispatchEvent(new Event('change'));
                console.log('✅ Cleared all departments');
            }
        });
    }

    if (clearPosBtn) {
        clearPosBtn.addEventListener('click', function() {
            const posSelect = document.getElementById('target_positions');
            if (posSelect) {
                // Deselect all options and clear colors
                Array.from(posSelect.options).forEach(opt => {
                    opt.selected = false;
                    opt.style.backgroundColor = '';
                    opt.style.color = '';
                });
                console.log('✅ Cleared all positions');
            }
        });
    }
}

// Filter positions based on selected departments
function filterPositionsByDepartment() {
    const deptSelect = document.getElementById('target_departments');
    const posSelect = document.getElementById('target_positions');

    if (!deptSelect || !posSelect || allPositions.length === 0) return;

    const selectedDepts = Array.from(deptSelect.selectedOptions).map(opt => parseInt(opt.value));

    // Clear current positions
    posSelect.innerHTML = '';

    if (selectedDepts.length === 0) {
        // No department selected → show all positions
        allPositions.forEach(position => {
            const option = document.createElement('option');
            option.value = position.position_id;
            option.textContent = position.position_name;
            option.dataset.unitId = position.unit_id || '';
            posSelect.appendChild(option);
        });
        console.log('✅ Showing all positions (no department filter)');
    } else {
        // Filter positions by selected departments
        const filteredPositions = allPositions.filter(p =>
            p.unit_id && selectedDepts.includes(parseInt(p.unit_id))
        );

        if (filteredPositions.length === 0) {
            posSelect.innerHTML = '<option value="" disabled>ไม่มีตำแหน่งในหน่วยงานที่เลือก</option>';
            console.log('⚠️ No positions found for selected departments');
        } else {
            filteredPositions.forEach(position => {
                const option = document.createElement('option');
                option.value = position.position_id;
                option.textContent = position.position_name;
                option.dataset.unitId = position.unit_id || '';
                posSelect.appendChild(option);
            });
            console.log(`✅ Filtered to ${filteredPositions.length} positions for selected departments`);
        }
    }
}

// Utility functions
function showSuccess(message, persistent = true) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    if (!persistent) {
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

let loadingOverlay = null;

function showLoading(message = 'กำลังโหลด...') {
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingOverlay.innerHTML = `
            <div class="bg-white rounded-lg p-6 shadow-xl">
                <div class="flex items-center space-x-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-ruxchai-primary"></div>
                    <span class="text-gray-700 font-medium">${message}</span>
                </div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.remove();
        loadingOverlay = null;
    }
}