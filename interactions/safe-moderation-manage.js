/**
 * Safe-Moderation Management Interactions
 * Handles restrictions and bot quarantine management
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('../handler/safeModerationLogger')
const log = logger.scope('SafeModManage')

// Routed via ss_manage_/ss_restore_/ss_approve_bot_/ss_kick_bot_ prefix —
// no `name` export so this helper isn't registered as a cmd{} interaction.
module.exports = {
    async execute(client, interaction) {
        // Owner-only check
        if (interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({
                content: '❌ Only the server owner can use this.'
            })
        }

        const customId = interaction.customId

        if (customId === 'ss_manage_restrictions') {
            await showRestrictions(client, interaction)
        } else if (customId === 'ss_manage_bots') {
            await showQuarantinedBots(client, interaction)
        } else if (customId.startsWith('ss_restore_')) {
            await handleRestore(client, interaction)
        } else if (customId.startsWith('ss_approve_bot_')) {
            await handleApproveBot(client, interaction)
        } else if (customId.startsWith('ss_kick_bot_')) {
            await handleKickBot(client, interaction)
        } else if (customId === 'ss_manage_back') {
            await showManagementPanel(client, interaction)
        }
    }
}

async function showRestrictions(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config || config.activeRestrictions.length === 0) {
        return interaction.update({
            content: '✅ No active restrictions.',
            embeds: [],
            components: []
        })
    }

    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🚨 Active Restrictions')
        .setDescription('Currently restricted moderators:')

    const components = []
    
    for (const restriction of config.activeRestrictions.slice(0, 5)) { // Limit to 5 for button space
        const expiresTimestamp = Math.floor(restriction.expiresAt.getTime() / 1000)
        
        embed.addFields({
            name: `<@${restriction.userId}>`,
            value: `**Reason**: ${restriction.reason}\n**Expires**: <t:${expiresTimestamp}:R>`,
            inline: false
        })

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ss_restore_${restriction.userId}`)
                    .setLabel(`Restore ${restriction.userId.slice(0, 8)}...`)
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            )
        
        components.push(row)
    }

    // Add back button
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_manage_back')
                .setLabel('Back to Management')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        )
    
    components.push(backRow)

    await interaction.update({
        embeds: [embed],
        components: components.slice(0, 5) // Discord limit
    })
}

async function showQuarantinedBots(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config || config.quarantinedBots.length === 0) {
        return interaction.update({
            content: '✅ No quarantined bots.',
            embeds: [],
            components: []
        })
    }

    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🤖 Quarantined Bots')
        .setDescription('Bots awaiting approval:')

    const components = []
    
    for (const bot of config.quarantinedBots.filter(b => !b.approved).slice(0, 3)) { // Limit to 3
        const addedTimestamp = Math.floor(bot.addedAt.getTime() / 1000)
        
        embed.addFields({
            name: `<@${bot.botId}>`,
            value: `**Added by**: <@${bot.addedBy}>\n**Added**: <t:${addedTimestamp}:R>`,
            inline: false
        })

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ss_approve_bot_${bot.botId}`)
                    .setLabel('Approve')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ss_kick_bot_${bot.botId}`)
                    .setLabel('Kick Bot')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
            )
        
        components.push(row)
    }

    // Add back button
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_manage_back')
                .setLabel('Back to Management')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        )
    
    components.push(backRow)

    await interaction.update({
        embeds: [embed],
        components: components.slice(0, 5) // Discord limit
    })
}

async function handleRestore(client, interaction) {
    const userId = interaction.customId.replace('ss_restore_', '')

    if (!client.safeModerationManager) {
        return interaction.reply({
            content: '❌ Safe-Moderation manager is not available.'
        })
    }

    await interaction.deferUpdate()

    await client.safeModerationManager.restoreModerator(interaction.guild.id, userId)

    await interaction.followUp({
        embeds: [
            new EmbedBuilder()
                .setColor(0x2ECC71)
                .setDescription(`✅ Restored <@${userId}> from restriction.`)
        ]
    })

    // Refresh the restrictions view
    setTimeout(() => showRestrictions(client, interaction), 1000)
}

async function handleApproveBot(client, interaction) {
    log.debug('[SafeModManage] 🔍 handleApproveBot called')
    log.debug('[SafeModManage]    - Interaction ID:', interaction.id)
    log.debug('[SafeModManage]    - Custom ID:', interaction.customId)
    log.debug('[SafeModManage]    - User:', interaction.user.tag)
    
    const botId = interaction.customId.replace('ss_approve_bot_', '')

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        log.debug('[SafeModManage] ❌ Config not found')
        return interaction.reply({
            content: '❌ Safe-Moderation is not configured.',
            ephemeral: true
        })
    }

    const quarantinedBot = config.quarantinedBots.find(b => b.botId === botId)
    if (!quarantinedBot) {
        log.debug('[SafeModManage] ❌ Bot not in quarantine')
        return interaction.reply({
            content: '❌ This bot is not in quarantine.',
            ephemeral: true
        })
    }

    log.debug('[SafeModManage] ✅ Deferring update...')
    await interaction.deferUpdate()

    log.debug('[SafeModManage] 🚀 Calling approveBot for bot:', botId)
    // Use the manager's approveBot method which handles thread deletion
    const result = await client.safeModerationManager.approveBot(
        interaction.guild,
        botId,
        config
    )

    log.debug('[SafeModManage] 📊 Result:', result)

    if (result.success) {
        log.debug('[SafeModManage] ✅ Bot approved successfully')
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setDescription(`✅ Bot <@${botId}> has been approved and released from quarantine.\n\n**Actions taken:**\n• Quarantine role removed from bot\n• Original roles restored to bot\n• Bot can now function normally`)
            ]
        })
    } else {
        log.debug('[SafeModManage] ❌ Bot approval failed:', result.message)
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setDescription(`❌ Failed to approve bot: ${result.message}`)
            ],
            ephemeral: true
        })
    }

    // Don't refresh automatically - user can click back button if needed
    log.debug('[SafeModManage] ✅ Approval complete - user can use back button to refresh')
}

async function handleKickBot(client, interaction) {
    const botId = interaction.customId.replace('ss_kick_bot_', '')

    await interaction.deferUpdate()

    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.followUp({
            content: '❌ Safe-Moderation is not configured.',
            ephemeral: true
        })
    }

    // Use the manager's rejectBot method which handles thread deletion
    const result = await client.safeModerationManager.rejectBot(
        interaction.guild,
        botId,
        config
    )

    if (result.success) {
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setDescription(`✅ Bot <@${botId}> has been kicked from the server.`)
            ]
        })
    } else {
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setDescription(`❌ Failed to kick bot: ${result.message}`)
            ],
            ephemeral: true
        })
    }

    // Refresh the bots view
    setTimeout(() => showQuarantinedBots(client, interaction), 1000)
}

async function showManagementPanel(client, interaction) {
    let config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.update({
            content: '❌ Safe-Moderation is not configured.',
            embeds: [],
            components: []
        })
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🛡️ Safe-Moderation Management')
        .setDescription('Manage active restrictions and quarantined bots')
        .addFields(
            { name: 'Active Restrictions', value: config.activeRestrictions.length.toString(), inline: true },
            { name: 'Quarantined Bots', value: config.quarantinedBots.filter(b => !b.approved).length.toString(), inline: true }
        )

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ss_manage_restrictions')
                .setLabel('View Restrictions')
                .setEmoji('🚨')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(config.activeRestrictions.length === 0),
            new ButtonBuilder()
                .setCustomId('ss_manage_bots')
                .setLabel('View Quarantined Bots')
                .setEmoji('🤖')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(config.quarantinedBots.filter(b => !b.approved).length === 0)
        )

    await interaction.update({
        embeds: [embed],
        components: [row]
    })
}
