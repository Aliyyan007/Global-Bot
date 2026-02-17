/**
 * Daily Reward Channel Manager
 * 
 * Creates and manages the daily reward channel with interactive buttons
 * 
 * @module notification-channels/dailyRewardManager
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { LANGUAGE_KEYS, getLocalizedString } = require('./languageKeys');
const { saveChannelConfig, getChannelConfig } = require('./settingsSchemaManager');

/**
 * Show create daily reward channel option
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @returns {Promise<void>}
 */
async function showCreateChannelOption(interaction) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, 'daily_reward');
    const isEnabled = config && config.enabled;
    
    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(getLocalizedString(client, 'SETUP_DAILY_REWARD', { guildId, locale }))
        .setColor(isEnabled ? 0x57F287 : 0x5865F2)
        .setDescription(isEnabled ? 
            `✅ Currently enabled in <#${config.channelId}>` : 
            'Create a dedicated channel for daily rewards')
        .setTimestamp();
    
    // Create button
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('notif_create_daily')
                .setLabel(getLocalizedString(client, 'CREATE_DAILY_CHANNEL', { guildId, locale }))
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎁')
                .setDisabled(isEnabled)
        );
    
    // Add disable button if enabled
    if (isEnabled) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('notif_disable_daily_reward')
                .setLabel(getLocalizedString(client, 'DISABLE', { guildId, locale }))
                .setStyle(ButtonStyle.Danger)
        );
    }
    
    await interaction.update({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

/**
 * Create the daily reward channel
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @param {string} guildId - Guild ID
 * @returns {Promise<TextChannel>}
 */
async function createChannel(interaction, guildId) {
    const guild = interaction.guild;
    
    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('Missing Manage Channels permission');
    }
    
    // Create channel with custom name and disabled send messages for @everyone
    const channel = await guild.channels.create({
        name: '🎁 𝗗𝗮𝗶𝗹𝘆 𝗥𝗲𝘄𝗮𝗿𝗱',
        type: ChannelType.GuildText,
        topic: 'Claim your daily rewards here!',
        reason: 'Daily Reward Channel Setup',
        permissionOverwrites: [
            {
                id: guild.id, // @everyone role
                deny: [PermissionFlagsBits.SendMessages], // Disable send messages
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] // Allow viewing
            },
            {
                id: botMember.id, // Bot
                allow: [
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.CreatePublicThreads,
                    PermissionFlagsBits.ManageThreads
                ]
            }
        ]
    });
    
    return channel;
}

/**
 * Send the daily reward message with claim button and create a hidden thread
 * 
 * @param {TextChannel} channel - Discord text channel
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @returns {Promise<{message: Message, thread: ThreadChannel}>}
 */
async function sendDailyRewardMessage(channel, client, guildId) {
    const embed = new EmbedBuilder()
        .setTitle('🎁 Daily Rewards')
        .setDescription('Click the button below to claim your daily reward!')
        .setColor(0xFFD700)
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('notif_claim_daily')
                .setLabel(getLocalizedString(client, 'CLAIM_REWARD', { guildId }))
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎁')
        );
    
    // Send the main daily reward message with button
    const message = await channel.send({
        embeds: [embed],
        components: [row]
    });
    
    // Send a temporary message to create thread from
    const tempMessage = await channel.send('Daily Rewards');
    
    // Create thread from the temporary message
    const thread = await tempMessage.startThread({
        name: 'Daily Rewards',
        autoArchiveDuration: 10080, // 7 days
        reason: 'Daily reward claims thread'
    });
    
    // Delete the temporary message (this removes the thread notification)
    await tempMessage.delete().catch(() => {});
    
    return { message, thread };
}

/**
 * Handle claim button click
 * 
 * @param {ButtonInteraction} interaction - Discord button interaction
 * @returns {Promise<void>}
 */
