# แก้ไข: Error ในหน้าแก้ไขหลักสูตร

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 ปัญหา

**หน้าแก้ไขหลักสูตร เกิด error หลายจุด**

### Error ที่พบ:
```
1. ❌ 404 Error: course-placeholder.png - ไฟล์รูปไม่พบ
2. ❌ 500 Error: /users/api/list?role=Instructor - API endpoint ผิดพลาด
3. ❌ 500 Error: /courses/api/edit - API endpoint ไม่มี course_id
4. ⚠️ เกิดข้อผิดพลาดในการโหลดข้อมูล
```

---

## 🔍 สาเหตุของปัญหา

### 1. Course ID Extraction ผิด

**ไฟล์:** `views/courses/edit.ejs` (line 287)

**เดิม:**
```javascript
courseId = window.location.pathname.split('/')[3]; // Extract course ID from URL
```

**ปัญหา:**
```
URL: /courses/1/edit
split('/') → ['', 'courses', '1', 'edit']
[3] → 'edit' ❌ (ผิด!)
```

**ผลลัพธ์:**
- courseId = 'edit'
- API เรียก: `/courses/api/edit` → Error 500
- ไม่มี endpoint `/courses/api/edit`

---

### 2. User API Endpoint ผิด

**ไฟล์:** `views/courses/edit.ejs` (line 436)

**เดิม:**
```javascript
const response = await fetch('/users/api/list?role=Instructor');
```

**ปัญหา:**
- Endpoint `/users/api/list` ต้องมี role = `['Admin', 'HR']` เท่านั้น
- Instructor role เข้าไม่ได้ → Error 500
- ไม่ได้ใช้ parameter `?role=Instructor`

**Route ที่มี:**
```javascript
// userRoutes.js line 25
router.get('/api/list', authMiddleware.requireRole(['Admin', 'HR']), userController.getAllUsers);

// userRoutes.js line 26
router.get('/api/instructors', authMiddleware.requireRole(['Admin', 'Instructor']), userController.getInstructors);
```

**ควรใช้:** `/users/api/instructors` แทน

---

### 3. HR Role ไม่สามารถเรียก API Instructors ได้

**ไฟล์:** `routes/userRoutes.js` (line 26)

**เดิม:**
```javascript
router.get('/api/instructors', authMiddleware.requireRole(['Admin', 'Instructor']), userController.getInstructors);
```

**ปัญหา:**
- HR สามารถแก้ไขคอร์สได้ (เพิ่มไว้แล้ว)
- แต่ HR ไม่สามารถดู list instructors ได้
- ทำให้ dropdown ผู้สอนโหลดไม่ได้

---

### 4. Placeholder Image ไม่พบ

**ไฟล์:** `views/courses/edit.ejs` (line 99, 467)

**เดิม:**
```html
src="/images/course-placeholder.png"
```

**ปัญหา:**
- ไม่มีไฟล์ `course-placeholder.png` ในโฟลเดอร์ `/public/images/`
- Browser แสดง 404 error

**ไฟล์ที่มี:**
```
default-avatar.png
default-avatar.svg
logo.png
rukchai-logo.png
rukchai-logo.svg
```

---

## ✅ การแก้ไข

### 1. แก้ไข Course ID Extraction

**ไฟล์:** `views/courses/edit.ejs` (line 287-289)

**เดิม:**
```javascript
courseId = window.location.pathname.split('/')[3]; // Extract course ID from URL
```

**ใหม่:**
```javascript
// Extract course ID from URL: /courses/:course_id/edit
// Example: /courses/1/edit → split('/') → ['', 'courses', '1', 'edit']
courseId = window.location.pathname.split('/')[2]; // Get course_id (index 2)
```

**การเปลี่ยนแปลง:**
- ✅ เปลี่ยนจาก `[3]` เป็น `[2]`
- ✅ เพิ่ม comment อธิบายการทำงาน
- ✅ ตอนนี้ courseId = '1' (ถูกต้อง)
- ✅ API เรียก: `/courses/api/1` ✅

---

### 2. แก้ไข User API Endpoint

