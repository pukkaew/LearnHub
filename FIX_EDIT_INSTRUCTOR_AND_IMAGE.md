# แก้ไข: ผู้สอนและรูปภาพในหน้าแก้ไขหลักสูตร

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 ปัญหา

**ผู้ใช้รายงาน:**
1. ❌ **รูปภาพหลักสูตร ควรไปดึงของเก่ามา**
2. ❌ **หลายๆอย่างไปดึงของเดิมมาสิ**
3. ❌ **ผู้สอนไม่ใช่ช่องแบบตัวเลือก**

---

## 🔍 สาเหตุของปัญหา

### 1. รูปภาพไม่แสดงจากฐานข้อมูล

**ไฟล์:** `views/courses/edit.ejs` (line 354-356)

**เดิม:**
```javascript
// Set course image
if (course.course_image) {
    document.getElementById('course-image-preview').src = course.course_image;
    document.getElementById('remove-image').classList.remove('hidden');
}
```

**ปัญหา:**
- เช็คแค่ `course.course_image` แต่บางคอร์สอาจใช้ `thumbnail_image`
- ถ้าไม่มีรูป จะใช้ default จาก HTML แต่อาจไม่ถูกต้อง

---

### 2. ผู้สอนเป็น Dropdown (Select)

**ไฟล์:** `views/courses/edit.ejs` (line 228-233)

**เดิม:**
```html
<div>
    <label for="instructor_id">ผู้สอน</label>
    <select id="instructor_id" name="instructor_id">
        <option value="">เลือกผู้สอน</option>
    </select>
</div>
```

**ปัญหา:**
- ผู้สอนเป็น dropdown ที่เลือกได้
- แต่ควรเป็น readonly field (แสดงชื่อผู้สอนแบบอ่านได้อย่างเดียว)
- ไม่ควรให้เปลี่ยนผู้สอนหลังจากสร้างคอร์สแล้ว

---

### 3. โหลด Instructors ทุกครั้ง (ไม่จำเป็น)

**ไฟล์:** `views/courses/edit.ejs` (line 290, 443-461)

**เดิม:**
```javascript
// Line 290
await Promise.all([loadCategories(), loadInstructors()]);

// Line 443-461
async function loadInstructors() {
    try {
        const response = await fetch('/users/api/instructors');
        const result = await response.json();
        // ... populate dropdown
    }
}
```

**ปัญหา:**
- โหลด instructors ทุกครั้งแม้ว่าจะไม่ได้ใช้
- ส่ง API request ที่ไม่จำเป็น

---

## ✅ การแก้ไข

### 1. เปลี่ยนผู้สอนเป็น Readonly Field

**ไฟล์:** `views/courses/edit.ejs` (line 227-233)

**เดิม:**
```html
<div>
    <label for="instructor_id" class="block text-sm font-medium text-gray-700 mb-2">ผู้สอน</label>
    <select id="instructor_id" name="instructor_id"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary">
        <option value="">เลือกผู้สอน</option>
    </select>
</div>
```

**ใหม่:**
```html
<div>
    <label for="instructor_name_display" class="block text-sm font-medium text-gray-700 mb-2">ผู้สอน</label>
    <input type="text" id="instructor_name_display" readonly
           class="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-ruxchai-primary focus:ring-ruxchai-primary cursor-not-allowed">
    <input type="hidden" id="instructor_id" name="instructor_id">
    <p class="text-xs text-gray-500 mt-1">ผู้สอนไม่สามารถเปลี่ยนแปลงได้</p>
</div>
```

**การเปลี่ยนแปลง:**
- ✅ เปลี่ยนจาก `<select>` เป็น `<input type="text" readonly>`
- ✅ เพิ่ม `bg-gray-50` และ `cursor-not-allowed` เพื่อบอกว่าแก้ไขไม่ได้
- ✅ เก็บ `instructor_id` ไว้ใน hidden field
- ✅ เพิ่มข้อความอธิบาย "ผู้สอนไม่สามารถเปลี่ยนแปลงได้"

---

### 2. ปรับปรุงการแสดงรูปภาพ

**ไฟล์:** `views/courses/edit.ejs` (line 317-370)

**เดิม:**
```javascript
// Set course image
if (course.course_image) {
    document.getElementById('course-image-preview').src = course.course_image;
    document.getElementById('remove-image').classList.remove('hidden');
}
```

