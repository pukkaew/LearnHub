# แก้ไข: HR และ Admin สามารถแก้ไขคอร์สได้

**วันที่:** 17 พฤศจิกายน 2025

---

## 🔍 ปัญหา

**HR หรือ Admin ควรแก้ไขคอร์สได้**

### สถานะเดิม:
- ✅ Admin สามารถแก้ไขคอร์สได้
- ✅ Instructor สามารถแก้ไขคอร์สได้
- ❌ **HR ไม่สามารถแก้ไขคอร์สได้**

### ที่มาของปัญหา:
Routes สำหรับการแก้ไขคอร์สไม่รวม role 'HR'

---

## ✅ การแก้ไข

### 1. เพิ่ม 'HR' role ใน Routes

**ไฟล์:** `routes/courseRoutes.js`

#### 1.1 เส้นทางสำหรับหน้าสร้างคอร์ส (Line 12)

**เดิม:**
```javascript
router.get('/create', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.renderCreateCourse);
```

**ใหม่:**
```javascript
router.get('/create', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.renderCreateCourse);
```

#### 1.2 เส้นทางสำหรับหน้าแก้ไขคอร์ส (Line 14)

**เดิม:**
```javascript
router.get('/:course_id/edit', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.renderEditCourse);
```

**ใหม่:**
```javascript
router.get('/:course_id/edit', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.renderEditCourse);
```

#### 1.3 API สำหรับสร้างคอร์ส (Line 26)

**เดิม:**
```javascript
router.post('/api/create', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.createCourse);
```

**ใหม่:**
```javascript
router.post('/api/create', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.createCourse);
```

#### 1.4 API สำหรับอัพเดทคอร์ส (Line 30)

**เดิม:**
```javascript
router.put('/api/:course_id', authMiddleware.requireRole(['Admin', 'Instructor']), courseController.updateCourse);
```

**ใหม่:**
```javascript
router.put('/api/:course_id', authMiddleware.requireRole(['Admin', 'Instructor', 'HR']), courseController.updateCourse);
```

---

### 2. เพิ่มปุ่ม "แก้ไขคอร์ส" ในหน้า Detail

**ไฟล์:** `views/courses/detail.ejs` (Line 649-714)

**เพิ่มโค้ด:**
```javascript
function updateEnrollmentStatus(course) {
    const container = document.getElementById('enrollment-status');
    const userRole = '<%= userRole %>';
    const canEdit = ['Admin', 'Instructor', 'HR'].includes(userRole);

    // ... existing code ...

    // เพิ่มปุ่มแก้ไขในทุก enrollment status
    ${canEdit ? `
        <a href="/courses/${course.course_id}/edit" class="btn-ruxchai-outline w-full text-center block">
            <i class="fas fa-edit mr-2"></i>แก้ไขคอร์ส
        </a>
    ` : ''}
}
```

**การเปลี่ยนแปลง:**
- ✅ เช็ค userRole จาก EJS template
- ✅ ตรวจสอบว่าเป็น Admin, Instructor หรือ HR
- ✅ แสดงปุ่ม "แก้ไขคอร์ส" ถ้ามีสิทธิ์
- ✅ เพิ่มปุ่มในทุก enrollment status (active, completed, not enrolled)

---

## 📊 ผลลัพธ์

### ผู้ใช้งาน Admin, Instructor, HR ✅
- สามารถเข้าถึงหน้าสร้างคอร์ส: `/courses/create`
- สามารถเข้าถึงหน้าแก้ไขคอร์ส: `/courses/:course_id/edit`
- เห็นปุ่ม "แก้ไขคอร์ส" ในหน้า detail
- สามารถเรียก API สร้างและอัพเดทคอร์สได้

### ผู้ใช้งาน Employee, Student ❌
- ไม่เห็นปุ่ม "แก้ไขคอร์ส"
- ไม่สามารถเข้าถึงหน้าแก้ไข (ถูกบล็อคโดย middleware)

---

## 🎨 ตำแหน่งปุ่ม "แก้ไขคอร์ส"

ปุ่มจะแสดงใน **Enrollment Card** (sidebar) ของหน้า detail:

### กรณี: ยังไม่ได้ลงทะเบียน
```
┌─────────────────────────┐
│  📚 เริ่มเรียนคอร์สนี้   │
├─────────────────────────┤
│ [ลงทะเบียนเรียน]        │
│ [แก้ไขคอร์ส] ← เพิ่มใหม่ │
└─────────────────────────┘
```

### กรณี: ลงทะเบียนแล้ว
```
┌─────────────────────────┐
│  🎓 คุณได้ลงทะเบียนเรียนแล้ว│
├─────────────────────────┤
│ [เข้าเรียน]              │
│ [แก้ไขคอร์ส] ← เพิ่มใหม่ │
└─────────────────────────┘
```

