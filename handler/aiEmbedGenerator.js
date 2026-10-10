// Lazy load dependencies to avoid startup errors if not installed
let Groq, axios;
try {
    Groq = require('groq-sdk');
    axios = require('axios');
} catch (error) {
    console.warn('[AI Embed Generator] Dependencies not installed. Run: npm install groq-sdk axios');
    console.warn('[AI Embed Generator] AI features will be disabled until dependencies are installed.');
}

// Groq model fallback chain — Groq deprecates models frequently, so we try
// several in order instead of hardcoding a single one. Set GROQ_MODEL to
// force a specific model (it is tried first, then the chain).
const GROQ_MODEL_CHAIN = [
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b"
];

function isModelNotFoundError(error) {
    const status = error?.status || error?.statusCode;
    const code = error?.code || error?.error?.code;
    const msg = String(error?.message || '');
    return status === 404 || code === 'model_not_found' || /does not exist|model_not_found|decommissioned/i.test(msg);
}

/**
 * Call Groq chat completions with automatic model fallback.
 * On a model-not-found / deprecated-model error the next model in
 * GROQ_MODEL_CHAIN is tried. Other errors are rethrown immediately.
 * @param {Object} groq - Groq client instance
 * @param {Object} params - chat.completions.create params (model is overwritten)
 * @returns {Promise<Object>} chat completion
 */
async function callGroq(groq, params) {
    const models = process.env.GROQ_MODEL
        ? [process.env.GROQ_MODEL, ...GROQ_MODEL_CHAIN.filter(m => m !== process.env.GROQ_MODEL)]
        : GROQ_MODEL_CHAIN;

    let lastError;
    for (const model of models) {
        try {
            return await groq.chat.completions.create({ ...params, model });
        } catch (error) {
            if (isModelNotFoundError(error)) {
                console.warn(`[AI Embed] Groq model "${model}" unavailable (${error.message?.slice(0, 80)}) — trying next model`);
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

// Store for AI generation conversation states (user_id -> state dict)
const aiGenerationStates = new Map();

// Store for AI regenerate cooldowns (user_id -> last_regenerate_time)
const aiRegenerateCooldowns = new Map();
const AI_REGENERATE_COOLDOWN_SECONDS = 60;

// Store for tracking if current embed was AI-generated (user_id -> bool)
const aiGeneratedEmbeds = new Map();

// Store the last AI generation description for regeneration (user_id -> description)
const aiLastGenerationInfo = new Map();

// Per-user recent template selections for anti-repetition (user_id -> Array<templateId>)
// Keeps the last 3 template IDs so we can diversify selection for the same user.
const aiTemplateHistory = new Map();
const TEMPLATE_HISTORY_SIZE = 3;

// Cleanup old template history entries every 30 minutes
setInterval(() => {
    if (aiTemplateHistory.size > 1000) {
        // Simple cleanup: clear half when it grows too large
        const entries = [...aiTemplateHistory.entries()];
        aiTemplateHistory.clear();
        for (const [k, v] of entries.slice(-500)) aiTemplateHistory.set(k, v);
    }
}, 30 * 60 * 1000);

/**
 * Record a template selection for a user to enable anti-repetition logic.
 * @param {string} userId - Discord user ID
 * @param {string} templateId - Selected template ID
 */
function recordTemplateSelection(userId, templateId) {
    if (!userId || !templateId) return;
    const history = aiTemplateHistory.get(userId) || [];
    history.push(templateId);
    if (history.length > TEMPLATE_HISTORY_SIZE) history.shift();
    aiTemplateHistory.set(userId, history);
}

/**
 * Calculate image quality score based on multiple factors
 * @param {Object} photo - Unsplash photo object
 * @param {string} query - Search query for relevance scoring
 * @param {Array} selectedImages - Already selected images for diversity check
 * @returns {number} Quality score (0-30)
 */
function calculateImageQualityScore(photo, query, selectedImages = []) {
    let score = 0;
    
    // 1. Alt text relevance (0-10 points)
    const alt = (photo.alt_description || '').toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/);
    const matchedWords = queryWords.filter(word => alt.includes(word)).length;
    score += Math.min(10, matchedWords * 3);
    
    // 2. Visual appeal indicators (0-10 points)
    // Likes indicate human preference
    const likes = photo.likes || 0;
    if (likes > 1000) score += 10;
    else if (likes > 500) score += 8;
    else if (likes > 100) score += 6;
    else if (likes > 50) score += 4;
    else if (likes > 10) score += 2;
    
    // 3. Diversity from selected images (0-10 points)
    if (selectedImages.length > 0) {
        const currentAlt = alt;
        let diversityScore = 10;
        
        for (const selected of selectedImages) {
            const selectedAlt = (selected.alt || '').toLowerCase();
            // Check for similar words in alt text
            const currentWords = new Set(currentAlt.split(/\s+/));
            const selectedWords = new Set(selectedAlt.split(/\s+/));
            const commonWords = [...currentWords].filter(w => selectedWords.has(w)).length;
            
            // Reduce diversity score if images are too similar
            if (commonWords > 3) diversityScore -= 5;
            if (selected.id === photo.id) diversityScore = 0; // Same image
        }
        
        score += Math.max(0, diversityScore);
    } else {
        score += 10; // First image gets full diversity points
    }
    
    return score;
}

/**
 * Search for images using Unsplash API with enhanced quality scoring
 * @param {string} query - Search query
 * @param {number} perPage - Number of results (default 20 for better selection)
 * @returns {Promise<{results: Array, error: string|null}>}
 */
async function searchUnsplashImages(query, perPage = 20) {
    if (!axios) {
        return { results: null, error: "Axios not installed. Run: npm install axios" };
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashKey || unsplashKey === 'your_unsplash_access_key_here') {
        return { results: null, error: "Unsplash API key not configured" };
    }

    try {
        const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: {
                query: enhanceUnsplashQuery(query),
                per_page: Math.min(perPage, 30), // Unsplash max is 30
                orientation: 'landscape',
                order_by: 'relevant' // Get most relevant results first
            },
            headers: {
                'Authorization': `Client-ID ${unsplashKey}`
            },
            timeout: 10000 // 10 second timeout
        });

        // Check for rate limiting
        if (response.status === 429) {
            console.error('[Unsplash] Rate limit exceeded (50 requests/hour)');
            return { results: null, error: "Unsplash API rate limit exceeded. Please try again later." };
        }

        if (response.data && response.data.results && response.data.results.length > 0) {
            const results = response.data.results.map(photo => {
                // Use Unsplash's image manipulation API for optimal Discord sizes
                // Thumbnail: 256x256 (square, cropped)
                // Banner: 1280x720 (16:9 aspect ratio, cropped)
                const baseUrl = photo.urls.raw;
                
                return {
                    id: photo.id,
                    // Banner image: 1280x720, auto-cropped to fit
                    url_large: `${baseUrl}&w=1280&h=720&fit=crop&crop=entropy`,
                    // Thumbnail: 256x256, auto-cropped to fit
                    url_medium: `${baseUrl}&w=256&h=256&fit=crop&crop=faces,entropy`,
                    // Small thumbnail for preview
                    url_thumbnail: `${baseUrl}&w=128&h=128&fit=crop&crop=faces,entropy`,
                    alt: photo.alt_description || '',
                    photographer: photo.user.name || 'Unknown',
                    likes: photo.likes || 0,
                    // Calculate quality score
                    qualityScore: calculateImageQualityScore(photo, query, [])
                };
            });
            
            // Sort by quality score (highest first)
            results.sort((a, b) => b.qualityScore - a.qualityScore);
            
            return { results, error: null };
        }

        return { results: null, error: "No images found" };
    } catch (error) {
        console.error('[Unsplash] Error:', error.message);
        
        // Handle specific error types
        if (error.response) {
            // Server responded with error status
            if (error.response.status === 429) {
                return { results: null, error: "Unsplash API rate limit exceeded (50/hour). Try again later." };
            } else if (error.response.status === 401) {
                return { results: null, error: "Invalid Unsplash API key. Check your UNSPLASH_ACCESS_KEY." };
            } else if (error.response.status === 403) {
                return { results: null, error: "Unsplash API access forbidden. Check your API key permissions." };
            }
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return { results: null, error: "Unsplash API timeout. Check your internet connection." };
        }
        
        return { results: null, error: `Error fetching images: ${error.message}` };
    }
}

/**
 * Get current season and time-based context
 * @returns {Object} Context with season, time, and trending keywords
 */
function getTemporalContext() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const hour = now.getHours(); // 0-23
    
    // Determine season (Northern Hemisphere)
    let season = 'spring';
    if (month >= 11 || month <= 1) season = 'winter';
    else if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    
    // Determine time of day
    let timeOfDay = 'day';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';
    
    // Season-specific aesthetic keywords
    const seasonalKeywords = {
        winter: 'cozy warm lights snow frost',
        spring: 'fresh vibrant blooming nature',
        summer: 'bright sunny colorful energetic',
        fall: 'warm autumn golden orange'
    };
    
    return {
        season,
        timeOfDay,
        seasonalKeywords: seasonalKeywords[season]
    };
}

/**
 * Enhance user query for better Unsplash image search results with trend awareness
 * @param {string} userQuery - User's search query
 * @returns {string} Enhanced query
 */
