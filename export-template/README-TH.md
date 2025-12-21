# LearnHub Export Template System

ระบบ Template สำหรับ Learning Management System (LMS) พร้อมใช้งาน ประกอบด้วย Database Schema, Theme System, Navigation, และ Backend Code

## ภาพรวม

Package นี้ประกอบด้วยทุกอย่างที่ต้องการสำหรับสร้างระบบ LMS ใหม่:

- **Database Schema**: SQL Server schema ครบทุกตาราง
- **Theme System**: CSS Variables สำหรับปรับแต่ง theme แบบ dynamic
- **Navigation**: เมนูแบบ responsive รองรับ mobile
- **Utilities**: Utility classes แบบ Tailwind (ไม่ต้องติดตั้ง Tailwind)
- **Backend**: Node.js/Express พร้อม Settings API

## โครงสร้างโฟลเดอร์

```
export-template/
├── database/
│   └── schema.sql              # SQL Server schema
├── css/
│   ├── theme-variables.css     # ตัวแปร CSS สำหรับ theme
│   ├── navigation.css          # สไตล์เมนู
│   ├── utilities.css           # Utility classes
│   └── facebook-comments.css   # ระบบ comment แบบ Facebook
├── js/
│   ├── navigation.js           # JavaScript สำหรับเมนู
│   ├── settings.js             # JavaScript สำหรับจัดการ settings
│   ├── facebook-comments.js
│   └── facebook-comments-i18n-th.js
├── views/
│   ├── layout-template.html    # ตัวอย่าง layout
│   └── facebook-comments-template.html
├── backend/
│   ├── config/
│   │   └── database.js         # การเชื่อมต่อ SQL Server
│   ├── models/
│   │   └── Setting.js          # Model สำหรับ Settings
│   ├── controllers/
│   │   └── settingController.js
│   ├── routes/
│   │   └── settingRoutes.js
│   ├── middleware/
│   │   ├── auth.js             # ตรวจสอบสิทธิ์
│   │   └── settingsMiddleware.js
│   ├── utils/
│   │   └── logger.js
│   ├── server.js               # Express server
│   ├── package.json
│   └── .env.example
├── i18n/
│   └── th.js                   # ภาษาไทย
├── README.md                   # เอกสาร (English)
└── README-TH.md                # เอกสาร (ภาษาไทย)
```

## วิธีติดตั้ง

### 1. สร้าง Database

เปิด SQL Server Management Studio แล้วรัน `database/schema.sql`

```sql
-- สร้าง Database ใหม่
CREATE DATABASE LearnHub;
GO

-- รัน schema.sql
```

ตารางที่จะได้:
- `users`, `roles`, `departments`, `positions` - ข้อมูลผู้ใช้
- `courses`, `enrollments`, `tests`, `questions` - ข้อมูลหลักสูตร
- `SystemSettings`, `UserSettings`, `DepartmentSettings` - การตั้งค่า
- `CourseDiscussions`, `CourseDiscussionReactions` - ระบบ comment
- `articles`, `notifications`, `activity_logs` - อื่นๆ

### 2. ตั้งค่า Backend

```bash
cd export-template/backend

# คัดลอกไฟล์ environment
cp .env.example .env

# แก้ไข .env
# DB_SERVER=localhost
# DB_DATABASE=LearnHub
# DB_USER=sa
# DB_PASSWORD=รหัสผ่านของคุณ

# ติดตั้ง dependencies
npm install

# รัน server
npm start
```

### 3. เพิ่ม CSS ใน HTML

```html
<!-- Font Awesome (ไอคอน) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<!-- LearnHub CSS -->
<link rel="stylesheet" href="css/theme-variables.css">
<link rel="stylesheet" href="css/navigation.css">
<link rel="stylesheet" href="css/utilities.css">
```

### 4. เพิ่ม JavaScript

```html
<script src="js/navigation.js"></script>
<script src="js/settings.js"></script>
```

---

## ระบบ Theme

### CSS Variables

ปรับแต่ง theme ได้ง่ายผ่าน CSS Variables:

```css
:root {
    /* สีหลัก */
    --primary-color: #0090D3;
    --secondary-color: #3AAA35;

    /* พื้นหลัง */
    --background-color: #f9fafb;
    --card-color: #ffffff;
    --sidebar-color: #1f2937;

    /* ตัวอักษร */
    --font-family: 'Sarabun', 'Prompt', sans-serif;

    /* Layout */
    --header-height: 64px;
    --sidebar-width: 256px;
}
```

### เปลี่ยน Theme ด้วย JavaScript

```javascript
// เปลี่ยนสีหลัก
document.documentElement.style.setProperty('--primary-color', '#ff6b6b');

// เปิด Dark Mode
document.documentElement.setAttribute('data-theme', 'dark');

// เปิด Compact Mode
document.documentElement.setAttribute('data-compact', 'true');
```

### โหมดต่างๆ

```html
<!-- Dark Mode -->
<html data-theme="dark">

<!-- Compact Mode -->
<html data-compact="true">

<!-- High Contrast -->
<html data-high-contrast="true">

<!-- ปิด Animation -->
<html data-animations="false">
```

---

## ระบบ Settings

### โครงสร้าง 3 ระดับ

1. **SystemSettings** - ค่าเริ่มต้นของระบบ (Admin เท่านั้น)
2. **DepartmentSettings** - override ตามแผนก
3. **UserSettings** - ค่าส่วนตัวของผู้ใช้

