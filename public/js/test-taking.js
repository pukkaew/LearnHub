// Test Taking JavaScript with Security and Timer Features
let testData = null;
let questions = [];
let currentQuestionIndex = 0;
let answers = {};
let flaggedQuestions = new Set();
let timeRemaining = 0;
let timerInterval = null;
let autoSaveInterval = null;
let testAttemptId = null;
let isSubmitted = false;
let webcamStream = null;
let securityViolations = 0;

// Get test and attempt IDs from URL
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    testAttemptId = urlParams.get('attempt');

    if (testAttemptId) {
        initializeTest();
        initializeTestSecurity();
    } else {
        showError('ไม่พบข้อมูลการทำข้อสอบ');
        window.location.href = '/tests';
    }

    setupEventListeners();
});

function setupEventListeners() {
    // Navigation buttons
    document.getElementById('prev-question-btn')?.addEventListener('click', previousQuestion);
    document.getElementById('next-question-btn')?.addEventListener('click', nextQuestion);
    document.getElementById('submit-test-btn')?.addEventListener('click', submitTest);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' && !document.getElementById('prev-question-btn').disabled) {
            previousQuestion();
        } else if (e.key === 'ArrowRight') {
            nextQuestion();
        } else if (e.key === 's' && e.ctrlKey) {
            e.preventDefault();
            saveCurrentAnswer();
        } else if (e.key === 'f' && e.ctrlKey) {
            e.preventDefault();
            toggleFlag();
        }
    });

    // Auto-save on answer change
    document.addEventListener('change', function(e) {
        if (e.target.name === 'answer') {
            autoSaveCurrentAnswer();
        }
    });

    document.addEventListener('input', function(e) {
        if (e.target.name === 'answer') {
            debounce(autoSaveCurrentAnswer, 1000)();
        }
    });
}

async function initializeTest() {
    try {
        showToast('กำลังโหลดข้อสอบ...', 'info');

        const response = await fetch(`/tests/api/attempts/${testAttemptId}`);
        const data = await response.json();

        if (data.success) {
            testData = data.data;
            questions = testData.questions || [];
            answers = testData.answers || {};
            flaggedQuestions = new Set(testData.flagged_questions || []);
            timeRemaining = testData.time_remaining * 60; // Convert to seconds

            if (questions.length === 0) {
                showError('ไม่พบข้อสอบ');
                return;
            }

            setupTestInterface();
            loadQuestion(0);
            startTimer();
            startAutoSave();

            // Initialize webcam if required
            if (testData.require_webcam) {
                await initializeWebcam();
            }

            showToast('โหลดข้อสอบเรียบร้อย', 'success');
        } else {
            showError(data.message || 'ไม่สามารถโหลดข้อมูลข้อสอบได้');
        }
    } catch (error) {
        console.error('Error initializing test:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อสอบ');
    }
}

function setupTestInterface() {
    // Set test title
    document.getElementById('test-title').textContent = testData.test_name || 'ข้อสอบ';

    // Generate question navigator
    generateQuestionNavigator();

    // Update progress
    updateProgress();

    // Show timer if time limit exists
    if (testData.time_limit && testData.time_limit > 0) {
        document.getElementById('timer-container').classList.remove('hidden');
    }
}

function generateQuestionNavigator() {
    const navigator = document.getElementById('question-navigator');
    navigator.innerHTML = '';

    questions.forEach((question, index) => {
        const button = document.createElement('button');
        button.className = 'question-btn';
        button.textContent = index + 1;
        button.onclick = () => loadQuestion(index);
        button.setAttribute('data-question', index);

        updateQuestionButtonStyle(button, index);
        navigator.appendChild(button);
    });
}

function updateQuestionButtonStyle(button, index) {
    const questionId = questions[index].question_id;

    // Remove all status classes
    button.className = 'question-btn';

    if (index === currentQuestionIndex) {
        button.classList.add('current');
    } else if (answers[questionId]) {
        button.classList.add('answered');
    } else if (flaggedQuestions.has(questionId)) {
        button.classList.add('flagged');
    }
}