function enhanceUnsplashQuery(userQuery) {
    const query = userQuery.toLowerCase().trim();
    const context = getTemporalContext();
    
    // Simplified keyword mappings - less specific for better results
    const keywordMappings = {
        "gaming": "gaming setup",
        "game": "video game",
        "welcome": "greeting celebration",
        "announcement": "megaphone news",
        "music": "musical instruments",
        "party": "celebration confetti",
        "birthday": "birthday cake",
        "nature": "landscape mountains",
        "tech": "technology computer",
        "code": "programming laptop",
        "server": "community network",
        "rules": "document guidelines",
        "giveaway": "gift celebration",
        "event": "stage spotlight",
        "team": "teamwork collaboration",
        "community": "people together",
        "abstract": "colorful gradient",
        "space": "galaxy stars",
        "sports": "athletic competition",
        "food": "delicious cuisine",
        "travel": "adventure destination",
        "flower": "flowers bouquet",
        "flowers": "flowers garden",
        "aesthetic": "artistic beautiful",
        "art": "artistic creative",
        "design": "modern clean",
        "cyber": "cyberpunk neon",
        "retro": "vintage retro",
        "minimal": "minimalist clean",
        "dark": "dark moody",
        "light": "bright airy",
        "neon": "neon lights",
        "sunset": "sunset golden",
        "ocean": "ocean waves",
        "city": "city skyline",
        "forest": "forest trees"
    };
    
    // Find matching keyword enhancement
    let enhanced = null;
    for (const [keyword, enhancement] of Object.entries(keywordMappings)) {
        if (query.includes(keyword)) {
            enhanced = enhancement;
            break;
        }
    }
    
    // Build final query - keep it simple for better results
    let finalQuery = query;
    
    if (enhanced) {
        finalQuery = enhanced; // Use simplified enhancement instead of adding to original
    }
    
    // Don't add too many extra keywords - keep queries simple
    // Only add seasonal context for nature queries
    if (query.match(/nature|landscape|outdoor/)) {
        finalQuery += ` ${context.season}`;
    }
    
    return finalQuery;
}

/**
 * Use AI to generate contextual image search queries for thumbnail and banner
 * @param {string} description - Embed description
 * @param {string} imageDetails - Optional image details from user
 * @param {string} imageType - 'thumbnail' or 'banner' to generate distinct queries
 * @returns {Promise<string>} Search query
 */
async function generateContextualImageQuery(description, imageDetails = null, imageType = 'banner') {
    try {
        if (!Groq) {
            return imageDetails || description.substring(0, 100);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return imageDetails || description.substring(0, 100);
        }

        const groq = new Groq({ apiKey });
        const context = getTemporalContext();
        
        const userContext = imageDetails 
            ? `Embed topic: ${description}\nUser's image preference: ${imageDetails}`
            : description;

        const imageTypeGuidance = imageType === 'thumbnail'
            ? 'Generate search terms for a THUMBNAIL image (icon, symbol, or close-up representing the topic)'
            : 'Generate search terms for a BANNER image (wide, scenic, or atmospheric background representing the topic)';

        const systemPrompt = `You are an expert at generating image search queries for stock photos.
Your goal is to find the EXACT image that represents the user's request.

CURRENT CONTEXT:
- Season: ${context.season}
- Time: ${context.timeOfDay}
- Trending aesthetics: ${context.seasonalKeywords}

IMAGE TYPE: ${imageTypeGuidance}

CRITICAL RULES:
1. Return ONLY 2-5 simple, concrete search terms
2. For SPECIFIC items (cars, brands, products): use the EXACT name + category
3. For CONCEPTS: use visual representations
4. Be LITERAL - what should the photo actually show?
5. For thumbnails: focus on icons, symbols, close-ups, or representative objects
6. For banners: focus on wide shots, landscapes, atmospheric backgrounds
7. Consider current season and time for aesthetic choices
8. Prefer modern, clean, professional aesthetics

EXAMPLES (follow this format exactly):
THUMBNAIL:
- "Gaming server welcome" → "gaming controller close-up"
- "Music playlist" → "headphones studio equipment"
- "Rules announcement" → "document checklist icon"

BANNER:
- "Gaming server welcome" → "gaming setup rgb lights wide"
- "Music playlist" → "concert stage lights atmosphere"
- "Rules announcement" → "professional office workspace"

Return ONLY the search keywords. No quotes, no explanations.`;

        const chatCompletion = await callGroq(groq, {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Generate ${imageType} image search terms for: ${userContext.substring(0, 500)}` }
            ],
            temperature: 0.4,
            max_tokens: 50
        });

        let aiQuery = chatCompletion.choices[0].message.content.trim();
        aiQuery = aiQuery.replace(/['"]/g, '');

        if (aiQuery.length < 3 || aiQuery.length > 100) {
            return imageDetails || description.substring(0, 100);
        }

        console.log(`[AI Image Query] Generated ${imageType}: '${aiQuery}' from: '${description.substring(0, 50)}...'`);
        return aiQuery;
    } catch (error) {
        console.error('[AI Image Query] Error:', error.message);
        return imageDetails || description.substring(0, 100);
    }
}

/**
 * Analyze text sentiment and context for emoji selection
 * @param {string} text - Text to analyze
 * @returns {Object} Sentiment analysis result
 */
function analyzeSentiment(text) {
    const lower = text.toLowerCase();
    
    // Positive indicators
    const positiveWords = ['welcome', 'congratulations', 'celebrate', 'happy', 'excited', 'amazing', 'awesome', 'great', 'wonderful', 'fantastic', 'love', 'fun', 'party', 'win', 'success', 'achievement'];
    const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
    
    // Professional indicators
    const professionalWords = ['rules', 'guidelines', 'announcement', 'update', 'information', 'notice', 'policy', 'terms', 'documentation', 'guide'];
    const professionalCount = professionalWords.filter(word => lower.includes(word)).length;
    
    // Fun/casual indicators
    const funWords = ['game', 'gaming', 'play', 'meme', 'lol', 'fun', 'chill', 'hang', 'chat', 'social'];
    const funCount = funWords.filter(word => lower.includes(word)).length;
    
    // Determine primary sentiment
    let sentiment = 'neutral';
    if (positiveCount > 2) sentiment = 'positive';
    if (professionalCount > 1) sentiment = 'professional';
    if (funCount > 1) sentiment = 'fun';
    
    return { sentiment, positiveCount, professionalCount, funCount };
}

/**
 * Determine optimal placement for emoji based on name and sentiment
 * @param {string} emojiName - Emoji name
 * @param {string} sentiment - Sentiment type
 * @returns {string} Placement suggestion
 */
function determineEmojiPlacement(emojiName, sentiment) {
    // Heading emojis
    if (emojiName.match(/star|sparkle|fire|rocket|trophy|crown|gem/)) {
        return 'heading';
    }
    
    // Bullet point emojis
    if (emojiName.match(/arrow|point|check|bullet|dot|circle/)) {
        return 'bullet';
    }
    
    // Emphasis emojis
    if (emojiName.match(/important|warning|alert|exclamation|attention/)) {
        return 'emphasis';
    }
    
    // Closing emojis
    if (emojiName.match(/wave|hand|heart|smile|celebrate/)) {
        return 'closing';
    }
    
    return 'general';
}

/**
 * Get fallback Unicode emojis based on context
 * @param {string} description - Embed description
 * @param {string} sentiment - Sentiment type
 * @returns {Array} Array of Unicode emoji suggestions
 */
function getFallbackUnicodeEmojis(description, sentiment) {
    const lower = description.toLowerCase();
    const emojis = [];
    
    // Context-specific emojis
    const contextMap = {
        'gaming': ['🎮', '🕹️', '🎯', '🏆'],
        'welcome': ['👋', '🎉', '✨', '🌟'],
        'rules': ['📜', '📋', '✅', '⚖️'],
        'announcement': ['📢', '📣', '🔔', '⚡'],
        'music': ['🎵', '🎶', '🎧', '🎤'],
        'party': ['🎉', '🎊', '🥳', '🎈'],
        'tech': ['💻', '⚙️', '🔧', '🖥️'],
        'nature': ['🌿', '🌳', '🌺', '🌸'],
        'food': ['🍕', '🍔', '🍰', '🍜'],
        'sports': ['⚽', '🏀', '🏈', '🎾']
    };
    
    // Find matching context
    for (const [context, contextEmojis] of Object.entries(contextMap)) {
        if (lower.includes(context)) {
            emojis.push(...contextEmojis);
        }
    }
    
    // Sentiment-based emojis
    const sentimentEmojis = {
        positive: ['✨', '🌟', '💫', '⭐'],
        professional: ['📌', '📍', '🔹', '▪️'],
        fun: ['😄', '🎮', '🎨', '🎭'],
        neutral: ['➡️', '👉', '🔸', '•']
    };
    
    emojis.push(...(sentimentEmojis[sentiment] || sentimentEmojis.neutral));
    
    // Remove duplicates and limit
    return [...new Set(emojis)].slice(0, 10);
}

/**
 * Fetch custom emojis with intelligent context-aware selection
 * @param {Object} client - Discord client
 * @param {string} description - Embed description to find relevant emojis
 * @returns {Promise<Array>} Array of relevant emoji objects with placement suggestions
 */
async function fetchRelevantCustomEmojis(client, description) {
    try {
        if (!client || !client.guilds) {
            return [];
        }

        const allEmojis = [];
        const descLower = description.toLowerCase();
        const sentiment = analyzeSentiment(description);
        
        // Collect all custom emojis from all guilds
        for (const guild of client.guilds.cache.values()) {
            for (const emoji of guild.emojis.cache.values()) {
                if (emoji.available) {
                    allEmojis.push({
                        name: emoji.name.toLowerCase(),
                        id: emoji.id,
                        animated: emoji.animated,
                        format: emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`
                    });
                }
            }
        }

        // Enhanced keyword matching with context awareness
        const relevantEmojis = [];
        const keywords = descLower.split(/\s+/).filter(word => word.length > 2);
        
        // Sentiment-based emoji categories
        const sentimentEmojis = {
            positive: ['celebrate', 'party', 'happy', 'star', 'sparkle', 'heart', 'fire', 'tada', 'confetti'],
            professional: ['check', 'info', 'document', 'clipboard', 'pencil', 'book', 'shield', 'lock'],
            fun: ['game', 'controller', 'dice', 'music', 'headphone', 'smile', 'laugh', 'cool'],
            neutral: ['arrow', 'point', 'hand', 'eye', 'bell', 'clock', 'calendar']
        };
        
        const preferredEmojis = sentimentEmojis[sentiment.sentiment] || sentimentEmojis.neutral;
        
        for (const emoji of allEmojis) {
            let relevanceScore = 0;
            
            // Direct keyword match (high priority)
            if (keywords.some(keyword => emoji.name.includes(keyword) || keyword.includes(emoji.name))) {
                relevanceScore += 10;
            }
            
            // Sentiment match (medium priority)
            if (preferredEmojis.some(pref => emoji.name.includes(pref))) {
                relevanceScore += 5;
            }
            
            // Partial match (low priority)
            const emojiWords = emoji.name.split(/[_-]/);
            if (emojiWords.some(ew => keywords.includes(ew))) {
                relevanceScore += 3;
            }
            
            if (relevanceScore > 0) {
                relevantEmojis.push({
                    ...emoji,
                    relevanceScore,
                    placement: determineEmojiPlacement(emoji.name, sentiment.sentiment)
                });
            }
        }

        // Sort by relevance score and limit to top 30 for better selection
        relevantEmojis.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return relevantEmojis.slice(0, 30);
    } catch (error) {
        console.error('[Custom Emojis] Error fetching:', error.message);
        return [];
    }
}

