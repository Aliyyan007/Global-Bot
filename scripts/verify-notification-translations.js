/**
 * Script to verify notification channel translations
 */

const fs = require('fs');
const path = require('path');
const { LANGUAGE_KEYS } = require('../modules/notification-channels/languageKeys');

// Read the lang.json
const langPath = path.join(__dirname, '..', 'config', 'lang.json');
const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

const REQUIRED_LANGUAGES = ['ru', 'en-US', 'uk', 'es-ES'];

console.log('Verifying notification channel translations...\n');

let allValid = true;
let checkedCount = 0;
let missingCount = 0;

// Check each language key
for (const [keyName, textId] of Object.entries(LANGUAGE_KEYS)) {
  checkedCount++;
  
  // Check if translation exists
  if (!langData.translations[textId]) {
    console.log(`❌ Missing translation for: ${keyName} (${textId})`);
    allValid = false;
    missingCount++;
    continue;
  }
  
  // Check if all required languages are present
  const translation = langData.translations[textId];
  const missingLangs = REQUIRED_LANGUAGES.filter(lang => !translation[lang]);
  
  if (missingLangs.length > 0) {
    console.log(`⚠️  ${keyName}: Missing languages: ${missingLangs.join(', ')}`);
    allValid = false;
    missingCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Checked ${checkedCount} language keys`);
console.log(`Missing or incomplete: ${missingCount}`);

if (allValid) {
  console.log('\n✅ All notification channel translations are complete!');
  process.exit(0);
} else {
  console.log('\n❌ Some translations are missing or incomplete');
  process.exit(1);
}
