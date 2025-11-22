# 🔍 รายงานการตรวจสอบ Validation แบบละเอียด
**วันที่:** 2025-11-22
**เวลา:** 01:23 AM

---

## ✅ 1. Server Validation Rules

จากไฟล์ `middleware/validation.js` (บรรทัด 176-184):

```javascript
{
    title: 'required|minLength:5|maxLength:200',        // ✅ จำเป็น
    description: 'required|minLength:20',                // ✅ จำเป็น
    category_id: 'required|numeric',                     // ✅ จำเป็น
    instructor_id: 'numeric',                            // ❌ ไม่บังคับ
    duration_hours: 'numeric|min:1',                     // ❌ ไม่บังคับ
    max_students: 'numeric|min:1',                       // ❌ ไม่บังคับ
    price: 'numeric|min:0',                              // ❌ ไม่บังคับ
    status: 'in:draft,published,archived'                // ❌ ไม่บังคับ
}
```

---

## 📝 2. HTML Form Fields

จากไฟล์ `views/courses/create.ejs`:

### Required Fields ที่มีใน Form:
| Field Name | HTML Input | Server Expects | Status |
|------------|------------|----------------|--------|
| `course_name` | ✅ มี | `title` | ⚠️ **ต้องแปลง** |
| `description` | ✅ มี (contenteditable) | `description` | ✅ ถูกต้อง |
| `category_id` | ✅ มี (select) | `category_id` | ✅ ถูกต้อง |
| `duration_hours` | ✅ มี (number) | `duration_hours` | ⚠️ **ต้องรวมกับ minutes** |
| `duration_minutes` | ✅ มี (number) | - | ⚠️ **ไม่มีใน validation** |

---

## 🔧 3. JavaScript Mapping (collectFormData)

จากไฟล์ `public/js/course-wizard.js` (บรรทัด 1381-1500):

### การแปลง Field Names:
```javascript
✅ data.title = data.course_name;  // แก้แล้ว (บรรทัด 1485)
✅ data.target_departments = Array.from(...)  // แก้แล้ว
✅ data.target_positions = Array.from(...)  // แก้แล้ว
✅ data.max_students = data.max_enrollments  // แก้แล้ว
```

### ⚠️ ปัญหาที่พบ:
1. **duration_hours + duration_minutes**: ไม่มีการรวมกัน
   - Form มี: `duration_hours` และ `duration_minutes` แยกกัน
   - Server ต้องการ: `duration_hours` เป็นตัวเลขเดียว
   - **ต้องแก้**: รวม hours + (minutes/60)

2. **description length check**:
   - Server ต้องการ: `minLength:20`
   - Form ใช้: contenteditable div
   - **ต้องเช็ค**: ว่ามีการดึงเนื้อหาจาก div ถูกต้องหรือไม่

---

## 🎯 4. ข้อมูลที่ Client ส่งไป (ล่าสุด)

จาก Console Log:
```javascript
{
  course_code: "CRS-2025-7032",
  course_type: "mandatory",
  language: "th",
  learning_objectives: ["sdfsdfdsf", "dsfdsfdsf", "dsfdsfsdf"],
  target_positions: ["64"],
  target_departments: ["48"],
  lessons: [{...}],
  passing_score: 70,
  max_attempts: 3,
  max_students: undefined  // ❌ ยังเป็น undefined
}
```

---

## ❌ 5. ปัญหาที่ต้องแก้ทันที

### 🔴 Critical Issues:
1. **max_students = undefined**
   - สาเหตุ: ไม่มีการกรอกในช่อง max_enrollments
   - Server validation: `numeric|min:1`
   - **undefined ผ่าน validation แต่อาจเกิด error ใน SQL**

2. **duration calculation**
   - ไม่มีการรวม duration_hours + duration_minutes
   - ถ้ากรอก "1 ชม. 30 นาที" ควรเป็น 1.5 hours

3. **description validation**
   - ต้องเช็คว่า contenteditable div ดึงเนื้อหามาได้ถูกต้อง
   - ต้องมีความยาวอย่างน้อย 20 ตัวอักษร

### 🟡 Warning Issues:
1. **instructor_id**: ไม่มีการส่ง (แต่ optional)
2. **price**: ไม่มีการส่ง (แต่ optional)
3. **status**: ไม่มีการส่ง (แต่ optional)

---

## 🛠️ 6. แนวทางแก้ไข

### Priority 1: duration_hours
```javascript
// ใน collectFormData()
const hours = parseInt(data.duration_hours) || 0;
const minutes = parseInt(data.duration_minutes) || 0;
data.duration_hours = hours + (minutes / 60);
delete data.duration_minutes;
```

### Priority 2: max_students
```javascript
// แก้แล้วแต่ต้องเช็คอีกครั้ง
data.max_students = data.max_enrollments ? parseInt(data.max_enrollments) : null;
```

### Priority 3: description
```javascript
// เช็คว่า description มีความยาวเพียงพอ
const description = document.getElementById('description');
const descText = description.textContent.trim();
if (descText.length < 20) {
    showError('คำอธิบายต้องมีความยาวอย่างน้อย 20 ตัวอักษร');
    return false;
}
data.description = description.innerHTML;
```

---

## 📊 7. สรุป

| Item | Status | Note |
|------|--------|------|
| title mapping | ✅ แก้แล้ว | course_name → title |
| description | ⚠️ ต้องเช็ค | ความยาวอย่างน้อย 20 |
| category_id | ✅ OK | ส่งถูกต้อง |
| duration | ❌ ต้องแก้ | ต้องรวม hours + minutes |
| max_students | ⚠️ แก้แล้วแต่เป็น undefined | ต้องเป็น null ถ้าไม่กรอก |
| target_positions | ✅ แก้แล้ว | Array.from(selectedOptions) |
| target_departments | ✅ แก้แล้ว | Array.from(selectedOptions) |

---

**สรุปสั้นๆ:** ต้องแก้ 2 จุดสำคัญ:
1. รวม duration_hours + duration_minutes
2. ตรวจสอบ description length
