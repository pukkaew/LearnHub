/**
 * i18n Test Views Converter Helper
 * This script helps identify Thai strings that need conversion
 */

const fs = require('fs');
const path = require('path');

// Thai Unicode range: \u0E00-\u0E7F
const thaiRegex = /[\u0E00-\u0E7F]+/g;

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const matches = [];
    lines.forEach((line, index) => {
        const thaiMatches = line.match(thaiRegex);
        if (thaiMatches) {
            matches.push({
                line: index + 1,
                content: line.trim(),
                thaiText: thaiMatches
            });
        }
    });

    return {
        file: path.basename(filePath),
        total: matches.length,
        matches: matches.slice(0, 50) // Show first 50
    };
}

// Analyze test views
const testViews = [
    'D:\\App\\LearnHub\\views\\tests\\create.ejs',
    'D:\\App\\LearnHub\\views\\tests\\detail.ejs',
    'D:\\App\\LearnHub\\views\\tests\\edit.ejs',
    'D:\\App\\LearnHub\\views\\tests\\index.ejs',
    'D:\\App\\LearnHub\\views\\tests\\take.ejs',
    'D:\\App\\LearnHub\\views\\tests\\results.ejs',
    'D:\\App\\LearnHub\\views\\tests\\analytics.ejs'
];

console.log('===== TEST VIEWS i18n ANALYSIS =====\n');

testViews.forEach(file => {
    if (fs.existsSync(file)) {
        const result = analyzeFile(file);
        console.log(`File: ${result.file}`);
        console.log(`Total Thai strings: ${result.total}`);
        console.log(`Sample matches (first 10):`);
        result.matches.slice(0, 10).forEach(match => {
            console.log(`  Line ${match.line}: ${match.thaiText.join(', ')}`);
        });
        console.log('');
    }
});
