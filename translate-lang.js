const fs = require('fs');
const axios = require('axios');

// Configuration
const config = {
  langFile: './config/lang.json',
  targetLanguages: ['en-US', 'uk', 'es-ES', 'ru'], // Languages for translation
  sourceLanguage: 'en-US', // Source language for texts (changed to English)
  batchSize: 10, // Number of requests at a time
  delayBetweenBatches: 1000 // Delay between batches (ms)
};

// Function to translate text
async function translateText(text, targetLang, sourceLang = config.sourceLanguage) {
  try {
    // Using free Google Translate API
    const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
      params: {
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        q: text
      }
    });

    // Extract translated text from response
    const translatedText = response.data[0][0][0];
    return translatedText;
  } catch (error) {
    console.error(`❌ Translation error "${text}" to ${targetLang}:`, error.message);
    return null;
  }
}

// Delay between requests
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Read lang.json
function readLangFile() {
  try {
    const data = fs.readFileSync(config.langFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading lang.json:', error.message);
    process.exit(1);
  }
}

// Find texts with empty translations
function findEmptyTranslations(langData) {
  const emptyTranslations = [];
  const translations = langData.translations || {};

  for (const [textId, translationsObj] of Object.entries(translations)) {
    for (const lang of config.targetLanguages) {
      // Find empty strings in translations
      if (translationsObj[lang] === "" || translationsObj[lang] === '""') {
        emptyTranslations.push({
          textId,
          lang,
          originalText: textId
        });
      }
    }
  }

  return emptyTranslations;
}

// Translate batch of texts
async function translateBatch(batch) {
  const results = [];

  for (const item of batch) {
    console.log(`🔤 Translating "${item.originalText.substring(0, 50)}..." to ${item.lang}`);
    
    const translated = await translateText(item.originalText, item.lang);
    
    if (translated) {
      results.push({
        ...item,
        translatedText: translated
      });
      console.log(`✅ Translated: "${translated.substring(0, 50)}..."`);
    } else {
      results.push({
        ...item,
        translatedText: "" // Leave empty string on error
      });
      console.log(`❌ Translation error, left empty`);
    }

    // Small delay between requests
    await sleep(200);
  }

  return results;
}

// Main translation function
async function translateAll() {
  console.log('🚀 STARTING TRANSLATION OF EMPTY STRINGS');
  console.log('========================================');

  // Read file
  const langData = readLangFile();
  const translations = langData.translations || {};

  // Find empty translations
  const emptyTranslations = findEmptyTranslations(langData);
  
  if (emptyTranslations.length === 0) {
    console.log('✅ No empty translations found!');
    return;
  }

  console.log(`📝 Found empty translations: ${emptyTranslations.length}`);

  // Split into batches to avoid rate limits
  const batches = [];
  for (let i = 0; i < emptyTranslations.length; i += config.batchSize) {
    batches.push(emptyTranslations.slice(i, i + config.batchSize));
  }

  let translatedCount = 0;
  let errorCount = 0;

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    console.log(`\n📦 Processing batch ${i + 1}/${batches.length}`);
    
    const batchResults = await translateBatch(batches[i]);
    
    // Update translations in data
    for (const result of batchResults) {
      if (result.translatedText && result.translatedText !== "") {
        if (!translations[result.textId]) {
          translations[result.textId] = {};
        }
        translations[result.textId][result.lang] = result.translatedText;
        translatedCount++;
      } else {
        errorCount++;
      }
    }

    // Delay between batches
    if (i < batches.length - 1) {
      console.log(`⏳ Delay ${config.delayBetweenBatches}ms...`);
      await sleep(config.delayBetweenBatches);
    }
  }

  // Save results
  langData.translations = translations;
  fs.writeFileSync(config.langFile, JSON.stringify(langData, null, 2), 'utf8');

  console.log('\n========================================');
  console.log(`✅ TRANSLATION COMPLETE!`);
  console.log(`📊 Successfully translated: ${translatedCount}`);
  console.log(`❌ Translation errors: ${errorCount}`);
  console.log(`💾 File saved: ${config.langFile}`);
}

// Function to translate empty strings for a specific language
async function translateSpecificLanguage(targetLang) {
  console.log(`🚀 TRANSLATING EMPTY STRINGS TO ${targetLang}`);
  console.log('========================================');

  const langData = readLangFile();
  const translations = langData.translations || {};

  const emptyTranslations = [];
  for (const [textId, translationsObj] of Object.entries(translations)) {
    if (translationsObj[targetLang] === "" || translationsObj[targetLang] === '""') {
      emptyTranslations.push({
        textId,
        lang: targetLang,
        originalText: textId
      });
    }
  }

  if (emptyTranslations.length === 0) {
    console.log(`✅ No empty translations for ${targetLang} found!`);
    return;
  }

  console.log(`📝 Found empty translations for ${targetLang}: ${emptyTranslations.length}`);

  const batches = [];
  for (let i = 0; i < emptyTranslations.length; i += config.batchSize) {
    batches.push(emptyTranslations.slice(i, i + config.batchSize));
  }

  let translatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batches.length; i++) {
    console.log(`\n📦 Batch ${i + 1}/${batches.length}`);
    
    const batchResults = await translateBatch(batches[i]);
    
    for (const result of batchResults) {
      if (result.translatedText && result.translatedText !== "") {
        if (!translations[result.textId]) {
          translations[result.textId] = {};
        }
        translations[result.textId][result.lang] = result.translatedText;
        translatedCount++;
      } else {
        errorCount++;
      }
    }

    if (i < batches.length - 1) {
      await sleep(config.delayBetweenBatches);
    }
  }

  langData.translations = translations;
  fs.writeFileSync(config.langFile, JSON.stringify(langData, null, 2), 'utf8');

  console.log('\n========================================');
  console.log(`✅ TRANSLATION TO ${targetLang} COMPLETE!`);
  console.log(`📊 Successfully translated: ${translatedCount}`);
  console.log(`❌ Translation errors: ${errorCount}`);
}

