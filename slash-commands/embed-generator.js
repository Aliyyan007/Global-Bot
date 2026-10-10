const { ChannelType, ButtonStyle, InteractionType, AttachmentBuilder, TextInputBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ModalBuilder, TextInputStyle, StringSelectMenuInteraction, Client, PermissionFlagsBits, Collection, ChannelSelectMenuBuilder, LabelBuilder } = require("discord.js")
const FieldRegexp = /field{(.*?)}/
const EmbedRegexp = /embed{(.*?)}/
const UserRegexp = /usr{(.*?)}/

// Undo/Redo History Management
// Structure: Map<userId, { history: Array, currentIndex: number, lastAIGeneration: Object, expiresAt: number }>
const embedHistory = new Map();
const HISTORY_LIMIT = 4; // Store up to 4 previous states
const HISTORY_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Save current embed state to history
 * @param {string} userId - User ID
 * @param {Array} embeds - Current embeds array
 * @param {string} content - Message content
 * @param {Object} aiGenInfo - AI generation info (optional, or 'clear' to clear)
 */
function saveToHistory(userId, embeds, content, aiGenInfo = null) {
    const now = Date.now();
    
    if (!embedHistory.has(userId)) {
        embedHistory.set(userId, {
            history: [],
            currentIndex: -1,
            lastAIGeneration: null,
            expiresAt: now + HISTORY_EXPIRY
        });
    }
    
    const userHistory = embedHistory.get(userId);
    
    // Remove any states after current index (when user makes new change after undo)
    if (userHistory.currentIndex < userHistory.history.length - 1) {
        userHistory.history = userHistory.history.slice(0, userHistory.currentIndex + 1);
    }
    
    // Determine AI generation info for this state
    let stateAIInfo = null;
    if (aiGenInfo === 'clear') {
        // Explicitly clearing AI generation
        stateAIInfo = null;
        userHistory.lastAIGeneration = null;
    } else if (aiGenInfo) {
        // New AI generation
        stateAIInfo = {
            description: aiGenInfo.description,
            imageChoice: aiGenInfo.imageChoice,
            imageDetails: aiGenInfo.imageDetails,
            guild: aiGenInfo.guild,
            regenerated: aiGenInfo.regenerated || false
        };
        userHistory.lastAIGeneration = stateAIInfo;
    }
    
    // Add new state
    const state = {
        embeds: JSON.parse(JSON.stringify(embeds.map(e => e.toJSON()))),
        content: content || null,
        timestamp: now,
        aiGeneration: stateAIInfo // Store AI info in the state itself
    };
    
    userHistory.history.push(state);
    
    // Keep only last HISTORY_LIMIT states
    if (userHistory.history.length > HISTORY_LIMIT) {
        userHistory.history.shift();
    } else {
        userHistory.currentIndex++;
    }
    
    // Update expiry
    userHistory.expiresAt = now + HISTORY_EXPIRY;
}

/**
 * Get history for user
 * @param {string} userId - User ID
 * @returns {Object|null} User history or null
 */
function getHistory(userId) {
    const userHistory = embedHistory.get(userId);
    if (!userHistory) return null;
    
    // Check if expired
    if (Date.now() > userHistory.expiresAt) {
        embedHistory.delete(userId);
        return null;
    }
    
    return userHistory;
}

/**
 * Undo to previous state
 * @param {string} userId - User ID
 * @returns {Object|null} Previous state or null
 */
function undo(userId) {
    const userHistory = getHistory(userId);
    if (!userHistory || userHistory.currentIndex <= 0) return null;
    
    userHistory.currentIndex--;
    return userHistory.history[userHistory.currentIndex];
}

/**
 * Redo to next state
 * @param {string} userId - User ID
 * @returns {Object|null} Next state or null
 */
function redo(userId) {
    const userHistory = getHistory(userId);
    if (!userHistory || userHistory.currentIndex >= userHistory.history.length - 1) return null;
    
    userHistory.currentIndex++;
    return userHistory.history[userHistory.currentIndex];
}

/**
 * Check if undo is available
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function canUndo(userId) {
    const userHistory = getHistory(userId);
    return userHistory && userHistory.currentIndex > 0;
}

/**
 * Check if redo is available
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function canRedo(userId) {
    const userHistory = getHistory(userId);
    return userHistory && userHistory.currentIndex < userHistory.history.length - 1;
}

/**
 * Check if regenerate is available (only once after AI generation)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
function canRegenerate(userId) {
    const userHistory = getHistory(userId);
    if (!userHistory || userHistory.currentIndex < 0) return false;
    
    const currentState = userHistory.history[userHistory.currentIndex];
    if (!currentState) return false;
    
    // Regenerate is available if:
    // 1. Current state has AI generation info
    // 2. AI generation has not been regenerated yet
    return !!(currentState.aiGeneration && !currentState.aiGeneration.regenerated);
}

/**
 * Mark AI generation as regenerated
 * @param {string} userId - User ID
 */
function markRegenerated(userId) {
    const userHistory = getHistory(userId);
    if (!userHistory || userHistory.currentIndex < 0) return;
    
    const currentState = userHistory.history[userHistory.currentIndex];
    if (currentState && currentState.aiGeneration) {
        currentState.aiGeneration.regenerated = true;
    }
    
    // Also update lastAIGeneration if it exists
    if (userHistory.lastAIGeneration) {
        userHistory.lastAIGeneration.regenerated = true;
    }
}

// Clean up expired histories every hour
setInterval(() => {
    const now = Date.now();
    for (const [userId, userHistory] of embedHistory.entries()) {
        if (now > userHistory.expiresAt) {
            embedHistory.delete(userId);
        }
    }
}, 60 * 60 * 1000);

/**
 * Resolve a Discord message link to { guild, channel, messageId }.
 * Works across servers — as long as the bot shares the source guild.
 * @returns {Promise<{guild, channel, messageId} | {error: string}>}
 */
async function resolveMessageLink(client, currentGuild, link) {
    const match = /channels\/(\d+)\/(\d+)\/(\d+)/.exec(link)
    if (!match) return { error: 'invalid_link' }
    const [, guildId, channelId, messageId] = match

    const guild = guildId === currentGuild.id
        ? currentGuild
        : await client.guilds.fetch(guildId).catch(() => null)
    if (!guild) return { error: 'guild_not_found' }

    const channel = await guild.channels.fetch(channelId).catch(() => null)
    if (!channel) return { error: 'channel_not_found', guild }

    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null)
    if (!botMember || !channel.permissionsFor(botMember).has("ViewChannel") || !channel.permissionsFor(botMember).has("ReadMessageHistory")) {
        return { error: 'no_perms', guild, channel }
    }

    return { guild, channel, messageId }
}

