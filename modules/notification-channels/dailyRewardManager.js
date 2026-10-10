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
const { refreshNotificationPanel } = require('./panelRefresher');

/**
 * Show create daily reward channel option (EPHEMERAL VERSION)
 * Sends as ephemeral message and refreshes the original panel after configuration
 * 
 * @param {Interaction} interaction - Discord interaction (already deferred)
 * @param {Message} originalMessage - The original manager-settings message to refresh
 * @returns {Promise<void>}
 */
async function showCreateChannelOptionEphemeral(interaction, originalMessage) {
    const client = interaction.client;
    const guildId = interaction.guildId;
    const locale = interaction.locale;
    
    // Get current configuration
    const config = await getChannelConfig(guildId, 'daily_reward');
    const isEnabled = config && config.enabled;
    
    // Create embed with professional formatting
    const embed = new EmbedBuilder()
        .setTitle('🎁 Daily Reward Notifications')
        .setColor(isEnabled ? 0x57F287 : 0x5865F2)
        .setTimestamp();
    
    if (isEnabled) {
        embed.setDescription([
            `**Status:** ✅ Enabled`,
            `**Channel:** <#${config.channelId}>`,
            config.threadId ? `**Thread:** <#${config.threadId}>` : '',
            ``,
            `**How it works:**`,
            `• Users click the button in <#${config.channelId}> to claim rewards`,
            `• Claims are processed in a hidden thread`,
            `• Users are mentioned when they claim`,
            ``,
            `**Options:**`,
            `• Click **Disable** to remove the daily reward channel`
        ].filter(Boolean).join('\n'));
    } else {
        embed.setDescription([
            `**Status:** ❌ Disabled`,
            ``,
            `**What will be created:**`,
            `• A dedicated channel named \`🎁 𝗗𝗮𝗶𝗹𝘆 𝗥𝗲𝘄𝗮𝗿𝗱\``,
            `• A message with a claim button`,
            `• A hidden thread for processing claims`,
            `• Proper permissions (users can't send messages in the channel)`,
            ``,
            `**To enable:**`,
            `• Click **Create Daily Reward Channel** below`,
            `• The system will be set up automatically`,
            `• The main panel will auto-refresh`
        ].join('\n'));
    }
    
    embed.setFooter({ text: 'Changes will be reflected in the main settings panel' });
    
    // Create button with original message reference
    const buttons = [
        new ButtonBuilder()
            .setCustomId(`notif_create_daily_eph_${originalMessage.id}`)
            .setLabel('Create Daily Reward Channel')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎁')
            .setDisabled(isEnabled)
    ];
    
    // Add disable button if enabled
    if (isEnabled) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`notif_disable_eph_daily_reward_${originalMessage.id}`)
                .setLabel('Disable')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );
    }
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    await interaction.followUp({
        embeds: [embed],
        components: [row],
        flags: ["Ephemeral"]
    });
}

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
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
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
    
    // Log thread creation for debugging
    console.log('[Daily Reward] Thread created:', {
        id: thread.id,
        name: thread.name,
        url: thread.url,
        guildId: thread.guildId,
        parentId: thread.parentId
    });
    
    return { message, thread };
}

/**
 * Enhanced thread detection with multiple fallback methods
 * 
 * @param {Client} client - Discord client
 * @param {Object} config - Daily reward configuration
 * @param {string} guildId - Guild ID
 * @returns {Promise<ThreadChannel|null>}
 */
