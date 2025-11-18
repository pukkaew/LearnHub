# การแก้ไขหน้าแก้ไขหลักสูตร - สรุปทั้งหมด

**วันที่:** 17 พฤศจิกายน 2025
**สถานะ:** ✅ เสร็จสมบูรณ์

---

## 📊 สรุปการแก้ไข

### ✅ ปัญหาที่แก้ไขแล้ว:

1. ✅ **Course ID extraction** - แก้จาก [3] เป็น [2]
2. ✅ **Instructor field** - เปลี่ยนจาก dropdown เป็น readonly
3. ✅ **Course image loading** - รองรับ course_image, thumbnail_image, thumbnail
4. ✅ **9 ฟิลด์ใหม่** - เพิ่มฟิลด์ที่ขาดหาย
5. ✅ **Field name mapping** - จับคู่ชื่อฟิลด์ database กับ form
6. ✅ **Value mapping** - แปลงค่า enum (mandatory→Required, th→Thai)
7. ✅ **Datetime fields** - รองรับ enrollment_start/start_date, enrollment_end/end_date
8. ✅ **Permission** - เพิ่ม HR role ให้แก้ไขได้

---

## 📝 รายละเอียดการแก้ไข

### 1. Course ID Extraction (Line 289)

**เดิม:**
```javascript
courseId = window.location.pathname.split('/')[3]; // Got 'edit'
```

**ใหม่:**
```javascript
courseId = window.location.pathname.split('/')[2]; // Gets course_id
```

---

### 2. Instructor Field (Line 227-233)

**เดิม:** Dropdown select ที่เลือกผู้สอนได้

**ใหม่:**
```html
<label for="instructor_name_display">ผู้สอน</label>
<input type="text" id="instructor_name_display" readonly
       class="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm cursor-not-allowed">
<input type="hidden" id="instructor_id" name="instructor_id">
<p class="text-xs text-gray-500 mt-1">ผู้สอนไม่สามารถเปลี่ยนแปลงได้</p>
```

---

### 3. เพิ่มฟิลด์ใหม่ 9 ฟิลด์

#### Basic Information (3 ฟิลด์):
1. **course_type** - ประเภทหลักสูตร (บังคับ/เลือก/แนะนำ)
2. **language** - ภาษา (ไทย/อังกฤษ/ทั้งสองภาษา)
3. **duration_minutes** - นาที (0-59)

#### Course Details (4 ฟิลด์):
4. **learning_objectives** - วัตถุประสงค์การเรียนรู้ (array)
5. **prerequisite_knowledge** - ความรู้พื้นฐานที่ต้องมี
6. **target_positions** - ตำแหน่งเป้าหมาย (multiple select)
7. **target_departments** - แผนกเป้าหมาย (multiple select)

#### Course Settings (2 ฟิลด์):
8. **max_attempts** - ทำได้สูงสุด (ครั้ง)
9. **certificate_validity** - อายุใบประกาศนียบัตร (เดือน)

---

### 4. Field Name Mapping (populateForm function)

จับคู่ชื่อฟิลด์ที่แตกต่างกันระหว่าง database และ form:

```javascript
// Max students/enrollments
document.getElementById('max_enrollments').value =
    course.max_enrollments || course.max_students || course.enrollment_limit || '';

// Prerequisite knowledge
document.getElementById('prerequisite_knowledge').value =
    course.prerequisite_knowledge || course.prerequisites_text || course.prerequisites || '';

// Datetime fields
if (course.enrollment_start || course.start_date) {
    const startDate = course.enrollment_start || course.start_date;
    document.getElementById('enrollment_start').value = new Date(startDate).toISOString().slice(0, 16);
}

if (course.enrollment_end || course.end_date) {
    const endDate = course.enrollment_end || course.end_date;
    document.getElementById('enrollment_end').value = new Date(endDate).toISOString().slice(0, 16);
}

// Image
if (course.course_image) {
    document.getElementById('course-image-preview').src = course.course_image;
} else if (course.thumbnail_image || course.thumbnail) {
    document.getElementById('course-image-preview').src = course.thumbnail_image || course.thumbnail;
} else {
    document.getElementById('course-image-preview').src = '/images/default-avatar.png';
}

// Category (no category_id, use category_name)
if (course.category_name || course.category) {
    const categoryName = course.category_name || course.category;
    const categorySelect = document.getElementById('category_id');
    for (let i = 0; i < categorySelect.options.length; i++) {
        if (categorySelect.options[i].textContent === categoryName) {
            categorySelect.options[i].selected = true;
            break;
        }
    }
}
```

---

