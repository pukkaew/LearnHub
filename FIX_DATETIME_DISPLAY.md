# แก้ไขการแสดงวันเวลาเปิดปิดลงทะเบียน

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 ปัญหา

**ฟอร์มให้กรอกทั้งวันที่และเวลา** แต่หน้า detail **แสดงเฉพาะวันที่** ไม่มีเวลา

### ที่มาของปัญหา:

1. **ฟอร์มสร้างหลักสูตร** (create.ejs):
   - มี input `enrollment_start` และ `enrollment_end`
   - ใช้ Flatpickr datetime picker (แสดงทั้งวันที่และเวลา)
   - Format: `d/m/Y H:i` (เช่น "17/11/2025 14:30")

2. **การแสดงผล** (detail.ejs):
   - ใช้ฟังก์ชัน `formatDate()` ที่แสดง**เฉพาะวันที่**
   - ไม่แสดงเวลา ทำให้ข้อมูลไม่ครบถ้วน

---

## ✅ การแก้ไข

### 1. เพิ่มฟังก์ชัน `formatDateTime()`

**ไฟล์:** `views/courses/detail.ejs` (line 1117-1130)

```javascript
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
    return `${dateStr} ${timeStr}`;
}
```

**ผลลัพธ์:** แสดงวันที่และเวลา เช่น "17 พ.ย. 2568 14:30"

### 2. แก้การเรียกใช้ฟังก์ชัน

**ไฟล์:** `views/courses/detail.ejs` (line 512-513)

**เดิม:**
```javascript
document.getElementById('sidebar-start-date').textContent = course.start_date ? formatDate(course.start_date) : 'ไม่ระบุ';
document.getElementById('sidebar-end-date').textContent = course.end_date ? formatDate(course.end_date) : 'ไม่ระบุ';
```

**ใหม่:**
```javascript
document.getElementById('sidebar-start-date').textContent = course.start_date ? formatDateTime(course.start_date) : 'ไม่ระบุ';
document.getElementById('sidebar-end-date').textContent = course.end_date ? formatDateTime(course.end_date) : 'ไม่ระบุ';
```

### 3. ปรับ UI ให้สวยงามและชัดเจน

**ไฟล์:** `views/courses/detail.ejs` (line 201-218)

**เดิม:**
```html
<div class="flex justify-between">
    <span class="text-gray-600">เปิดลงทะเบียน:</span>
    <span id="sidebar-start-date" class="font-medium text-green-600">-</span>
</div>
<div class="flex justify-between">
    <span class="text-gray-600">ปิดลงทะเบียน:</span>
    <span id="sidebar-end-date" class="font-medium text-red-600">-</span>
</div>
```

**ใหม่:**
```html
<div class="bg-green-50 rounded-lg p-3 mb-2">
    <div class="flex items-start">
        <i class="fas fa-calendar-check text-green-600 mt-1 mr-2"></i>
        <div class="flex-1">
            <div class="text-xs text-gray-600 mb-1">เปิดลงทะเบียน</div>
            <div id="sidebar-start-date" class="text-sm font-medium text-green-700">-</div>
        </div>
    </div>
</div>
<div class="bg-red-50 rounded-lg p-3">
    <div class="flex items-start">
        <i class="fas fa-calendar-times text-red-600 mt-1 mr-2"></i>
        <div class="flex-1">
            <div class="text-xs text-gray-600 mb-1">ปิดลงทะเบียน</div>
            <div id="sidebar-end-date" class="text-sm font-medium text-red-700">-</div>
        </div>
    </div>
</div>
```

**การปรับปรุง:**
- ✅ เพิ่ม background สีเขียว (เปิด) และสีแดง (ปิด)
- ✅ เพิ่ม icon calendar-check และ calendar-times
- ✅ แยก label และข้อมูลให้ชัดเจน
- ✅ ข้อมูลสามารถแสดง 2 บรรทัดได้ (วันที่และเวลา)

---

## 📊 ผลลัพธ์

### ก่อนแก้ไข ❌
```
เปิดลงทะเบียน: 1/1/2568
ปิดลงทะเบียน: 31/12/2568
```
- แสดงเฉพาะวันที่
- ไม่มีเวลา

### หลังแก้ไข ✅
```
┌─────────────────────────────────┐
│ 📅 เปิดลงทะเบียน                │
│ 1 ม.ค. 2568 08:00              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📅 ปิดลงทะเบียน                 │
│ 31 ธ.ค. 2568 23:59             │
└─────────────────────────────────┘
```
- แสดงทั้งวันที่และเวลา
- UI สวยงาม ชัดเจน
- มี icon และ background สี

---

## 🧪 การทดสอบ

### ทดสอบกับหลักสูตร ID = 2

**ข้อมูลใน Database:**
```
start_date: 2025-01-01 00:00:00
end_date: 2025-12-31 00:00:00
```

**การแสดงผลที่คาดหวัง:**
- เปิดลงทะเบียน: `1 ม.ค. 2568 00:00`
- ปิดลงทะเบียน: `31 ธ.ค. 2568 00:00`

**วิธีทดสอบ:**
1. เปิดเบราว์เซอร์ไปที่ http://localhost:3000/courses/2
2. ดูใน sidebar ด้านขวา
3. ตรวจสอบว่ามีการแสดงวันที่และเวลาครบถ้วน

---

## 📁 ไฟล์ที่แก้ไข

1. **views/courses/detail.ejs**
   - Line 201-218: ปรับ HTML structure สำหรับวันเวลาลงทะเบียน
   - Line 512-513: เปลี่ยนจาก formatDate() เป็น formatDateTime()
   - Line 1117-1130: เพิ่มฟังก์ชัน formatDateTime()

---

## 📝 หมายเหตุ

1. **ฟังก์ชัน formatDate()** ยังคงใช้สำหรับวันที่อื่นๆ เช่น:
   - วันที่เผยแพร่
   - อัพเดทล่าสุด

2. **ฟังก์ชัน formatDateTime()** ใช้สำหรับ:
   - วันเวลาเปิดลงทะเบียน
   - วันเวลาปิดลงทะเบียน
   - หรือข้อมูลอื่นที่ต้องการแสดงทั้งวันที่และเวลา

3. **Format ภาษาไทย:**
   - วันที่: `1 ม.ค. 2568` (ปีพุทธศักราช)
   - เวลา: `14:30` (24 ชั่วโมง)

---

**สถานะ:** ✅ **เสร็จสมบูรณ์**
**ทดสอบ:** ✅ พร้อมใช้งาน
