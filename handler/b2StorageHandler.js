const axios = require('axios')
const crypto = require('crypto')

/**
 * Backblaze B2 Storage Handler
 * Handles uploading and downloading emoji/sticker images to/from B2
 */
class B2StorageHandler {
    constructor() {
        this.keyId = process.env.B2_KEY_ID
        this.applicationKey = process.env.B2_APPLICATION_KEY
        this.bucketId = process.env.B2_BUCKET_ID
        this.bucketName = process.env.B2_BUCKET_NAME
        
        // Authorization cache
        this.authToken = null
        this.apiUrl = null
        this.downloadUrl = null
        this.uploadUrl = null
        this.uploadAuthToken = null
        
        // Check if B2 is configured
        this.isConfigured = !!(this.keyId && this.applicationKey && this.bucketId && this.bucketName)
        
        if (!this.isConfigured) {
            console.log('[B2_STORAGE] ⚠️ Backblaze B2 not configured - backup system will be disabled')
            console.log('[B2_STORAGE] Please set B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, and B2_BUCKET_NAME in .env')
        } else {
            console.log('[B2_STORAGE] ✅ Backblaze B2 configured')
            // Pre-authorize on initialization to avoid delays later
            this.authorize().catch(err => {
                console.error('[B2_STORAGE] ⚠️ Initial authorization failed:', err.message)
                console.error('[B2_STORAGE] Will retry on first operation')
            })
        }
    }

    /**
     * Authorize with B2 API
     */
    async authorize() {
        if (!this.isConfigured) {
            throw new Error('B2 not configured')
        }

        try {
            const authString = Buffer.from(`${this.keyId}:${this.applicationKey}`).toString('base64')
            
            const response = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
                headers: {
                    'Authorization': `Basic ${authString}`
                }
            })
            
            this.authToken = response.data.authorizationToken
            this.apiUrl = response.data.apiUrl
            this.downloadUrl = response.data.downloadUrl
            
