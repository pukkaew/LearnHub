# 🚀 Rukchai Hongyen LearnHub

ระบบจัดการการเรียนรู้ (Learning Management System) ที่พัฒนาด้วย Node.js, Express.js และ Microsoft SQL Server

## ✨ คุณสมบัติหลัก

- 🔐 **การยืนยันตัวตน**: ระบบ Login/Register พร้อม JWT Authentication
- 📚 **การจัดการคอร์ส**: สร้าง แก้ไข และจัดการเนื้อหาคอร์สเรียน
- 📝 **ระบบสอบ**: สร้างแบบทดสอบออนไลน์พร้อมระบบ Proctoring
- 📊 **Dashboard**: แสดงสถิติและข้อมูลสำคัญแบบ Real-time
- 👥 **การจัดการผู้ใช้**: จัดการ User, Role และสิทธิ์การเข้าถึง
- 📈 **รายงาน**: สรุปผลการเรียนและสถิติต่างๆ
- 🔒 **ความปลอดภัย**: Security Headers, Rate Limiting, CSRF Protection
- 📱 **Responsive Design**: ใช้งานได้บนทุกอุปกรณ์

## 🛠 เทคโนโลยีที่ใช้

### Backend
- **Node.js** - JavaScript Runtime
- **Express.js** - Web Framework
- **Microsoft SQL Server** - ฐานข้อมูล
- **Socket.IO** - Real-time Communication
- **EJS** - Template Engine
- **JWT** - Authentication

### Frontend
- **Tailwind CSS** - CSS Framework
- **JavaScript ES6+** - Client-side Logic
- **Socket.IO Client** - Real-time Updates

### Security & Tools
- **Helmet.js** - Security Headers
- **Express Rate Limit** - Rate Limiting
- **bcrypt** - Password Hashing
- **express-validator** - Input Validation
- **Winston** - Logging

## 📋 ความต้องการระบบ

- Node.js 16+
- Microsoft SQL Server 2017+
- npm หรือ yarn

## 🚀 การติดตั้ง

### 1. Clone Repository
```bash
git clone <repository-url>
cd LearnHub
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` และใส่ข้อมูลต่อไปนี้:
```env
# Database Configuration
DB_SERVER=localhost
DB_NAME=LearnHubDB
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=1433

# Application Settings
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-super-secret-session-key

# JWT Settings
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Email Settings (สำหรับส่งอีเมล)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
```

### 4. ตั้งค่าฐานข้อมูล
```bash
# ดู MSSQL_SETUP.md สำหรับคำแนะนำโดยละเอียด
node test-db-connection.js  # ทดสอบการเชื่อมต่อฐานข้อมูล
npm run seed               # สร้างข้อมูลเริ่มต้น
```

### 5. Build CSS
```bash
npm run build-css-prod
```

### 6. รันระบบ
```bash
# Development Mode
npm run dev

# Production Mode
npm start
```

## 📁 โครงสร้างโฟลเดอร์

```
LearnHub/
├── controllers/          # Business Logic Controllers
├── middleware/          # Custom Middleware
├── models/             # Database Models
├── public/             # Static Files (CSS, JS, Images)
├── routes/             # API Routes
├── utils/              # Utility Functions
├── views/              # EJS Templates
├── uploads/            # File Uploads
├── seeds/              # Database Seeders
├── __tests__/          # Test Files
├── server.js           # Main Application File
├── package.json        # Dependencies
└── tailwind.config.js  # Tailwind CSS Config
```

## 🌐 API Endpoints

### Authentication
- `POST /auth/login` - เข้าสู่ระบบ
- `POST /auth/register` - สมัครสมาชิก
- `POST /auth/logout` - ออกจากระบบ

### Courses
- `GET /courses` - ดูรายการคอร์ส
- `POST /courses` - สร้างคอร์สใหม่
- `GET /courses/:id` - ดูรายละเอียดคอร์ส
- `PUT /courses/:id` - แก้ไขคอร์ส
- `DELETE /courses/:id` - ลบคอร์ส

### Tests
- `GET /tests` - ดูรายการแบบทดสอบ
- `POST /tests` - สร้างแบบทดสอบใหม่
- `GET /tests/:id` - ทำแบบทดสอบ
- `POST /tests/:id/submit` - ส่งแบบทดสอบ

### Dashboard
- `GET /dashboard` - หน้า Dashboard หลัก
- `GET /api/dashboard/stats` - สถิติแบบ Real-time

## 🔧 คำสั่งที่มีประโยชน์

```bash
# Development
npm run dev              # รันในโหมด Development (auto-reload)
npm run watch-css        # Watch และ Build CSS แบบ Auto

# Production
npm start               # รันในโหมด Production
npm run build-css-prod  # Build CSS แบบ Minified

# Testing & Quality
npm test               # รัน Test Suite
npm run lint           # ตรวจสอบ Code Style
npm run seed           # สร้างข้อมูลทดสอบ

# Database
node test-db-connection.js    # ทดสอบการเชื่อมต่อฐานข้อมูล
node reset-admin-password.js  # รีเซ็ตรหัสผ่าน Admin
```

## 📱 การใช้งานพื้นฐาน

### สำหรับผู้ดูแลระบบ
1. เข้าสู่ระบบด้วย Admin Account
2. สร้างหลักสูตร (Courses) และเนื้อหา
3. สร้างแบบทดสอบ (Tests)
4. จัดการผู้ใช้และสิทธิ์การเข้าถึง
5. ดูรายงานและสถิติ

### สำหรับผู้เรียน
1. สมัครสมาชิกและเข้าสู่ระบบ
2. สมัครเรียนหลักสูตรที่สนใจ
3. เข้าเรียนและติดตามความก้าวหน้า
4. ทำแบบทดสอบและดูผลคะแนน

## 🔐 ความปลอดภัย

- **HTTPS Enforcement** - บังคับใช้ HTTPS ใน Production
- **Security Headers** - ป้องกัน XSS, Clickjacking
- **Rate Limiting** - จำกัดจำนวน Request
- **Input Validation** - ตรวจสอบข้อมูลนำเข้า
- **CSRF Protection** - ป้องกัน Cross-Site Request Forgery
- **Password Hashing** - เข้ารหัสรหัสผ่านด้วย bcrypt

## 🐛 การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อฐานข้อมูล
```bash
# ตรวจสอบการเชื่อมต่อฐานข้อมูล
node test-db-connection.js

# ตรวจสอบ Environment Variables
echo $DB_SERVER $DB_NAME $DB_USER
```

### ปัญหา CSS ไม่แสดงผล
```bash
# Build CSS ใหม่
npm run build-css-prod

# ตรวจสอบไฟล์ CSS
ls -la public/css/tailwind.css
```

### ปัญหา Port ถูกใช้งาน
```bash
# หา Process ที่ใช้ Port 3000
netstat -tulpn | grep :3000
# หรือใน Windows
netstat -ano | findstr :3000
```

## 📞 การสนับสนุน

- 📧 Email: support@rukchaihongyen.com
- 🌐 Website: https://rukchaihongyen.com
- 📱 Line: @rukchaihongyen

## 📄 License

This project is proprietary software owned by Rukchai Hongyen Co., Ltd.

---

**Developed with ❤️ by Rukchai Hongyen Development Team**