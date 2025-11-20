# 📚 LearnHub Assessment System Architecture

## ภาพรวมระบบ

ระบบรองรับ **3 รูปแบบการทำข้อสอบ**:
1. ✅ ข้อสอบในแต่ละบท (Chapter/Lesson Quiz)
2. ✅ ข้อสอบหลัง Course (Final Exam)
3. ✅ ข้อสอบแยกต่างหาก (Standalone Test)

---

## 🗂️ โครงสร้างตาราง

### 1. **Tests** (ตารางข้อสอบหลัก)
```sql
CREATE TABLE Tests (
    test_id INT PRIMARY KEY,
    course_id INT NULL,          -- NULL = Standalone Test
    chapter_id INT NULL,         -- ระบุบท (ถ้าเป็นข้อสอบแต่ละบท)
    lesson_id INT NULL,          -- ระบุบทเรียน
    test_name NVARCHAR(200),
    test_type VARCHAR(50),       -- 'quiz', 'exam', 'assessment', etc.
    ...
)
```

**การใช้งาน:**
- **Standalone Test**: `course_id = NULL, chapter_id = NULL, lesson_id = NULL`
- **Course Final Exam**: `course_id = 123, chapter_id = NULL, lesson_id = NULL`
- **Chapter Quiz**: `course_id = 123, chapter_id = 5, lesson_id = NULL`
- **Lesson Quiz**: `course_id = 123, chapter_id = 5, lesson_id = 12`

---

### 2. **QuestionBank** (คลังคำถามกลาง - สามารถนำมาใช้ซ้ำได้)
```sql
CREATE TABLE QuestionBank (
    question_id INT PRIMARY KEY,
    course_id INT NULL,          -- คำถามสำหรับ Course นี้
    chapter_id INT NULL,         -- คำถามสำหรับบทนี้
    lesson_id INT NULL,          -- คำถามสำหรับบทเรียนนี้
    question_text NVARCHAR(MAX),
    question_type VARCHAR(50),   -- 'multiple-choice', 'true-false', 'essay', etc.
    difficulty_level VARCHAR(20),
    topic_tags NVARCHAR(500),    -- JSON array: ["tag1", "tag2"]
    bloom_taxonomy_level VARCHAR(50),
    default_points DECIMAL(5,2),

    -- Analytics
    usage_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    success_rate DECIMAL(5,2),

    -- Metadata
    explanation NVARCHAR(MAX),
    hint NVARCHAR(MAX),
    is_public BIT DEFAULT 0,     -- สามารถใช้ในหลาย Course ได้
    is_verified BIT DEFAULT 0,
    ...
)
```

**การใช้งาน:**
- คำถามที่สร้างไว้ในคลังสามารถนำมาใช้ในหลายข้อสอบได้
- สามารถกรองคำถามตาม course_id, chapter_id, lesson_id, difficulty_level, tags

---

### 3. **Questions** (คำถามที่ผูกติดกับข้อสอบเฉพาะ)
```sql
CREATE TABLE Questions (
    question_id INT PRIMARY KEY,
    test_id INT,                 -- ผูกติดกับข้อสอบนี้เท่านั้น
    bank_id INT NULL,            -- อ้างอิงจาก QuestionBank (ถ้านำมาจากคลัง)
    question_type NVARCHAR(20),
    question_text NVARCHAR(MAX),
    points DECIMAL(5,2),
    difficulty_level INT,
    ...
)
```

**การใช้งาน:**
- สร้างคำถามใหม่โดยตรงในข้อสอบ (ไม่ผ่านคลัง)
- หรือคัดลอกจาก QuestionBank มาใช้ (ระบุ bank_id)

---

### 4. **TestQuestions** (ตารางเชื่อมระหว่าง Tests กับ QuestionBank)
```sql
CREATE TABLE TestQuestions (
    id INT PRIMARY KEY,
    test_id INT,
    question_id INT,             -- อ้างอิงไป QuestionBank
    question_order INT,
    points_override DECIMAL(5,2) NULL,  -- แทนที่คะแนนเดิม
    ...
    FOREIGN KEY (test_id) REFERENCES Tests(test_id),
    FOREIGN KEY (question_id) REFERENCES QuestionBank(question_id)
)
```

**การใช้งาน:**
- นำคำถามจาก QuestionBank มาใช้ในข้อสอบ
- สามารถปรับคะแนนต่อข้อสอบได้ (points_override)
- คำถามเดียวกันสามารถอยู่ในหลายข้อสอบได้

---

### 5. **AnswerOptions** (ตัวเลือกคำตอบสำหรับ QuestionBank)
```sql
CREATE TABLE AnswerOptions (
    option_id INT PRIMARY KEY,
    question_id INT,             -- อ้างอิงไป QuestionBank
    option_text NVARCHAR(MAX),
    is_correct BIT,
    option_order INT,
    ...
)
```

### 6. **QuestionOptions** (ตัวเลือกคำตอบสำหรับ Questions)
```sql
CREATE TABLE QuestionOptions (
    option_id INT PRIMARY KEY,
    question_id INT,             -- อ้างอิงไป Questions
    option_text NVARCHAR(500),
    is_correct BIT,
    option_order INT,
    ...
)
```

