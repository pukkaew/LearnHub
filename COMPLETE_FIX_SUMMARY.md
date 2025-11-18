# สรุปปัญหาและวิธีแก้ไขแบบสมบูรณ์

**วันที่:** 17 พฤศจิกายน 2025
**ผู้วิเคราะห์:** Claude Code

---

## 🔴 ปัญหาที่พบทั้งหมด

### ข้อมูล Course ที่สร้างจากฟอร์มแสดงผลไม่ครบ:

```json
{
  "course_id": 1,
  "title": "Test11",           // ✅ OK
  "description": "...",         // ✅ OK
  "course_code": null,          // ❌ NULL
  "course_type": null,           // ❌ NULL
  "language": null,              // ❌ NULL
  "learning_objectives": null,   // ❌ NULL
  "target_audience": null,       // ❌ NULL
  "passing_score": null,         // ❌ NULL
  "max_attempts": null,          // ❌ NULL
  "certificate_validity": null,  // ❌ NULL
  "max_students": null,          // ❌ NULL
  "lessons": []                  // ❌ ว่างเปล่า
}
```

---

## ✅ ปัญหาที่แก้ไขแล้ว

### 1. ✅ certificate_validity - Type mismatch

**ปัญหา:** ฟอร์มส่งเป็น Number แต่ SQL ต้องการ String

**แก้ไข:** `models/Course.js:224`
```javascript
// ก่อน
.input('certificateValidity', sql.NVarChar(50), courseData.certificate_validity || null)

// หลัง
.input('certificateValidity', sql.NVarChar(50), courseData.certificate_validity ? String(courseData.certificate_validity) : null)
```

### 2. ✅ lesson video_url ไม่ถูกเก็บ

**ปัญหา:** collectFormData() ไม่ได้เก็บ video URLs

**แก้ไข:** `public/js/course-wizard.js:1028-1045`
```javascript
const lessonVideoUrls = document.querySelectorAll('input[name="lesson_video_urls[]"]');

for (let i = 0; i < lessonTitles.length; i++) {
    if (lessonTitles[i].value.trim()) {
        lessons.push({
            title: lessonTitles[i].value.trim(),
            duration: parseInt(lessonDurations[i].value) || 0,
            description: lessonDescriptions[i].value.trim(),
            video_url: lessonVideoUrls[i] ? lessonVideoUrls[i].value.trim() : null  // ← เพิ่ม
        });
    }
}
```

### 3. ✅ video_url ไม่ถูกบันทึกลง database

**ปัญหา:** Course.create() ไม่ได้ INSERT video_url

**แก้ไข:** `models/Course.js:246-270`
```javascript
.input('filePath', sql.NVarChar(500), lesson.video_url || null)
.query(`
    INSERT INTO course_materials (
        course_id, title, content, type, file_path, order_index, duration_minutes, created_at
    ) VALUES (
        @courseId, @title, @content, @type, @filePath, @orderIndex, @duration, GETDATE()
    )
`);
```

### 4. ✅ video_url ไม่ถูก map กลับมา

**ปัญหา:** Course.findById() ดึง file_path แต่ไม่ map เป็น video_url

**แก้ไข:** `models/Course.js:84-97`
```javascript
// Map file_path to video_url for frontend
course.lessons = lessonsResult.recordset.map(lesson => ({
    ...lesson,
    video_url: lesson.file_path || null
}));
```

### 5. ✅ video player ไม่แสดง

**ปัญหา:** detail.ejs แสดงแค่ icon ไม่มีลิงก์

**แก้ไข:** `views/courses/detail.ejs:749-784`
```javascript
${lesson.video_url ? `
    <a href="${lesson.video_url}" target="_blank" class="flex items-center text-ruxchai-primary">
        <i class="fas fa-play-circle mr-1"></i>
        <span class="text-xs">ดูวิดีโอ</span>
    </a>
    ...
    <div class="bg-gray-50 rounded-lg p-3">
        <a href="${lesson.video_url}" target="_blank" class="text-blue-600">
            ${lesson.video_url}
        </a>
    </div>
` : ''}
```

---

## ❌ ปัญหาที่ยังไม่ได้แก้ไข

### 1. ❌ passing_score และ max_attempts เป็น NULL

**สาเหตุ:**
- Fields เหล่านี้อยู่ใน section "สร้างข้อสอบใหม่" (`new_passing_score`, `new_max_attempts`)
- ถ้าเลือก "ไม่มีการประเมิน" → จะไม่มีการ set ค่า
- `submitCourse()` จะ copy เฉพาะเมื่อสร้างข้อสอบใหม่ (line 858-859):

