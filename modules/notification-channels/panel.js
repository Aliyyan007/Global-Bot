/**
 * Notification Channels Panel (v2)
 *
 * Professional config UI for the manager-settings "Greet, Birthday,
 * Daily Reward… Channel" section.
 *
 * Design:
 *  - The overview dashboard stays in the main manager-settings message.
 *  - Each notification type opens an interactive EPHEMERAL page with a
 *    live preview of what members will actually see.
 *  - Every change edits the ephemeral page in place AND refreshes the
 *    overview embed on the main panel (tracked via mainPanelRefs).
 *  - A "Send test" button fires the real dispatcher so admins can see
 *    the actual notification in the configured channel.
 *  - All writes go through settingsSchemaManager (atomic $set + cache
 *    sync) and merge with the existing config — sibling fields are
 *    never wiped.
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
const { applyUserThumbnail } = require('./thumbnailProcessor')
const { resolveMessagePlaceholders } = require('./placeholders')

// level_up is intentionally absent — it has a dedicated picker under
// the "Channels" section of /manager-settings.
const TYPES = {
    birthday: { emoji: '🎂', label: 'Birthday', color: 0xFF69B4, thumbnail: true, memberCount: false, mentions: false },
    welcome: { emoji: '👋', label: 'Welcome', color: 0x57F287, thumbnail: true, memberCount: true, mentions: false },
    goodbye: { emoji: '🚪', label: 'Goodbye', color: 0xED4245, thumbnail: true, memberCount: true, mentions: true },
    daily_reward: { emoji: '🎁', label: 'Daily Reward', color: 0xFFD700, daily: true }
}
const TYPE_KEYS = Object.keys(TYPES)

/**
 * Tracks which public panel message an ephemeral config page belongs to.
 * Key: `${guildId}:${type}:${userId}` -> { channelId, messageId }
 * Ephemeral pages are short-lived; an in-memory map is enough and
 * degrades gracefully after a restart (config still saves, the main
 * panel just isn't live-refreshed).
 */
const mainPanelRefs = new Map()

function rememberMainPanel(interaction, type) {
    if (interaction.message?.ephemeral || !interaction.message?.id) return
    mainPanelRefs.set(`${interaction.guildId}:${type}:${interaction.user.id}`, {
        channelId: interaction.channelId,
        messageId: interaction.message.id
    })
}

function lang(client, interaction, textId) {
    return client.language({ textId, guildId: interaction.guildId, locale: interaction.locale })
}

function nc(customId, type) {
    return `nc{${customId}:${type}}`
}

// ============================================
// Preview rendering — mirrors notificationDispatcher output
// ============================================

