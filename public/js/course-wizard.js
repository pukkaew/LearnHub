// Course Creation 4-Step Wizard JavaScript
let currentStep = 1;
const totalSteps = 4;

document.addEventListener('DOMContentLoaded', function() {
    initializeWizard();
    loadInitialData();
});

function initializeWizard() {
    updateStepDisplay();
    setupEventListeners();
    setupRichTextEditor();
    setupFileHandlers();
    setupAutoSave();
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

    return true;
}

function validateStep3() {
    const courseImage = document.getElementById('course_image');
    if (!courseImage || !courseImage.files.length) {
        showError('กรุณาเลือกรูปหน้าปกหลักสูตร');
        return false;
    }

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
    // Assessment validation is optional
    return true;
}

function getFieldLabel(fieldName) {
    const labels = {
        'course_name': 'ชื่อหลักสูตร',
        'category_id': 'หมวดหมู่',
        'difficulty_level': 'ระดับความยาก',
        'course_type': 'ประเภทหลักสูตร',
        'language': 'ภาษาที่ใช้สอน'
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
    div.className = 'lesson-item border border-gray-200 rounded-lg p-4';
    div.setAttribute('data-lesson', lessonNumber);
    div.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex items-center">
                <i class="fas fa-grip-vertical text-gray-400 mr-3 cursor-move"></i>
                <span class="font-medium text-gray-700">บทที่ ${lessonNumber}:</span>
            </div>
            <button type="button" onclick="removeLesson(this)" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" name="lesson_titles[]" required
                   class="rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                   placeholder="ชื่อบทเรียน">
            <input type="number" name="lesson_durations[]" min="1" required
                   class="rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                   placeholder="ระยะเวลา (นาที)">
        </div>
        <textarea name="lesson_descriptions[]" rows="2"
                  class="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary"
                  placeholder="คำอธิบายบทเรียน"></textarea>
    `;
    container.appendChild(div);
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

function handleMaterialsUpload(input) {
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
    setInterval(saveDraft, 60000); // Auto-save every minute
}

async function saveDraft() {
    try {
        const formData = collectFormData();
        formData.is_draft = true;

        const response = await fetch('/courses/api/draft', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showSuccess('บันทึกร่างเรียบร้อยแล้ว', false);
        }
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

// Data Loading
async function loadInitialData() {
    await Promise.all([
        loadCategories(),
        loadPositions(),
        loadDepartments(),
        loadPrerequisites()
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
                option.textContent = `${category.category_icon ? category.category_icon + ' ' : ''}${category.category_name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadPositions() {
    try {
        const response = await fetch('/courses/api/target-positions');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('target_positions');
            // Clear existing hardcoded options except "ทุกตำแหน่ง"
            select.innerHTML = '<option value="all">ทุกตำแหน่ง</option>';

            result.data.forEach(position => {
                const option = document.createElement('option');
                option.value = position.position_id;
                option.textContent = position.position_name_th;
                option.dataset.level = position.level;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading positions:', error);
    }
}

async function loadDepartments() {
    try {
        const response = await fetch('/courses/api/target-departments');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('target_departments');
            // Clear existing options
            select.innerHTML = '<option value="all">ทุกแผนก</option>';

            result.data.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.unit_id;
                option.textContent = `${dept.unit_code || ''} ${dept.unit_name_th}`.trim();
                option.dataset.levelCode = dept.level_code;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
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
        const formData = collectFormData();
        const response = await fetch('/courses/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            // Upload files if any
            await uploadFiles(result.data.course_id);

            showSuccess('สร้างหลักสูตรเรียบร้อยแล้ว');
            setTimeout(() => {
                window.location.href = `/courses/${result.data.course_id}`;
            }, 1500);
        } else {
            showError(result.message || 'เกิดข้อผิดพลาดในการสร้างหลักสูตร');
        }
    } catch (error) {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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

    // Lessons
    const lessons = [];
    const lessonTitles = document.querySelectorAll('input[name="lesson_titles[]"]');
    const lessonDurations = document.querySelectorAll('input[name="lesson_durations[]"]');
    const lessonDescriptions = document.querySelectorAll('textarea[name="lesson_descriptions[]"]');

    for (let i = 0; i < lessonTitles.length; i++) {
        if (lessonTitles[i].value.trim()) {
            lessons.push({
                title: lessonTitles[i].value.trim(),
                duration: parseInt(lessonDurations[i].value) || 0,
                description: lessonDescriptions[i].value.trim()
            });
        }
    }
    data.lessons = lessons;

    // External links
    const links = Array.from(document.querySelectorAll('input[name="external_links[]"]'))
        .map(input => input.value.trim())
        .filter(value => value);
    data.external_links = links;

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