module.exports = {
    name: "embed-generator",
    nameLocalizations: {
        'ru': `embed-generator`,
        'uk': `embed-generator`,
        "es-ES": 'generador-de-embed'
    },
    description: `Embed generator`,
    descriptionLocalizations: {
        "ru": `Генератор эмбедов`,
        "uk": `Генератор ембедів`,
        "es-ES": `Generador de embeds`
    },
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    // Export history management functions
    saveToHistory,
    getHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    canRegenerate,
    markRegenerated,
    /**
     * @param { Client } client
     * @param { StringSelectMenuInteraction || ChannelSelectMenuBuilder } interaction
     */
    run: async (client, interaction) => {
        // Declare variables at the very top to avoid initialization errors
        let embedIndex = interaction.isChatInputCommand() ? 0 : EmbedRegexp.exec(interaction.customId) ? Number(EmbedRegexp.exec(interaction.customId)[1]) : 0
        let fieldIndex = interaction.isChatInputCommand() ? 0 : FieldRegexp.exec(interaction.customId) ? Number(FieldRegexp.exec(interaction.customId)[1]) : 0
        let message = interaction.message
        let embeds = message ? message.embeds.map(embed => EmbedBuilder.from(embed)) : []
        let content = message ? message.content : null
        
        // Handle initial command
        if (interaction.isChatInputCommand()) {
            const embed = new EmbedBuilder()
                .setDescription(`${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} 1`)
                .setColor("#2F3236")
            
            embeds = [embed]
            
            // Build components for initial command
            return buildAndSendComponents(client, interaction, embeds, content, embedIndex, fieldIndex, true);
        }
        
        // Check user permission
        if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`, 
                flags: ["Ephemeral"] 
            })
        }
        
        // Handle embed/field selector changes
        if (interaction.customId.includes("selectEmbed")) {
            embedIndex = +interaction.values[0]
            fieldIndex = 0
            // Continue to component assembly
        }
        
        if (interaction.customId.includes("selectField")) {
            fieldIndex = +interaction.values[0]
            // Continue to component assembly
        }
        
        // Handle Undo button
        if (interaction.customId.includes("undo")) {
            const previousState = undo(interaction.user.id);
            if (previousState) {
                // Restore previous state
                embeds = previousState.embeds.map(e => new EmbedBuilder(e));
                content = previousState.content;
                embedIndex = Math.min(embedIndex, embeds.length - 1);
                fieldIndex = 0;
                
                await interaction.deferUpdate();
                // Continue to component assembly
            } else {
                return interaction.reply({ content: `${client.config.emojis.NO} No previous state to undo!`, flags: ["Ephemeral"] });
            }
        }
        
        // Handle Redo button
        if (interaction.customId.includes("redo")) {
            const nextState = redo(interaction.user.id);
            if (nextState) {
                // Restore next state
                embeds = nextState.embeds.map(e => new EmbedBuilder(e));
                content = nextState.content;
                embedIndex = Math.min(embedIndex, embeds.length - 1);
                fieldIndex = 0;
                
                await interaction.deferUpdate();
                // Continue to component assembly
            } else {
                return interaction.reply({ content: `${client.config.emojis.NO} No next state to redo!`, flags: ["Ephemeral"] });
            }
        }
        
        // Handle Send button
        if (interaction.customId.includes("send")) {
            const components = JSON.parse(JSON.stringify(interaction.message.components))
            interaction.message.components.forEach(row => row.components.forEach(component => {
                component.data.disabled = true
            }))
            await interaction.update({ components: interaction.message.components })
            await interaction.followUp({ 
                content: `${client.language({ textId: "Select Channel/Thread to Send the Message", guildId: interaction.guildId, locale: interaction.locale })}`,
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ChannelSelectMenuBuilder()
                                .setCustomId(`embed-generator_channel_select`)
                                .setChannelTypes(ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement, ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PrivateThread, ChannelType.PublicThread)
                        ),
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`embed-generator_channel_cancel`)
                                .setLabel(client.language({ textId: "CANCEL", guildId: interaction.guildId, locale: interaction.locale }))
                                .setStyle(ButtonStyle.Danger)
                        )
                ],
                flags: ["Ephemeral"]
            })    
            const filter = (i) => i.customId.includes(`embed-generator_channel`) && i.user.id === interaction.user.id
            const interaction2 = await interaction.channel.awaitMessageComponent({ filter, time: 180000 }).catch(e => null)
            if (interaction2) {
                if (interaction2.customId === "embed-generator_channel_select") {
                    const channel = interaction2.channels.first()
                    const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null)
                    const perms = botMember ? channel.permissionsFor(botMember) : null
                    if (perms?.has(`ViewChannel`) && perms.has(`SendMessages`) && perms.has(`EmbedLinks`)) {
                        const message = await channel.send({ content: interaction.message.content || " ", embeds: interaction.message.embeds })
                        await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Message sent", guildId: interaction.guildId, locale: interaction.locale })}: ${message.url}`, components: [] }).catch(() => null)
                        return interaction.editReply({ components: components })
                    } else {
                        await interaction2.update({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Send messages", guildId: interaction.guildId, locale: interaction.locale })}\n3. ${client.language({ textId: "Embed links", guildId: interaction.guildId, locale: interaction.locale }) || "Embed links"}`, components: [] }).catch(() => null)
                        return interaction.editReply({ components: components })
                    }
                }
                if (interaction2.customId === "embed-generator_channel_cancel") {
                    await interaction2.update({ content: `${client.config.emojis.YES} ${client.language({ textId: "Selection cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] }).catch(() => null)
                    return interaction.editReply({ components: components })
                }
            } else {
                // Timeout after 3 minutes - restore the embed control panel
                return interaction.editReply({ components: components })
            }
            return // Early return only for send operation
        }
        
        // Handle Edit button
        if (interaction.customId.includes("edit")) {
            const modal = new ModalBuilder()
                .setCustomId(`embed-generator_edit_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Edit message", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ),
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `embed-generator_edit_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                const resolved = await resolveMessageLink(client, interaction.guild, modalArgs.link)
                const errMsg = resolved.error === 'invalid_link' ? client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })
                    : resolved.error === 'guild_not_found' ? (client.language({ textId: "I am not in the server this message is from", guildId: interaction.guildId, locale: interaction.locale }) || "I am not in the server this message is from")
                    : resolved.error === 'channel_not_found' ? client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })
                    : resolved.error === 'no_perms' ? `${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${resolved.channel.id}>${resolved.guild.id !== interaction.guildId ? ` (in ${resolved.guild.name})` : ''}\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`
                    : null
                if (errMsg) return interaction.reply({ content: `${client.config.emojis.NO} ${errMsg}`, flags: ["Ephemeral"] })
                const { channel, messageId } = resolved
                const message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                if (!message) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (message.author.id !== client.user.id) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This is not my message", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                await message.edit({ content: interaction.message.content, embeds: interaction.message.embeds })
                return interaction.deferUpdate()
            } else return
        }
        
        // Handle Copy JSON button
        if (interaction.customId.includes("copy_json")) {
            const json = []
            for (const embed of interaction.message.embeds) {
                json.push(embed.toJSON())  
            }
            const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(json, null, 2), 'utf-8'), { name: `${interaction.message.id}.json` })
            return interaction.reply({ files: [attachment], flags: ["Ephemeral"] })
        }
        
        // Handle Copy Message button
        if (interaction.customId.includes("copy_message")) {
            const modal = new ModalBuilder()
                .setCustomId(`embed-generator_copy_${interaction.id}`)
                .setTitle(`${client.language({ textId: "Copy message", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ),
                ])
            await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
            const filter = (i) => i.customId === `embed-generator_copy_${interaction.id}` && i.user.id === interaction.user.id
            interaction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => interaction)
            if (interaction && interaction.isModalSubmit()) {
                const modalArgs = {}
                interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                const resolved = await resolveMessageLink(client, interaction.guild, modalArgs.link)
                if (resolved.error === 'invalid_link') return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (resolved.error === 'guild_not_found') return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I am not in the server this message is from", guildId: interaction.guildId, locale: interaction.locale }) || "I am not in the server this message is from"}`, flags: ["Ephemeral"] })
                if (resolved.error === 'channel_not_found') return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                if (resolved.error === 'no_perms') {
                    const crossTag = resolved.guild.id !== interaction.guildId ? ` (in ${resolved.guild.name})` : ''
                    return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${resolved.channel.id}>${crossTag}\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
                const { channel, messageId } = resolved
                
                // Save current state to history before copying
                const currentEmbeds = interaction.message.embeds.map(e => new EmbedBuilder(e.toJSON()));
                saveToHistory(interaction.user.id, currentEmbeds, interaction.message.content);
                
                message = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                if (!message) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                
                embeds = message.embeds.map(embed => EmbedBuilder.from(embed))
                content = message.content
                
                // A message with no embeds would leave embeds[] empty and the
                // generator UI assumes embeds[0] always exists — bail early.
                if (!embeds.length) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "That message has no embeds to copy", guildId: interaction.guildId, locale: interaction.locale }) || "That message has no embeds to copy"}`, flags: ["Ephemeral"] })
                
                // Save new state to history (clear AI generation info when copying)
                saveToHistory(interaction.user.id, embeds, content, 'clear');
                
                await interaction.deferUpdate()
                // Continue to component assembly
            } else return
        }
        
        // Handle quick actions menu button (when fields exist)
        if (interaction.customId.includes("quick_actions_menu")) {
            // Show ephemeral message with quick action buttons
            const quickActionButtons = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} upload_json_btn`)
                    .setLabel(`${client.language({ textId: "Upload JSON", guildId: interaction.guildId, locale: interaction.locale }) || "Upload JSON"}`)
                    .setEmoji("📤")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} paste_json_btn`)
                    .setLabel(`${client.language({ textId: "Paste JSON", guildId: interaction.guildId, locale: interaction.locale }) || "Paste JSON"}`)
                    .setEmoji(client.config.emojis.paste)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_message_btn`)
                    .setLabel(`${client.language({ textId: "Copy", guildId: interaction.guildId, locale: interaction.locale }) || "Copy"}`)
                    .setEmoji(client.config.emojis.copy)
                    .setStyle(ButtonStyle.Secondary)
            ]);
            
            const quickActionButtons2 = new ActionRowBuilder().addComponents([
                new ButtonBuilder()
                    .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} edit_embed_btn`)
                    .setLabel(`${client.language({ textId: "Edit", guildId: interaction.guildId, locale: interaction.locale }) || "Edit"}`)
                    .setEmoji(client.config.emojis.edit)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} reset_embed_btn`)
                    .setLabel(`${client.language({ textId: "Reset", guildId: interaction.guildId, locale: interaction.locale }) || "Reset"}`)
                    .setEmoji("🔄")
                    .setStyle(ButtonStyle.Danger)
            ]);
            
            return interaction.reply({
                content: `${client.language({ textId: "Quick Actions", guildId: interaction.guildId, locale: interaction.locale }) || "Quick Actions"}:`,
                components: [quickActionButtons, quickActionButtons2],
                flags: ["Ephemeral"]
            });
        }
        
        // Handle quick action button clicks
        if (interaction.customId.includes("upload_json_btn")) {
            interaction.customId = interaction.customId.replace("upload_json_btn", "");
            interaction.values = ["upload_json"];
            interaction.isStringSelectMenu = () => true;
        }
        if (interaction.customId.includes("paste_json_btn")) {
            interaction.customId = interaction.customId.replace("paste_json_btn", "");
            interaction.values = ["paste_json"];
            interaction.isStringSelectMenu = () => true;
        }
        if (interaction.customId.includes("copy_message_btn")) {
            interaction.customId = interaction.customId.replace("copy_message_btn", "");
            interaction.values = ["copy_message_menu"];
            interaction.isStringSelectMenu = () => true;
        }
        if (interaction.customId.includes("edit_embed_btn")) {
            interaction.customId = interaction.customId.replace("edit_embed_btn", "");
            interaction.values = ["edit_embed_direct"];
            interaction.isStringSelectMenu = () => true;
        }
        if (interaction.customId.includes("reset_embed_btn")) {
            interaction.customId = interaction.customId.replace("reset_embed_btn", "");
            interaction.values = ["reset_embed"];
            interaction.isStringSelectMenu = () => true;
        }
        
        // Handle Paste button
        if (interaction.customId.includes("paste")) {
            const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe().catch(() => null)
            const chanPerms = botMember ? interaction.channel.permissionsFor(botMember) : null
            if (!chanPerms?.has("ViewChannel") || !chanPerms.has("ReadMessageHistory") || !chanPerms.has("ManageMessages")) {
                return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${interaction.channel.id}>\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}\n3. ${client.language({ textId: "Manage messages", guildId: interaction.guildId, locale: interaction.locale }) || "Manage messages"}`, flags: ["Ephemeral"] })
            }
            const components = JSON.parse(JSON.stringify(message.components))
            await interaction.update({ embeds: message.embeds, components: [] })
            const filter = m => m.author.id == interaction.user.id && m.channel.id == interaction.channel.id
            const message1 = await interaction.followUp({ content: `${client.config.emojis.exc} ${client.language({ textId: "Send file in embed JSON format", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "To cancel type", guildId: interaction.guildId, locale: interaction.locale })}: cancel` })
            const attachment = await waitingForAttachment(client, interaction, filter)
            message1.delete().catch(e => null)
            if (attachment) {
                const fetch = require("node-fetch")
                await fetch(attachment.url)
                .then(res => res.buffer())
                .then(buffer => {
                    let parsed
                    try {
                        parsed = JSON.parse(buffer.toString())
                    } catch (err) {
                        interaction.editReply({ embeds: message.embeds, components: components })
                        return interaction.followUp({ content: err.message, flags: ["Ephemeral"] })
                    }
                    
                    // Save current state to history before pasting
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    if (Array.isArray(parsed)) embeds = parsed.map(embed => EmbedBuilder.from(embed))
                    else embeds = [EmbedBuilder.from(parsed)]
                    embedIndex = 0
                    fieldIndex = 0
                    
                    // Save new state to history after pasting (clear AI generation info)
                    saveToHistory(interaction.user.id, embeds, content, 'clear');
                })
            } else {
                return interaction.editReply({ embeds: message.embeds, components: components })
            }
            // Continue to component assembly
        }
        
        // Validate embed index
        if (!message.embeds[embedIndex]) {
            return interaction.reply({ content: `${client.language({ textId: "Embed with index", guildId: interaction.guildId, locale: interaction.locale })} ${embedIndex} ${client.language({ textId: "missing", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        
        // Handle String Select Menu interactions
        if (interaction.isStringSelectMenu()) {
            const selectedValue = interaction.values[0];
            
            // Handle Add Embed
            if (selectedValue == "AddEmbed") {
                // Save current state to history before adding new embed
                saveToHistory(interaction.user.id, embeds, content);
                
                const embed = new EmbedBuilder()
                    .setDescription(`${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} ${embeds.length + 1}`)
                    .setColor("#2F3236")
                embeds.push(embed)
                
                // Save new state to history after adding embed
                saveToHistory(interaction.user.id, embeds, content);
                
                // Continue to component assembly
            }
            
            // Handle Delete Embed
            else if (selectedValue == "DelEmbed") {
                // Save current state to history before deleting embed
                saveToHistory(interaction.user.id, embeds, content);
                
                embeds.splice(embedIndex, 1)
                embedIndex = embedIndex === 0 ? 0 : embedIndex - 1
                
                // Save new state to history after deleting embed
                saveToHistory(interaction.user.id, embeds, content);
                
                // Continue to component assembly
            }
            
            // Handle Content edit
            else if (selectedValue === "content") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}} content`)
                    .setTitle(`${client.language({ textId: "Message content", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Text", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("content")
                                    .setRequired(false)
                                    .setMaxLength(2000)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(content || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}} content` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    // Save current state to history before updating content
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (modalArgs.content.length) content = modalArgs.content
                    else content = null
                    
                    // Save new state to history after updating content
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    // Continue to component assembly
                } else return
            }
            
            // Handle Body edit (title, description, URL, color)
            else if (selectedValue === "body") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} body`)
                    .setTitle(`${client.language({ textId: "Embed body", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Title", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("title")
                                    .setRequired(false)
                                    .setMaxLength(256)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.title || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: `Title URL`, guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("url")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(embeds[embedIndex].data.url || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Description", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("description")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.description?.slice(0, 4000) || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Border color", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("color")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(`${embeds[embedIndex].data.color?.toString(16)}` || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} body` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.description.length && !modalArgs.title.length && !embeds[embedIndex].data.author && !embeds[embedIndex].data.footer && !embeds[embedIndex].data.fields?.[0] && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.description.length) embeds[embedIndex].setDescription(modalArgs.description)
                        else embeds[embedIndex].data.description = null
                        if (modalArgs.title.length) embeds[embedIndex].setTitle(modalArgs.title)
                        else embeds[embedIndex].data.title = null
                        if (modalArgs.url.length) {
                            const validUrl = require('valid-url')
                            if (validUrl.isUri(modalArgs.url)) embeds[embedIndex].setURL(modalArgs.url)
                            else {
                                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.url}** ${client.language({ textId: "is not a link", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }  
                        } else embeds[embedIndex].data.url = null
                        if (modalArgs.color) {
                            if (modalArgs.color.length && /^#[0-9A-F]{6}$/i.test(modalArgs.color)) embeds[embedIndex].setColor(modalArgs.color)
                            else embeds[embedIndex].setColor("#2F3236")
                        } else embeds[embedIndex].setColor("#2F3236")
                    }
                    // Continue to component assembly
                } else return
            }
            
            // Handle Images edit (thumbnail, image)
            else if (selectedValue === "images") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} images`)
                    .setTitle(`${client.language({ textId: "Images", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("thumbnail")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.thumbnail?.url || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Image", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("image")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.image?.url || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} images` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!embeds[embedIndex].data.footer && !embeds[embedIndex].data.title && !embeds[embedIndex].data.author && !embeds[embedIndex].data.description && !embeds[embedIndex].data.fields?.[0] && !modalArgs.image && !modalArgs.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.thumbnail.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.thumbnail)
                            if (image) embeds[embedIndex].setThumbnail(modalArgs.thumbnail)
                            else {
                                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.thumbnail}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                        } else embeds[embedIndex].data.thumbnail = null
                        if (modalArgs.image.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.image)
                            if (image) embeds[embedIndex].setImage(modalArgs.image)
                            else {
                                if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
                                await interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.image}** ${client.language({ textId: "is not a direct link to an image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                            }
                        } else embeds[embedIndex].data.image = null    
                    }
                    // Continue to component assembly
                } else return
            }
            
            // Handle Author edit (header)
            else if (selectedValue === "author") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} author`)
                    .setTitle(`${client.language({ textId: "Header", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Header - Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(256)
                                    .setValue(embeds[embedIndex].data.author?.name || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Header - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("icon")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.author?.iconURL || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("url")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(embeds[embedIndex].data.author?.url || "")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} author` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.name.length && !embeds[embedIndex].data.title && !embeds[embedIndex].data.footer && !embeds[embedIndex].data.description && !embeds[embedIndex].data.fields?.[0] && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.name.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.icon)
                            const validUrl = require('valid-url')
                            const object = {}
                            object["name"] = modalArgs.name
                            if (image) object["iconURL"] = modalArgs.icon
                            else if (modalArgs.icon.length && embeds[embedIndex].data.author?.icon_url) object["iconURL"] = embeds[embedIndex].data.author.icon_url
                            if (validUrl.isUri(modalArgs.url)) object["url"] = modalArgs.url
                            else if (modalArgs.url.length && embeds[embedIndex].data.author?.url) object["url"] = embeds[embedIndex].data.author.url
                            embeds[embedIndex].setAuthor(object) 
                        } else embeds[embedIndex].setAuthor(null)
                    }
                    // Continue to component assembly
                } else return
            }
            
            // Handle Footer edit
            else if (selectedValue === "footer") {
                const { format } = require('date-format-parse')
                const { parse } = require('date-format-parse')
                const date = format(new Date(embeds[embedIndex].data.timestamp), 'DD-MM-YYYY HH:mm')
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} footer`)
                    .setTitle(`${client.language({ textId: "Footer", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Footer - Text", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("text")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(2048)
                                    .setValue(embeds[embedIndex].data.footer?.text || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Footer - Icon", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("icon")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(embeds[embedIndex].data.footer?.iconURL || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Timestamp", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("timestamp")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(embeds[embedIndex].data.timestamp ? date : "")
                                    .setPlaceholder("28-07-2022 16:57")
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} footer` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    if (!modalArgs.text.length && !embeds[embedIndex].data.title && !embeds[embedIndex].data.author && !embeds[embedIndex].data.description && !embeds[embedIndex].data.fields?.[0] && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                        await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                    } else {
                        if (modalArgs.text.length) {
                            const isImageURL = require('image-url-validator').default
                            const image = await isImageURL(modalArgs.icon)
                            const validUrl = require('valid-url')
                            const object = {}
                            object["text"] = modalArgs.text
                            if (image) object["iconURL"] = modalArgs.icon
                            else if (modalArgs.icon.length && embeds[embedIndex].data.footer?.icon_url) object["iconURL"] = embeds[embedIndex].data.footer.icon_url
                            const date = parse(modalArgs.timestamp, 'DD-MM-YYYY HH:mm')
                            if(!isNaN(date.getTime())) embeds[embedIndex].setTimestamp(date)
                            else embeds[embedIndex].setTimestamp(null)
                            embeds[embedIndex].setFooter(object) 
                        } else {
                            const { parse } = require('date-format-parse')
                            const date = parse(modalArgs.timestamp, 'DD-MM-YYYY HH:mm')
                            if(!isNaN(date.getTime())) embeds[embedIndex].setTimestamp(date)
                            else embeds[embedIndex].setTimestamp(null)
                            embeds[embedIndex].setFooter(null)
                        }
                    }
                    // Continue to component assembly
                } else return
            }
            
            // Handle Add Field
            else if (selectedValue === "AddField") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} addField`)
                    .setTitle(`${client.language({ textId: "Add field", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(256)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Value", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("value")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(1024)
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "In one line", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("inline")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setValue("false")
                                    .setPlaceholder(`true || false`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} addField` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    // Save current state to history before adding field
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    embeds[embedIndex].addFields([
                        { name: modalArgs.name, value: modalArgs.value, inline: modalArgs.inline === "true" ? true : false }
                    ])
                    
                    // Save new state to history after adding field
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    // Continue to component assembly
                } else return
            }
            
            // Handle Delete Field
            else if (selectedValue === "DelField") {
                if (!embeds[embedIndex].data.footer && !embeds[embedIndex].data.title && !embeds[embedIndex].data.author && !embeds[embedIndex].data.description && embeds[embedIndex].data.fields?.length === 1 && !embeds[embedIndex].data.image && !embeds[embedIndex].data.thumbnail) {
                    if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
                    await interaction.followUp({ content: `${client.language({ textId: "One of the fields must be filled: Description, title, header, footer, field, image, thumbnail", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                } else {
                    // Save current state to history before deleting field
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    embeds[embedIndex].spliceFields(fieldIndex, 1)
                    fieldIndex = fieldIndex > 0 ? fieldIndex - 1 : 0
                    
                    // Save new state to history after deleting field
                    saveToHistory(interaction.user.id, embeds, content);
                }
                // Continue to component assembly
            }
            
            // Handle Edit Field
            else if (selectedValue === "editField") {
                const modal = new ModalBuilder()
                    .setCustomId(`msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} editField`)
                    .setTitle(`${client.language({ textId: "Change field", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Name", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("name")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(256)
                                    .setValue(embeds[embedIndex].data.fields?.[fieldIndex].name || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Value", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("value")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setMaxLength(1024)
                                    .setValue(embeds[embedIndex].data.fields?.[fieldIndex].value || "")
                            ),
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "In one line", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("inline")
                                    .setRequired(false)
                                    .setStyle(TextInputStyle.Short)
                                    .setMinLength(4)
                                    .setMaxLength(5)
                                    .setValue(`${embeds[embedIndex].data.fields?.[fieldIndex].inline || "false"}`)
                                    .setPlaceholder(`true || false`)
                            ),
                    ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `msg{${message.id}}embed{${embedIndex}}field{${fieldIndex}} editField` && i.user.id === interaction.user.id
                interaction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    // Save current state to history before editing field
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    const modalArgs = {}
                    interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    embeds[embedIndex].data.fields[fieldIndex].name = modalArgs.name
                    embeds[embedIndex].data.fields[fieldIndex].value = modalArgs.value
                    embeds[embedIndex].data.fields[fieldIndex].inline = modalArgs.inline === "true" ? true : false
                    
                    // Save new state to history after editing field
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    // Continue to component assembly
                } else return
            }
            
            // Quick Actions - these were duplicated, now integrated into the main menu
            // Note: separator values are ignored (they're just visual separators)
            else if (selectedValue === "separator_1") {
                // Ignore separator selection, just continue to component assembly
            }
            
            // Handle Upload JSON
            else if (selectedValue === "upload_json") {
                const components = JSON.parse(JSON.stringify(interaction.message.components))
                await interaction.update({ embeds: interaction.message.embeds, components: [] })
                
                const filter = m => m.author.id === interaction.user.id && m.channel.id === interaction.channel.id
                const message1 = await interaction.followUp({ content: `## 📤  Upload JSON File\n\`\`\`Please upload your JSON file in this channel within 3 minutes\`\`\`\n> To cancel enter: **cancel**` })
                
                const attachment = await waitingForAttachment(client, interaction, filter)
                message1.delete().catch(e => null)
                
                if (attachment) {
                    const fetch = require("node-fetch")
                    try {
                        const response = await fetch(attachment.url)
                        const buffer = await response.buffer()
                        const parsed = JSON.parse(buffer.toString())
                        
                        // Save current state to history before updating
                        saveToHistory(interaction.user.id, embeds, content);
                        
                        if (Array.isArray(parsed)) {
                            embeds = parsed.map(embed => EmbedBuilder.from(embed))
                        } else if (parsed.embed) {
                            embeds = [EmbedBuilder.from(parsed.embed)]
                        } else if (parsed.embeds && Array.isArray(parsed.embeds)) {
                            embeds = parsed.embeds.map(embed => EmbedBuilder.from(embed))
                        } else {
                            embeds = [EmbedBuilder.from(parsed)]
                        }
                        
                        // Save new state to history (clear AI generation info when uploading JSON)
                        saveToHistory(interaction.user.id, embeds, content, 'clear');
                        
                        await interaction.followUp({ content: `${client.config.emojis.YES} JSON file loaded successfully!`, flags: ["Ephemeral"] })
                    } catch (err) {
                        await interaction.followUp({ content: `${client.config.emojis.NO} Failed to parse JSON: ${err.message}`, flags: ["Ephemeral"] })
                    }
                }
                // Continue to component assembly
            }
            
            // Handle Paste JSON
            else if (selectedValue === "paste_json") {
                const modal = new ModalBuilder()
                    .setCustomId(`embed-generator_paste_json_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Paste JSON", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel("Embed JSON Code")
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("json_code")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder('{"title": "My Embed", "description": "Description here", "color": 5814783}')
                            ),
                    ])
                await interaction.showModal(modal)
                delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                
                const filter = (i) => i.customId === `embed-generator_paste_json_${interaction.id}` && i.user.id === interaction.user.id
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 600000 }).catch(e => null)
                
                if (modalInteraction && modalInteraction.isModalSubmit()) {
                    await modalInteraction.deferReply({ flags: ["Ephemeral"] })
                    
                    const modalArgs = {}
                    modalInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    let jsonCode = modalArgs.json_code
                    
                    let parsed = null
                    let parseError = null
                    
                    try {
                        parsed = JSON.parse(jsonCode)
                    } catch (err) {
                        parseError = err.message
                        console.log('[Paste JSON] Parse error, attempting AI correction:', parseError)
                        
                        // Try to use AI to correct the JSON
                        const apiKey = process.env.GROQ_API_KEY
                        if (apiKey) {
                            try {
                                const Groq = require('groq-sdk')
                                const { callGroq } = require('../handler/aiEmbedGenerator')
                                const groq = new Groq({ apiKey })
                                
                                const systemPrompt = `You are a JSON validator and corrector for Discord embeds. Your job is to fix malformed JSON and return ONLY valid JSON.

RULES:
1. Return ONLY valid JSON - no explanations, no markdown, no extra text
2. Fix common errors: missing quotes, trailing commas, wrong brackets
3. Ensure the JSON represents a valid Discord embed structure
4. If it's an array of embeds, keep it as an array
5. If it's a single embed, keep it as an object
6. Preserve all user data - only fix syntax errors

Common Discord embed fields:
- title (string)
- description (string)
- color (number)
- fields (array of {name, value, inline})
- thumbnail (object with url)
- image (object with url)
- author (object with name, icon_url)
- footer (object with text, icon_url)

Return ONLY the corrected JSON.`

                                const chatCompletion = await callGroq(groq, {
                                    messages: [
                                        { role: "system", content: systemPrompt },
                                        { role: "user", content: `Fix this malformed JSON:\n\n${jsonCode}` }
                                    ],
                                    temperature: 0.1,
                                    max_tokens: 2048
                                })
                                
                                let aiResponse = chatCompletion.choices[0].message.content.trim()
                                
                                // Remove markdown code blocks if present
                                if (aiResponse.startsWith("```json")) {
                                    aiResponse = aiResponse.substring(7)
                                }
                                if (aiResponse.startsWith("```")) {
                                    aiResponse = aiResponse.substring(3)
                                }
                                if (aiResponse.endsWith("```")) {
                                    aiResponse = aiResponse.substring(0, aiResponse.length - 3)
                                }
                                aiResponse = aiResponse.trim()
                                
                                try {
                                    parsed = JSON.parse(aiResponse)
                                    console.log('[Paste JSON] AI successfully corrected the JSON')
                                } catch (aiErr) {
                                    console.log('[Paste JSON] AI correction failed:', aiErr.message)
                                }
                            } catch (aiError) {
                                console.log('[Paste JSON] AI correction error:', aiError.message)
                            }
                        }
                    }
                    
                    if (parsed) {
                        // Save current state to history before updating
                        saveToHistory(interaction.user.id, embeds, content);
                        
                        if (Array.isArray(parsed)) {
                            embeds = parsed.map(embed => EmbedBuilder.from(embed))
                        } else if (parsed.embed) {
                            embeds = [EmbedBuilder.from(parsed.embed)]
                        } else if (parsed.embeds && Array.isArray(parsed.embeds)) {
                            embeds = parsed.embeds.map(embed => EmbedBuilder.from(embed))
                        } else {
                            embeds = [EmbedBuilder.from(parsed)]
                        }
                        
                        // Save new state to history (clear AI generation info when pasting JSON)
                        saveToHistory(interaction.user.id, embeds, content, 'clear');
                        
                        if (parseError) {
                            await modalInteraction.editReply({ content: `${client.config.emojis.YES} JSON had errors but was automatically corrected by AI and loaded successfully!` })
                        } else {
                            await modalInteraction.editReply({ content: `${client.config.emojis.YES} JSON loaded successfully!` })
                        }
                    } else {
                        await modalInteraction.editReply({ content: `${client.config.emojis.NO} Failed to parse JSON: ${parseError}\n\nPlease check your JSON syntax and try again.` })
                    }
                }
                // Continue to component assembly
            }
            
            // Handle Copy Message Menu
            else if (selectedValue === "copy_message_menu") {
                const modal = new ModalBuilder()
                    .setCustomId(`embed-generator_copy_menu_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Copy message", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("link")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                            ),
                    ])
                await interaction.showModal(modal)
                delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `embed-generator_copy_menu_${interaction.id}` && i.user.id === interaction.user.id
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                if (modalInteraction && modalInteraction.isModalSubmit()) {
                    const modalArgs = {}
                    modalInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    const resolved = await resolveMessageLink(client, interaction.guild, modalArgs.link)
                    const errMsg = resolved.error === 'invalid_link' ? client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })
                        : resolved.error === 'guild_not_found' ? (client.language({ textId: "I am not in the server this message is from", guildId: interaction.guildId, locale: interaction.locale }) || "I am not in the server this message is from")
                        : resolved.error === 'channel_not_found' ? client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })
                        : resolved.error === 'no_perms' ? `${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${resolved.channel.id}>${resolved.guild.id !== interaction.guildId ? ` (in ${resolved.guild.name})` : ''}\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`
                        : null
                    if (errMsg) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} ${errMsg}`, flags: ["Ephemeral"] })
                        return
                    }
                    const { channel, messageId } = resolved
                    const copiedMessage = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                    if (!copiedMessage) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        return // Early return for error
                    }
                    
                    // Save current state to history before copying
                    saveToHistory(interaction.user.id, embeds, content);
                    
                    embeds = copiedMessage.embeds.map(embed => EmbedBuilder.from(embed))
                    content = copiedMessage.content
                    
                    // A message with no embeds would break the generator UI
                    // (embeds[0] is assumed to exist) — bail early.
                    if (!embeds.length) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "That message has no embeds to copy", guildId: interaction.guildId, locale: interaction.locale }) || "That message has no embeds to copy"}`, flags: ["Ephemeral"] })
                        return
                    }
                    
                    // Save new state to history (clear AI generation info when copying)
                    saveToHistory(interaction.user.id, embeds, content, 'clear');
                    
                    await modalInteraction.reply({ content: `${client.config.emojis.YES} Message copied successfully!`, flags: ["Ephemeral"] })
                }
                // Continue to component assembly
            }
            
            // Handle Edit Embed Direct
            else if (selectedValue === "edit_embed_direct") {
                const modal = new ModalBuilder()
                    .setCustomId(`embed-generator_edit_link_${interaction.id}`)
                    .setTitle(`${client.language({ textId: "Edit Embed", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setLabelComponents([
                        new LabelBuilder()
                            .setLabel(`${client.language({ textId: "Message Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setTextInputComponent(
                                new TextInputBuilder()
                                    .setCustomId("link")
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder("https://discord.com/channels/...")
                            ),
                    ])
                
                await interaction.showModal(modal)
                delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                
                const filter = (i) => i.customId === `embed-generator_edit_link_${interaction.id}` && i.user.id === interaction.user.id
                const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 }).catch(e => null)
                
                if (modalInteraction && modalInteraction.isModalSubmit()) {
                    const modalArgs = {}
                    modalInteraction.fields.fields.each(field => modalArgs[field.customId] = field.value)
                    
                    const resolved = await resolveMessageLink(client, interaction.guild, modalArgs.link)
                    const errMsg = resolved.error === 'invalid_link' ? client.language({ textId: "Invalid message link", guildId: interaction.guildId, locale: interaction.locale })
                        : resolved.error === 'guild_not_found' ? (client.language({ textId: "I am not in the server this message is from", guildId: interaction.guildId, locale: interaction.locale }) || "I am not in the server this message is from")
                        : resolved.error === 'channel_not_found' ? client.language({ textId: "Text channel not found", guildId: interaction.guildId, locale: interaction.locale })
                        : resolved.error === 'no_perms' ? `${client.language({ textId: "I do not have permissions for channel", guildId: interaction.guildId, locale: interaction.locale })} <#${resolved.channel.id}>${resolved.guild.id !== interaction.guildId ? ` (in ${resolved.guild.name})` : ''}\n${client.language({ textId: "I need the following permissions", guildId: interaction.guildId, locale: interaction.locale })}:\n1. ${client.language({ textId: "View Channel", guildId: interaction.guildId, locale: interaction.locale })}\n2. ${client.language({ textId: "Read message history", guildId: interaction.guildId, locale: interaction.locale })}`
                        : null
                    if (errMsg) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} ${errMsg}`, flags: ["Ephemeral"] })
                        return
                    }
                    const { channel, messageId } = resolved
                    
                    const messageToEdit = await channel.messages.fetch({ message: messageId, cache: false, force: true }).catch(e => null)
                    if (!messageToEdit) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Message not found", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        return // Early return for error
                    }
                    
                    if (messageToEdit.author.id !== client.user.id) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} I can only edit my own messages!`, flags: ["Ephemeral"] })
                        return // Early return for error
                    }
                    
                    const embedsToCopy = interaction.message.embeds.map(embed => EmbedBuilder.from(embed))
                    
                    try {
                        await messageToEdit.edit({ embeds: embedsToCopy })
                        await modalInteraction.reply({ content: `${client.config.emojis.YES} Message edited successfully! [Jump to message](${modalArgs.link})`, flags: ["Ephemeral"] })
                    } catch (err) {
                        await modalInteraction.reply({ content: `${client.config.emojis.NO} Failed to edit message: ${err.message}`, flags: ["Ephemeral"] })
                    }
                }
                return // Early return after edit operation
            }
            
            // Handle Reset Embed
            else if (selectedValue === "reset_embed") {
                // Save current state to history before resetting
                saveToHistory(interaction.user.id, embeds, content);
                
                const defaultEmbed = new EmbedBuilder()
                    .setDescription(`${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} 1`)
                    .setColor("#2F3236")
                
                embeds = [defaultEmbed]
                content = null
                embedIndex = 0
                fieldIndex = 0
                
                // Save new state to history (clear AI generation info when resetting)
                saveToHistory(interaction.user.id, embeds, content, 'clear');
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferUpdate();
                }
                await interaction.followUp({ content: `${client.config.emojis.YES} Embed reset to default!`, flags: ["Ephemeral"] })
                // Continue to component assembly
            }
        }
        
        // ===== COMPONENT ASSEMBLY SECTION =====
        // This section MUST be reached by ALL operations (except early returns for errors/send/edit/copy_json)
        // Build the consistent UI structure every time
        
        return buildAndSendComponents(client, interaction, embeds, content, embedIndex, fieldIndex, false);
    }
}

