# หน้าแก้ไขหลักสูตร - ฟิลด์ที่ขาดหาย

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 เปรียบเทียบ Create vs Edit

### ✅ ฟิลด์ที่มีอยู่แล้วใน Edit:

1. ✅ course_name - ชื่อหลักสูตร
2. ✅ course_code - รหัสหลักสูตร
3. ✅ category_id - หมวดหมู่
4. ✅ difficulty_level - ระดับความยาก
5. ✅ duration_hours - ระยะเวลา (ชั่วโมง)
6. ✅ description - คำอธิบาย
7. ✅ course_image - รูปภาพหลักสูตร
8. ✅ max_enrollments - จำนวนผู้เรียนสูงสุด
9. ✅ passing_score - คะแนนผ่าน
10. ✅ enrollment_start - วันเริ่มลงทะเบียน
11. ✅ enrollment_end - วันสิ้นสุดการลงทะเบียน
12. ✅ is_mandatory - หลักสูตรบังคับ
13. ✅ allow_certificate - ออกใบประกาศนียบัตร
14. ✅ is_public - เปิดให้ลงทะเบียนได้
15. ✅ status - สถานะหลักสูตร
16. ✅ instructor_id/name - ผู้สอน

---

### ❌ ฟิลด์ที่ขาดหายใน Edit (มีใน Create):

#### Step 1: ข้อมูลพื้นฐาน
1. ❌ **course_type** - ประเภทหลักสูตร (บังคับ/เลือก/แนะนำ)
2. ❌ **language** - ภาษา (ไทย/อังกฤษ/ทั้งสองภาษา)

#### Step 2: รายละเอียดหลักสูตร
3. ❌ **learning_objectives** - วัตถุประสงค์การเรียนรู้ (array, อย่างน้อย 3 ข้อ)
4. ❌ **target_positions** - ตำแหน่งเป้าหมาย (multiple select)
5. ❌ **target_departments** - แผนกเป้าหมาย (multiple select)
6. ❌ **prerequisite_knowledge** - ความรู้พื้นฐานที่ต้องมี
7. ❌ **duration_minutes** - ระยะเวลา (นาที)

#### Step 3: เนื้อหาและสื่อ
8. ❌ **intro_video_url** - วิดีโอแนะนำหลักสูตร
9. ❌ **lessons** - บทเรียน (array with title, description, video, duration)
10. ❌ **course_materials** - เอกสารประกอบ (files)

#### Step 4: การประเมินผล
11. ❌ **max_attempts** - ทำได้สูงสุด (ครั้ง)
12. ❌ **certificate_validity** - อายุใบประกาศนียบัตร (เดือน)
13. ❌ **show_correct_answers** - แสดงเฉลย
14. ❌ **test_id** - แบบทดสอบ

---

## 📋 รายละเอียดฟิลด์ที่ขาด

### 1. course_type (ประเภทหลักสูตร)
```html
<select id="course_type" name="course_type" required>
    <option value="Required">บังคับ</option>
    <option value="Elective">เลือกเรียน</option>
    <option value="Recommended">แนะนำ</option>
</select>
```
**ใช้ใน:** Sidebar (แสดงเป็นป้าย/badge)

---

### 2. language (ภาษา)
```html
<select id="language" name="language" required>
    <option value="Thai">ภาษาไทย</option>
    <option value="English">ภาษาอังกฤษ</option>
    <option value="Both">ทั้งสองภาษา</option>
</select>
```
**ใช้ใน:** Sidebar (ข้อมูลคอร์ส)

---

### 3. learning_objectives (วัตถุประสงค์การเรียนรู้)
```html
<div id="objectives-container">
    <input type="text" class="objective-input" placeholder="วัตถุประสงค์ข้อที่ 1">
    <button type="button" onclick="addObjective()">เพิ่มวัตถุประสงค์</button>
</div>
<input type="hidden" id="learning_objectives" name="learning_objectives">
```
**ข้อมูล:** Array of strings, JSON
**ใช้ใน:** Tab ภาพรวม (แสดงเป็นลิสต์เลขลำดับ)

---

### 4. target_positions (ตำแหน่งเป้าหมาย)
```html
<select id="target_positions" name="target_positions[]" multiple required>
    <!-- โหลดจาก API /courses/api/target-positions -->
</select>
```
**ข้อมูล:** Array of position IDs
**ใช้ใน:** Tab ภาพรวม (กลุ่มเป้าหมาย)

---

### 5. target_departments (แผนกเป้าหมาย)
```html
<select id="target_departments" name="target_departments[]" multiple required>
    <!-- โหลดจาก API /courses/api/target-departments -->
</select>
```
**ข้อมูล:** Array of department IDs
**ใช้ใน:** Tab ภาพรวม (กลุ่มเป้าหมาย)

---

### 6. prerequisite_knowledge (ความรู้พื้นฐาน)
```html
<textarea id="prerequisite_knowledge" name="prerequisite_knowledge" rows="3"></textarea>
```
**ใช้ใน:** Tab ภาพรวม

---

### 7. duration_minutes (นาที)
```html
<input type="number" id="duration_minutes" name="duration_minutes" min="0" max="59">
```
**ใช้ใน:** แสดงรวมกับ duration_hours เป็น "X ชั่วโมง Y นาที"

