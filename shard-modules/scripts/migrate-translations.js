/**
 * Migration Tool: Convert Russian keys to English keys in lang.json
 * 
 * This script transforms the translation file from using Russian text as keys
 * to using English text as keys, while preserving all translations.
 * 
 * Usage: node scripts/migrate-translations.js
 */

const fs = require('fs');
const path = require('path');

const LANG_FILE_PATH = path.join(__dirname, '..', 'config', 'lang.json');
const BACKUP_FILE_PATH = path.join(__dirname, '..', 'config', 'lang.backup.json');

/**
 * Migrate translations from Russian keys to English keys
 * @param {Object} translations - Original translations object
 * @returns {Object} Migrated translations with English keys
 */
function migrateTranslations(translations) {
  const migrated = {};
  let migratedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const [russianKey, langValues] of Object.entries(translations)) {
    // Get the English translation to use as the new key
    const englishKey = langValues['en-US'];
    
    if (!englishKey) {
      // If no English translation exists, keep the original key
      // and log a warning
      errors.push(`No English translation for key: "${russianKey.substring(0, 50)}..."`);
      migrated[russianKey] = langValues;
      skippedCount++;
      continue;
    }

    // Check for duplicate keys
    if (migrated[englishKey]) {
      errors.push(`Duplicate English key found: "${englishKey.substring(0, 50)}..." (from "${russianKey.substring(0, 50)}...")`);
      // Merge translations, preferring existing values
      for (const [lang, value] of Object.entries(langValues)) {
        if (!migrated[englishKey][lang]) {
          migrated[englishKey][lang] = value;
        }
      }
      skippedCount++;
      continue;
    }

    // Create new entry with English key
    migrated[englishKey] = langValues;
    migratedCount++;
  }

  return {
    translations: migrated,
    stats: {
      total: Object.keys(translations).length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors
    }
  };
}

/**
 * Main migration function
 */
function main() {
  console.log('='.repeat(60));
  console.log('Translation Migration: Russian Keys → English Keys');
  console.log('='.repeat(60));
  console.log('');

  // Check if lang.json exists
  if (!fs.existsSync(LANG_FILE_PATH)) {
    console.error(`❌ Error: ${LANG_FILE_PATH} not found`);
    process.exit(1);
  }

  // Read the original file
  console.log('📖 Reading original lang.json...');
  const originalContent = fs.readFileSync(LANG_FILE_PATH, 'utf8');
  const originalData = JSON.parse(originalContent);

  if (!originalData.translations) {
    console.error('❌ Error: No "translations" object found in lang.json');
    process.exit(1);
  }

  // Create backup
  console.log('💾 Creating backup at lang.backup.json...');
  fs.writeFileSync(BACKUP_FILE_PATH, originalContent, 'utf8');

  // Perform migration
  console.log('🔄 Migrating translations...');
  const result = migrateTranslations(originalData.translations);

  // Write migrated file
  const migratedData = { translations: result.translations };
  const migratedContent = JSON.stringify(migratedData, null, 2);
  fs.writeFileSync(LANG_FILE_PATH, migratedContent, 'utf8');

  // Print results
  console.log('');
  console.log('📊 Migration Results:');
  console.log(`   Total entries: ${result.stats.total}`);
  console.log(`   Migrated: ${result.stats.migrated}`);
  console.log(`   Skipped: ${result.stats.skipped}`);
  
  if (result.stats.errors.length > 0) {
    console.log('');
    console.log('⚠️  Warnings:');
    result.stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('');
  console.log('✅ Migration complete!');
  console.log(`   Backup saved to: ${BACKUP_FILE_PATH}`);
  console.log(`   Updated file: ${LANG_FILE_PATH}`);
  console.log('='.repeat(60));
}

// Export for testing
module.exports = { migrateTranslations };

// Run if called directly
if (require.main === module) {
  main();
}
