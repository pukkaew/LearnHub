# โครงสร้างองค์กร - Organization Structure Design

## 📋 โครงสร้างที่เสนอ (Hierarchical Organization Structure)

### แบบที่ 1: โครงสร้างแบบลำดับชั้น (Recommended ⭐)

```
บริษัท (Company)
├── สาขา (Branch) - สาขากรุงเทพ, สาขาเชียงใหม่
│   ├── สำนัก (Office/Bureau) - สำนักผู้อำนวยการ
│   │   ├── ฝ่าย (Division) - ฝ่ายบริหาร, ฝ่ายปฏิบัติการ
│   │   │   ├── แผนก (Department) - แผนก HR, แผนกการเงิน
│   │   │   │   └── หน่วย (Section/Unit) - หน่วยสรรหา, หน่วยพัฒนาบุคลากร
```

### โครงสร้างตาราง:

#### 1. `OrganizationLevels` (Master Config)
```sql
CREATE TABLE OrganizationLevels (
    level_id INT IDENTITY(1,1) PRIMARY KEY,
    level_code NVARCHAR(20) NOT NULL UNIQUE,  -- 'COMPANY', 'BRANCH', 'OFFICE', 'DIVISION', 'DEPARTMENT', 'SECTION'
    level_name_th NVARCHAR(50) NOT NULL,      -- 'บริษัท', 'สาขา', 'สำนัก', 'ฝ่าย', 'แผนก', 'หน่วย'
    level_name_en NVARCHAR(50) NOT NULL,      -- 'Company', 'Branch', 'Office', 'Division', 'Department', 'Section'
    level_order INT NOT NULL,                 -- 1=Company, 2=Branch, 3=Office, 4=Division, 5=Department, 6=Section
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);
```

#### 2. `OrganizationUnits` (Universal Table)
```sql
CREATE TABLE OrganizationUnits (
    unit_id INT IDENTITY(1,1) PRIMARY KEY,
    parent_id INT NULL,                       -- Self-referencing FK (NULL = root level)
    level_id INT NOT NULL,                    -- FK to OrganizationLevels

    -- ข้อมูลหน่วยงาน
    unit_code NVARCHAR(20) NOT NULL UNIQUE,   -- 'HQ', 'BKK01', 'HR-001'
    unit_name_th NVARCHAR(100) NOT NULL,
    unit_name_en NVARCHAR(100) NULL,
    unit_abbr NVARCHAR(10) NULL,              -- ชื่อย่อ

    -- ข้อมูลเพิ่มเติม
    description NVARCHAR(500) NULL,
    manager_id INT NULL,                      -- FK to Users (ผู้จัดการ/หัวหน้า)
    cost_center NVARCHAR(20) NULL,            -- รหัสศูนย์ต้นทุน

    -- สถานที่
    address NVARCHAR(500) NULL,
    phone NVARCHAR(20) NULL,
    email NVARCHAR(100) NULL,

    -- Status
    status NVARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MERGED', 'CLOSED')),
    is_active BIT DEFAULT 1,

    -- Audit
    created_at DATETIME2 DEFAULT GETDATE(),
    created_by INT NULL,
    updated_at DATETIME2 DEFAULT GETDATE(),
    updated_by INT NULL,

    CONSTRAINT FK_OrganizationUnits_Parent FOREIGN KEY (parent_id)
        REFERENCES OrganizationUnits(unit_id),
    CONSTRAINT FK_OrganizationUnits_Level FOREIGN KEY (level_id)
        REFERENCES OrganizationLevels(level_id),
    CONSTRAINT FK_OrganizationUnits_Manager FOREIGN KEY (manager_id)
        REFERENCES Users(user_id)
);

CREATE INDEX IX_OrganizationUnits_ParentId ON OrganizationUnits(parent_id);
CREATE INDEX IX_OrganizationUnits_LevelId ON OrganizationUnits(level_id);
CREATE INDEX IX_OrganizationUnits_Status ON OrganizationUnits(status);
```

