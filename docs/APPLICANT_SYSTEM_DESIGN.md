# Applicant System Design Document

## 1. Database Schema Standard

### Naming Convention (ตามมาตรฐาน SQL Server + .NET)
- **Tables**: PascalCase (e.g., `Users`, `TestAssignments`, `ApplicantTests`)
- **Columns**: snake_case (e.g., `user_id`, `test_id`, `assigned_date`)
- **Indexes**: `IX_TableName_ColumnName` (e.g., `IX_Users_user_type`)
- **Foreign Keys**: `FK_ChildTable_ParentTable_ColumnName`
- **Primary Keys**: `PK_TableName`

---

## 2. Current Schema Analysis

### ✅ Existing Tables (ที่ต้องใช้):
1. **Users** - แก้ไขเพิ่ม fields สำหรับ applicant (✅ Done)
   - user_type (EMPLOYEE/APPLICANT)
   - id_card_number (13 digits, unique)
   - applied_position
   - auto_disable_after_test

2. **Tests** - ข้อสอบหลัก (⚠️ ต้องแก้ให้ consistent)
3. **TestResults** - ผลสอบ (⚠️ ต้องแก้ให้ consistent)
4. **UserCourses** - การลงทะเบียนคอร์ส (ใช้สำหรับ EMPLOYEE)

---

## 3. Proposed Solution for Applicant System

### Option A: Separate Applicant Tables (Recommended ⭐)
**เหตุผล**:
- แยก context ชัดเจนระหว่าง Employee Learning กับ Applicant Testing
- ป้องกัน data pollution
- ง่ายต่อการ audit และ report
- ตามมาตรฐาน ATS (Applicant Tracking System)

**Tables ใหม่**:

#### 3.1 `ApplicantTestAssignments`
```sql
CREATE TABLE ApplicantTestAssignments (
    assignment_id INT IDENTITY(1,1) PRIMARY KEY,
    applicant_id INT NOT NULL,  -- FK to Users (where user_type = 'APPLICANT')
    test_id INT NOT NULL,  -- FK to Tests
    assigned_by INT NOT NULL,  -- FK to Users (HR who assigned)
    assigned_date DATETIME2 DEFAULT GETDATE(),
    due_date DATETIME2 NULL,
    status NVARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
    is_active BIT DEFAULT 1,

    CONSTRAINT FK_ApplicantTestAssignments_Users_Applicant FOREIGN KEY (applicant_id)
        REFERENCES Users(user_id),
    CONSTRAINT FK_ApplicantTestAssignments_Tests FOREIGN KEY (test_id)
        REFERENCES Tests(test_id),
    CONSTRAINT FK_ApplicantTestAssignments_Users_AssignedBy FOREIGN KEY (assigned_by)
        REFERENCES Users(user_id),

    -- Unique constraint: ผู้สมัคร 1 คนทำแต่ละข้อสอบได้ครั้งเดียว
    CONSTRAINT UQ_ApplicantTestAssignments_Applicant_Test UNIQUE (applicant_id, test_id)
);

CREATE INDEX IX_ApplicantTestAssignments_ApplicantId ON ApplicantTestAssignments(applicant_id);
CREATE INDEX IX_ApplicantTestAssignments_Status ON ApplicantTestAssignments(status);
```

#### 3.2 `ApplicantTestResults`
```sql
CREATE TABLE ApplicantTestResults (
    result_id INT IDENTITY(1,1) PRIMARY KEY,
    assignment_id INT NOT NULL,  -- FK to ApplicantTestAssignments
    applicant_id INT NOT NULL,  -- FK to Users
    test_id INT NOT NULL,  -- FK to Tests

    -- Test attempt info
    started_at DATETIME2 NULL,
    completed_at DATETIME2 NULL,
    time_taken_seconds INT NULL,

    -- Scoring
    total_questions INT NOT NULL,
    correct_answers INT DEFAULT 0,
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    passed BIT DEFAULT 0,

    -- Answers (JSON format)
    answers NVARCHAR(MAX) NULL,  -- JSON array of {question_id, selected_option, is_correct}

    -- Proctoring info
    ip_address NVARCHAR(45) NULL,
    browser_info NVARCHAR(500) NULL,
    proctoring_flags NVARCHAR(MAX) NULL,  -- JSON array of suspicious activities

    -- Review
    reviewed BIT DEFAULT 0,
    reviewed_by INT NULL,
    reviewed_at DATETIME2 NULL,
    feedback NVARCHAR(MAX) NULL,

    CONSTRAINT FK_ApplicantTestResults_Assignments FOREIGN KEY (assignment_id)
        REFERENCES ApplicantTestAssignments(assignment_id),
    CONSTRAINT FK_ApplicantTestResults_Users FOREIGN KEY (applicant_id)
        REFERENCES Users(user_id),
    CONSTRAINT FK_ApplicantTestResults_Tests FOREIGN KEY (test_id)
        REFERENCES Tests(test_id),
    CONSTRAINT FK_ApplicantTestResults_ReviewedBy FOREIGN KEY (reviewed_by)
        REFERENCES Users(user_id)
);

CREATE INDEX IX_ApplicantTestResults_ApplicantId ON ApplicantTestResults(applicant_id);
CREATE INDEX IX_ApplicantTestResults_TestId ON ApplicantTestResults(test_id);
CREATE INDEX IX_ApplicantTestResults_Passed ON ApplicantTestResults(passed);
```

