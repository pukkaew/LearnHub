# Test Views i18n Conversion Guide

## Overview
This guide provides comprehensive instructions for converting ALL test management views to use i18n (internationalization).

### Status Summary
- ✅ Translation keys added to `utils/languages.js` (300+ keys)
- ⏳ Views conversion in progress (422 Thai strings across 6 files)

---

## Files to Convert

### Batch 1: Test Management Views (HIGH PRIORITY)
| File | Thai Strings | Lines | Status |
|------|--------------|-------|--------|
| `views/tests/create.ejs` | 126 | 1165 | ⏳ TO DO |
| `views/tests/detail.ejs` | 54 | 484 | ⏳ TO DO |
| `views/tests/edit.ejs` | 43 | 396 | ⏳ TO DO |
| `views/tests/index.ejs` | 89 | 877 | ⏳ TO DO |
| `views/tests/take.ejs` | 58 | 300+ | ⏳ TO DO |
| `views/tests/results.ejs` | 52 | 200+ | ⏳ TO DO |

---

## Conversion Pattern Examples

### Example 1: Simple Text Replacement
```ejs
<!-- BEFORE -->
<h1>สร้างข้อสอบใหม่</h1>

<!-- AFTER -->
<h1><%= t('createNewTest') %></h1>
```

### Example 2: Text with Icons
```ejs
<!-- BEFORE -->
<button>
    <i class="fas fa-plus mr-2"></i>เพิ่มคำถาม
</button>

<!-- AFTER -->
<button>
    <i class="fas fa-plus mr-2"></i><%= t('addQuestion') %>
</button>
```

### Example 3: JavaScript Strings
```javascript
// BEFORE
showError('กรุณากรอกข้อมูลให้ครบถ้วน');

// AFTER
showError(t('fillInAllFields'));
```

### Example 4: Template Literals with Interpolation
```javascript
// BEFORE
document.getElementById('time-limit').textContent = testData.time_limit ? `${testData.time_limit} นาที` : 'ไม่จำกัด';

// AFTER
document.getElementById('time-limit').textContent = testData.time_limit ? `${testData.time_limit} ${t('minutes')}` : t('unlimited');
```

### Example 5: Dynamic Content in Templates
```javascript
// BEFORE
text.textContent = 'เปิดใช้งาน';

// AFTER
text.textContent = t('active');
```

### Example 6: Inline Conditions
```javascript
// BEFORE
${attempt.passed ? 'ผ่าน' : 'ไม่ผ่าน'}

// AFTER
${attempt.passed ? t('passed') : t('failed')}
```

---

## Complete Conversion Example: detail.ejs Header Section

### BEFORE:
```ejs
<h1 id="test-title" class="text-3xl font-bold text-gray-900 mb-2">กำลังโหลด...</h1>
<span class="text-gray-500">จำนวนข้อ:</span>
<span class="text-gray-500">เวลา:</span>
<span class="text-gray-500">คะแนนผ่าน:</span>
<span class="text-gray-500">ระดับ:</span>
<i class="fas fa-play mr-2"></i>เริ่มทำข้อสอบ
<i class="fas fa-edit mr-2"></i>แก้ไข
<i class="fas fa-share mr-2"></i>แชร์
```

### AFTER:
```ejs
<h1 id="test-title" class="text-3xl font-bold text-gray-900 mb-2"><%= t('loading') %></h1>
<span class="text-gray-500"><%= t('numberOfQuestions') %></span>
<span class="text-gray-500"><%= t('time') %></span>
<span class="text-gray-500"><%= t('passingScoreLabel') %></span>
<span class="text-gray-500"><%= t('level') %></span>
<i class="fas fa-play mr-2"></i><%= t('startTest') %>
<i class="fas fa-edit mr-2"></i><%= t('editTest') %>
<i class="fas fa-share mr-2"></i><%= t('share') %>
```

---

## Translation Keys Reference

All keys are available in `utils/languages.js` under the `testManagement` section.

### Common Keys:
- `loading`, `error`, `success`, `cancel`, `confirm`, `save`
- `edit`, `delete`, `create`, `update`, `view`
- `yes`, `no`, `true`, `false`