/**
 * Build and send/update components consistently
 * This function ensures the SAME component structure every time
 */
async function buildAndSendComponents(client, interaction, embeds, content, embedIndex, fieldIndex, isInitial) {
    // Build embed options array
    const embed_options = [
        { label: `${client.language({ textId: "Content", guildId: interaction.guildId, locale: interaction.locale })}`, value: `content`, emoji: client.config.emojis.edit },
        { label: `${client.language({ textId: "Description, title, title URL, color", guildId: interaction.guildId, locale: interaction.locale })}`, value: `body`, emoji: client.config.emojis.edit },
        { label: `${client.language({ textId: "Thumbnail, image", guildId: interaction.guildId, locale: interaction.locale })}`, value: `images`, emoji: client.config.emojis.edit },
        { label: `${client.language({ textId: "Header", guildId: interaction.guildId, locale: interaction.locale })}`, value: `author`, emoji: client.config.emojis.edit },
        { label: `${client.language({ textId: "Footer", guildId: interaction.guildId, locale: interaction.locale })}`, value: `footer`, emoji: client.config.emojis.edit },
    ];
    
    // Add field options if applicable
    if (!embeds[embedIndex].data.fields || embeds[embedIndex].data.fields.length < 25) {
        embed_options.push({ label: `${client.language({ textId: "Add field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `AddField`, emoji: client.config.emojis.plus });
    }
    if (embeds[embedIndex].data.fields?.length >= 1) {
        embed_options.push({ label: `${client.language({ textId: "Change field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `editField`, emoji: client.config.emojis.edit });
    }
    if (embeds[embedIndex].data.fields?.length >= 1) {
        embed_options.push({ label: `${client.language({ textId: "Delete field", guildId: interaction.guildId, locale: interaction.locale })}`, value: `DelField`, emoji: client.config.emojis.minus });
    }
    
    // Add embed options
    if (embeds.length < 10) {
        embed_options.push({ label: `${client.language({ textId: "Add embed", guildId: interaction.guildId, locale: interaction.locale })}`, value: `AddEmbed`, emoji: client.config.emojis.plus });
    }
    if (embeds.length > 1) {
        embed_options.push({ label: `${client.language({ textId: "Delete embed", guildId: interaction.guildId, locale: interaction.locale })}`, value: `DelEmbed`, emoji: client.config.emojis.minus });
    }
    
    // Build embed selector
    const select_embed = [];
    let index = 0;
    for (const embed of embeds) {
        select_embed.push({ 
            label: `${client.language({ textId: "Embed", guildId: interaction.guildId, locale: interaction.locale })} ${index + 1}`, 
            value: `${index}`, 
            default: embedIndex === index 
        });
        index++;  
    }
    
    // Validate total character length
    const length = embeds.reduce((acc, embed) => {
        embed.data.description ? acc += embed.data.description.length : acc += 0
        embed.data.title ? acc += embed.data.title.length : acc += 0
        embed.data.author ? acc += embed.data.author.name?.length : acc += 0
        embed.data.footer ? acc += embed.data.footer.text?.length : acc += 0
        return embed.data.fields ? acc += embed.data.fields.reduce((acc2, field) => {
            return acc2 += field.name?.length + field.value?.length
        }, 0) : acc += 0
    }, 0);
    
    if (length >= 6000) {
        if (!interaction.replied && !interaction.deferred) await interaction.deferUpdate()
        return interaction.followUp({ content: `${client.language({ textId: "Total characters in all Title, Description, Field-name, Field-value, Footer and Header fields in all embeds attached to message must not exceed 6000 characters.", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
    }
    
    // ===== BUILD COMPONENT ROWS =====
    const components = [];
    
    // ROW 1: Embed selector dropdown
    const first_row = new ActionRowBuilder().addComponents([
        new StringSelectMenuBuilder()
            .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}} selectEmbed`)
            .addOptions(select_embed)
    ]);
    components.push(first_row);
    
    // ROW 2: Field selector dropdown (only when fields exist)
    if (embeds[embedIndex].data.fields?.length) {
        const select_field = [];
        let index = 0;
        for (const field of embeds[embedIndex].data.fields) {
            select_field.push({ 
                label: `${client.language({ textId: "Field", guildId: interaction.guildId, locale: interaction.locale })} ${index + 1}`, 
                value: `${index}`, 
                default: fieldIndex === index 
            });    
            index++;
        }
        const third_row = new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
                .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}} selectField`)
                .addOptions(select_field)
        ]);
        components.push(third_row);
    }
    
    // ROW 4: Edit options dropdown
    const second_row = new ActionRowBuilder().addComponents([
        new StringSelectMenuBuilder()
            .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}}`)
            .setPlaceholder(`${client.language({ textId: "Make a Selection", guildId: interaction.guildId, locale: interaction.locale }) || "Make a Selection"}`)
            .addOptions(embed_options)
    ]);
    components.push(second_row);
    
    // ROW 5: Quick Actions dropdown (4th select menu - always present)
    const quick_action_options = [
        { label: `${client.language({ textId: "Upload JSON", guildId: interaction.guildId, locale: interaction.locale }) || "Upload JSON"}`, value: `upload_json`, emoji: "📤", description: "Upload a JSON file" },
        { label: `${client.language({ textId: "Paste JSON", guildId: interaction.guildId, locale: interaction.locale }) || "Paste JSON"}`, value: `paste_json`, emoji: client.config.emojis.paste, description: "Paste JSON text" },
        { label: `${client.language({ textId: "Copy Message", guildId: interaction.guildId, locale: interaction.locale }) || "Copy Message"}`, value: `copy_message_menu`, emoji: client.config.emojis.copy, description: "Copy message from channel" },
        { label: `${client.language({ textId: "Edit Embed", guildId: interaction.guildId, locale: interaction.locale }) || "Edit Embed"}`, value: `edit_embed_direct`, emoji: client.config.emojis.edit, description: "Edit a bot message" },
        { label: `${client.language({ textId: "Reset", guildId: interaction.guildId, locale: interaction.locale }) || "Reset"}`, value: `reset_embed`, emoji: "🔄", description: "Reset to default" }
    ];
    
    const quick_actions_row = new ActionRowBuilder().addComponents([
        new StringSelectMenuBuilder()
            .setCustomId(`cmd{embed-generator}embed{${embedIndex}}field{${fieldIndex}}usr{${interaction.user.id}} quick_actions`)
            .setPlaceholder(`${client.language({ textId: "Quick Actions", guildId: interaction.guildId, locale: interaction.locale }) || "Quick Actions"}`)
            .addOptions(quick_action_options)
    ]);
    components.push(quick_actions_row);
    
    // Last ROW: Combined History + Main buttons (to fit within 5 row limit)
    const combinedButtons = [];
    
    // Add history buttons
    const undoBtn = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} undo`)
        .setLabel(`${client.language({ textId: "Undo", guildId: interaction.guildId, locale: interaction.locale }) || "Undo"}`)
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!canUndo(interaction.user.id));
    
    const redoBtn = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} redo`)
        .setLabel(`${client.language({ textId: "Redo", guildId: interaction.guildId, locale: interaction.locale }) || "Redo"}`)
        .setEmoji("↪️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!canRedo(interaction.user.id));
    
    combinedButtons.push(undoBtn, redoBtn);
    
    // Add main action buttons
    combinedButtons.push(
        new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} send`)
            .setLabel(`${client.language({ textId: "Send", guildId: interaction.guildId, locale: interaction.locale }) || "Send"}`)
            .setEmoji(client.config.emojis.send)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_json`)
            .setLabel(`${client.language({ textId: "JSON", guildId: interaction.guildId, locale: interaction.locale }) || "JSON"}`)
            .setEmoji(client.config.emojis.copy)
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ai_generate_simple_${interaction.user.id}`)
            .setLabel(`${client.language({ textId: "AI Embed", guildId: interaction.guildId, locale: interaction.locale }) || "AI Embed"}`)
            .setEmoji("🤖")
            .setStyle(ButtonStyle.Primary)
    );
    
    const combined_buttons_row = new ActionRowBuilder().addComponents(combinedButtons);
    components.push(combined_buttons_row);
    
    // Send or update the message
    if (isInitial) {
        return interaction.reply({ embeds: embeds, components: components });
    } else {
        if (interaction.replied || interaction.deferred) {
            return interaction.editReply({ content: content || " ", embeds: embeds, components: components });
        } else {
            return interaction.update({ content: content || " ", embeds: embeds, components: components });
        }
    }
}

/**
 * Wait for user to upload an attachment
 */
async function waitingForAttachment(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 180000 })
        if (!collected.size) return false
        if (collected.first().attachments.first()) {
            const attachment = collected.first().attachments.first()
            // Accept JSON files, text files, or any file with .json/.txt extension
            if (attachment.contentType?.includes("application/json") || 
                attachment.contentType?.includes("text/plain") || 
                attachment.name.endsWith('.json') || 
                attachment.name.endsWith('.txt')) {
                if (attachment.size <= 8388608) {
                    collected.first().delete().catch(e => null)
                    return attachment
                } else {
                    collected.first().delete().catch(e => null)
                    interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Attachment size must not exceed 8MB", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                }
            } else {
                collected.first().delete().catch(e => null)
                interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Attachment format must be .json or .txt", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
        } else {
            if (collected.first().content.toLowerCase() == `cancel`) {
                collected.first().delete().catch(e => null)
                return false
            }
            collected.first().delete().catch(e => null)
            interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "No attachment", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
    } 
}
