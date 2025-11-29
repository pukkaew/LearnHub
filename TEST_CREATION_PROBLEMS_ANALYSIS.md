# รายงานปัญหาและข้อเสนอแนะการปรับปรุงระบบสร้างข้อสอบ

**วันที่:** 25 พฤศจิกายน 2025
**หัวข้อ:** การวิเคราะห์ปัญหาระบบสร้างข้อสอบและข้อเสนอแนะการปรับปรุง
**ตรวจสอบโดย:** Claude Code

---

## 📋 สรุปผลการวิเคราะห์

ระบบสร้างข้อสอบปัจจุบัน **มีโครงสร้างพื้นฐานที่ดี** แต่ยังมี **ปัญหาหลายจุดที่ทำให้ UX ไม่ดีและการใช้งานยุ่งยาก**

**คะแนนโดยรวม: 6/10**
- ✅ มี UI สวยงาม 3-step wizard
- ✅ มี JavaScript logic ครบถ้วน
- ❌ ไม่มี Question Bank Integration
- ❌ ไม่รองรับ image upload เต็มรูปแบบ
- ❌ UX ในการสร้างคำถามช้าและยุ่งยาก
- ❌ ไม่มีการเชื่อมโยงกับ Course ที่ดี

---

## 🔍 ปัญหาที่พบ (รายละเอียด)

### **1. ❌ Question Bank Integration ไม่ทำงาน** (ปัญหาร้ายแรง)

**ปัญหา:**
```javascript
// บรรทัด 1080-1083 ใน create.ejs
function importQuestions() {
    // Implementation for importing questions from question bank
    showSuccess(i18n.importQuestionsFeature);  // ← แค่แสดงข้อความ!
}
```

**ผลกระทบ:**
- ❌ ปุ่ม "Import from Question Bank" ไม่ทำงาน
- ❌ ไม่สามารถนำคำถามจาก Question Bank มาใช้ได้
- ❌ ต้องสร้างคำถามใหม่ทุกครั้ง (เสียเวลา)
- ❌ ไม่สามารถใช้คำถามซ้ำระหว่าง tests ได้

**ข้อมูลเพิ่มเติม:**
- ระบบมี QuestionBank table และ controller
- มี `/question-bank` route อยู่
- แต่ไม่มี API endpoint สำหรับ import

---

### **2. ❌ ไม่รองรับ Image Upload อย่างเต็มรูปแบบ** (ปัญหาปานกลาง)

**ปัญหา:**
```javascript
// บรรทัด 1116-1125 ใน create.ejs
questions: questions.map(q => ({
    question_type: q.question_type,
    question_text: q.question_text,
    points: q.points,
    explanation: q.explanation,
    // ❌ Remove image files from the data sent to server (for now)
    options: q.options ? q.options.map(opt => ({
        text: opt.text,
        is_correct: opt.is_correct
        // ❌ ไม่ได้ส่ง opt.image!
    })) : undefined,
```

**ผลกระทบ:**
- ❌ แม้ว่า UI รองรับ image upload
- ❌ แต่ไม่ได้ส่ง images ไปที่ server
- ❌ คำถามที่มีรูปภาพจะหายไปเมื่อ submit

**หมายเหตุ:**
- มี input file สำหรับ question image (บรรทัด 391-411)
- มี input file สำหรับ option images (บรรทัด 838-846)
- มี preview functionality
- แต่ไม่ได้ implement การส่งไปยัง server

---

### **3. ❌ UX ในการสร้างคำถามช้าและยุ่งยาก** (ปัญหาสำคัญ)

**ปัญหา:**

#### 3.1 ต้องสร้างทีละคำถามผ่าน Modal
```
User Workflow:
1. กรอก Test Info (Step 1)
2. กรอก Settings (Step 2)
3. ไปที่ Step 3 (Questions)
4. คลิก "Add Question"
5. Modal เปิดขึ้นมา
6. กรอกคำถาม
7. กรอก options (multiple choice)
8. เลือกคำตอบที่ถูก
9. คลิก "Save Question"
10. Modal ปิด
11. ทำซ้ำขั้นตอน 4-10 สำหรับทุกคำถาม
```

**ถ้ามี 50 คำถาม = ต้องคลิก + กรอก 50 รอบ!** 😱

#### 3.2 ไม่มี Bulk Import / Quick Add
- ❌ ไม่มีการ import จาก Excel/CSV
- ❌ ไม่มี copy/duplicate question
- ❌ ไม่มี templates สำหรับคำถามที่ใช้บ่อย
- ❌ ไม่มี AI-assisted question generation

#### 3.3 ไม่มี Question Preview ก่อน Submit
- เห็นได้แค่ในส่วน "Questions Container"
- ไม่มีหน้า preview แบบเต็มรูป
- ไม่รู้ว่าข้อสอบจะแสดงผลยังไงจริงๆ

---

### **4. ❌ การผูกข้อสอบกับ Course ไม่ดีพอ** (ปัญหาปานกลาง)

**ปัญหา:**

