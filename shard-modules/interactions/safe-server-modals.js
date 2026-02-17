/**
 * Safe-Server Modal Handlers
 * Handles all modal submissions for the safe-server system
 */

const safeServerSchema = require('../schemas/safeServerSchema')

module.exports = {
    name: 'safe-server-modals',
    
    async execute(client, interaction) {
        const customId = interaction.customId

        try {
            if (customId === 'ss_modal_cooldown_custom') {
                await handleCooldownCustomModal(client, interaction)
            }
            else if (customId === 'ss_modal_action_count') {
                await handleActionCountModal(client, interaction)
            }
            else if (customId === 'ss_modal_time_between_custom') {
                await handleTimeBetweenCustomModal(client, interaction)
            }
        } catch (error) {
            console.error('[Safe-Server Modals] Error:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your input.',
                    ephemeral: true
                }).catch(console.error)
            }
        }
    }
}

// Store selected permission (shared with panel)
const selectedPermissions = new Map()

async function handleCooldownCustomModal(client, interaction) {
    const durationInput = interaction.fields.getTextInputValue('duration')
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    // Parse duration
    const duration = parseDuration(durationInput)

    if (!duration || duration < 60 || duration > 31536000) {
        return interaction.reply({
            content: '❌ Invalid duration. Please use format like: 3days, 5h, 30min (max 1 year)',
            ephemeral: true
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].cooldown = duration
    await config.save()

    await interaction.reply({
        content: `✅ Cooldown set to **${formatDuration(duration)}**`,
        ephemeral: true
    })
}

async function handleActionCountModal(client, interaction) {
    const countInput = interaction.fields.getTextInputValue('count')
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    const count = parseInt(countInput)

    if (isNaN(count) || count < 1 || count > 99) {
        return interaction.reply({
            content: '❌ Invalid count. Please enter a number between 1 and 99.',
            ephemeral: true
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].actionCount = count
    await config.save()

    await interaction.reply({
        content: `✅ Action count set to **${count}**`,
        ephemeral: true
    })
}

async function handleTimeBetweenCustomModal(client, interaction) {
    const durationInput = interaction.fields.getTextInputValue('duration')
    const permissionKey = selectedPermissions.get(interaction.user.id)

    if (!permissionKey) {
        return interaction.reply({
            content: '❌ Please select a permission first.',
            ephemeral: true
        })
    }

    const duration = parseDuration(durationInput)

    if (!duration || duration < 60 || duration > 31536000) {
        return interaction.reply({
            content: '❌ Invalid duration. Please use format like: 3days, 5h, 30min (max 1 year)',
            ephemeral: true
        })
    }

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    config.permissions[permissionKey].timeBetweenActions = duration
    await config.save()

    await interaction.reply({
        content: `✅ Time between actions set to **${formatDuration(duration)}**`,
        ephemeral: true
    })
}

// ==================== HELPER FUNCTIONS ====================

function parseDuration(input) {
    input = input.toLowerCase().trim()
    
    // Remove spaces between number and unit
    input = input.replace(/\s+/g, '')
    
    // Match patterns like: 3days, 5h, 30min, 2months, 1year
    const patterns = [
        { regex: /^(\d+)\s*y(?:ear)?s?$/i, multiplier: 31536000 },
        { regex: /^(\d+)\s*mo(?:nth)?s?$/i, multiplier: 2592000 },
        { regex: /^(\d+)\s*d(?:ay)?s?$/i, multiplier: 86400 },
        { regex: /^(\d+)\s*h(?:our)?s?$/i, multiplier: 3600 },
        { regex: /^(\d+)\s*m(?:in)?(?:ute)?s?$/i, multiplier: 60 }
    ]
    
    for (const pattern of patterns) {
        const match = input.match(pattern.regex)
        if (match) {
            const value = parseInt(match[1])
            return value * pattern.multiplier
        }
    }
    
    return null
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''}`
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} month${Math.floor(seconds / 2592000) > 1 ? 's' : ''}`
    return `${Math.floor(seconds / 31536000)} year${Math.floor(seconds / 31536000) > 1 ? 's' : ''}`
}
