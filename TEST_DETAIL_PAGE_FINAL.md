# การทดสอบหน้ารายละเอียดหลักสูตร - Final Test

## การแก้ไขที่ทำไปแล้ว

### 1. ✅ ดึงข้อมูล Positions และ Departments จาก Database

**เดิม:** Hard-code mapping ใน detail.ejs
```javascript
const positionMap = {
    'manager': 'ผู้จัดการ',
    'developer': 'นักพัฒนา',
    ...
};
```

**แก้ไขแล้ว:** ดึงจาก API
```javascript
// โหลด mapping ตอนเริ่มต้น
await loadPositionsMapping();      // จาก /courses/api/target-positions
await loadDepartmentsMapping();    // จาก /courses/api/target-departments

// ใช้ mapping จาก database
const mappedPosition = positionsMapping[p.toLowerCase()];
const mappedDepartment = departmentsMapping[d.toLowerCase()];
```

**API Endpoints:**
- `GET /courses/api/target-positions` → ดึงตำแหน่งจาก table `positions`
- `GET /courses/api/target-departments` → ดึงแผนกจาก table `OrganizationUnits`

---

### 2. ✅ แสดงบทเรียนทันทีไม่ต้องรอโหลด

**เดิม:**
```javascript
// โหลดแยก ต้องรอ API
await loadCurriculum();  // เรียก /courses/api/:course_id/curriculum
```

**แก้ไขแล้ว:**
```javascript
// แสดงทันทีจาก courseData
if (course.lessons && course.lessons.length > 0) {
    updateCurriculumDisplay(course.lessons);
}
```

**ผลลัพธ์:**
- บทเรียนแสดงทันทีเมื่อโหลดหน้า
- ไม่ต้องรอ Promise.all() ที่เรียก loadCurriculum()

---

## วิธีทดสอบ

### ขั้นตอนที่ 1: เปิดหน้า Detail

```
http://localhost:3000/courses/2
```

### ขั้นตอนที่ 2: ตรวจสอบ Console Log

เปิด Developer Tools (F12) → Console

**ควรเห็น:**
```
Connected to MSSQL database  (จาก API positions)
Connected to MSSQL database  (จาก API departments)
```

**ไม่ควรเห็น Error:**
- Error loading positions mapping
- Error loading departments mapping

### ขั้นตอนที่ 3: ตรวจสอบ Network Tab

**ควรเห็น requests:**
1. `GET /courses/api/target-positions` → Status 200
2. `GET /courses/api/target-departments` → Status 200
3. `GET /courses/api/2` → Status 200

### ขั้นตอนที่ 4: ตรวจสอบการแสดงผล

#### TAB "ภาพรวม" - กลุ่มเป้าหมาย:

**ตรวจสอบว่าแสดง:**
- ตำแหน่ง: [ชื่อจากฐานข้อมูล หรือ ชื่อเดิมถ้าไม่match]
- แผนก: [ชื่อจากฐานข้อมูล หรือ ชื่อเดิมถ้าไม่match]

**ตัวอย่าง:**
```
กลุ่มเป้าหมาย
  ตำแหน่ง: IT Manager, developer, engineer, analyst
  แผนก: เทคโนโลยีสารสนเทศ, Development, Technology, Digital
```

**หมายเหตุ:**
- ถ้า database มี "IT Manager" → แสดง "IT Manager"
- ถ้า slug "developer" ไม่match → แสดง "developer" (เดิม)

#### TAB "หลักสูตร":

**ควรแสดงบทเรียนทันที:**
```
บทเรียนทั้งหมด (5 บท)

1. บทที่ 1: ความรู้พื้นฐานและการเตรียมความพร้อม
   120 นาที
   แนะนำหลักสูตร ทำความรู้จักกับเครื่องมือ...

2. บทที่ 2: ทฤษฎีและหลักการสำคัญ
   180 นาที
   เรียนรู้ทฤษฎีพื้นฐาน...

... (5 บททั้งหมด)
```

**ไม่ควร:**
- ว่างเปล่า
- แสดง "ยังไม่มีบทเรียนที่กำหนด"
- ต้องรอนานจึงแสดง

---

## การทดสอบด้วย Console

### ทดสอบ Positions Mapping:

เปิด Console และพิมพ์:
```javascript
positionsMapping
```