#### 4.1 ไม่มี Context ของ Course
```html
<!-- บรรทัด 95-107 -->
<select id="course_id" name="course_id">
    <option value="">ไม่เกี่ยวข้องกับหลักสูตร</option>
    <% courses.forEach(course => { %>
        <option value="<%= course.course_id %>">
            <%= course.title %>
        </option>
    <% }); %>
</select>
```

**ไม่มีข้อมูล:**
- จำนวน tests ที่มีอยู่แล้วใน course นี้
- ประเภทของ tests ที่มี (pre/final/knowledge check)
- แนะนำว่าควรสร้าง test แบบไหนต่อไป

#### 4.2 ไม่มี Quick Link จาก Course Creation
- สร้าง course เสร็จ → ไม่มี redirect ไป create test
- ไม่มี "Create Final Assessment" button
- ต้องไปหน้า /tests/create แยกต่างหาก

#### 4.3 ไม่แสดง Assessment Structure
ไม่มีการแสดงว่า course นี้มี:
- Pre-training assessment?
- Knowledge checks? (กี่ตัว?)
- Midcourse assessment?
- **Final assessment?** ⭐ (สำคัญที่สุด!)
- Post-training assessment?

---

### **5. ❌ ระบบสร้างคำถามซับซ้อนเกินไป** (ปัญหาปานกลาง)

**ปัญหา:**

#### 5.1 Multiple Choice Options Management ยุ่งยาก
```javascript
// ต้องคลิก "Add Option" ทีละตัว
// ต้องเลือก radio button สำหรับคำตอบที่ถูก
// ต้อง upload รูปแยกทีละ option
// ต้องลบ option ที่ไม่ต้องการทีละตัว
```

ทำไมไม่มี:
- ❌ Default 4 options (A, B, C, D)?
- ❌ Quick keyboard shortcuts (1, 2, 3, 4 = mark correct)?
- ❌ Bulk edit options?

#### 5.2 True/False ง่ายแต่แยกออกมา
```html
<!-- บรรทัด 430-442 -->
<div id="true-false-options" class="hidden">
    <input type="radio" name="correct_answer" value="true">
    <input type="radio" name="correct_answer" value="false">
</div>
```

**ข้อเสนอแนะ:**
- ทำเป็น toggle button แทน radio
- ควรมี shortcut: T = True, F = False

#### 5.3 Essay/Fill Blank มีแต่ text field เปล่าๆ
- ไม่มี rich text editor สำหรับ essay sample answer
- ไม่มี AI scoring suggestions
- ไม่มี rubric builder

---

### **6. ❌ ไม่มี Validation ที่ดีพอ** (ปัญหาเล็กน้อย)

**ปัญหา:**

#### 6.1 Validation ทีหลัง
```javascript
// บรรทัด 1086-1089
async function submitTest() {
    if (questions.length === 0) {
        showError(i18n.addAtLeast1Question);
        return;
    }
    // ...
}
```

**เช็คเฉพาะ:**
- ❌ มีคำถามอย่างน้อย 1 ข้อ
- ไม่เช็ค: คำถามครบถ้วนหรือไม่ (missing options, no correct answer)

#### 6.2 ไม่มี Real-time Validation
- ไม่เตือนว่า option ซ้ำกัน
- ไม่เตือนว่าไม่ได้เลือกคำตอบที่ถูก
- ไม่เตือนว่าคำถามว่างเปล่า

---

### **7. ❌ Performance Issues** (ปัญหาเล็กน้อย)

**ปัญหา:**

#### 7.1 Image Preview ใช้ URL.createObjectURL()
```javascript
// บรรทัด 1005
img.src = URL.createObjectURL(question.question_image);
```

**ผลกระทบ:**
- Memory leaks ถ้ามีคำถามเยอะ
- ควร revoke URLs เมื่อไม่ใช้แล้ว

#### 7.2 Re-render ทั้ง Questions List ทุกครั้ง
```javascript
// บรรทัด 946-1053
function updateQuestionsDisplay() {
    // Clear container
    container.innerHTML = '';  // ← ลบทั้งหมดแล้ว render ใหม่!

    questions.forEach((question, index) => {
        // ... render question
    });
}
```

**ปัญหา:**
- Re-render ทุกอย่างทุกครั้งที่มีการเปลี่ยนแปลง
- ช้าเมื่อมีคำถามเยอะ (50+ questions)
- ควรใช้ incremental updates

---

### **8. ❌ ไม่มี Auto-save / Draft** (ปัญหาสำคัญ)

**ปัญหา:**

```html
<!-- บรรทัด 340-343 -->
<button type="button" onclick="saveDraft()">
    <i class="fas fa-save mr-2"></i>Save Draft
</button>
```

**แต่:**
- ❌ ไม่มี function `saveDraft()` implement!
- ❌ หาก browser crash = เสียหมด
- ❌ หากมี error = เสียหมด
- ❌ ไม่มี localStorage backup

**ควรมี:**
- ✅ Auto-save ทุก 30 วินาที
- ✅ localStorage backup
- ✅ Warning ก่อนออกจากหน้า (unsaved changes)