#### 3.3 `ApplicantNotes` (HR notes about applicants)
```sql
CREATE TABLE ApplicantNotes (
    note_id INT IDENTITY(1,1) PRIMARY KEY,
    applicant_id INT NOT NULL,
    created_by INT NOT NULL,  -- HR user
    note_text NVARCHAR(MAX) NOT NULL,
    note_type NVARCHAR(20) DEFAULT 'GENERAL' CHECK (note_type IN ('GENERAL', 'INTERVIEW', 'TEST_REVIEW', 'DECISION')),
    created_at DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT FK_ApplicantNotes_Users_Applicant FOREIGN KEY (applicant_id)
        REFERENCES Users(user_id),
    CONSTRAINT FK_ApplicantNotes_Users_CreatedBy FOREIGN KEY (created_by)
        REFERENCES Users(user_id)
);

CREATE INDEX IX_ApplicantNotes_ApplicantId ON ApplicantNotes(applicant_id);
```

---

### Option B: Reuse Existing Tables (Not Recommended ⚠️)
**ปัญหา**:
- Mixed context (Employee learning + Applicant testing)
- Hard to report separately
- Risk of data conflicts
- Violation of separation of concerns

---

## 4. Login System Modification

### Current Login Flow:
```javascript
// controllers/authController.js
// Currently uses: employee_id + password
```

### Proposed New Flow:
```javascript
async login(req, res) {
    const { username, password } = req.body;

    // Try to find user by employee_id first (for EMPLOYEE)
    let user = await User.findByEmployeeId(username);

    // If not found, try id_card_number (for APPLICANT)
    if (!user) {
        user = await User.findByIdCardNumber(username);
    }

    // Rest of authentication logic...
}
```

**Standards**:
- Username ไม่ case-sensitive
- ID card number validation (13 digits, checksum)
- Rate limiting for failed attempts

---

## 5. Auto-Disable After Test Logic

### Trigger Point:
When `ApplicantTestResults.completed_at` is set AND all assigned tests completed

### Implementation:
```javascript
// In Test submission handler
async function handleApplicantTestSubmission(applicantId, testId) {
    // 1. Save test result
    await ApplicantTestResult.create({...});

    // 2. Update assignment status
    await ApplicantTestAssignment.updateStatus(assignmentId, 'COMPLETED');

    // 3. Check if user has auto_disable flag
    const user = await User.findById(applicantId);
    if (!user.auto_disable_after_test) return;

    // 4. Check if ALL assigned tests are completed
    const pendingTests = await ApplicantTestAssignment.countPending(applicantId);
    if (pendingTests === 0) {
        // 5. Auto-disable the account
        await User.updateStatus(applicantId, 'DISABLED');

        // 6. Log activity
        await ActivityLog.create({
            user_id: applicantId,
            action: 'Auto_Disabled_After_Test',
            description: 'Account auto-disabled after completing all assigned tests'
        });
    }
}
```

---

## 6. HR Management Pages

### 6.1 Manage Applicants List
**Route**: `/hr/applicants`

**Features**:
- List all applicants with filters (status, position, test results)
- Add new applicant
- Assign tests
- View test results
- Enable/Disable account
- Add notes

**Columns**:
| Name | ID Card | Position | Assigned Tests | Completed | Passed | Status | Actions |
|------|---------|----------|----------------|-----------|--------|--------|---------|

### 6.2 Add/Edit Applicant
**Route**: `/hr/applicants/add` and `/hr/applicants/:id/edit`