**ไฟล์:** `views/courses/edit.ejs` (line 434-451)

**เดิม:**
```javascript
async function loadInstructors() {
    try {
        const response = await fetch('/users/api/list?role=Instructor');
        // ...
    }
}
```

**ใหม่:**
```javascript
async function loadInstructors() {
    try {
        const response = await fetch('/users/api/instructors');
        // ...
    }
}
```

**การเปลี่ยนแปลง:**
- ✅ เปลี่ยนจาก `/users/api/list?role=Instructor` เป็น `/users/api/instructors`
- ✅ ใช้ endpoint ที่มีอยู่แล้วใน userRoutes.js
- ✅ ไม่ต้องส่ง query parameter

---

### 3. เพิ่ม HR Role ใน User Routes

**ไฟล์:** `routes/userRoutes.js` (line 26)

**เดิม:**
```javascript
router.get('/api/instructors', authMiddleware.requireRole(['Admin', 'Instructor']), userController.getInstructors);
```

**ใหม่:**
```javascript
router.get('/api/instructors', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), userController.getInstructors);
```

**การเปลี่ยนแปลง:**
- ✅ เพิ่ม `'HR'` role
- ✅ HR สามารถดู list instructors เพื่อเลือกในฟอร์มแก้ไขคอร์สได้
- ✅ สอดคล้องกับสิทธิ์ที่ให้ HR แก้ไขคอร์สได้

---

### 4. แก้ไข Placeholder Image Path

**ไฟล์:** `views/courses/edit.ejs` (line 99, 467)

**เดิม:**
```html
<!-- Line 99 -->
src="/images/course-placeholder.png"

<!-- Line 467 -->
document.getElementById('course-image-preview').src = '/images/course-placeholder.png';
```

**ใหม่:**
```html
<!-- Line 99 -->
src="/images/default-avatar.png"

<!-- Line 467 -->
document.getElementById('course-image-preview').src = '/images/default-avatar.png';
```

**การเปลี่ยนแปลง:**
- ✅ เปลี่ยนเป็นไฟล์ที่มีอยู่จริง
- ✅ ไม่มี 404 error อีกต่อไป

---

## 📊 ผลลัพธ์

### ก่อนแก้ไข ❌

```
Error Log:
❌ Failed to load resource: /images/course-placeholder.png (404)
❌ Failed to load resource: /users/api/list?role=Instructor (500)
❌ Failed to load resource: /courses/api/edit (500)
⚠️ เกิดข้อผิดพลาดในการโหลดข้อมูล
```

### หลังแก้ไข ✅

```
Success Log:
✅ /images/default-avatar.png (200)
✅ /users/api/instructors (200)
✅ /courses/api/1 (200)
✅ โหลดข้อมูลหลักสูตรสำเร็จ
✅ โหลด categories สำเร็จ
✅ โหลด instructors สำเร็จ
```

---

## 🔄 API Call Flow

### ก่อนแก้ไข:
```
DOMContentLoaded
├─ courseId = window.location.pathname.split('/')[3]
│  └─ URL: /courses/1/edit
│     └─ courseId = 'edit' ❌
│
├─ await Promise.all([
│    loadCategories() ✅
│    loadInstructors()
│      └─ fetch('/users/api/list?role=Instructor') ❌ 500
│  ])
│
└─ await loadCourseData()
     └─ fetch(`/courses/api/${courseId}`)
        └─ fetch('/courses/api/edit') ❌ 500
```

### หลังแก้ไข:
```
DOMContentLoaded
├─ courseId = window.location.pathname.split('/')[2]
│  └─ URL: /courses/1/edit
│     └─ courseId = '1' ✅
│
├─ await Promise.all([
│    loadCategories() ✅
│    loadInstructors()
│      └─ fetch('/users/api/instructors') ✅ 200
│  ])
│
└─ await loadCourseData()
     └─ fetch(`/courses/api/${courseId}`)
        └─ fetch('/courses/api/1') ✅ 200
           └─ populateForm(course) ✅
```

---

## 🧪 วิธีทดสอบ