---

## 📊 สรุปปัญหาตามความร้ายแรง

### 🔴 **ปัญหาร้ายแรง (Critical)**

| # | ปัญหา | ผลกระทบ | ความเร่งด่วน |
|---|-------|----------|--------------|
| 1 | Question Bank ไม่ทำงาน | ไม่สามารถใช้คำถามซ้ำได้ | 🔥🔥🔥 สูงมาก |
| 2 | UX สร้างคำถามช้า/ยุ่งยาก | เสียเวลามาก กับข้อสอบ 50+ คำถาม | 🔥🔥🔥 สูงมาก |
| 3 | ไม่มี Auto-save | สูญเสียข้อมูลได้ง่าย | 🔥🔥 สูง |

### 🟡 **ปัญหาปานกลาง (Medium)**

| # | ปัญหา | ผลกระทบ | ความเร่งด่วน |
|---|-------|----------|--------------|
| 4 | Image Upload ไม่ทำงาน | คำถามที่มีรูปใช้ไม่ได้ | 🔥🔥 สูง |
| 5 | ผูกกับ Course ไม่ดี | ไม่มี context, ต้องจำเอง | 🔥 ปานกลาง |
| 6 | ระบบสร้างคำถามซับซ้อน | ใช้เวลานาน | 🔥 ปานกลาง |

### 🟢 **ปัญหาเล็กน้อย (Minor)**

| # | ปัญหา | ผลกระทบ | ความเร่งด่วน |
|---|-------|----------|--------------|
| 7 | Validation ไม่เพียงพอ | อาจสร้างข้อสอบผิดพลาด | ⚠️ ต่ำ |
| 8 | Performance Issues | ช้าเมื่อมีคำถามเยอะ | ⚠️ ต่ำ |

---

## 💡 ข้อเสนอแนะการปรับปรุง

### **แผนที่ 1: Quick Wins (1-2 วัน)** ⚡

#### 1.1 เพิ่ม Auto-save
```javascript
let autoSaveTimer;

function enableAutoSave() {
    autoSaveTimer = setInterval(() => {
        const testData = collectTestData();
        localStorage.setItem('test_draft', JSON.stringify(testData));
        console.log('Auto-saved at', new Date().toLocaleTimeString());
    }, 30000); // ทุก 30 วินาที
}

function loadDraft() {
    const draft = localStorage.getItem('test_draft');
    if (draft) {
        if (confirm('พบข้อมูลที่บันทึกไว้ ต้องการโหลดหรือไม่?')) {
            const testData = JSON.parse(draft);
            restoreTestData(testData);
        }
    }
}

// เพิ่มใน DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    loadDraft();
    enableAutoSave();

    // Warn before leaving
    window.addEventListener('beforeunload', (e) => {
        if (questions.length > 0) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});
```

#### 1.2 เพิ่ม Duplicate Question Button
```javascript
function duplicateQuestion(index) {
    const original = questions[index];
    const duplicate = JSON.parse(JSON.stringify(original)); // Deep clone
    duplicate.question_text = original.question_text + ' (Copy)';
    questions.splice(index + 1, 0, duplicate); // Insert after original
    updateQuestionsDisplay();
    showSuccess('คำถามถูก duplicate แล้ว');
}
```

```html
<!-- เพิ่มปุ่ม Duplicate ใน question card -->
<button onclick="duplicateQuestion(${index})"
        class="text-purple-600 hover:text-purple-800 text-sm">
    <i class="fas fa-copy"></i>
</button>
```

#### 1.3 เพิ่ม Default 4 Options สำหรับ Multiple Choice
```javascript
function changeQuestionType() {
    const type = document.getElementById('question-type').value;

    if (type === 'multiple_choice') {
        document.getElementById('answer-options').classList.remove('hidden');
        const container = document.getElementById('options-container');
        container.innerHTML = '';

        // ✅ เพิ่ม 4 options ทันที
        ['A', 'B', 'C', 'D'].forEach((letter, index) => {
            addOption(`Option ${letter}`, false);
        });
    }
    // ...
}
```

---

### **แผนที่ 2: Question Bank Integration (3-5 วัน)** 📚

#### 2.1 สร้าง Question Bank Modal