async function findDailyRewardThread(client, config, guildId) {
    console.log('[Thread Detection] Starting enhanced thread detection...');
    console.log('[Thread Detection] Config:', JSON.stringify(config, null, 2));
    
    let thread = null;
    
    // Method 1: Try to get thread by ID from cache
    if (config.threadId) {
        console.log('[Thread Detection] Method 1: Checking cache for thread ID:', config.threadId);
        thread = client.channels.cache.get(config.threadId);
        
        if (thread) {
            console.log('[Thread Detection] ✅ Thread found in cache');
            return thread;
        }
        console.log('[Thread Detection] ❌ Thread not in cache');
    }
    
    // Method 2: Try to fetch thread by ID directly
    if (config.threadId) {
        console.log('[Thread Detection] Method 2: Fetching thread by ID:', config.threadId);
        try {
            thread = await client.channels.fetch(config.threadId);
            if (thread) {
                console.log('[Thread Detection] ✅ Thread fetched successfully');
                return thread;
            }
        } catch (error) {
            console.log('[Thread Detection] ❌ Failed to fetch thread:', error.message);
        }
    }
    
    // Method 3: Try to parse thread ID from URL
    if (config.threadUrl && !config.threadId) {
        console.log('[Thread Detection] Method 3: Parsing thread ID from URL:', config.threadUrl);
        const urlMatch = config.threadUrl.match(/channels\/\d+\/\d+\/(\d+)/);
        if (urlMatch) {
            const threadIdFromUrl = urlMatch[1];
            console.log('[Thread Detection] Extracted thread ID from URL:', threadIdFromUrl);
            
            try {
                thread = await client.channels.fetch(threadIdFromUrl);
                if (thread) {
                    console.log('[Thread Detection] ✅ Thread found via URL parsing');
                    
                    // Update config with the thread ID
                    await saveChannelConfig(guildId, 'daily_reward', {
                        ...config,
                        threadId: threadIdFromUrl
                    });
                    
                    return thread;
                }
            } catch (error) {
                console.log('[Thread Detection] ❌ Failed to fetch thread from URL:', error.message);
            }
        }
    }
    
    // Method 4: Search in parent channel's active threads
    if (config.channelId) {
        console.log('[Thread Detection] Method 4: Searching active threads in channel:', config.channelId);
        try {
            const channel = await client.channels.fetch(config.channelId);
            if (channel) {
                const activeThreads = await channel.threads.fetchActive();
                console.log('[Thread Detection] Active threads found:', activeThreads.threads.size);
                
                // Try to find by name
                const threadName = config.threadName || 'Daily Rewards';
                thread = activeThreads.threads.find(t => t.name === threadName);
                
                if (thread) {
                    console.log('[Thread Detection] ✅ Thread found in active threads by name');
                    
                    // Update config with thread info
                    await saveChannelConfig(guildId, 'daily_reward', {
                        ...config,
                        threadId: thread.id,
                        threadUrl: thread.url
                    });
                    
                    return thread;
                }
                
                // If not found by name, try to find by parent message ID
                if (config.messageId) {
                    thread = activeThreads.threads.find(t => t.id === config.messageId);
                    if (thread) {
                        console.log('[Thread Detection] ✅ Thread found in active threads by message ID');
                        
                        await saveChannelConfig(guildId, 'daily_reward', {
                            ...config,
                            threadId: thread.id,
                            threadUrl: thread.url
                        });
                        
                        return thread;
                    }
                }
                
                console.log('[Thread Detection] ❌ Thread not found in active threads');
            }
        } catch (error) {
            console.log('[Thread Detection] ❌ Error searching active threads:', error.message);
        }
    }
    
    // Method 5: Search in parent channel's archived threads
    if (config.channelId) {
        console.log('[Thread Detection] Method 5: Searching archived threads in channel:', config.channelId);
        try {
            const channel = await client.channels.fetch(config.channelId);
            if (channel) {
                const archivedThreads = await channel.threads.fetchArchived({ limit: 100 });
                console.log('[Thread Detection] Archived threads found:', archivedThreads.threads.size);
                
                const threadName = config.threadName || 'Daily Rewards';
                thread = archivedThreads.threads.find(t => t.name === threadName);
                
                if (thread) {
                    console.log('[Thread Detection] ✅ Thread found in archived threads');
                    
                    // Unarchive the thread
                    if (thread.archived) {
                        console.log('[Thread Detection] Unarchiving thread...');
                        await thread.setArchived(false);
                        console.log('[Thread Detection] Thread unarchived successfully');
                    }
                    
                    // Update config with thread info
                    await saveChannelConfig(guildId, 'daily_reward', {
                        ...config,
                        threadId: thread.id,
                        threadUrl: thread.url
                    });
                    
                    return thread;
                }
                
                console.log('[Thread Detection] ❌ Thread not found in archived threads');
            }
        } catch (error) {
            console.log('[Thread Detection] ❌ Error searching archived threads:', error.message);
        }
    }
    
    // Method 6: Try to fetch all threads in the guild (last resort)
    if (!thread) {
        console.log('[Thread Detection] Method 6: Searching all guild threads (last resort)...');
        try {
            const guild = await client.guilds.fetch(guildId);
            if (guild) {
                // Fetch all active threads in the guild
                const allThreads = await guild.channels.fetchActiveThreads();
                console.log('[Thread Detection] All guild threads found:', allThreads.threads.size);
                
                const threadName = config.threadName || 'Daily Rewards';
                thread = allThreads.threads.find(t => 
                    t.name === threadName && 
                    t.parentId === config.channelId
                );
                
                if (thread) {
                    console.log('[Thread Detection] ✅ Thread found in guild-wide search');
                    
                    // Update config with thread info
                    await saveChannelConfig(guildId, 'daily_reward', {
                        ...config,
                        threadId: thread.id,
                        threadUrl: thread.url
                    });
                    
                    return thread;
                }
                
                console.log('[Thread Detection] ❌ Thread not found in guild-wide search');
            }
        } catch (error) {
            console.log('[Thread Detection] ❌ Error in guild-wide search:', error.message);
        }
    }
    
    console.log('[Thread Detection] ❌ Thread not found after all methods');
    return null;
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
        
        const nextDaily = profile.lastDaily
            ? new Date(Date.UTC(profile.lastDaily.getUTCFullYear(), profile.lastDaily.getUTCMonth(), profile.lastDaily.getUTCDate() + 1, 0, 0, 0))
            : null;

        // If user already claimed, send ephemeral message
        if (nextDaily && nextDaily > new Date()) {
            return interaction.reply({
                content: `‼ ${client.language({ textId: "You already received daily reward", guildId: interaction.guildId, locale: interaction.locale })}\n${client.language({ textId: "Come back at", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(tomorrow.getTime() / 1000)}:F>`,
                flags: ["Ephemeral"]
            });
        }
        
        // Get the daily reward configuration
        const config = await getChannelConfig(guildId, 'daily_reward');
        console.log('[Daily Reward] Config:', config);
        
        if (!config) {
            return interaction.reply({
                content: '❌ Daily reward not configured. Please create a daily reward channel first.',
                flags: ["Ephemeral"]
            });
        }
        
        // Use enhanced thread detection
        const thread = await findDailyRewardThread(client, config, guildId);
        
        if (!thread) {
            console.log('[Daily Reward] Thread not found after enhanced detection. Please recreate the channel.');
            return interaction.reply({
                content: '❌ Daily reward thread not found. Please disable and recreate the daily reward channel.\n\n**Tip:** The thread may have been deleted or archived for too long.',
                flags: ["Ephemeral"]
            });
        }
        
        console.log('[Daily Reward] Thread found! Executing workflow...');
        console.log('[Daily Reward] Thread details:', {
            id: thread.id,
            name: thread.name,
            url: thread.url,
            archived: thread.archived
        });
        
        // Execute daily reward workflow in the thread
        await executeDailyWorkflow(thread, user, client, guildId, interaction);
    } catch (error) {
        console.error('Error handling claim button:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your reward. Please try using /daily command directly.',
                flags: ["Ephemeral"]
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
            flags: ["Ephemeral"]
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
    showCreateChannelOptionEphemeral,
    createChannel,
    sendDailyRewardMessage,
    findDailyRewardThread,
    handleClaimButton,
    executeDailyWorkflow
};
