/**
 * Notification Channels Panel
 * Self-contained config UI for the manager-settings "Level Up, Greet,
 * Birthday, Daily Reward… Channel" section.
 *
 * Renders an overview dashboard plus one config page per notification type.
 * All writes go through settingsSchemaManager (atomic $set + cache sync),
 * and every write merges with the existing config so sibling fields
 * (customMessage, mentions, showMemberCount…) are never wiped.
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    ChannelType,
    InteractionType
} = require('discord.js')
const { getChannelConfig, saveChannelConfig, removeChannelConfig } = require('./settingsSchemaManager')

const TYPES = {
    level_up: { emoji: '📈', label: 'Level Up', color: 0xFFD700, thumbnail: true, memberCount: false, mentions: false },
    birthday: { emoji: '🎂', label: 'Birthday', color: 0xFF69B4, thumbnail: true, memberCount: false, mentions: false },
    welcome: { emoji: '👋', label: 'Welcome', color: 0x57F287, thumbnail: true, memberCount: true, mentions: false },
    goodbye: { emoji: '🚪', label: 'Goodbye', color: 0xED4245, thumbnail: true, memberCount: true, mentions: true },
    daily_reward: { emoji: '🎁', label: 'Daily Reward', color: 0xFFD700, daily: true }
}
const TYPE_KEYS = Object.keys(TYPES)

function lang(client, interaction, textId) {
    return client.language({ textId, guildId: interaction.guildId, locale: interaction.locale })
}

function nc(customId, type) {
    return `nc{${customId}:${type}}`
}

// ============================================
// Rendering
// ============================================

async function renderOverview(client, interaction) {
    const embed = new EmbedBuilder()
        .setAuthor({ name: lang(client, interaction, 'SETTINGS') })
        .setTitle(`🔔 ${lang(client, interaction, 'Notification Channels')}`)
        .setColor(0x5865F2)
        .setDescription(
            `${lang(client, interaction, 'Configure automated notification channels for your server')}\n\n` +
            `${lang(client, interaction, 'Select a notification type below to configure its channel, message, and options.')}`
        )

    const options = []
    for (const key of TYPE_KEYS) {
        const t = TYPES[key]
        const config = await getChannelConfig(interaction.guildId, key).catch(() => null)
        const enabled = config?.enabled === true
        let status
        if (key === 'daily_reward') {
            status = enabled && config.channelId ? `<#${config.channelId}>` : lang(client, interaction, 'Not set')
        } else {
            status = enabled && config.channelId ? `<#${config.channelId}>` : lang(client, interaction, 'Not set')
        }
        embed.addFields({
            name: `${t.emoji} ${lang(client, interaction, t.label)}`,
            value: `${enabled ? '✅' : '❌'} ${status}`,
            inline: true
        })
        options.push({
            label: lang(client, interaction, t.label),
            value: `nc_page_${key}`,
            emoji: t.emoji,
            description: enabled ? `${status === lang(client, interaction, 'Not set') ? '⚠️ ' : ''}${lang(client, interaction, 'Enabled')}` : lang(client, interaction, 'Disabled')
        })
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(`cmd{manager-settings}title{notificationChannels}usr{${interaction.user.id}}`)
        .setPlaceholder(lang(client, interaction, 'Select notification type to configure'))
        .setOptions(options)
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] }
}

async function renderTypePage(client, interaction, type) {
    const t = TYPES[type]
    if (!t) return null
    const config = await getChannelConfig(interaction.guildId, type).catch(() => null) || {}
    const enabled = config.enabled === true
    const L = (id) => lang(client, interaction, id)

    const embed = new EmbedBuilder()
        .setAuthor({ name: L('SETTINGS') })
        .setTitle(`${t.emoji} ${L(t.label)}`)
        .setColor(t.color)

    if (t.daily) {
        const threadLine = config.threadId ? `<#${config.threadId}>` : L('Not set')
        embed.setDescription([
            `**${L('Status')}:** ${enabled ? `✅ ${L('Enabled')}` : `❌ ${L('Disabled')}`}`,
            `**${L('Channel')}:** ${config.channelId ? `<#${config.channelId}>` : L('Not set')}`,
            `**${L('Thread')}:** ${threadLine}`,
            config.createdAt ? `**${L('Created')}:** <t:${Math.floor(new Date(config.createdAt).getTime() / 1000)}:R>` : null
        ].filter(Boolean).join('\n'))
    } else {
        const custom = config.messageType === 'custom' && config.customMessage
        const preview = custom
            ? (config.customMessage.content || config.customMessage.embeds?.[0]?.description || config.customMessage.embeds?.[0]?.title || L('Not set'))
            : L('Default template')
        const lines = [
            `**${L('Status')}:** ${enabled ? `✅ ${L('Enabled')}` : `❌ ${L('Disabled')}`}`,
            `**${L('Channel')}:** ${config.channelId ? `<#${config.channelId}>` : L('Not set')}`,
            `**${L('Message')}:** ${config.messageType === 'custom' ? `📝 ${L('Custom')}` : `📄 ${L('Default template')}`}`
        ]
        if (custom) lines.push(`> ${String(preview).slice(0, 150)}`)
        if (t.thumbnail) lines.push(`**${L('Thumbnail')}:** ${config.thumbnailType === 'user_specific' ? `🖼️ ${L('User avatar')}` : `🖼️ ${L('Default')}`}`)
        if (t.memberCount) lines.push(`**${L('Member Count')}:** ${config.showMemberCount !== false ? '✅' : '❌'}`)
        if (t.mentions) {
            const m = []
            if (config.mentionEveryone) m.push('@everyone')
            if (config.mentions?.length) m.push(...config.mentions.map(id => id === interaction.guildId ? '@everyone' : `<@&${id}>`))
            lines.push(`**${L('Mentions')}:** ${m.length ? m.join(', ') : L('None')}`)
        }
        embed.setDescription(lines.join('\n'))
    }

    const rows = []

    // Row 1: main action buttons
    const btns = []
    if (t.daily) {
        btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('daily_setup', type)}usr{${interaction.user.id}}`)
            .setLabel(enabled ? L('Recreate') : L('Create channel'))
            .setStyle(ButtonStyle.Success).setEmoji('🎁'))
        if (config.channelId || config.enabled) {
            btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('daily_remove', type)}usr{${interaction.user.id}}`)
                .setLabel(L('Disable')).setStyle(ButtonStyle.Danger).setEmoji('🗑️'))
        }
    } else {
        btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('toggle', type)}usr{${interaction.user.id}}`)
            .setLabel(enabled ? L('Disable') : L('Enable'))
            .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(enabled ? '⛔' : '✅'))
        btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('custommsg', type)}usr{${interaction.user.id}}`)
            .setLabel(L('Custom message'))
            .setStyle(ButtonStyle.Primary).setEmoji('📝'))
    }
    btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('back', type)}usr{${interaction.user.id}}`)
        .setLabel(L('Back')).setStyle(ButtonStyle.Secondary).setEmoji('⬅️'))
    rows.push(new ActionRowBuilder().addComponents(btns))

    // Row 2: channel select (non-daily)
    if (!t.daily) {
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('setchannel', type)}usr{${interaction.user.id}}`)
            .setPlaceholder(`📢 ${L('Select notification channel')}`)
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        if (config.channelId) channelSelect.setDefaultChannels(config.channelId)
        rows.push(new ActionRowBuilder().addComponents(channelSelect))
    }

    // Row 3: options select (non-daily)
    if (!t.daily) {
        const opts = [
            { label: `${L('Message type')}: ${L('Default template')}`, value: 'msgtype_default', emoji: '📄', default: config.messageType !== 'custom' },
            { label: `${L('Message type')}: ${L('Custom')}`, value: 'msgtype_custom', emoji: '📝', default: config.messageType === 'custom' }
        ]
        if (t.thumbnail) {
            opts.push({ label: `${L('Thumbnail')}: ${L('Default')}`, value: 'thumb_static', emoji: '🖼️', default: config.thumbnailType !== 'user_specific' })
            opts.push({ label: `${L('Thumbnail')}: ${L('User avatar')}`, value: 'thumb_user_specific', emoji: '🧑', default: config.thumbnailType === 'user_specific' })
        }
        if (t.memberCount) {
            opts.push({ label: `${L('Member Count')}: ${L('On')}`, value: 'mc_on', emoji: '🔢', default: config.showMemberCount !== false })
            opts.push({ label: `${L('Member Count')}: ${L('Off')}`, value: 'mc_off', emoji: '🚫', default: config.showMemberCount === false })
        }
        if (t.mentions) {
            opts.push({ label: `${L('Mention everyone')}: ${L('On')}`, value: 'me_on', emoji: '📣', default: config.mentionEveryone === true })
            opts.push({ label: `${L('Mention everyone')}: ${L('Off')}`, value: 'me_off', emoji: '🔕', default: config.mentionEveryone !== true })
        }
        const optionsSelect = new StringSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('option', type)}usr{${interaction.user.id}}`)
            .setPlaceholder(`⚙️ ${L('Options')}`)
            .setOptions(opts.slice(0, 25))
        rows.push(new ActionRowBuilder().addComponents(optionsSelect))
    }

    // Row 4: role mentions (goodbye only)
    if (t.mentions) {
        const mentionSelect = new RoleSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('mentions', type)}usr{${interaction.user.id}}`)
            .setPlaceholder(`📣 ${L('Roles to mention')} (${L('optional')})`)
            .setMinValues(0)
            .setMaxValues(5)
        if (config.mentions?.length) {
            const valid = config.mentions.filter(id => id !== interaction.guildId).slice(0, 5)
            if (valid.length) mentionSelect.setDefaultRoles(valid)
        }
        rows.push(new ActionRowBuilder().addComponents(mentionSelect))
    }

    return { embeds: [embed], components: rows.slice(0, 5) }
}

// ============================================
// Action handling
// ============================================

/**
 * Merge a partial update into the stored config and persist atomically.
 */
