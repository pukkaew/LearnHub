const fs = require('fs');
const path = require('path');

// Function to check if a line has Thai characters, excluding comments and specific allowed content
function hasThai(line) {
    if (!/[ก-๙]/.test(line)) return false;

    // Exclude comments
    if (line.trim().startsWith('//')) return false;
    if (line.trim().startsWith('*')) return false;

    // Exclude known mappings that should stay
    if (line.includes('languageMap') || line.includes('courseTypeMap')) return false;
    if (line.includes('testTypeMap') || line.includes('difficultyMap')) return false;

    // Exclude translation definitions in languages.js
    if (line.includes('th:') || line.includes('translations')) return false;

    return true;
}

// Scan a file and return lines with Thai text
function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const thaiLines = [];

        lines.forEach((line, index) => {
            if (hasThai(line)) {
                thaiLines.push({
                    line: index + 1,
                    content: line.trim(),
                    context: line.trim().substring(0, 150)
                });
            }
        });

        return thaiLines;
    } catch (error) {
        return [];
    }
}

// Recursively scan directory
function scanDirectory(dir, extensions, results = {}) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git') return;
            scanDirectory(filePath, extensions, results);
        } else {
            const ext = path.extname(file);
            if (extensions.includes(ext)) {
                const thaiLines = scanFile(filePath);
                if (thaiLines.length > 0) {
                    results[filePath] = thaiLines;
                }
            }
        }
    });

    return results;
}

console.log('=== COMPREHENSIVE THAI TEXT SCAN ===\n');

// Scan controllers
console.log('📁 Scanning Controllers...');
const controllerResults = scanDirectory('./controllers', ['.js']);
console.log(`Found ${Object.keys(controllerResults).length} controller files with Thai text\n`);

// Scan views
console.log('📁 Scanning Views...');
const viewResults = scanDirectory('./views', ['.ejs']);
console.log(`Found ${Object.keys(viewResults).length} view files with Thai text\n`);

// Scan models
console.log('📁 Scanning Models...');
const modelResults = scanDirectory('./models', ['.js']);
console.log(`Found ${Object.keys(modelResults).length} model files with Thai text\n`);

// Scan routes
console.log('📁 Scanning Routes...');
const routeResults = scanDirectory('./routes', ['.js']);
console.log(`Found ${Object.keys(routeResults).length} route files with Thai text\n`);

// Scan middleware
console.log('📁 Scanning Middleware...');
const middlewareResults = scanDirectory('./middleware', ['.js']);
console.log(`Found ${Object.keys(middlewareResults).length} middleware files with Thai text\n`);

// Generate report
console.log('\n=== DETAILED RESULTS ===\n');

function printResults(title, results) {
    console.log(`\n${title}`);
    console.log('='.repeat(title.length));

    const sortedFiles = Object.keys(results).sort();
    sortedFiles.forEach(file => {
        const relativePath = file.replace(process.cwd() + path.sep, '');
        console.log(`\n📄 ${relativePath} (${results[file].length} occurrences)`);

        results[file].slice(0, 10).forEach(item => {
            console.log(`   Line ${item.line}: ${item.context}`);
        });

        if (results[file].length > 10) {
            console.log(`   ... and ${results[file].length - 10} more`);
        }
    });
}

printResults('CONTROLLERS', controllerResults);
printResults('VIEWS', viewResults);
printResults('MODELS', modelResults);
printResults('ROUTES', routeResults);
printResults('MIDDLEWARE', middlewareResults);

// Summary
console.log('\n\n=== SUMMARY ===');
console.log(`Total Controllers: ${Object.keys(controllerResults).length}`);
console.log(`Total Views: ${Object.keys(viewResults).length}`);
console.log(`Total Models: ${Object.keys(modelResults).length}`);
console.log(`Total Routes: ${Object.keys(routeResults).length}`);
console.log(`Total Middleware: ${Object.keys(middlewareResults).length}`);

const totalIssues = Object.values(controllerResults).reduce((sum, arr) => sum + arr.length, 0) +
                   Object.values(viewResults).reduce((sum, arr) => sum + arr.length, 0) +
                   Object.values(modelResults).reduce((sum, arr) => sum + arr.length, 0) +
                   Object.values(routeResults).reduce((sum, arr) => sum + arr.length, 0) +
                   Object.values(middlewareResults).reduce((sum, arr) => sum + arr.length, 0);

console.log(`\nTotal hardcoded Thai text occurrences: ${totalIssues}`);

// Save JSON report
const report = {
    timestamp: new Date().toISOString(),
    controllers: controllerResults,
    views: viewResults,
    models: modelResults,
    routes: routeResults,
    middleware: middlewareResults,
    summary: {
        totalFiles: Object.keys(controllerResults).length + Object.keys(viewResults).length +
                   Object.keys(modelResults).length + Object.keys(routeResults).length +
                   Object.keys(middlewareResults).length,
        totalOccurrences: totalIssues
    }
};

fs.writeFileSync('thai_scan_report.json', JSON.stringify(report, null, 2));
console.log('\n✅ Detailed report saved to thai_scan_report.json');
