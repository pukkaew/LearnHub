# แก้ไข: หน้าแก้ไขหลักสูตรแสดงข้อมูลไม่ตรง

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 ปัญหา

**หน้าแก้ไขหลักสูตร แสดงข้อมูลไม่ตรง**

### อาการ:
1. ❌ **หมวดหมู่ (Category)** ไม่แสดงค่าที่เลือกไว้
2. ❌ **ผู้สอน (Instructor)** ไม่แสดงค่าที่เลือกไว้
3. ❌ **เกณฑ์ผ่าน (Passing Score)** แสดงค่า default 70 แม้ว่าจะไม่ได้กรอก
4. ❌ **HR role ไม่สามารถเข้าหน้าแก้ไขได้** (controller ยังไม่เพิ่ม HR)

### ที่มาของปัญหา:

#### 1. Timing Issue - โหลดข้อมูลไม่เป็นลำดับ
**ไฟล์:** `views/courses/edit.ejs` (line 286-293)

**เดิม:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
    courseId = window.location.pathname.split('/')[3];
    loadCourseData();      // ← โหลดพร้อมกัน
    loadCategories();      // ← โหลดพร้อมกัน
    loadInstructors();     // ← โหลดพร้อมกัน
    setupImagePreview();
    setupFormSubmit();
});
```

**ปัญหา:**
- `loadCourseData()` เรียก `populateForm()` ทันทีที่ได้ข้อมูล
- แต่ `loadCategories()` และ `loadInstructors()` อาจยังโหลดไม่เสร็จ
- ทำให้ dropdown ยังไม่มี options และไม่สามารถ set ค่าได้

#### 2. Missing Code - ไม่มีการ set ค่า category_id และ instructor_id
**ไฟล์:** `views/courses/edit.ejs` (line 313-349)

**เดิม:**
```javascript
function populateForm(course) {
    document.getElementById('course_id').value = course.course_id;
    document.getElementById('course_name').value = course.course_name || '';
    // ... ฟิลด์อื่นๆ
    document.getElementById('passing_score').value = course.passing_score || 70; // ← default value

    // ❌ ไม่มีการ set category_id
    // ❌ ไม่มีการ set instructor_id
}
```

#### 3. Controller ไม่รองรับ HR role
**ไฟล์:** `controllers/courseController.js` (line 633)

**เดิม:**
```javascript
if (!['Admin', 'Instructor'].includes(userRole)) {
    return res.status(403).render('error/403', {
        title: 'ไม่มีสิทธิ์เข้าถึง - Rukchai Hongyen LearnHub',
        message: 'คุณไม่มีสิทธิ์แก้ไขหลักสูตร',
        user: req.session.user
    });
}
```

---

## ✅ การแก้ไข

### 1. แก้ไขลำดับการโหลดข้อมูล

**ไฟล์:** `views/courses/edit.ejs` (line 286-295)

**ใหม่:**
```javascript
document.addEventListener('DOMContentLoaded', async function() {
    courseId = window.location.pathname.split('/')[3];

    // Load dropdown data first, then load course data
    await Promise.all([loadCategories(), loadInstructors()]);
    await loadCourseData();

    setupImagePreview();
    setupFormSubmit();
});
```

**การเปลี่ยนแปลง:**
- ✅ เปลี่ยน function เป็น `async`
- ✅ ใช้ `await Promise.all()` เพื่อรอให้ categories และ instructors โหลดเสร็จก่อน
- ✅ จากนั้นค่อยโหลด course data และ populate form
- ✅ รับประกันว่า dropdown จะมีข้อมูลก่อนที่จะ set ค่า

---

### 2. เพิ่มการ set ค่า category_id และ instructor_id

**ไฟล์:** `views/courses/edit.ejs` (line 315-359)

**เพิ่มโค้ด:**
```javascript
function populateForm(course) {
    document.getElementById('course_id').value = course.course_id;
    document.getElementById('course_name').value = course.course_name || '';
    document.getElementById('course_code').value = course.course_code || '';
    document.getElementById('description').value = course.description || '';
    document.getElementById('difficulty_level').value = course.difficulty_level || 'Beginner';
    document.getElementById('duration_hours').value = course.duration_hours || '';
    document.getElementById('max_enrollments').value = course.max_enrollments || '';
    document.getElementById('passing_score').value = course.passing_score || ''; // ← เปลี่ยนจาก 70 เป็น ''
    document.getElementById('status').value = course.status || 'Draft';

    // Set category and instructor (เพิ่มใหม่)
    if (course.category_id) {
        document.getElementById('category_id').value = course.category_id;
    }
    if (course.instructor_id) {
        document.getElementById('instructor_id').value = course.instructor_id;
    }

    // ... ส่วนที่เหลือเหมือนเดิม
}
```

**การเปลี่ยนแปลง:**
- ✅ เพิ่มการ set `category_id` จากข้อมูล course
- ✅ เพิ่มการ set `instructor_id` จากข้อมูล course
- ✅ เปลี่ยน default value ของ `passing_score` จาก `70` เป็น `''` (ว่าง)
- ✅ ใช้ `if` check ป้องกัน error กรณีไม่มีค่า

---

### 3. เพิ่ม HR role ใน controller

**ไฟล์:** `controllers/courseController.js` (line 633)

**เดิม:**
```javascript
if (!['Admin', 'Instructor'].includes(userRole)) {
```

**ใหม่:**
```javascript
if (!['Admin', 'Instructor', 'HR'].includes(userRole)) {
```

**การเปลี่ยนแปลง:**
- ✅ เพิ่ม `'HR'` role ให้สามารถเข้าหน้าแก้ไขได้
- ✅ สอดคล้องกับ routes ที่เพิ่ม HR ไว้แล้ว

---

## 📊 ผลลัพธ์

### ก่อนแก้ไข ❌

```
หน้าแก้ไขหลักสูตร
┌─────────────────────────────┐
│ ชื่อหลักสูตร: การเรียน JS   │
│ รหัส: JS001                 │
│ หมวดหมู่: [เลือกหมวดหมู่]   │ ← ไม่แสดงค่าที่เลือกไว้
│ ผู้สอน: [เลือกผู้สอน]       │ ← ไม่แสดงค่าที่เลือกไว้
│ เกณฑ์ผ่าน: 70%              │ ← แสดง 70 แม้ว่าไม่ได้กรอก
└─────────────────────────────┘
```

### หลังแก้ไข ✅

```
หน้าแก้ไขหลักสูตร
┌─────────────────────────────┐
│ ชื่อหลักสูตร: การเรียน JS   │
│ รหัส: JS001                 │
│ หมวดหมู่: [Programming]     │ ✅ แสดงค่าที่เลือกไว้
│ ผู้สอน: [สมชาย ใจดี]        │ ✅ แสดงค่าที่เลือกไว้
│ เกณฑ์ผ่าน:                  │ ✅ ว่างถ้าไม่ได้กรอก
└─────────────────────────────┘
```

---

## 🧪 วิธีทดสอบ

### 1. ทดสอบการแสดงข้อมูล

```bash
# 1. สร้างหลักสูตรใหม่พร้อมข้อมูลครบถ้วน
# 2. ไปที่หน้ารายการหลักสูตร
# 3. คลิกปุ่ม "แก้ไขคอร์ส"
```

**ผลที่คาดหวัง:**
- ✅ ฟอร์มแสดงข้อมูลครบถ้วนทุกฟิลด์
- ✅ Dropdown หมวดหมู่แสดงค่าที่เลือกไว้
- ✅ Dropdown ผู้สอนแสดงค่าที่เลือกไว้
- ✅ เกณฑ์ผ่านแสดงค่าที่กรอกไว้ (หรือว่างถ้าไม่ได้กรอก)
- ✅ วันเวลาเปิด-ปิดลงทะเบียนแสดงครบทั้งวันและเวลา

### 2. ทดสอบกรณีไม่มีข้อมูล

```bash
# 1. สร้างหลักสูตรแบบไม่กรอกข้อมูลบางฟิลด์
# 2. บันทึกหลักสูตร
# 3. กลับมาแก้ไขอีกครั้ง
```

**ผลที่คาดหวัง:**
- ✅ ฟิลด์ที่ไม่ได้กรอกจะว่าง (ไม่มีค่า default)
- ✅ Dropdown ที่ไม่ได้เลือกจะแสดง "เลือก..."

### 3. ทดสอบ HR role

```bash
# 1. Login ด้วย user ที่มี role = 'HR'
# 2. ไปที่หน้าคอร์สและคลิก "แก้ไขคอร์ส"
```

**ผลที่คาดหวัง:**
- ✅ HR สามารถเข้าหน้าแก้ไขได้
- ✅ ไม่เห็น error 403

---

## 📁 ไฟล์ที่แก้ไข

### 1. `controllers/courseController.js`
- **Line 633:** เพิ่ม `'HR'` role ในการเช็คสิทธิ์

### 2. `views/courses/edit.ejs`
- **Line 286-295:** แก้ไข `DOMContentLoaded` ให้โหลดข้อมูลเป็นลำดับ
- **Line 323:** เปลี่ยน default value ของ `passing_score` จาก `70` เป็น `''`
- **Line 326-332:** เพิ่มการ set ค่า `category_id` และ `instructor_id`

---

## 🔄 Flow การโหลดข้อมูล

### ก่อนแก้ไข:
```
DOMContentLoaded
├─ loadCourseData() ──────┐
├─ loadCategories()       │ (async พร้อมกัน)
└─ loadInstructors()      │
                          │
                          ├─ populateForm() ← categories/instructors ยังไม่เสร็จ!
                          └─ ❌ dropdown ว่างเปล่า
```

### หลังแก้ไข:
```
DOMContentLoaded
├─ await Promise.all([
│    loadCategories(),
│    loadInstructors()
│  ])
│  ↓ (รอให้เสร็จก่อน)
├─ await loadCourseData()
│  ├─ populateForm() ← categories/instructors โหลดเสร็จแล้ว
│  └─ ✅ set ค่า dropdown ได้ถูกต้อง
└─ setupImagePreview()
```

---

## 📝 หมายเหตุ

### ข้อดีของการแก้ไข:

1. **ข้อมูลถูกต้อง:** dropdown แสดงค่าที่เลือกไว้
2. **ไม่มี default value ที่ไม่ต้องการ:** passing_score ว่างถ้าไม่ได้กรอก
3. **HR สามารถแก้ไขได้:** เพิ่มสิทธิ์ให้ HR role
4. **Loading sequence ที่ถูกต้อง:** ข้อมูล dropdown โหลดก่อนเสมอ

### ฟิลด์ทั้งหมดที่ต้อง populate:

#### ข้อมูลพื้นฐาน:
- ✅ `course_name` - ชื่อหลักสูตร
- ✅ `course_code` - รหัสหลักสูตร
- ✅ `category_id` - หมวดหมู่ (dropdown)
- ✅ `difficulty_level` - ระดับความยาก
- ✅ `duration_hours` - ระยะเวลา
- ✅ `description` - คำอธิบาย

#### การตั้งค่า:
- ✅ `max_enrollments` - จำนวนผู้เรียนสูงสุด
- ✅ `passing_score` - เกณฑ์ผ่าน
- ✅ `enrollment_start` - วันเวลาเปิดลงทะเบียน
- ✅ `enrollment_end` - วันเวลาปิดลงทะเบียน
- ✅ `is_mandatory` - หลักสูตรบังคับ (checkbox)
- ✅ `allow_certificate` - ออกใบประกาศนียบัตร (checkbox)
- ✅ `is_public` - เปิดให้ลงทะเบียน (checkbox)

#### การจัดการ:
- ✅ `status` - สถานะหลักสูตร
- ✅ `instructor_id` - ผู้สอน (dropdown)
- ✅ `course_image` - รูปภาพหลักสูตร

---

## ✅ สรุป

- ✅ แก้ไขลำดับการโหลดข้อมูลให้ dropdown มีข้อมูลก่อน populate form
- ✅ เพิ่มการ set ค่า category_id และ instructor_id
- ✅ เปลี่ยน default value ของ passing_score จาก 70 เป็นว่าง
- ✅ เพิ่ม HR role ให้เข้าหน้าแก้ไขได้
- ✅ ทุกฟิลด์แสดงข้อมูลตรงกับที่บันทึกไว้

**สถานะ:** ✅ **เสร็จสมบูรณ์**
**ทดสอบ:** พร้อมใช้งาน - ลองสร้างและแก้ไขหลักสูตร ตรวจสอบว่าข้อมูลแสดงครบถ้วนและถูกต้อง
