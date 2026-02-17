/**
 * Direct test runner for language property tests
 */

// Load setup first
require('../tests/setup.js');

// Load Mocha
const Mocha = require('mocha');
const path = require('path');

// Create a new Mocha instance
const mocha = new Mocha({
    timeout: 10000,
    color: true
});

// Add the test file
const testFile = path.join(__dirname, '..', 'tests', 'notification-channels-language.property.test.js');
mocha.addFile(testFile);

// Run the tests
mocha.run((failures) => {
    process.exitCode = failures ? 1 : 0;
});