---

### 8. intro_video_url (วิดีโอแนะนำ)
```html
<input type="file" id="intro_video" name="intro_video" accept="video/*">
<!-- หรือ -->
<input type="text" id="intro_video_url" name="intro_video_url" placeholder="URL วิดีโอ">
```
**ใช้ใน:** Tab ภาพรวม (แสดงเป็น video player)

---

### 9. lessons (บทเรียน)
```javascript
[
    {
        lesson_number: 1,
        title: "บทที่ 1",
        description: "คำอธิบาย",
        duration_minutes: 60,
        video_url: "url",
        order_index: 1
    }
]
```
**ใช้ใน:** Tab หลักสูตร (แสดงเป็น accordion/list)

---

### 10. course_materials (เอกสารประกอบ)
```html
<input type="file" id="course_materials" name="course_materials[]" multiple
       accept=".pdf,.ppt,.pptx,.doc,.docx">
```
**ใช้ใน:** Tab เอกสาร

---

### 11. max_attempts (ทำได้สูงสุด)
```html
<input type="number" id="max_attempts" name="max_attempts" min="1" placeholder="เช่น 3">
```
**ใช้ใน:** Sidebar (ข้อมูลคอร์ส)

---

### 12. certificate_validity (อายุใบประกาศนียบัตร)
```html
<input type="number" id="certificate_validity" name="certificate_validity" min="1">
<select>
    <option value="months">เดือน</option>
    <option value="years">ปี</option>
</select>
```
**ใช้ใน:** Tab ภาพรวม

---

### 13. show_correct_answers (แสดงเฉลย)
```html
<input type="checkbox" id="show_correct_answers" name="show_correct_answers">
```

---

### 14. test_id (แบบทดสอบ)
```html
<select id="selected_test_id" name="test_id">
    <!-- โหลดจาก API /courses/api/tests/available -->
</select>
```

---

## 🎯 แผนการแก้ไข

### Option 1: เพิ่มฟิลด์ทั้งหมดในหน้าเดียว
- ❌ ซับซ้อนเกินไป
- ❌ ฟอร์มยาวมาก

### Option 2: ใช้ Tabs แบบ Create (4 Steps)
- ✅ จัดกลุ่มชัดเจน
- ✅ ง่ายต่อการจัดการ
- ❌ ต้องเขียนโค้ดใหม่เยอะ

### Option 3: เพิ่มแบบเลือก (สำคัญที่สุด)
- ✅ เร็ว
- ✅ ไม่ซับซ้อน
- ⚠️ บางฟิลด์อาจยังขาด

---

## 💡 แนะนำ: เพิ่มฟิลด์สำคัญก่อน

### Phase 1: ฟิลด์ที่มีผลต่อการแสดงผล (เพิ่มเลย)
1. ✅ course_type
2. ✅ language
3. ✅ learning_objectives
4. ✅ target_audience (positions + departments)
5. ✅ prerequisite_knowledge
6. ✅ duration_minutes
7. ✅ max_attempts
8. ✅ certificate_validity

### Phase 2: ฟิลด์เนื้อหา (เพิ่มทีหลัง)
9. intro_video_url
10. lessons
11. course_materials
12. test_id

---

## 📝 ตัวอย่างโครงสร้างฟอร์มที่ควรมี

```html
<!-- Basic Information -->
<div class="section">
    <h3>ข้อมูลพื้นฐาน</h3>
    - course_name
    - course_code
    - category_id
    - difficulty_level
    - course_type ← เพิ่ม
    - language ← เพิ่ม
    - instructor_name (readonly)
</div>

<!-- Course Details -->
<div class="section">
    <h3>รายละเอียดหลักสูตร</h3>
    - description
    - learning_objectives ← เพิ่ม
    - prerequisite_knowledge ← เพิ่ม
    - duration_hours + duration_minutes ← เพิ่ม minutes
</div>

<!-- Target Audience -->
<div class="section">
    <h3>กลุ่มเป้าหมาย</h3>
    - target_positions ← เพิ่ม
    - target_departments ← เพิ่ม
</div>

<!-- Media -->
<div class="section">
    <h3>สื่อการเรียนการสอน</h3>
    - course_image
    - intro_video_url ← เพิ่ม
</div>

<!-- Settings -->
<div class="section">
    <h3>การตั้งค่า</h3>
    - max_enrollments
    - passing_score
    - max_attempts ← เพิ่ม
    - certificate_validity ← เพิ่ม
    - enrollment_start
    - enrollment_end
    - checkboxes (is_mandatory, allow_certificate, is_public)
</div>

<!-- Status -->
<div class="section">
    <h3>สถานะ</h3>
    - status
</div>
```

---

## ✅ สรุป

**ฟิลด์ที่มีอยู่:** 16 ฟิลด์
**ฟิลด์ที่ขาด:** 14 ฟิลด์
**รวม:** 30 ฟิลด์

**แนะนำ:** เพิ่มฟิลด์ Phase 1 (8 ฟิลด์) ก่อน เพราะมีผลต่อการแสดงผลในหน้า detail
