/**
 * Safe-Server Management Interactions
 * Handles restrictions and bot quarantine management
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const safeServerSchema = require('../schemas/safeServerSchema')

module.exports = {
    name: 'safe-server-manage',
    
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
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
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
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
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

    if (!client.safeServerManager) {
        return interaction.reply({
            content: '❌ Safe-Server manager is not available.'
        })
    }

    await interaction.deferUpdate()

    await client.safeServerManager.restoreModerator(interaction.guild.id, userId)

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
    const botId = interaction.customId.replace('ss_approve_bot_', '')

    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.reply({
            content: '❌ Safe-Server is not configured.'
        })
    }

    const quarantinedBot = config.quarantinedBots.find(b => b.botId === botId)
    if (!quarantinedBot) {
        return interaction.reply({
            content: '❌ This bot is not in quarantine.'
        })
    }

    await interaction.deferUpdate()

    // Remove quarantine role
    const member = await interaction.guild.members.fetch(botId).catch(() => null)
    if (member && config.managedRoles?.botQuarantine) {
        await member.roles.remove(config.managedRoles.botQuarantine, 'Safe-Server: Bot approved').catch(console.error)
    }

    // Mark as approved
    quarantinedBot.approved = true
    await config.save()

    await interaction.followUp({
        embeds: [
            new EmbedBuilder()
                .setColor(0x2ECC71)
                .setDescription(`✅ Bot <@${botId}> has been approved and released from quarantine.`)
        ]
    })

    // Refresh the bots view
    setTimeout(() => showQuarantinedBots(client, interaction), 1000)
}

async function handleKickBot(client, interaction) {
    const botId = interaction.customId.replace('ss_kick_bot_', '')

    await interaction.deferUpdate()

    // Kick the bot
    const member = await interaction.guild.members.fetch(botId).catch(() => null)
    if (member) {
        await member.kick('Safe-Server: Bot rejected by owner').catch(console.error)
    }

    // Remove from quarantine list
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    if (config) {
        config.quarantinedBots = config.quarantinedBots.filter(b => b.botId !== botId)
        await config.save()
    }

    await interaction.followUp({
        embeds: [
            new EmbedBuilder()
                .setColor(0xE74C3C)
                .setDescription(`✅ Bot <@${botId}> has been kicked from the server.`)
        ]
    })

    // Refresh the bots view
    setTimeout(() => showQuarantinedBots(client, interaction), 1000)
}

async function showManagementPanel(client, interaction) {
    let config = await safeServerSchema.findOne({ guildID: interaction.guild.id })
    
    if (!config) {
        return interaction.update({
            content: '❌ Safe-Server is not configured.',
            embeds: [],
            components: []
        })
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🛡️ Safe-Server Management')
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