---

## 🎯 Use Cases

### Use Case 1: สร้างข้อสอบในแต่ละบท (Chapter Quiz)

```javascript
// 1. สร้างข้อสอบ
const test = await Test.create({
    course_id: 123,
    chapter_id: 5,
    lesson_id: 12,
    test_name: "Quiz: Introduction to Variables",
    test_type: "quiz",
    ...
});

// 2. เลือกคำถามจาก QuestionBank (ของบทนี้)
const questions = await QuestionBank.findAll({
    filters: {
        course_id: 123,
        chapter_id: 5,
        difficulty_level: "medium"
    },
    limit: 10
});

// 3. เพิ่มคำถามเข้าข้อสอบ
for (const question of questions) {
    await TestQuestions.create({
        test_id: test.test_id,
        question_id: question.question_id,
        question_order: index++
    });
}
```

---

### Use Case 2: สร้างข้อสอบหลัง Course (Final Exam)

```javascript
// 1. สร้างข้อสอบ
const finalExam = await Test.create({
    course_id: 123,
    chapter_id: null,          // ไม่เฉพาะบท
    lesson_id: null,
    test_name: "Final Exam: JavaScript Fundamentals",
    test_type: "exam",
    ...
});

// 2. เลือกคำถามจาก QuestionBank (ทุกบทใน Course)
const easyQuestions = await QuestionBank.findAll({
    filters: { course_id: 123, difficulty_level: "easy" },
    limit: 5
});
const mediumQuestions = await QuestionBank.findAll({
    filters: { course_id: 123, difficulty_level: "medium" },
    limit: 10
});
const hardQuestions = await QuestionBank.findAll({
    filters: { course_id: 123, difficulty_level: "hard" },
    limit: 5
});

// 3. รวมคำถามและสุ่มลำดับ
const allQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
shuffle(allQuestions);

// 4. เพิ่มเข้าข้อสอบ
for (const question of allQuestions) {
    await TestQuestions.create({
        test_id: finalExam.test_id,
        question_id: question.question_id,
        question_order: index++
    });
}
```

---

### Use Case 3: สร้างข้อสอบแยกต่างหาก (Standalone Test)

```javascript
// 1. สร้างข้อสอบ
const standaloneTest = await Test.create({
    course_id: null,           // ไม่เกี่ยวข้องกับ Course
    chapter_id: null,
    lesson_id: null,
    test_name: "JavaScript Certification Exam",
    test_type: "certification",
    ...
});

// 2. สร้างคำถามใหม่โดยตรง
const question = await Question.create({
    test_id: standaloneTest.test_id,
    question_type: "MULTIPLE_CHOICE",
    question_text: "What is the output of console.log(typeof null)?",
    points: 2,
    options: [
        { text: "object", is_correct: true },
        { text: "null", is_correct: false },
        { text: "undefined", is_correct: false }
    ]
});

// หรือนำคำถามจาก QuestionBank (ที่เป็น is_public = true)
const publicQuestions = await QuestionBank.findAll({
    filters: { is_public: true, is_verified: true },
    limit: 20
});
```

---

## 🔄 ข้อดีของระบบนี้

### 1. **ความยืดหยุ่น (Flexibility)**
- รองรับทั้ง 3 รูปแบบการทำข้อสอบ
- สามารถสลับระหว่าง QuestionBank และ Questions ได้

### 2. **การนำกลับมาใช้ (Reusability)**
- คำถามใน QuestionBank สามารถนำมาใช้ในหลายข้อสอบได้
- ลดการสร้างคำถามซ้ำซ้อน

### 3. **Analytics & Improvement**
- ติดตามสถิติการใช้งานคำถาม (usage_count, success_rate)
- ปรับระดับความยากตาม data จริง

### 4. **Tagging & Search**
- ค้นหาคำถามตาม tags, difficulty, bloom_taxonomy
- สร้างข้อสอบแบบอัตโนมัติตามเกณฑ์

### 5. **Version Control**
- แก้ไขคำถามโดยไม่กระทบข้อสอบเก่า
- Questions table เก็บ snapshot ของคำถามในเวลาที่สร้างข้อสอบ

---

## 📊 Flow ภาพรวม

```
Course
  └─> Tests (Final Exam) ─┐
  └─> Chapters            │
       └─> Lessons        │
            └─> Tests     │
                (Quiz)    │
                          ├─> TestQuestions ─> QuestionBank ─> AnswerOptions
Standalone Tests ─────────┘                └─> Questions ────> QuestionOptions
```

---

## 🚀 สรุป

**ระบบปัจจุบันรองรับครบทั้ง 3 แบบแล้ว!**

- ✅ **QuestionBank** = คลังคำถามที่สามารถนำมาใช้ซ้ำได้
- ✅ **Questions** = คำถามที่สร้างโดยตรงในข้อสอบ
- ✅ **TestQuestions** = การเชื่อมระหว่าง Tests กับ QuestionBank
- ✅ **Tests** = รองรับทั้ง Chapter Quiz, Final Exam, และ Standalone Test

**ไม่มีอะไรเป็นขยะ! ทุกอย่างมีประโยชน์และทำงานร่วมกันได้** 🎉
