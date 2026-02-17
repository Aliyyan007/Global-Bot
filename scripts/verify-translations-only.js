/**
 * Verify translations exist in lang.json (no dependencies)
 */

const fs = require('fs');
const path = require('path');

// Read files directly
const langPath = path.join(__dirname, '..', 'config', 'lang.json');
const keysPath = path.join(__dirname, '..', 'modules', 'notification-channels', 'languageKeys.js');

console.log('Verifying notification channel translations...\n');

// Load lang.json
const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

// Extract LANGUAGE_KEYS from the file (simple regex)
const keysContent = fs.readFileSync(keysPath, 'utf8');
const keyMatches = keysContent.match(/(\w+):\s*'([^']+)'/g);

if (!keyMatches) {
    console.log('❌ Could not parse language keys');
    process.exit(1);
}

const SUPPORTED_LOCALES = ['ru', 'en-US', 'uk', 'es-ES'];
let passed = 0;
let failed = 0;
const missing = [];

// Check each key
for (const match of keyMatches) {
    const [, keyName, textId] = match.match(/(\w+):\s*'([^']+)'/) || [];
    
    if (!keyName || !textId) continue;
    
    // Check if translation exists
    if (!langData.translations[textId]) {
        console.log(`❌ Missing translation for: ${keyName} (${textId})`);
        missing.push({ keyName, textId });
        failed++;
        continue;
    }
    
    // Check all locales
    const translation = langData.translations[textId];
    const missingLocales = SUPPORTED_LOCALES.filter(locale => !translation[locale]);
    
    if (missingLocales.length > 0) {
        console.log(`⚠️  ${keyName}: Missing locales: ${missingLocales.join(', ')}`);
        failed++;
    } else {
        passed++;
    }
}

console.log('\n' + '='.repeat(60));
console.log(`Checked ${passed + failed} language keys`);
console.log(`✓ Complete: ${passed}`);
console.log(`✗ Missing or incomplete: ${failed}`);

if (failed === 0) {
    console.log('\n✅ All notification channel translations are present and complete!');
    process.exit(0);
} else {
    console.log('\n❌ Some translations are missing or incomplete');
    if (missing.length > 0) {
        console.log('\nMissing translations:');
        missing.forEach(({ keyName, textId }) => {
            console.log(`  - ${keyName}: "${textId}"`);
        });
    }
    process.exit(1);
}
