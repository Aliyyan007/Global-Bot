// Temporary command to clear Safe-Server restrictions
// Delete this file after clearing restrictions

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-restrictions')
        .setDescription('[TEMP] Clear all Safe-Server restrictions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    guildOnly: true, // Make it guild-specific for instant registration
    
    async execute(client, interaction) {
        // Owner only
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ Only the server owner can use this command.',
                ephemeral: true
            })
        }

        try {
            const config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
            
            if (!config) {
                return interaction.reply({
                    content: '❌ Safe-Server not configured.',
                    ephemeral: true
                })
            }

            const count = config.activeRestrictions.length
            
            console.log(`[Clear Restrictions] Found ${count} active restrictions:`)
            config.activeRestrictions.forEach((r, i) => {
                console.log(`  ${i + 1}. User: ${r.userId}, Actions: ${r.restrictedActions.join(', ')}`)
            })
            
            // Clear all restrictions
            config.activeRestrictions = []
            await config.save()

            await interaction.reply({
                content: `✅ Cleared ${count} active restriction(s).\n\n**What this did:**\n- Removed restriction entries from database\n- Cleared action tracking\n\n**What you need to do:**\n- Manually restore roles if needed\n- Test again by banning someone\n\n**Note:** You can delete this command file after use.`,
                ephemeral: true
            })

            console.log(`[Clear Restrictions] ✅ Successfully cleared ${count} restrictions for guild ${interaction.guild.id}`)
            
            // Also clear the action tracking
            if (client.safeServerTracker) {
                config.activeRestrictions.forEach(r => {
                    client.safeServerTracker.clearActions(interaction.guild.id, r.userId)
                })
                console.log('[Clear Restrictions] ✅ Cleared action tracking')
            }
        } catch (error) {
            console.error('[Clear Restrictions] Error:', error)
            await interaction.reply({
                content: '❌ Failed to clear restrictions: ' + error.message,
                ephemeral: true
            })
        }
    }
}
