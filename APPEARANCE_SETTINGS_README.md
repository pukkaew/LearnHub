# 🎨 Appearance Settings - คู่มือการใช้งาน

## ภาพรวม
ระบบการตั้งค่ารูปแบบ (Appearance Settings) ที่ได้รับการปรับปรุงใหม่ รองรับการปรับแต่งรูปแบบการแสดงผลแบบ Real-time Preview

## ✨ คุณสมบัติหลัก

### 1. **การตั้งค่าสี (Color Settings)**
- 🎨 **สีหลัก (Primary Color)**: สีหลักของระบบ (เริ่มต้น: #3B82F6 - สีน้ำเงิน)
- 🎨 **สีรอง (Secondary Color)**: สีรองของระบบ (เริ่มต้น: #10B981 - สีเขียว)
- 🎨 **สีเน้น (Accent Color)**: สีที่ใช้เน้นจุดสำคัญ (เริ่มต้น: #F59E0B - สีเหลือง/ส้ม)
- 🎨 **สีพื้นหลัง (Background Color)**: สีพื้นหลังของระบบ (เริ่มต้น: #F3F4F6 - สีเทาอ่อน)
- 🎨 **สีตัวอักษร (Text Color)**: สีตัวอักษรหลัก (เริ่มต้น: #1F2937 - สีเทาเข้ม)

### 2. **การตั้งค่าโครงสร้าง (Structure Settings)**
- 📏 **มุมโค้ง (Border Radius)**: ความโค้งของมุม 0-50 px (เริ่มต้น: 8px)
- 📏 **ขนาดฟอนต์พื้นฐาน (Font Size Base)**: 12-24 px (เริ่มต้น: 16px)
- 📏 **ความสูง Header**: 48-96 px (เริ่มต้น: 64px)
- 📏 **ความกว้าง Sidebar**: 200-400 px (เริ่มต้น: 256px)

### 3. **การตั้งค่าเอฟเฟกต์ (Effects Settings)**
- ✨ **เปิดใช้ Animation**: เปิด/ปิดเอฟเฟกต์เคลื่อนไหว
- 🌑 **เปิดใช้เงา (Shadows)**: เปิด/ปิดเอฟเฟกต์เงา
- 📦 **โหมดกระชับ (Compact Mode)**: ใช้โหมดการแสดงผลแบบกระชับ

### 4. **การตั้งค่าไฟล์ (File Settings)**
- 🖼️ **โลโก้ระบบ (Logo URL)**: โลโก้ที่แสดงบนหน้าเว็บ
- 🎯 **Favicon**: ไอคอนที่แสดงบน browser tab
- 🔤 **ฟอนต์ (Font Family)**: ฟอนต์ที่ใช้ในระบบ

### 5. **โหมดธีม (Theme Mode)**
- ☀️ **Light**: โหมดสว่าง
- 🌙 **Dark**: โหมดมืด
- 🔄 **Auto**: ปรับตามระบบ

## 🎯 การใช้งาน

### เข้าถึงการตั้งค่า
1. Login เข้าระบบด้วยบัญชี Admin
2. ไปที่เมนู **Settings** → **การตั้งค่าระบบ**
3. เลือก Tab **รูปแบบ (Appearance)**

### ปรับแต่งการตั้งค่า
1. **เปลี่ยนสี**: คลิกที่ Color Picker หรือพิมพ์รหัสสี Hex
2. **ปรับตัวเลข**: ใช้ลูกศรหรือพิมพ์ตัวเลขโดยตรง
3. **Toggle Boolean**: คลิก checkbox เพื่อเปิด/ปิด
4. **ดู Preview**: การเปลี่ยนแปลงจะแสดงผลทันทีในพาเนลตัวอย่าง

### บันทึกการตั้งค่า
- กด **"บันทึกทั้งหมด"** เพื่อบันทึกการเปลี่ยนแปลง
- หรือกด **Ctrl+S** (Keyboard Shortcut)

### รีเซ็ตเป็นค่าเริ่มต้น
- กด **"รีเซ็ตเป็นค่าเริ่มต้น"** เพื่อกลับไปใช้ค่าเริ่มต้นทั้งหมด

## 🔥 Real-time Preview

### พาเนลตัวอย่าง (Preview Panel)
พาเนลตัวอย่างจะแสดง:
1. **Header**: แสดงสีหลัก, ความสูง header
2. **Card**: แสดงสีพื้นหลัง, เงา, มุมโค้ง
3. **Buttons**:
   - Primary Button (สีหลัก)
   - Secondary Button (สีรอง)
   - Accent Button (สีเน้น)
4. **Sidebar**: แสดงความกว้าง sidebar
5. **Text**: แสดงขนาดฟอนต์และสีตัวอักษร

### การเปลี่ยนแปลงแบบ Real-time
- **สี**: เปลี่ยนทันทีเมื่อเลือกจาก Color Picker
- **ขนาด**: เปลี่ยนทันทีเมื่อปรับค่าตัวเลข
- **เอฟเฟกต์**: เปลี่ยนทันทีเมื่อ toggle checkbox

## 🛠️ ไฟล์ที่เกี่ยวข้อง

### Frontend
- **JavaScript**: `/public/js/appearance-settings.js`
- **View**: `/views/settings/system.ejs`
- **Styles**: Inline CSS ใน system.ejs

### Backend
- **Controller**: `/controllers/settingController.js`
- **Model**: `/models/Setting.js`
- **Routes**: `/routes/settingRoutes.js`

### Database
- **Table**: `SystemSettings`
- **Category**: `appearance`
- **Settings**: 16 settings รวม

## 📊 ตัวอย่าง Settings

```javascript
// ค่าเริ่มต้นของ Appearance Settings
{
  "primary_color": "#3B82F6",        // สีน้ำเงิน
  "secondary_color": "#10B981",      // สีเขียว
  "accent_color": "#F59E0B",         // สีเหลือง/ส้ม
  "background_color": "#F3F4F6",     // สีเทาอ่อน
  "text_color": "#1F2937",           // สีเทาเข้ม
  "border_radius": "8",              // 8px
  "font_size_base": "16",            // 16px
  "header_height": "64",             // 64px
  "sidebar_width": "256",            // 256px
  "enable_animations": "true",       // เปิดใช้งาน
  "enable_shadows": "true",          // เปิดใช้งาน
  "compact_mode": "false",           // ปิดใช้งาน
  "logo_url": "/images/rukchai-logo.png",
  "favicon_url": "/favicon.ico",
  "font_family": "Sarabun",
  "theme_mode": "light"
}
```

## 🎨 CSS Classes ที่ใช้

### Animations
```css
.tab-content {
    animation: fadeIn 0.3s ease-in;
}

#appearance-preview {
    animation: slideUp 0.5s ease-out;
}
```

### Hover Effects
```css
#tab-appearance .setting-item:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;
}

input[type="color"]:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
}
```

## 🌍 รองรับหลายภาษา

### ภาษาไทย (TH)
- รูปแบบ
- การตั้งค่าระบบ
- ตัวอย่างการแสดงผล
- รีเซ็ตเป็นค่าเริ่มต้น

### ภาษาอังกฤษ (EN)
- Appearance
- System Settings
- Preview
- Reset to Default

## 🔐 สิทธิ์การเข้าถึง

- ✅ **Admin**: เข้าถึงและแก้ไขได้ทั้งหมด
- ✅ **Super Admin**: เข้าถึงและแก้ไขได้ทั้งหมด
- ❌ **User/Instructor/Manager**: ไม่สามารถเข้าถึง System Settings

## 📱 Responsive Design

- ✅ Desktop: แสดงผลเต็มรูปแบบ
- ✅ Tablet: ปรับ layout ให้เหมาะสม
- ✅ Mobile: แสดงผลแบบ stack

## ⚙️ การทำงานภายใน

### 1. Load Settings
```javascript
// Load from database via controller
exports.getSystemSettingsPage = async (req, res) => {
    const allSettings = await Setting.getAllSystemSettings();
    // Group by category
    res.render('settings/system', { settings: allSettings });
}
```

### 2. Update Preview
```javascript
// Real-time preview update
colorInput.addEventListener('input', function() {
    previewElement.style.backgroundColor = this.value;
});
```

### 3. Save Settings
```javascript
// Batch update via API
await fetch('/settings/batch', {
    method: 'POST',
    body: JSON.stringify({ settings: [...] })
});
```

## 🐛 Troubleshooting

### ปัญหา: Preview ไม่แสดงผล
**แก้ไข**:
- ตรวจสอบว่า JavaScript โหลดสำเร็จ (`appearance-settings.js`)
- เปิด Console ดู error
- รีโหลดหน้าเว็บ (Ctrl+F5)

### ปัญหา: บันทึกไม่ได้
**แก้ไข**:
- ตรวจสอบ permission (ต้องเป็น Admin)
- ตรวจสอบ validation rules
- ดู error message ใน alert

### ปัญหา: สีไม่เปลี่ยน
**แก้ไข**:
- ตรวจสอบรูปแบบสี (ต้องเป็น Hex: #RRGGBB)
- ตรวจสอบว่า input ไม่ disabled
- ลองรีเซ็ตเป็นค่าเริ่มต้น

## 📝 หมายเหตุ

- การเปลี่ยนแปลงจะมีผลกับทั้งระบบเมื่อบันทึกแล้ว
- ควรทดสอบการตั้งค่าก่อนบันทึก (ใช้ Preview)
- แนะนำให้ใช้ค่าที่เหมาะสมเพื่อ UX ที่ดี
- การตั้งค่าบางอย่างอาจต้อง reload หน้าเพื่อให้มีผลทั้งหมด

## 🚀 การพัฒนาในอนาคต

- [ ] Export/Import theme presets
- [ ] Dark mode auto-switch based on time
- [ ] Custom CSS injection
- [ ] Theme marketplace
- [ ] A/B testing themes
- [ ] Mobile-specific settings
- [ ] Accessibility settings (contrast, font size)

---

**สร้างโดย**: Claude Code
**วันที่**: 3 ตุลาคม 2025
**เวอร์ชัน**: 1.0.0