function loadQuestion(index) {
    if (index < 0 || index >= questions.length) return;

    // Save current answer before switching
    if (currentQuestionIndex !== index) {
        saveCurrentAnswer();
    }

    currentQuestionIndex = index;
    const question = questions[index];

    // Update question progress
    document.getElementById('question-progress').textContent = `${index + 1}/${questions.length}`;

    // Update current question number badge
    document.getElementById('current-question-number').textContent = `ข้อ ${index + 1}`;

    // Update question type and points
    document.getElementById('question-type').textContent = getQuestionTypeText(question.question_type);
    document.getElementById('question-points').textContent = `(${question.points || 1} คะแนน)`;

    // Update navigation buttons
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');

    prevBtn.disabled = index === 0;

    if (index === questions.length - 1) {
        nextBtn.innerHTML = 'ข้อสุดท้าย <i class="fas fa-chevron-right ml-2"></i>';
    } else {
        nextBtn.innerHTML = 'ข้อถัดไป <i class="fas fa-chevron-right ml-2"></i>';
    }

    // Update flag button
    updateFlagButton(question.question_id);

    // Render question content
    renderQuestion(question);

    // Update navigator
    updateQuestionNavigator();

    // Update progress
    updateProgress();

    // Log question view for security
    logActivity('question_view', { question_id: question.question_id, question_index: index });
}

function renderQuestion(question) {
    const container = document.getElementById('question-content');

    let questionHtml = `
        <div class="mb-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 leading-relaxed">
                ${question.question_text}
            </h2>

            ${question.question_image ? `
                <div class="mb-6">
                    <img src="${question.question_image}" alt="รูปประกอบคำถาม"
                         class="max-w-full h-auto rounded-lg shadow-sm border">
                </div>
            ` : ''}

            ${question.description ? `
                <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p class="text-blue-800">${question.description}</p>
                </div>
            ` : ''}
        </div>
    `;

    // Render based on question type
    switch (question.question_type) {
        case 'multiple_choice':
            questionHtml += renderMultipleChoice(question);
            break;
        case 'true_false':
            questionHtml += renderTrueFalse(question);
            break;
        case 'fill_blank':
            questionHtml += renderFillBlank(question);
            break;
        case 'essay':
            questionHtml += renderEssay(question);
            break;
        case 'matching':
            questionHtml += renderMatching(question);
            break;
        default:
            questionHtml += renderMultipleChoice(question);
    }

    container.innerHTML = questionHtml;

    // Restore saved answer
    restoreAnswer(question);

    // Add no-select class to prevent copying
    container.classList.add('no-select');
}