```html
<!-- Question Bank Modal -->
<div id="question-bank-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 z-50">
    <div class="relative top-10 mx-auto p-5 w-11/12 max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium">
                <i class="fas fa-database mr-2"></i>Question Bank
            </h3>
            <button onclick="closeQuestionBankModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Filters -->
        <div class="grid grid-cols-3 gap-4 mb-4">
            <select id="qb-course-filter" onchange="filterQuestionBank()">
                <option value="">All Courses</option>
                <!-- Load courses -->
            </select>

            <select id="qb-type-filter" onchange="filterQuestionBank()">
                <option value="">All Types</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="essay">Essay</option>
                <option value="fill_blank">Fill in the Blank</option>
            </select>

            <input type="text" id="qb-search" placeholder="Search questions..."
                   onkeyup="filterQuestionBank()"
                   class="rounded-md border-gray-300">
        </div>

        <!-- Questions List -->
        <div id="question-bank-list" class="space-y-3">
            <!-- Questions will be loaded here -->
        </div>

        <!-- Pagination -->
        <div class="flex justify-between items-center mt-4">
            <div class="text-sm text-gray-600">
                Showing <span id="qb-showing">0</span> of <span id="qb-total">0</span> questions
            </div>
            <div class="flex space-x-2">
                <button onclick="prevPageQB()" class="px-3 py-1 border rounded">
                    Previous
                </button>
                <span id="qb-page-info">Page 1</span>
                <button onclick="nextPageQB()" class="px-3 py-1 border rounded">
                    Next
                </button>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-3 mt-4 pt-4 border-t">
            <button onclick="closeQuestionBankModal()"
                    class="px-4 py-2 border rounded">
                Cancel
            </button>
            <button onclick="importSelectedQuestions()"
                    class="px-4 py-2 bg-blue-600 text-white rounded">
                Import Selected (<span id="selected-count">0</span>)
            </button>
        </div>
    </div>
</div>
```

#### 2.2 JavaScript Functions

```javascript
let selectedQuestions = new Set();
let questionBankData = [];
let qbCurrentPage = 1;
const qbPageSize = 10;

async function importQuestions() {
    // Load question bank
    try {
        const response = await fetch('/question-bank/api/questions');
        const result = await response.json();

        if (result.success) {
            questionBankData = result.data;
            renderQuestionBank();
            document.getElementById('question-bank-modal').classList.remove('hidden');
        }
    } catch (error) {
        showError('Failed to load question bank');
    }
}

function renderQuestionBank() {
    const container = document.getElementById('question-bank-list');
    container.innerHTML = '';

    const start = (qbCurrentPage - 1) * qbPageSize;
    const end = start + qbPageSize;
    const pageQuestions = questionBankData.slice(start, end);

    pageQuestions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'border border-gray-200 rounded p-3 hover:bg-gray-50 cursor-pointer';
        div.innerHTML = `
            <div class="flex items-start">
                <input type="checkbox"
                       onchange="toggleQuestionSelection(${q.question_id}, this.checked)"
                       ${selectedQuestions.has(q.question_id) ? 'checked' : ''}
                       class="mt-1 mr-3">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-sm font-medium">${q.question_text}</span>
                        <span class="text-xs px-2 py-0.5 rounded ${getQuestionTypeColor(q.question_type)}">
                            ${getQuestionTypeText(q.question_type)}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${q.course_name || 'No course'} • ${q.points} points • Used in ${q.usage_count || 0} tests
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Update pagination info
    document.getElementById('qb-showing').textContent = pageQuestions.length;
    document.getElementById('qb-total').textContent = questionBankData.length;
    document.getElementById('qb-page-info').textContent = `Page ${qbCurrentPage}`;
}

function toggleQuestionSelection(questionId, isSelected) {
    if (isSelected) {
        selectedQuestions.add(questionId);
    } else {
        selectedQuestions.delete(questionId);
    }
    document.getElementById('selected-count').textContent = selectedQuestions.size;
}

async function importSelectedQuestions() {
    if (selectedQuestions.size === 0) {
        showError('Please select at least one question');
        return;
    }

    // Fetch full question data including answers
    try {
        const questionIds = Array.from(selectedQuestions);
        const response = await fetch('/question-bank/api/questions/bulk', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({question_ids: questionIds})
        });

        const result = await response.json();

        if (result.success) {
            // Add imported questions to current test
            result.data.forEach(q => {
                questions.push(convertQBQuestionToTestQuestion(q));
            });

            updateQuestionsDisplay();
            closeQuestionBankModal();
            showSuccess(`Imported ${questionIds.length} questions successfully`);
        }
    } catch (error) {
        showError('Failed to import questions');
    }
}

function convertQBQuestionToTestQuestion(qbQuestion) {
    // Convert Question Bank format to Test Question format
    return {
        question_type: qbQuestion.question_type,
        question_text: qbQuestion.question_text,
        question_image: null, // Will need to handle images separately
        points: qbQuestion.points || 1,
        explanation: qbQuestion.explanation,
        options: qbQuestion.options || [],
        correct_answer: qbQuestion.correct_answer,
        sample_answer: qbQuestion.sample_answer,
        correct_answers: qbQuestion.correct_answers
    };
}

function closeQuestionBankModal() {
    document.getElementById('question-bank-modal').classList.add('hidden');
    selectedQuestions.clear();
    document.getElementById('selected-count').textContent = '0';
}