function buildPreviewEmbeds(client, interaction, type, config, member, guild) {
    const L = (id) => lang(client, interaction, id)
    const enabled = config?.enabled === true && !!config?.channelId
    const resolved = resolveMessagePlaceholders(config?.customMessage || {}, member, guild, { level: 1 })
    const useCustom = config?.messageType === 'custom' && config?.customMessage
    const uid = member?.user?.id || member?.id || interaction.user.id
    const mention = `<@${uid}>`
    const avatar = member?.user?.displayAvatarURL?.({ dynamic: true, size: 256 }) || member?.displayAvatarURL?.({ dynamic: true, size: 256 })

    const contentLines = []

    if (!enabled) {
        contentLines.push(`_${L('Configure a channel and enable notifications to see the live preview.')}_`)
    } else if (type === 'welcome') {
        const showMc = config.showMemberCount !== false
        const welcomeContent = showMc
            ? `Welcome ${mention} **${guild.name}!** you're the ${guild.memberCount} member.`
            : `Welcome ${mention} **${guild.name}!**`
        contentLines.push(welcomeContent)
    } else if (type === 'goodbye') {
        const showMc = config.showMemberCount !== false
        const goodbyeText = showMc
            ? `Good Bye! ${mention} from **${guild.name}**! User Id Number ${uid} You are the ${guild.memberCount} lefty. 😔`
            : `Good Bye! ${mention} from **${guild.name}**! User Id Number ${uid} 😔`
        if (config.mentionEveryone) contentLines.push('@everyone')
        if (config.mentions?.length) contentLines.push(config.mentions.map(id => `<@&${id}>`).join(' '))
        contentLines.push(goodbyeText)
        if (useCustom && resolved.content) contentLines.push(resolved.content)
    } else if (type === 'birthday') {
        if (useCustom && resolved.content) contentLines.push(resolved.content)
        else contentLines.push(`Happy birthday ${mention} 🎉`)
    }

    const previewEmbed = new EmbedBuilder()
        .setColor(TYPES[type].color)
        .setAuthor({ name: `📨 ${L('Live preview')} — ${L(TYPES[type].label)}` })
    if (contentLines.length) previewEmbed.setDescription(contentLines.join('\n').slice(0, 4000))
    else previewEmbed.setDescription(`_${L('Nothing to show yet')}_`)

    const embeds = [previewEmbed]

    // The visual embed members will see (template or custom)
    if (enabled) {
        if (useCustom && resolved.embeds?.length) {
            try {
                const e = useCustom && config.thumbnailType === 'user_specific' && member?.user?.displayAvatarURL
                    ? applyUserThumbnail(resolved, member.user).embeds[0]
                    : resolved.embeds[0]
                embeds.push(EmbedBuilder.from(e))
            } catch { /* malformed stored embed — preview text still shows */ }
        } else if (type === 'welcome') {
            embeds.push(new EmbedBuilder()
                .setDescription(`# ♥ 【Welcome To ${guild.name}】 ♥\n###\n\`\`\`💙 A welcoming place where every voice matters and connections grow naturally.\`\`\``)
                .setColor(0x2F3136)
                .setThumbnail(avatar)
                .setImage('https://cdn.discordapp.com/attachments/1462115089330213139/1462616499087736973/Blue_and_Black_Futuristic_Welcome_Video.gif')
                .setFooter({ text: 'Stay Connected! 😀' }))
        } else if (type === 'birthday') {
            embeds.push(new EmbedBuilder()
                .setTitle('🎂 Happy Birthday!')
                .setDescription(`Happy birthday ${mention}! 🎉`)
                .setColor(0xFF69B4)
                .setThumbnail(avatar))
        } else if (type === 'goodbye') {
            const settings = client.cache?.settings?.get(guild.id)
            const profile = client.cache?.profiles?.get(guild.id + uid)
            const statsLine = `${client.config.emojis?.mic || '🎙'} ‎ ${(profile?.hours || 0).toFixed(2)} ‎ ‎ ${client.config.emojis?.message || '💬'} ‎ ${(profile?.messages || 0).toLocaleString()} ‎ ‎ ${settings?.displayCurrencyEmoji || '💎'} ‎ ${Math.floor(profile?.currency || 0).toLocaleString()} ‎ ‎ ${client.config.emojis?.RP || '⭐'} ‎ ${(profile?.rp || 0).toLocaleString()}`
            embeds.push(new EmbedBuilder()
                .setDescription(`# 🌸 【Community Update】\nㅤ\n**Left:** <t:${Math.floor(Date.now() / 1000)}:f>\n### 🏅 **Rank:** #1 ㅤ📈 **Level:** ${profile?.level || 1}\n\n\`\`\`A member recently left the server. Every presence here matters.\`\`\`\n\n### ${statsLine}`)
                .setColor(0x2F3136)
                .setThumbnail(avatar))
        }
    }
    return embeds
}

// ============================================
// Page rendering
// ============================================