async function handleClaimButton(interaction) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const user = interaction.user;
    
    try {
        // Check if user already claimed today (before doing anything else)
        const profile = await client.functions.fetchProfile(client, user.id, guildId);
        let tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        
        let date = new Date();
        const now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        date = new Date(now_utc);
        let lastDaily = new Date(Date.UTC(profile.lastDaily.getUTCFullYear(), profile.lastDaily.getUTCMonth(), profile.lastDaily.getUTCDate(), profile.lastDaily.getUTCHours(), profile.lastDaily.getUTCMinutes(), profile.lastDaily.getUTCSeconds()));
        let nextDaily = new Date(Date.UTC(lastDaily.getUTCFullYear(), lastDaily.getUTCMonth(), lastDaily.getUTCDate() + 1, 0, 0, 0));
        
        // If user already claimed, send ephemeral message
        if (nextDaily > new Date()) {
            return interaction.reply({
                content: `‼ ${client.language({ textId: "You already received daily reward", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Come back at", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(tomorrow.getTime() / 1000)}:F>`,
                ephemeral: true
            });
        }
        
        // Get the daily reward configuration
        const config = await getChannelConfig(guildId, 'daily_reward');
        console.log('[Daily Reward] Config:', config);
        
        if (!config) {
            return interaction.reply({
                content: '❌ Daily reward not configured. Please create a daily reward channel first.',
                ephemeral: true
            });
        }
        
        let thread = null;
        
        // If threadId exists in config, try to find it
        if (config.threadId) {
            console.log('[Daily Reward] Looking for thread:', config.threadId);
            
            // Try to get from cache first
            thread = client.channels.cache.get(config.threadId);
            console.log('[Daily Reward] Thread from cache:', thread ? 'Found' : 'Not found');
            
            // If not in cache, try to fetch it
            if (!thread) {
                try {
                    thread = await client.channels.fetch(config.threadId);
                    console.log('[Daily Reward] Thread from fetch:', thread ? 'Found' : 'Not found');
                } catch (error) {
                    console.error('[Daily Reward] Thread not found in cache or fetch:', error.message);
                }
            }
        }
        
        // If no threadId or thread not found, try to find "Daily Rewards" thread in the channel
        if (!thread) {
            console.log('[Daily Reward] No thread found, searching in channel...');
            const channel = await client.channels.fetch(config.channelId).catch(() => null);
            console.log('[Daily Reward] Channel fetched:', channel ? channel.name : 'Not found');
            
            if (channel) {
                // Check active threads
                const activeThreads = await channel.threads.fetchActive().catch(() => null);
                console.log('[Daily Reward] Active threads:', activeThreads ? activeThreads.threads.size : 0);
                
                if (activeThreads) {
                    // Find thread named "Daily Rewards"
                    thread = activeThreads.threads.find(t => t.name === 'Daily Rewards');
                    console.log('[Daily Reward] Thread from active threads:', thread ? 'Found' : 'Not found');
                }
                
                // If not found in active, check archived
                if (!thread) {
                    const archivedThreads = await channel.threads.fetchArchived().catch(() => null);
                    console.log('[Daily Reward] Archived threads:', archivedThreads ? archivedThreads.threads.size : 0);
                    
                    if (archivedThreads) {
                        thread = archivedThreads.threads.find(t => t.name === 'Daily Rewards');
                        console.log('[Daily Reward] Thread from archived threads:', thread ? 'Found' : 'Not found');
                        
                        // Unarchive if found
                        if (thread && thread.archived) {
                            await thread.setArchived(false).catch(() => {});
                            console.log('[Daily Reward] Thread unarchived');
                        }
                    }
                }
                
                // If we found the thread, save its ID to config
                if (thread) {
                    console.log('[Daily Reward] Saving thread ID to config:', thread.id);
                    await saveChannelConfig(guildId, 'daily_reward', {
                        ...config,
                        threadId: thread.id
                    });
                }
            }
        }
        
        if (!thread) {
            console.log('[Daily Reward] Thread not found anywhere. Please recreate the channel.');
            return interaction.reply({
                content: '❌ Daily reward thread not found. Please disable and recreate the daily reward channel.',
                ephemeral: true
            });
        }
        
        console.log('[Daily Reward] Thread found! Executing workflow...');
        
        // Execute daily reward workflow in the thread
        await executeDailyWorkflow(thread, user, client, guildId, interaction);
    } catch (error) {
        console.error('Error handling claim button:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your reward. Please try using /daily command directly.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}



/**
 * Execute daily reward workflow in thread
 * 
 * @param {ThreadChannel} thread - Discord thread
 * @param {User} user - Discord user
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {ButtonInteraction} originalInteraction - Original button interaction
 * @returns {Promise<void>}
 */
async function executeDailyWorkflow(thread, user, client, guildId, originalInteraction) {
    // Import daily command logic
    const dailyCommand = require('../../slash-commands/daily');
    
    // Acknowledge the button click immediately
    if (!originalInteraction.replied && !originalInteraction.deferred) {
        await originalInteraction.reply({
            content: `✅ Check <#${thread.id}> to claim your daily reward!`,
            ephemeral: true
        }).catch(() => {});
    }
    
    // Create a wrapped interaction that mimics a chat input command (not button)
    // This will make the daily command show the reward overview with claim button
    const mockInteraction = {
        user: user,
        guild: thread.guild,
        guildId: guildId,
        client: client,
        channel: thread,
        member: await thread.guild.members.fetch(user.id).catch(() => null),
        customId: `daily_usr{${user.id}}`,
        deferred: false,
        replied: false,
        isChatInputCommand: () => true, // Changed to true to trigger the overview display
        isButton: () => false, // Changed to false
        reply: async (options) => {
            mockInteraction.replied = true;
            const content = typeof options === 'string' ? options : options.content;
            const embeds = typeof options === 'object' ? options.embeds : undefined;
            const components = typeof options === 'object' ? options.components : undefined;
            
            // Send reward message in the thread with user mention
            await thread.send({
                content: content ? `${user} ${content}` : `${user}`,
                embeds: embeds,
                components: components
            });
        },
        editReply: async (options) => {
            const content = typeof options === 'string' ? options : options.content;
            const embeds = typeof options === 'object' ? options.embeds : undefined;
            const components = typeof options === 'object' ? options.components : undefined;
            
            await thread.send({
                content: content ? `${user} ${content}` : `${user}`,
                embeds: embeds,
                components: components
            });
        },
        update: async (options) => {
            const content = typeof options === 'string' ? options : options.content;
            const embeds = typeof options === 'object' ? options.embeds : undefined;
            const components = typeof options === 'object' ? options.components : undefined;
            
            await thread.send({
                content: content ? `${user} ${content}` : `${user}`,
                embeds: embeds,
                components: components
            });
        },
        followUp: async (options) => {
            const content = typeof options === 'string' ? options : options.content;
            const embeds = typeof options === 'object' ? options.embeds : undefined;
            const components = typeof options === 'object' ? options.components : undefined;
            
            await thread.send({
                content: content ? `${user} ${content}` : `${user}`,
                embeds: embeds,
                components: components
            });
        },
        deferReply: async (options) => {
            mockInteraction.deferred = true;
            // Don't defer the original interaction here since we already replied
        },
        deferUpdate: async () => {
            mockInteraction.deferred = true;
            // Don't defer the original interaction here since we already replied
        },
        message: {
            content: '',
            embeds: [],
            flags: { has: () => false }
        },
        locale: user.locale || 'en-US'
    };
    
    // Execute daily command with fromUCP flag to show the overview
    try {
        console.log('[Daily Reward] Showing daily reward overview for user:', user.username);
        await dailyCommand.run(client, mockInteraction, { fromUCP: true });
        console.log('[Daily Reward] Daily reward overview sent successfully');
    } catch (error) {
        console.error('Error executing daily workflow:', error);
        await thread.send(`${user} ❌ An error occurred while processing your reward.`);
    }
}

module.exports = {
    showCreateChannelOption,
    createChannel,
    sendDailyRewardMessage,
    handleClaimButton,
    executeDailyWorkflow
};