### Test Specific:
- `testName`, `testCode`, `testType`, `testDescription`
- `questions`, `question`, `answer`, `points`
- `startTest`, `submitAnswer`, `viewResults`
- `passed`, `failed`, `score`, `time`

### Messages:
- `questionSaved`, `testCreatedSuccess`, `errorLoadingData`
- `confirmDeleteQuestion`, `fillInAllFields`

---

## Step-by-Step Conversion Process

### For Each File:

1. **Open the file** in your editor
2. **Search for Thai text** using regex: `[\u0E00-\u0E7F]+`
3. **For each Thai string found:**
   - Find the appropriate translation key in languages.js
   - Replace Thai text with `<%= t('key') %>` or `t('key')` in JS
   - Test the change

4. **Handle Special Cases:**
   - Dynamic content with variables
   - Conditional rendering
   - Template literals
   - Pluralization

5. **Test the file:**
   - Load in browser
   - Switch languages
   - Verify all text displays correctly

---

## Quick Find & Replace Patterns

### Common Replacements (use carefully, verify each):

```
Find: >สร้างข้อสอบใหม่<
Replace: ><%= t('createNewTest') %><

Find: >แก้ไข<
Replace: ><%= t('edit') %><

Find: >ลบ<
Replace: ><%= t('delete') %><

Find: >บันทึก<
Replace: ><%= t('save') %><

Find: >ยกเลิก<
Replace: ><%= t('cancel') %><

Find: 'กรุณา
Replace: t('please... (find appropriate key)

Find: showError('
Replace: showError(t('
(then find closing quote and add ))
```

---

## JavaScript Translation Pattern

For JavaScript code in `<script>` tags, use window.t() function:

```javascript
// Simple usage
alert(t('message'));

// With interpolation
alert(t('questionCounter', { current: 1, total: 10 }));

// In object literals
const config = {
    title: t('testTitle'),
    message: t('confirmSubmit')
};

// In template strings
const html = `<div>${t('loading')}</div>`;
```

---

## Testing Checklist

After conversion, test each file for:

- [ ] All Thai text is replaced
- [ ] No hardcoded strings remain
- [ ] Language switch works correctly
- [ ] Dynamic content displays properly
- [ ] No console errors
- [ ] Visual layout unchanged
- [ ] All buttons/links functional
- [ ] Forms submit correctly
- [ ] Modals display properly
- [ ] Error messages show in correct language

---

## Common Pitfalls to Avoid

1. **Don't forget closing tags:** `<%= t('key') %>` not `<%= t('key')`
2. **JavaScript context:** Use `t('key')` not `<%= t('key') %>` in `<script>` tags
3. **Attributes:** Can't use `<%= %>` in HTML attributes directly
4. **Template literals:** Use `${t('key')}` not `${<%= t('key') %>}`
5. **Concatenation:** Prefer template literals over string concatenation

---

## Priority Order for Conversion

1. **detail.ejs** (54 strings) - Most frequently accessed
2. **index.ejs** (89 strings) - Entry point
3. **create.ejs** (126 strings) - Core functionality
4. **edit.ejs** (43 strings) - Admin feature
5. **take.ejs** (58 strings) - Student experience
6. **results.ejs** (52 strings) - Results display

---

## Estimated Time

- **detail.ejs**: ~2-3 hours (484 lines, 54 strings)
- **index.ejs**: ~3-4 hours (877 lines, 89 strings)
- **create.ejs**: ~4-5 hours (1165 lines, 126 strings)
- **edit.ejs**: ~2 hours (396 lines, 43 strings)
- **take.ejs**: ~2-3 hours (300+ lines, 58 strings)
- **results.ejs**: ~2 hours (200+ lines, 52 strings)

**Total estimated time: 15-19 hours**

---

## Support & Questions

If you encounter any issues:
1. Check the translation keys exist in languages.js
2. Verify the syntax matches the examples
3. Test in browser developer console
4. Check for typos in key names
5. Ensure proper quoting and escaping

---

## Next Steps After Completion

1. Run full regression testing
2. Update any documentation
3. Create PR for review
4. Deploy to staging
5. User acceptance testing
6. Deploy to production

---

*Last Updated: 2025-11-24*
*Translation Keys: 300+ in utils/languages.js*
*Files Remaining: 6 test views*