#### 3. `Positions` (ตำแหน่งงาน - ปรับปรุง)
```sql
-- ตารางเดิมอาจมีอยู่แล้ว ให้เพิ่ม columns
ALTER TABLE Positions ADD position_type NVARCHAR(20) DEFAULT 'EMPLOYEE' CHECK (position_type IN ('EMPLOYEE', 'APPLICANT'));
ALTER TABLE Positions ADD unit_id INT NULL;
ALTER TABLE Positions ADD level NVARCHAR(20) NULL;  -- 'EXECUTIVE', 'MANAGER', 'SUPERVISOR', 'STAFF'
ALTER TABLE Positions ADD is_active BIT DEFAULT 1;

-- หรือสร้างใหม่
CREATE TABLE Positions (
    position_id INT IDENTITY(1,1) PRIMARY KEY,
    unit_id INT NULL,                         -- FK to OrganizationUnits (optional)

    -- ข้อมูลตำแหน่ง
    position_code NVARCHAR(20) NOT NULL UNIQUE,
    position_name_th NVARCHAR(100) NOT NULL,
    position_name_en NVARCHAR(100) NULL,
    position_type NVARCHAR(20) DEFAULT 'EMPLOYEE' CHECK (position_type IN ('EMPLOYEE', 'APPLICANT')),

    -- ระดับตำแหน่ง
    position_level NVARCHAR(20) NULL,         -- 'EXECUTIVE', 'MANAGER', 'SUPERVISOR', 'OFFICER', 'STAFF'
    job_grade NVARCHAR(10) NULL,              -- 'M1', 'M2', 'S1', 'S2', 'O1'

    -- คำอธิบาย
    description NVARCHAR(500) NULL,
    responsibilities NVARCHAR(MAX) NULL,      -- JSON or text
    requirements NVARCHAR(MAX) NULL,          -- คุณสมบัติที่ต้องการ

    -- เงินเดือน (ถ้าต้องการ)
    min_salary DECIMAL(10,2) NULL,
    max_salary DECIMAL(10,2) NULL,

    -- Status
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT FK_Positions_Unit FOREIGN KEY (unit_id)
        REFERENCES OrganizationUnits(unit_id)
);

CREATE INDEX IX_Positions_UnitId ON Positions(unit_id);
CREATE INDEX IX_Positions_Type ON Positions(position_type);
```

#### 4. ปรับปรุง `Users` Table
```sql
ALTER TABLE Users ADD unit_id INT NULL;  -- FK to OrganizationUnits (แทน department_id)

-- เพิ่ม FK constraint
ALTER TABLE Users ADD CONSTRAINT FK_Users_OrganizationUnit
    FOREIGN KEY (unit_id) REFERENCES OrganizationUnits(unit_id);
```

---

## 🎯 Use Cases

### สำหรับพนักงาน (EMPLOYEE):
```javascript
// ตัวอย่าง: พนักงาน HR
{
  user_type: 'EMPLOYEE',
  employee_id: 'EMP001',
  unit_id: 45,  // แผนก HR (Department level)
  position_id: 10,  // ตำแหน่ง: HR Officer

  // แสดงโครงสร้าง:
  // บริษัท รักชัยห้องเย็น > สาขากรุงเทพ > สำนักบริหาร > ฝ่ายทรัพยากรบุคคล > แผนก HR
}
```

### สำหรับผู้สมัครงาน (APPLICANT):
```javascript
// ตัวอย่าง: ผู้สมัครตำแหน่ง HR Officer
{
  user_type: 'APPLICANT',
  id_card_number: '1234567890123',
  applied_position: 'HR Officer',  // text field (simple)

  // หรือใช้ position_id (recommended)
  position_id: 10,  // FK to Positions (where position_type = 'APPLICANT')
}
```

---