```javascript
if (coursePassingScore) formData.passing_score = coursePassingScore;
if (courseMaxAttempts) formData.max_attempts = courseMaxAttempts;
```

**วิธีแก้:**
1. เพิ่ม fields แยกต่างหากใน Step 4:
   - `passing_score` (เกณฑ์ผ่านของ Course ไม่ใช่ของ Test)
   - `max_attempts` (จำนวนครั้งที่เรียนได้ ไม่ใช่ทำข้อสอบได้)
2. หรือ ใช้ `new_passing_score`, `new_max_attempts` เป็นค่า default แม้ไม่สร้างข้อสอบ

### 2. ❌ Field name ไม่ตรงกัน: max_enrollments vs max_students

**ปัญหา:**
- ฟอร์มใช้: `max_enrollments` (line 276)
- Backend ต้องการ: `max_students`

**วิธีแก้:**
ใน `collectFormData()` map field name:
```javascript
data.max_students = data.max_enrollments || data.max_students;
```

### 3. ❌ certificate_validity เป็น dropdown แต่บันทึกเป็น string value

**ปัญหา:**
- Dropdown มี values: "unlimited", "1year", "2years", "3years"
- แต่ detail.ejs แสดงเป็น "365" หรือ "730"

**วิธีแก้:**
Map values ใน collectFormData():
```javascript
const certValidityMap = {
    'unlimited': 'ไม่มีกำหนด',
    '1year': '365',
    '2years': '730',
    '3years': '1095'
};
data.certificate_validity = certValidityMap[data.certificate_validity] || data.certificate_validity;
```

### 4. ❌ ไม่มี validation ในฟอร์ม

**ปัญหา:**
- ผู้ใช้สามารถข้ามขั้นตอนได้โดยไม่กรอกข้อมูล
- validateStep() ไม่ครอบคลุม

**วิธีแก้:**
ปรับปรุง validateStep() ใน course-wizard.js:
- Step 1: ต้องกรอก course_code, course_type, language
- Step 2: ต้องมี learning_objectives 3+ รายการ, เลือก target_positions และ target_departments
- Step 3: ต้องมี lessons 1+ บท
- Step 4: ถ้าเลือกสร้างข้อสอบใหม่ ต้องกรอก new_test_name

---

## 📋 แผนการแก้ไขที่เหลือ

### ขั้นตอนที่ 1: แก้ field name mapping

ไฟล์: `public/js/course-wizard.js:1059`

เพิ่ม:
```javascript
// Map field names
data.max_students = data.max_enrollments || data.max_students;
delete data.max_enrollments;

// Map certificate validity
const certValidityMap = {
    'unlimited': 'ไม่มีกำหนด',
    '1year': '365',
    '2years': '730',
    '3years': '1095'
};
if (data.certificate_validity && certValidityMap[data.certificate_validity]) {
    data.certificate_validity = certValidityMap[data.certificate_validity];
}
```

### ขั้นตอนที่ 2: แก้ passing_score และ max_attempts

**ตัวเลือก A:** เพิ่มฟิลด์ใหม่ใน Step 4

ไฟล์: `views/courses/create.ejs` หลัง line 604

เพิ่ม:
```html
<!-- Course Completion Settings -->
<div class="border border-gray-200 rounded-lg p-4 mt-4">
    <h4 class="font-medium text-gray-700 mb-3">การผ่านหลักสูตร</h4>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="passing_score" class="block text-sm font-medium text-gray-700 mb-2">
                เกณฑ์การผ่าน (%)
            </label>
            <input type="number" id="passing_score" name="passing_score" min="0" max="100" value="70"
                   class="w-full rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary">
            <p class="text-xs text-gray-500 mt-1">คะแนนขั้นต่ำที่ต้องได้เพื่อผ่านหลักสูตร</p>
        </div>
        <div>
            <label for="max_attempts" class="block text-sm font-medium text-gray-700 mb-2">
                จำนวนครั้งที่เรียนได้
            </label>
            <input type="number" id="max_attempts" name="max_attempts" min="1" value="unlimited"
                   class="w-full rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary">
            <p class="text-xs text-gray-500 mt-1">ปล่อยว่างสำหรับไม่จำกัด</p>
        </div>
    </div>
</div>
```

**ตัวเลือก B:** ใช้ new_passing_score เป็นค่า default