**ใหม่:**
```javascript
// Set instructor (readonly field - show name, store ID)
if (course.instructor_id) {
    document.getElementById('instructor_id').value = course.instructor_id;
    document.getElementById('instructor_name_display').value =
        course.instructor_name || course.instructor_display_name || 'ไม่ระบุ';
}

// Set course image - use existing image or default
if (course.course_image) {
    document.getElementById('course-image-preview').src = course.course_image;
    document.getElementById('remove-image').classList.remove('hidden');
} else if (course.thumbnail_image) {
    document.getElementById('course-image-preview').src = course.thumbnail_image;
    document.getElementById('remove-image').classList.remove('hidden');
} else {
    document.getElementById('course-image-preview').src = '/images/default-avatar.png';
}
```

**การเปลี่ยนแปลง:**
- ✅ เพิ่มการ set ค่า `instructor_name_display` จากชื่อผู้สอน
- ✅ เช็ค `course.course_image` ก่อน
- ✅ ถ้าไม่มี ลอง `course.thumbnail_image`
- ✅ ถ้ายังไม่มี ใช้ default image

---

### 3. ลบการโหลด Instructors ที่ไม่จำเป็น

**ไฟล์:** `views/courses/edit.ejs` (line 290-293)

**เดิม:**
```javascript
// Load dropdown data first, then load course data
await Promise.all([loadCategories(), loadInstructors()]);
await loadCourseData();
```

**ใหม่:**
```javascript
// Load dropdown data first, then load course data
await loadCategories();
await loadCourseData();
```

**การเปลี่ยนแปลง:**
- ✅ ลบ `loadInstructors()` ออก
- ✅ โหลดแค่ categories เท่านั้น

---

**ไฟล์:** `views/courses/edit.ejs` (line 443)

**เดิม:**
```javascript
async function loadInstructors() {
    try {
        const response = await fetch('/users/api/instructors');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('instructor_id');
            result.data.forEach(instructor => {
                const option = document.createElement('option');
                option.value = instructor.user_id;
                option.textContent = `${instructor.first_name} ${instructor.last_name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading instructors:', error);
    }
}
```

**ใหม่:**
```javascript
// Removed loadInstructors() - instructor is now a readonly field
```

**การเปลี่ยนแปลง:**
- ✅ ลบ function ทั้งหมด
- ✅ ไม่ต้องโหลด instructors อีกต่อไป

---

## 📊 ผลลัพธ์

### ก่อนแก้ไข ❌

```
┌─────────────────────────────┐
│ ผู้สอน                       │
│ [เลือกผู้สอน ▼]             │ ← Dropdown เลือกได้
│  - เลือกผู้สอน              │
│  - อาจารย์ A                 │
│  - อาจารย์ B                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│ รูปภาพหลักสูตร              │
│ [default-avatar.png]         │ ← แสดง default แม้มีรูปในฐานข้อมูล
└─────────────────────────────┘
```

### หลังแก้ไข ✅

```
┌─────────────────────────────┐
│ ผู้สอน                       │
│ สมชาย ใจดี                   │ ← Readonly แก้ไขไม่ได้
│ ผู้สอนไม่สามารถเปลี่ยนแปลงได้│
└─────────────────────────────┘

┌─────────────────────────────┐
│ รูปภาพหลักสูตร              │
│ [รูปจากฐานข้อมูล]            │ ← แสดงรูปที่บันทึกไว้
└─────────────────────────────┘
```

---

## 🧪 วิธีทดสอบ

### 1. ทดสอบแสดงชื่อผู้สอน

```bash
# 1. สร้างหลักสูตรใหม่ โดยเลือกผู้สอน
# 2. บันทึกหลักสูตร
# 3. กลับมาแก้ไขหลักสูตร
```

**ผลที่คาดหวัง:**
- ✅ ฟิลด์ผู้สอนแสดงชื่อผู้สอน
- ✅ ฟิลด์เป็นสีเทา (bg-gray-50)
- ✅ Cursor เป็น not-allowed เมื่อ hover
- ✅ ไม่สามารถแก้ไขได้
- ✅ มีข้อความ "ผู้สอนไม่สามารถเปลี่ยนแปลงได้"

### 2. ทดสอบแสดงรูปภาพ

```bash
# กรณีที่ 1: คอร์สมี course_image
# 1. สร้างหลักสูตรและอัพโหลดรูป
# 2. แก้ไขหลักสูตร