function filterQuestionBank() {
    const courseFilter = document.getElementById('qb-course-filter').value;
    const typeFilter = document.getElementById('qb-type-filter').value;
    const searchText = document.getElementById('qb-search').value.toLowerCase();

    questionBankData = questionBankData.filter(q => {
        if (courseFilter && q.course_id != courseFilter) return false;
        if (typeFilter && q.question_type != typeFilter) return false;
        if (searchText && !q.question_text.toLowerCase().includes(searchText)) return false;
        return true;
    });

    qbCurrentPage = 1;
    renderQuestionBank();
}
```

---

### **แผนที่ 3: Image Upload Support (2-3 วัน)** 🖼️

#### 3.1 อัพเดท submitTest() เพื่อรองรับ Images

```javascript
async function submitTest() {
    if (questions.length === 0) {
        showError(i18n.addAtLeast1Question);
        return;
    }

    // ✅ ใช้ FormData แทน JSON เพื่อส่ง files
    const formData = new FormData();

    // Add test data
    const testInfo = {
        test_name: document.getElementById('test_name').value,
        test_code: document.getElementById('test_code').value,
        description: document.getElementById('description').value,
        instructions: document.getElementById('instructions').value,
        type: document.getElementById('test_type').value,
        course_id: document.getElementById('course_id').value || null,
        difficulty_level: document.getElementById('difficulty_level').value,
        time_limit: document.getElementById('time_limit').value || null,
        start_date: document.getElementById('start_date').value || null,
        end_date: document.getElementById('end_date').value || null,
        max_attempts: document.getElementById('max_attempts').value,
        passing_score: document.getElementById('passing_score').value,
        question_order: document.getElementById('question_order').value,
        show_score_immediately: document.getElementById('show_score_immediately').checked,
        show_correct_answers: document.getElementById('show_correct_answers').checked,
        allow_review: document.getElementById('allow_review').checked,
        require_camera: document.getElementById('require_camera').checked,
        prevent_copy_paste: document.getElementById('prevent_copy_paste').checked,
        track_tab_switching: document.getElementById('track_tab_switching').checked,
        access_code: document.getElementById('access_code').value || null,
        status: document.getElementById('status').value
    };

    formData.append('test_info', JSON.stringify(testInfo));

    // Add questions with images
    const questionsData = [];

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const questionData = {
            question_type: q.question_type,
            question_text: q.question_text,
            points: q.points,
            explanation: q.explanation || '',
            options: [],
            correct_answer: q.correct_answer,
            sample_answer: q.sample_answer,
            correct_answers: q.correct_answers
        };

        // ✅ Add question image
        if (q.question_image) {
            formData.append(`question_image_${i}`, q.question_image);
            questionData.has_image = true;
        }

        // ✅ Add options with images
        if (q.options) {
            q.options.forEach((opt, optIndex) => {
                questionData.options.push({
                    text: opt.text,
                    is_correct: opt.is_correct
                });

                if (opt.image) {
                    formData.append(`question_${i}_option_image_${optIndex}`, opt.image);
                    questionData.options[optIndex].has_image = true;
                }
            });
        }

        questionsData.push(questionData);
    }

    formData.append('questions', JSON.stringify(questionsData));

    // ✅ Submit with FormData
    try {
        const response = await fetch('/tests/api/create', {
            method: 'POST',
            body: formData  // ← ไม่ต้องระบุ Content-Type, browser จะจัดการให้
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(i18n.testCreatedSuccess);
            localStorage.removeItem('test_draft');  // Clear draft

            setTimeout(() => {
                window.location.href = `/tests/${result.data.test_id}`;
            }, 1500);
        } else {
            showError(result.message || i18n.errorCreatingTest);
        }
    } catch (error) {
        console.error('Error creating test:', error);
        showError(i18n.connectionError);
    }
}
```

#### 3.2 อัพเดท Backend Controller

```javascript
// testController.js - createTest function
const multer = require('multer');
const path = require('path');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/test-images/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `test-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images only (jpeg, jpg, png, gif)');
        }
    }
}).any(); // Accept any field names

async createTest(req, res) {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: 'File upload error: ' + err
            });
        }

        try {
            const testInfo = JSON.parse(req.body.test_info);
            const questionsData = JSON.parse(req.body.questions);

            // Map uploaded files to questions
            const files = req.files;

            questionsData.forEach((q, qIndex) => {
                // Find question image
                const questionImageFile = files.find(f => f.fieldname === `question_image_${qIndex}`);
                if (questionImageFile) {
                    q.question_image_path = questionImageFile.path;
                }

                // Find option images
                if (q.options) {
                    q.options.forEach((opt, optIndex) => {
                        const optionImageFile = files.find(f => f.fieldname === `question_${qIndex}_option_image_${optIndex}`);
                        if (optionImageFile) {
                            opt.image_path = optionImageFile.path;
                        }
                    });
                }
            });

            // Create test and questions...
            // (existing logic)

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating test: ' + error.message
            });
        }
    });
}
```

---

### **แผนที่ 4: Course Integration Improvements (2-3 วัน)** 📚

#### 4.1 แสดง Assessment Structure ของ Course