async function renderOverview(client, interaction) {
    const L = (id) => lang(client, interaction, id)
    const embed = new EmbedBuilder()
        .setAuthor({ name: L('SETTINGS') })
        .setTitle(`🔔 ${L('Notification Channels')}`)
        .setColor(0x5865F2)
        .setDescription(`${L('Configure automated notification channels for your server')}\n\n${L('Select a notification type below to configure its channel, message, and options.')}`)

    const options = []
    for (const key of TYPE_KEYS) {
        const t = TYPES[key]
        const config = await getChannelConfig(interaction.guildId, key).catch(() => null)
        const enabled = config?.enabled === true
        const status = enabled && config.channelId ? `<#${config.channelId}>` : L('Not set')
        embed.addFields({
            name: `${t.emoji} ${L(t.label)}`,
            value: `${enabled ? '✅' : '❌'} ${status}`,
            inline: true
        })
        options.push({
            label: L(t.label),
            value: `nc_page_${key}`,
            emoji: t.emoji,
            description: enabled ? `${status === L('Not set') ? '⚠️ ' : ''}${L('Enabled')}` : L('Disabled')
        })
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(`cmd{manager-settings}title{notificationChannels}usr{${interaction.user.id}}`)
        .setPlaceholder(L('Select notification type to configure'))
        .setOptions(options)
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] }
}

async function renderTypePage(client, interaction, type, memberOverride) {
    const t = TYPES[type]
    if (!t) return null
    rememberMainPanel(interaction, type)
    const config = await getChannelConfig(interaction.guildId, type).catch(() => null) || {}
    const enabled = config.enabled === true
    const L = (id) => lang(client, interaction, id)
    const member = memberOverride
        || interaction.guild.members.cache.get(interaction.user.id)
        || await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
        || interaction.member
    const guild = interaction.guild

    const embed = new EmbedBuilder()
        .setAuthor({ name: L('SETTINGS') })
        .setTitle(`${t.emoji} ${L(t.label)} — ${enabled ? `✅ ${L('Enabled')}` : `❌ ${L('Disabled')}`}`)
        .setColor(t.color)

    if (t.daily) {
        embed.setDescription([
            `**${L('Channel')}:** ${config.channelId ? `<#${config.channelId}>` : L('Not set')}`,
            `**${L('Thread')}:** ${config.threadId ? `<#${config.threadId}>` : L('Not set')}`,
            config.createdAt ? `**${L('Created')}:** <t:${Math.floor(new Date(config.createdAt).getTime() / 1000)}:R>` : null,
            ``,
            `_${L('Creates a dedicated channel with a daily-rewards thread.')}_`
        ].filter(Boolean).join('\n'))
    } else {
        const lines = [
            `**${L('Channel')}:** ${config.channelId ? `<#${config.channelId}>` : L('Not set')}`,
            `**${L('Message')}:** ${config.messageType === 'custom' ? `📝 ${L('Custom')}` : `📄 ${L('Default template')}`}`
        ]
        if (t.thumbnail) lines.push(`**${L('Thumbnail')}:** ${config.thumbnailType === 'user_specific' ? `🧑 ${L('User avatar')}` : `🖼️ ${L('Default')}`}`)
        if (t.memberCount) lines.push(`**${L('Member Count')}:** ${config.showMemberCount !== false ? '✅' : '❌'}`)
        if (t.mentions) {
            const m = []
            if (config.mentionEveryone) m.push('@everyone')
            if (config.mentions?.length) m.push(...config.mentions.map(id => id === interaction.guildId ? '@everyone' : `<@&${id}>`))
            lines.push(`**${L('Mentions')}:** ${m.length ? m.join(', ') : L('None')}`)
        }
        embed.setDescription(lines.join('\n'))
    }

    const embeds = t.daily ? [embed] : [embed, ...buildPreviewEmbeds(client, interaction, type, config, member, guild)]

    const rows = []
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
        if (enabled && config.channelId) {
            btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('test', type)}usr{${interaction.user.id}}`)
                .setLabel(L('Send test'))
                .setStyle(ButtonStyle.Secondary).setEmoji('📨'))
        }
    }
    btns.push(new ButtonBuilder().setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('back', type)}usr{${interaction.user.id}}`)
        .setLabel(L('Back')).setStyle(ButtonStyle.Secondary).setEmoji('⬅️'))
    rows.push(new ActionRowBuilder().addComponents(btns))

    if (!t.daily) {
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('setchannel', type)}usr{${interaction.user.id}}`)
            .setPlaceholder(`📢 ${L('Select notification channel')}`)
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        if (config.channelId) {
            const existing = interaction.guild.channels.cache.get(config.channelId)
                || await interaction.guild.channels.fetch(config.channelId).catch(() => null)
            if (existing && existing.isTextBased()) channelSelect.setDefaultChannels(config.channelId)
        }
        rows.push(new ActionRowBuilder().addComponents(channelSelect))
    }

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
        // Pre-selected defaults per group require maxValues >= group count
        // (50035 COMPONENT_TOO_MANY_DEFAULT_VALUES otherwise).
        const optionGroups = 1 + (t.thumbnail ? 1 : 0) + (t.memberCount ? 1 : 0) + (t.mentions ? 1 : 0)
        rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('option', type)}usr{${interaction.user.id}}`)
            .setPlaceholder(`⚙️ ${L('Options')}`)
            .setMaxValues(optionGroups)
            .setOptions(opts.slice(0, 25))))
    }

    if (t.mentions) {
        const mentionSelect = new RoleSelectMenuBuilder()
            .setCustomId(`cmd{manager-settings}title{notificationChannels}${nc('mentions', type)}usr{${interaction.user.id}}`)
            .setPlaceholder(`📣 ${L('Roles to mention')} (${L('optional')})`)
            .setMinValues(0)
            .setMaxValues(5)
        if (config.mentions?.length) {
            const existing = interaction.guild.roles.cache
            const valid = config.mentions.filter(id => id !== interaction.guildId && existing.has(id)).slice(0, 5)
            if (valid.length) mentionSelect.setDefaultRoles(valid)
        }
        rows.push(new ActionRowBuilder().addComponents(mentionSelect))
    }

    return { embeds: embeds.slice(0, 10), components: rows.slice(0, 4) }
}

