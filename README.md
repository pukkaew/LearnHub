# Ruxchai LearnHub - Learning Management System

ระบบจัดการการเรียนรู้องค์กร (Learning Management System) ที่สมบูรณ์แบบสำหรับการจัดการหลักสูตร การทดสอบ และการติดตามความก้าวหน้าของพนักงาน

## 🚀 คุณสมบัติหลัก

### 1. ระบบจัดการผู้ใช้ (User Management)
- ✅ การจัดการข้อมูลพนักงาน
- ✅ ระบบบทบาทและสิทธิ์ (Role-based Access Control)
- ✅ การจัดการโปรไฟล์และข้อมูลส่วนตัว
- ✅ ระบบการเปลี่ยนรหัสผ่าน
- ✅ ติดตามกิจกรรมผู้ใช้

### 2. ระบบหลักสูตร (Course Management)
- ✅ สร้างและจัดการหลักสูตรการเรียน
- ✅ จัดหมวดหมู่หลักสูตร
- ✅ ระบบลงทะเบียนเรียน
- ✅ ติดตามความก้าวหน้าการเรียน
- ✅ ออกใบประกาศนียบัตร

### 3. ระบบทดสอบ (Test/Assessment System)
- ✅ สร้างและจัดการข้อสอบ
- ✅ ระบบข้อสอบหลายรูปแบบ (MCQ, True/False, Essay)
- ✅ การป้องกันการโกง (Anti-cheating)
- ✅ รายงานผลการทดสอบ
- ✅ การจำกัดจำนวนครั้งในการทำข้อสอบ

### 4. ระบบสมัครงาน (Job Application)
- ✅ การโพสต์ตำแหน่งงาน
- ✅ การรับสมัครงานออนไลน์
- ✅ การจัดการใบสมัครงาน
- ✅ ระบบทดสอบผู้สมัครงาน
- ✅ การติดตามสถานะการสมัคร

### 5. ระบบบทความ (Knowledge Sharing)
- ✅ การสร้างและแชร์บทความ
- ✅ ระบบหมวดหมู่บทความ
- ✅ การแสดงความคิดเห็น
- ✅ ระบบค้นหาและกรองบทความ
- ✅ ระบบแท็กและการจัดหมวดหมู่

### 6. ระบบแดชบอร์ด (Dashboard)
- ✅ ภาพรวมข้อมูลสำคัญ
- ✅ กราฟและสถิติการเรียนรู้
- ✅ การแจ้งเตือนสำคัญ
- ✅ ข้อมูลความก้าวหน้าส่วนตัว

### 7. ระบบรายงาน (Reporting)
- ✅ รายงานความก้าวหน้าการเรียน
- ✅ รายงานผลการทดสอบ
- ✅ รายงานกิจกรรมผู้ใช้
- ✅ สถิติหลักสูตรและแผนก
- ✅ การส่งออกข้อมูลเป็น CSV

### 8. ระบบแจ้งเตือน (Notification System)
- ✅ การแจ้งเตือนแบบ Real-time
- ✅ การส่งการแจ้งเตือนกลุ่ม
- ✅ เทมเพลตการแจ้งเตือน
- ✅ การจัดการการแจ้งเตือนส่วนตัว

### 9. ระบบอัปโหลดไฟล์ (File Upload)
- ✅ อัปโหลดรูปภาพโปรไฟล์
- ✅ อัปโหลดเอกสารหลักสูตร
- ✅ อัปโหลดไฟล์เรซูเม่
- ✅ การตรวจสอบความปลอดภัยไฟล์

### 10. ระบบความปลอดภัย (Security)
- ✅ การเข้ารหัสข้อมูล
- ✅ Rate Limiting
- ✅ CSRF Protection
- ✅ Input Validation และ Sanitization
- ✅ Session Management

## 🛠️ เทคโนโลยีที่ใช้

### Backend
- **Node.js** - Runtime Environment
- **Express.js** - Web Framework
- **Microsoft SQL Server** - Database
- **EJS** - Template Engine
- **Session-based Authentication** - การยืนยันตัวตน

### Frontend
- **Tailwind CSS** - CSS Framework
- **JavaScript (Vanilla)** - Client-side scripting
- **Font Awesome** - Icons
- **Chart.js** - Charts and graphs

### Security & Middleware
- **Helmet.js** - Security headers
- **Express Rate Limit** - Rate limiting
- **bcrypt** - Password hashing
- **CSRF Protection** - Cross-site request forgery protection
- **Input Validation** - Data sanitization

## 📋 ความต้องการระบบ

### Software Requirements
- **Node.js** v16.0.0 หรือสูงกว่า
- **Microsoft SQL Server** 2019 หรือสูงกว่า
- **npm** v8.0.0 หรือสูงกว่า

### Hardware Requirements
- **RAM**: อย่างน้อย 4GB (แนะนำ 8GB)
- **Storage**: อย่างน้อย 10GB ว่าง
- **CPU**: Dual-core 2.0GHz หรือสูงกว่า

## 🚀 การติดตั้งและใช้งาน