# กรณีที่ 2: คอร์สมี thumbnail_image
# 1. สร้างหลักสูตรที่มี thumbnail_image
# 2. แก้ไขหลักสูตร

# กรณีที่ 3: คอร์สไม่มีรูป
# 1. สร้างหลักสูตรโดยไม่อัพโหลดรูป
# 2. แก้ไขหลักสูตร
```

**ผลที่คาดหวัง:**
- ✅ กรณีที่ 1: แสดง course_image
- ✅ กรณีที่ 2: แสดง thumbnail_image
- ✅ กรณีที่ 3: แสดง default-avatar.png

### 3. ทดสอบ Network Requests

```bash
# 1. เปิด DevTools → Network Tab
# 2. เข้าหน้าแก้ไขหลักสูตร
```

**ผลที่คาดหวัง:**
- ✅ ไม่มี request ไป `/users/api/instructors`
- ✅ มีแค่ request ไป `/courses/api/categories` และ `/courses/api/1`

---

## 📁 ไฟล์ที่แก้ไข

### 1. `views/courses/edit.ejs`
- **Line 227-233:** เปลี่ยนผู้สอนจาก dropdown เป็น readonly text field
- **Line 292:** ลบการเรียก `loadInstructors()` ออก
- **Line 333-338:** เพิ่มการ set ค่า instructor_name_display
- **Line 353-362:** ปรับปรุงการแสดงรูปภาพให้รองรับทั้ง course_image และ thumbnail_image
- **Line 443:** ลบ function `loadInstructors()` ทั้งหมด

---

## 📝 หมายเหตุ

### ทำไมผู้สอนไม่ควรเปลี่ยนแปลงได้?

1. **Data Integrity:** เมื่อสร้างคอร์สแล้ว ผู้สอนคือส่วนหนึ่งของข้อมูลหลัก
2. **Accountability:** ผู้สอนเป็นผู้รับผิดชอบคอร์ส ไม่ควรเปลี่ยนแปลงบ่อย
3. **History Tracking:** การเปลี่ยนผู้สอนควรทำผ่านขั้นตอนพิเศษ มีการบันทึก log
4. **Permissions:** การเปลี่ยนผู้สอนอาจกระทบสิทธิ์การเข้าถึงและแก้ไข

### ถ้าต้องการเปลี่ยนผู้สอน:

**ทางเลือก 1: แก้ใน Database โดยตรง (Admin เท่านั้น)**
```sql
UPDATE Courses
SET instructor_id = 123, instructor_name = 'ชื่อผู้สอนใหม่'
WHERE course_id = 1;
```

**ทางเลือก 2: เพิ่ม Feature "โอนย้ายผู้สอน"**
- สร้าง API endpoint พิเศษ
- ต้องมีสิทธิ์ Admin เท่านั้น
- บันทึก log การเปลี่ยนแปลง
- แจ้งเตือนผู้สอนเก่าและใหม่

### รูปภาพที่รองรับ:

**ลำดับความสำคัญ:**
1. `course.course_image` - รูปหลักของคอร์ส
2. `course.thumbnail_image` - รูปย่อ/thumbnail
3. `/images/default-avatar.png` - รูป default

### Readonly vs Disabled:

**ใช้ `readonly` แทน `disabled` เพราะ:**
- ✅ ค่ายังส่งไปกับ form submit ได้
- ✅ สามารถ copy text ได้
- ✅ Screen reader อ่านค่าได้
- ✅ สีพื้นหลังดูสวยกว่า

---

## ✅ สรุป

- ✅ เปลี่ยนผู้สอนจาก dropdown เป็น readonly text field
- ✅ แสดงชื่อผู้สอนจากข้อมูลที่บันทึกไว้
- ✅ ปรับปรุงการแสดงรูปภาพให้ดึงจากฐานข้อมูล
- ✅ รองรับทั้ง course_image และ thumbnail_image
- ✅ ลบการโหลด instructors ที่ไม่จำเป็น
- ✅ ลด API requests ที่ไม่จำเป็น

**สถานะ:** ✅ **เสร็จสมบูรณ์**
**ทดสอบ:** พร้อมใช้งาน - Refresh หน้าแก้ไขและตรวจสอบว่าผู้สอนแสดงเป็น readonly และรูปภาพโหลดถูกต้อง
