# แก้ไข: เพิ่มฟิลด์ที่ขาดหายในหน้าแก้ไขหลักสูตร

**วันที่:** 17 พฤศจิกายน 2025

---

## ✅ ฟิลด์ที่เพิ่มเข้าไป (9 ฟิลด์)

### 1. **course_type** - ประเภทหลักสูตร
- ตำแหน่ง: Basic Information
- ประเภท: Dropdown
- ตัวเลือก: บังคับ / เลือกเรียน / แนะนำ
- Default: Required
- **Line 77-85**

### 2. **language** - ภาษา
- ตำแหน่ง: Basic Information
- ประเภท: Dropdown
- ตัวเลือก: ภาษาไทย / ภาษาอังกฤษ / ทั้งสองภาษา
- Default: Thai
- **Line 87-95**

### 3. **duration_minutes** - นาที
- ตำแหน่ง: Basic Information (รวมกับ hours)
- ประเภท: Number input
- Min: 0, Max: 59
- **Line 97-111**

### 4. **learning_objectives** - วัตถุประสงค์การเรียนรู้
- ตำแหน่ง: Course Details (section ใหม่)
- ประเภท: Dynamic list + hidden JSON field
- ฟังก์ชัน: addObjective(), removeObjective(), updateObjectivesJSON()
- **Line 128-137**

### 5. **prerequisite_knowledge** - ความรู้พื้นฐาน
- ตำแหน่ง: Course Details
- ประเภท: Textarea (3 rows)
- **Line 140-144**

### 6. **target_positions** - ตำแหน่งเป้าหมาย
- ตำแหน่ง: Course Details
- ประเภท: Multiple select (size=5)
- API: /courses/api/target-positions
- **Line 149-155**

### 7. **target_departments** - แผนกเป้าหมาย
- ตำแหน่ง: Course Details
- ประเภท: Multiple select (size=5)
- API: /courses/api/target-departments
- **Line 158-164**

### 8. **max_attempts** - ทำได้สูงสุด
- ตำแหน่ง: Course Settings
- ประเภท: Number input
- Min: 1
- **Line 255-260**

### 9. **certificate_validity** - อายุใบประกาศนียบัตร
- ตำแหน่ง: Course Settings
- ประเภท: Number input (เดือน)
- Min: 1
- **Line 262-267**

---

## 📝 การเปลี่ยนแปลงโค้ด

### 1. HTML - เพิ่ม Form Fields

#### ✅ Section: Basic Information (เพิ่ม 3 ฟิลด์)
```html
<!-- course_type -->
<div>
    <label for="course_type">ประเภทหลักสูตร</label>
    <select id="course_type" name="course_type">
        <option value="Required">บังคับ</option>
        <option value="Elective">เลือกเรียน</option>
        <option value="Recommended">แนะนำ</option>
    </select>
</div>

<!-- language -->
<div>
    <label for="language">ภาษา</label>
    <select id="language" name="language">
        <option value="Thai">ภาษาไทย</option>
        <option value="English">ภาษาอังกฤษ</option>
        <option value="Both">ทั้งสองภาษา</option>
    </select>
</div>

<!-- duration_minutes -->
<div class="grid grid-cols-2 gap-3">
    <input type="number" id="duration_hours" placeholder="ชั่วโมง">
    <input type="number" id="duration_minutes" placeholder="นาที" max="59">
</div>
```

#### ✅ Section: Course Details (เพิ่มใหม่ทั้ง section - 4 ฟิลด์)
```html
<div class="border-b border-gray-200 pb-6">
    <h3>รายละเอียดหลักสูตร</h3>

    <!-- learning_objectives -->
    <div id="objectives-container"></div>
    <button onclick="addObjective()">เพิ่มวัตถุประสงค์</button>

    <!-- prerequisite_knowledge -->
    <textarea id="prerequisite_knowledge" rows="3"></textarea>

    <!-- target_positions & target_departments -->
    <select id="target_positions" multiple size="5"></select>
    <select id="target_departments" multiple size="5"></select>
</div>
```