**ควรเห็น object:**
```javascript
{
  "it manager": "IT Manager",
  "manager": "IT Manager",
  ...
}
```

### ทดสอบ Departments Mapping:

```javascript
departmentsMapping
```

**ควรเห็น object:**
```javascript
{
  "เทคโนโลยีสารสนเทศ": "เทคโนโลยีสารสนเทศ",
  "information technology": "เทคโนโลยีสารสนเทศ",
  "พัฒนาองค์กร": "พัฒนาองค์กร",
  ...
}
```

### ทดสอบ Course Data:

```javascript
courseData.lessons
```

**ควรเห็น array:**
```javascript
[
  {
    "title": "บทที่ 1: ความรู้พื้นฐานและการเตรียมความพร้อม",
    "duration": 120,
    "description": "แนะนำหลักสูตร...",
    ...
  },
  ...
]
```

---

## ปัญหาที่อาจเจอและวิธีแก้

### ปัญหา 1: ตำแหน่ง/แผนกไม่แสดงชื่อจาก Database

**สาเหตุ:**
- API ไม่ return ข้อมูล
- Mapping ไม่match กับ slug

**วิธีตรวจสอบ:**
```javascript
console.log('Positions:', positionsMapping);
console.log('Target Positions:', courseData.target_audience.positions);
```

**วิธีแก้:**
- เพิ่ม mapping ใน loadPositionsMapping() หรือ loadDepartmentsMapping()
- หรือยอมรับว่าแสดงชื่อเดิม (slug)

### ปัญหา 2: บทเรียนไม่แสดง

**สาเหตุ:**
- courseData.lessons เป็น null หรือ empty

**วิธีตรวจสอบ:**
```javascript
console.log('Lessons:', courseData.lessons);
```

**วิธีแก้:**
- ตรวจสอบว่า API `/courses/api/2` return lessons ไหม
- ตรวจสอบว่า Course.findById() parse lessons เป็น array ไหม

### ปัญหา 3: Console Error "positionsMapping is not defined"

**สาเหตุ:**
- โหลด mapping ไม่เสร็จก่อน updateCourseDisplay()

**วิธีแก้:**
- ตรวจสอบว่า `await Promise.all([loadPositionsMapping(), ...])` ทำงานก่อน loadCourseDetail()

---

## สรุปการแก้ไข

### ไฟล์ที่แก้ไข:
- `views/courses/detail.ejs`

### บรรทัดที่แก้ไข:
1. Line 306-307: เพิ่มตัวแปร `positionsMapping` และ `departmentsMapping`
2. Line 309-314: แก้ DOMContentLoaded เป็น async และโหลด mapping
3. Line 325-371: เพิ่มฟังก์ชัน `loadPositionsMapping()` และ `loadDepartmentsMapping()`
4. Line 540-573: แก้ Target Audience ให้ใช้ mapping จาก API
5. Line 579-582: เพิ่มการแสดงบทเรียนทันที

### API ที่ใช้:
1. `GET /courses/api/target-positions` - ดึงตำแหน่งจาก database
2. `GET /courses/api/target-departments` - ดึงแผนกจาก database
3. `GET /courses/api/:course_id` - ดึงข้อมูลหลักสูตร (รวม lessons)

---

## ผลลัพธ์ที่คาดหวัง

✅ กลุ่มเป้าหมายแสดงชื่อจาก database (ถ้า match) หรือชื่อเดิม (ถ้าไม่ match)
✅ บทเรียนแสดงทันทีเมื่อโหลดหน้า
✅ ไม่มี hard-code mapping สำหรับ positions/departments
✅ ดึงข้อมูลจาก database ตาม requirement ที่ระบุ

---

## ขั้นตอนต่อไป (Optional)

ถ้าต้องการให้ตำแหน่ง/แผนกแสดงชื่อจาก database ทุกตัว:

1. **แก้ฟอร์มสร้างหลักสูตร** (create.ejs) ให้ดึงจาก API แทน hard-code
2. **เปลี่ยนให้เก็บ ID แทน slug** ใน target_audience
3. **แก้ detail.ejs** ให้ JOIN กับ ID

แต่ตอนนี้ใช้วิธี **hybrid approach**: ดึงจาก API มา map กับ slug ที่เก็บไว้