**ลำดับความสำคัญ**: User > Department > System

### ประเภท Settings

| หมวด | Keys | คำอธิบาย |
|------|------|----------|
| general | site_name, company_name | ข้อมูลทั่วไป |
| appearance | primary_color, font_family | การแสดงผล |
| security | session_timeout, max_login_attempts | ความปลอดภัย |
| notification | email_enabled, push_enabled | การแจ้งเตือน |

### API Endpoints

```
GET    /settings                 # หน้า Settings (Admin)
GET    /settings/category/:cat   # ดึง settings ตามหมวด
PUT    /settings/key/:key        # อัพเดท setting
POST   /settings/batch           # อัพเดทหลาย settings

GET    /settings/user            # Settings ส่วนตัว
POST   /settings/user            # บันทึก user setting
POST   /settings/user/batch      # บันทึกหลาย user settings

GET    /settings/department/:id  # Settings แผนก
POST   /settings/department/:id  # บันทึก department setting
```

### ใช้งานใน JavaScript

```javascript
// ดึงค่า setting
const theme = await LearnHubSettings.get('appearance', 'primary_color');

// บันทึก setting
await LearnHubSettings.set('appearance', 'primary_color', '#ff6b6b');

// บันทึกหลายค่า
await LearnHubSettings.batchUpdate({
    'appearance.primary_color': '#ff6b6b',
    'appearance.dark_mode': true
});

// สลับ Dark Mode
await LearnHubSettings.toggleDarkMode();
```

---

## ระบบ Navigation

### โครงสร้าง HTML

```html
<nav class="nav-main">
    <div class="nav-container">
        <!-- Logo -->
        <a href="/" class="nav-logo">
            <img src="/images/logo.png" class="nav-logo-img">
            <div class="nav-logo-text">
                <span class="nav-logo-title">LearnHub</span>
                <span class="nav-logo-subtitle">ระบบจัดการการเรียนรู้</span>
            </div>
        </a>

        <!-- เมนู Desktop -->
        <div class="nav-menu">
            <a href="/courses" class="nav-menu-item active">
                <span class="nav-menu-icon"><i class="fas fa-book"></i></span>
                หลักสูตร
            </a>

            <!-- Dropdown -->
            <div class="nav-dropdown-wrapper">
                <button class="nav-menu-item">
                    ตั้งค่า <i class="fas fa-chevron-down"></i>
                </button>
                <div class="nav-dropdown">
                    <a href="/settings" class="nav-dropdown-item">
                        <i class="fas fa-cog"></i> ตั้งค่าระบบ
                    </a>
                </div>
            </div>
        </div>

        <!-- ปุ่ม Mobile -->
        <button class="nav-mobile-toggle" onclick="LearnHubNav.toggle()">
            <i class="fas fa-bars"></i>
        </button>
    </div>
</nav>
```

### JavaScript API

```javascript
// เปิด/ปิดเมนู mobile
LearnHubNav.toggle();

// ปิดเมนู
LearnHubNav.close();

// อัพเดท badge แจ้งเตือน
LearnHubNav.updateNotificationBadge(5);
```

---

## Utility Classes

### Display & Flexbox

```html
<div class="flex items-center justify-between gap-4">
    <div class="flex-1">เนื้อหา</div>
    <div class="hidden md:block">แสดงเฉพาะ Desktop</div>
</div>
```

### Spacing

```html
<div class="p-4 m-2">Padding และ Margin</div>
<div class="px-4 py-2">Horizontal/Vertical</div>
<div class="mt-8 mb-4">Margin บน/ล่าง</div>
```

### Typography

```html
<h1 class="text-2xl font-bold text-gray-900">หัวข้อ</h1>
<p class="text-sm text-gray-500">ข้อความรอง</p>
```

### สี

```html
<div class="bg-white text-gray-900">พื้นหลังขาว</div>
<div class="bg-blue-500 text-white">พื้นหลังน้ำเงิน</div>
<span class="text-red-500">ข้อความแดง</span>
```

### Responsive

```html
<!-- ซ่อนบน mobile แสดงบน desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Grid responsive -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    ...
</div>
```

---

## ระบบ Comment แบบ Facebook

### เริ่มใช้งาน

```javascript
FacebookComments.init({
    apiBase: '/api/discussions',
    currentUser: {
        id: 1,
        name: 'ชื่อผู้ใช้',
        avatar: '/images/avatar.png',
        isAdmin: false
    }
});
```

### คุณสมบัติ

- 6 Reactions (like, love, haha, wow, sad, angry)
- ตอบกลับแบบ nested พร้อม @mention
- ปักหมุด comment สำคัญ
- แก้ไข/ลบ comment ตัวเอง
- เรียงลำดับ (ใหม่สุด, เก่าสุด, ยอดนิยม)
- แบ่งหน้า (pagination)

---

## สิทธิ์ผู้ใช้ (Roles)

| Role | ระดับ | สิทธิ์ |
|------|-------|--------|
| Super Admin | 1 | เข้าถึงทุกอย่าง |
| Admin | 2 | จัดการระบบ |
| HR | 3 | จัดการบุคลากร |
| Instructor | 4 | จัดการหลักสูตร |
| User | 5 | ผู้ใช้ทั่วไป |

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## License

MIT License - ใช้งานได้ทั้งส่วนตัวและเชิงพาณิชย์

---

## เครดิต

LearnHub Template System
เวอร์ชัน: 1.0.0