### 5. Value Mapping

แปลงค่า enum ให้ตรงกับ form options:

```javascript
// Course Type: mandatory → Required
let courseType = course.course_type || 'Required';
if (courseType === 'mandatory') courseType = 'Required';
else if (courseType === 'elective') courseType = 'Elective';
else if (courseType === 'recommended') courseType = 'Recommended';
document.getElementById('course_type').value = courseType;

// Language: th → Thai
let language = course.language || 'Thai';
if (language === 'th') language = 'Thai';
else if (language === 'en') language = 'English';
else if (language === 'both') language = 'Both';
document.getElementById('language').value = language;
```

---

### 6. Learning Objectives Management

เพิ่มฟังก์ชันจัดการวัตถุประสงค์:

```javascript
let objectiveCount = 0;

function addObjective(value = '') {
    objectiveCount++;
    const container = document.getElementById('objectives-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2';
    div.innerHTML = `
        <input type="text" class="objective-input flex-1 rounded-md border-gray-300"
               placeholder="วัตถุประสงค์ข้อที่ ${objectiveCount}"
               value="${value}"
               oninput="updateObjectivesJSON()">
        <button type="button" onclick="removeObjective(this)"
                class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
    updateObjectivesJSON();
}

function removeObjective(button) {
    button.parentElement.remove();
    updateObjectivesJSON();
}

function updateObjectivesJSON() {
    const inputs = document.querySelectorAll('.objective-input');
    const objectives = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(val => val !== '');
    document.getElementById('learning_objectives').value = JSON.stringify(objectives);
}
```

---

### 7. API Endpoints

เพิ่มการโหลด API สำหรับข้อมูลใหม่:

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    courseId = window.location.pathname.split('/')[2];

    // Load all dropdowns in parallel
    await Promise.all([
        loadCategories(),
        loadTargetPositions(),    // ← NEW
        loadTargetDepartments()   // ← NEW
    ]);

    await loadCourseData();
    setupImagePreview();
    setupFormSubmit();
});
```

---

### 8. Permissions

เพิ่ม HR role ให้สามารถแก้ไขได้:

**routes/courseRoutes.js:**
```javascript
router.get('/:course_id/edit',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    courseController.renderEditCourse);
```

**controllers/courseController.js:**
```javascript
if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
    return res.status(403).render('error/403', { ... });
}
```

**routes/userRoutes.js:**
```javascript
router.get('/api/instructors',
    authMiddleware.requireRole(['Admin', 'Instructor', 'HR']),
    userController.getInstructors);
```

---

## 📊 ฟิลด์ทั้งหมดในหน้า Edit

### ข้อมูลพื้นฐาน (8 ฟิลด์):
- ✅ course_name
- ✅ course_code
- ✅ category_id
- ✅ difficulty_level
- ✅ course_type ← เพิ่มใหม่
- ✅ language ← เพิ่มใหม่
- ✅ duration_hours
- ✅ duration_minutes ← เพิ่มใหม่

### รายละเอียดหลักสูตร (4 ฟิลด์):
- ✅ description
- ✅ learning_objectives ← เพิ่มใหม่
- ✅ prerequisite_knowledge ← เพิ่มใหม่
- ✅ target_audience (positions + departments) ← เพิ่มใหม่

### รูปภาพ (1 ฟิลด์):
- ✅ course_image

### การตั้งค่า (7 ฟิลด์):
- ✅ max_enrollments
- ✅ passing_score
- ✅ max_attempts ← เพิ่มใหม่
- ✅ certificate_validity ← เพิ่มใหม่
- ✅ enrollment_start
- ✅ enrollment_end
- ✅ checkboxes (is_mandatory, allow_certificate, is_public)

### สถานะและผู้สอน (3 ฟิลด์):
- ✅ status
- ✅ instructor_id (hidden)
- ✅ instructor_name_display (readonly)

**รวมทั้งหมด:** 23 ฟิลด์

---

## 🔍 Field Mapping Summary

| Form Field | Database Fields (Priority Order) | Status |
|------------|----------------------------------|--------|
| course_name | course_name, title | ✅ Mapped |
| category_id | category_name, category | ✅ Mapped by name |
| max_enrollments | max_enrollments, max_students, enrollment_limit | ✅ Mapped |
| prerequisite_knowledge | prerequisite_knowledge, prerequisites_text, prerequisites | ✅ Mapped |
| enrollment_start | enrollment_start, start_date | ✅ Mapped |
| enrollment_end | enrollment_end, end_date | ✅ Mapped |
| course_image | course_image, thumbnail_image, thumbnail | ✅ Mapped |
| course_type | course_type (with value mapping) | ✅ Mapped |
| language | language (with value mapping) | ✅ Mapped |