/**
 * Refine an AI-generated embed with a second pass for better quality
 * @param {Object} embedObj - Initial embed object
 * @param {string} description - Original user description
 * @param {string} imageChoice - Image choice
 * @returns {Promise<{embed: Object, error: string|null}>}
 */
async function refineAIEmbed(embedObj, description, imageChoice) {
    try {
        if (!Groq) {
            return { embed: embedObj, error: null }; // Return original if Groq not available
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return { embed: embedObj, error: null }; // Return original if no API key
        }

        const groq = new Groq({ apiKey });
        
        // Analyze the initial embed
        const currentLength = embedObj.description?.length || 0;
        const hasImages = !!(embedObj.thumbnail || embedObj.image);
        
        const refinementPrompt = `You are refining a Discord embed to make it more professional and attractive.

ORIGINAL USER REQUEST: ${description}

CURRENT EMBED JSON:
${JSON.stringify(embedObj, null, 2)}

CURRENT ISSUES TO FIX:
${currentLength < 500 ? `- Description is too short (${currentLength} chars). ADD more engaging content to reach 500-900 chars.` : ''}
${currentLength > 900 ? `- Description is too long (${currentLength} chars). TRIM to 500-900 chars while keeping key info.` : ''}
${!hasImages && imageChoice !== 'none' ? `- Missing images. Keep the existing structure but ensure images are present.` : ''}

REFINEMENT GOALS:
1. Ensure description is between 500-900 characters
2. Make the content more engaging and professional
3. Improve markdown formatting and emoji placement
4. Keep the same general topic and structure
5. Preserve any existing images

CRITICAL: Return ONLY the refined JSON object. Start with { and end with }.`;

        const chatCompletion = await callGroq(groq, {
            messages: [
                { role: "system", content: "You are a JSON refinement expert. Return ONLY valid JSON." },
                { role: "user", content: refinementPrompt }
            ],
            temperature: 0.6, // Lower temperature for refinement
            max_tokens: 3000
        });

        let aiResponse = chatCompletion.choices[0].message.content.trim();
        
        // Clean up response
        if (aiResponse.startsWith("```json")) aiResponse = aiResponse.substring(7);
        if (aiResponse.startsWith("```")) aiResponse = aiResponse.substring(3);
        if (aiResponse.endsWith("```")) aiResponse = aiResponse.substring(0, aiResponse.length - 3);
        aiResponse = aiResponse.trim();
        
        // Parse refined JSON
        let refinedObj;
        try {
            refinedObj = JSON.parse(aiResponse);
            console.log('[AI Embed] ✓ Refinement pass successful');
            
            // Validate refinement improved things
            const refinedLength = refinedObj.description?.length || 0;
            if (refinedLength >= 500 && refinedLength <= 900) {
                console.log(`[AI Embed] ✓ Refinement achieved target length: ${refinedLength} chars`);
                return { embed: refinedObj, error: null };
            } else {
                console.log(`[AI Embed] ⚠️ Refinement length still off: ${refinedLength} chars. Using original with padding.`);
                return { embed: embedObj, error: null }; // Return original if refinement didn't help
            }
        } catch (parseError) {
            console.error('[AI Embed] ❌ Refinement parse error:', parseError.message);
            return { embed: embedObj, error: null }; // Return original on error
        }
    } catch (error) {
        console.error('[AI Embed Refinement] Error:', error.message);
        return { embed: embedObj, error: null }; // Return original on error
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10 PROFESSIONAL EMBED TEMPLATES — AI selects the best match per user demand
// Each template uses advanced Discord markdown: # titles, ## sections, ```yaml
// code blocks, > blockquotes, ---, **bold**, *italic*, bullet points, etc.
// ═══════════════════════════════════════════════════════════════════════════════

const EMBED_TEMPLATES = [
    // ─────────────────── TEMPLATE 1: GRAND ANNOUNCEMENT ───────────────────
    {
        id: "grand_announcement",
        name: "Grand Announcement",
        primaryKeyword: "announcement",
        // Removed "new" and "update" — too broad, caused false positives for everything
        keywords: ["announce", "announcement", "news", "release", "launch", "introducing", "reveal", "unveil", "declaration"],
        sentiment: ["positive", "professional"],
        color: 5763719, // Blurple
        structure: `# [EMOJI] [TITLE]

[OPENING — 1-2 bold sentences building excitement]

\`\`\`yaml
📋 Highlights
─────────────────────
\`\`\`
[EMOJI] **[Point 1]** — [detail]
[EMOJI] **[Point 2]** — [detail]
[EMOJI] **[Point 3]** — [detail]

---

> [EMOJI] *[Quote or key message in italics]*

## [EMOJI] What's Next
[Short paragraph with **bold** keywords and a \`/command\` reference]

*[Closing line with emotion]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 2: WELCOME / ONBOARDING ───────────────────
    {
        id: "welcome_onboard",
        name: "Welcome & Onboarding",
        primaryKeyword: "welcome",
        keywords: ["welcome", "join", "hello", "intro", "introduction", "onboard", "new member", "getting started", "greet"],
        sentiment: ["positive", "fun"],
        color: 3066993, // Green
        structure: `# [EMOJI] [TITLE]

*[Warm italicized welcome line]*

**[Bold hook sentence about the community]**

---

## [EMOJI] Quick Start
\`\`\`yaml
Step 1 ➜ [Action]
Step 2 ➜ [Action]
Step 3 ➜ [Action]
\`\`\`

## [EMOJI] What You'll Find
[EMOJI] **[Feature 1]** — [brief detail]
[EMOJI] **[Feature 2]** — [brief detail]
[EMOJI] **[Feature 3]** — [brief detail]

> [EMOJI] **Pro Tip:** [Helpful tip with \`/command\`]

*[Warm closing — make them feel at home]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 3: RULES / GUIDELINES ───────────────────
    {
        id: "rules_guidelines",
        name: "Rules & Guidelines",
        primaryKeyword: "rules",
        keywords: ["rules", "rule", "guidelines", "policy", "terms", "conduct", "moderation", "behavior", "regulation", "tos"],
        sentiment: ["professional"],
        color: 15105570, // Orange
        structure: `# [EMOJI] [TITLE]

**[Authority opening sentence about community standards]**

\`\`\`yaml
Server Standards
═══════════════════════
\`\`\`

[EMOJI] **Rule 1** — [Clear explanation]
[EMOJI] **Rule 2** — [Clear explanation]
[EMOJI] **Rule 3** — [Clear explanation]
[EMOJI] **Rule 4** — [Clear explanation]

---

> ⚠️ **Notice:** *[Consequence or important note]*

## [EMOJI] Need Help?
Use \`/support\` or contact the **mod team** for any questions.

*[Respectful closing line]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 4: GIVEAWAY / EVENT ───────────────────
    {
        id: "giveaway_event",
        name: "Giveaway & Event",
        primaryKeyword: "giveaway",
        keywords: ["giveaway", "event", "prize", "win", "raffle", "contest", "reward", "drop", "lottery", "celebration"],
        sentiment: ["positive", "fun"],
        color: 15844367, // Gold
        structure: `# [EMOJI] [TITLE]

**[Exciting opening line about the prize/event]**
*[Secondary line building anticipation]*

---

## [EMOJI] How to Enter
\`\`\`yaml
Requirements
─────────────────────
\`\`\`
[EMOJI] [Requirement 1]
[EMOJI] [Requirement 2]
[EMOJI] [Requirement 3]

## [EMOJI] Prize Details
**[Prize description with bold emphasis]**

> [EMOJI] **Ends:** *[Timeframe or condition]*

*[Hype closing line — good luck!]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 5: INFO / TUTORIAL / GUIDE ───────────────────
    {
        id: "info_tutorial",
        name: "Info & Tutorial",
        primaryKeyword: "tutorial",
        keywords: ["guide", "tutorial", "how to", "howto", "learn", "info", "information", "faq", "help", "explain", "documentation", "wiki"],
        sentiment: ["professional", "neutral"],
        color: 3447003, // Blue
        structure: `# [EMOJI] [TITLE]

*[Brief intro explaining what this guide covers]*

---

## [EMOJI] Step-by-Step
\`\`\`yaml
Instructions
═══════════════════════
\`\`\`
**1.** [EMOJI] [Step with **bold** key action]
**2.** [EMOJI] [Step with **bold** key action]
**3.** [EMOJI] [Step with **bold** key action]

## [EMOJI] Important Notes
> 💡 **Tip:** *[Useful tip with \`/command\` if applicable]*

[EMOJI] [Additional detail or resource link]
[EMOJI] [Additional detail or resource link]

*[Encouraging closing line]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 6: ROLE / RANK INFO ───────────────────
    {
        id: "role_rank_info",
        name: "Role & Rank Info",
        primaryKeyword: "rank",
        keywords: ["role", "rank", "level", "xp", "tier", "perk", "perks", "vip", "premium", "boost", "status", "privilege"],
        sentiment: ["professional", "positive"],
        color: 10181046, // Purple
        structure: `# [EMOJI] [TITLE]

**[Opening about the role/rank system]**

\`\`\`yaml
[Category Name]
─────────────────────
[Tier 1]  ➜  [Perk]
[Tier 2]  ➜  [Perk]
[Tier 3]  ➜  [Perk]
\`\`\`

---

## [EMOJI] How to Rank Up
[EMOJI] **[Method 1]** — [brief explanation]
[EMOJI] **[Method 2]** — [brief explanation]
[EMOJI] **[Method 3]** — [brief explanation]

> [EMOJI] **Current Progress:** Use \`/rank\` to check your level

*[Motivational closing line]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 7: SHOWCASE / PORTFOLIO / PRODUCT ───────────────────
    {
        id: "showcase_product",
        name: "Showcase & Product",
        primaryKeyword: "showcase",
        keywords: ["showcase", "portfolio", "product", "feature", "highlight", "display", "preview", "demo", "review", "store", "shop", "buy"],
        sentiment: ["positive", "professional"],
        color: 15277667, // Rose Pink
        structure: `# [EMOJI] [TITLE]

> *[Elegant tagline or one-liner in italics]*

**[Bold description of the product/showcase — 2 sentences]**

---

## [EMOJI] Key Features
\`\`\`yaml
Highlights
═══════════════════════
\`\`\`
[EMOJI] **[Feature 1]** — [Value proposition]
[EMOJI] **[Feature 2]** — [Value proposition]
[EMOJI] **[Feature 3]** — [Value proposition]

## [EMOJI] Details
**[Pricing / Availability / Specs]** — *[supporting detail]*

> [EMOJI] *[Call to action or where to get more info]*

*[Closing with brand feel]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 8: POLL / FEEDBACK / DISCUSSION ───────────────────
    {
        id: "poll_feedback",
        name: "Poll & Feedback",
        primaryKeyword: "poll",
        keywords: ["poll", "vote", "feedback", "opinion", "suggest", "suggestion", "survey", "question", "discuss", "discussion", "debate", "choose"],
        sentiment: ["fun", "neutral"],
        color: 1752220, // Teal
        structure: `# [EMOJI] [TITLE]

**[Opening question or context for the poll]**

*[Why this matters — short italicized line]*

---

## [EMOJI] Options
\`\`\`yaml
Cast Your Vote
─────────────────────
\`\`\`
[EMOJI] **Option A** — [Description]
[EMOJI] **Option B** — [Description]
[EMOJI] **Option C** — [Description]

> [EMOJI] **How to vote:** *React below or use \`/poll\`*

## [EMOJI] Why It Matters
[Short paragraph about impact with **bold** emphasis]

*[Encouraging line to participate]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 9: STATUS / CHANGELOG / PATCH ───────────────────
    {
        id: "status_changelog",
        name: "Status & Changelog",
        primaryKeyword: "changelog",
        keywords: ["status", "changelog", "patch", "fix", "bug", "version", "v1", "v2", "maintenance", "downtime", "outage", "resolved", "hotfix", "deploy"],
        sentiment: ["professional", "neutral"],
        color: 9807270, // Gray
        structure: `# [EMOJI] [TITLE]

\`\`\`yaml
Version  : [Version or Date]
Status   : [Current Status]
Priority : [Level]
\`\`\`

---

## [EMOJI] Changes
[EMOJI] **[Added/Fixed/Changed]** — [Detail]
[EMOJI] **[Added/Fixed/Changed]** — [Detail]
[EMOJI] **[Added/Fixed/Changed]** — [Detail]

## [EMOJI] Known Issues
> ⚠️ *[Any ongoing issue or "none at this time"]*

**Next Update:** *[Timeframe or roadmap note]*

*[Professional sign-off]* [EMOJI]`
    },

    // ─────────────────── TEMPLATE 10: AESTHETIC / CREATIVE / CUSTOM ───────────────────
    {
        id: "aesthetic_creative",
        name: "Aesthetic & Creative",
        primaryKeyword: "aesthetic",
        keywords: ["aesthetic", "creative", "art", "design", "music", "anime", "vibe", "mood", "theme", "custom", "personal", "profile", "bio", "about", "story", "lore"],
        sentiment: ["fun", "positive"],
        color: 16711935, // Magenta/Fuchsia
        structure: `# [EMOJI] [TITLE]

> *[Atmospheric or poetic opening line]*

**[Bold creative statement — sets the tone]**

\`\`\`yaml
✦ [Aesthetic Detail 1]
✦ [Aesthetic Detail 2]
✦ [Aesthetic Detail 3]
\`\`\`

---

## [EMOJI] [Creative Section Title]
[EMOJI] [Expressive point with **bold** and *italic*]
[EMOJI] [Expressive point with **bold** and *italic*]
[EMOJI] [Expressive point with **bold** and *italic*]

> [EMOJI] *[Inspirational or mood-setting quote]*

*[Dreamy or artistic closing line]* [EMOJI]`
    }
];

/**
 * Use AI to classify the user's embed request into ONE canonical keyword,
 * then map that keyword to the matching template.
 *
 * Features:
 *  - Quick-match fast path for explicit keyword hits (skips AI call)
 *  - Shuffled keyword order in AI prompt to avoid positional bias
 *  - Higher temperature (0.4) for more variety across similar requests
 *  - Per-user anti-repetition: if the AI picks a recently-used template for
 *    the same user AND the quick-match didn't fire, swap to the second-best
 *    unused template
 *
 * @param {string} description - User's embed description/demand
 * @param {string|null} userId - Discord user ID for anti-repetition tracking
 * @returns {Promise<Object>} Selected template object
 */
async function selectBestTemplate(description, userId = null) {
    try {
        // ── STEP 0: Fast path — if user's request contains an obvious keyword,
        //    use it directly and skip the AI call. This is the highest-confidence
        //    signal and should NOT be overridden by anti-repetition.
        const quickMatch = quickMatchTemplate(description);
        if (quickMatch) {
            console.log(`[AI Embed] ⚡ Quick-matched keyword "${quickMatch.template.primaryKeyword}" → ${quickMatch.template.name} (score: ${quickMatch.score}, matched: ${quickMatch.matched.join(', ')})`);
            return quickMatch.template;
        }

        if (!Groq) {
            return selectTemplateFallback(description);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return selectTemplateFallback(description);
        }

        const groq = new Groq({ apiKey });

        // Build the canonical keyword vocabulary from the templates
        const keywordMap = new Map();
        for (const t of EMBED_TEMPLATES) {
            keywordMap.set(t.primaryKeyword.toLowerCase(), t);
        }
        const validKeywords = [...keywordMap.keys()];

        // Shuffle the template list when building the prompt to eliminate
        // positional bias (otherwise the model tends to pick the first option
        // when uncertain, creating repetitive results).
        const shuffledTemplates = [...EMBED_TEMPLATES].sort(() => Math.random() - 0.5);
        const keywordGuide = shuffledTemplates.map(t =>
            `- **${t.primaryKeyword}** → ${t.name}: use for ${t.keywords.slice(0, 6).join(', ')}`
        ).join('\n');
        const shuffledKeywordList = shuffledTemplates.map(t => t.primaryKeyword).join(', ');

        // Build anti-repetition hint if user has recent history
        const recentHistory = userId ? (aiTemplateHistory.get(userId) || []) : [];
        let repetitionHint = '';
        if (recentHistory.length >= 2) {
            // If the last 2+ selections were all the same template, explicitly discourage it
            const last = recentHistory[recentHistory.length - 1];
            const allSame = recentHistory.every(id => id === last);
            if (allSame) {
                const lastTemplate = EMBED_TEMPLATES.find(t => t.id === last);
                if (lastTemplate) {
                    repetitionHint = `\n\n⚠️ IMPORTANT: The user has received "${lastTemplate.primaryKeyword}" templates repeatedly. If the request genuinely fits a DIFFERENT keyword, prefer that one. Only pick "${lastTemplate.primaryKeyword}" again if it's the CLEAR and ONLY correct choice.`;
                }
            }
        }

        const chatCompletion = await callGroq(groq, {
            messages: [
                {
                    role: "system",
                    content: `You are a semantic classifier for Discord embed requests.

Your job: analyze the user's request and assign EXACTLY ONE keyword from the list below that best matches their intent.

═══════════════════════════════════════════════════════════════════
AVAILABLE KEYWORDS (pick ONE and ONLY ONE):
═══════════════════════════════════════════════════════════════════
${keywordGuide}

═══════════════════════════════════════════════════════════════════
CLASSIFICATION RULES:
═══════════════════════════════════════════════════════════════════
1. Read the user's request carefully and identify the PRIMARY intent
2. Match intent to the CLOSEST keyword from the list above
3. Examples:
   - "Nitro giveaway" → giveaway
   - "Server rules" → rules
   - "Bot version released with new features" → announcement
   - "Welcome new members" → welcome
   - "How to use our bot" → tutorial
   - "VIP role perks" → rank
   - "Sale on my product" → showcase
   - "What's your favorite color?" → poll
   - "Bug fix patch notes" → changelog
   - "Anime edit vibes" → aesthetic
   - "Cool embed for my clan" → aesthetic (creative/custom)
   - "Info about our server" → tutorial (informational)
   - "Member milestone" → announcement${repetitionHint}

⚠️ OUTPUT FORMAT: Return ONLY the keyword in lowercase, nothing else.
⚠️ VALID KEYWORDS: ${shuffledKeywordList}
⚠️ DO NOT invent new keywords. DO NOT add punctuation, quotes, or explanation.`
                },
                { role: "user", content: `Classify this embed request: "${description}"` }
            ],
            // Temperature 0.4 — balances consistency with variety. Too low (0.1)
            // causes repetitive picks; too high (>0.6) hurts accuracy.
            temperature: 0.4,
            max_tokens: 10
        });

        // Normalize AI output: lowercase, strip punctuation/quotes/whitespace
        let keyword = chatCompletion.choices[0].message.content
            .trim()
            .toLowerCase()
            .replace(/["'`.,!?]/g, '')
            .split(/\s+/)[0];

        let selectedTemplate = null;
        let selectionSource = '';

        // Direct match
        if (keywordMap.has(keyword)) {
            selectedTemplate = keywordMap.get(keyword);
            selectionSource = 'direct';
        } else {
            // Fuzzy fallback: AI may have returned a synonym — check all template keyword lists
            for (const template of EMBED_TEMPLATES) {
                if (template.keywords.includes(keyword)) {
                    selectedTemplate = template;
                    selectionSource = 'synonym';
                    break;
                }
            }
        }

        if (!selectedTemplate) {
            console.log(`[AI Embed] ⚠️ AI returned unknown keyword "${keyword}" — using keyword fallback`);
            return selectTemplateFallback(description);
        }

        // ── ANTI-REPETITION: if this template has been used in the last 2+
        //    selections for the same user, swap to a fresh alternative. This
        //    only applies to AI-picked templates (quick-match bypasses this).
        if (userId && recentHistory.length >= 2) {
            const last = recentHistory[recentHistory.length - 1];
            const allSame = recentHistory.every(id => id === last);
            if (allSame && selectedTemplate.id === last) {
                // Pick a different template — weight by sentiment compatibility
                const sentiment = analyzeSentiment(description);
                const alternatives = EMBED_TEMPLATES
                    .filter(t => t.id !== last)
                    .map(t => ({
                        template: t,
                        // Small bonus for matching sentiment so the swap still feels relevant
                        score: t.sentiment.includes(sentiment.sentiment) ? 2 : 1
                    }));
                
                // Weighted random pick
                const totalWeight = alternatives.reduce((s, a) => s + a.score, 0);
                let roll = Math.random() * totalWeight;
                let chosen = alternatives[0].template;
                for (const alt of alternatives) {
                    roll -= alt.score;
                    if (roll <= 0) { chosen = alt.template; break; }
                }
                
                console.log(`[AI Embed] 🔀 Anti-repetition: AI picked "${keyword}" (${selectedTemplate.name}) again — swapping to ${chosen.name} for variety`);
                return chosen;
            }
        }

        console.log(`[AI Embed] 🎯 AI assigned keyword: "${keyword}"${selectionSource === 'synonym' ? ' (synonym)' : ''} → ${selectedTemplate.name}`);
        return selectedTemplate;
    } catch (error) {
        console.error('[AI Embed] Template selection error:', error.message);
        return selectTemplateFallback(description);
    }
}

/**
 * Fallback template selection using keyword matching when AI is unavailable.
 * If no keywords match at all, returns a RANDOM template rather than always
 * defaulting to index 0 (which caused every vague request to become an
 * announcement embed).
 *
 * @param {string} description - User's embed description
 * @returns {Object} Best matching template, or random template for ambiguous input
 */
function selectTemplateFallback(description) {
    const lower = description.toLowerCase();
    let bestTemplate = null;
    let bestScore = 0;

    for (const template of EMBED_TEMPLATES) {
        let score = 0;
        for (const keyword of template.keywords) {
            if (lower.includes(keyword)) {
                score += keyword.length; // Longer keyword matches = higher relevance
            }
        }
        
        // Sentiment bonus
        const sentiment = analyzeSentiment(description);
        if (template.sentiment.includes(sentiment.sentiment)) {
            score += 3;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestTemplate = template;
        }
    }

    // No keywords matched at all — pick a random template instead of always
    // defaulting to the first one in the list. This prevents every vague
    // request from producing the same embed format.
    if (!bestTemplate || bestScore === 0) {
        bestTemplate = EMBED_TEMPLATES[Math.floor(Math.random() * EMBED_TEMPLATES.length)];
        console.log(`[AI Embed] 🎲 Fallback: no keyword match → random template: ${bestTemplate.name}`);
        return bestTemplate;
    }

    console.log(`[AI Embed] 📋 Fallback selected template: ${bestTemplate.name} (score: ${bestScore})`);
    return bestTemplate;
}

/**
 * Inject custom emojis into the embed description post-generation
 * Replaces [EMOJI] placeholders and adds emojis to headings/bullets that lack them
 * @param {string} description - Embed description text
 * @param {Array} customEmojis - Available custom emojis
 * @param {Array} fallbackEmojis - Unicode fallback emojis
 * @returns {string} Description with emojis injected
 */
function injectEmojisPostGeneration(description, customEmojis, fallbackEmojis) {
    if (!description) return description;
    
    const customEmojiPattern = /<a?:\w+:\d+>/g;
    const existingCustom = description.match(customEmojiPattern) || [];
    
    // If AI already used 3+ custom emojis, don't over-inject
    if (existingCustom.length >= 3) return description;
    
    // Build emoji pool: prefer custom, fall back to unicode
    const emojiPool = [];
    if (customEmojis.length > 0) {
        // Shuffle for variety, take top relevant ones
        const shuffled = [...customEmojis].sort(() => Math.random() - 0.3);
        for (const e of shuffled.slice(0, 8)) {
            emojiPool.push(e.format);
        }
    }
    if (emojiPool.length < 5 && fallbackEmojis.length > 0) {
        for (const e of fallbackEmojis) {
            if (emojiPool.length < 8) emojiPool.push(e);
        }
    }
    
    if (emojiPool.length === 0) return description;
    
    let emojiIndex = 0;
    const getNextEmoji = () => {
        const emoji = emojiPool[emojiIndex % emojiPool.length];
        emojiIndex++;
        return emoji;
    };
    
    // Inject into lines that are headings (# or ##) without any emoji
    const lines = description.split('\n');
    let injected = 0;
    const maxInject = 5;
    
    for (let i = 0; i < lines.length && injected < maxInject; i++) {
        const line = lines[i].trim();
        
        // Skip if line already has a custom emoji or common unicode emoji
        if (customEmojiPattern.test(line) || /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line)) continue;
        
        // Heading lines: # Title or ## Section
        if (/^#{1,2}\s/.test(line)) {
            lines[i] = lines[i].replace(/^(#{1,2}\s)/, `$1${getNextEmoji()} `);
            injected++;
        }
        // Bullet lines without emojis
        else if (/^[•\-\*]\s/.test(line) && injected < maxInject - 1) {
            lines[i] = lines[i].replace(/^([•\-\*])\s/, `${getNextEmoji()} `);
            injected++;
        }
    }
    
    return lines.join('\n');
}

/**
 * Sanitize markdown in a description to prevent broken rendering.
 * Fixes common issues after trimming or AI output errors:
 *  - Unclosed ```code``` blocks (odd count of fences)
 *  - Unbalanced **bold** or *italic* markers at the end
 *  - Orphan --- dividers at start/end
 *  - Leftover [EMOJI] / [TITLE] / [Point] placeholders
 *  - Trailing whitespace
 * @param {string} description - Description text
 * @returns {string} Sanitized description
 */
function sanitizeMarkdown(description) {
    if (!description || typeof description !== 'string') return description;
    
    let out = description;
    
    // 1. Remove leftover placeholders like [EMOJI], [TITLE], [Point 1], [detail]
    //    These happen when AI forgets to fill them in.
    out = out.replace(/\[(?:EMOJI|TITLE|OPENING|Tip|Notice|Point \d+|Feature \d+|Step \d+|Rule \d+|Option [A-Z]|Tier \d+|Version or Date|Current Status|Level|Category Name|Added\/Fixed\/Changed|Requirement \d+|Action|Method \d+|Aesthetic Detail \d+|Creative Section Title|Expressive point[^\]]*|brief detail|brief explanation|detail|Detail|Value proposition|Description|Perk|Timeframe or condition|Closing line with emotion|Warm closing[^\]]*|Respectful closing line|Hype closing line[^\]]*|Encouraging closing line|Motivational closing line|Closing with brand feel|Encouraging line to participate|Professional sign-off|Dreamy or artistic closing line|Warm italicized welcome line|Bold hook sentence[^\]]*|Authority opening sentence[^\]]*|Exciting opening line[^\]]*|Secondary line building anticipation|Brief intro[^\]]*|Opening about[^\]]*|Elegant tagline[^\]]*|Bold description[^\]]*|Opening question[^\]]*|Why this matters[^\]]*|Atmospheric or poetic opening line|Bold creative statement[^\]]*|Prize description[^\]]*|Pricing \/ Availability \/ Specs|supporting detail|Call to action[^\]]*|Inspirational or mood-setting quote|Any ongoing issue[^\]]*|Timeframe or roadmap note|Helpful tip[^\]]*|Useful tip[^\]]*|Consequence or important note|Quote or key message in italics|Additional detail or resource link|Short paragraph[^\]]*|Step with[^\]]*|Clear explanation)\]/gi, '').trim();
    
    // Also strip bare bracket placeholders that remained
    out = out.replace(/\[[A-Z][A-Za-z0-9 _\-\/]{2,40}\]/g, '').trim();
    
    // 2. Balance ```code``` fences — if odd count, append a closing fence
    const fenceCount = (out.match(/```/g) || []).length;
    if (fenceCount % 2 === 1) {
        out = out.trimEnd() + '\n```';
    }
    
    // 3. Strip unbalanced trailing ** or * (if an opener was left hanging)
    //    We only check the tail to avoid mangling legitimate inline markup.
    const tail = out.slice(-30);
    if (/\*\*[^*]{0,25}$/.test(tail) && !/\*\*[^*]+\*\*\s*$/.test(tail)) {
        // trailing unmatched ** — remove the dangling opener near the end
        out = out.replace(/\*\*([^*\n]{0,25})$/, '$1').trimEnd();
    }
    
    // 4. Remove orphan --- dividers that end up alone at start/end after trimming
    out = out.replace(/^\s*---\s*\n/, '').replace(/\n\s*---\s*$/, '').trim();
    
    // 5. Collapse 3+ consecutive newlines to 2
    out = out.replace(/\n{3,}/g, '\n\n');
    
    // 6. Clean up double spaces that result from placeholder removal
    out = out.replace(/[ \t]{2,}/g, ' ');
    
    // 7. Remove empty bullet lines like "• " or "- " with nothing after
    out = out.replace(/^[•\-\*]\s*$/gm, '').trim();
    
    return out;
}

