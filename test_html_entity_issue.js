// Test HTML entity issue with learning_objectives

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

console.log('\n2. After decoding HTML entities:');
const he = require('he'); // HTML entity decoder
const decoded = he.decode(testString);
console.log('Decoded string:', decoded);

try {
    const parsed = JSON.parse(decoded);
    console.log('✓ Success:', parsed);
    console.log('Array length:', parsed.length);
} catch (e) {
    console.log('✗ Parse failed:', e.message);
}

console.log('\n=== SOLUTION ===');
console.log('The learning_objectives field contains HTML entities instead of proper JSON');
console.log('Options:');
console.log('1. Fix the data in the database');
console.log('2. Decode HTML entities before parsing in Course.findById()');
console.log('3. Find where HTML entities are being inserted and fix it at the source');
