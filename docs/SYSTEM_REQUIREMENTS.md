# LearnHub System Requirements Document
## ระบบจัดการการเรียนรู้ Rukchai Hongyen Learning Management System

**Version:** 1.0
**Last Updated:** 26 ธันวาคม 2567
**Document Type:** System Requirements Specification (SRS)

---

## สารบัญ

1. [ภาพรวมระบบ (System Overview)](#1-ภาพรวมระบบ-system-overview)
2. [สถาปัตยกรรมระบบ (System Architecture)](#2-สถาปัตยกรรมระบบ-system-architecture)
3. [โมดูลและฟังก์ชันการทำงาน (Modules & Features)](#3-โมดูลและฟังก์ชันการทำงาน-modules--features)
4. [ฐานข้อมูล (Database Schema)](#4-ฐานข้อมูล-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [ระบบรักษาความปลอดภัย (Security)](#6-ระบบรักษาความปลอดภัย-security)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [User Interface (UI/UX)](#8-user-interface-uiux)
9. [การตั้งค่าระบบ (System Configuration)](#9-การตั้งค่าระบบ-system-configuration)
10. [Requirements ทางเทคนิค (Technical Requirements)](#10-requirements-ทางเทคนิค-technical-requirements)

---

## 1. ภาพรวมระบบ (System Overview)

### 1.1 วัตถุประสงค์
LearnHub เป็นระบบจัดการการเรียนรู้ (Learning Management System - LMS) สำหรับองค์กร บริษัท รักชัยห้องเย็น จำกัด เพื่อ:

- จัดการหลักสูตรอบรมพนักงาน
- ทดสอบความรู้พนักงาน
- ติดตามความก้าวหน้าการเรียนรู้
- จัดการการสอบผู้สมัครงาน (Applicant Testing)
- วิเคราะห์และรายงานผลการเรียนรู้

### 1.2 กลุ่มผู้ใช้งาน (Target Users)

| กลุ่มผู้ใช้ | รายละเอียด |
|-----------|-----------|
| **Administrator** | ผู้ดูแลระบบ มีสิทธิ์เต็มทุกฟังก์ชัน |
| **HR** | ฝ่ายบุคคล จัดการผู้สมัครงานและการสอบ |
| **Instructor** | ผู้สอน สร้างและจัดการหลักสูตร |
| **Employee** | พนักงาน เรียนหลักสูตรและทำข้อสอบ |
| **Applicant** | ผู้สมัครงาน เข้าสอบตามรหัสที่ได้รับ |

### 1.3 ภาษาที่รองรับ
- ภาษาไทย (Thai) - ค่าเริ่มต้น
- ภาษาอังกฤษ (English)

---

## 2. สถาปัตยกรรมระบบ (System Architecture)

### 2.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    EJS      │  │  Tailwind   │  │ JavaScript  │         │
│  │  Templates  │  │    CSS      │  │    ES6+     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                      BACKEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Node.js    │  │  Express.js │  │  Socket.io  │         │
│  │  Runtime    │  │  Framework  │  │  Real-time  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                      DATABASE                                │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Microsoft SQL Server                │       │
│  │                    (MSSQL)                       │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 โครงสร้างโฟลเดอร์ (Directory Structure)

```
LearnHub/
├── config/                    # ไฟล์ Configuration
│   └── database.js            # การเชื่อมต่อฐานข้อมูล
│
├── controllers/               # Business Logic (14 controllers)
│   ├── authController.js      # Authentication
│   ├── dashboardController.js # Dashboard
│   ├── courseController.js    # หลักสูตร
│   ├── testController.js      # ข้อสอบ
│   ├── lessonController.js    # บทเรียน
│   ├── chapterController.js   # บท
│   ├── userController.js      # ผู้ใช้
│   ├── articleController.js   # บทความ
│   ├── applicantController.js # ผู้สมัคร
│   ├── hrApplicantController.js # HR ผู้สมัคร
│   ├── questionBankController.js # ธนาคารคำถาม
│   ├── settingController.js   # ตั้งค่า
│   ├── organizationController.js # องค์กร
│   └── materialProgressController.js # ความก้าวหน้า
│
├── middleware/                # Middleware
│   ├── auth.js                # Authentication check
│   ├── jwtAuth.js             # JWT verification
│   ├── security.js            # Security headers
│   ├── validation.js          # Input validation
│   ├── settingsMiddleware.js  # Settings loader
│   └── applicantAuth.js       # Applicant auth
│
├── models/                    # Data Models (25 models)
│   ├── User.js                # ผู้ใช้
│   ├── Course.js              # หลักสูตร
│   ├── Chapter.js             # บท
│   ├── Lesson.js              # บทเรียน
│   ├── Enrollment.js          # การลงทะเบียน
│   ├── Test.js                # ข้อสอบ
│   ├── Question.js            # คำถาม
│   ├── QuestionBank.js        # ธนาคารคำถาม
│   ├── Article.js             # บทความ
│   ├── Comment.js             # ความเห็น
│   ├── Applicant.js           # ผู้สมัคร
│   ├── ApplicantTestResult.js # ผลสอบผู้สมัคร
│   ├── ActivityLog.js         # บันทึกกิจกรรม
│   ├── Notification.js        # การแจ้งเตือน
│   ├── Badge.js               # เหรียญรางวัล
│   ├── Setting.js             # ตั้งค่า
│   ├── Department.js          # แผนก
│   ├── Position.js            # ตำแหน่ง
│   ├── JobPosition.js         # ตำแหน่งสมัครงาน
│   ├── OrganizationUnit.js    # หน่วยงาน
│   ├── CourseDiscussion.js    # การสนทนา
│   ├── ApplicantNote.js       # หมายเหตุ
│   ├── ApplicantTestAssignment.js # มอบหมายสอบ
│   ├── PositionTestSet.js     # ชุดข้อสอบตำแหน่ง
│   └── TestBank.js            # ธนาคารข้อสอบ
│
├── routes/                    # API Routes (17 files)
│   ├── auth.js                # /auth/*
│   ├── dashboard.js           # /dashboard/*
│   ├── courses.js             # /courses/*
│   ├── tests.js               # /tests/*
│   ├── users.js               # /users/*
│   ├── articles.js            # /articles/*
│   ├── applicants.js          # /applicants/*
│   ├── reports.js             # /reports/*
│   ├── organization.js        # /organization/*
│   ├── settings.js            # /settings/*
│   ├── notifications.js       # /notifications/*
│   ├── questionBank.js        # /question-bank/*
│   ├── language.js            # /language/*
│   ├── upload.js              # /upload/*
│   ├── certificates.js        # /certificates/*
│   ├── enrollment.js          # /enrollment/*
│   └── badges.js              # /badges/*
│
├── views/                     # EJS Templates (14 folders)
│   ├── layouts/               # Layout templates
│   ├── auth/                  # หน้าล็อกอิน
│   ├── dashboard/             # แดชบอร์ด
│   ├── courses/               # หลักสูตร
│   ├── tests/                 # ข้อสอบ
│   ├── articles/              # บทความ
│   ├── questions/             # ธนาคารคำถาม
│   ├── users/                 # ผู้ใช้
│   ├── applicants/            # ผู้สมัคร
│   ├── organization/          # องค์กร
│   ├── settings/              # ตั้งค่า
│   ├── reports/               # รายงาน
│   ├── notifications/         # แจ้งเตือน
│   └── error/                 # หน้า Error
│
├── utils/                     # Utilities (15 services)
│   ├── emailService.js        # ส่งอีเมล
│   ├── fileUpload.js          # อัพโหลดไฟล์
│   ├── jwtUtils.js            # JWT utilities
│   ├── validation.js          # Validation helpers
│   ├── logger.js              # Winston logger
│   ├── cryptoUtils.js         # เข้ารหัส
│   ├── passwordValidator.js   # ตรวจรหัสผ่าน
│   ├── passwordExpiryChecker.js # หมดอายุรหัส
│   ├── loginAttemptTracker.js # ติดตามล็อกอิน
│   ├── proctoringService.js   # ระบบคุมสอบ
│   ├── gamificationService.js # Gamification
│   ├── recurringCourseScheduler.js # ตารางซ้ำ
│   ├── languages.js           # i18n
│   ├── sessionConfig.js       # Session config
│   └── socketHandler.js       # WebSocket
│
├── public/                    # Static Files
│   ├── css/                   # Stylesheets
│   ├── js/                    # JavaScript
│   ├── images/                # รูปภาพ
│   └── uploads/               # ไฟล์อัพโหลด
│
├── migrations/                # Database Migrations
├── seeds/                     # Database Seeds
├── logs/                      # Application Logs
├── email-templates/           # Email Templates
├── export-template/           # Export Templates
│
├── server.js                  # Entry Point
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind Config
└── .env                       # Environment Variables
```

### 2.3 Dependencies หลัก

#### Framework & Core
| Package | Version | หน้าที่ |
|---------|---------|--------|
| express | 4.18.2 | Web framework |
| ejs | 3.1.9 | Template engine |

#### Database
| Package | Version | หน้าที่ |
|---------|---------|--------|
| mssql | 10.0.1 | SQL Server driver |

#### Authentication & Security
| Package | Version | หน้าที่ |
|---------|---------|--------|
| bcryptjs | 3.0.2 | Password hashing |
| jsonwebtoken | 9.0.2 | JWT tokens |
| express-session | 1.17.3 | Session management |
| helmet | 7.1.0 | Security headers |
| express-rate-limit | 7.1.5 | Rate limiting |
| cors | 2.8.5 | CORS support |

#### File Processing
| Package | Version | หน้าที่ |
|---------|---------|--------|
| multer | 1.4.5-lts.1 | File upload |
| exceljs | 4.4.0 | Excel export |
| xlsx | 0.18.5 | Excel import |
| csv-parser | 3.2.0 | CSV parsing |
| sharp | 0.33.5 | Image processing |

#### Communication
| Package | Version | หน้าที่ |
|---------|---------|--------|
| nodemailer | 6.10.1 | Email sending |
| socket.io | 4.8.1 | Real-time WebSocket |
| axios | 1.12.2 | HTTP client |

#### Utilities
| Package | Version | หน้าที่ |
|---------|---------|--------|
| moment | 2.29.4 | Date/time handling |
| uuid | 9.0.1 | Unique ID generation |
| sanitize-html | 2.11.0 | HTML sanitization |
| winston | 3.17.0 | Logging |
| express-validator | 7.2.1 | Form validation |

---

## 3. โมดูลและฟังก์ชันการทำงาน (Modules & Features)

### 3.1 โมดูล Authentication (การยืนยันตัวตน)

#### 3.1.1 การเข้าสู่ระบบ (Login)

**Requirement ID:** AUTH-001
**Priority:** Critical

| Feature | รายละเอียด |
|---------|-----------|
| **Login Method** | Employee ID หรือ เลขบัตรประชาชน + รหัสผ่าน |
| **Remember Me** | จดจำการเข้าสู่ระบบ 30 วัน |
| **Session Duration** | 24 ชั่วโมง (ค่าเริ่มต้น) |
| **JWT Token** | Access Token + Refresh Token |
| **Login Attempt Limit** | 5 ครั้ง ก่อนล็อคบัญชี 15 นาที |

**Flow การเข้าสู่ระบบ:**
```
1. ผู้ใช้กรอก Employee ID/ID Card + Password
2. ระบบตรวจสอบบัญชีถูกล็อคหรือไม่
3. ตรวจสอบรหัสผ่านด้วย bcrypt
4. โหลด Role & Permissions
5. สร้าง Session และ JWT Token
6. ตรวจสอบการหมดอายุรหัสผ่าน
7. Redirect ไป Dashboard หรือ Force Change Password
```

**หน้าจอ:**
- URL: `/auth/login`
- Components:
  - Logo บริษัท (จาก Settings)
  - Input Employee ID
  - Input Password
  - Checkbox Remember Me
  - ปุ่ม Login
  - ลิงก์ Forgot Password
  - Language Switcher (ไทย/English)
  - ลิงก์ Applicant Test Login

#### 3.1.2 การลืมรหัสผ่าน (Forgot Password)

**Requirement ID:** AUTH-002
**Priority:** High

| Feature | รายละเอียด |
|---------|-----------|
| **Method** | ส่งลิงก์รีเซ็ตทาง Email |
| **Token Expiry** | 1 ชั่วโมง |
| **Security** | One-time use token |

**หน้าจอ:**
- URL: `/auth/forgot-password`
- Components:
  - Logo บริษัท
  - Input Email
  - ปุ่มส่งลิงก์รีเซ็ต
  - กล่องข้อมูลสำคัญ
  - ลิงก์กลับหน้า Login

#### 3.1.3 การรีเซ็ตรหัสผ่าน (Reset Password)

**Requirement ID:** AUTH-003
**Priority:** High

| Feature | รายละเอียด |
|---------|-----------|
| **Password Requirements** | อย่างน้อย 8 ตัวอักษร |
| | มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว |
| | มีตัวพิมพ์เล็กอย่างน้อย 1 ตัว |
| | มีตัวเลขอย่างน้อย 1 ตัว |
| **Validation** | Real-time password strength check |

**หน้าจอ:**
- URL: `/auth/reset-password?token=xxx`
- Components:
  - Input New Password
  - Input Confirm Password
  - Password Requirements Checklist
  - ปุ่ม Reset Password

#### 3.1.4 การบังคับเปลี่ยนรหัสผ่าน (Force Change Password)

**Requirement ID:** AUTH-004
**Priority:** High

**Trigger Conditions:**
- รหัสผ่านหมดอายุ (90 วัน default)
- Admin บังคับให้เปลี่ยน
- Login ครั้งแรก

---

### 3.2 โมดูล Dashboard (แดชบอร์ด)

#### 3.2.1 Dashboard หลัก

**Requirement ID:** DASH-001
**Priority:** High

**Components:**

| Component | รายละเอียด |
|-----------|-----------|
| **Welcome Banner** | แสดงชื่อผู้ใช้และข้อความต้อนรับ |
| **Quick Stats** | จำนวนหลักสูตร, ข้อสอบ, Badges |
| **Learning Progress** | กราฟความก้าวหน้าการเรียน |
| **Recent Courses** | หลักสูตรล่าสุดที่ลงทะเบียน |
| **Upcoming Events** | กิจกรรม/หลักสูตรที่กำลังจะมา |
| **Notifications** | การแจ้งเตือนล่าสุด |
| **Leaderboard** | อันดับผู้เรียนดีเด่น |
| **My Badges** | เหรียญรางวัลที่ได้รับ |

**Real-time Updates:**
- Socket.io สำหรับ update notifications
- Auto-refresh stats ทุก 30 วินาที

---

### 3.3 โมดูล Course Management (จัดการหลักสูตร)

#### 3.3.1 รายการหลักสูตร

**Requirement ID:** COURSE-001
**Priority:** Critical

**หน้าจอ:**
- URL: `/courses`

**Features:**
| Feature | รายละเอียด |
|---------|-----------|
| **Filter** | ตามหมวดหมู่, ระดับความยาก, สถานะ |
| **Search** | ค้นหาตามชื่อหลักสูตร |
| **Sort** | ตามวันที่, ชื่อ, ความนิยม |
| **View Mode** | Grid view / List view |
| **Pagination** | 12 รายการต่อหน้า |

**Course Card แสดง:**
- รูปปก (Thumbnail)
- ชื่อหลักสูตร
- หมวดหมู่
- ระดับความยาก (Easy/Medium/Hard)
- จำนวนบท
- ระยะเวลา
- จำนวนผู้ลงทะเบียน
- Rating (ถ้ามี)
- ปุ่ม Enroll / Continue

#### 3.3.2 รายละเอียดหลักสูตร

**Requirement ID:** COURSE-002
**Priority:** Critical

**หน้าจอ:**
- URL: `/courses/:course_id`

**Sections:**

| Section | รายละเอียด |
|---------|-----------|
| **Header** | ชื่อ, รูปปก, คำอธิบายสั้น |
| **Info Panel** | ระดับ, ระยะเวลา, ผู้สอน, จำนวนบท |
| **Description** | คำอธิบายเต็ม (Rich Text) |
| **Chapters** | รายการบทพร้อม lessons |
| **Prerequisites** | หลักสูตรที่ต้องเรียนก่อน |
| **Target Audience** | ตำแหน่ง/แผนกเป้าหมาย |
| **Reviews** | รีวิวจากผู้เรียน |
| **Discussion** | กระทู้สนทนา |

**Actions:**
- ปุ่ม Enroll (ลงทะเบียน)
- ปุ่ม Continue (เรียนต่อ)
- ปุ่ม Share (แชร์)
- ปุ่ม Add to Wishlist

#### 3.3.3 สร้าง/แก้ไขหลักสูตร

**Requirement ID:** COURSE-003
**Priority:** High

**หน้าจอ:**
- URL: `/courses/create` | `/courses/:id/edit`

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **ชื่อหลักสูตร** | Text | Yes | Max 200 chars |
| **รหัสหลักสูตร** | Text | Yes | Unique |
| **คำอธิบายสั้น** | Text | Yes | Max 500 chars |
| **คำอธิบายเต็ม** | Rich Text | No | - |
| **หมวดหมู่** | Select | Yes | - |
| **ระดับความยาก** | Select | Yes | Easy/Medium/Hard |
| **รูปปก** | File | No | Image only, Max 5MB |
| **ระยะเวลา** | Number | No | Hours |
| **สถานะ** | Select | Yes | Draft/Published/Archived |
| **กลุ่มเป้าหมาย** | Multi-select | No | ตำแหน่ง/แผนก |
| **Prerequisites** | Multi-select | No | หลักสูตรอื่น |
| **Passing Score** | Number | Yes | 0-100% |
| **Certificate** | Checkbox | No | ออกใบประกาศ |
| **Is Recurring** | Checkbox | No | หลักสูตรซ้ำ |
| **Recurrence Period** | Select | Conditional | Monthly/Quarterly/Yearly |

**Wizard Steps:**
1. ข้อมูลพื้นฐาน
2. เนื้อหา (บท/บทเรียน)
3. ข้อสอบ
4. การตั้งค่า
5. ตรวจสอบและเผยแพร่

#### 3.3.4 หมวดหมู่หลักสูตร

**Requirement ID:** COURSE-004
**Priority:** Medium

**หน้าจอ:**
- URL: `/courses/categories`

**Features:**
- เพิ่ม/แก้ไข/ลบหมวดหมู่
- ลำดับการแสดง (Sort Order)
- ไอคอนหมวดหมู่
- สี (Color Code)
- หมวดหมู่ย่อย (Nested)

#### 3.3.5 บทและบทเรียน

**Requirement ID:** COURSE-005
**Priority:** Critical

**Chapter Fields:**
| Field | Type | Required |
|-------|------|----------|
| **ชื่อบท** | Text | Yes |
| **คำอธิบาย** | Text | No |
| **ลำดับ** | Number | Yes |

**Lesson Types:**
| Type | รายละเอียด |
|------|-----------|
| **Video** | YouTube, Vimeo, หรือ Upload |
| **Document** | PDF, Word, PowerPoint |
| **Rich Text** | บทความ HTML |
| **Quiz** | ข้อสอบท้ายบท |
| **Assignment** | งานที่มอบหมาย |

**Lesson Fields:**
| Field | Type | Required |
|-------|------|----------|
| **ชื่อบทเรียน** | Text | Yes |
| **ประเภท** | Select | Yes |
| **เนื้อหา** | Varies | Yes |
| **ระยะเวลา** | Number | No |
| **ลำดับ** | Number | Yes |
| **Is Preview** | Checkbox | No |

---

### 3.4 โมดูล Test Management (จัดการข้อสอบ)

#### 3.4.1 รายการข้อสอบ

**Requirement ID:** TEST-001
**Priority:** Critical

**หน้าจอ:**
- URL: `/tests`

**Features:**
- Filter ตามหลักสูตร, สถานะ
- Search ตามชื่อ
- แสดงจำนวนคำถาม, เวลา, คะแนนผ่าน

#### 3.4.2 สร้าง/แก้ไขข้อสอบ

**Requirement ID:** TEST-002
**Priority:** Critical

**Test Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **ชื่อข้อสอบ** | Text | Yes | Max 200 chars |
| **คำอธิบาย** | Text | No | - |
| **หลักสูตร** | Select | No | - |
| **เวลา** | Number | Yes | นาที |
| **คะแนนผ่าน** | Number | Yes | 0-100% |
| **จำนวนครั้งที่สอบได้** | Number | Yes | 0 = ไม่จำกัด |
| **สุ่มคำถาม** | Checkbox | No | - |
| **สุ่มตัวเลือก** | Checkbox | No | - |
| **แสดงเฉลย** | Select | Yes | After Submit/After Due/Never |
| **สถานะ** | Select | Yes | Draft/Active/Closed |

#### 3.4.3 Question Types (ประเภทคำถาม)

**Requirement ID:** TEST-003
**Priority:** Critical

| Type | รายละเอียด | Scoring |
|------|-----------|---------|
| **Multiple Choice** | เลือกตอบ 1 ข้อ | Auto |
| **Multiple Select** | เลือกได้หลายข้อ | Auto |
| **True/False** | ถูก/ผิด | Auto |
| **Fill in Blank** | เติมคำ | Auto/Manual |
| **Matching** | จับคู่ | Auto |
| **Ordering** | เรียงลำดับ | Auto |
| **Essay** | เขียนตอบ | Manual |

**Question Fields:**
| Field | Type | Required |
|-------|------|----------|
| **คำถาม** | Rich Text | Yes |
| **รูปประกอบ** | Image | No |
| **ตัวเลือก** | Array | Conditional |
| **คำตอบที่ถูก** | Varies | Yes |
| **คำอธิบาย** | Text | No |
| **คะแนน** | Number | Yes |
| **ระดับความยาก** | Select | No |
| **หมวดหมู่** | Select | No |

#### 3.4.4 หน้าทำข้อสอบ

**Requirement ID:** TEST-004
**Priority:** Critical

**หน้าจอ:**
- URL: `/tests/:test_id/take`

**Features:**
| Feature | รายละเอียด |
|---------|-----------|
| **Timer** | นับถอยหลังเวลาที่เหลือ |
| **Progress** | แสดงจำนวนข้อที่ตอบแล้ว |
| **Navigation** | ไปข้อก่อน/หลัง, Jump to question |
| **Flag** | ทำเครื่องหมายข้อที่ต้องกลับมาดู |
| **Auto Save** | บันทึกคำตอบอัตโนมัติ |
| **Submit** | ส่งข้อสอบ |
| **Review** | ทบทวนก่อนส่ง |

**Auto Submit:**
- เมื่อหมดเวลา
- เมื่อปิดหน้าต่าง (warning)

#### 3.4.5 ผลข้อสอบ

**Requirement ID:** TEST-005
**Priority:** High

**หน้าจอ:**
- URL: `/tests/:test_id/results`

**แสดง:**
- คะแนนที่ได้ / คะแนนเต็ม
- สถานะ ผ่าน/ไม่ผ่าน
- เวลาที่ใช้
- จำนวนข้อถูก/ผิด/ไม่ตอบ
- กราฟวิเคราะห์ตามหมวดหมู่
- รายละเอียดแต่ละข้อ (ถ้าเปิด)
- ปุ่มสอบใหม่ (ถ้าได้)
- ปุ่มพิมพ์ผล

---

### 3.5 โมดูล Question Bank (ธนาคารคำถาม)

#### 3.5.1 รายการคำถาม

**Requirement ID:** QB-001
**Priority:** High

**หน้าจอ:**
- URL: `/courses/:courseId/questions`

**Features:**
- Filter ตามประเภท, หมวดหมู่, ระดับความยาก
- Search ตามคำถาม
- Bulk import จาก Excel
- Bulk delete
- Export to Excel

#### 3.5.2 จัดการคำถาม

**Requirement ID:** QB-002
**Priority:** High

**Features:**
- สร้าง/แก้ไข/ลบ/คัดลอกคำถาม
- Preview คำถาม
- จัดกลุ่มตามหมวดหมู่
- แท็กคำถาม
- สถิติการใช้งาน

---

### 3.6 โมดูล User Management (จัดการผู้ใช้)

#### 3.6.1 รายการผู้ใช้

**Requirement ID:** USER-001
**Priority:** Critical

**หน้าจอ:**
- URL: `/users`

**Features:**
| Feature | รายละเอียด |
|---------|-----------|
| **Filter** | ตาม Role, แผนก, สถานะ |
| **Search** | ตามชื่อ, รหัสพนักงาน, อีเมล |
| **Bulk Actions** | Activate, Deactivate, Delete, Reset Password |
| **Export** | CSV, Excel |
| **Import** | Excel, CSV |

#### 3.6.2 สร้าง/แก้ไขผู้ใช้

**Requirement ID:** USER-002
**Priority:** Critical

**User Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **รหัสพนักงาน** | Text | Yes | Unique |
| **เลขบัตรประชาชน** | Text | No | 13 digits |
| **คำนำหน้า** | Select | Yes | - |
| **ชื่อ** | Text | Yes | - |
| **นามสกุล** | Text | Yes | - |
| **ชื่อ (EN)** | Text | No | - |
| **นามสกุล (EN)** | Text | No | - |
| **อีเมล** | Email | Yes | Valid email |
| **เบอร์โทร** | Text | No | - |
| **แผนก** | Select | Yes | - |
| **ตำแหน่ง** | Select | Yes | - |
| **หน่วยงาน** | Select | No | - |
| **Role** | Select | Yes | - |
| **รูปโปรไฟล์** | Image | No | Max 2MB |
| **สถานะ** | Select | Yes | Active/Inactive |

#### 3.6.3 โปรไฟล์ผู้ใช้

**Requirement ID:** USER-003
**Priority:** High

**หน้าจอ:**
- URL: `/users/profile`

**Sections:**
- ข้อมูลส่วนตัว
- เปลี่ยนรหัสผ่าน
- การตั้งค่าส่วนตัว
- ประวัติการเรียน
- ใบประกาศนียบัตร
- เหรียญรางวัล

#### 3.6.4 Import ผู้ใช้

**Requirement ID:** USER-004
**Priority:** Medium

**Template Fields:**
```
employee_id, id_card, prefix, first_name, last_name,
first_name_en, last_name_en, email, phone,
department_id, position_id, org_unit_id, role
```

**Validation:**
- ตรวจสอบ duplicate employee_id
- ตรวจสอบ email format
- ตรวจสอบ id_card format (ถ้ามี)
- Skip หรือ Update ถ้าซ้ำ

---

### 3.7 โมดูล Applicant Management (จัดการผู้สมัคร)

#### 3.7.1 หน้า Login ผู้สมัคร

**Requirement ID:** APPL-001
**Priority:** High

**หน้าจอ:**
- URL: `/applicants/test/login`

**Login Methods:**
1. **รหัสทดสอบ (Test Code)** - สำหรับสอบครั้งเดียว
2. **เลขบัตรประชาชน + รหัสผ่าน** - สำหรับสอบหลายรอบ

#### 3.7.2 การลงทะเบียนผู้สมัคร

**Requirement ID:** APPL-002
**Priority:** High

**Registration Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| **เลขบัตรประชาชน** | Text | Yes | 13 digits, Checksum |
| **ชื่อ** | Text | Yes | - |
| **นามสกุล** | Text | Yes | - |
| **อีเมล** | Email | Yes | Valid email |
| **เบอร์โทร** | Text | Yes | 10 digits |
| **ตำแหน่งที่สมัคร** | Select | Yes | - |

#### 3.7.3 หน้าสอบผู้สมัคร

**Requirement ID:** APPL-003
**Priority:** Critical

**หน้าจอ:**
- URL: `/applicants/test/:test_code`

**Features:**
- เหมือนหน้าสอบพนักงาน
- Proctoring เบื้องต้น (tab change warning)
- ไม่แสดงเฉลยจนกว่า HR อนุมัติ

#### 3.7.4 ผลสอบผู้สมัคร

**Requirement ID:** APPL-004
**Priority:** High

**หน้าจอ:**
- URL: `/applicants/result/:result_id`

**แสดง:**
- คะแนนรวม
- สถานะ ผ่าน/ไม่ผ่าน
- รายละเอียดตามหมวดหมู่
- Certificate (ถ้าผ่าน)
- ปุ่ม Share/Print

#### 3.7.5 ระบบจัดการ HR

**Requirement ID:** APPL-005
**Priority:** High

**หน้าจอ:**
- URL: `/applicants/admin`

**Features:**
| Feature | รายละเอียด |
|---------|-----------|
| **รายการผู้สมัคร** | Filter, Search, Sort |
| **สร้างผู้สมัคร** | Manual entry |
| **สร้างรหัสสอบ** | Generate test code |
| **มอบหมายข้อสอบ** | Assign test set |
| **ดูผลสอบ** | View all results |
| **หมายเหตุ** | Add notes |
| **Export** | Excel report |
| **Email** | ส่งรหัสสอบทางอีเมล |

#### 3.7.6 ชุดข้อสอบตามตำแหน่ง

**Requirement ID:** APPL-006
**Priority:** Medium

**Features:**
- กำหนดชุดข้อสอบสำหรับแต่ละตำแหน่ง
- หลายข้อสอบใน 1 ชุด
- ลำดับการสอบ
- คะแนนรวมถ่วงน้ำหนัก

---

### 3.8 โมดูล Article/Knowledge Base (บทความ)

#### 3.8.1 รายการบทความ

**Requirement ID:** ART-001
**Priority:** Medium

**หน้าจอ:**
- URL: `/articles`

**Features:**
- Filter ตามหมวดหมู่, ผู้เขียน
- Search ตามหัวข้อ, เนื้อหา
- Featured Articles
- Most Viewed
- Recent Articles

#### 3.8.2 รายละเอียดบทความ

**Requirement ID:** ART-002
**Priority:** Medium

**หน้าจอ:**
- URL: `/articles/:article_id`

**Sections:**
- หัวข้อ, รูปปก
- ผู้เขียน, วันที่
- เนื้อหา (Rich Text)
- Tags
- Related Articles
- Comments
- Like/Share

#### 3.8.3 สร้าง/แก้ไขบทความ

**Requirement ID:** ART-003
**Priority:** Medium

**Article Fields:**
| Field | Type | Required |
|-------|------|----------|
| **หัวข้อ** | Text | Yes |
| **รูปปก** | Image | No |
| **เนื้อหา** | Rich Text | Yes |
| **หมวดหมู่** | Select | Yes |
| **Tags** | Multi-select | No |
| **สถานะ** | Select | Yes |
| **Featured** | Checkbox | No |

---

### 3.9 โมดูล Reports (รายงาน)

#### 3.9.1 รายงานความก้าวหน้าการเรียน

**Requirement ID:** RPT-001
**Priority:** High

**หน้าจอ:**
- URL: `/reports/learning-progress`

**Filters:**
- ช่วงวันที่
- แผนก
- หลักสูตร
- ผู้ใช้

**Metrics:**
- จำนวนผู้ลงทะเบียน
- อัตราการเรียนจบ
- คะแนนเฉลี่ย
- เวลาเรียนเฉลี่ย

**Charts:**
- Progress by Department
- Completion Trend
- Top Performers

**Export:** CSV, Excel, PDF

#### 3.9.2 รายงานผลข้อสอบ

**Requirement ID:** RPT-002
**Priority:** High

**หน้าจอ:**
- URL: `/reports/test-results`

**Metrics:**
- จำนวนผู้สอบ
- อัตราผ่าน
- คะแนนเฉลี่ย/สูงสุด/ต่ำสุด
- ข้อที่ผิดบ่อย

#### 3.9.3 รายงานวิเคราะห์หลักสูตร

**Requirement ID:** RPT-003
**Priority:** Medium

**หน้าจอ:**
- URL: `/reports/course-analytics`

**Metrics:**
- Enrollment Rate
- Completion Rate
- Engagement Rate
- Rating Average
- Drop-off Points

#### 3.9.4 รายงานประสิทธิภาพแผนก

**Requirement ID:** RPT-004
**Priority:** Medium

**หน้าจอ:**
- URL: `/reports/department-performance`

**Metrics:**
- จำนวนหลักสูตรที่เรียนจบ per แผนก
- คะแนนเฉลี่ย per แผนก
- เวลาเรียนรวม per แผนก
- Ranking แผนก

#### 3.9.5 รายงานใบประกาศนียบัตร

**Requirement ID:** RPT-005
**Priority:** Low

**หน้าจอ:**
- URL: `/reports/certifications`

**Metrics:**
- จำนวนใบประกาศที่ออก
- แยกตามหลักสูตร
- แยกตามแผนก
- ใบประกาศที่จะหมดอายุ

---

### 3.10 โมดูล Organization (โครงสร้างองค์กร)

#### 3.10.1 โครงสร้างหน่วยงาน

**Requirement ID:** ORG-001
**Priority:** Medium

**หน้าจอ:**
- URL: `/organization`

**Hierarchy Levels:**
1. Company (บริษัท)
2. Branch (สาขา)
3. Office (สำนักงาน)
4. Division (ฝ่าย)
5. Department (แผนก)
6. Section (หน่วย)

**Features:**
- Tree View
- Drag & Drop จัดลำดับ
- CRUD operations
- Head of Unit assignment

#### 3.10.2 จัดการตำแหน่ง

**Requirement ID:** ORG-002
**Priority:** Medium

**Features:**
- รายการตำแหน่งงาน
- เพิ่ม/แก้ไข/ลบ
- กำหนด Level
- Salary Range (optional)

---

### 3.11 โมดูล Settings (ตั้งค่าระบบ)

#### 3.11.1 การตั้งค่าทั่วไป

**Requirement ID:** SET-001
**Priority:** High

**หน้าจอ:**
- URL: `/settings`

**Categories:**

**1. General Settings:**
| Setting | Type | Default |
|---------|------|---------|
| site_name | Text | Rukchai Hongyen LearnHub |
| company_name | Text | บริษัท รักชัยห้องเย็น จำกัด |
| company_name_en | Text | Rukchai Hongyen Co., Ltd. |
| logo_url | Image | /images/logo.png |
| primary_color | Color | #0090D3 |
| secondary_color | Color | #3AAA35 |
| timezone | Select | Asia/Bangkok |
| date_format | Select | DD/MM/YYYY |

**2. Security Settings:**
| Setting | Type | Default |
|---------|------|---------|
| password_expiry_days | Number | 90 |
| min_password_length | Number | 8 |
| require_uppercase | Boolean | true |
| require_lowercase | Boolean | true |
| require_number | Boolean | true |
| require_special | Boolean | false |
| max_login_attempts | Number | 5 |
| lockout_duration_minutes | Number | 15 |
| session_timeout_hours | Number | 24 |

**3. Email Settings:**
| Setting | Type | Default |
|---------|------|---------|
| smtp_host | Text | smtp.gmail.com |
| smtp_port | Number | 587 |
| smtp_user | Text | - |
| smtp_password | Password | - |
| email_from_name | Text | LearnHub |
| email_from_address | Email | - |

**4. Course Settings:**
| Setting | Type | Default |
|---------|------|---------|
| default_passing_score | Number | 70 |
| allow_course_review | Boolean | true |
| allow_course_discussion | Boolean | true |
| certificate_template | File | - |

**5. Test Settings:**
| Setting | Type | Default |
|---------|------|---------|
| default_test_duration | Number | 60 |
| show_answers_after_submit | Boolean | true |
| allow_multiple_attempts | Boolean | false |
| max_attempts | Number | 3 |

#### 3.11.2 Audit Log

**Requirement ID:** SET-002
**Priority:** Medium

**หน้าจอ:**
- URL: `/settings/audit-log`

**Track:**
- Setting changes
- User who changed
- Old value → New value
- Timestamp

---

### 3.12 โมดูล Notifications (การแจ้งเตือน)

#### 3.12.1 รายการแจ้งเตือน

**Requirement ID:** NOTIF-001
**Priority:** Medium

**หน้าจอ:**
- URL: `/notifications`

**Features:**
- รายการแจ้งเตือนทั้งหมด
- Filter: Read/Unread
- Mark as Read
- Mark All as Read
- Delete

**Notification Types:**
| Type | Trigger |
|------|---------|
| **Course Assigned** | เมื่อถูก assign หลักสูตร |
| **Course Completed** | เมื่อเรียนจบหลักสูตร |
| **Test Available** | เมื่อมีข้อสอบใหม่ |
| **Test Result** | เมื่อได้รับผลสอบ |
| **Certificate Issued** | เมื่อได้ใบประกาศ |
| **Badge Earned** | เมื่อได้ Badge |
| **Course Due Soon** | เมื่อใกล้ deadline |
| **Password Expiry** | รหัสผ่านจะหมดอายุ |
| **System Announcement** | ประกาศจากระบบ |

---

### 3.13 โมดูล Gamification

#### 3.13.1 ระบบ Badge

**Requirement ID:** GAME-001
**Priority:** Low

**Badge Types:**
| Badge | Condition |
|-------|-----------|
| **First Login** | Login ครั้งแรก |
| **Profile Complete** | กรอกข้อมูลครบ |
| **First Course** | เรียนจบหลักสูตรแรก |
| **Course Master** | เรียนจบ 5 หลักสูตร |
| **Perfect Score** | สอบได้ 100% |
| **Quick Learner** | เรียนจบภายใน 1 วัน |
| **Consistent Learner** | เรียนต่อเนื่อง 7 วัน |
| **Top Performer** | อันดับ 1 ของแผนก |

#### 3.13.2 Leaderboard

**Requirement ID:** GAME-002
**Priority:** Low

**Rankings:**
- Overall (ทั้งบริษัท)
- By Department (แผนก)
- Monthly/Yearly

**Metrics:**
- คะแนนรวม
- จำนวน Badges
- หลักสูตรที่เรียนจบ

---

## 4. ฐานข้อมูล (Database Schema)

### 4.1 ER Diagram Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Users    │────<│ Enrollments │>────│   Courses   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│TestAttempts │────<│    Tests    │>────│  Chapters   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Questions  │     │   Lessons   │
                    └─────────────┘     └─────────────┘
```

### 4.2 ตารางหลัก

#### Users
```sql
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY,
    employee_id NVARCHAR(50) UNIQUE NOT NULL,
    id_card NVARCHAR(13),
    prefix NVARCHAR(20),
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    first_name_en NVARCHAR(100),
    last_name_en NVARCHAR(100),
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    department_id INT FOREIGN KEY,
    position_id INT FOREIGN KEY,
    org_unit_id INT FOREIGN KEY,
    role NVARCHAR(20) DEFAULT 'employee',
    profile_image NVARCHAR(500),
    is_active BIT DEFAULT 1,
    password_changed_at DATETIME,
    force_password_change BIT DEFAULT 0,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
```

#### Courses
```sql
CREATE TABLE Courses (
    course_id INT PRIMARY KEY IDENTITY,
    course_code NVARCHAR(50) UNIQUE NOT NULL,
    title NVARCHAR(200) NOT NULL,
    short_description NVARCHAR(500),
    description NVARCHAR(MAX),
    category_id INT FOREIGN KEY,
    difficulty_level NVARCHAR(20) DEFAULT 'medium',
    thumbnail NVARCHAR(500),
    duration_hours DECIMAL(5,2),
    passing_score INT DEFAULT 70,
    is_certificate_enabled BIT DEFAULT 0,
    is_recurring BIT DEFAULT 0,
    recurrence_period NVARCHAR(20),
    status NVARCHAR(20) DEFAULT 'draft',
    instructor_id INT FOREIGN KEY,
    created_by INT FOREIGN KEY,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
```

#### Chapters
```sql
CREATE TABLE Chapters (
    chapter_id INT PRIMARY KEY IDENTITY,
    course_id INT FOREIGN KEY NOT NULL,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(500),
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);
```

#### Lessons
```sql
CREATE TABLE Lessons (
    lesson_id INT PRIMARY KEY IDENTITY,
    chapter_id INT FOREIGN KEY NOT NULL,
    title NVARCHAR(200) NOT NULL,
    content_type NVARCHAR(20) NOT NULL,
    content NVARCHAR(MAX),
    video_url NVARCHAR(500),
    file_url NVARCHAR(500),
    duration_minutes INT,
    sort_order INT DEFAULT 0,
    is_preview BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);
```

#### Tests
```sql
CREATE TABLE Tests (
    test_id INT PRIMARY KEY IDENTITY,
    course_id INT FOREIGN KEY,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(500),
    duration_minutes INT DEFAULT 60,
    passing_score INT DEFAULT 70,
    max_attempts INT DEFAULT 0,
    shuffle_questions BIT DEFAULT 0,
    shuffle_options BIT DEFAULT 0,
    show_answers NVARCHAR(20) DEFAULT 'after_submit',
    status NVARCHAR(20) DEFAULT 'draft',
    created_by INT FOREIGN KEY,
    created_at DATETIME DEFAULT GETDATE()
);
```

#### Questions
```sql
CREATE TABLE Questions (
    question_id INT PRIMARY KEY IDENTITY,
    test_id INT FOREIGN KEY,
    question_bank_id INT FOREIGN KEY,
    question_type NVARCHAR(20) NOT NULL,
    question_text NVARCHAR(MAX) NOT NULL,
    question_image NVARCHAR(500),
    options NVARCHAR(MAX), -- JSON array
    correct_answer NVARCHAR(MAX),
    explanation NVARCHAR(MAX),
    points INT DEFAULT 1,
    difficulty_level NVARCHAR(20),
    category NVARCHAR(100),
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);
```

#### Enrollments
```sql
CREATE TABLE Enrollments (
    enrollment_id INT PRIMARY KEY IDENTITY,
    user_id INT FOREIGN KEY NOT NULL,
    course_id INT FOREIGN KEY NOT NULL,
    enrolled_at DATETIME DEFAULT GETDATE(),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'enrolled',
    completed_at DATETIME,
    certificate_issued BIT DEFAULT 0,
    certificate_url NVARCHAR(500)
);
```

#### TestAttempts
```sql
CREATE TABLE TestAttempts (
    attempt_id INT PRIMARY KEY IDENTITY,
    test_id INT FOREIGN KEY NOT NULL,
    user_id INT FOREIGN KEY,
    applicant_id INT FOREIGN KEY,
    started_at DATETIME DEFAULT GETDATE(),
    completed_at DATETIME,
    score DECIMAL(5,2),
    passed BIT,
    answers NVARCHAR(MAX), -- JSON
    time_spent_seconds INT
);
```

#### Applicants
```sql
CREATE TABLE Applicants (
    applicant_id INT PRIMARY KEY IDENTITY,
    id_card NVARCHAR(13) NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    position_id INT FOREIGN KEY,
    password_hash NVARCHAR(255),
    test_code NVARCHAR(20) UNIQUE,
    test_code_expires_at DATETIME,
    status NVARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT GETDATE()
);
```

(ดูตารางเพิ่มเติมใน database schema documentation)

---

## 5. API Endpoints

### 5.1 Authentication APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | เข้าสู่ระบบ |
| POST | `/auth/logout` | ออกจากระบบ |
| POST | `/auth/forgot-password` | ขอลิงก์รีเซ็ตรหัสผ่าน |
| POST | `/auth/reset-password` | รีเซ็ตรหัสผ่าน |
| POST | `/auth/change-password` | เปลี่ยนรหัสผ่าน |
| GET | `/auth/verify-token` | ตรวจสอบ token |
| POST | `/auth/refresh-token` | รีเฟรช token |

### 5.2 Course APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/courses/api/list` | รายการหลักสูตร |
| GET | `/courses/api/:id` | รายละเอียดหลักสูตร |
| POST | `/courses/api/create` | สร้างหลักสูตร |
| PUT | `/courses/api/:id` | แก้ไขหลักสูตร |
| DELETE | `/courses/api/:id` | ลบหลักสูตร |
| POST | `/courses/api/:id/enroll` | ลงทะเบียน |
| PUT | `/courses/api/:id/progress` | อัพเดทความก้าวหน้า |
| GET | `/courses/api/:id/analytics` | วิเคราะห์หลักสูตร |
| GET | `/courses/api/categories` | รายการหมวดหมู่ |
| POST | `/courses/api/categories` | สร้างหมวดหมู่ |

### 5.3 Test APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tests/api/list` | รายการข้อสอบ |
| GET | `/tests/api/:id` | รายละเอียดข้อสอบ |
| POST | `/tests/api/create` | สร้างข้อสอบ |
| PUT | `/tests/api/:id` | แก้ไขข้อสอบ |
| DELETE | `/tests/api/:id` | ลบข้อสอบ |
| GET | `/tests/api/:id/questions` | รายการคำถาม |
| POST | `/tests/api/:id/start` | เริ่มทำข้อสอบ |
| POST | `/tests/api/:id/submit` | ส่งข้อสอบ |
| GET | `/tests/api/:id/results` | ผลข้อสอบ |

### 5.4 User APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/api/list` | รายการผู้ใช้ |
| GET | `/users/api/:id` | รายละเอียดผู้ใช้ |
| POST | `/users/api/create` | สร้างผู้ใช้ |
| PUT | `/users/api/:id` | แก้ไขผู้ใช้ |
| DELETE | `/users/api/:id` | ลบผู้ใช้ |
| POST | `/users/api/:id/reset-password` | รีเซ็ตรหัสผ่าน |
| POST | `/users/api/import` | Import จาก Excel |
| GET | `/users/api/export` | Export เป็น Excel |

### 5.5 Applicant APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/applicants/register` | ลงทะเบียนผู้สมัคร |
| POST | `/applicants/login` | เข้าสู่ระบบ |
| GET | `/applicants/test/:code` | หน้าสอบ |
| POST | `/applicants/test/:code/submit` | ส่งสอบ |
| GET | `/applicants/result/:id` | ผลสอบ |
| GET | `/applicants/admin/list` | รายการผู้สมัคร (HR) |
| POST | `/applicants/admin/generate-code` | สร้างรหัสสอบ |
| POST | `/applicants/admin/assign-test` | มอบหมายข้อสอบ |

### 5.6 Report APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/api/learning-progress` | รายงานความก้าวหน้า |
| GET | `/reports/api/test-results` | รายงานผลสอบ |
| GET | `/reports/api/course-analytics` | รายงานวิเคราะห์หลักสูตร |
| GET | `/reports/api/department-performance` | รายงานประสิทธิภาพแผนก |
| GET | `/reports/api/export/:type` | Export รายงาน |

### 5.7 API Response Format

**Success Response:**
```json
{
    "success": true,
    "data": { ... },
    "message": "Operation successful",
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100,
        "totalPages": 10
    }
}
```

**Error Response:**
```json
{
    "success": false,
    "message": "Error message",
    "error": {
        "code": "ERR_CODE",
        "details": { ... }
    }
}
```

---

## 6. ระบบรักษาความปลอดภัย (Security)

### 6.1 Authentication Security

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with salt rounds 12 |
| **JWT Tokens** | Access Token (15 min) + Refresh Token (7 days) |
| **Session** | Server-side session with secure cookies |
| **HTTPS** | Required in production |

### 6.2 Authorization

| Feature | Implementation |
|---------|---------------|
| **Role-Based Access** | Admin, HR, Instructor, Employee, Applicant |
| **Route Protection** | Middleware check on every request |
| **API Protection** | JWT verification |

### 6.3 Security Headers (Helmet.js)

```javascript
- Content-Security-Policy
- X-DNS-Prefetch-Control
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- X-XSS-Protection
```

### 6.4 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/login` | 5 requests / 15 min |
| `/auth/forgot-password` | 3 requests / hour |
| `/api/*` | 100 requests / min |

### 6.5 Input Validation

- express-validator สำหรับ request validation
- sanitize-html สำหรับ XSS prevention
- Parameterized queries สำหรับ SQL injection prevention

### 6.6 File Upload Security

| Check | Implementation |
|-------|---------------|
| **File Type** | Whitelist extensions |
| **File Size** | Max 10MB |
| **File Name** | Sanitize & rename |
| **Storage** | Outside web root |

---

## 7. User Roles & Permissions

### 7.1 Role Hierarchy

```
Administrator
    │
    ├── HR
    │
    ├── Instructor
    │
    └── Employee
            │
            └── Applicant (External)
```

### 7.2 Permission Matrix

| Module | Admin | HR | Instructor | Employee | Applicant |
|--------|:-----:|:--:|:----------:|:--------:|:---------:|
| **Dashboard** | Full | Full | Full | View | - |
| **Courses - View** | ✓ | ✓ | ✓ | ✓ | - |
| **Courses - Create** | ✓ | - | ✓ | - | - |
| **Courses - Edit** | ✓ | - | Own | - | - |
| **Courses - Delete** | ✓ | - | - | - | - |
| **Courses - Enroll** | ✓ | ✓ | ✓ | Self | - |
| **Tests - View** | ✓ | ✓ | ✓ | Enrolled | Assigned |
| **Tests - Create** | ✓ | - | ✓ | - | - |
| **Tests - Take** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Users - View** | ✓ | ✓ | - | Self | - |
| **Users - Create** | ✓ | ✓ | - | - | - |
| **Users - Edit** | ✓ | ✓ | - | Self | - |
| **Users - Delete** | ✓ | - | - | - | - |
| **Applicants** | ✓ | ✓ | - | - | - |
| **Reports - All** | ✓ | ✓ | - | - | - |
| **Reports - Own** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Settings** | ✓ | - | - | - | - |
| **Organization** | ✓ | View | - | - | - |

---

## 8. User Interface (UI/UX)

### 8.1 Design System

**Colors:**
| Name | Value | Usage |
|------|-------|-------|
| Primary | #0090D3 | Buttons, Links, Headers |
| Secondary | #3AAA35 | Success, Secondary actions |
| Danger | #DC2626 | Errors, Delete actions |
| Warning | #F59E0B | Warnings, Cautions |
| Gray | #6B7280 | Text, Borders |

**Typography:**
| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | Noto Sans Thai | 2.5rem | 700 |
| H2 | Noto Sans Thai | 2rem | 700 |
| H3 | Noto Sans Thai | 1.5rem | 600 |
| Body | Noto Sans Thai | 1rem | 400 |
| Small | Noto Sans Thai | 0.875rem | 400 |

**Spacing:**
- Base unit: 4px
- Common spacings: 4, 8, 12, 16, 24, 32, 48, 64px

### 8.2 Components

| Component | Description |
|-----------|-------------|
| **Button** | Primary, Secondary, Outline, Ghost, Danger |
| **Input** | Text, Password, Email, Number, Select, Multi-select |
| **Card** | Standard card with header, body, footer |
| **Table** | Sortable, Filterable, Paginated |
| **Modal** | Standard, Confirmation, Full-screen |
| **Toast** | Success, Error, Warning, Info |
| **Badge** | Status badges, Count badges |
| **Avatar** | User profile images |
| **Progress** | Linear, Circular |
| **Tabs** | Horizontal tabs |

### 8.3 Responsive Breakpoints

| Breakpoint | Size | Target |
|------------|------|--------|
| xs | < 640px | Mobile |
| sm | 640px+ | Large Mobile |
| md | 768px+ | Tablet |
| lg | 1024px+ | Laptop |
| xl | 1280px+ | Desktop |
| 2xl | 1536px+ | Large Desktop |

### 8.4 Navigation

**Sidebar Menu:**
```
├── Dashboard
├── หลักสูตร
│   ├── ทั้งหมด
│   ├── หลักสูตรของฉัน
│   └── หมวดหมู่
├── ข้อสอบ
│   ├── ทั้งหมด
│   └── ผลสอบ
├── บทความ
├── ผู้สมัครงาน (HR only)
├── รายงาน
├── ผู้ใช้งาน (Admin/HR)
├── องค์กร (Admin)
└── ตั้งค่า (Admin)
```

---

## 9. การตั้งค่าระบบ (System Configuration)

### 9.1 Environment Variables

```env
# Database
DB_SERVER=localhost
DB_DATABASE=LearnHub
DB_USER=sa
DB_PASSWORD=your_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Security
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-32-chars
SESSION_SECRET=your-session-secret

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 9.2 Database Connection Pool

```javascript
{
    pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
}
```

### 9.3 Session Configuration

```javascript
{
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}
```

---

## 10. Requirements ทางเทคนิค (Technical Requirements)

### 10.1 Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows Server 2016 / Ubuntu 18.04 | Windows Server 2019 / Ubuntu 22.04 |
| **CPU** | 2 cores | 4 cores |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 50 GB SSD | 100 GB SSD |
| **Node.js** | 18.x | 20.x LTS |
| **SQL Server** | 2017 | 2019/2022 |

### 10.2 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

### 10.3 Network Requirements

| Requirement | Specification |
|-------------|---------------|
| **Bandwidth** | 10 Mbps minimum |
| **Latency** | < 100ms |
| **Ports** | 80 (HTTP), 443 (HTTPS), 3000 (App) |

### 10.4 Backup & Recovery

| Type | Frequency | Retention |
|------|-----------|-----------|
| **Full Backup** | Weekly | 4 weeks |
| **Differential** | Daily | 7 days |
| **Transaction Log** | Hourly | 24 hours |

### 10.5 Performance Targets

| Metric | Target |
|--------|--------|
| **Page Load Time** | < 3 seconds |
| **API Response Time** | < 500ms |
| **Concurrent Users** | 100+ |
| **Uptime** | 99.5% |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **LMS** | Learning Management System |
| **Course** | หลักสูตรการเรียนรู้ |
| **Chapter** | บทในหลักสูตร |
| **Lesson** | บทเรียนย่อยในบท |
| **Enrollment** | การลงทะเบียนเรียน |
| **Test** | ข้อสอบ/แบบทดสอบ |
| **Question Bank** | ธนาคารคำถาม |
| **Applicant** | ผู้สมัครงาน |
| **Badge** | เหรียญรางวัล |
| **Certificate** | ใบประกาศนียบัตร |

---

## Appendix B: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 26/12/2567 | Initial document |

---

**Document Owner:** IT Department
**Approved By:** [Pending]
**Next Review:** [TBD]