**Fields**:
- First Name, Last Name (Thai & English)
- ID Card Number (13 digits, auto-validate)
- Email, Phone
- Applied Position (dropdown from positions table)
- Initial Password (auto-generate option)
- Auto-disable after test (checkbox)

### 6.3 Assign Tests
**Route**: `/hr/applicants/:id/assign-tests`

**Features**:
- Multi-select from available tests
- Set due date (optional)
- Preview assigned tests
- Remove assignments

---

## 7. Applicant Dashboard

### Layout:
```
+----------------------------------+
| Welcome, [Applicant Name]        |
| Position: [Applied Position]     |
+----------------------------------+
| 📝 Your Assigned Tests           |
+----------------------------------+
| Test Name | Status | Due Date   |
| --------- | ------ | ---------- |
| Test 1    | ⏳ Pending | 2025-10-15 |
| Test 2    | ✅ Completed | - |
+----------------------------------+
| 📊 Test Results                  |
+----------------------------------+
| Test Name | Score | Pass/Fail  |
| --------- | ----- | ---------- |
| Test 2    | 85%   | ✅ Passed  |
+----------------------------------+
```

**Restrictions**:
- ❌ No access to Courses
- ❌ No access to Articles
- ❌ No access to Certifications
- ✅ Only assigned tests visible
- ✅ View own test results only

---

## 8. Migration Plan

### Step 1: ✅ Add user fields (DONE)
```
- user_type
- id_card_number
- applied_position
- auto_disable_after_test
```

### Step 2: Create new tables
```
- ApplicantTestAssignments
- ApplicantTestResults
- ApplicantNotes
```

### Step 3: Update Models
```
- User.js: Add findByIdCardNumber(), updateStatus()
- Create ApplicantTestAssignment.js
- Create ApplicantTestResult.js
- Create ApplicantNote.js
```

### Step 4: Update Controllers
```
- authController.js: Update login logic
- Create hrController.js: Applicant management
- Create applicantController.js: Applicant dashboard
```

### Step 5: Create Views
```
- views/hr/applicants/index.ejs
- views/hr/applicants/add.ejs
- views/hr/applicants/assign-tests.ejs
- views/applicant/dashboard.ejs
- views/applicant/test.ejs
```

### Step 6: Update Routes & Middleware
```
- routes/hrRoutes.js: HR applicant management
- routes/applicantRoutes.js: Applicant test taking
- middleware/applicantAuth.js: Check user_type
```

---

## 9. Validation & Business Rules

### ID Card Number:
- Format: 13 digits
- Checksum validation (Thai ID card algorithm)
- Unique across system
- Cannot be changed after creation

### Test Assignment:
- Same test cannot be assigned twice to same applicant
- Test must be active
- HR only (role check)

### Auto-Disable:
- Only for user_type = 'APPLICANT'
- Trigger only when ALL assigned tests completed
- Can be manually re-enabled by HR
- Log all disable/enable actions

### Dashboard Access:
- EMPLOYEE: Full LMS access
- APPLICANT: Only test dashboard
- Middleware checks user_type on every request

---

## 10. Security Considerations

### Authentication:
- Rate limiting on login
- Session timeout applies to both types
- Password policy applies to both types

### Authorization:
- Role-based access control (RBAC)
- Applicants cannot access employee resources
- HR can manage applicants only with HR role

### Data Privacy:
- Applicants see only their own data
- HR sees all applicant data
- Test results encrypted at rest
- Audit log for all HR actions on applicants

---

## 11. Standards Compliance Checklist

- ✅ Naming convention: PascalCase tables, snake_case columns
- ✅ Foreign key constraints with proper naming
- ✅ Indexes on frequently queried columns
- ✅ Default values and check constraints
- ✅ Soft delete pattern (is_active flags)
- ✅ Audit fields (created_at, updated_at, created_by)
- ✅ Separation of concerns (dedicated tables for applicants)
- ✅ Data integrity (unique constraints, FK constraints)
- ✅ Scalability (indexed, normalized)
- ✅ Security (RBAC, audit logs, data privacy)

---

## Next Steps for Implementation

1. ✅ Review this design document
2. ⏳ Create migration for new tables
3. ⏳ Create Models (ApplicantTestAssignment, ApplicantTestResult)
4. ⏳ Update User model (add methods)
5. ⏳ Create Controllers (HR, Applicant)
6. ⏳ Create Views (HR management, Applicant dashboard)
7. ⏳ Update Routes & Middleware
8. ⏳ Testing (unit tests, integration tests)
9. ⏳ Deployment