// Function to check status of empty translations
function showEmptyTranslationsStatus() {
  console.log('📊 EMPTY TRANSLATIONS STATUS');
  console.log('========================================');

  const langData = readLangFile();
  const translations = langData.translations || {};

  const stats = {
    totalTexts: Object.keys(translations).length,
    emptyTranslations: 0,
    byLanguage: {}
  };

  for (const lang of config.targetLanguages) {
    stats.byLanguage[lang] = {
      empty: 0,
      total: 0
    };
  }

  for (const [textId, langTranslations] of Object.entries(translations)) {
    for (const lang of config.targetLanguages) {
      stats.byLanguage[lang].total++;
      if (langTranslations[lang] === "" || langTranslations[lang] === '""') {
        stats.byLanguage[lang].empty++;
        stats.emptyTranslations++;
      }
    }
  }

  console.log(`📝 Total texts: ${stats.totalTexts}`);
  console.log(`❌ Empty translations: ${stats.emptyTranslations}`);
  console.log('\n🌐 Empty translations by language:');
  
  for (const [lang, data] of Object.entries(stats.byLanguage)) {
    const percentage = ((data.empty / data.total) * 100).toFixed(1);
    console.log(`   ${lang}: ${data.empty} empty out of ${data.total} (${percentage}%)`);
  }

  // Show examples of empty translations
  console.log('\n🔍 Examples of texts with empty translations:');
  let examplesShown = 0;
  for (const [textId, langTranslations] of Object.entries(translations)) {
    if (examplesShown >= 5) break;
    
    const emptyLangs = config.targetLanguages.filter(lang => 
      langTranslations[lang] === "" || langTranslations[lang] === '""'
    );
    
    if (emptyLangs.length > 0) {
      console.log(`   "${textId.substring(0, 50)}..." - empty in: ${emptyLangs.join(', ')}`);
      examplesShown++;
    }
  }

  console.log('========================================');
}

// Function to find all texts that are completely missing translations
function findMissingTranslations() {
  console.log('🔍 SEARCHING FOR COMPLETELY MISSING TRANSLATIONS');
  console.log('========================================');

  const langData = readLangFile();
  const translations = langData.translations || {};

  const completelyMissing = [];

  for (const [textId, langTranslations] of Object.entries(translations)) {
    const missingLangs = config.targetLanguages.filter(lang => 
      !langTranslations[lang] || 
      langTranslations[lang] === "" || 
      langTranslations[lang] === '""'
    );

    if (missingLangs.length === config.targetLanguages.length) {
      completelyMissing.push(textId);
    }
  }

  if (completelyMissing.length === 0) {
    console.log('✅ No completely missing translations found!');
    return;
  }

  console.log(`❌ Found texts without translations: ${completelyMissing.length}`);
  console.log('\n📋 List:');
  completelyMissing.forEach((textId, index) => {
    console.log(`   ${index + 1}. "${textId.substring(0, 60)}..."`);
  });
  console.log('========================================');
}

// Handle command line arguments
async function handleCommandLineArgs() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case '--all':
      case '-a':
        await translateAll();
        break;
      
      case '--lang':
      case '-l':
        const targetLang = args[1];
        if (!targetLang) {
          console.log('❌ Please specify a language for translation: --lang en-US');
          process.exit(1);
        }
        if (!config.targetLanguages.includes(targetLang)) {
          console.log(`❌ Unsupported language. Available: ${config.targetLanguages.join(', ')}`);
          process.exit(1);
        }
        await translateSpecificLanguage(targetLang);
        break;
      
      case '--status':
      case '-s':
        showEmptyTranslationsStatus();
        break;
      
      case '--missing':
      case '-m':
        findMissingTranslations();
        break;
      
      case '--help':
      case '-h':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  console.log(`
🎯 USAGE: node translate-lang.js [COMMAND]

Commands:
  --all, -a              - Translate all empty strings ("")
  --lang, -l [LANGUAGE]  - Translate empty strings to a specific language
  --status, -s           - Show status of empty translations
  --missing, -m          - Find completely missing translations
  --help, -h             - Show this help

Examples:
  node translate-lang.js --all
  node translate-lang.js --lang en-US
  node translate-lang.js --lang uk
  node translate-lang.js --status
  node translate-lang.js --missing

Supported languages:
  en-US - English
  uk    - Ukrainian
  es-ES - Spanish
  ru    - Russian
  `);
}

// Run
if (require.main === module) {
  if (process.argv.length <= 2) {
    showHelp();
  } else {
    handleCommandLineArgs();
  }
}

module.exports = {
  translateAll,
  translateSpecificLanguage,
  showEmptyTranslationsStatus,
  findMissingTranslations
};
