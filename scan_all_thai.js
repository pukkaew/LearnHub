const fs = require('fs');
const path = require('path');

// Patterns to scan
const patterns = {
    views: 'views/**/*.ejs',
    controllers: 'controllers/**/*.js',
    models: 'models/**/*.js',
    routes: 'routes/**/*.js'
};

// Thai character pattern
const thaiPattern = /[ก-๙]/;

function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const thaiLines = [];

        lines.forEach((line, index) => {
            // Skip comments and template strings with t() function
            if (line.includes('//') && !line.trim().startsWith('//')) {
                // Check only the part before //
                const beforeComment = line.split('//')[0];
                if (thaiPattern.test(beforeComment) && !beforeComment.includes('t(')) {
                    thaiLines.push({
                        line: index + 1,
                        text: line.trim().substring(0, 100)
                    });
                }
            } else if (!line.includes('//') && thaiPattern.test(line) && !line.includes('t(')) {
                thaiLines.push({
                    line: index + 1,
                    text: line.trim().substring(0, 100)
                });
            }
        });

        return thaiLines;
    } catch (err) {
        return [];
    }
}

function scanDirectory(dir, extension) {
    const results = {};

    function walk(currentPath) {
        try {
            const files = fs.readdirSync(currentPath);

            files.forEach(file => {
                const filePath = path.join(currentPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    if (!file.startsWith('.') && file !== 'node_modules') {
                        walk(filePath);
                    }
                } else if (file.endsWith(extension)) {
                    const thaiLines = scanFile(filePath);
                    if (thaiLines.length > 0) {
                        results[filePath] = thaiLines;
                    }
                }
            });
        } catch (err) {
            // Skip directories we can't read
        }
    }

    walk(dir);
    return results;
}

console.log('🔍 Scanning for Thai text in all files...\n');

// Scan views
console.log('📁 Scanning views...');
const viewResults = scanDirectory('views', '.ejs');
console.log(`   Found Thai text in ${Object.keys(viewResults).length} files\n`);

// Scan controllers
console.log('📁 Scanning controllers...');
const controllerResults = scanDirectory('controllers', '.js');
console.log(`   Found Thai text in ${Object.keys(controllerResults).length} files\n`);

// Scan models
console.log('📁 Scanning models...');
const modelResults = scanDirectory('models', '.js');
console.log(`   Found Thai text in ${Object.keys(modelResults).length} files\n`);

// Output detailed results
console.log('=' .repeat(80));
console.log('DETAILED RESULTS');
console.log('='.repeat(80));

console.log('\n📄 VIEWS WITH THAI TEXT:');
Object.keys(viewResults).forEach(file => {
    console.log(`\n${file}:`);
    viewResults[file].forEach(item => {
        console.log(`  Line ${item.line}: ${item.text}`);
    });
});

console.log('\n📄 CONTROLLERS WITH THAI TEXT:');
Object.keys(controllerResults).forEach(file => {
    console.log(`\n${file}:`);
    controllerResults[file].forEach(item => {
        console.log(`  Line ${item.line}: ${item.text}`);
    });
});

console.log('\n📄 MODELS WITH THAI TEXT:');
Object.keys(modelResults).forEach(file => {
    console.log(`\n${file}:`);
    modelResults[file].forEach(item => {
        console.log(`  Line ${item.line}: ${item.text}`);
    });
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Views: ${Object.keys(viewResults).length} files`);
console.log(`Controllers: ${Object.keys(controllerResults).length} files`);
console.log(`Models: ${Object.keys(modelResults).length} files`);
console.log(`Total: ${Object.keys(viewResults).length + Object.keys(controllerResults).length + Object.keys(modelResults).length} files with Thai text`);

// Save to file
const report = {
    views: viewResults,
    controllers: controllerResults,
    models: modelResults,
    summary: {
        views: Object.keys(viewResults).length,
        controllers: Object.keys(controllerResults).length,
        models: Object.keys(modelResults).length
    }
};

fs.writeFileSync('thai_text_report.json', JSON.stringify(report, null, 2));
console.log('\n✅ Report saved to thai_text_report.json');