## 📊 ตัวอย่างข้อมูล

### OrganizationLevels:
| level_id | level_code | level_name_th | level_order |
|----------|------------|---------------|-------------|
| 1 | COMPANY | บริษัท | 1 |
| 2 | BRANCH | สาขา | 2 |
| 3 | OFFICE | สำนัก | 3 |
| 4 | DIVISION | ฝ่าย | 4 |
| 5 | DEPARTMENT | แผนก | 5 |
| 6 | SECTION | หน่วย | 6 |

### OrganizationUnits:
| unit_id | parent_id | level_id | unit_code | unit_name_th |
|---------|-----------|----------|-----------|--------------|
| 1 | NULL | 1 | RUXCHAI | บริษัท รักชัยห้องเย็น จำกัด |
| 2 | 1 | 2 | BKK | สาขากรุงเทพ |
| 3 | 2 | 3 | ADMIN | สำนักบริหาร |
| 4 | 3 | 4 | HR-DIV | ฝ่ายทรัพยากรบุคคล |
| 5 | 4 | 5 | HR-DEPT | แผนกทรัพยากรบุคคล |
| 6 | 5 | 6 | HR-RECRUIT | หน่วยสรรหาและคัดเลือก |

### Positions:
| position_id | unit_id | position_code | position_name_th | position_type | position_level |
|-------------|---------|---------------|------------------|---------------|----------------|
| 1 | 5 | HR-MGR | ผู้จัดการแผนก HR | EMPLOYEE | MANAGER |
| 2 | 6 | HR-OFF | เจ้าหน้าที่ HR | EMPLOYEE | OFFICER |
| 3 | NULL | HR-OFF-RECRUIT | เจ้าหน้าที่สรรหา (รับสมัคร) | APPLICANT | OFFICER |

---

## 🔄 Migration Strategy

### Option A: แทนที่ทั้งหมด (Full Migration) ⭐ Recommended
1. สร้างตารางใหม่ `OrganizationLevels` และ `OrganizationUnits`
2. Migrate ข้อมูลจาก `Departments` → `OrganizationUnits`
3. ปรับปรุง `Users.department_id` → `Users.unit_id`
4. ปรับปรุง `Positions` table

### Option B: ทำงานควบคู่กัน (Hybrid)
1. เก็บ `Departments` และ `Positions` เดิมไว้
2. เพิ่มตารางใหม่สำหรับโครงสร้างที่ซับซ้อน
3. ใช้ view หรือ computed field เชื่อมข้อมูล

---

## ✅ ข้อดีของโครงสร้างนี้

1. **ยืดหยุ่น**: เพิ่ม/ลดระดับได้ตามต้องการ
2. **มาตรฐาน**: ใช้ Hierarchical Structure (Parent-Child)
3. **Scalable**: รองรับบริษัทหลายสาขา/หลายประเทศ
4. **แยกชัดเจน**: พนักงาน vs ผู้สมัคร
5. **Query ง่าย**: ใช้ Recursive CTE หาโครงสร้างทั้งหมด

---

## 🎯 คำถามสำหรับคุณ:

1. **ต้องการใช้โครงสร้างแบบไหน?**
   - แบบ A: ยืดหยุ่น (OrganizationUnits) ⭐ แนะนำ
   - แบบ B: แยกตารางแต่ละระดับ (Companies, Branches, Divisions, etc.)

2. **ผู้สมัครงาน (Applicant) ควรมี Position แบบไหน?**
   - แบบ A: ใช้ `position_id` (FK to Positions where type=APPLICANT)
   - แบบ B: ใช้ `applied_position` (text field) - ง่ายกว่า

3. **ต้องการ Migrate ข้อมูลเดิมไหม?**
   - Departments → OrganizationUnits
   - หรือเก็บทั้งสองระบบ?

ตอบมาได้เลยครับ แล้วผมจะสร้าง migration และ code ให้เลย! 🚀