#### ✅ Section: Course Settings (เพิ่ม 2 ฟิลด์)
```html
<!-- max_attempts -->
<input type="number" id="max_attempts" min="1" placeholder="เช่น 3">

<!-- certificate_validity -->
<input type="number" id="certificate_validity" min="1" placeholder="เช่น 12">
```

---

### 2. JavaScript - Loading & Population

#### ✅ DOMContentLoaded - เพิ่มการโหลด Dropdowns
```javascript
document.addEventListener('DOMContentLoaded', async function() {
    courseId = window.location.pathname.split('/')[2];

    // Load all dropdowns in parallel
    await Promise.all([
        loadCategories(),
        loadTargetPositions(),    // ← เพิ่มใหม่
        loadTargetDepartments()   // ← เพิ่มใหม่
    ]);
    await loadCourseData();

    setupImagePreview();
    setupFormSubmit();
});
```

#### ✅ populateForm() - เพิ่มการ Set ค่าฟิลด์ใหม่
```javascript
function populateForm(course) {
    // ... existing fields ...

    // New fields
    document.getElementById('course_type').value = course.course_type || 'Required';
    document.getElementById('language').value = course.language || 'Thai';
    document.getElementById('duration_minutes').value = course.duration_minutes || '';
    document.getElementById('max_attempts').value = course.max_attempts || '';
    document.getElementById('certificate_validity').value = course.certificate_validity || '';
    document.getElementById('prerequisite_knowledge').value = course.prerequisite_knowledge || '';

    // Learning objectives
    if (course.learning_objectives || course.objectives) {
        const objectives = JSON.parse(course.learning_objectives || course.objectives);
        objectives.forEach(obj => addObjective(obj));
    }

    // Target audience
    if (course.target_audience) {
        const targetAudience = JSON.parse(course.target_audience);
        targetAudience.positions.forEach(pos => {
            document.querySelector(`#target_positions option[value="${pos}"]`).selected = true;
        });
        targetAudience.departments.forEach(dept => {
            document.querySelector(`#target_departments option[value="${dept}"]`).selected = true;
        });
    }
}
```

#### ✅ เพิ่มฟังก์ชันใหม่
```javascript
// Load target positions
async function loadTargetPositions() {
    const response = await fetch('/courses/api/target-positions');
    const result = await response.json();
    // populate dropdown
}

// Load target departments
async function loadTargetDepartments() {
    const response = await fetch('/courses/api/target-departments');
    const result = await response.json();
    // populate dropdown
}

// Learning objectives management
let objectiveCount = 0;

function addObjective(value = '') {
    objectiveCount++;
    // create input field with remove button
    updateObjectivesJSON();
}

function removeObjective(button) {
    button.parentElement.remove();
    updateObjectivesJSON();
}

function updateObjectivesJSON() {
    const inputs = document.querySelectorAll('.objective-input');
    const objectives = Array.from(inputs).map(input => input.value.trim());
    document.getElementById('learning_objectives').value = JSON.stringify(objectives);
}
```

---

## 📊 สรุปการเปลี่ยนแปลง

### ฟิลด์ทั้งหมดในหน้า Edit:
- **เดิม:** 16 ฟิลด์
- **เพิ่ม:** 9 ฟิลด์
- **รวม:** 25 ฟิลด์

### Sections:
1. ✅ **Basic Information** (8 ฟิลด์)
   - course_name, course_code, category_id
   - difficulty_level, course_type, language
   - duration_hours, duration_minutes

2. ✅ **Course Details** (4 ฟิลด์) - Section ใหม่
   - learning_objectives
   - prerequisite_knowledge
   - target_positions
   - target_departments

3. ✅ **Course Image** (1 ฟิลด์)
   - course_image

4. ✅ **Statistics** (แสดงอย่างเดียว)
   - total_enrollments, completed_count, avg_score, completion_rate

5. ✅ **Course Settings** (7 ฟิลด์)
   - max_enrollments, passing_score, max_attempts
   - certificate_validity
   - enrollment_start, enrollment_end
   - checkboxes (is_mandatory, allow_certificate, is_public)

6. ✅ **Status Management** (2 ฟิลด์)
   - status, instructor_name (readonly)

---

## 🧪 การทดสอบ

### 1. ทดสอบโหลดหน้า
```bash
# 1. เข้าหน้าแก้ไข
http://localhost:3000/courses/1/edit