---

## 🧪 การทดสอบ

### วิธีที่ 1: ทดสอบด้วย Node.js Script

```bash
node test_edit_page_api.js
```

**ผลที่คาดหวัง:**
- ✅ พบ Course ID 1
- ✅ พบ 16 ฟิลด์
- ✅ Field mapping ทำงานถูกต้อง
- ⚠️  บางฟิลด์อาจเป็น NULL (ถ้าไม่ได้กรอกตอนสร้าง)

### วิธีที่ 2: ทดสอบในเบราว์เซอร์

1. เข้าหน้าแก้ไข: `http://localhost:3000/courses/1/edit`
2. เปิด DevTools Console (F12)
3. Copy และ paste โค้ดจากไฟล์: `test_edit_page_browser.js`
4. กด Enter

**ผลที่คาดหวัง:**
- ✅ ฟิลด์ทั้งหมดแสดงข้อมูลถูกต้อง
- ✅ ไม่มี JavaScript errors
- ✅ Dropdown โหลดข้อมูลสำเร็จ
- ✅ รูปภาพแสดงจากฐานข้อมูล
- ✅ วัตถุประสงค์แสดงเป็นลิสต์

### วิธีที่ 3: ทดสอบการบันทึก

1. แก้ไขข้อมูลในฟอร์ม
2. คลิกปุ่ม "บันทึกการแก้ไข"
3. Refresh หน้า (Ctrl+Shift+R สำหรับ hard refresh)
4. ตรวจสอบว่าข้อมูลที่แก้ยังอยู่

---

## ⚠️ หมายเหตุสำคัญ

### ฟิลด์ที่อาจเป็น NULL:
- passing_score (ถ้าไม่ได้กรอกตอนสร้าง)
- max_attempts (ถ้าไม่ได้กรอกตอนสร้าง)
- certificate_validity (ถ้าไม่ได้กรอกตอนสร้าง)
- instructor_id (อาจเป็น NULL ในบางเคส)

### Checkbox Fields:
- **is_mandatory, allow_certificate, is_public** อาจไม่มีใน database
- จะแสดงเป็น unchecked (false) ถ้าไม่มีข้อมูล
- ไม่กระทบการทำงานของฟอร์ม

### API Endpoints ที่ต้องมี:
- ✅ GET `/courses/api/categories`
- ✅ GET `/courses/api/:course_id`
- ✅ GET `/courses/api/target-positions`
- ✅ GET `/courses/api/target-departments`
- ✅ PUT `/courses/api/:course_id` (สำหรับบันทึก)

---

## 📁 ไฟล์ที่แก้ไข

1. **views/courses/edit.ejs** - หน้าแก้ไขหลักสูตร (แก้ไขหลายจุด)
2. **routes/courseRoutes.js** - เพิ่ม HR role (4 routes)
3. **routes/userRoutes.js** - เพิ่ม HR role (1 route)
4. **controllers/courseController.js** - เพิ่ม HR role check (line 633)
5. **views/courses/detail.ejs** - เพิ่มปุ่มแก้ไข สำหรับ HR

---

## ✅ สรุปสุดท้าย

**สถานะ:** ✅ **เสร็จสมบูรณ์และพร้อมใช้งาน**

**การแก้ไขครอบคลุม:**
- ✅ แก้ bug ทั้งหมดที่รายงาน
- ✅ เพิ่มฟิลด์ที่ขาดหาย 9 ฟิลด์
- ✅ จับคู่ชื่อฟิลด์ระหว่าง database และ form
- ✅ แปลงค่า enum ให้ถูกต้อง
- ✅ รองรับหลายชื่อฟิลด์ (fallback)
- ✅ เพิ่ม permission สำหรับ HR
- ✅ เปลี่ยน instructor เป็น readonly
- ✅ แก้ไขการแสดงรูปภาพ

**ทดสอบแล้ว:**
- ✅ Server รันสำเร็จ
- ✅ หน้าแก้ไขเปิดได้ (200 OK)
- ✅ API endpoints ทำงานถูกต้อง
- ✅ Field mapping ตรวจสอบแล้ว

**ขั้นตอนต่อไป:**
1. ทดสอบในเบราว์เซอร์ด้วยสายตา
2. ทดสอบแก้ไขและบันทึกข้อมูล
3. ตรวจสอบว่าข้อมูลบันทึกถูกต้อง

---

**Updated:** 17 พฤศจิกายน 2025
**By:** Claude Code
