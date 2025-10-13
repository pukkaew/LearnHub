# 📋 โครงสร้างองค์กรและตำแหน่งงาน (Organization & Position Structure)

## 🏢 1. Organization Units (หน่วยงาน)

### โครงสร้างตาราง: `OrganizationUnits`
```
unit_id (PK)           - รหัสหน่วยงาน
parent_id (FK)         - รหัสหน่วยงานแม่ (NULL = ระดับบนสุด)
level_id (FK)          - รหัสระดับองค์กร (→ OrganizationLevels)
unit_code              - รหัสหน่วยงาน (เช่น BR001, OFF001)
unit_name_th           - ชื่อหน่วยงาน (ไทย)
unit_name_en           - ชื่อหน่วยงาน (อังกฤษ)
unit_abbr              - ชื่อย่อ
description            - รายละเอียด
manager_id (FK)        - รหัสผู้จัดการ (→ Users)
cost_center            - ศูนย์ต้นทุน
address, phone, email  - ข้อมูลติดต่อ
status                 - สถานะ (ACTIVE/INACTIVE)
is_active              - ใช้งานอยู่หรือไม่
```

### ลำดับชั้นองค์กร (Hierarchy)
```
สาขา (BRANCH) - level_order: 1
  └── สำนัก (OFFICE) - level_order: 2
      └── ฝ่าย (DIVISION) - level_order: 3
          └── แผนก (DEPARTMENT) - level_order: 4
```

### ตัวอย่างข้อมูล
```
สาขากรุงเทพ (BRANCH)
  ├── สำนักบริหาร (OFFICE)
  │   ├── ฝ่ายทรัพยากรบุคคล (DIVISION)
  │   │   ├── แผนกสรรหา (DEPARTMENT)
  │   │   └── แผนกพัฒนาบุคลากร (DEPARTMENT)
  │   └── ฝ่ายการเงิน (DIVISION)
  │       ├── แผนกบัญชี (DEPARTMENT)
  │       └── แผนกการเงิน (DEPARTMENT)
  └── สำนักปฏิบัติการ (OFFICE)
      └── ฝ่ายผลิต (DIVISION)
          └── แผนกควบคุมคุณภาพ (DEPARTMENT)
```

---

## 👔 2. Positions (ตำแหน่งงาน)

### โครงสร้างตาราง: `Positions`
```
position_id (PK)       - รหัสตำแหน่ง
unit_id (FK)           - สังกัดแผนก (→ OrganizationUnits ที่เป็น DEPARTMENT เท่านั้น!)
position_code          - รหัสตำแหน่ง
position_name_th       - ชื่อตำแหน่ง (ไทย)
position_name_en       - ชื่อตำแหน่ง (อังกฤษ)
position_type          - ประเภท (EMPLOYEE/APPLICANT)
position_level         - ระดับตำแหน่ง (EXECUTIVE/MANAGER/STAFF/etc.)
job_grade              - เกรดงาน (1-10)
description            - รายละเอียดงาน
responsibilities       - หน้าที่ความรับผิดชอบ
requirements           - คุณสมบัติผู้สมัคร
min_salary, max_salary - เงินเดือน
status, is_active      - สถานะ
```

### การเชื่อมโยง ⚠️ สำคัญ!
- **1 ตำแหน่ง → สังกัด 1 แผนก** (unit_id ต้องเป็น DEPARTMENT)
- **1 แผนก → มีได้หลายตำแหน่ง**
- **ตำแหน่งไม่สามารถสังกัดสาขา/สำนัก/ฝ่าย ได้!**

### ตัวอย่าง
```
แผนกสรรหา (DEPARTMENT - unit_id: 10)
  ├── หัวหน้าแผนกสรรหา (position_id: 1, unit_id: 10)
  ├── นักสรรหาอาวุโส (position_id: 2, unit_id: 10)
  └── นักสรรหา (position_id: 3, unit_id: 10)

⚠️ ห้ามสร้างตำแหน่งที่สังกัด:
❌ สาขากรุงเทพ (BRANCH)
❌ สำนักบริหาร (OFFICE)
❌ ฝ่ายทรัพยากรบุคคล (DIVISION)
✅ แผนกสรรหา (DEPARTMENT) ← ได้เท่านั้น!
```

---