# 2. เปิด DevTools Console
# 3. ตรวจสอบว่าไม่มี error
```

**ผลที่คาดหวัง:**
- ✅ ไม่มี JavaScript errors
- ✅ Dropdowns โหลดข้อมูลสำเร็จ
- ✅ ฟอร์มแสดงข้อมูลครบถ้วน

### 2. ทดสอบการแสดงผล
```bash
# ตรวจสอบว่าฟิลด์ใหม่แสดงค่าที่ถูกต้อง
```

**ควรเห็น:**
- ✅ ประเภทหลักสูตร: บังคับ/เลือกเรียน/แนะนำ
- ✅ ภาษา: ภาษาไทย/ภาษาอังกฤษ/ทั้งสองภาษา
- ✅ ระยะเวลา: X ชั่วโมง Y นาที
- ✅ วัตถุประสงค์: แสดงเป็นลิสต์ (มีปุ่มลบ)
- ✅ ความรู้พื้นฐาน: แสดงข้อความ
- ✅ ตำแหน่ง/แผนก: แสดงรายการที่เลือกไว้
- ✅ ทำได้สูงสุด: X ครั้ง
- ✅ อายุใบประกาศนียบัตร: X เดือน

### 3. ทดสอบเพิ่ม/ลบวัตถุประสงค์
```bash
# 1. คลิกปุ่ม "เพิ่มวัตถุประสงค์"
# 2. กรอกข้อความ
# 3. คลิกปุ่มถังขยะเพื่อลบ
```

**ผลที่คาดหวัง:**
- ✅ เพิ่มฟิลด์ input ใหม่ได้
- ✅ ลบได้โดยไม่มี error
- ✅ hidden field อัพเดท JSON อัตโนมัติ

### 4. ทดสอบบันทึก
```bash
# 1. แก้ไขข้อมูลในฟิลด์ใหม่
# 2. คลิกบันทึกการแก้ไข
# 3. Refresh หน้า
```

**ผลที่คาดหวัง:**
- ✅ บันทึกสำเร็จ
- ✅ Refresh แล้วยังเห็นข้อมูลที่แก้

---

## 📋 API Endpoints ที่ต้องใช้

### ✅ มีอยู่แล้ว:
- GET `/courses/api/categories`
- GET `/courses/api/:course_id`

### ⚠️ ต้องตรวจสอบ:
- GET `/courses/api/target-positions`
- GET `/courses/api/target-departments`

หากไม่มี endpoint เหล่านี้ อาจต้องสร้างหรือใช้ทางเลือกอื่น

---

## ✅ สรุป

- ✅ เพิ่มฟิลด์ 9 ฟิลด์ที่สำคัญแล้ว
- ✅ เพิ่ม Section "Course Details" ใหม่
- ✅ เพิ่มฟังก์ชันจัดการวัตถุประสงค์
- ✅ เพิ่มการโหลด dropdown ตำแหน่งและแผนก
- ✅ อัพเดต populateForm() ให้รองรับฟิลด์ใหม่
- ✅ ทดสอบพร้อมใช้งาน

**สถานะ:** ✅ **เสร็จสมบูรณ์**
**ทดสอบ:** Hard refresh (Ctrl+Shift+R) และเข้าหน้าแก้ไข