function renderMultipleChoice(question) {
    const options = question.options || [];

    return `
        <div class="space-y-3">
            ${options.map((option, index) => `
                <label class="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                    <input type="radio" name="answer" value="${option.option_id}"
                           class="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <div class="flex-1">
                        <div class="flex items-start">
                            <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 text-sm font-medium rounded-full mr-3 group-hover:bg-blue-100 group-hover:text-blue-600">
                                ${String.fromCharCode(65 + index)}
                            </span>
                            <div class="flex-1">
                                <span class="text-gray-900">${option.option_text}</span>
                                ${option.option_image ? `
                                    <div class="mt-2">
                                        <img src="${option.option_image}" alt="ตัวเลือก ${String.fromCharCode(65 + index)}"
                                             class="max-w-xs h-auto rounded border">
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </label>
            `).join('')}
        </div>
    `;
}

function renderTrueFalse(question) {
    return `
        <div class="space-y-3">
            <label class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input type="radio" name="answer" value="true"
                       class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                <div class="flex items-center">
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 text-sm font-medium rounded-full mr-3">
                        ✓
                    </span>
                    <span class="text-gray-900">จริง (True)</span>
                </div>
            </label>
            <label class="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <input type="radio" name="answer" value="false"
                       class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                <div class="flex items-center">
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 text-sm font-medium rounded-full mr-3">
                        ✗
                    </span>
                    <span class="text-gray-900">เท็จ (False)</span>
                </div>
            </label>
        </div>
    `;
}

function renderFillBlank(question) {
    return `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">คำตอบของคุณ:</label>
                <input type="text" name="answer"
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       placeholder="กรอกคำตอบ..."
                       autocomplete="off">
            </div>
            <div class="text-sm text-gray-500">
                <i class="fas fa-info-circle mr-1"></i>
                กรอกคำตอบให้ตรงกับที่ต้องการ อาจมีหลายคำตอบที่ถูกต้อง
            </div>
        </div>
    `;
}

function renderEssay(question) {
    return `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">คำตอบของคุณ:</label>
                <textarea name="answer" rows="10"
                          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                          placeholder="เขียนคำตอบของคุณที่นี่..."
                          maxlength="5000"></textarea>
                <div class="flex justify-between text-sm text-gray-500 mt-1">
                    <span>เขียนคำตอบให้ชัดเจนและครอบคลุมประเด็นที่ถาม</span>
                    <span id="char-count">0/5000 ตัวอักษร</span>
                </div>
            </div>
        </div>
    `;
}

function renderMatching(question) {
    const leftItems = question.left_items || [];
    const rightItems = question.right_items || [];

    return `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="font-medium text-gray-700 mb-3">คอลัมน์ A</h4>
                    <div class="space-y-2">
                        ${leftItems.map((item, index) => `
                            <div class="p-3 bg-gray-50 rounded border">
                                <span class="font-medium">${index + 1}.</span> ${item.text}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="font-medium text-gray-700 mb-3">คอลัมน์ B</h4>
                    <div class="space-y-2">
                        ${rightItems.map((item, index) => `
                            <div class="p-3 bg-gray-50 rounded border">
                                <span class="font-medium">${String.fromCharCode(97 + index)}.</span> ${item.text}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="mt-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">คำตอบ (เช่น 1a, 2b, 3c):</label>
                <input type="text" name="answer"
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       placeholder="ระบุการจับคู่ เช่น 1a,2b,3c"
                       autocomplete="off">
            </div>
        </div>
    `;
}

function restoreAnswer(question) {
    const savedAnswer = answers[question.question_id];
    if (!savedAnswer) return;

    switch (question.question_type) {
        case 'multiple_choice':
        case 'true_false':
            const radio = document.querySelector(`input[name="answer"][value="${savedAnswer}"]`);
            if (radio) radio.checked = true;
            break;
        case 'fill_blank':
        case 'essay':
        case 'matching':
            const input = document.querySelector('input[name="answer"], textarea[name="answer"]');
            if (input) {
                input.value = savedAnswer;
                if (input.tagName === 'TEXTAREA') {
                    updateCharCount(input);
                }
            }
            break;
    }
}

function getCurrentAnswer() {
    const question = questions[currentQuestionIndex];

    switch (question.question_type) {
        case 'multiple_choice':
        case 'true_false':
            const checked = document.querySelector('input[name="answer"]:checked');
            return checked ? checked.value : null;
        case 'fill_blank':
        case 'essay':
        case 'matching':
            const input = document.querySelector('input[name="answer"], textarea[name="answer"]');
            return input ? input.value.trim() : null;
        default:
            return null;
    }
}

function saveCurrentAnswer() {
    const question = questions[currentQuestionIndex];
    const answer = getCurrentAnswer();

    if (answer && answer.length > 0) {
        answers[question.question_id] = answer;
    } else {
        delete answers[question.question_id];
    }

    updateSaveStatus('saved');
    updateQuestionNavigator();
    updateProgress();

    // Log save action
    logActivity('answer_save', {
        question_id: question.question_id,
        has_answer: !!answer
    });
}

function autoSaveCurrentAnswer() {
    saveCurrentAnswer();
    showSaveIndicator();
}

function clearAnswer() {
    const question = questions[currentQuestionIndex];

    // Clear UI
    const radios = document.querySelectorAll('input[name="answer"]');
    radios.forEach(radio => radio.checked = false);

    const inputs = document.querySelectorAll('input[name="answer"], textarea[name="answer"]');
    inputs.forEach(input => input.value = '');

    // Clear from answers object
    delete answers[question.question_id];

    updateQuestionNavigator();
    updateProgress();
    updateSaveStatus('cleared');
}

function toggleFlag() {
    const question = questions[currentQuestionIndex];

    if (flaggedQuestions.has(question.question_id)) {
        flaggedQuestions.delete(question.question_id);
    } else {
        flaggedQuestions.add(question.question_id);
    }

    updateFlagButton(question.question_id);
    updateQuestionNavigator();

    // Log flag action
    logActivity('question_flag', {
        question_id: question.question_id,
        flagged: flaggedQuestions.has(question.question_id)
    });
}

function updateFlagButton(questionId) {
    const flagBtn = document.getElementById('flag-question-btn');
    const icon = flagBtn.querySelector('i');

    if (flaggedQuestions.has(questionId)) {
        icon.className = 'fas fa-flag';
        flagBtn.className = 'text-yellow-500 hover:text-yellow-600';
        flagBtn.title = 'ยกเลิกเครื่องหมาย';
    } else {
        icon.className = 'far fa-flag';
        flagBtn.className = 'text-gray-400 hover:text-yellow-500';
        flagBtn.title = 'ทำเครื่องหมายข้อนี้';
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        loadQuestion(currentQuestionIndex - 1);
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    }
}

function updateQuestionNavigator() {
    const buttons = document.querySelectorAll('[data-question]');
    buttons.forEach((button, index) => {
        updateQuestionButtonStyle(button, index);
    });
}

function updateProgress() {
    const answeredCount = Object.keys(answers).length;
    const progressPercent = (answeredCount / questions.length) * 100;

    document.getElementById('question-progress').textContent = `${currentQuestionIndex + 1}/${questions.length}`;
}

// Timer Functions
function startTimer() {
    if (!testData.time_limit || testData.time_limit <= 0) return;

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        // Show warnings
        if (timeRemaining === 300) { // 5 minutes warning
            showTimeWarning(5);
        } else if (timeRemaining === 60) { // 1 minute warning
            showTimeWarning(1);
        }

        // Auto-submit when time is up
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            autoSubmitTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    let display;
    if (hours > 0) {
        display = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    const timerElement = document.getElementById('timer-display');
    if (timerElement) {
        timerElement.textContent = display;

        // Apply warning colors
        if (timeRemaining <= 60) {
            timerElement.className = 'text-lg font-mono font-semibold timer-danger';
        } else if (timeRemaining <= 300) {
            timerElement.className = 'text-lg font-mono font-semibold timer-warning';
        } else {
            timerElement.className = 'text-lg font-mono font-semibold';
        }
    }
}

function showTimeWarning(minutes) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-red-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-auto">
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <i class="fas fa-clock text-red-600"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">เตือน: เหลือเวลาไม่มาก!</h3>
                <p class="text-sm text-gray-600 mb-4">
                    เหลือเวลาเพียง <span class="font-bold text-red-600">${minutes} นาที</span>
                    กรุณาตรวจสอบคำตอบและส่งให้เรียบร้อย
                </p>
                <button onclick="this.closest('.fixed').remove()"
                        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none">
                    รับทราบ
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
        }
    }, 5000);
}

// Auto-save Functions
function startAutoSave() {
    autoSaveInterval = setInterval(async () => {
        await autoSave();
    }, 30000); // Auto-save every 30 seconds
}

async function autoSave() {
    try {
        updateSaveStatus('saving');

        const response = await fetch(`/tests/api/attempts/${testAttemptId}/save-progress`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: answers,
                flagged_questions: Array.from(flaggedQuestions),
                current_question: currentQuestionIndex,
                time_remaining: Math.floor(timeRemaining / 60)
            })
        });

        if (response.ok) {
            updateSaveStatus('saved');
        } else {
            updateSaveStatus('error');
        }
    } catch (error) {
        console.error('Auto-save failed:', error);
        updateSaveStatus('error');
    }
}

function updateSaveStatus(status) {
    const icon = document.getElementById('save-status-icon');
    const text = document.getElementById('save-status-text');

    switch (status) {
        case 'saving':
            icon.className = 'fas fa-spinner fa-spin text-blue-500';
            text.textContent = 'กำลังบันทึก...';
            break;
        case 'saved':
            icon.className = 'fas fa-check text-green-500';
            text.textContent = 'บันทึกแล้ว';
            break;
        case 'error':
            icon.className = 'fas fa-exclamation-triangle text-red-500';
            text.textContent = 'บันทึกไม่สำเร็จ';
            break;
        case 'cleared':
            icon.className = 'fas fa-trash text-gray-500';
            text.textContent = 'ล้างคำตอบแล้ว';
            break;
    }
}

function showSaveIndicator() {
    updateSaveStatus('saving');
    setTimeout(() => updateSaveStatus('saved'), 500);
}

// Webcam Functions
async function initializeWebcam() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 }
        });

        const video = document.getElementById('webcam-video');
        if (video) {
            video.srcObject = webcamStream;
            document.getElementById('webcam-monitor').classList.remove('hidden');
        }

        // Take periodic screenshots
        setInterval(takeScreenshot, 60000); // Every minute
    } catch (error) {
        console.error('Webcam initialization failed:', error);
        showError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง');

        // Mark webcam as error
        const video = document.getElementById('webcam-video');
        if (video) {
            video.classList.add('webcam-error');
        }
    }
}

function takeScreenshot() {
    if (!webcamStream) return;

    const video = document.getElementById('webcam-video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
        try {
            const formData = new FormData();
            formData.append('screenshot', blob, `screenshot_${Date.now()}.jpg`);
            formData.append('attempt_id', testAttemptId);

            await fetch('/tests/api/webcam-screenshot', {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Screenshot upload failed:', error);
        }
    }, 'image/jpeg', 0.8);
}

// Submit Functions
function submitTest() {
    // Save current answer first
    saveCurrentAnswer();

    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;

    const summary = `
        <div class="space-y-3 text-sm">
            <div class="flex justify-between">
                <span>จำนวนข้อทั้งหมด:</span>
                <span class="font-semibold">${questions.length} ข้อ</span>
            </div>
            <div class="flex justify-between">
                <span>ตอบแล้ว:</span>
                <span class="font-semibold text-green-600">${answeredCount} ข้อ</span>
            </div>
            <div class="flex justify-between">
                <span>ยังไม่ตอบ:</span>
                <span class="font-semibold text-red-600">${unansweredCount} ข้อ</span>
            </div>
            <div class="flex justify-between">
                <span>ทำเครื่องหมาย:</span>
                <span class="font-semibold text-yellow-600">${flaggedQuestions.size} ข้อ</span>
            </div>
        </div>
    `;

    document.getElementById('submit-summary').innerHTML = summary;
    document.getElementById('submit-modal').classList.remove('hidden');
}

function closeSubmitModal() {
    document.getElementById('submit-modal').classList.add('hidden');
}

async function confirmSubmit() {
    try {
        updateSaveStatus('saving');

        const response = await fetch(`/tests/api/attempts/${testAttemptId}/submit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: answers,
                flagged_questions: Array.from(flaggedQuestions),
                time_taken: testData.time_limit ? testData.time_limit - Math.floor(timeRemaining / 60) : 0,
                security_violations: securityViolations
            })
        });

        const data = await response.json();

        if (data.success) {
            isSubmitted = true;
            clearInterval(timerInterval);
            clearInterval(autoSaveInterval);
            finalizeTestSecurity();

            // Stop webcam
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
            }

            showToast('ส่งคำตอบเรียบร้อยแล้ว', 'success');

            // Redirect to results
            setTimeout(() => {
                window.location.href = `/tests/${testData.test_id}/results?attempt=${testAttemptId}`;
            }, 1500);
        } else {
            showError(data.message || 'เกิดข้อผิดพลาดในการส่งคำตอบ');
            closeSubmitModal();
        }
    } catch (error) {
        console.error('Error submitting test:', error);
        showError('เกิดข้อผิดพลาดในการส่งคำตอบ');
        closeSubmitModal();
    }
}

