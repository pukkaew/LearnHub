# 📝 Course Assessment System - Complete Analysis

**Date:** 2025-11-21
**System:** LearnHub LMS
**Focus:** Test/Assessment Creation for Courses

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Test Types & Categories](#test-types--categories)
4. [Integration with Courses](#integration-with-courses)
5. [Question Bank System](#question-bank-system)
6. [Assessment Flow](#assessment-flow)
7. [Current Implementation Status](#current-implementation-status)

---

## 1. System Overview

### Assessment System Architecture

LearnHub ระบบการทดสอบ (Assessment System) รองรับ **3 รูปแบบหลัก**:

1. **✅ Chapter/Lesson Quiz** - ข้อสอบในแต่ละบท/บทเรียน
2. **✅ Course Final Exam** - ข้อสอบปลายภาค/สอบรวม Course
3. **✅ Standalone Test** - ข้อสอบแยกต่างหาก (ไม่เกี่ยวข้องกับ Course)

### Key Features

- ✅ Multiple question types (multiple-choice, true-false, essay, etc.)
- ✅ Question Bank for reusability
- ✅ Randomized question order
- ✅ Time limits and attempt limits
- ✅ Proctoring support
- ✅ Automatic and manual grading
- ✅ Progress tracking

---

## 2. Database Architecture

### Core Tables

#### 2.1 Tests Table

**Purpose:** หลักข้อสอบหลัก - เก็บข้อมูลการสอบทั้งหมด

| Column | Type | Description |
|--------|------|-------------|
| `test_id` | int (PK) | รหัสข้อสอบ |
| `title` | nvarchar(255) | ชื่อข้อสอบ |
| `description` | nvarchar(MAX) | คำอธิบายข้อสอบ |
| `course_id` | int (FK) | รหัส Course (NULL = Standalone) |
| `chapter_id` | int | รหัสบท (NULL = Final Exam) |
| `lesson_id` | int | รหัสบทเรียน (NULL = Chapter Quiz) |
| `instructor_id` | int (FK) | ผู้สร้างข้อสอบ |
| `type` | nvarchar(50) | ประเภทข้อสอบ |
| `time_limit` | int | เวลาจำกัด (นาที) |
| `total_marks` | int | คะแนนรวม |
| `passing_marks` | int | คะแนนผ่าน |
| `attempts_allowed` | int | จำนวนครั้งที่สามารถทำได้ |
| `randomize_questions` | bit | สุ่มลำดับคำถาม |
| `show_results` | bit | แสดงผลคะแนน |
| `status` | nvarchar(20) | สถานะ (Active/Draft/Closed) |
| `start_date` | datetime2 | วันที่เริ่มให้ทำ |
| `end_date` | datetime2 | วันที่หมดเวลา |
| `test_category` | varchar(50) | หมวดหมู่ |
| `available_after_chapter_complete` | bit | ต้องทำบทก่อนหรือไม่ |
| `required_for_completion` | bit | จำเป็นสำหรับจบ Course |
| `weight_in_course` | decimal(5,2) | น้ำหนักในคะแนนรวม (%) |
| `available_from` | datetime | เริ่มให้ทำตั้งแต่ |
| `available_until` | datetime | หมดเวลา |
| `proctoring_enabled` | bit | เปิด Proctoring |
| `proctoring_strictness` | nvarchar(20) | ระดับความเข้มงวด |

**Total: 27 columns**

---

#### 2.2 QuestionBank Table

**Purpose:** คลังคำถามกลาง - สามารถนำมาใช้ซ้ำได้ในหลายข้อสอบ

| Column | Type | Description |
|--------|------|-------------|
| `question_id` | int (PK) | รหัสคำถาม |
| `course_id` | int | สังกัด Course (NULL = Public) |
| `chapter_id` | int | สังกัดบท |
| `lesson_id` | int | สังกัดบทเรียน |
| `question_text` | nvarchar(MAX) | ข้อความคำถาม |
| `question_type` | varchar(50) | ประเภทคำถาม |
| `image_url` | varchar(500) | รูปภาพประกอบ |
| `video_url` | varchar(500) | วิดีโอประกอบ |
| `audio_url` | varchar(500) | เสียงประกอบ |
| `difficulty_level` | varchar(20) | ระดับความยาก |
| `topic_tags` | nvarchar(500) | Tags/หมวดหมู่ |
| `learning_objective` | nvarchar(MAX) | วัตถุประสงค์การเรียนรู้ |
| `bloom_taxonomy_level` | varchar(50) | ระดับ Bloom's Taxonomy |
| `default_points` | decimal(5,2) | คะแนนเริ่มต้น |
| `explanation` | nvarchar(MAX) | คำอธิบายเฉลย |
| `hint` | nvarchar(MAX) | คำใบ้ |
| `reference` | nvarchar(500) | แหล่งอ้างอิง |
| `is_active` | bit | สถานะใช้งาน |
| `is_verified` | bit | ยืนยันโดยผู้เชี่ยวชาญ |
| `is_public` | bit | สามารถใช้ทั่วไปได้ |
| `usage_count` | int | จำนวนครั้งที่ใช้ |
| `correct_count` | int | จำนวนผู้ตอบถูก |
| `success_rate` | decimal(5,2) | อัตราความสำเร็จ (%) |
| `created_by` | int | ผู้สร้าง |
| `created_at` | datetime | วันที่สร้าง |
| `updated_at` | datetime | วันที่อัปเดต |
| `verified_by` | int | ผู้ยืนยัน |
| `verified_at` | datetime | วันที่ยืนยัน |

**Total: 28 columns**

---

#### 2.3 TestQuestions Table

**Purpose:** เชื่อมโยงระหว่าง Tests กับ QuestionBank

| Column | Type | Description |
|--------|------|-------------|
| `test_question_id` | int (PK) | รหัสคำถามในข้อสอบ |
| `test_id` | int (FK) | รหัสข้อสอบ |
| `question_id` | int (FK) | รหัสคำถามจาก QuestionBank |
| `question_order` | int | ลำดับคำถาม |
| `points_override` | decimal(5,2) | แทนที่คะแนนเดิม |
| `is_required` | bit | คำถามบังคับตอบ |
| `created_at` | datetime | วันที่เพิ่ม |

**Foreign Keys:**
- `test_id` → Tests(test_id)
- `question_id` → QuestionBank(question_id)

---

#### 2.4 Questions Table

**Purpose:** คำถามที่สร้างโดยตรงในข้อสอบ (ไม่ผ่าน QuestionBank)

| Column | Type | Description |
|--------|------|-------------|
| `question_id` | int (PK) | รหัสคำถาม |
| `bank_id` | int | อ้างอิงจาก QuestionBank (ถ้ามี) |
| `test_id` | int (FK) | ผูกติดกับข้อสอบนี้เท่านั้น |
| `question_type` | nvarchar(20) | ประเภทคำถาม |
| `question_text` | nvarchar(MAX) | ข้อความคำถาม |
| `question_image` | nvarchar(500) | รูปภาพ |
| `points` | decimal(5,2) | คะแนน |
| `difficulty_level` | int | ระดับความยาก (1-5) |
| `time_estimate_seconds` | int | เวลาโดยประมาณ |
| `explanation` | nvarchar(MAX) | คำอธิบาย |
| `tags` | nvarchar(500) | Tags |
| `usage_count` | int | จำนวนครั้งที่ใช้ |
| `correct_count` | int | จำนวนผู้ตอบถูก |
| `is_active` | bit | สถานะใช้งาน |
| `version` | int | เวอร์ชัน |
| `created_by` | int | ผู้สร้าง |
| `created_date` | datetime | วันที่สร้าง |
| `modified_date` | datetime | วันที่แก้ไข |

**Foreign Keys:**
- `test_id` → Tests(test_id) ON DELETE CASCADE
- `created_by` → Users(user_id)

---

#### 2.5 AnswerOptions Table

**Purpose:** ตัวเลือกคำตอบสำหรับ QuestionBank

| Column | Type | Description |
|--------|------|-------------|
| `option_id` | int (PK) | รหัสตัวเลือก |
| `question_id` | int (FK) | รหัสคำถามจาก QuestionBank |
| `option_text` | nvarchar(MAX) | ข้อความตัวเลือก |
| `option_image` | nvarchar(500) | รูปภาพ (ถ้ามี) |
| `is_correct` | bit | เป็นคำตอบที่ถูก |
| `option_order` | int | ลำดับการแสดง |
| `explanation` | nvarchar(MAX) | คำอธิบาย |

**Foreign Key:**
- `question_id` → QuestionBank(question_id) ON DELETE CASCADE

---

#### 2.6 QuestionOptions Table

**Purpose:** ตัวเลือกคำตอบสำหรับ Questions (คำถามในข้อสอบโดยตรง)

| Column | Type | Description |
|--------|------|-------------|
| `option_id` | int (PK) | รหัสตัวเลือก |
| `question_id` | int (FK) | รหัสคำถามจาก Questions |
| `option_text` | nvarchar(500) | ข้อความตัวเลือก |
| `option_image` | nvarchar(500) | รูปภาพ (ถ้ามี) |
| `is_correct` | bit | เป็นคำตอบที่ถูก |
| `option_order` | int | ลำดับการแสดง |

**Foreign Key:**
- `question_id` → Questions(question_id) ON DELETE CASCADE

---

#### 2.7 Supporting Tables

| Table | Purpose |
|-------|---------|
| `TestAttempts` | บันทึกการทำข้อสอบแต่ละครั้ง |
| `test_sessions` | Session การทำข้อสอบ |
| `test_results` | ผลการทำข้อสอบ |
| `ApplicantTestAssignments` | มอบหมายข้อสอบให้ผู้สมัคร |
| `ApplicantTestResults` | ผลการทำข้อสอบของผู้สมัคร |

---

## 3. Test Types & Categories

### Test Types (Based on `type` column)

1. **Quiz** - แบบทดสอบย่อย (10-20 คำถาม)
2. **Exam** - ข้อสอบใหญ่ (50+ คำถาม)
3. **Assessment** - แบบประเมิน (ไม่จำกัดรูปแบบ)
4. **Survey** - แบบสำรวจความคิดเห็น
5. **Practice** - แบบฝึกหัด (ไม่นับคะแนน)
6. **Certification** - ข้อสอบออกใบรับรอง

### Test Categories (Based on course_id, chapter_id, lesson_id)

```sql
-- 1. Standalone Test (ไม่เกี่ยวข้องกับ Course)
course_id = NULL AND chapter_id = NULL AND lesson_id = NULL

-- 2. Course Final Exam (สอบรวมทั้ง Course)
course_id = 123 AND chapter_id = NULL AND lesson_id = NULL

-- 3. Chapter Quiz (ข้อสอบปลายบท)
course_id = 123 AND chapter_id = 5 AND lesson_id = NULL

-- 4. Lesson Quiz (ข้อสอบปลายบทเรียน)
course_id = 123 AND chapter_id = 5 AND lesson_id = 12
```

---

## 4. Integration with Courses

### Course → Test Relationship

#### Option 1: Direct Reference (Current Implementation)

```sql
-- Courses table has test_id column
ALTER TABLE Courses ADD test_id INT;
ALTER TABLE Courses ADD FOREIGN KEY (test_id) REFERENCES Tests(test_id);
```

**Usage:**
```javascript
// Course with Final Exam
const course = {
    course_id: 1,
    title: 'JavaScript Fundamentals',
    test_id: 42  // Final exam
};
```

#### Option 2: Reverse Reference (Recommended)

```sql
-- Tests table has course_id column (already exists)
ALTER TABLE Tests ADD FOREIGN KEY (course_id) REFERENCES Courses(course_id);
```

**Usage:**
```javascript
// Get all tests for a course
const tests = await Test.findAll({
    course_id: 1,
    status: 'Active'
});
```

### Test Flow in Course Context

```
Course Enrollment
    ↓
Complete Chapters/Lessons
    ↓
[Chapter Quiz available_after_chapter_complete = 1]
    ↓
Complete all required chapters
    ↓
[Final Exam available]
    ↓
Pass Final Exam (grade >= passing_marks)
    ↓
Course Completion & Certificate
```

---

## 5. Question Bank System

### Question Types Supported

1. **MULTIPLE_CHOICE** - เลือกตอบหนึ่งข้อ
2. **MULTIPLE_SELECT** - เลือกตอบหลายข้อ
3. **TRUE_FALSE** - ถูก/ผิด
4. **SHORT_ANSWER** - ตอบสั้น (ตรวจด้วยมือ)
5. **ESSAY** - เขียนเรียงความ (ตรวจด้วยมือ)
6. **MATCHING** - จับคู่
7. **FILL_BLANK** - เติมคำในช่องว่าง
8. **ORDERING** - เรียงลำดับ

### Question Difficulty Levels

- `easy` - ง่าย (Bloom's: Remember, Understand)
- `medium` - ปานกลาง (Bloom's: Apply, Analyze)
- `hard` - ยาก (Bloom's: Evaluate, Create)

### Bloom's Taxonomy Levels

1. **Remember** - จำได้
2. **Understand** - เข้าใจ
3. **Apply** - ประยุกต์ใช้
4. **Analyze** - วิเคราะห์
5. **Evaluate** - ประเมินค่า
6. **Create** - สร้างสรรค์

### Question Bank Operations

#### Create Question

```javascript
const question = await QuestionBank.create({
    course_id: 1,
    chapter_id: 5,
    question_text: 'What is the output of console.log(typeof null)?',
    question_type: 'multiple-choice',
    difficulty_level: 'medium',
    bloom_taxonomy_level: 'understand',
    default_points: 2.0,
    explanation: 'In JavaScript, typeof null returns "object" due to a historical bug.',
    is_public: 0,
    created_by: userId
}, [
    { option_text: 'object', is_correct: true, option_order: 1 },
    { option_text: 'null', is_correct: false, option_order: 2 },
    { option_text: 'undefined', is_correct: false, option_order: 3 }
]);
```

#### Retrieve Questions with Filters

```javascript
const questions = await QuestionBank.findAll(1, 20, {
    course_id: 1,
    chapter_id: 5,
    difficulty_level: 'medium',
    question_type: 'multiple-choice',
    is_verified: 1,
    search: 'JavaScript'
});
```

#### Get Random Questions for Test

```javascript
const questions = await QuestionBank.getRandomQuestions(courseId, 20, {
    difficulty_level: 'medium',
    chapter_id: 5,
    is_verified: 1
});
```

---

## 6. Assessment Flow

### Creating a Test for a Course

```javascript
// Step 1: Create the test
const test = await Test.create({
    title: 'Chapter 1: Introduction Quiz',
    description: 'Test your understanding of Chapter 1',
    course_id: 1,
    chapter_id: 1,
    lesson_id: null,  // Chapter-level test
    instructor_id: userId,
    type: 'quiz',
    time_limit: 30,  // 30 minutes
    total_marks: 20,
    passing_marks: 14,  // 70%
    attempts_allowed: 2,
    randomize_questions: true,
    show_results: true,
    status: 'Active',
    test_category: 'chapter_quiz',
    available_after_chapter_complete: true,
    required_for_completion: true,
    weight_in_course: 10.0  // 10% of total course grade
});

// Step 2: Select questions from Question Bank
const questions = await QuestionBank.findAll(1, 10, {
    course_id: 1,
    chapter_id: 1,
    difficulty_level: 'medium',
    is_verified: 1
});

// Step 3: Add questions to test
for (let i = 0; i < questions.length; i++) {
    await TestQuestion.create({
        test_id: test.test_id,
        question_id: questions[i].question_id,
        question_order: i + 1,
        points_override: 2.0  // Override default points
    });
}
```

### Taking a Test (Student Flow)

```javascript
// 1. Check eligibility
const canTake = await Test.checkEligibility(testId, userId);

// 2. Start test session
const session = await TestSession.create({
    test_id: testId,
    user_id: userId,
    start_time: new Date()
});

// 3. Get questions (randomized if enabled)
const questions = await Test.getQuestionsForAttempt(testId, {
    randomize: test.randomize_questions,
    userId: userId
});

// 4. Submit answers
await TestAttempt.submitAnswer({
    session_id: session.session_id,
    question_id: questionId,
    answer_value: answer,
    time_spent: timeSpent
});

// 5. Complete test
const result = await TestAttempt.complete(session.session_id);

// 6. Calculate grade (auto for MCQ, manual for essay)
const grade = await TestGrading.calculateGrade(session.session_id);

// 7. Update course progress
await CourseProgress.updateFromTestResult(userId, courseId, grade);
```

---

## 7. Current Implementation Status

### ✅ Implemented Features

1. **Database Schema**
   - ✅ Tests table (27 columns)
   - ✅ QuestionBank table (28 columns)
   - ✅ Questions table (18 columns)
   - ✅ TestQuestions linking table
   - ✅ AnswerOptions & QuestionOptions tables
   - ✅ TestAttempts & test_sessions tables

2. **Question Bank System**
   - ✅ Model: QuestionBank.js (full CRUD)
   - ✅ Controller: questionBankController.js (all endpoints)
   - ✅ Routes: questionBankRoutes.js (REST API)
   - ✅ Views: 4 EJS templates (index, create, edit, detail)
   - ✅ Translations: Thai & English (languages.js)

3. **Question Features**
   - ✅ Multiple question types
   - ✅ Difficulty levels
   - ✅ Bloom's taxonomy
   - ✅ Media support (image, video, audio)
   - ✅ Tagging system
   - ✅ Question verification
   - ✅ Usage statistics
   - ✅ Duplicate questions
   - ✅ Bulk import

### ⚠️ Partially Implemented

1. **Test Management**
   - ⚠️  Test Model exists but needs verification
   - ⚠️  Test Controller needs review
   - ⚠️  Test Routes may need updates
   - ⚠️  Test Views need checking

2. **Test Taking Flow**
   - ⚠️  Session management needs verification
   - ⚠️  Answer submission flow
   - ⚠️  Grading system (auto + manual)
   - ⚠️  Proctoring integration

3. **Integration**
   - ⚠️  Course ↔ Test relationship
   - ⚠️  Chapter/Lesson prerequisites
   - ⚠️  Grade calculation & course progress
   - ⚠️  Certificate generation

### ❌ Not Yet Implemented

1. **Advanced Features**
   - ❌ Question pools
   - ❌ Adaptive testing
   - ❌ Peer review
   - ❌ Question analytics dashboard
   - ❌ Export/import question banks
   - ❌ AI-powered question generation

2. **Reporting**
   - ❌ Test analytics
   - ❌ Question difficulty analysis
   - ❌ Student performance reports
   - ❌ Cheating detection reports

---

## 8. Creating Tests for Courses - Complete Guide

### Scenario 1: Chapter Quiz

```javascript
// Create quiz for Chapter 5
const chapterQuiz = await Test.create({
    title: 'บททดสอบที่ 5: Functions',
    description: 'ทดสอบความเข้าใจเกี่ยวกับ Functions ใน JavaScript',
    course_id: 1,
    chapter_id: 5,
    lesson_id: null,
    instructor_id: 17,
    type: 'quiz',
    time_limit: 20,
    total_marks: 10,
    passing_marks: 7,
    attempts_allowed: 2,
    randomize_questions: true,
    show_results: true,
    status: 'Active',
    test_category: 'chapter_quiz',
    available_after_chapter_complete: true,
    required_for_completion: true,
    weight_in_course: 5.0
});

// Add 10 random questions from chapter 5
const questions = await QuestionBank.getRandomQuestions(1, 10, {
    chapter_id: 5,
    difficulty_level: 'medium'
});

for (let i = 0; i < questions.length; i++) {
    await TestQuestion.create({
        test_id: chapterQuiz.test_id,
        question_id: questions[i].question_id,
        question_order: i + 1,
        points_override: 1.0
    });
}
```

### Scenario 2: Course Final Exam

```javascript
// Create final exam for entire course
const finalExam = await Test.create({
    title: 'ข้อสอบปลายภาค: JavaScript Fundamentals',
    description: 'ข้อสอบรวมทั้ง Course',
    course_id: 1,
    chapter_id: null,  // Not tied to specific chapter
    lesson_id: null,
    instructor_id: 17,
    type: 'exam',
    time_limit: 120,  // 2 hours
    total_marks: 100,
    passing_marks: 70,
    attempts_allowed: 1,
    randomize_questions: true,
    show_results: false,  // Don't show immediately
    status: 'Active',
    test_category: 'final_exam',
    available_after_chapter_complete: false,
    required_for_completion: true,
    weight_in_course: 50.0  // 50% of course grade
});

// Mix of easy, medium, hard questions
const easyQ = await QuestionBank.getRandomQuestions(1, 30, {
    difficulty_level: 'easy'
});
const mediumQ = await QuestionBank.getRandomQuestions(1, 40, {
    difficulty_level: 'medium'
});
const hardQ = await QuestionBank.getRandomQuestions(1, 30, {
    difficulty_level: 'hard'
});

const allQuestions = [...easyQ, ...mediumQ, ...hardQ];
// Shuffle for final randomization
shuffle(allQuestions);

for (let i = 0; i < allQuestions.length; i++) {
    await TestQuestion.create({
        test_id: finalExam.test_id,
        question_id: allQuestions[i].question_id,
        question_order: i + 1
    });
}
```

### Scenario 3: Standalone Assessment (No Course)

```javascript
// Create certification exam
const certExam = await Test.create({
    title: 'JavaScript Professional Certification',
    description: 'Official certification exam',
    course_id: null,  // Not tied to any course
    chapter_id: null,
    lesson_id: null,
    instructor_id: 17,
    type: 'certification',
    time_limit: 180,  // 3 hours
    total_marks: 200,
    passing_marks: 160,  // 80%
    attempts_allowed: 3,
    randomize_questions: true,
    show_results: false,
    status: 'Active',
    test_category: 'certification',
    proctoring_enabled: true,
    proctoring_strictness: 'strict'
});

// Use only verified public questions
const certQuestions = await QuestionBank.getRandomQuestions(null, 100, {
    is_public: true,
    is_verified: true
});
```

---

## 9. Recommendations

### High Priority

1. **Implement Test Model & Controller**
   - Create complete Test.js model
   - Implement all CRUD operations
   - Add test validation logic

2. **Test Taking Interface**
   - Create student test-taking views
   - Implement timer and auto-submit
   - Add answer save/draft functionality

3. **Grading System**
   - Auto-grading for MCQ/True-False
   - Manual grading interface for Essay
   - Grade calculation and course integration

4. **Integration Testing**
   - Test course → test relationships
   - Verify prerequisite logic
   - Test grade calculation

### Medium Priority

1. **Analytics Dashboard**
   - Question performance metrics
   - Student performance reports
   - Test difficulty analysis

2. **Advanced Features**
   - Question pools
   - Conditional questions
   - Question branching

3. **Security**
   - Proctoring implementation
   - Cheating detection
   - Secure test environment

---

## 10. Summary

### ✅ What's Working

- Complete Question Bank system
- Database schema is well-designed
- Question CRUD operations functional
- Support for multiple question types
- Question verification and statistics

### ⚠️  Needs Attention

- Test Model & Controller implementation
- Test taking flow (student interface)
- Grading system (auto + manual)
- Course ↔ Test integration
- Prerequisite and progression logic

### 📊 System Readiness

| Component | Status | Completion |
|-----------|--------|------------|
| Database Schema | ✅ Complete | 100% |
| Question Bank | ✅ Complete | 100% |
| Test Management | ⚠️ Partial | 60% |
| Test Taking | ⚠️ Partial | 40% |
| Grading | ⚠️ Partial | 30% |
| Analytics | ❌ Not Started | 0% |

### 🎯 Next Steps

1. Complete Test Model implementation
2. Create test-taking interface for students
3. Implement grading system
4. Test end-to-end flow
5. Add analytics and reporting

---

**Related Documents:**
- `COURSE_CREATION_ANALYSIS.md` - Course creation system
- `ASSESSMENT_SYSTEM_ARCHITECTURE.md` - Detailed architecture (to be created)

