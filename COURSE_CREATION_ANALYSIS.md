# 📚 Course Creation System - Complete Analysis

**Date:** 2025-11-21
**System:** LearnHub LMS
**Analyzed by:** Claude Code

---

## 📋 Table of Contents

1. [Database Structure](#database-structure)
2. [Model Implementation](#model-implementation)
3. [Controller Flow](#controller-flow)
4. [Data Mapping](#data-mapping)
5. [Issues & Recommendations](#issues--recommendations)
6. [Testing Checklist](#testing-checklist)

---

## 1. Database Structure

### Courses Table Schema

| Column Name              | Data Type     | Max Length | Nullable | Description                           |
|-------------------------|---------------|------------|----------|---------------------------------------|
| `course_id`             | int           | -          | NO       | Primary Key (auto-increment)          |
| `title`                 | nvarchar      | 255        | NO       | Course title                          |
| `description`           | nvarchar      | MAX        | YES      | Full course description               |
| `category`              | nvarchar      | 100        | YES      | Category name (from CourseCategories) |
| `difficulty_level`      | nvarchar      | 20         | YES      | Beginner/Intermediate/Advanced        |
| `instructor_id`         | int           | -          | YES      | FK to Users table                     |
| `instructor_name`       | nvarchar      | 255        | YES      | Manual instructor name (alternative)  |
| `thumbnail`             | nvarchar      | 255        | YES      | Thumbnail image URL                   |
| `duration_hours`        | int           | -          | YES      | Total course duration (hours)         |
| `price`                 | decimal(10,2) | -          | YES      | Course price                          |
| `is_free`               | bit           | -          | YES      | Free course flag                      |
| `status`                | nvarchar      | 20         | YES      | Active/Published/Draft                |
| `enrollment_limit`      | int           | -          | YES      | Max enrollments allowed               |
| `start_date`            | datetime2     | -          | YES      | Enrollment start date                 |
| `end_date`              | datetime2     | -          | YES      | Enrollment end date                   |
| `created_at`            | datetime2     | -          | YES      | Record creation timestamp             |
| `updated_at`            | datetime2     | -          | YES      | Last update timestamp                 |
| `test_id`               | int           | -          | YES      | FK to Tests table (if final exam)     |
| `course_code`           | nvarchar      | 50         | YES      | Unique course code                    |
| `course_type`           | nvarchar      | 50         | YES      | Online/Onsite/Hybrid                  |
| `language`              | nvarchar      | 20         | YES      | Course language (th/en)               |
| `learning_objectives`   | nvarchar      | MAX        | YES      | JSON array of objectives              |
| `target_audience`       | nvarchar      | MAX        | YES      | JSON: {positions: [], departments: []}|
| `prerequisite_knowledge`| nvarchar      | MAX        | YES      | Prerequisites text                    |
| `intro_video_url`       | nvarchar      | 500        | YES      | Intro/Preview video URL               |
| `max_students`          | int           | -          | YES      | Maximum students (same as enrollment_limit)|
| `passing_score`         | int           | -          | YES      | Required passing score (%)            |
| `max_attempts`          | int           | -          | YES      | Max test attempts allowed             |
| `show_correct_answers`  | bit           | -          | YES      | Show answers after test               |
| `is_published`          | bit           | -          | YES      | Published status                      |
| `certificate_template`  | nvarchar      | 255        | YES      | Certificate template file             |
| `certificate_validity`  | nvarchar      | 50         | YES      | Certificate validity period           |

**Total Columns:** 32

---

## 2. Model Implementation

### Course.js - Key Methods

#### ✅ `Course.create(courseData)`

**Location:** `models/Course.js:160-324`

**Purpose:** Creates a new course with all related data including:
- Basic course information
- Learning objectives (JSON)
- Target audience (JSON: positions + departments)
- Course materials/lessons

**Input Data Expected:**
```javascript
{
    // Basic Info
    course_code: 'CS101',
    course_name: 'Course Title', // or title
    description: 'Full description',
    category: 'Programming', // or category_id (will lookup name)
    category_id: 1, // optional
    difficulty_level: 'Beginner',
    course_type: 'Online',
    language: 'th',

    // Instructor
    instructor_id: 17, // FK to Users
    instructor_name: 'John Doe', // Alternative manual name

    // Media
    thumbnail: '/uploads/course.jpg', // or course_image, thumbnail_image
    intro_video_url: 'https://youtube.com/...',

    // Duration
    duration_hours: 10,
    duration_minutes: 30, // Will be added to hours

    // Enrollment
    price: 0,
    is_free: true,
    status: 'Published',
    max_students: 50, // or enrollment_limit, max_enrollments
    start_date: '2025-01-01',
    end_date: '2025-12-31',

    // Learning
    learning_objectives: [
        'Objective 1',
        'Objective 2'
    ], // Will be JSON.stringified
    target_positions: [1, 2, 3], // Position IDs
    target_departments: [5, 6], // Department IDs
    prerequisite_knowledge: 'Basic programming',

    // Assessment
    test_id: null,
    passing_score: 70,
    max_attempts: 3,
    show_correct_answers: true,
    certificate_validity: '365', // days

    // Publishing
    is_published: true,

    // Lessons (optional)
    lessons: [
        {
            title: 'Lesson 1',
            description: 'Lesson content',
            video_url: 'https://...',
            duration: 30 // minutes
        }
    ]
}
```

**Processing Steps:**

1. **Category Resolution**
   - If `category_id` provided but no `category` → looks up category name
   - Falls back to 'General' if neither provided

2. **Duration Calculation**
   - Combines `duration_hours` + `duration_minutes/60`
   - Ceiling rounds to integer

3. **Thumbnail Handling**
   - Tries: `course_image` → `thumbnail_image` → `thumbnail`
   - Normalizes empty objects to NULL

4. **Learning Objectives**
   - Converts array to JSON string
   - Handles HTML entity encoding

5. **Target Audience**
   - Filters out 'all' selections
   - Creates JSON: `{positions: [ids], departments: [ids]}`
   - NULL if both arrays empty = "open for all"

6. **Lessons/Materials**
   - Inserts into `course_materials` table
   - Sets `order_index` sequentially
   - Maps `video_url` to `file_path`

**Return Value:**
```javascript
{
    success: true,
    data: { course_id: 123 }
}
```

---

#### ✅ `Course.update(courseId, updateData)`

**Location:** `models/Course.js:327-470`

**Purpose:** Updates existing course with dynamic field updates

**Key Features:**
- Only updates provided fields
- Handles duplicate field names (course_name/title, thumbnail variants)
- Recalculates duration from hours + minutes
- Updates `updated_at` automatically

**Important Notes:**
- Does NOT update `instructor_id` (protected in controller)
- Empty strings for numeric fields → NULL
- Maintains same target_audience JSON structure

---

#### ✅ `Course.findById(courseId)`

**Location:** `models/Course.js:32-146`

**Purpose:** Retrieves complete course details with:
- Instructor info (name, image, title from Users/Positions/OrganizationUnits)
- Enrollment statistics
- Materials/lessons
- Parsed JSON fields (learning_objectives, target_audience)

**Processing:**
- Decodes HTML entities in `learning_objectives` before JSON parsing
- Maps `file_path` to `video_url` for frontend compatibility
- Creates aliases for view compatibility (`course_name`, `instructor_avatar`)

---

## 3. Controller Flow

### courseController.js - `createCourse()`

**Location:** `controllers/courseController.js:101-191`

**Authorization:**
- Requires role: `Admin` or `Instructor`
- Uses `req.user.role_name` and `req.user.user_id`

**Data Flow:**

1. **Permission Check**
   ```javascript
   if (!['Admin', 'Instructor'].includes(userRole)) {
       return 403 error
   }
   ```

2. **Data Preparation**
   ```javascript
   courseData = {
       ...req.body,
       // Handle array fields from form with []
       target_positions: req.body['target_positions[]'] || req.body.target_positions,
       target_departments: req.body['target_departments[]'] || req.body.target_departments,
       // Allow NULL instructor_id
       instructor_id: req.body.instructor_id || null,
       instructor_name: req.body.instructor_name || null,
       created_by: userId
   }
   ```

3. **Database Creation**
   ```javascript
   const result = await Course.create(courseData);
   ```

4. **Activity Logging**
   ```javascript
   await ActivityLog.logDataChange(
       userId,
       'Create',
       'Courses',
       course_id,
       null,
       courseData,
       ...
   );
   ```

5. **Response**
   ```javascript
   res.status(201).json({
       success: true,
       message: 'สร้างหลักสูตรสำเร็จ',
       data: { course_id: newCourseId }
   });
   ```

---

## 4. Data Mapping

### Form Fields → Database Columns

| Form Field              | Database Column        | Processing                     |
|------------------------|------------------------|--------------------------------|
| `course_code`          | `course_code`          | Direct                         |
| `course_name`          | `title`                | Direct (or `title` field)      |
| `title`                | `title`                | Alternative to course_name     |
| `description`          | `description`          | Direct                         |
| `category_id`          | `category`             | Lookup → category_name         |
| `category`             | `category`             | Direct if provided             |
| `difficulty_level`     | `difficulty_level`     | Direct                         |
| `course_type`          | `course_type`          | Direct                         |
| `language`             | `language`             | Direct                         |
| `instructor_id`        | `instructor_id`        | Direct or NULL                 |
| `instructor_name`      | `instructor_name`      | Direct or NULL                 |
| `course_image`         | `thumbnail`            | Priority 1                     |
| `thumbnail_image`      | `thumbnail`            | Priority 2                     |
| `thumbnail`            | `thumbnail`            | Priority 3                     |
| `duration_hours`       | `duration_hours`       | Combine with minutes           |
| `duration_minutes`     | `duration_hours`       | /60 + hours                    |
| `price`                | `price`                | Direct (default 0)             |
| `is_free`              | `is_free`              | Direct (default true)          |
| `status`               | `status`               | Direct (default 'Published')   |
| `max_students`         | Both `max_students`    | Stored in both columns         |
| `max_enrollments`      | AND `enrollment_limit` | Same value                     |
| `enrollment_limit`     | Both columns           | Same value                     |
| `start_date`           | `start_date`           | Direct or NULL                 |
| `enrollment_start`     | `start_date`           | Alternative field name         |
| `end_date`             | `end_date`             | Direct or NULL                 |
| `enrollment_end`       | `end_date`             | Alternative field name         |
| `learning_objectives`  | `learning_objectives`  | Array → JSON.stringify         |
| `target_positions[]`   | `target_audience`      | Combine to JSON object         |
| `target_departments[]` | `target_audience`      | {positions: [], departments: []}|
| `prerequisite_knowledge`| `prerequisite_knowledge`| Direct                        |
| `intro_video_url`      | `intro_video_url`      | Direct                         |
| `test_id`              | `test_id`              | Direct or NULL                 |
| `passing_score`        | `passing_score`        | Direct or NULL                 |
| `max_attempts`         | `max_attempts`         | Direct or NULL                 |
| `show_correct_answers` | `show_correct_answers` | Direct (default false)         |
| `is_published`         | `is_published`         | Direct (default true)          |
| `certificate_validity` | `certificate_validity` | String or NULL                 |
| `lessons`              | → `course_materials`   | Insert separately              |

---

## 5. Issues & Recommendations

### ✅ Working Correctly

1. **Flexible Instructor Assignment**
   - Supports both `instructor_id` (FK) and `instructor_name` (manual)
   - Allows NULL for both

2. **Target Audience Logic**
   - Properly filters out 'all' selections
   - NULL = "open for all" (correct business logic)
   - JSON structure is well-defined

3. **Duration Handling**
   - Correctly combines hours and minutes
   - Ceiling rounds to integer

4. **Category Resolution**
   - Looks up category name from category_id
   - Fallback to 'General'

---

### ⚠️ Potential Issues

#### 1. **Duplicate Column Storage**

**Issue:** Same data stored in two columns:
- `max_students` AND `enrollment_limit`
- Both receive the same value

**Risk:** Data inconsistency if one is updated separately

**Recommendation:**
```sql
-- Option A: Use only one column + computed column
ALTER TABLE Courses DROP COLUMN enrollment_limit;
-- Use max_students only

-- Option B: Add trigger to keep them in sync
CREATE TRIGGER sync_enrollment_limit...
```

---

#### 2. **Field Mapping Complexity**

**Issue:** Multiple field names map to same column:
- `course_name` / `title` → `title`
- `course_image` / `thumbnail_image` / `thumbnail` → `thumbnail`
- `max_students` / `max_enrollments` / `enrollment_limit` → both columns

**Risk:** Confusion for frontend developers

**Recommendation:**
```javascript
// Standardize field names in API documentation
// Use one canonical name per field
// Add validation to reject multiple variants
```

---

#### 3. **Missing Column: `is_active`**

**Issue:**
- Model constructor references `is_active` (line 28)
- Table does NOT have this column
- Used in delete method (line 758)

**Evidence:**
```javascript
// Course.js:28
this.is_active = data.is_active;

// Course.js:758
SET is_active = 0,  // ❌ Column doesn't exist!
```

**Impact:**
- Delete operation will fail
- Cannot soft-delete courses

**Recommendation:**
```sql
-- Add missing column
ALTER TABLE Courses ADD is_active BIT DEFAULT 1;

-- Update delete method to use status instead
UPDATE courses SET status = 'Deleted' WHERE course_id = @courseId;
```

---

#### 4. **JSON Field Validation**

**Issue:** No validation for JSON field structures:
- `learning_objectives` - should be array
- `target_audience` - should be {positions: [], departments: []}

**Risk:** Invalid JSON can break frontend parsing

**Recommendation:**
```javascript
// Add JSON schema validation
const validateLearningObjectives = (data) => {
    if (!Array.isArray(data)) throw new Error('Must be array');
    return data;
};

const validateTargetAudience = (data) => {
    if (!data.positions || !data.departments) {
        throw new Error('Must have positions and departments arrays');
    }
    return data;
};
```

---

#### 5. **HTML Entity Encoding**

**Issue:** `learning_objectives` requires HTML entity decoding before JSON parsing

**Evidence:**
```javascript
// Course.js:103-110
const decoded = course.learning_objectives
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    // ... more replacements
```

**Risk:** Indicates double-encoding somewhere in the save path

**Recommendation:**
- Find where HTML encoding happens during save
- Remove unnecessary encoding
- Store clean JSON strings

---

#### 6. **Category Ambiguity**

**Issue:** Two ways to specify category:
1. `category_id` → looks up name
2. `category` → stores directly

**Risk:** Inconsistency if category names change

**Recommendation:**
```javascript
// Always use category_id as FK
// Store only the ID, join for display
ALTER TABLE Courses ADD CONSTRAINT FK_Courses_Categories
    FOREIGN KEY (category_id) REFERENCES CourseCategories(category_id);

// Remove category name column
ALTER TABLE Courses DROP COLUMN category;
```

---

### 🔍 Model-Database Mismatches

| Model Field | Database Column | Status  |
|------------|-----------------|---------|
| `is_active` | ❌ Missing      | **ADD** |
| `course_name` | Uses `title`  | ✅ OK (alias) |
| `category_name` | Uses `category` | ✅ OK (alias) |

---

## 6. Testing Checklist

### Unit Tests Needed

- [ ] **Course.create()** with minimal required fields
- [ ] **Course.create()** with all optional fields
- [ ] **Course.create()** with invalid category_id
- [ ] **Course.create()** with lessons array
- [ ] **Course.create()** with target_audience filtering
- [ ] **Course.create()** with duration calculation (hours + minutes)
- [ ] **Course.update()** with partial data
- [ ] **Course.update()** with empty target_audience
- [ ] **Course.findById()** with JSON parsing
- [ ] **Course.delete()** - currently broken (is_active column missing)

### Integration Tests Needed

- [ ] POST `/courses/create` - successful creation
- [ ] POST `/courses/create` - without permission (403)
- [ ] POST `/courses/create` - with array form fields ([])
- [ ] PUT `/courses/:id` - successful update
- [ ] PUT `/courses/:id` - instructor tries to update other's course (403)
- [ ] DELETE `/courses/:id` - with active enrollments (should fail)
- [ ] GET `/courses/:id` - verify JSON fields parsed correctly

### Manual Tests Needed

- [ ] Create course with instructor_id
- [ ] Create course with instructor_name only
- [ ] Create course with both positions AND departments
- [ ] Create course with only positions
- [ ] Create course with only departments
- [ ] Create course with neither (target_audience = NULL)
- [ ] Verify category name lookup works
- [ ] Verify duration calculation (10h 30m → 11h)
- [ ] Verify thumbnail priority (course_image > thumbnail_image > thumbnail)
- [ ] Verify learning_objectives HTML decoding

---

## 7. Database Fix Required

### Immediate Action Required

```sql
-- 1. Add missing is_active column
ALTER TABLE Courses
ADD is_active BIT NOT NULL DEFAULT 1;

-- 2. Update existing courses
UPDATE Courses SET is_active = 1 WHERE is_active IS NULL;

-- 3. Add index for common query
CREATE INDEX IX_Courses_IsActive ON Courses(is_active);

-- 4. (Optional) Add category FK constraint
ALTER TABLE Courses
ADD CONSTRAINT FK_Courses_CategoryId
FOREIGN KEY (category_id) REFERENCES CourseCategories(category_id);
```

---

## 8. Summary

### 📊 System Status

| Component          | Status | Notes                                    |
|-------------------|--------|------------------------------------------|
| Database Schema   | ⚠️ 95% | Missing `is_active` column               |
| Model Methods     | ⚠️ 90% | Delete method will fail                  |
| Controller Logic  | ✅ 100% | Properly implemented                     |
| Data Flow         | ✅ 95%  | Some field mapping complexity            |
| Error Handling    | ✅ 90%  | Good try-catch blocks                    |
| Logging           | ✅ 100% | Activity logging implemented             |
| Authorization     | ✅ 100% | Role-based access control                |

### 🎯 Priority Fixes

1. **HIGH PRIORITY** - Add `is_active` column (breaks delete functionality)
2. **MEDIUM** - Standardize field names to reduce confusion
3. **MEDIUM** - Add JSON schema validation
4. **LOW** - Remove duplicate column storage (enrollment_limit)
5. **LOW** - Investigate HTML entity encoding issue

### ✅ What's Working Well

- Flexible instructor assignment (ID or name)
- Smart target audience filtering
- Comprehensive findById with joins
- Good error handling and logging
- Role-based access control
- Activity audit trail

---

**Next Steps:**
1. Apply database fix for `is_active` column
2. Run test suite to verify all operations
3. Consider refactoring field name standardization
4. Add API documentation with canonical field names