async function autoSubmitTest() {
    try {
        saveCurrentAnswer();

        await fetch(`/tests/api/attempts/${testAttemptId}/submit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: answers,
                flagged_questions: Array.from(flaggedQuestions),
                time_taken: testData.time_limit,
                auto_submit: true,
                security_violations: securityViolations
            })
        });

        isSubmitted = true;
        clearInterval(autoSaveInterval);
        finalizeTestSecurity();

        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
        }

        showToast('หมดเวลา ระบบส่งคำตอบอัตโนมัติ', 'warning');

        setTimeout(() => {
            window.location.href = `/tests/${testData.test_id}/results?attempt=${testAttemptId}`;
        }, 3000);
    } catch (error) {
        console.error('Error auto-submitting test:', error);
        showError('เกิดข้อผิดพลาดในการส่งคำตอบอัตโนมัติ');
    }
}

// Exit Functions
function confirmExit() {
    document.getElementById('exit-modal').classList.remove('hidden');
}

function closeExitModal() {
    document.getElementById('exit-modal').classList.add('hidden');
}

function exitTest() {
    saveCurrentAnswer();
    finalizeTestSecurity();

    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
    }

    window.location.href = `/tests/${testData.test_id}`;
}

// Security Functions
function closeSecurityAlert() {
    document.getElementById('security-alert-modal').classList.add('hidden');
}

async function logActivity(action, data) {
    try {
        await fetch('/tests/api/activity-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                attempt_id: testAttemptId,
                action: action,
                data: data,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Activity logging failed:', error);
    }
}

// Utility Functions
function getQuestionTypeText(type) {
    const types = {
        'multiple_choice': 'ปรนัย',
        'true_false': 'จริง/เท็จ',
        'fill_blank': 'เติมคำ',
        'essay': 'อัตนัย',
        'matching': 'จับคู่'
    };
    return types[type] || 'ปรนัย';
}

function updateCharCount(textarea) {
    const charCount = document.getElementById('char-count');
    if (charCount) {
        const current = textarea.value.length;
        const max = parseInt(textarea.getAttribute('maxlength')) || 5000;
        charCount.textContent = `${current}/${max} ตัวอักษร`;

        if (current > max * 0.9) {
            charCount.className = 'text-red-500';
        } else {
            charCount.className = 'text-gray-500';
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Character count for essay questions
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'TEXTAREA' && e.target.name === 'answer') {
        updateCharCount(e.target);
    }
});

// Security violation increment function
function incrementSecurityViolation() {
    securityViolations++;
    if (securityViolations >= 5) {
        document.getElementById('security-message').textContent =
            'ตรวจพบการละเมิดกฎการสอบหลายครั้ง การสอบอาจถูกยกเลิก';
        document.getElementById('security-alert-modal').classList.remove('hidden');
    }
}