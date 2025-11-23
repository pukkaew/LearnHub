// Translation Verification Script
// ตรวจสอบว่า translation keys ทั้งหมดที่ใช้ในไฟล์ EJS มีอยู่ใน utils/languages.js หรือไม่

const fs = require('fs');
const path = require('path');

// อ่านไฟล์ languages.js
const languagesPath = path.join(__dirname, 'utils', 'languages.js');
const languagesContent = fs.readFileSync(languagesPath, 'utf8');

// Extract translation keys from languages.js
// เราจะดูที่ส่วน th: { ... } และ en: { ... }
function extractKeysFromLanguages(content) {
    const thKeys = new Set();
    const enKeys = new Set();

    // หา pattern: key: 'value' หรือ key: "value"
    const keyPattern = /(\w+):\s*['"]([^'"]+)['"]/g;

    let match;
    while ((match = keyPattern.exec(content)) !== null) {
        const key = match[1];
        // เพิ่มทั้ง th และ en เพราะควรมีครบทั้งคู่
        thKeys.add(key);
        enKeys.add(key);
    }

    return { thKeys, enKeys };
}

// Extract translation keys ที่ใช้ในไฟล์ EJS
function extractUsedKeys(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const usedKeys = new Set();

    // หา pattern: <%= t('key') %> หรือ <%- t('key') %>
    const tPattern = /<%[=-]\s*t\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = tPattern.exec(content)) !== null) {
        usedKeys.add(match[1]);
    }

    return usedKeys;
}

// Main verification
console.log('🔍 Translation Verification Report');
console.log('='.repeat(80));
console.log('');

// 1. Extract keys from languages.js
const { thKeys, enKeys } = extractKeysFromLanguages(languagesContent);
console.log(`📋 Total translation keys in languages.js: ${thKeys.size}`);
console.log('');

// 2. Check each Course view file
const viewFiles = [
    { name: 'categories.ejs', path: path.join(__dirname, 'views', 'courses', 'categories.ejs') },
    { name: 'create.ejs', path: path.join(__dirname, 'views', 'courses', 'create.ejs') },
    { name: 'detail.ejs', path: path.join(__dirname, 'views', 'courses', 'detail.ejs') }
];

let totalUsedKeys = 0;
let totalMissingKeys = 0;
const allMissingKeys = new Set();

viewFiles.forEach(file => {
    console.log(`\n📄 Checking: ${file.name}`);
    console.log('-'.repeat(80));

    const usedKeys = extractUsedKeys(file.path);
    console.log(`   Used translation keys: ${usedKeys.size}`);

    // Check for missing keys
    const missingKeys = [];
    usedKeys.forEach(key => {
        if (!thKeys.has(key)) {
            missingKeys.push(key);
            allMissingKeys.add(key);
        }
    });

    if (missingKeys.length > 0) {
        console.log(`   ❌ Missing keys (${missingKeys.length}):`);
        missingKeys.forEach(key => {
            console.log(`      - ${key}`);
        });
    } else {
        console.log(`   ✅ All keys exist in languages.js`);
    }

    totalUsedKeys += usedKeys.size;
    totalMissingKeys += missingKeys.length;
});

// Summary
console.log('\n');
console.log('='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));
console.log(`Total translation keys used across all files: ${totalUsedKeys}`);
console.log(`Total unique translation keys in languages.js: ${thKeys.size}`);
console.log(`Total missing keys: ${totalMissingKeys}`);

if (allMissingKeys.size > 0) {
    console.log('\n❌ All Missing Keys:');
    Array.from(allMissingKeys).sort().forEach(key => {
        console.log(`   - ${key}`);
    });
} else {
    console.log('\n✅ All translation keys are properly defined!');
}

// Check for hardcoded Thai text (ก-ฮ)
console.log('\n');
console.log('='.repeat(80));
console.log('🔍 Checking for hardcoded Thai text');
console.log('='.repeat(80));

viewFiles.forEach(file => {
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\n');
    const hardcodedLines = [];

    lines.forEach((line, index) => {
        // ข้าม JavaScript comments และ script tags
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('translations')) {
            return;
        }

        // หา Thai characters (ก-ฮ, ะ-ฺ, เ-ไ)
        if (/[ก-ฮะ-ฺเ-ไ]/.test(line)) {
            // ตรวจสอบว่าไม่ใช่ในส่วน <%= t('...') %>
            const tempLine = line.replace(/<%[=-]\s*t\(['"][^'"]+['"]\)[^%]*%>/g, '');
            if (/[ก-ฮะ-ฺเ-ไ]/.test(tempLine)) {
                hardcodedLines.push({
                    line: index + 1,
                    content: line.trim().substring(0, 100)
                });
            }
        }
    });

    if (hardcodedLines.length > 0) {
        console.log(`\n❌ ${file.name}: Found ${hardcodedLines.length} lines with hardcoded Thai text`);
        hardcodedLines.slice(0, 10).forEach(item => {
            console.log(`   Line ${item.line}: ${item.content}`);
        });
        if (hardcodedLines.length > 10) {
            console.log(`   ... and ${hardcodedLines.length - 10} more`);
        }
    } else {
        console.log(`\n✅ ${file.name}: No hardcoded Thai text found`);
    }
});

console.log('\n');
console.log('='.repeat(80));
console.log('✅ Verification Complete!');
console.log('='.repeat(80));
