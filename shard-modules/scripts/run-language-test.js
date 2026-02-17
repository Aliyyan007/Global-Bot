/**
 * Simple test runner for language property tests
 */

const { spawn } = require('child_process');
const path = require('path');

const testFile = path.join(__dirname, '..', 'tests', 'notification-channels-language.property.test.js');
const mochaPath = path.join(__dirname, '..', 'node_modules', 'mocha', 'bin', 'mocha');

console.log('Running language property tests...\n');

const mocha = spawn('node', [mochaPath, testFile, '--timeout', '10000'], {
    stdio: 'inherit',
    shell: false
});

mocha.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ All tests passed!');
    } else {
        console.log(`\n❌ Tests failed with exit code ${code}`);
    }
    process.exit(code);
});

mocha.on('error', (err) => {
    console.error('Failed to start test process:', err);
    process.exit(1);
});
