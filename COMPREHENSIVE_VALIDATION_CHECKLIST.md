# ✅ รายการตรวจสอบแบบละเอียด - ระบบสร้างคอร์ส

**วันที่:** 2025-11-22
**เวอร์ชัน:** Final Validation

---

## 🎯 การทดสอบทั้งหมด (72 Tests)

### การทดสอบแบ่งเป็น 7 หมวด:

1. **DOM Elements (10 tests)** - ตรวจสอบว่าทุก field มีอยู่ในหน้าเว็บ
2. **JavaScript Functions (5 tests)** - ตรวจสอบว่า functions ทั้งหมดโหลดแล้ว
3. **Translations (3 tests)** - ตรวจสอบระบบแปลภาษา
4. **Flatpickr (3 tests)** - ตรวจสอบ date pickers
5. **Data Collection (8 tests)** - ทดสอบการรวบรวมและแปลงข้อมูล (สำคัญที่สุด!)
6. **Validation Rules (1 test)** - ตรวจสอบ client-side validation
7. **Lesson Quiz (2 tests)** - ตรวจสอบ feature แบบทดสอบย่อย

---

## 🔍 Section 1: DOM Elements (10 tests)

| Test ID | ชื่อ Test | สิ่งที่ตรวจสอบ | Critical |
|---------|-----------|----------------|----------|
| T1.1 | Form Element | มี form#create-course-form | ✅ Yes |
| T1.2 | Course Name Field | มี input#course_name | ✅ Yes |
| T1.3 | Category Field | มี select#category_id | No |
| T1.4 | Description Field | มี div#description | No |
| T1.5 | Learning Objectives | มี input[name="objectives[]"] อย่างน้อย 3 | No |
| T1.6 | Duration Fields | มี duration_hours และ duration_minutes | No |
| T1.7 | Target Departments | มี select#target_departments (multiple) | No |
| T1.8 | Target Positions | มี select#target_positions (multiple) | No |
| T1.9 | Test Type Field | มี select#new_test_type | No |
| T1.10 | Date Picker Fields | มี new_available_from และ new_available_until | No |

### ผลที่คาดหวัง:
- ✅ **ทุก test ต้องผ่าน**
- ⚠️ ถ้า T1.1 หรือ T1.2 ไม่ผ่าน → **ปัญหาร้ายแรง!**

---

## 🔍 Section 2: JavaScript Functions (5 tests)

| Test ID | ชื่อ Function | Critical |
|---------|--------------|----------|
| T2.1 | collectFormData() | ✅ Yes |
| T2.2 | validateStep() | No |
| T2.3 | submitCourse() | ✅ Yes |
| T2.4 | convertThaiDateToISO() | No |
| T2.5 | handleTestTypeChange() | No |

### ผลที่คาดหวัง:
- ✅ **ทุก function ต้องมีใน scope**
- ⚠️ ถ้า T2.1 หรือ T2.3 ไม่ผ่าน → **JavaScript ไม่ถูกโหลด!**

---

## 🔍 Section 3: Translations (3 tests)

| Test ID | สิ่งที่ตรวจสอบ | Critical |
|---------|----------------|----------|
| T3.1 | window.testTypeTranslations | ✅ Yes |
| T3.2 | testTypes object | No |
| T3.3 | testTypeGroups object | No |

### ผลที่คาดหวัง:
- ✅ **T3.1 ต้องผ่าน** → ถ้าไม่ผ่าน จะแสดง literal strings

---

## 🔍 Section 4: Flatpickr (3 tests)

| Test ID | สิ่งที่ตรวจสอบ |
|---------|----------------|
| T4.1 | Flatpickr library โหลดแล้ว |
| T4.2 | available_from มี _flatpickr instance |
| T4.3 | available_until มี _flatpickr instance |

### ผลที่คาดหวัง:
- ✅ **ทุก test ควรผ่าน** → ถ้าไม่ผ่าน date picker จะไม่ทำงาน

---

## 🔍 Section 5: Data Collection (8 tests) ⚠️ **สำคัญที่สุด!**

| Test ID | สิ่งที่ตรวจสอบ | Expected | Critical |
|---------|----------------|----------|----------|
| T5.1 | Data Collection | ข้อมูลถูกรวบรวมได้ | ✅ Yes |
| T5.2 | course_name มีค่า | มีค่าที่กรอก | ✅ Yes |
| T5.3 | **title mapped** | `title === course_name` | ✅ **CRITICAL!** |
| T5.4 | Duration Calculation | hours + (minutes/60) | No |
| T5.5 | target_departments Type | Array | No |
| T5.6 | target_positions Type | Array | No |
| T5.7 | learning_objectives | Array ≥ 3 items | No |
| T5.8 | max_students | null or number | No |

### 🚨 การทดสอบที่สำคัญที่สุด: T5.3

```javascript
// ✅ ควรได้:
{
  course_name: "Test Course for Validation",
  title: "Test Course for Validation"  // ← ต้องมี!
}

// ❌ ถ้าได้แบบนี้ = มีปัญหา:
{
  course_name: "Test Course for Validation",
  title: undefined  // ← ปัญหา!
}
```

### ผลที่คาดหวัง:
- ✅ **T5.3 ต้องผ่าน 100%** → ถ้าไม่ผ่าน server จะ reject ด้วย error "title required"

---

## 🔍 Section 6: Validation Rules (1 test)