async function updateConfig(guildId, type, patch) {
    const existing = await getChannelConfig(guildId, type).catch(() => null) || {}
    const merged = { ...existing, ...patch }
    await saveChannelConfig(guildId, type, merged)
    return merged
}

async function handleAction(client, interaction, action, firstRow) {
    const [verb, type] = action.split(':')
    const t = TYPES[type]
    const guildId = interaction.guildId
    if (!t && verb !== 'back') {
        const payload = await renderOverview(client, interaction).catch(() => null)
        if (!payload) return
        return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
    }

    switch (verb) {
        case 'back': {
            const payload = await renderOverview(client, interaction)
            return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components] })
        }

        case 'toggle': {
            const config = await getChannelConfig(guildId, type).catch(() => null) || {}
            if (!config.enabled && !config.channelId) {
                // Must pick a channel before enabling — flip the channel select to prompt
                const payload = await renderTypePage(client, interaction, type)
                await interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
                return interaction.followUp({
                    content: `⚠️ ${lang(client, interaction, 'Select a channel first, then enable')}`,
                    flags: ['Ephemeral']
                }).catch(() => {})
            }
            await updateConfig(guildId, type, { enabled: !config.enabled })
            const payload = await renderTypePage(client, interaction, type)
            return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }

        case 'setchannel': {
            const channelId = interaction.values?.[0]
            if (!channelId) break
            const patch = { channelId }
            // Auto-enable when a channel is picked for the first time
            const existing = await getChannelConfig(guildId, type).catch(() => null) || {}
            if (!existing.enabled) patch.enabled = true
            await updateConfig(guildId, type, patch)
            const payload = await renderTypePage(client, interaction, type)
            return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }

        case 'option': {
            const v = interaction.values?.[0]
            if (!v) break
            const patch = {}
            if (v === 'msgtype_default') patch.messageType = 'default'
            else if (v === 'msgtype_custom') patch.messageType = 'custom'
            else if (v === 'thumb_static') patch.thumbnailType = 'static'
            else if (v === 'thumb_user_specific') patch.thumbnailType = 'user_specific'
            else if (v === 'mc_on') patch.showMemberCount = true
            else if (v === 'mc_off') patch.showMemberCount = false
            else if (v === 'me_on') patch.mentionEveryone = true
            else if (v === 'me_off') patch.mentionEveryone = false
            else break
            await updateConfig(guildId, type, patch)
            const payload = await renderTypePage(client, interaction, type)
            return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }

        case 'mentions': {
            const roleIds = (interaction.values || []).slice(0, 5)
            await updateConfig(guildId, type, { mentions: roleIds })
            const payload = await renderTypePage(client, interaction, type)
            return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }

        case 'custommsg': {
            const existing = await getChannelConfig(guildId, type).catch(() => null) || {}
            const cm = existing.customMessage || {}
            const modal = new ModalBuilder()
                .setCustomId(`nc_modal_${type}_${interaction.id}`)
                .setTitle(`${lang(client, interaction, 'Custom message')} — ${lang(client, interaction, t.label)}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${lang(client, interaction, 'Message content')} (${lang(client, interaction, 'optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('content').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setValue(cm.content || '').setPlaceholder('{user} {mention} {server} {level} {membercount}')),
                    new LabelBuilder()
                        .setLabel(`${lang(client, interaction, 'Embed title')} (${lang(client, interaction, 'optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('title').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(256).setValue(cm.embeds?.[0]?.title || '')),
                    new LabelBuilder()
                        .setLabel(`${lang(client, interaction, 'Embed description')} (${lang(client, interaction, 'optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('description').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(4000).setValue(cm.embeds?.[0]?.description || '')),
                    new LabelBuilder()
                        .setLabel(`${lang(client, interaction, 'Embed color')} (hex, ${lang(client, interaction, 'optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('color').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setValue(cm.embeds?.[0]?.color ? '#' + cm.embeds[0].color.toString(16).padStart(6, '0') : '').setPlaceholder('#FFD700')),
                    new LabelBuilder()
                        .setLabel(`${lang(client, interaction, 'Image URL')} (${lang(client, interaction, 'optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('image').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setValue(cm.embeds?.[0]?.image?.url || '').setPlaceholder('https://…'))
                ])
            await interaction.showModal(modal)
            delete client.globalCooldown?.[`${guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `nc_modal_${type}_${interaction.id}` && i.user.id === interaction.user.id
            const submitted = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(() => null)
            if (!submitted || submitted.type !== InteractionType.ModalSubmit) return
            const args = {}
            submitted.fields.fields.each(f => args[f.customId] = f.value?.trim())
            const colorNum = args.color ? parseInt(args.color.replace('#', ''), 16) : undefined
            const embedData = (args.title || args.description || args.image || !Number.isNaN(colorNum) && colorNum !== undefined) ? [{
                title: args.title || undefined,
                description: args.description || undefined,
                color: Number.isNaN(colorNum) ? undefined : colorNum,
                image: args.image ? { url: args.image } : undefined
            }] : undefined
            await updateConfig(guildId, type, {
                messageType: 'custom',
                customMessage: { content: args.content || undefined, embeds: embedData }
            })
            const payload = await renderTypePage(client, submitted, type)
            return submitted.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }

        case 'daily_setup': {
            await interaction.update({ components: [] }).catch(() => {})
            try {
                const dailyRewardManager = require('./dailyRewardManager')
                const channel = await dailyRewardManager.createChannel(interaction, guildId)
                const { message, thread } = await dailyRewardManager.sendDailyRewardMessage(channel, client, guildId)
                await saveChannelConfig(guildId, type, {
                    enabled: true,
                    channelId: channel.id,
                    messageId: message.id,
                    threadId: thread.id,
                    threadUrl: thread.url,
                    threadName: 'Daily Rewards',
                    createdAt: new Date()
                })
            } catch (e) {
                const payload = await renderTypePage(client, interaction, type)
                await interaction.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
                return interaction.followUp({ content: `${client.config.emojis.NO} ${e.message}`, flags: ['Ephemeral'] }).catch(() => {})
            }
            const payload = await renderTypePage(client, interaction, type)
            return interaction.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }

        case 'daily_remove': {
            await removeChannelConfig(guildId, type).catch(() => {})
            const payload = await renderTypePage(client, interaction, type)
            return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        }
    }

    // Fallback: re-render the page
    const payload = await renderTypePage(client, interaction, type).catch(() => null)
    if (payload) {
        if (interaction.replied || interaction.deferred) return interaction.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
        return interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
    }
}

module.exports = { renderOverview, renderTypePage, handleAction, TYPES }