## 👥 3. Users/Employees (พนักงาน)

### โครงสร้างตาราง: `Users`
```
user_id (PK)           - รหัสผู้ใช้
employee_id            - รหัสพนักงาน (EMP001)
department_id (FK)     - สังกัดหน่วยงาน (→ OrganizationUnits.unit_id)
position_id (FK)       - ดำรงตำแหน่ง (→ Positions.position_id)
first_name, last_name  - ชื่อ-นามสกุล
email, phone           - ข้อมูลติดต่อ
role                   - บทบาทในระบบ (admin/hr/manager/employee)
status, is_active      - สถานะ
```

### การเชื่อมโยง
- **1 พนักงาน → สังกัด 1 หน่วยงาน** (department_id)
- **1 พนักงาน → ดำรง 1 ตำแหน่ง** (position_id)
- **ตำแหน่งที่พนักงานดำรง ต้องสังกัดหน่วยงานเดียวกับพนักงาน**

### ตัวอย่างข้อมูล
```sql
-- พนักงาน "สมชาย ใจดี"
user_id: 100
employee_id: 'EMP100'
department_id: 10          -- สังกัด "แผนกสรรหา"
position_id: 1             -- ดำรงตำแหน่ง "หัวหน่วยแผนกสรรหา"

-- โดยตำแหน่ง "หัวหน้าแผนกสรรหา" (position_id: 1)
-- ก็สังกัดหน่วยงาน "แผนกสรรหา" (unit_id: 10) เช่นกัน
```

---

## 🔄 4. กระบวนการทำงาน (Workflows)

### 4.1 เพิ่มพนักงานใหม่
```
1. เลือกประเภทผู้ใช้: พนักงาน
2. เลือกหน่วยงาน (cascade):
   - เลือกสาขา (BRANCH) → โหลดสำนัก
   - เลือกสำนัก (OFFICE) → โหลดฝ่าย
   - เลือกฝ่าย (DIVISION) → โหลดแผนก
   - เลือกแผนก (DEPARTMENT) ← บังคับเลือก
3. เลือกตำแหน่ง:
   - API filter ตำแหน่งที่สังกัดแผนกที่เลือก (unit_id = แผนกที่เลือก)
4. กรอกข้อมูลอื่นๆ และบันทึก
```

### 4.2 Cascade Dropdown
```javascript
// ฟังก์ชันที่ใช้ใน views/users/index.ejs

loadOrganizationUnits()        → โหลดสาขาทั้งหมด
loadOfficesByBranch(branchId)  → โหลดสำนักภายใต้สาขา
loadDivisionsByOffice(officeId) → โหลดฝ่ายภายใต้สำนัก
loadDepartmentsByDivision(divId) → โหลดแผนกภายใต้ฝ่าย

// API Endpoint
GET /organization/api/units/{id}/children
→ ดึงหน่วยงานลูกทั้งหมดของ parent_id ที่ระบุ
```

### 4.3 Filter ตำแหน่งตามหน่วยงาน
```javascript
// เมื่อเลือกแผนกเสร็จ จะโหลดตำแหน่งที่สังกัดแผนกนั้น
GET /organization/positions/api/list?unit_id={department_id}

// ตัวอย่าง: เลือกแผนกสรรหา (unit_id: 10)
// จะได้ตำแหน่ง:
// - หัวหน้าแผนกสรรหา
// - นักสรรหาอาวุโส
// - นักสรรหา
```

---

## 📊 5. Queries ที่สำคัญ

### 5.1 ดึงโครงสร้างองค์กรแบบ Tree
```sql
WITH UnitTree AS (
    -- Root units (ไม่มี parent)
    SELECT unit_id, parent_id, unit_name_th, level_id, 0 as depth
    FROM OrganizationUnits
    WHERE parent_id IS NULL

    UNION ALL

    -- Children units (recursive)
    SELECT ou.unit_id, ou.parent_id, ou.unit_name_th, ou.level_id, ut.depth + 1
    FROM OrganizationUnits ou
    INNER JOIN UnitTree ut ON ou.parent_id = ut.unit_id
)
SELECT * FROM UnitTree ORDER BY depth, unit_name_th
```