ไฟล์: `public/js/course-wizard.js:858-859`

แก้เป็น:
```javascript
// Always set passing_score and max_attempts from test settings or defaults
formData.passing_score = coursePassingScore || document.getElementById('new_passing_score')?.value || 70;
formData.max_attempts = courseMaxAttempts || document.getElementById('new_max_attempts')?.value || 3;
```

### ขั้นตอนที่ 3: เพิ่ม validation

ไฟล์: `public/js/course-wizard.js` - ปรับปรุง validateStep()

```javascript
function validateStep(step) {
    switch (step) {
        case 1:
            const courseName = document.getElementById('course_name').value;
            const courseCode = document.getElementById('course_code').value;
            const courseType = document.getElementById('course_type').value;
            const language = document.getElementById('language').value;

            if (!courseName.trim()) {
                showError('กรุณากรอกชื่อหลักสูตร');
                return false;
            }
            if (!courseCode.trim()) {
                showError('กรุณากรอกรหัสหลักสูตร');
                return false;
            }
            if (!courseType) {
                showError('กรุณาเลือกประเภทหลักสูตร');
                return false;
            }
            if (!language) {
                showError('กรุณาเลือกภาษา');
                return false;
            }
            return true;

        case 2:
            const objectives = document.querySelectorAll('input[name="objectives[]"]');
            const validObjectives = Array.from(objectives).filter(o => o.value.trim());

            if (validObjectives.length < 3) {
                showError('กรุณากรอกวัตถุประสงค์อย่างน้อย 3 ข้อ');
                return false;
            }

            const selectedPositions = Array.from(document.getElementById('target_positions').selectedOptions);
            const selectedDepartments = Array.from(document.getElementById('target_departments').selectedOptions);

            if (selectedPositions.length === 0) {
                showError('กรุณาเลือกตำแหน่งเป้าหมายอย่างน้อย 1 ตำแหน่ง');
                return false;
            }
            if (selectedDepartments.length === 0) {
                showError('กรุณาเลือกแผนกเป้าหมายอย่างน้อย 1 แผนก');
                return false;
            }
            return true;

        case 3:
            const lessons = document.querySelectorAll('input[name="lesson_titles[]"]');
            const validLessons = Array.from(lessons).filter(l => l.value.trim());

            if (validLessons.length === 0) {
                showError('กรุณาเพิ่มบทเรียนอย่างน้อย 1 บท');
                return false;
            }
            return true;

        case 4:
            const assessmentType = document.querySelector('input[name="assessment_type"]:checked')?.value;

            if (assessmentType === 'create_new') {
                const testName = document.getElementById('new_test_name').value;
                if (!testName.trim()) {
                    showError('กรุณากรอกชื่อข้อสอบ');
                    return false;
                }
            }
            return true;

        default:
            return true;
    }
}
```

---

## 🎯 ผลลัพธ์ที่ต้องการ

หลังแก้ไขทั้งหมดเสร็จ Course ที่สร้างจากฟอร์มต้องมี:

```json
{
  "course_id": 1,
  "title": "...",                        // ✅
  "course_code": "CRS-2025-0001",        // ✅
  "course_type": "mandatory",            // ✅
  "language": "th",                      // ✅
  "learning_objectives": ["...", "...", "..."],  // ✅ 3+ รายการ
  "target_audience": {
    "positions": ["developer", "engineer"],      // ✅
    "departments": ["it", "development"]         // ✅
  },
  "lessons": [
    {
      "title": "บทที่ 1",               // ✅
      "duration": 60,                    // ✅
      "description": "...",              // ✅
      "video_url": "https://youtube.com/..."  // ✅
    }
  ],
  "passing_score": 75,                   // ✅
  "max_attempts": 3,                     // ✅
  "certificate_validity": "365",         // ✅
  "max_students": 50                     // ✅
}
```

และหน้า detail ต้องแสดงผล:
- ✅ ข้อมูลพื้นฐานครบถ้วน
- ✅ วัตถุประสงค์ครบ
- ✅ กลุ่มเป้าหมายถูกต้อง (ดึงจาก database)
- ✅ บทเรียนพร้อมลิงก์วิดีโอ
- ✅ เกณฑ์การผ่าน
- ✅ จำนวนครั้งที่ทำได้

---

**สถานะ:** 🟡 In Progress (แก้ไข 5/9 ปัญหา)
**ต้องการ:** แก้ไขปัญหาที่เหลืออีก 4 ข้อ