// ============================================
// Action handling
// ============================================

async function updateConfig(guildId, type, patch) {
    const existing = await getChannelConfig(guildId, type).catch(() => null) || {}
    const merged = { ...existing, ...patch }
    await saveChannelConfig(guildId, type, merged)
    return merged
}

/**
 * Re-render the overview on the public manager-settings message so the
 * status table reflects changes made inside the ephemeral page.
 */
async function refreshMainPanel(client, interaction, type, firstRow) {
    const ref = mainPanelRefs.get(`${interaction.guildId}:${type}:${interaction.user.id}`)
    if (!ref) return
    try {
        const channel = interaction.channel || await client.channels.fetch(ref.channelId).catch(() => null)
        const msg = await channel?.messages?.fetch(ref.messageId).catch(() => null)
        if (!msg) return
        const payload = await renderOverview(client, interaction)
        await msg.edit({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) })
    } catch { /* main panel gone or uneditable — page still updated */ }
}

async function handleAction(client, interaction, action, firstRow) {
    const [verb, type] = action.split(':')
    const t = TYPES[type]
    const guildId = interaction.guildId
    const L = (id) => lang(client, interaction, id)

    // Modal verbs need the raw (un-acked) interaction; everything else
    // defers immediately so slow DB reads can't outrun the 3s window.
    if (verb !== 'custommsg') {
        await interaction.deferUpdate().catch(() => null)
    }

    const respond = async (payload) => {
        if (!payload) return
        const body = { embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }
        if (interaction.replied || interaction.deferred) await interaction.editReply(body).catch(() => {})
        else await interaction.update(body).catch(() => {})
        await refreshMainPanel(client, interaction, type || 'welcome', firstRow)
    }

    if (!t && verb !== 'back') {
        const payload = await renderOverview(client, interaction).catch(() => null)
        if (payload) {
            if (interaction.replied || interaction.deferred) await interaction.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
            else await interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
        }
        return
    }

    switch (verb) {
        case 'back': {
            const payload = await renderOverview(client, interaction)
            if (interaction.replied || interaction.deferred) await interaction.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
            else await interaction.update({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
            return
        }

        case 'toggle': {
            const config = await getChannelConfig(guildId, type).catch(() => null) || {}
            if (!config.enabled && !config.channelId) {
                const payload = await renderTypePage(client, interaction, type)
                await respond(payload)
                return interaction.followUp({
                    content: `⚠️ ${L('Select a channel first, then enable')}`,
                    flags: ['Ephemeral']
                }).catch(() => {})
            }
            await updateConfig(guildId, type, { enabled: !config.enabled })
            const payload = await renderTypePage(client, interaction, type)
            return respond(payload)
        }

        case 'setchannel': {
            const channelId = interaction.values?.[0]
            if (!channelId) break
            // Verify the bot can actually post there before saving
            const channel = interaction.guild.channels.cache.get(channelId)
                || await interaction.guild.channels.fetch(channelId).catch(() => null)
            const perms = channel?.permissionsFor(interaction.guild.members.me)
            if (!channel || !perms?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                const payload = await renderTypePage(client, interaction, type)
                await respond(payload)
                return interaction.followUp({
                    content: `${client.config.emojis.NO} ${L("I don't have the required permissions in")} <#${channelId}> (${L('View Channel')}, ${L('Send Messages')}, ${L('Embed Links')})`,
                    flags: ['Ephemeral']
                }).catch(() => {})
            }
            const patch = { channelId }
            const existing = await getChannelConfig(guildId, type).catch(() => null) || {}
            if (!existing.enabled) patch.enabled = true
            await updateConfig(guildId, type, patch)
            const payload = await renderTypePage(client, interaction, type)
            return respond(payload)
        }

        case 'option': {
            const values = interaction.values || []
            if (!values.length) break
            const patch = {}
            for (const v of values) {
                if (v === 'msgtype_default') patch.messageType = 'default'
                else if (v === 'msgtype_custom') patch.messageType = 'custom'
                else if (v === 'thumb_static') patch.thumbnailType = 'static'
                else if (v === 'thumb_user_specific') patch.thumbnailType = 'user_specific'
                else if (v === 'mc_on') patch.showMemberCount = true
                else if (v === 'mc_off') patch.showMemberCount = false
                else if (v === 'me_on') patch.mentionEveryone = true
                else if (v === 'me_off') patch.mentionEveryone = false
            }
            if (!Object.keys(patch).length) break
            await updateConfig(guildId, type, patch)
            const payload = await renderTypePage(client, interaction, type)
            return respond(payload)
        }

        case 'mentions': {
            const roleIds = (interaction.values || []).slice(0, 5)
            await updateConfig(guildId, type, { mentions: roleIds })
            const payload = await renderTypePage(client, interaction, type)
            return respond(payload)
        }

        case 'test': {
            const config = await getChannelConfig(guildId, type).catch(() => null)
            if (!config?.enabled || !config?.channelId) {
                return interaction.followUp({ content: `⚠️ ${L('Enable notifications and pick a channel first')}`, flags: ['Ephemeral'] }).catch(() => {})
            }
            const dispatcher = require('./notificationDispatcher')
            const member = interaction.guild.members.cache.get(interaction.user.id)
                || await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
                || interaction.member
            if (!member) {
                return interaction.followUp({ content: `${client.config.emojis.NO} ${L('Could not resolve your member data')}`, flags: ['Ephemeral'] }).catch(() => {})
            }
            try {
                if (type === 'welcome') await dispatcher.sendWelcomeNotification(guildId, member, client)
                else if (type === 'birthday') await dispatcher.sendBirthdayNotification(guildId, member, client)
                else if (type === 'goodbye') {
                    const profile = client.cache?.profiles?.get(guildId + interaction.user.id)
                    const memberData = { username: interaction.user.username, displayName: member?.displayName, joinDate: member?.joinedAt || new Date(), rank: 1, level: profile?.level || 1 }
                    await dispatcher.sendGoodbyeNotification(guildId, member, memberData, client)
                }
            } catch (e) {
                return interaction.followUp({ content: `${client.config.emojis.NO} ${e.message}`, flags: ['Ephemeral'] }).catch(() => {})
            }
            return interaction.followUp({ content: `✅ ${L('Test notification sent to')} <#${config.channelId}>`, flags: ['Ephemeral'] }).catch(() => {})
        }

        case 'custommsg': {
            const existing = await getChannelConfig(guildId, type).catch(() => null) || {}
            const cm = existing.customMessage || {}
            const modal = new ModalBuilder()
                .setCustomId(`nc_modal_${type}_${interaction.id}`)
                .setTitle(`${L('Custom message')} — ${L(t.label)}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${L('Message content')} (${L('optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('content').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setValue(cm.content || '').setPlaceholder('{user} {mention} {server} {level} {membercount}')),
                    new LabelBuilder()
                        .setLabel(`${L('Embed title')} (${L('optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('title').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(256).setValue(cm.embeds?.[0]?.title || '')),
                    new LabelBuilder()
                        .setLabel(`${L('Embed description')} (${L('optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('description').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(4000).setValue(cm.embeds?.[0]?.description || '')),
                    new LabelBuilder()
                        .setLabel(`${L('Embed color')} (hex, ${L('optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('color').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setValue(cm.embeds?.[0]?.color ? '#' + cm.embeds[0].color.toString(16).padStart(6, '0') : '').setPlaceholder('#FFD700')),
                    new LabelBuilder()
                        .setLabel(`${L('Image URL')} (${L('optional')})`)
                        .setTextInputComponent(new TextInputBuilder().setCustomId('image').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setValue(cm.embeds?.[0]?.image?.url || '').setPlaceholder('https://…'))
                ])
            try {
                await interaction.showModal(modal)
                delete client.globalCooldown?.[`${guildId}_${interaction.user.id}`]
            } catch (e) {
                if (interaction.replied || interaction.deferred) await interaction.followUp({ content: `${client.config.emojis.NO} ${e.message}`, flags: ['Ephemeral'] }).catch(() => null)
                else await interaction.reply({ content: `${client.config.emojis.NO} ${e.message}`, flags: ['Ephemeral'] }).catch(() => null)
                return
            }
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
            await submitted.deferUpdate().catch(() => null)
            await updateConfig(guildId, type, {
                messageType: 'custom',
                customMessage: { content: args.content || undefined, embeds: embedData }
            })
            const payload = await renderTypePage(client, submitted, type)
            await submitted.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
            await refreshMainPanel(client, interaction, type, firstRow)
            return
        }

        case 'daily_setup': {
            await interaction.editReply({ components: [firstRow] }).catch(() => {})
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
            await interaction.editReply({ embeds: payload.embeds, components: [firstRow, ...payload.components].slice(0, 5) }).catch(() => {})
            return refreshMainPanel(client, interaction, type, firstRow)
        }

        case 'daily_remove': {
            await removeChannelConfig(guildId, type).catch(() => {})
            const payload = await renderTypePage(client, interaction, type)
            return respond(payload)
        }
    }

    // Fallback: re-render the page
    const payload = await renderTypePage(client, interaction, type).catch(() => null)
    if (payload) await respond(payload)
}

module.exports = { renderOverview, renderTypePage, handleAction, TYPES }