### 5.2 ดึง Breadcrumb Path
```sql
WITH UnitPath AS (
    -- เริ่มจากหน่วยงานที่เลือก
    SELECT unit_id, parent_id, unit_name_th, 0 as level
    FROM OrganizationUnits
    WHERE unit_id = @unitId

    UNION ALL

    -- ขึ้นไปหา parent
    SELECT ou.unit_id, ou.parent_id, ou.unit_name_th, up.level + 1
    FROM OrganizationUnits ou
    INNER JOIN UnitPath up ON ou.unit_id = up.parent_id
)
SELECT * FROM UnitPath ORDER BY level DESC
-- ผลลัพธ์: สาขากรุงเทพ > สำนักบริหาร > ฝ่าย HR > แผนกสรรหา
```

### 5.3 ดึงตำแหน่งตามหน่วยงาน
```sql
SELECT p.*
FROM Positions p
WHERE p.unit_id = @departmentId
  AND p.is_active = 1
  AND p.position_type = 'EMPLOYEE'
ORDER BY p.position_level, p.position_name_th
```

---

## 🎯 6. Business Rules

### กฎสำคัญ:
1. **Hierarchy Validation**: หน่วยงานต้องมี parent ที่ถูกต้องตามลำดับชั้น
   - OFFICE → parent ต้องเป็น BRANCH
   - DIVISION → parent ต้องเป็น OFFICE
   - DEPARTMENT → parent ต้องเป็น DIVISION

2. **Position-Unit Matching**: ตำแหน่งของพนักงาน (position_id) ต้องสังกัดหน่วยงานเดียวกับพนักงาน (department_id)
   ```sql
   -- Validation check
   SELECT 1
   FROM Users u
   JOIN Positions p ON u.position_id = p.position_id
   WHERE u.user_id = @userId
     AND p.unit_id = u.department_id  -- ต้อง match กัน
   ```

3. **Soft Delete**: ห้ามลบหน่วยงานที่:
   - มีหน่วยงานลูก (children) ที่ active
   - มีพนักงานที่ active

4. **Manager Assignment**: ผู้จัดการหน่วยงาน (manager_id) ต้องเป็นพนักงานที่สังกัดหน่วยงานนั้น หรือหน่วยงานแม่

---

## 📝 7. API Endpoints Summary

### Organization Units
```
GET    /organization                    - หน้าจัดการองค์กร
GET    /organization/api/units          - ดึงหน่วยงานทั้งหมด
GET    /organization/api/units/:id      - ดึงหน่วยงานตาม ID
GET    /organization/api/units/:id/children - ดึงหน่วยงานลูก
GET    /organization/api/levels         - ดึงระดับองค์กรทั้งหมด
GET    /organization/api/tree           - ดึงโครงสร้างแบบ tree
POST   /organization/create             - สร้างหน่วยงานใหม่
PUT    /organization/:id                - แก้ไขหน่วยงาน
DELETE /organization/:id                - ลบหน่วยงาน (soft delete)
```

### Positions
```
GET    /organization/positions                      - หน้าจัดการตำแหน่ง
GET    /organization/positions/api/list            - ดึงตำแหน่งทั้งหมด
GET    /organization/positions/api/list?unit_id=X  - ดึงตำแหน่งตามหน่วยงาน
POST   /organization/positions/create              - สร้างตำแหน่งใหม่
PUT    /organization/positions/:id                 - แก้ไขตำแหน่ง
DELETE /organization/positions/:id                 - ลบตำแหน่ง
```

---

## 🔧 8. ฟังก์ชันช่วยเหลือ (Helper Functions)

### JavaScript (Client-side)
```javascript
// Cascade load organization units
async function loadOfficesByBranch(branchId) {
    const response = await fetch(`/organization/api/units/${branchId}/children`);
    const data = await response.json();
    // Populate office dropdown
}

// Load positions by unit
async function loadPositionsByUnit(unitId) {
    const response = await fetch(`/organization/positions/api/list?unit_id=${unitId}`);
    const data = await response.json();
    // Populate position dropdown
}
```

### SQL Server (Stored Procedures)
```sql
-- อาจสร้าง SP เพื่อ validate hierarchy
CREATE PROCEDURE ValidateUnitHierarchy
    @unitId INT,
    @parentId INT,
    @levelId INT
AS
BEGIN
    -- Check if parent level is correct
    -- Return success or error
END
```