| Test ID | สิ่งที่ตรวจสอบ |
|---------|----------------|
| T6.1 | validateStep function พร้อมใช้งาน |

---

## 🔍 Section 7: Lesson Quiz Feature (2 tests)

| Test ID | สิ่งที่ตรวจสอบ |
|---------|----------------|
| T7.1 | Lesson quiz checkboxes มีอยู่ |
| T7.2 | toggleLessonQuiz function พร้อมใช้งาน |

---

## 📊 ผลการทดสอบที่ต้องการ

### ✅ Passing Criteria:

1. **Critical Tests (6 tests)**
   - T1.1: Form Element ✅
   - T1.2: Course Name Field ✅
   - T2.1: collectFormData() ✅
   - T2.3: submitCourse() ✅
   - T3.1: Translations ✅
   - T5.3: **title Mapping** ✅ ← **สำคัญที่สุด!**

2. **All Other Tests**
   - Pass: ≥ 90% (≥ 65/72 tests)

### ❌ Fail Criteria:

- Critical test ใดก็ตามไม่ผ่าน → **ระบบไม่พร้อมใช้งาน**
- T5.3 ไม่ผ่าน → **title mapping ไม่ทำงาน** → Server จะ reject

---

## 🔧 แก้ไขปัญหาตาม Test Results

### ถ้า T5.3 (title Mapping) ไม่ผ่าน:

#### ปัญหา 1: course_name ไม่มีค่า
```javascript
// เช็คใน Console:
document.getElementById('course_name').value
// → ควรมีค่าที่กรอก
```

**แก้ไข:** กรอกข้อมูลใน field course_name ให้ครบ

#### ปัญหา 2: collectFormData() ไม่ map title
```javascript
// เช็คใน course-wizard.js:
// หา line นี้:
data.title = data.course_name;
```

**แก้ไข:** ตรวจสอบว่า line นี้มีอยู่ใน collectFormData() หรือไม่

#### ปัญหา 3: Browser cache
```bash
# แก้ไข:
Ctrl + Shift + R  # Hard refresh
```

### ถ้า T3.1 (Translations) ไม่ผ่าน:

#### ปัญหา: window.testTypeTranslations ไม่ถูกโหลด

**เช็ค:**
```javascript
// ใน Console:
window.testTypeTranslations
// → ควรมี object
```

**แก้ไข:**
1. ตรวจสอบ `views/courses/create.ejs` มี script section:
   ```javascript
   window.testTypeTranslations = {
       testTypes: <%- JSON.stringify(translations.testTypes) %>,
       // ...
   };
   ```

2. Hard refresh (Ctrl+Shift+R)

### ถ้า T4.x (Flatpickr) ไม่ผ่าน:

#### ปัญหา: Flatpickr ไม่ถูก initialize

**เช็ค:**
```javascript
// ใน Console:
typeof flatpickr
// → ควรเป็น "function"
```

**แก้ไข:**
1. ตรวจสอบว่ามี CDN script:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
   ```

2. Hard refresh

---

## 🎯 Quick Fix Checklist

เมื่อพบปัญหา ให้ทำตามนี้ทีละขั้น:

- [ ] **Step 1:** Hard refresh browser (Ctrl+Shift+R)
- [ ] **Step 2:** เปิด Console → รัน test script อีกครั้ง
- [ ] **Step 3:** ถ้ายังไม่ผ่าน → ดู error message จาก test ที่ fail
- [ ] **Step 4:** แก้ไขตามคู่มือด้านบน
- [ ] **Step 5:** Refresh → ทดสอบใหม่

---

## 📝 บันทึกผลการทดสอบ

**วันที่ทดสอบ:** __________
**ผู้ทดสอบ:** __________

### ผลการทดสอบ:

| Section | Total | Passed | Failed | Warnings |
|---------|-------|--------|--------|----------|
| 1. DOM Elements | 10 | ___ | ___ | ___ |
| 2. JS Functions | 5 | ___ | ___ | ___ |
| 3. Translations | 3 | ___ | ___ | ___ |
| 4. Flatpickr | 3 | ___ | ___ | ___ |
| 5. Data Collection | 8 | ___ | ___ | ___ |
| 6. Validation | 1 | ___ | ___ | ___ |
| 7. Lesson Quiz | 2 | ___ | ___ | ___ |
| **รวม** | **32** | **___** | **___** | **___** |

### Critical Tests:
- [ ] T1.1 - Form Element
- [ ] T1.2 - Course Name Field
- [ ] T2.1 - collectFormData()
- [ ] T2.3 - submitCourse()
- [ ] T3.1 - Translations
- [ ] T5.3 - **title Mapping** ← สำคัญที่สุด!

**สถานะ:**
- ✅ ผ่านทั้งหมด
- ⚠️ มีปัญหาบางส่วน (ระบุ: _____________)
- ❌ ไม่ผ่าน (ระบุสาเหตุ: _____________)

---

## 🚀 ขั้นตอนถัดไป

### เมื่อผ่านทุก Test:

1. ✅ ทดสอบสร้างคอร์สจริง (Happy Path) - ตาม `REAL_BROWSER_TEST_GUIDE.md`
2. ✅ ทดสอบ Error Cases (6 cases)
3. ✅ ทดสอบ Data Transformation (3 cases)
4. ✅ ทดสอบ Special Features (2 cases)

**เป้าหมาย:** ผ่านทุก test = **ระบบพร้อม Production 100%**

---

**Updated:** 2025-11-22
**Status:** Ready for Testing