            console.log('[B2_STORAGE] ✅ Authorized with B2')
            return true
        } catch (error) {
            console.error('[B2_STORAGE] ❌ Authorization failed:', error.message)
            throw error
        }
    }

    /**
     * Get upload URL for bucket
     */
    async getUploadUrl() {
        if (!this.authToken) {
            await this.authorize()
        }

        try {
            const response = await axios.post(
                `${this.apiUrl}/b2api/v2/b2_get_upload_url`,
                { bucketId: this.bucketId },
                {
                    headers: {
                        'Authorization': this.authToken
                    }
                }
            )
            
            this.uploadUrl = response.data.uploadUrl
            this.uploadAuthToken = response.data.authorizationToken
            
            return {
                uploadUrl: this.uploadUrl,
                authToken: this.uploadAuthToken
            }
        } catch (error) {
            console.error('[B2_STORAGE] ❌ Failed to get upload URL:', error.message)
            
            // Retry with fresh authorization
            if (error.response?.status === 401) {
                await this.authorize()
                return this.getUploadUrl()
            }
            
            throw error
        }
    }

    /**
     * Upload image to B2 with retry logic and validation
     * @param {Buffer} imageBuffer - Image data as buffer
     * @param {string} fileName - File name (e.g., "emoji_123456789.png")
     * @param {string} contentType - MIME type (e.g., "image/png")
     * @returns {Object} - { fileId, fileName, downloadUrl }
     */
    async uploadImage(imageBuffer, fileName, contentType) {
        if (!this.isConfigured) {
            throw new Error('B2 not configured')
        }

        // Validate and sanitize filename
        const sanitizedFileName = this.sanitizeFileName(fileName)
        
        // Validate file size
        if (imageBuffer.length > 8 * 1024 * 1024) {
            throw new Error('File too large (max 8MB)')
        }

        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
            try {
                // Get upload URL
                const { uploadUrl, authToken } = await this.getUploadUrl()
                
                // Calculate SHA1 hash
                const sha1 = crypto.createHash('sha1').update(imageBuffer).digest('hex')
                
                // Upload file
                const response = await axios.post(uploadUrl, imageBuffer, {
                    headers: {
                        'Authorization': authToken,
                        'X-Bz-File-Name': encodeURIComponent(sanitizedFileName),
                        'Content-Type': contentType,
                        'Content-Length': imageBuffer.length,
                        'X-Bz-Content-Sha1': sha1
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    timeout: 60000 // 60 second timeout
                })
                
                const fileId = response.data.fileId
                const uploadedFileName = response.data.fileName
                const downloadUrl = `${this.downloadUrl}/file/${this.bucketName}/${uploadedFileName}`
                
                console.log(`[B2_STORAGE] ✅ Uploaded: ${sanitizedFileName} (${(imageBuffer.length / 1024).toFixed(2)} KB)`)
                
                return {
                    fileId,
                    fileName: uploadedFileName,
                    downloadUrl
                }
            } catch (error) {
                retryCount++
                console.error(`[B2_STORAGE] ❌ Upload attempt ${retryCount} failed:`, error.message)
                
                // Retry with fresh upload URL on auth errors
                if (error.response?.status === 401) {
                    this.uploadUrl = null
                    this.uploadAuthToken = null
                }
                
                // If this was the last retry, throw the error
                if (retryCount >= maxRetries) {
                    throw error
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
            }
        }
    }

    /**
     * Sanitize filename for B2 storage
     */
    sanitizeFileName(fileName) {
        // Remove dangerous characters and limit length
        const sanitized = fileName
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 100)
        
        // Ensure it has an extension
        if (!sanitized.includes('.')) {
            return sanitized + '.png'
        }
        
        return sanitized
    }

    /**
     * Download image from B2 with automatic re-authorization
     * @param {string} downloadUrl - B2 download URL
     * @returns {Buffer} - Image data as buffer
     */
    async downloadImage(downloadUrl) {
        if (!this.isConfigured) {
            throw new Error('B2 not configured')
        }

        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
            try {
                // Ensure we have a valid auth token
                if (!this.authToken) {
                    await this.authorize()
                }

                const response = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'Authorization': this.authToken
                    }
                })
                
                return Buffer.from(response.data)
            } catch (error) {
                retryCount++
                console.error(`[B2_STORAGE] ❌ Download attempt ${retryCount} failed:`, error.message)
                
                // If 401 error, re-authorize and retry
                if (error.response?.status === 401) {
                    console.log('[B2_STORAGE] 🔄 Authorization expired, re-authorizing...')
                    this.authToken = null
                    await this.authorize()
                    
                    // Don't count this as a retry if it was just an auth issue
                    if (retryCount < maxRetries) {
                        continue
                    }
                }
                
                // If this was the last retry, throw the error
                if (retryCount >= maxRetries) {
                    throw error
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
            }
        }
        
        throw new Error('Max retries exceeded')
    }

    /**
     * Delete file from B2
     * @param {string} fileId - B2 file ID
     * @param {string} fileName - File name
     */
    async deleteFile(fileId, fileName) {
        if (!this.isConfigured) {
            throw new Error('B2 not configured')
        }

        if (!this.authToken) {
            await this.authorize()
        }

        try {
            await axios.post(
                `${this.apiUrl}/b2api/v2/b2_delete_file_version`,
                {
                    fileId,
                    fileName
                },
                {
                    headers: {
                        'Authorization': this.authToken
                    }
                }
            )
            
            console.log(`[B2_STORAGE] ✅ Deleted: ${fileName}`)
            return true
        } catch (error) {
            console.error('[B2_STORAGE] ❌ Delete failed:', error.message)
            
            // Retry with fresh authorization
            if (error.response?.status === 401) {
                await this.authorize()
                return this.deleteFile(fileId, fileName)
            }
            
            throw error
        }
    }

    /**
     * Download image from Discord CDN with size limits and validation
     * @param {string} url - Discord CDN URL
     * @returns {Object} - { buffer, contentType, format }
     */
    async downloadFromDiscord(url) {
        try {
            // Validate URL
            if (!url || !url.startsWith('https://cdn.discordapp.com/')) {
                throw new Error('Invalid Discord CDN URL')
            }

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout
                maxContentLength: 8 * 1024 * 1024, // 8MB limit (Discord max is ~256KB for emojis)
                maxBodyLength: 8 * 1024 * 1024
            })
            
            const buffer = Buffer.from(response.data)
            
            // Validate file size
            if (buffer.length > 8 * 1024 * 1024) {
                throw new Error('File too large (max 8MB)')
            }
            
            const contentType = response.headers['content-type'] || 'image/png'
            
            // Determine format from URL or content type
            let format = 'PNG'
            if (url.includes('.gif') || contentType.includes('gif')) {
                format = 'GIF'
            } else if (url.includes('.apng')) {
                format = 'APNG'
            } else if (contentType.includes('lottie')) {
                format = 'LOTTIE'
            }
            
            return { buffer, contentType, format }
        } catch (error) {
            console.error('[B2_STORAGE] ❌ Discord download failed:', error.message)
            throw error
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        if (!this.isConfigured) {
            return { status: 'not_configured', message: 'B2 credentials not set' }
        }

        try {
            await this.authorize()
            return { status: 'healthy', message: 'B2 connection successful' }
        } catch (error) {
            return { status: 'error', message: error.message }
        }
    }
}

module.exports = B2StorageHandler
