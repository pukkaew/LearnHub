# 🗃️ Microsoft SQL Server Setup Guide

คู่มือการติดตั้งและตั้งค่า Microsoft SQL Server สำหรับระบบ Rukchai Hongyen LearnHub

## 📋 ความต้องการ

- Windows 10/11 หรือ Windows Server 2016+
- Microsoft SQL Server 2017+
- SQL Server Management Studio (SSMS)
- Memory: อย่างน้อย 4GB RAM
- Storage: อย่างน้อย 10GB ว่าง

## 🚀 การติดตั้ง SQL Server

### ขั้นตอนที่ 1: ดาวน์โหลด SQL Server

1. ไปที่ [Microsoft SQL Server Downloads](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. เลือก **SQL Server 2022 Developer** (ฟรีสำหรับการพัฒนา)
3. ดาวน์โหลดและรันไฟล์ติดตั้ง

### ขั้นตอนที่ 2: ติดตั้ง SQL Server

1. เลือก **Basic Installation**
2. ยอมรับ License Terms
3. เลือกโฟลเดอร์สำหรับติดตั้ง
4. รอให้การติดตั้งเสร็จสิ้น
5. จดบันทึก **Instance Name** และ **Connection String**

### ขั้นตอนที่ 3: ติดตั้ง SSMS

1. ดาวน์โหลด [SQL Server Management Studio](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
2. รันไฟล์ติดตั้ง SSMS
3. ติดตาม wizard จนเสร็จสิ้น

## 🔧 การตั้งค่า SQL Server

### การตั้งค่า Authentication

1. เปิด **SQL Server Configuration Manager**
2. ไปที่ **SQL Server Network Configuration** > **Protocols for [Instance Name]**
3. เปิดใช้งาน **TCP/IP Protocol**
4. Restart SQL Server Service

### การสร้าง Login และ Database

```sql
-- 1. เชื่อมต่อด้วย Windows Authentication ใน SSMS
-- 2. สร้าง Database ใหม่
CREATE DATABASE LearnHubDB;
GO

-- 3. สร้าง Login สำหรับแอปพลิเคชัน
CREATE LOGIN learnhub_user WITH PASSWORD = 'YourStrongPassword123!';
GO

-- 4. สร้าง User และกำหนดสิทธิ์
USE LearnHubDB;
GO

CREATE USER learnhub_user FOR LOGIN learnhub_user;
GO

-- กำหนดสิทธิ์ db_owner (สำหรับการพัฒนา)
ALTER ROLE db_owner ADD MEMBER learnhub_user;
GO

-- หรือกำหนดสิทธิ์เฉพาะ (แนะนำสำหรับ Production)
ALTER ROLE db_datareader ADD MEMBER learnhub_user;
ALTER ROLE db_datawriter ADD MEMBER learnhub_user;
ALTER ROLE db_ddladmin ADD MEMBER learnhub_user;
GO
```

## 🎯 การสร้างตารางฐานข้อมูล

### ตารางพื้นฐาน

```sql
USE LearnHubDB;
GO

-- ตาราง Users
CREATE TABLE Users (
    userId INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password NVARCHAR(255) NOT NULL,
    firstName NVARCHAR(100),
    lastName NVARCHAR(100),
    role NVARCHAR(20) DEFAULT 'student',
    isActive BIT DEFAULT 1,
    profilePicture NVARCHAR(255),
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- ตาราง Courses
CREATE TABLE Courses (
    courseId INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    description NTEXT,
    instructorId INT,
    categoryId INT,
    level NVARCHAR(20) DEFAULT 'beginner',
    duration INT, -- ในหน่วยชั่วโมง
    price DECIMAL(10,2) DEFAULT 0.00,
    status NVARCHAR(20) DEFAULT 'draft',
    thumbnail NVARCHAR(255),
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (instructorId) REFERENCES Users(userId)
);

-- ตาราง Tests
CREATE TABLE Tests (
    testId INT IDENTITY(1,1) PRIMARY KEY,
    courseId INT,
    title NVARCHAR(200) NOT NULL,
    description NTEXT,
    timeLimit INT, -- ในหน่วยนาที
    totalQuestions INT DEFAULT 0,
    passingScore INT DEFAULT 70,
    status NVARCHAR(20) DEFAULT 'draft',
    startDate DATETIME2,
    endDate DATETIME2,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (courseId) REFERENCES Courses(courseId)
);

-- ตาราง Questions
CREATE TABLE Questions (
    questionId INT IDENTITY(1,1) PRIMARY KEY,
    testId INT,
    questionText NTEXT NOT NULL,
    questionType NVARCHAR(20) DEFAULT 'multiple_choice',
    options NTEXT, -- JSON format
    correctAnswer NTEXT,
    points INT DEFAULT 1,
    orderIndex INT,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (testId) REFERENCES Tests(testId)
);

-- ตาราง TestResults
CREATE TABLE TestResults (
    resultId INT IDENTITY(1,1) PRIMARY KEY,
    testId INT,
    userId INT,
    score DECIMAL(5,2),
    totalQuestions INT,
    correctAnswers INT,
    timeSpent INT, -- ในหน่วยวินาที
    startedAt DATETIME2,
    submittedAt DATETIME2,
    status NVARCHAR(20) DEFAULT 'completed',
    answers NTEXT, -- JSON format
    FOREIGN KEY (testId) REFERENCES Tests(testId),
    FOREIGN KEY (userId) REFERENCES Users(userId)
);

-- ตาราง UserCourses (การสมัครเรียน)
CREATE TABLE UserCourses (
    enrollmentId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT,
    courseId INT,
    enrolledAt DATETIME2 DEFAULT GETDATE(),
    progress INT DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'active',
    completedAt DATETIME2,
    lastAccessDate DATETIME2,
    FOREIGN KEY (userId) REFERENCES Users(userId),
    FOREIGN KEY (courseId) REFERENCES Courses(courseId)
);

-- ตาราง Notifications
CREATE TABLE Notifications (
    notificationId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT,
    title NVARCHAR(200),
    message NTEXT,
    type NVARCHAR(50) DEFAULT 'info',
    isRead BIT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(userId)
);

-- ตาราง UserActivities
CREATE TABLE UserActivities (
    activityId INT IDENTITY(1,1) PRIMARY KEY,
    userId INT,
    activityType NVARCHAR(50),
    description NVARCHAR(500),
    metadata NTEXT, -- JSON format
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(userId)
);
```

## 🔑 การสร้างข้อมูลเริ่มต้น

```sql
-- สร้าง Admin User
INSERT INTO Users (username, email, password, firstName, lastName, role)
VALUES ('admin', 'admin@rukchaihongyen.com', '$2b$10$example_hashed_password', 'Admin', 'User', 'admin');

-- สร้าง Instructor ตัวอย่าง
INSERT INTO Users (username, email, password, firstName, lastName, role)
VALUES ('instructor1', 'instructor@rukchaihongyen.com', '$2b$10$example_hashed_password', 'John', 'Instructor', 'instructor');

-- สร้าง Student ตัวอย่าง
INSERT INTO Users (username, email, password, firstName, lastName, role)
VALUES ('student1', 'student@rukchaihongyen.com', '$2b$10$example_hashed_password', 'Jane', 'Student', 'student');
```

## ⚙️ การตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์ root ของโปรเจค:

```env
# Database Configuration
DB_SERVER=localhost
DB_NAME=LearnHubDB
DB_USER=learnhub_user
DB_PASSWORD=YourStrongPassword123!
DB_PORT=1433
DB_OPTIONS_ENCRYPT=false
DB_OPTIONS_TRUST_SERVER_CERTIFICATE=true

# สำหรับ Connection String แบบเต็ม
DB_CONNECTION_STRING=Server=localhost,1433;Database=LearnHubDB;User Id=learnhub_user;Password=YourStrongPassword123!;TrustServerCertificate=true;
```

## 🧪 การทดสอบการเชื่อมต่อ

รันคำสั่งนี้เพื่อทดสอบการเชื่อมต่อฐานข้อมูล:

```bash
node test-db-connection.js
```

หากเชื่อมต่อสำเร็จ จะแสดงข้อความ:
```
✅ Connected to MSSQL database
Database: LearnHubDB
Server: localhost
```

## 🔧 การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อ

**Error: connect ECONNREFUSED**
```bash
# ตรวจสอบว่า SQL Server Service ทำงานอยู่หรือไม่
services.msc -> SQL Server (MSSQLSERVER)

# ตรวจสอบ TCP/IP Protocol
SQL Server Configuration Manager -> SQL Server Network Configuration
```

**Error: Login failed for user**
```sql
-- ตรวจสอบ Login และสิทธิ์
SELECT name FROM sys.server_principals WHERE type = 'S';
SELECT name FROM sys.database_principals WHERE type = 'S';
```

**Error: Invalid object name**
```bash
# ตรวจสอบว่าตารางถูกสร้างแล้วหรือไม่
# ใน SSMS -> LearnHubDB -> Tables
```

### การเปิดใช้งาน SQL Server Authentication

1. เปิด SSMS และเชื่อมต่อด้วย Windows Authentication
2. Right-click บน Server Instance -> Properties
3. ไปที่ **Security** -> เลือก **SQL Server and Windows Authentication mode**
4. Restart SQL Server Service

### การตั้งค่า Firewall

```cmd
# เปิด Port 1433 บน Windows Firewall
netsh advfirewall firewall add rule name="SQL Server" dir=in action=allow protocol=TCP localport=1433
```

## 📊 การ Backup และ Restore

### การสร้าง Backup

```sql
BACKUP DATABASE LearnHubDB
TO DISK = 'C:\Backup\LearnHubDB.bak'
WITH FORMAT, INIT, NAME = 'LearnHubDB Full Backup';
```

### การ Restore

```sql
RESTORE DATABASE LearnHubDB
FROM DISK = 'C:\Backup\LearnHubDB.bak'
WITH REPLACE;
```

## 🔍 การตรวจสอบประสิทธิภาพ

```sql
-- ตรวจสอบขนาดของ Database
SELECT
    DB_NAME() AS DatabaseName,
    (size * 8.0) / 1024 AS SizeMB
FROM sys.database_files;

-- ตรวจสอบ Index ที่ขาดหายไป
SELECT
    m.object_id,
    m.index_id,
    m.avg_fragmentation_in_percent
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETAILED') m
WHERE m.avg_fragmentation_in_percent > 30;
```

## 📚 Resources เพิ่มเติม

- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)
- [Node.js MSSQL Driver](https://github.com/tediousjs/node-mssql)
- [SQL Server Best Practices](https://docs.microsoft.com/en-us/sql/relational-databases/security/security-best-practices)

---

**หากมีปัญหาในการติดตั้ง กรุณาติดต่อทีมพัฒนา: dev@rukchaihongyen.com**