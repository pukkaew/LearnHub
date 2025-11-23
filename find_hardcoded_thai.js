const fs = require('fs');

// Read detail.ejs
const content = fs.readFileSync('D:/App/LearnHub/views/courses/detail.ejs', 'utf8');

// Extract hardcoded Thai text from JavaScript section (line 320 onwards)
const jsSection = content.split('<script>')[1].split('</script>')[0];

// Find Thai text patterns
const thaiPattern = /['"`]([^'"`]*[ก-ฮ][^'"`]*?)['"`]/g;
const matches = [];
let match;

while ((match = thaiPattern.exec(jsSection)) !== null) {
    const text = match[1];
    // Skip if it's in a comment or already using t()
    if (text.length > 1 && !text.includes('translations') && !text.includes('currentLang')) {
        matches.push(text);
    }
}

// Get unique matches
const unique = [...new Set(matches)];

console.log(`Found ${unique.length} unique hardcoded Thai strings:\n`);
unique.forEach((text, i) => {
    console.log(`${i + 1}. "${text}"`);
});