/**
 * Fast keyword pre-classification before calling the AI.
 * Scans the description for explicit keyword hits and returns a confident match,
 * or null if no clear match exists (letting AI classification handle it).
 *
 * Used to short-circuit obvious cases like "nitro giveaway" → giveaway
 * where an AI call would be wasteful and potentially less accurate.
 *
 * @param {string} description - User's embed description
 * @returns {Object|null} Template if confident match, null otherwise
 */
function quickMatchTemplate(description) {
    if (!description) return null;
    const lower = description.toLowerCase();
    const scores = new Map();
    
    for (const template of EMBED_TEMPLATES) {
        let score = 0;
        let matchedKeywords = [];
        
        // Primary keyword match is weighted heaviest
        if (lower.includes(template.primaryKeyword)) {
            score += 10;
            matchedKeywords.push(template.primaryKeyword);
        }
        
        // Secondary keyword matches
        for (const kw of template.keywords) {
            // Use word-boundary to avoid false partial hits ("new" inside "newsletter")
            const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (re.test(lower)) {
                score += kw.length >= 6 ? 3 : 2;
                matchedKeywords.push(kw);
            }
        }
        
        if (score > 0) scores.set(template, { score, matchedKeywords });
    }
    
    if (scores.size === 0) return null;
    
    // Pick the highest scoring template
    let best = null;
    let bestScore = 0;
    for (const [tpl, { score }] of scores.entries()) {
        if (score > bestScore) {
            bestScore = score;
            best = tpl;
        }
    }
    
    // Only commit to the quick match if score is high enough AND it beats the
    // runner-up by a clear margin — otherwise fall through to AI classification
    // for ambiguous requests.
    if (bestScore >= 10) {
        let runnerUp = 0;
        for (const [tpl, { score }] of scores.entries()) {
            if (tpl !== best && score > runnerUp) runnerUp = score;
        }
        if (bestScore - runnerUp >= 5) {
            return { template: best, score: bestScore, matched: scores.get(best).matchedKeywords };
        }
    }
    
    return null;
}