```javascript
// ✅ เพิ่มใน loadChapters() หรือสร้าง function ใหม่
async function loadCourseAssessmentStructure() {
    const courseId = document.getElementById('course_id').value;

    if (!courseId) {
        document.getElementById('course-assessment-info').classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`/courses/api/${courseId}/tests`);
        const result = await response.json();

        if (result.success) {
            displayCourseAssessmentStructure(result.data);
        }
    } catch (error) {
        console.error('Error loading course tests:', error);
    }
}

function displayCourseAssessmentStructure(tests) {
    const container = document.getElementById('course-assessment-info');
    container.classList.remove('hidden');

    const testTypes = {
        pre_training_assessment: [],
        knowledge_check: [],
        midcourse_assessment: [],
        final_assessment: [],
        post_training_assessment: []
    };

    tests.forEach(test => {
        if (testTypes[test.type]) {
            testTypes[test.type].push(test);
        }
    });

    let html = '<div class="bg-blue-50 border border-blue-200 rounded p-4 mt-4">';
    html += '<h4 class="text-sm font-medium text-blue-900 mb-3">📊 Course Assessment Structure</h4>';
    html += '<div class="space-y-2 text-sm">';

    // Pre-training
    html += '<div class="flex items-center justify-between">';
    html += '<span>Pre-training Assessment:</span>';
    if (testTypes.pre_training_assessment.length > 0) {
        html += '<span class="text-green-600">✓ Created</span>';
    } else {
        html += '<span class="text-gray-400">− Not created</span>';
    }
    html += '</div>';

    // Knowledge checks
    html += '<div class="flex items-center justify-between">';
    html += '<span>Knowledge Checks:</span>';
    html += `<span class="text-blue-600">${testTypes.knowledge_check.length} tests</span>`;
    html += '</div>';

    // Midcourse
    html += '<div class="flex items-center justify-between">';
    html += '<span>Midcourse Assessment:</span>';
    if (testTypes.midcourse_assessment.length > 0) {
        html += '<span class="text-green-600">✓ Created</span>';
    } else {
        html += '<span class="text-gray-400">− Not created</span>';
    }
    html += '</div>';

    // Final (สำคัญที่สุด!)
    html += '<div class="flex items-center justify-between font-medium">';
    html += '<span>⭐ Final Assessment:</span>';
    if (testTypes.final_assessment.length > 0) {
        html += '<span class="text-green-600">✓ Created</span>';
    } else {
        html += '<span class="text-red-600">❌ REQUIRED!</span>';
    }
    html += '</div>';

    // Post-training
    html += '<div class="flex items-center justify-between">';
    html += '<span>Post-training Assessment:</span>';
    if (testTypes.post_training_assessment.length > 0) {
        html += '<span class="text-green-600">✓ Created</span>';
    } else {
        html += '<span class="text-gray-400">− Not created</span>';
    }
    html += '</div>';

    html += '</div>';

    // Suggestions
    if (testTypes.final_assessment.length === 0) {
        html += '<div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">';
        html += '<p class="text-xs text-yellow-800">';
        html += '💡 <strong>Suggestion:</strong> This course needs a Final Assessment. ';
        html += 'Consider creating one now!';
        html += '</p>';
        html += '</div>';
    }

    html += '</div>';

    container.innerHTML = html;
}
```

```html
<!-- เพิ่มใน Step 1 หลัง course_id select -->
<div id="course-assessment-info" class="hidden md:col-span-2">
    <!-- จะแสดง assessment structure ตรงนี้ -->
</div>
```

#### 4.2 Quick Link จาก Course Detail Page

```html
<!-- ใน views/courses/detail.ejs -->
<div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium mb-4">
        <i class="fas fa-clipboard-check mr-2"></i>Assessments
    </h3>

    <% if (tests && tests.length > 0) { %>
        <div class="space-y-2">
            <% tests.forEach(test => { %>
                <div class="flex items-center justify-between p-3 border rounded">
                    <div>
                        <span class="font-medium"><%= test.title %></span>
                        <span class="text-xs text-gray-500 ml-2">
                            (<%= test.type_display %>)
                        </span>
                    </div>
                    <div class="flex space-x-2">
                        <a href="/tests/<%= test.test_id %>/edit"
                           class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a href="/tests/<%= test.test_id %>"
                           class="text-green-600 hover:text-green-800">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>
            <% }); %>
        </div>
    <% } else { %>
        <p class="text-gray-500 mb-4">No assessments created yet.</p>
    <% } %>

    <!-- ✅ Quick Create Button -->
    <a href="/tests/create?course_id=<%= course.course_id %>"
       class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700">
        <i class="fas fa-plus mr-2"></i>Create New Assessment
    </a>
</div>
```

```javascript
// ใน create.ejs - auto-fill course_id from URL
document.addEventListener('DOMContentLoaded', function() {
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course_id');

    if (courseId) {
        document.getElementById('course_id').value = courseId;
        loadCourseAssessmentStructure();
        loadChapters();
    }

    // ...
});
```

---

### **แผนที่ 5: Bulk Import from Excel/CSV (3-5 วัน)** 📥

#### 5.1 เพิ่มปุ่ม Import Excel