### 1. Clone Repository
```bash
git clone <repository-url>
cd LearnHub
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Database
1. สร้างฐานข้อมูล MSSQL ใหม่
2. รันสคริปต์สร้างตาราง:
```bash
# ใช้ SQL Server Management Studio เปิดไฟล์
database/schema.sql
```

### 4. ตั้งค่า Environment Variables
```bash
# คัดลอกและแก้ไขไฟล์ .env
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
# Database Configuration
DB_SERVER=localhost
DB_DATABASE=LearnHub
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Application Settings
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
NODE_ENV=development
PORT=3000
```

### 5. ทดสอบการเชื่อมต่อฐานข้อมูล
```bash
node test-db-connection.js
```

### 6. เพิ่มข้อมูลเริ่มต้น (Seed Data)
```bash
npm run seed
```

### 7. สร้าง CSS Files
```bash
npm run build-css
```

### 8. เริ่มต้นระบบ
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 👥 ข้อมูลเข้าสู่ระบบเริ่มต้น

หลังจากรัน seed แล้ว สามารถเข้าสู่ระบบด้วย:

| บทบาท | Username | Password |
|--------|----------|----------|
| Admin | admin | password123 |
| HR Manager | hr.manager | password123 |
| IT Manager | it.manager | password123 |
| Instructor | instructor1 | password123 |

## 📁 โครงสร้างโปรเจค

```
LearnHub/
├── config/              # การตั้งค่าระบบ
│   └── database.js      # การตั้งค่าฐานข้อมูล
├── controllers/         # Controllers สำหรับจัดการ Business Logic
├── middleware/          # Middleware functions
│   ├── auth.js         # Authentication middleware
│   ├── security.js     # Security middleware
│   └── validation.js   # Validation middleware
├── models/             # Models สำหรับจัดการข้อมูล
├── routes/             # Route definitions
├── views/              # EJS Templates
├── public/             # Static files
│   ├── css/           # CSS files
│   ├── js/            # JavaScript files
│   └── images/        # Images
├── uploads/            # Uploaded files
├── utils/              # Utility functions
├── database/           # Database scripts
│   └── schema.sql     # Database schema
├── seeds/              # Database seeders
├── .env.example        # Environment variables example
├── server.js           # Main application file
└── package.json        # Project dependencies
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ
- `POST /api/auth/change-password` - เปลี่ยนรหัสผ่าน

### Users
- `GET /api/users` - รายการผู้ใช้
- `GET /api/users/:id` - ข้อมูลผู้ใช้
- `POST /api/users` - สร้างผู้ใช้ใหม่
- `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้

### Courses
- `GET /api/courses` - รายการหลักสูตร
- `GET /api/courses/:id` - ข้อมูลหลักสูตร
- `POST /api/courses` - สร้างหลักสูตรใหม่
- `PUT /api/courses/:id` - แก้ไขหลักสูตร
- `POST /api/courses/:id/enroll` - ลงทะเบียนเรียน

### Tests
- `GET /api/tests` - รายการข้อสอบ
- `GET /api/tests/:id` - ข้อมูลข้อสอบ
- `POST /api/tests` - สร้างข้อสอบใหม่
- `POST /api/tests/:id/attempt` - เริ่มทำข้อสอบ
- `POST /api/tests/:id/submit` - ส่งคำตอบข้อสอบ

### Reports
- `GET /api/reports/learning-progress` - รายงานความก้าวหน้า
- `GET /api/reports/test-results` - รายงานผลการทดสอบ
- `GET /api/reports/export/learning-progress` - ส่งออกรายงาน CSV

### Notifications
- `GET /api/notifications` - รายการการแจ้งเตือน
- `PUT /api/notifications/:id/read` - อ่านการแจ้งเตือน
- `POST /api/notifications` - สร้างการแจ้งเตือนใหม่

## 🔒 ระบบความปลอดภัย

### Authentication & Authorization
- Session-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Account lockout after failed attempts

### Security Headers
- Helmet.js for security headers
- CSRF protection
- XSS protection
- Content Security Policy (CSP)

### Input Validation
- Express-validator for input validation
- SQL injection prevention
- File upload validation
- Rate limiting

## 🧪 การทดสอบ

### Unit Tests
```bash
npm test
```

### การทดสอบการเชื่อมต่อฐานข้อมูล
```bash
node test-db-connection.js
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 📝 การพัฒนา

### Development Mode
```bash
npm run dev
```

### Watch CSS Changes
```bash
npm run watch-css
```

### Build for Production
```bash
npm run build-css-prod
```

### Code Linting
```bash
npm run lint
```

## 🐛 การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อฐานข้อมูล
1. ตรวจสอบการตั้งค่าใน `.env`
2. ตรวจสอบว่า SQL Server กำลังทำงาน
3. ตรวจสอบ firewall settings
4. ดูคู่มือ `MSSQL_SETUP.md`

### ปัญหา CSS ไม่แสดง
```bash
npm run build-css
```

### ปัญหา File Upload
1. ตรวจสอบสิทธิ์ในโฟลเดอร์ `uploads/`
2. ตรวจสอบ file size limits
3. ตรวจสอบ file type restrictions

## 📞 การสนับสนุน

สำหรับการสนับสนุนทางเทคนิค:
- Email: support@ruxchai.com
- เปิด Issue ใน GitHub Repository
- ดูเอกสารใน `docs/` folder

## 📄 License

Copyright © 2024 Ruxchai. All rights reserved.

## 🔄 Version History

- **v1.0.0** - Initial release with full LMS functionality
- เปิดใช้งานระบบจัดการการเรียนรู้แบบครบครัน
- รองรับ MSSQL Database
- ระบบความปลอดภัยขั้นสูง

---

สร้างโดย **Ruxchai Development Team** 🚀