/**
 * Generate embed using AI based on user description with template-based system
 * @param {string} description - User's embed description
 * @param {string} imageChoice - Image choice: 'none', 'thumbnail', 'image', 'both'
 * @param {string} imageDetails - Optional image details
 * @param {Object} guild - Discord guild object
 * @param {Object} client - Discord client for emoji access
 * @param {string|null} userId - Discord user ID for anti-repetition tracking
 * @returns {Promise<{embed: Object, error: string|null}>}
 */
async function generateAIEmbed(description, imageChoice = 'both', imageDetails = null, guild = null, client = null, userId = null) {
    try {
        if (!Groq) {
            return { embed: null, error: "⚠️ Groq SDK not installed! Please run: npm install groq-sdk" };
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return { embed: null, error: "⚠️ Groq API key not found! Please set GROQ_API_KEY in your environment variables." };
        }

        const groq = new Groq({ apiKey });

        // ═══════════════════════════════════════════════════════════════════
        // STEP 1: Select the best template for this user demand
        // ═══════════════════════════════════════════════════════════════════
        const selectedTemplate = await selectBestTemplate(description, userId);
        console.log(`[AI Embed] 📐 Using template: "${selectedTemplate.name}" (${selectedTemplate.id})`);

        // Record this selection for anti-repetition tracking
        if (userId) recordTemplateSelection(userId, selectedTemplate.id);

        // ═══════════════════════════════════════════════════════════════════
        // STEP 2: Fetch relevant custom emojis with enhanced intelligence
        // ═══════════════════════════════════════════════════════════════════
        const customEmojis = client ? await fetchRelevantCustomEmojis(client, description) : [];
        const sentiment = analyzeSentiment(description);
        const fallbackEmojis = getFallbackUnicodeEmojis(description, sentiment.sentiment);
        
        let emojiInstruction = "";
        
        if (customEmojis.length > 0) {
            const headingEmojis = customEmojis.filter(e => e.placement === 'heading').slice(0, 5);
            const bulletEmojis = customEmojis.filter(e => e.placement === 'bullet').slice(0, 5);
            const generalEmojis = customEmojis.filter(e => e.placement === 'general').slice(0, 10);
            const closingEmojis = customEmojis.filter(e => e.placement === 'closing').slice(0, 3);
            
            emojiInstruction = `\n\n**═══ CUSTOM EMOJIS — USE 4-7 STRATEGICALLY ═══**\n`;
            
            if (headingEmojis.length > 0) {
                emojiInstruction += `🏷️ Headings: ${headingEmojis.map(e => e.format).join(' ')}\n`;
            }
            if (bulletEmojis.length > 0) {
                emojiInstruction += `📌 Bullets: ${bulletEmojis.map(e => e.format).join(' ')}\n`;
            }
            if (closingEmojis.length > 0) {
                emojiInstruction += `🎀 Closing: ${closingEmojis.map(e => e.format).join(' ')}\n`;
            }
            if (generalEmojis.length > 0) {
                emojiInstruction += `✨ General: ${generalEmojis.map(e => e.format).join(' ')}\n`;
            }
            
            emojiInstruction += `
**⚠️ CRITICAL EMOJI RULES:**
- YOU MUST use 4-7 custom emojis from above
- COPY emoji format EXACTLY (e.g., <:name:123456789>)
- Replace EVERY [EMOJI] placeholder in the template with a custom emoji
- Place 1-2 custom emojis in # and ## headings
- Use bullet emojis for list items
- Add 1 custom emoji to closing line
- DO NOT use Unicode emojis when custom emojis are available
- EXAMPLE: "# <:star:123> Welcome" NOT "# ⭐ Welcome"`;
        } else if (fallbackEmojis.length > 0) {
            emojiInstruction = `\n\n**═══ UNICODE EMOJIS — USE 4-7 STRATEGICALLY ═══**\n${fallbackEmojis.join(' ')}\n
**EMOJI RULES:**
- Use 4-7 emojis total (don't overuse)
- Replace EVERY [EMOJI] placeholder with an appropriate emoji
- Place 1-2 emojis in headings, 2-3 in bullets, 1 in closing`;
        }

        // ═══════════════════════════════════════════════════════════════════
        // STEP 3: Fetch Unsplash images with enhanced contextual search
        // ═══════════════════════════════════════════════════════════════════
        let imageInstruction = "";
        let unsplashImagesInstruction = "";

        if (imageChoice === "thumbnail") {
            imageInstruction = "Include ONLY a thumbnail image (top-right corner). NO main image.";
        } else if (imageChoice === "image") {
            imageInstruction = "Include ONLY a main image (below the embed). NO thumbnail.";
        } else if (imageChoice === "both") {
            imageInstruction = "Include BOTH a thumbnail AND a main image. They MUST be DIFFERENT images.";
        } else {
            imageInstruction = "Do NOT include any images.";
        }

        let customUrlsProvided = false;

        if (imageDetails && (imageDetails.includes("CUSTOM IMAGE URLS:") || imageDetails.includes("USE SERVER LOGO:"))) {
            customUrlsProvided = true;
            if (imageDetails.includes("USE SERVER LOGO:") && guild && guild.iconURL()) {
                const logoUrl = guild.iconURL({ size: 1024 });
                if (imageChoice === "both") {
                    unsplashImagesInstruction = `\n\n**USE THESE EXACT IMAGES:**\nTHUMBNAIL: ${logoUrl}\n(For main image, AI will search for a relevant image)\n\nCRITICAL: Use the server logo for thumbnail. Do NOT include any URLs in the description text.`;
                } else if (imageChoice === "thumbnail") {
                    unsplashImagesInstruction = `\n\n**USE THIS EXACT IMAGE FOR THUMBNAIL:**\n${logoUrl}\n\nCRITICAL: Use this URL for the thumbnail. Do NOT include any URLs in the description text.`;
                } else {
                    unsplashImagesInstruction = `\n\n**USE THIS EXACT IMAGE FOR MAIN IMAGE:**\n${logoUrl}\n\nCRITICAL: Use this URL for the main image. Do NOT include any URLs in the description text.`;
                }
            } else {
                unsplashImagesInstruction = `\n\n**USER PROVIDED CUSTOM IMAGE URLs — USE EXACTLY AS SPECIFIED:**\n${imageDetails}\n\nCRITICAL: Use ONLY the custom URLs provided above. Do NOT use Unsplash or other sources. Do NOT include any URLs in the description text.`;
            }
        } else if (imageChoice !== "none") {
            if (imageChoice === "both") {
                const thumbnailQuery = await generateContextualImageQuery(description, imageDetails, 'thumbnail');
                const bannerQuery = await generateContextualImageQuery(description, imageDetails, 'banner');
                
                const [thumbResult, bannerResult] = await Promise.all([
                    searchUnsplashImages(thumbnailQuery.substring(0, 100), 20),
                    searchUnsplashImages(bannerQuery.substring(0, 100), 20)
                ]);
                
                const { results: thumbnailResults, error: thumbErr } = thumbResult;
                const { results: bannerResults, error: bannerErr } = bannerResult;
                
                if (thumbnailResults && bannerResults && !thumbErr && !bannerErr) {
                    const selectedImages = [];
                    const unsplashUrls = [];
                    
                    unsplashUrls.push(`**THUMBNAIL OPTIONS (pick the MOST RELEVANT one):**`);
                    for (let i = 0; i < Math.min(5, thumbnailResults.length); i++) {
                        const img = thumbnailResults[i];
                        const score = calculateImageQualityScore(img, thumbnailQuery, selectedImages);
                        unsplashUrls.push(`${i + 1}. ${img.url_medium} (${img.alt || 'no description'}) [Quality: ${score}/30]`);
                    }
                    
                    unsplashUrls.push(`\n**BANNER OPTIONS (pick the MOST RELEVANT one, MUST differ from thumbnail):**`);
                    for (let i = 0; i < Math.min(5, bannerResults.length); i++) {
                        const img = bannerResults[i];
                        const score = calculateImageQualityScore(img, bannerQuery, selectedImages);
                        unsplashUrls.push(`${i + 1}. ${img.url_large} (${img.alt || 'no description'}) [Quality: ${score}/30]`);
                    }
                    
                    unsplashImagesInstruction = `\n\n**AVAILABLE IMAGES:**\n${unsplashUrls.join('\n')}\n\n**IMAGE SELECTION RULES:**
- Choose the HIGHEST quality score images
- Thumbnail and banner MUST be COMPLETELY DIFFERENT
- Prefer images with quality scores above 20
- Do NOT include image URLs in the description text`;
                }
            } else {
                const imageType = imageChoice === 'thumbnail' ? 'thumbnail' : 'banner';
                const searchQuery = await generateContextualImageQuery(description, imageDetails, imageType);
                const { results: unsplashResults, error: unsplashErr } = await searchUnsplashImages(searchQuery.substring(0, 100), 20);

                if (unsplashResults && !unsplashErr && unsplashResults.length > 0) {
                    const unsplashUrls = [];
                    const urlField = imageChoice === 'thumbnail' ? 'url_medium' : 'url_large';
                    
                    unsplashUrls.push(`**IMAGE OPTIONS (pick the MOST RELEVANT one):**`);
                    for (let i = 0; i < Math.min(8, unsplashResults.length); i++) {
                        const img = unsplashResults[i];
                        unsplashUrls.push(`${i + 1}. ${img[urlField]} (${img.alt || 'no description'}) [Quality: ${img.qualityScore}/30]`);
                    }

                    unsplashImagesInstruction = `\n\n**AVAILABLE IMAGES (searched: '${searchQuery}'):**\n${unsplashUrls.join('\n')}\n\n**RULES:**
- Choose the HIGHEST quality score image
- Prefer images with quality scores above 20
- Do NOT include image URLs in the description text`;
                }
            }
        }

        const imageDetailsInstruction = imageDetails && !customUrlsProvided 
            ? `\n\nUSER'S SPECIFIC IMAGE REQUIREMENTS:\n${imageDetails}` 
            : "";

        // ═══════════════════════════════════════════════════════════════════
        // STEP 4: Build the enhanced system prompt with selected template
        // ═══════════════════════════════════════════════════════════════════
        const systemPrompt = `⚠️ CRITICAL: RETURN ONLY A JSON OBJECT — NO MARKDOWN TEXT, NO COMMENTARY ⚠️

YOU ARE A PREMIUM DISCORD EMBED DESIGNER. You produce stunning, professional embeds.
Your output MUST start with { and end with }. The markdown goes INSIDE the "description" field.

USER REQUEST: ${description}

═══════════════════════════════════════════════════════════════════
SELECTED TEMPLATE: "${selectedTemplate.name}"
═══════════════════════════════════════════════════════════════════

You MUST follow this exact visual structure for the description field:

${selectedTemplate.structure}

═══════════════════════════════════════════════════════════════════
JSON OUTPUT FORMAT — COPY THIS STRUCTURE EXACTLY:
═══════════════════════════════════════════════════════════════════

{
  "type": "rich",
  "description": "[YOUR MARKDOWN CONTENT HERE — following the template above]",
  "color": ${selectedTemplate.color},
  "thumbnail": {"url": "[THUMBNAIL_URL]"},
  "image": {"url": "[BANNER_URL]"}
}

═══════════════════════════════════════════════════════════════════
CONTENT REQUIREMENTS FOR "description":
═══════════════════════════════════════════════════════════════════

1. **LENGTH:** ⚠️ MANDATORY 500-900 CHARACTERS ⚠️
   - MINIMUM: 500 characters — add detail if under
   - MAXIMUM: 900 characters — trim if over
   - Count ALL characters (spaces, newlines, markdown, emojis)

2. **DISCORD MARKDOWN — USE EXTENSIVELY:**
   ✓ # Large Title (MUST use in description for big text effect — this renders LARGER than embed title)
   ✓ ## Section Headings (2-3x)
   ✓ \`\`\`yaml ... \`\`\` code blocks for structured data (1-2x)
   ✓ **Bold** for emphasis (4-6x)
   ✓ *Italic* for subtlety (2-3x)
   ✓ > Blockquote for tips/notices (1x)
   ✓ --- Horizontal divider (1x)
   ✓ • or custom emoji bullets for lists
   ✓ \`inline code\` for commands (1-2x)

3. **TEMPLATE PLACEHOLDERS:**
   - Replace ALL [TITLE], [Point], [Detail], etc. with REAL content from the user's request
   - Replace ALL [EMOJI] with actual emojis (custom or unicode)
   - Adapt the template to fit the user's SPECIFIC demand — don't be generic
   - The user's details and context should drive EVERY line

4. **PROFESSIONAL QUALITY:**
   - Content must be directly relevant to user's request
   - Use the user's provided details to fill in specifics
   - Write compelling, not generic, copy
   - Vary sentence structures — mix short and long
   - Make the embed feel like a premium server would use it

5. **EMOJIS — 4-7 TOTAL:**
   ${emojiInstruction}

6. **IMAGES:**
   ${imageInstruction}
   ${unsplashImagesInstruction}
   
   ⚠️ IMAGE RULES:
   - Select images from the provided options ONLY
   - Thumbnail and image MUST be DIFFERENT URLs
   - Copy the EXACT URL — do NOT invent URLs
   - Do NOT embed URLs inside the description text
   ${imageDetailsInstruction}

═══════════════════════════════════════════════════════════════════
JSON FORMATTING RULES:
═══════════════════════════════════════════════════════════════════

✓ Response starts with { — NO text before it
✓ Response ends with } — NO text after it
✓ \\n for line breaks inside the description string
✓ \\\\ for backslashes, \\" for quotes inside the string
✓ Color: ${selectedTemplate.color} (decimal integer)
✓ Include "thumbnail" and "image" objects with "url" field
✓ Thumbnail and image are DIFFERENT URLs

⚠️ FINAL CHECK: Response is ONLY a JSON object, 500-900 char description, template structure followed, images included. ⚠️`;

        // ═══════════════════════════════════════════════════════════════════
        // STEP 5: Generate the embed via Groq AI
        // ═══════════════════════════════════════════════════════════════════
        const chatCompletion = await callGroq(groq, {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Create a stunning Discord embed for: ${description}\n\nTemplate: ${selectedTemplate.name}\nAdapt the template to perfectly match the user's demand. Fill in REAL content, not placeholders.\n\nREMEMBER: Include BOTH thumbnail and image URLs from the provided options!` }
            ],
            temperature: 0.8,
            max_tokens: 3000
        });

        let aiResponse = chatCompletion.choices[0].message.content.trim();

        // ═══════════════════════════════════════════════════════════════════
        // STEP 6: Parse and validate the AI response
        // ═══════════════════════════════════════════════════════════════════
        console.log('[AI Embed] Raw AI response (first 100 chars):', aiResponse.substring(0, 100));

        // Remove markdown code blocks if present
        if (aiResponse.startsWith("```json")) {
            aiResponse = aiResponse.substring(7);
            console.log('[AI Embed] Removed ```json wrapper');
        }
        if (aiResponse.startsWith("```")) {
            aiResponse = aiResponse.substring(3);
            console.log('[AI Embed] Removed ``` wrapper');
        }
        if (aiResponse.endsWith("```")) {
            aiResponse = aiResponse.substring(0, aiResponse.length - 3);
            console.log('[AI Embed] Removed trailing ```');
        }
        aiResponse = aiResponse.trim();

        // Extract JSON if response contains extra text
        if (!aiResponse.startsWith('{')) {
            console.error('[AI Embed] ⚠️ AI returned non-JSON response!');
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResponse = jsonMatch[0];
                console.log('[AI Embed] ✓ Extracted JSON object from response');
            } else {
                console.log('[AI Embed] ⚠️ No JSON found — wrapping markdown in JSON');
                const wrappedJson = {
                    type: 'rich',
                    description: aiResponse,
                    color: selectedTemplate.color
                };
                return { embed: wrappedJson, error: null };
            }
        }

        if (!aiResponse.includes('"description"')) {
            console.error('[AI Embed] ⚠️ Response missing "description" field');
            const jsonMatch = aiResponse.match(/\{[\s\S]*"description"[\s\S]*\}/);
            if (jsonMatch) {
                aiResponse = jsonMatch[0];
            } else {
                return { embed: null, error: `AI returned invalid response. Please try again.` };
            }
        }

        // Parse JSON with fallback fixes
        let embedObj;
        try {
            embedObj = JSON.parse(aiResponse);
            console.log('[AI Embed] ✓ Successfully parsed JSON');
        } catch (parseError) {
            console.error('[AI Embed] ❌ JSON parse error:', parseError.message);
            try {
                let fixedResponse = aiResponse.replace(/,(\s*[}\]])/g, '$1');
                // Fix unescaped newlines inside strings
                fixedResponse = fixedResponse.replace(/(?<!\\)\n/g, '\\n');
                embedObj = JSON.parse(fixedResponse);
                console.log('[AI Embed] ✓ Parsed JSON after auto-fix');
            } catch (e) {
                return { embed: null, error: `AI returned invalid JSON. Please try again. Error: ${parseError.message}` };
            }
        }

        // Ensure type and color
        if (!embedObj.type) embedObj.type = 'rich';
        if (!embedObj.color) embedObj.color = selectedTemplate.color;

        // ═══════════════════════════════════════════════════════════════════
        // STEP 7: Post-process — emoji injection, length enforcement, image fallback
        // ═══════════════════════════════════════════════════════════════════
        if (embedObj.description) {
            // Sanitize first — removes leftover [EMOJI]/[TITLE] placeholders so
            // the length count reflects real content before we decide to pad/trim.
            embedObj.description = sanitizeMarkdown(embedObj.description);
            
            // Inject custom emojis if AI didn't use enough
            embedObj.description = injectEmojisPostGeneration(embedObj.description, customEmojis, fallbackEmojis);
            
            const charCount = embedObj.description.length;
            console.log(`[AI Embed] Generated embed with ${charCount} characters (target: 500-900)`);
            
            // Enforce 500-900 character range (900 gives breathing room so we don't
            // cut mid-markdown for minor overages like 805 chars)
            if (charCount < 500) {
                console.log(`[AI Embed] ⚠️ Description too short (${charCount} chars). Padding...`);
                const paddingOptions = [
                    "\n\n---\n\n*Join us and be part of something amazing!* ✨",
                    "\n\n---\n\n*We can't wait to see you there!* 🎉",
                    "\n\n---\n\n*Don't miss out on this incredible opportunity!* 🚀",
                    "\n\n---\n\n*Your journey starts right here, right now!* 🌟",
                    "\n\n---\n\n*Together we build something extraordinary!* 💪",
                    "\n\n---\n\n*Looking forward to having you with us!* 🌈",
                    "\n\n---\n\n*Be part of our ever-growing community!* 🎯",
                    "\n\n---\n\n*Great things are waiting for you ahead!* ⭐"
                ];
                
                const shuffled = [...paddingOptions].sort(() => Math.random() - 0.5);
                let paddedDesc = embedObj.description;
                let attempts = 0;
                
                while (paddedDesc.length < 500 && attempts < shuffled.length) {
                    paddedDesc += shuffled[attempts];
                    attempts++;
                }
                
                embedObj.description = paddedDesc.substring(0, 900);
                console.log(`[AI Embed] ✓ Padded to ${embedObj.description.length} characters`);
            } else if (charCount > 900) {
                console.log(`[AI Embed] ⚠️ Description too long (${charCount} chars). Trimming...`);
                const desc = embedObj.description;
                const truncated = desc.substring(0, 900);
                
                // Prefer cutting at a blank line (paragraph break), then newline, then sentence
                const lastBlankLine = truncated.lastIndexOf('\n\n');
                const lastNewline = truncated.lastIndexOf('\n');
                const lastPeriod = truncated.lastIndexOf('.');
                
                // Use the latest good cut point > 500
                let cutPoint = -1;
                if (lastBlankLine > 500) cutPoint = lastBlankLine;
                else if (lastNewline > 500) cutPoint = lastNewline;
                else if (lastPeriod > 500) cutPoint = lastPeriod + 1;
                
                if (cutPoint > 500) {
                    embedObj.description = truncated.substring(0, cutPoint).trim();
                } else {
                    const lastSpace = truncated.lastIndexOf(' ');
                    embedObj.description = (lastSpace > 500 ? truncated.substring(0, lastSpace) : truncated).trim();
                }
                
                // Re-sanitize after trimming — closes any code fences/bold tags
                // that were left unbalanced by the cut.
                embedObj.description = sanitizeMarkdown(embedObj.description);
                console.log(`[AI Embed] ✓ Trimmed & sanitized to ${embedObj.description.length} characters`);
            }
            
            // Enforce Discord hard limit (4096)
            if (embedObj.description.length > 2000) {
                const desc = embedObj.description;
                const truncated = desc.substring(0, 2000);
                const lastNewline = truncated.lastIndexOf('\n');
                const cutPoint = lastNewline > 1800 ? lastNewline : 2000;
                embedObj.description = sanitizeMarkdown(truncated.substring(0, cutPoint).trim());
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // STEP 8: Image fallback — ensure images are always present
            // ═══════════════════════════════════════════════════════════════════
            if (imageChoice === 'both' || imageChoice === 'thumbnail') {
                if (!embedObj.thumbnail || !embedObj.thumbnail.url) {
                    console.log(`[AI Embed] ❌ Missing thumbnail! Adding fallback...`);
                    const fallbackQuery = await generateContextualImageQuery(description, imageDetails, 'thumbnail');
                    const { results: fallbackResults } = await searchUnsplashImages(fallbackQuery.substring(0, 100), 5);
                    if (fallbackResults && fallbackResults.length > 0) {
                        embedObj.thumbnail = { url: fallbackResults[0].url_medium };
                        console.log(`[AI Embed] ✓ Fallback thumbnail added`);
                    }
                } else {
                    console.log(`[AI Embed] ✓ Thumbnail included`);
                }
            }
            if (imageChoice === 'both' || imageChoice === 'image') {
                if (!embedObj.image || !embedObj.image.url) {
                    console.log(`[AI Embed] ❌ Missing main image! Adding fallback...`);
                    const fallbackQuery = await generateContextualImageQuery(description, imageDetails, 'banner');
                    const { results: fallbackResults } = await searchUnsplashImages(fallbackQuery.substring(0, 100), 5);
                    if (fallbackResults && fallbackResults.length > 0) {
                        const imageIndex = (embedObj.thumbnail && fallbackResults.length > 1) ? 1 : 0;
                        embedObj.image = { url: fallbackResults[imageIndex].url_large };
                        console.log(`[AI Embed] ✓ Fallback main image added`);
                    }
                } else {
                    console.log(`[AI Embed] ✓ Main image included`);
                }
            }
            
            // Validate custom emoji usage
            if (customEmojis.length > 0 && embedObj.description) {
                const customEmojiPattern = /<a?:\w+:\d+>/g;
                const customEmojisInDesc = embedObj.description.match(customEmojiPattern) || [];
                if (customEmojisInDesc.length > 0) {
                    console.log(`[AI Embed] ✓ Custom emojis used: ${customEmojisInDesc.length} (${customEmojisInDesc.join(', ')})`);
                } else {
                    console.log(`[AI Embed] ⚠️ No custom emojis used despite ${customEmojis.length} being available — post-injection attempted`);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // STEP 9: Refinement pass if quality is off
        // ═══════════════════════════════════════════════════════════════════
        const finalLength = embedObj.description?.length || 0;
        if (finalLength < 500 || finalLength > 900) {
            console.log(`[AI Embed] 🔄 Initiating refinement pass (length: ${finalLength})...`);
            const { embed: refinedEmbed, error: refineError } = await refineAIEmbed(embedObj, description, imageChoice);
            if (!refineError && refinedEmbed) {
                // Sanitize refined output too
                if (refinedEmbed.description) {
                    refinedEmbed.description = sanitizeMarkdown(refinedEmbed.description);
                }
                embedObj = refinedEmbed;
                console.log(`[AI Embed] ✓ Using refined embed (length: ${embedObj.description?.length || 0})`);
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // STEP 10: Final validation — Discord rejects embeds without a
        // non-empty description (embeds[0].description BASE_TYPE_REQUIRED) and
        // malformed fields/titles. Guarantee a sendable embed regardless of
        // what the model returned.
        // ═══════════════════════════════════════════════════════════════════
        if (typeof embedObj.description !== 'string' || !embedObj.description.trim()) {
            console.warn('[AI Embed] ⚠️ Empty description after processing — injecting fallback');
            embedObj.description = `## ${description.substring(0, 150)}\n\n*Details coming soon — stay tuned!*`;
        }
        if (typeof embedObj.title === 'string' && embedObj.title.length > 256) {
            embedObj.title = embedObj.title.substring(0, 256);
        }
        if (embedObj.footer && typeof embedObj.footer.text === 'string' && embedObj.footer.text.length > 2048) {
            embedObj.footer.text = embedObj.footer.text.substring(0, 2048);
        }
        if (Array.isArray(embedObj.fields)) {
            embedObj.fields = embedObj.fields
                .filter(f => f && typeof f.name === 'string' && f.name.trim() && typeof f.value === 'string' && f.value.trim())
                .slice(0, 25)
                .map(f => ({ name: f.name.substring(0, 256), value: f.value.substring(0, 1024), inline: !!f.inline }));
        }
        if (embedObj.description.length > 4096) {
            embedObj.description = embedObj.description.substring(0, 4096);
        }
        // Normalize color — AI sometimes returns a string like "blue" or "#ff0000"
        if (typeof embedObj.color === 'string') {
            const hexMatch = embedObj.color.match(/^#?([0-9a-fA-F]{6})$/);
            embedObj.color = hexMatch ? parseInt(hexMatch[1], 16) : selectedTemplate.color;
        }
        if (typeof embedObj.color !== 'number' || isNaN(embedObj.color)) {
            embedObj.color = selectedTemplate.color;
        }
        // Normalize media/URL shapes — strings or non-http URLs get dropped
        if (typeof embedObj.thumbnail === 'string') embedObj.thumbnail = { url: embedObj.thumbnail };
        if (typeof embedObj.image === 'string') embedObj.image = { url: embedObj.image };
        if (embedObj.thumbnail && !/^https?:\/\//.test(embedObj.thumbnail?.url || '')) delete embedObj.thumbnail;
        if (embedObj.image && !/^https?:\/\//.test(embedObj.image?.url || '')) delete embedObj.image;
        if (embedObj.url && !/^https?:\/\//.test(embedObj.url)) delete embedObj.url;
        if (embedObj.author?.url && !/^https?:\/\//.test(embedObj.author.url)) delete embedObj.author.url;
        if (embedObj.author?.icon_url && !/^https?:\/\//.test(embedObj.author.icon_url)) delete embedObj.author.icon_url;
        if (embedObj.footer?.icon_url && !/^https?:\/\//.test(embedObj.footer.icon_url)) delete embedObj.footer.icon_url;

        console.log(`[AI Embed] ✅ Final embed: template="${selectedTemplate.name}", length=${embedObj.description?.length || 0}, color=${embedObj.color}`);
        return { embed: embedObj, error: null };
    } catch (error) {
        console.error('[AI Embed Generation] Error:', error.message);
        return { embed: null, error: `Error generating embed: ${error.message}` };
    }
}

module.exports = {
    aiGenerationStates,
    aiRegenerateCooldowns,
    aiGeneratedEmbeds,
    aiLastGenerationInfo,
    aiTemplateHistory,
    AI_REGENERATE_COOLDOWN_SECONDS,
    callGroq,
    GROQ_MODEL_CHAIN,
    EMBED_TEMPLATES,
    searchUnsplashImages,
    enhanceUnsplashQuery,
    generateContextualImageQuery,
    generateAIEmbed,
    refineAIEmbed,
    selectBestTemplate,
    selectTemplateFallback,
    quickMatchTemplate,
    sanitizeMarkdown,
    injectEmojisPostGeneration,
    recordTemplateSelection,
    fetchRelevantCustomEmojis,
    analyzeSentiment,
    getFallbackUnicodeEmojis,
    getTemporalContext
};
