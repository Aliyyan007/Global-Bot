/**
 * Script to run only the language property test
 */

const { spawn } = require('child_process');
const path = require('path');

const mocha = path.join(__dirname, '..', 'node_modules', 'mocha', 'bin', 'mocha');
const testFile = path.join(__dirname, '..', 'tests', 'notification-channels-language.property.test.js');
const setupFile = path.join(__dirname, '..', 'tests', 'setup.js');

const child = spawn('node', [mocha, '--require', setupFile, testFile], {
    stdio: 'inherit',
    shell: true
});

child.on('exit', (code) => {
    process.exit(code);
});