```html
<!-- ใน Step 3 -->
<div class="flex items-center justify-between mb-4">
    <h4 class="text-md font-medium text-gray-900">Question List</h4>
    <div class="flex space-x-3">
        <!-- ✅ เพิ่มปุ่ม Import Excel -->
        <button type="button" onclick="showImportExcelModal()"
                class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <i class="fas fa-file-excel mr-2 text-green-600"></i>Import from Excel
        </button>

        <button type="button" onclick="importQuestions()"
                class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <i class="fas fa-upload mr-2"></i>Import from Question Bank
        </button>

        <button type="button" onclick="addQuestion()"
                class="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700">
            <i class="fas fa-plus mr-2"></i>Add Question
        </button>
    </div>
</div>
```

#### 5.2 Excel Import Modal & Logic

```html
<!-- Import Excel Modal -->
<div id="import-excel-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 z-50">
    <div class="relative top-20 mx-auto p-5 w-11/12 md:w-2/3 bg-white rounded-lg shadow-xl">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium">
                <i class="fas fa-file-excel mr-2 text-green-600"></i>Import Questions from Excel
            </h3>
            <button onclick="closeImportExcelModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h4 class="text-sm font-medium text-blue-900 mb-2">📝 Excel Format Instructions</h4>
            <p class="text-xs text-blue-800 mb-2">Your Excel file should have the following columns:</p>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>• <strong>question_text</strong> (required)</div>
                <div>• <strong>question_type</strong> (required)</div>
                <div>• <strong>points</strong> (default: 1)</div>
                <div>• <strong>option_a, option_b, option_c, option_d</strong></div>
                <div>• <strong>correct_answer</strong> (A/B/C/D or true/false)</div>
                <div>• <strong>explanation</strong> (optional)</div>
            </div>
            <div class="mt-2">
                <a href="/templates/question-import-template.xlsx"
                   class="text-blue-600 hover:underline text-xs">
                    <i class="fas fa-download mr-1"></i>Download Excel Template
                </a>
            </div>
        </div>

        <!-- File Upload -->
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv"
                   onchange="handleExcelFileSelect(this)"
                   class="hidden">
            <label for="excel-file-input" class="cursor-pointer">
                <div class="text-gray-400 mb-2">
                    <i class="fas fa-cloud-upload-alt text-4xl"></i>
                </div>
                <p class="text-sm text-gray-600">
                    Click to upload or drag and drop
                </p>
                <p class="text-xs text-gray-500 mt-1">
                    Excel (.xlsx, .xls) or CSV (.csv) files only
                </p>
            </label>
        </div>

        <!-- Preview -->
        <div id="excel-preview" class="hidden mt-4">
            <h4 class="text-sm font-medium mb-2">Preview (<span id="preview-count">0</span> questions)</h4>
            <div class="max-h-64 overflow-y-auto border rounded">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-3 py-2 text-xs font-medium text-gray-500">Question</th>
                            <th class="px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                            <th class="px-3 py-2 text-xs font-medium text-gray-500">Points</th>
                            <th class="px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                        </tr>
                    </thead>
                    <tbody id="excel-preview-body" class="bg-white divide-y divide-gray-200">
                        <!-- Preview rows will be inserted here -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end space-x-3 mt-4 pt-4 border-t">
            <button onclick="closeImportExcelModal()"
                    class="px-4 py-2 border rounded">
                Cancel
            </button>
            <button id="import-excel-btn" onclick="importFromExcel()"
                    class="px-4 py-2 bg-green-600 text-white rounded" disabled>
                Import Questions
            </button>
        </div>
    </div>
</div>
```

