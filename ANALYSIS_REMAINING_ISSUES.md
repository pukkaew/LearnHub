# วิเคราะห์ปัญหาที่เหลืออยู่

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 ตรวจสอบ Course ID 1 จาก Database

```json
{
  "course_id": 1,
  "title": "Test11",
  "course_code": null,          // ❌ NULL
  "course_type": null,           // ❌ NULL
  "language": null,              // ❌ NULL
  "learning_objectives": null,   // ❌ NULL
  "target_audience": null,       // ❌ NULL
  "passing_score": null,         // ❌ NULL
  "max_attempts": null,          // ❌ NULL
  "certificate_validity": null,  // ❌ NULL
  "max_students": null           // ❌ NULL
}
```

---

## ❌ ปัญหาหลัก

### 1. **ฟอร์มไม่ส่งข้อมูลบางฟิลด์**

ฟอร์ม `create.ejs` มีฟิลด์:
- `course_code` ✅ (line 79)
- `course_type` ✅ (line 111)
- `language` ✅ (line 122)
- `learning_objectives[]` ✅ (line 192)
- `target_positions[]` ❓ (ต้องเช็ค)
- `target_departments[]` ❓ (ต้องเช็ค)
- `passing_score` ❓ (ต้องเช็ค)
- `max_attempts` ❓ (ต้องเช็ค)
- `certificate_validity` ❓ (ต้องเช็ค)

แต่ `collectFormData()` อาจไม่ได้รวบรวมครบ!

### 2. **Field name ไม่ตรงกัน**

ฟอร์มใช้:
- `max_enrollments` (line 276)

แต่ Backend ต้องการ:
- `max_students`

### 3. **ไม่มี validation**

ฟอร์มสามารถ submit ได้โดยไม่กรอกฟิลด์สำคัญ!

---

## ✅ สิ่งที่แก้ไขแล้ว

1. ✅ **certificate_validity** - แปลง Number เป็น String ก่อนบันทึก (Course.js:224)
2. ✅ **lesson video_url** - เพิ่มการเก็บ video URLs ใน collectFormData() (course-wizard.js:1033)
3. ✅ **บันทึก video_url** - Course.create() บันทึกลง file_path (Course.js:256)
4. ✅ **แสดง video_url** - Course.findById() map file_path เป็น video_url (Course.js:94-97)
5. ✅ **แสดง video player** - updateCurriculumDisplay() แสดงลิงก์วิดีโอ (detail.ejs:765-783)

---

## 🔧 สิ่งที่ต้องแก้ไขต่อ

### 1. เช็คว่าฟอร์มมีฟิลด์ครบหรือไม่

ต้องเช็คว่าฟอร์ม Step 2, 3, 4 มีฟิลด์:
- `target_positions[]` (checkboxes สำหรับเลือกตำแหน่ง)
- `target_departments[]` (checkboxes สำหรับเลือกแผนก)
- `passing_score` (input number)
- `max_attempts` (input number)
- `certificate_validity` (select/input)

### 2. แก้ชื่อฟิลด์ให้ตรงกัน

แก้ `max_enrollments` เป็น `max_students` หรือ map ใน collectFormData()

### 3. เช็ค collectFormData() ว่ารวบรวมครบหรือไม่

ตรวจสอบว่า collectFormData() เก็บ:
- target_positions (array)
- target_departments (array)
- passing_score (number)
- max_attempts (number)
- certificate_validity (string/number)

### 4. เพิ่ม validation

เพิ่ม validation ใน:
- Frontend: validateStep() ใน course-wizard.js
- Backend: Course.create() ต้องตรวจสอบฟิลด์บังคับ

---

## 📋 ขั้นตอนการแก้ไขต่อ

1. ✅ อ่านฟอร์ม Step 2 เพื่อดูว่ามี target_positions[], target_departments[]
2. ✅ อ่านฟอร์ม Step 4 เพื่อดูว่ามี passing_score, max_attempts, certificate_validity
3. ✅ ตรวจสอบ collectFormData() ว่าเก็บฟิลด์เหล่านี้หรือไม่
4. ✅ แก้ field name ที่ไม่ตรงกัน
5. ✅ เพิ่ม validation

---

## 🎯 เป้าหมาย

หลังแก้ไขเสร็จ Course ที่สร้างต้องมีข้อมูลครบ:
- ✅ course_code
- ✅ course_type
- ✅ language
- ✅ learning_objectives (3+ รายการ)
- ✅ target_audience (positions + departments)
- ✅ lessons (1+ บท พร้อม video URLs)
- ✅ passing_score
- ✅ max_attempts
- ✅ certificate_validity
- ✅ max_students
