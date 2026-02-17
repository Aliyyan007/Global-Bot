// Temporary command to clear Safe-Server restrictions
// Add this to your slash-commands folder temporarily

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-restrictions')
        .setDescription('[TEMP] Clear all Safe-Server restrictions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
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
            
            // Clear all restrictions
            config.activeRestrictions = []
            await config.save()

            await interaction.reply({
                content: `✅ Cleared ${count} active restriction(s).\n\n**Note:** This doesn't restore roles automatically. Roles will be restored on next restriction or you can manually assign them.`,
                ephemeral: true
            })

            console.log(`[Clear Restrictions] Cleared ${count} restrictions for guild ${interaction.guild.id}`)
        } catch (error) {
            console.error('[Clear Restrictions] Error:', error)
            await interaction.reply({
                content: '❌ Failed to clear restrictions: ' + error.message,
                ephemeral: true
            })
        }
    }
}
