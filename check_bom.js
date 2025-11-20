const fs = require('fs');

const filesToCheck = [
    'views/courses/detail.ejs',
    'views/courses/index.ejs',
    'views/courses/create.ejs',
    'views/layout.ejs'
];

console.log('\n🔍 Checking files for BOM and encoding issues:\n');

filesToCheck.forEach(file => {
    try {
        const buffer = fs.readFileSync(file);
        const firstBytes = buffer.slice(0, 10);

        console.log(`📄 ${file}`);
        console.log(`   First 10 bytes: ${firstBytes.toString('hex').match(/.{1,2}/g).join(' ')}`);

        if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            console.log(`   ✅ UTF-8 BOM detected (this is OK)`);
        } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
            console.log(`   ⚠️  UTF-16 LE BOM detected (potential issue)`);
        } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
            console.log(`   ⚠️  UTF-16 BE BOM detected (potential issue)`);
        } else {
            console.log(`   ℹ️  No BOM (this is OK for UTF-8)`);
        }

        // Check for Thai characters
        const content = buffer.toString('utf8');
        const thaiMatch = content.match(/[\u0E00-\u0E7F]+/);
        if (thaiMatch) {
            console.log(`   ✅ Contains Thai text: "${thaiMatch[0].substring(0, 20)}..."`);
        }

        // Check for corrupted Thai (double-encoded pattern)
        const corruptedMatch = content.match(/เธ[\u0080-\u00FF]{2,}/);
        if (corruptedMatch) {
            console.log(`   ❌ Found corrupted Thai pattern: "${corruptedMatch[0].substring(0, 30)}"`);
        }

        console.log('');
    } catch (err) {
        console.log(`   ❌ Error reading file: ${err.message}\n`);
    }
});