```javascript
// Excel Import Logic (using SheetJS library)
let excelQuestions = [];

function showImportExcelModal() {
    document.getElementById('import-excel-modal').classList.remove('hidden');
}

function closeImportExcelModal() {
    document.getElementById('import-excel-modal').classList.add('hidden');
    excelQuestions = [];
    document.getElementById('excel-file-input').value = '';
    document.getElementById('excel-preview').classList.add('hidden');
}

async function handleExcelFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        // Read file using SheetJS (XLSX library)
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate and convert to question format
        excelQuestions = jsonData.map((row, index) => {
            try {
                return parseExcelRow(row, index);
            } catch (error) {
                return {
                    error: true,
                    message: error.message,
                    row: index + 1
                };
            }
        });

        // Show preview
        displayExcelPreview(excelQuestions);
        document.getElementById('import-excel-btn').disabled = false;

    } catch (error) {
        showError('Failed to read Excel file: ' + error.message);
    }
}

function parseExcelRow(row, index) {
    // Validate required fields
    if (!row.question_text || !row.question_type) {
        throw new Error(`Missing required fields (question_text or question_type)`);
    }

    const question = {
        question_type: row.question_type.toLowerCase(),
        question_text: row.question_text,
        points: row.points || 1,
        explanation: row.explanation || ''
    };

    // Parse based on question type
    if (question.question_type === 'multiple_choice') {
        const options = [];

        ['a', 'b', 'c', 'd'].forEach((letter, i) => {
            const optionKey = `option_${letter}`;
            if (row[optionKey]) {
                options.push({
                    text: row[optionKey],
                    is_correct: row.correct_answer && row.correct_answer.toLowerCase() === letter
                });
            }
        });

        if (options.length < 2) {
            throw new Error('Multiple choice questions must have at least 2 options');
        }

        question.options = options;

    } else if (question.question_type === 'true_false') {
        if (!row.correct_answer) {
            throw new Error('True/False questions must have correct_answer');
        }
        question.correct_answer = row.correct_answer.toLowerCase() === 'true' ? 'true' : 'false';

    } else if (question.question_type === 'essay') {
        question.sample_answer = row.sample_answer || '';

    } else if (question.question_type === 'fill_blank') {
        if (!row.correct_answer) {
            throw new Error('Fill blank questions must have correct_answer');
        }
        question.correct_answers = row.correct_answer.split(',').map(a => a.trim());

    } else {
        throw new Error(`Unknown question type: ${question.question_type}`);
    }

    return question;
}

function displayExcelPreview(questions) {
    const tbody = document.getElementById('excel-preview-body');
    tbody.innerHTML = '';

    const validQuestions = questions.filter(q => !q.error);
    const errorQuestions = questions.filter(q => q.error);

    document.getElementById('preview-count').textContent = validQuestions.length;

    questions.forEach((q, index) => {
        const tr = document.createElement('tr');
        tr.className = q.error ? 'bg-red-50' : '';

        if (q.error) {
            tr.innerHTML = `
                <td colspan="3" class="px-3 py-2 text-xs text-red-600">
                    Row ${q.row}: ${q.message}
                </td>
                <td class="px-3 py-2 text-xs">
                    <span class="text-red-600"><i class="fas fa-times"></i> Error</span>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td class="px-3 py-2 text-xs">${q.question_text.substring(0, 50)}...</td>
                <td class="px-3 py-2 text-xs">
                    <span class="px-2 py-0.5 rounded ${getQuestionTypeColor(q.question_type)}">
                        ${q.question_type}
                    </span>
                </td>
                <td class="px-3 py-2 text-xs">${q.points}</td>
                <td class="px-3 py-2 text-xs">
                    <span class="text-green-600"><i class="fas fa-check"></i> Valid</span>
                </td>
            `;
        }

        tbody.appendChild(tr);
    });

    document.getElementById('excel-preview').classList.remove('hidden');

    // Show warning if there are errors
    if (errorQuestions.length > 0) {
        showWarning(`${errorQuestions.length} questions have errors and will be skipped`);
    }
}

function importFromExcel() {
    const validQuestions = excelQuestions.filter(q => !q.error);

    if (validQuestions.length === 0) {
        showError('No valid questions to import');
        return;
    }

    // Add to questions array
    validQuestions.forEach(q => {
        questions.push(q);
    });

    updateQuestionsDisplay();
    closeImportExcelModal();
    showSuccess(`Successfully imported ${validQuestions.length} questions from Excel`);
}
```

**Dependencies ที่ต้องเพิ่ม:**
```html
<!-- เพิ่มใน head ของ create.ejs -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
```

---

## 📈 Summary & Recommendations

### **Priority Matrix**

```
High Impact, Easy to Implement (Do First! 🚀)
├─ Auto-save functionality
├─ Duplicate question button
├─ Default 4 options for multiple choice
└─ Course assessment structure display

High Impact, Medium Effort (Do Next 📚)
├─ Question Bank Integration
├─ Bulk Import from Excel
└─ Image upload support

Medium Impact, Medium Effort (Nice to Have ✨)
├─ Better validation
├─ Performance improvements
└─ Quick keyboard shortcuts

Low Impact / Long-term (Future 🔮)
├─ AI question generation
├─ Advanced rubric builder
└─ Real-time collaboration
```

### **Estimated Timeline**

**Phase 1 (Week 1): Quick Wins**
- Day 1-2: Auto-save + Duplicate + 4 default options
- Day 3-4: Course assessment structure display
- Day 5: Testing & bug fixes

**Phase 2 (Week 2): Major Features**
- Day 1-3: Question Bank Integration
- Day 4-5: Image upload support

**Phase 3 (Week 3): Import & Polish**
- Day 1-3: Excel/CSV import
- Day 4-5: Better validation + performance

---

## 🎯 Final Score After Improvements

**Before:** 6/10
**After Phase 1:** 7.5/10 (+1.5)
**After Phase 2:** 8.5/10 (+1.0)
**After Phase 3:** 9.0/10 (+0.5)

**Key Improvements:**
- ✅ Question Bank working
- ✅ Auto-save preventing data loss
- ✅ Images supported
- ✅ Excel import saving time
- ✅ Better Course integration

---

**จัดทำรายงานเมื่อ:** 2025-11-25
**ตรวจสอบโดย:** Claude Code
**สถานะ:** รอการปรับปรุง

**ข้อมูลอ้างอิง:**
- `views/tests/create.ejs` (1126 lines)
- `controllers/testController.js`
- `models/Test.js`
