// Test HTML entity issue with learning_objectives - no external dependencies

const testString = '[&quot;กหดกหดหก&quot;,&quot;หกดกหด&quot;,&quot;กหดกหดหกด&quot;]';

console.log('=== TESTING HTML ENTITY ISSUE ===\n');
console.log('Raw string from database:', testString);
console.log('Type:', typeof testString);

console.log('\n1. Trying to parse directly:');
try {
    const parsed = JSON.parse(testString);
    console.log('✓ Success:', parsed);
} catch (e) {
    console.log('✗ Parse failed:', e.message);
}

console.log('\n2. After decoding HTML entities manually:');
// Simple HTML entity decoder
function decodeHtmlEntities(text) {
    const entities = {
        '&quot;': '"',
        '&#34;': '"',
        '&apos;': "'",
        '&#39;': "'",
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&'
    };

    return text.replace(/&quot;|&#34;|&apos;|&#39;|&lt;|&gt;|&amp;/g, match => entities[match]);
}

const decoded = decodeHtmlEntities(testString);
console.log('Decoded string:', decoded);

try {
    const parsed = JSON.parse(decoded);
    console.log('✓ Success:', parsed);
    console.log('Array length:', parsed.length);
    console.log('Values:', parsed);
} catch (e) {
    console.log('✗ Parse failed:', e.message);
}

console.log('\n=== ROOT CAUSE IDENTIFIED ===');
console.log('The learning_objectives field in the database contains HTML entities (&quot;)');
console.log('instead of proper double quotes (")');
console.log('\nThis happens when:');
console.log('- Data is HTML-escaped before being stored in the database');
console.log('- EJS or similar template engine escapes the data');
console.log('- Data is passed through HTML encoding function incorrectly');

console.log('\n=== SOLUTION ===');
console.log('Fix the Course.findById() method in models/Course.js');
console.log('Add HTML entity decoding before JSON.parse():');
console.log('');
console.log('if (course.learning_objectives && typeof course.learning_objectives === "string") {');
console.log('    // Decode HTML entities first');
console.log('    const decoded = course.learning_objectives.replace(/&quot;/g, \'"\')');
console.log('                                              .replace(/&#34;/g, \'"\')');
console.log('                                              .replace(/&apos;/g, "\'")');
console.log('                                              .replace(/&#39;/g, "\'");');
console.log('    course.learning_objectives = JSON.parse(decoded);');
console.log('}');
