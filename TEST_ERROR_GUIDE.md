# คู่มือการทดสอบเพื่อหา Errors - LearnHub Tests API

## 📋 ภาพรวม

ชุดทดสอบนี้ออกแบบมาเพื่อตรวจสอบและหา errors ในระบบ Tests API ของ LearnHub โดยครอบคลุม:

- ✅ **Validation Errors** - ข้อมูลไม่ถูกต้อง, ขาดฟิลด์ที่จำเป็น
- ✅ **Authorization Errors** - การเข้าถึงโดยไม่มีสิทธิ์
- ✅ **Business Logic Errors** - ละเมิดกฎทางธุรกิจ
- ✅ **Security Errors** - SQL Injection, XSS, Path Traversal
- ✅ **Database Constraints** - Primary Key, Foreign Key, Check Constraints
- ✅ **Edge Cases** - ค่าที่ผิดปกติ, Race Conditions, Concurrency

## 🔧 ไฟล์ทดสอบ

### 1. `test_error_scenarios.js` - API Layer Testing
ทดสอบ HTTP API endpoints ทั้งหมด

**ครอบคลุม:**
- Authentication & Authorization (401, 403)
- Input Validation (400)
- Not Found Errors (404)
- Business Logic Violations (400)
- SQL Injection & XSS Attacks
- Rate Limiting (429)
- Edge Cases & Malformed Requests

**การรัน:**
```bash
node test_error_scenarios.js
```

**ข้อกำหนด:**
- เซิร์ฟเวอร์ต้องทำงานที่ `http://localhost:3000`
- จะทดสอบโดยไม่ต้อง authentication token (เพื่อทดสอบ security)

### 2. `test_model_errors.js` - Model & Database Layer Testing
ทดสอบ Model layer และ database constraints โดยตรง

**ครอบคลุม:**
- Primary Key Constraints
- Foreign Key Constraints
- NOT NULL Constraints
- CHECK Constraints (negative values, ranges)
- Data Type Violations
- String Length Violations
- Concurrency Issues
- Transaction Rollbacks
- SQL Injection on Model Layer
- Edge Case Values (empty, null, special chars)

**การรัน:**
```bash
node test_model_errors.js
```

**ข้อกำหนด:**
- การเชื่อมต่อฐานข้อมูลต้องพร้อม
- อาจมีการแก้ไขข้อมูลในตาราง `tests` (ใช้ test database!)

## 🚀 วิธีการใช้งาน

### ขั้นตอนที่ 1: เตรียมสภาพแวดล้อม

```bash
# 1. ตรวจสอบ dependencies
npm install

# 2. ตรวจสอบไฟล์ .env
# ต้องมีการตั้งค่า database connection

# 3. เริ่ม server (terminal แยก)
npm run dev
# หรือ
node server.js
```

### ขั้นตอนที่ 2: รันการทดสอบ

**แนะนำ: รันทีละไฟล์เพื่อดูผลลัพธ์ชัดเจน**

```bash
# ทดสอบ API Layer
node test_error_scenarios.js

# รอให้เสร็จ แล้วรัน Model Layer Test
node test_model_errors.js
```

**หรือรันทั้งหมดพร้อมกัน:**
```bash
node run_all_error_tests.js
```

### ขั้นตอนที่ 3: วิเคราะห์ผลลัพธ์

**สัญลักษณ์ที่ต้องเข้าใจ:**

- ❌ **ERROR** (สีแดง) = พบข้อผิดพลาดตามที่คาดหวัง ✅ **ดี!**
  - หมายความว่า validation/constraint ทำงานถูกต้อง
  - ระบบป้องกัน invalid data ได้

- ✓ **PASS** (สีเขียว) = ไม่พบ error ⚠️ **อาจเป็นปัญหา!**
  - ถ้าควรมี error แต่ไม่มี = constraint ไม่ทำงาน
  - อาจเป็นช่องโหว่ด้าน security หรือ data integrity

**ตัวอย่างการอ่านผลลัพธ์:**

```
❌ ERROR: Negative total_score (-100)
   SQL Error: 547 (CONSTRAINT violation)
👆 ดี! Database ป้องกันค่าลบได้

✓ PASS: SQL Injection - ควรต้อง error/sanitized
   No error occurred - SECURITY ISSUE!
👆 แย่! SQL Injection ไม่ถูก sanitize - มีช่องโหว่!
```

## 📊 ประเภท Errors ที่ทดสอบ

### 1. Validation Errors (HTTP 400)

| Test Case | Expected Error | Impact |
|-----------|----------------|---------|
| Missing test_name | 400 Bad Request | ⚠️ High |
| Negative duration | 400 Bad Request | ⚠️ Medium |
| Invalid data type | 400 Bad Request | ⚠️ High |
| Empty strings | 400 Bad Request | ⚠️ Medium |
| Very long strings | 400 Bad Request | ⚠️ Low |

### 2. Authorization Errors (HTTP 401, 403)

| Test Case | Expected Error | Impact |
|-----------|----------------|---------|
| No token | 401 Unauthorized | 🔒 Critical |
| Invalid token | 401 Unauthorized | 🔒 Critical |
| Wrong role | 403 Forbidden | 🔒 High |
| Access other's test | 403 Forbidden | 🔒 High |

### 3. Business Logic Errors (HTTP 400, 409)

