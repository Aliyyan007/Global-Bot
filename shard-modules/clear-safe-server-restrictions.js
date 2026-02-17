// Quick script to clear Safe-Server restrictions
// Run with: node clear-safe-server-restrictions.js

require('dotenv').config()
const mongoose = require('mongoose')

async function clearRestrictions() {
    try {
        console.log('Connecting to database...')
        
        // Try different possible MongoDB URI variable names
        const mongoUri = process.env.mongoDB_SRV || process.env.MONGO_URI || process.env.MONGODB_URI
        
        if (!mongoUri) {
            console.error('❌ MongoDB URI not found in .env file')
            console.error('Make sure you have mongoDB_SRV in your .env file')
            process.exit(1)
        }
        
        await mongoose.connect(mongoUri)
        console.log('✅ Connected to database')

        const safeServerSchema = require('./schemas/safeServerSchema')
        
        // Find all guilds with active restrictions
        const guilds = await safeServerSchema.find({ 
            'activeRestrictions.0': { $exists: true } 
        })

        console.log(`\nFound ${guilds.length} guild(s) with active restrictions:\n`)

        for (const guild of guilds) {
            console.log(`Guild ID: ${guild.guildID}`)
            console.log(`  Active restrictions: ${guild.activeRestrictions.length}`)
            
            guild.activeRestrictions.forEach((r, i) => {
                console.log(`    ${i + 1}. User: ${r.userId}, Actions: ${r.restrictedActions.join(', ')}`)
            })

            // Clear restrictions
            guild.activeRestrictions = []
            await guild.save()
            console.log(`  ✅ Cleared all restrictions\n`)
        }

        if (guilds.length === 0) {
            console.log('No active restrictions found.')
        } else {
            console.log(`✅ Successfully cleared restrictions from ${guilds.length} guild(s)`)
        }

        await mongoose.disconnect()
        console.log('✅ Disconnected from database')
        process.exit(0)
    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

clearRestrictions()
