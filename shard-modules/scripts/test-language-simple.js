/**
 * Simple verification script for language support (without mocha)
 */

const { LANGUAGE_KEYS, getLocalizedString } = require('../modules/notification-channels/languageKeys');
const languageHandler = require('../handler/language');

// Mock client
const client = {
    language: languageHandler
};

const SUPPORTED_LOCALES = ['ru', 'en-US', 'uk', 'es-ES'];

console.log('Testing notification channel language support...\n');

let passed = 0;
let failed = 0;

// Test 1: All keys return non-empty strings for all locales
console.log('Test 1: All keys return non-empty strings for all locales');
for (const [keyName, textId] of Object.entries(LANGUAGE_KEYS)) {
    for (const locale of SUPPORTED_LOCALES) {
        const translated = client.language({ textId, locale });
        
        if (!translated || typeof translated !== 'string' || translated.length === 0) {
            console.log(`  ❌ FAIL: ${keyName} (${locale}) returned empty or invalid`);
            failed++;
        } else {
            passed++;
        }
    }
}
console.log(`  ✓ Passed: ${passed}, Failed: ${failed}\n`);

// Test 2: getLocalizedString helper works
console.log('Test 2: getLocalizedString helper works');
let helperPassed = 0;
let helperFailed = 0;

for (const keyName of Object.keys(LANGUAGE_KEYS)) {
    for (const locale of SUPPORTED_LOCALES) {
        try {
            const translated = getLocalizedString(client, keyName, { locale });
            
            if (!translated || typeof translated !== 'string' || translated.length === 0) {
                console.log(`  ❌ FAIL: ${keyName} (${locale}) returned empty or invalid`);
                helperFailed++;
            } else {
                helperPassed++;
            }
        } catch (error) {
            console.log(`  ❌ FAIL: ${keyName} (${locale}) threw error: ${error.message}`);
            helperFailed++;
        }
    }
}
console.log(`  ✓ Passed: ${helperPassed}, Failed: ${helperFailed}\n`);

// Test 3: Specific translations
console.log('Test 3: Specific translations verification');
const testCases = [
    { key: 'ENABLE', locale: 'en-US', expected: 'Enable' },
    { key: 'DISABLE', locale: 'en-US', expected: 'Disable' },
    { key: 'NOTIFICATION_CHANNELS_TITLE', locale: 'en-US', shouldContain: 'Level Up' }
];

let specificPassed = 0;
let specificFailed = 0;

for (const testCase of testCases) {
    const translated = getLocalizedString(client, testCase.key, { locale: testCase.locale });
    
    if (testCase.expected && translated === testCase.expected) {
        console.log(`  ✓ ${testCase.key} (${testCase.locale}): "${translated}"`);
        specificPassed++;
    } else if (testCase.shouldContain && translated.includes(testCase.shouldContain)) {
        console.log(`  ✓ ${testCase.key} (${testCase.locale}): contains "${testCase.shouldContain}"`);
        specificPassed++;
    } else if (testCase.expected) {
        console.log(`  ❌ ${testCase.key} (${testCase.locale}): expected "${testCase.expected}", got "${translated}"`);
        specificFailed++;
    } else {
        console.log(`  ❌ ${testCase.key} (${testCase.locale}): doesn't contain "${testCase.shouldContain}"`);
        specificFailed++;
    }
}
console.log(`  ✓ Passed: ${specificPassed}, Failed: ${specificFailed}\n`);

// Summary
const totalPassed = passed + helperPassed + specificPassed;
const totalFailed = failed + helperFailed + specificFailed;

console.log('='.repeat(60));
console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);

if (totalFailed === 0) {
    console.log('\n✅ All language support tests passed!');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
}