| Test Case | Expected Error | Impact |
|-----------|----------------|---------|
| Exceed max attempts | 400 Bad Request | ⚠️ High |
| Start inactive test | 400 Bad Request | ⚠️ High |
| Submit completed test | 400 Bad Request | ⚠️ Medium |
| Duplicate attempt | 409 Conflict | ⚠️ Medium |

### 4. Security Errors

| Test Case | Expected Behavior | Impact |
|-----------|-------------------|---------|
| SQL Injection | Sanitized/Blocked | 🔒 Critical |
| XSS Attack | Sanitized/Escaped | 🔒 Critical |
| Path Traversal | Blocked | 🔒 High |
| Rate Limiting | 429 Too Many Requests | ⚠️ Medium |

### 5. Database Constraints

| Constraint | Test Case | Impact |
|------------|-----------|---------|
| PRIMARY KEY | Duplicate test_id | 🔒 Critical |
| FOREIGN KEY | Invalid course_id | ⚠️ High |
| NOT NULL | NULL test_name | ⚠️ High |
| CHECK | Negative values | ⚠️ Medium |
| CHECK | Out of range | ⚠️ Medium |

## 🎯 เป้าหมายการทดสอบ

### สิ่งที่ต้องการหา:

1. **ช่องโหว่ด้าน Security** 🔒
   - SQL Injection ที่ไม่ถูก sanitize
   - XSS ที่ไม่ถูก escape
   - Authentication bypass
   - Authorization bypass

2. **ปัญหา Data Integrity** ⚠️
   - Constraints ที่ไม่ทำงาน
   - Invalid data ที่ผ่าน validation
   - Business rules ที่ถูกละเมิด

3. **Edge Cases & Bugs** 🐛
   - Race conditions
   - Null pointer exceptions
   - Type conversion errors
   - Buffer overflows

## 📈 การปรับปรุงตามผลทดสอบ

### ถ้าพบ Security Issues:

```javascript
// ❌ ไม่ดี - ไม่มี sanitization
const result = await pool.query(`
    SELECT * FROM tests WHERE test_name = '${userInput}'
`);

// ✅ ดี - ใช้ parameterized query
const result = await pool.request()
    .input('testName', sql.NVarChar(200), userInput)
    .query('SELECT * FROM tests WHERE test_name = @testName');
```

### ถ้าพบ Validation Issues:

```javascript
// ❌ ไม่ดี - ไม่มี validation
async function createTest(data) {
    return await Test.create(data);
}

// ✅ ดี - มี validation
async function createTest(data) {
    if (!data.test_name || data.test_name.trim() === '') {
        throw new Error('test_name is required');
    }
    if (data.duration_minutes < 0) {
        throw new Error('duration_minutes must be positive');
    }
    if (data.passing_score > data.total_score) {
        throw new Error('passing_score cannot exceed total_score');
    }
    return await Test.create(data);
}
```

### ถ้าพบ Database Constraint Issues:

```sql
-- เพิ่ม CHECK constraints
ALTER TABLE tests ADD CONSTRAINT CK_tests_duration_positive
    CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);

ALTER TABLE tests ADD CONSTRAINT CK_tests_score_range
    CHECK (passing_score >= 0 AND passing_score <= total_score);

ALTER TABLE tests ADD CONSTRAINT CK_tests_attempts_positive
    CHECK (max_attempts > 0);
```

## 🔍 การ Debug

### ถ้า Test ไม่ทำงาน:

1. **ตรวจสอบ Server**
   ```bash
   # ต้องมี server ทำงานที่ port 3000
   curl http://localhost:3000/health
   ```

2. **ตรวจสอบ Database Connection**
   ```bash
   node check_tests_schema.js
   ```

3. **ดู Server Logs**
   - เปิด terminal แยกที่รัน `npm run dev`
   - สังเกต errors ที่เกิดขึ้น

4. **ทดสอบทีละ Section**
   - Comment out sections ที่ไม่ต้องการ
   - รันเฉพาะ section ที่สนใจ

## ⚠️ คำเตือน

1. **อย่ารันบน Production Database!**
   - Tests จะพยายาม insert/update/delete data
   - ใช้ test database เท่านั้น!

2. **อาจมี Test Data ตกค้าง**
   - Tests บาง tests อาจสร้าง records ในฐานข้อมูล
   - ควร cleanup หลังรัน tests

3. **Rate Limiting Test**
   - อาจทำให้ IP ถูก rate limit ชั่วคราว
   - รอ 1-2 นาที ถ้าเกิดปัญหา

## 📝 Checklist หลังรัน Tests

- [ ] บันทึก error count และ pass count
- [ ] วิเคราะห์ว่า "PASS" ใดบ้างที่ควรเป็น "ERROR"
- [ ] จดบันทึกช่องโหว่ด้าน security ที่พบ
- [ ] จดบันทึก validation ที่ขาดหายไป
- [ ] สร้าง issues/tickets สำหรับแก้ไข
- [ ] เพิ่ม unit tests สำหรับ bugs ที่พบ
- [ ] Cleanup test data จากฐานข้อมูล

## 🎓 สรุป

การทดสอบเพื่อหา errors เป็นสิ่งสำคัญในการพัฒนา software ที่มีคุณภาพ:

- **ERROR** = ระบบป้องกันได้ ✅
- **PASS (ที่ไม่ควร PASS)** = พบช่องโหว่ ⚠️
- **แก้ไขตามลำดับความสำคัญ**: Critical → High → Medium → Low

**Good luck with testing! 🚀**