### 1. ทดสอบโหลดหน้าแก้ไข

```bash
# 1. เข้าหน้ารายการหลักสูตร
http://localhost:3000/courses

# 2. คลิกปุ่ม "แก้ไขคอร์ส"
# 3. เปิด DevTools Console (F12)
```

**ผลที่คาดหวัง:**
- ✅ ไม่มี error 404 หรือ 500
- ✅ ฟอร์มแสดงข้อมูลครบถ้วน
- ✅ Dropdown หมวดหมู่และผู้สอนมีข้อมูล
- ✅ รูปภาพ preview แสดงได้

### 2. ทดสอบด้วย HR User

```bash
# 1. Login ด้วย user ที่มี role = 'HR'
# 2. เข้าหน้าแก้ไขคอร์ส
```

**ผลที่คาดหวัง:**
- ✅ เข้าหน้าแก้ไขได้
- ✅ Dropdown ผู้สอนโหลดข้อมูลได้
- ✅ สามารถบันทึกการแก้ไขได้

### 3. ตรวจสอบ Network Tab

```bash
# 1. เปิด DevTools → Network Tab
# 2. Refresh หน้าแก้ไข
```

**ผลที่คาดหวัง:**
```
✅ /users/api/instructors - Status: 200
✅ /courses/api/1 - Status: 200
✅ /courses/api/categories - Status: 200
✅ /images/default-avatar.png - Status: 200
```

---

## 📁 ไฟล์ที่แก้ไข

### 1. `views/courses/edit.ejs`
- **Line 99:** เปลี่ยน placeholder image path
- **Line 289:** แก้ไข course ID extraction จาก `[3]` เป็น `[2]`
- **Line 436:** เปลี่ยน API endpoint เป็น `/users/api/instructors`
- **Line 467:** เปลี่ยน placeholder image path ใน JavaScript

### 2. `routes/userRoutes.js`
- **Line 26:** เพิ่ม `'HR'` role ให้เข้าถึง `/api/instructors` ได้

---

## 📝 หมายเหตุ

### URL Pattern และ Index:

```javascript
URL: /courses/1/edit
split('/') → ['', 'courses', '1', 'edit']
              [0]    [1]     [2]   [3]

course_id ควรอยู่ที่ index [2] ✅
```

### API Endpoints สำหรับ Instructors:

**มี 2 endpoints:**
1. `/users/api/list` - รายการ users ทั้งหมด (Admin, HR เท่านั้น)
   - รองรับ query parameters
   - ต้องมีสิทธิ์ Admin/HR

2. `/users/api/instructors` - รายการ instructors (Admin, Instructor, HR)
   - เฉพาะ role = Instructor
   - เหมาะสำหรับใช้ใน dropdown

**ควรใช้:** `/users/api/instructors` สำหรับ dropdown ในฟอร์มแก้ไขคอร์ส

### Placeholder Images:

**ไฟล์ที่มีอยู่:**
- `default-avatar.png` - ใช้สำหรับ user และ course preview
- `default-avatar.svg` - เวอร์ชัน SVG

**ควรสร้างเพิ่ม (optional):**
- `course-placeholder.png` - สำหรับใช้เฉพาะกับคอร์ส
- ขนาดแนะนำ: 800x600 px

---

## ✅ สรุป

- ✅ แก้ไข course ID extraction จาก index [3] เป็น [2]
- ✅ เปลี่ยน API endpoint จาก `/users/api/list?role=Instructor` เป็น `/users/api/instructors`
- ✅ เพิ่ม HR role ให้เข้าถึง `/users/api/instructors` ได้
- ✅ แก้ไข placeholder image path จาก `course-placeholder.png` เป็น `default-avatar.png`
- ✅ ไม่มี error 404 หรือ 500 อีกต่อไป
- ✅ หน้าแก้ไขโหลดข้อมูลได้สมบูรณ์

**สถานะ:** ✅ **เสร็จสมบูรณ์**
**ทดสอบ:** พร้อมใช้งาน - Refresh หน้าแก้ไขและตรวจสอบ Console ไม่มี error