### กรณี: เรียนจบแล้ว
```
┌─────────────────────────┐
│  🏆 เรียนจบแล้ว          │
├─────────────────────────┤
│ [ดาวน์โหลดใบประกาศนียบัตร]│
│ [ให้คะแนนคอร์ส]         │
│ [แก้ไขคอร์ส] ← เพิ่มใหม่ │
└─────────────────────────┘
```

---

## 🧪 วิธีทดสอบ

### 1. ทดสอบด้วย HR User
```bash
# 1. Login ด้วย user ที่มี role = 'HR'
# 2. ไปที่หน้ารายการคอร์ส: http://localhost:3000/courses
# 3. คลิกเข้าดูคอร์สใดก็ได้
# 4. ตรวจสอบว่าเห็นปุ่ม "แก้ไขคอร์ส" ใน sidebar
# 5. คลิกปุ่ม "แก้ไขคอร์ส" และตรวจสอบว่าเข้าหน้าแก้ไขได้
```

### 2. ทดสอบด้วย Admin User
```bash
# 1. Login ด้วย user ที่มี role = 'Admin'
# 2. ทำตามขั้นตอนเดียวกับ HR
# 3. ตรวจสอบว่าสามารถแก้ไขคอร์สได้
```

### 3. ทดสอบด้วย Employee/Student User
```bash
# 1. Login ด้วย user ที่มี role = 'Employee' หรือ 'Student'
# 2. ไปที่หน้า detail ของคอร์ส
# 3. ตรวจสอบว่า **ไม่เห็น** ปุ่ม "แก้ไขคอร์ส"
```

### 4. ทดสอบ Direct Access
```bash
# พยายามเข้า URL โดยตรง
http://localhost:3000/courses/1/edit

# ถ้าไม่มีสิทธิ์ ควร redirect หรือแสดง error
```

---

## 📁 ไฟล์ที่แก้ไข

### 1. `routes/courseRoutes.js`
- **Line 12:** เพิ่ม 'HR' ใน `/create` route
- **Line 14:** เพิ่ม 'HR' ใน `/:course_id/edit` route
- **Line 26:** เพิ่ม 'HR' ใน `/api/create` route
- **Line 30:** เพิ่ม 'HR' ใน `/api/:course_id` PUT route

### 2. `views/courses/detail.ejs`
- **Line 651-652:** เพิ่มการเช็ค userRole และ canEdit
- **Line 669-673:** เพิ่มปุ่มแก้ไขสำหรับ enrollment status = 'active'
- **Line 689-693:** เพิ่มปุ่มแก้ไขสำหรับ enrollment status = 'completed'
- **Line 706-710:** เพิ่มปุ่มแก้ไขสำหรับผู้ที่ยังไม่ได้ลงทะเบียน

---

## 📝 หมายเหตุ

### Roles ที่สามารถแก้ไขคอร์สได้:
1. **Admin** - สามารถแก้ไขคอร์สทุกคอร์ส
2. **Instructor** - สามารถแก้ไขคอร์สที่ตนเองเป็นผู้สอน (ถ้ามี logic เช็ค)
3. **HR** - สามารถแก้ไขคอร์สทุกคอร์ส (เพิ่มใหม่)

### ข้อควรระวัง:
- ⚠️ ตรวจสอบ business logic ว่า **HR ควรแก้ไขคอร์สของ Instructor อื่นได้หรือไม่**
- ⚠️ หากต้องการให้ Instructor แก้ไขได้แค่คอร์สของตนเอง ต้องเพิ่ม logic ใน controller
- ⚠️ ปุ่มแก้ไขจะแสดงในทุก enrollment status (แม้จะยังไม่ได้ลงทะเบียน)

### การปรับแต่งเพิ่มเติม:

#### ถ้าต้องการให้ Instructor แก้ไขได้แค่คอร์สของตนเอง:
**ไฟล์:** `controllers/courseController.js`
```javascript
async renderEditCourse(req, res) {
    const { course_id } = req.params;
    const course = await Course.findById(course_id);

    // เช็คว่าเป็น Instructor และไม่ใช่เจ้าของคอร์ส
    if (req.user.role_name === 'Instructor' &&
        course.instructor_id !== req.user.user_id) {
        return res.status(403).json({
            success: false,
            message: 'คุณไม่มีสิทธิ์แก้ไขคอร์สนี้'
        });
    }

    // ... rest of the code
}
```

---

## ✅ สรุป

- ✅ เพิ่ม HR role ใน 4 routes (create, edit, api/create, api/update)
- ✅ เพิ่มปุ่ม "แก้ไขคอร์ส" ในหน้า detail สำหรับ Admin, Instructor, HR
- ✅ ปุ่มจะแสดงในทุก enrollment status
- ✅ ผู้ใช้ที่ไม่มีสิทธิ์จะไม่เห็นปุ่ม
- ✅ Middleware จะบล็อคการเข้าถึง URL โดยตรงถ้าไม่มีสิทธิ์

**สถานะ:** ✅ **เสร็จสมบูรณ์**
**ทดสอบ:** พร้อมใช้งาน - Login ด้วย HR user และเข้าดูหน้า detail ของคอร์สใดก็ได้
