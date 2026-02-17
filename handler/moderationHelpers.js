const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

function hex2rgb(color) {
    const r = color.match(/^#(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}))$/i);
    if (!r) return [0, 0, 0];
    return [parseInt(r[2], 16), parseInt(r[3], 16), parseInt(r[4], 16)];
}

async function updateMainPanel(client, interaction, config, userId) {
    try {
        const originalMessage = await interaction.channel.messages.fetch({ limit: 10 });
        const panelMessage = originalMessage.find(msg => 
            msg.author.id === client.user.id && 
            msg.components.length > 0 &&
            msg.components.some(row => row.components.some(c => c.customId?.includes('mod-toggle-system')))
        );
        
        if (panelMessage) {
            const container = createMainPanelEmbed(config, interaction.guild, userId);
            const components = createMainPanelComponents(config, userId);
            await panelMessage.edit({ components: [container, ...components] });
        }
    } catch (error) {
        console.error('Error updating main panel:', error);
    }
}

function createMainPanelEmbed(config, guild, userId) {
    const logChannel = config.logChannel 
        ? `<#${config.logChannel}>` 
        : 'Not set';
    const logManagerRoles = config.logManagerRoles && config.logManagerRoles.length > 0
        ? config.logManagerRoles.map(r => `<@&${r}>`).join(', ')
        : 'Not set';
    
    const banChannel = config.banAppealSystem.appealChannel 
        ? `<#${config.banAppealSystem.appealChannel}>` 
        : 'Not set';
    const timeoutChannel = config.timeoutAppealSystem.appealChannel 
        ? `<#${config.timeoutAppealSystem.appealChannel}>` 
        : 'Not set';
    
    const banRoles = config.banAppealSystem.appealManagerRoles.length > 0
        ? config.banAppealSystem.appealManagerRoles.map(r => `<@&${r}>`).join(', ')
        : 'Not set';
    const timeoutRoles = config.timeoutAppealSystem.appealManagerRoles.length > 0
        ? config.timeoutAppealSystem.appealManagerRoles.map(r => `<@&${r}>`).join(', ')
        : 'Not set';
    
    // Create Compact V2 style container
    const accentColor = config.enabled ? '#00ff00' : '#ff0000';
    const container = new ContainerBuilder()
        .setAccentColor(hex2rgb(accentColor));
    
    // Title section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Moderation System')
    );
    
    // Prefix section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Prefixes\n\`\`\`${config.prefix}\`\`\`\n> Note: Select the prefix that is not being used by any other bot.`
        )
    );
    
    // Log Channel and Manager Roles section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Log Channel\n${logChannel}\n\n### Log Manager Roles\n${logManagerRoles}`
        )
    );
    
    // Max appeals section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Max no. of appeals per user\n**Ban Appeals:** ${config.banAppealSystem.maxAppealsPerUser} | **Timeout Appeals:** ${config.timeoutAppealSystem.maxAppealsPerUser}`
        )
    );
    
    // Appeal channels section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Appeal Channel\n**Timeout:** ${timeoutChannel}\n**Ban:** ${banChannel}`
        )
    );
    
    // Appeal manager roles section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Appeal Manager Roles\n**Ban Appeals:** ${banRoles}\n**Timeout Appeals:** ${timeoutRoles}`
        )
    );
    
    // Add both appeal system buttons as an action row (no gap between them)
    const banAppealButton = new ButtonBuilder()
        .setCustomId(`cmd{mod-enable-ban-appeal}usr{${userId}}`)
        .setLabel(config.banAppealSystem.enabled ? 'Disable Ban Appeal System' : 'Enable Ban Appeal System')
        .setStyle(config.banAppealSystem.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setDisabled(!config.enabled);
    
    const timeoutAppealButton = new ButtonBuilder()
        .setCustomId(`cmd{mod-enable-timeout-appeal}usr{${userId}}`)
        .setLabel(config.timeoutAppealSystem.enabled ? 'Disable Timeout Appeal System' : 'Enable Timeout Appeal System')
        .setStyle(config.timeoutAppealSystem.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setDisabled(!config.enabled);
    
    const appealButtonsRow = new ActionRowBuilder().addComponents(banAppealButton, timeoutAppealButton);
    container.addActionRowComponents(appealButtonsRow);
    
    // Available commands section (AFTER buttons)
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Available Commands\n\`\`\`\n${config.prefix}ban\n${config.prefix}unban\n${config.prefix}kick\n${config.prefix}timeout\n${config.prefix}timeout remove\n\`\`\``
        )
    );
    
    // Command execution section
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### Command Execution\n\`${config.prefix}ban @user (duration) (reason)\`\n\`${config.prefix}unban @user\`\n\`${config.prefix}kick @user (reason)\`\n\`${config.prefix}timeout @user (duration) (reason)\`\n\`${config.prefix}timeout remove @user\`\n\n> Note: The duration and reason are optional.`
        )
    );
    
    // Add settings select menu INSIDE the container using addActionRowComponents
    const settingsMenu = new StringSelectMenuBuilder()
        .setCustomId(`cmd{mod-settings-menu}usr{${userId}}`)
        .setPlaceholder('⚙️ Select a setting to configure')
        .setDisabled(!config.enabled)
        .addOptions([
            {
                label: 'View Appeal Questions',
                description: 'View current appeal questions for ban and timeout',
                value: 'view_questions',
                emoji: '📋'
            },
            {
                label: 'Edit Appeal Questions',
                description: 'Modify appeal questions',
                value: 'edit_questions',
                emoji: '✏️'
            },
            {
                label: 'Edit Prefix',
                description: 'Change the command prefix',
                value: 'edit_prefix',
                emoji: '🔧'
            },
            {
                label: 'Edit Max Appeals Per User',
                description: 'Set maximum appeals allowed per user',
                value: 'edit_max_appeals',
                emoji: '🔢'
            },
            {
                label: 'Edit Log Channel',
                description: 'Set channel for moderation logs',
                value: 'edit_log_channel',
                emoji: '📝'
            },
            {
                label: 'Edit Log Manager Roles',
                description: 'Manage roles to be notified in logs',
                value: 'edit_log_manager_roles',
                emoji: '🔔'
            },
            {
                label: 'Edit Appeal Channel',
                description: 'Set channels for appeal messages',
                value: 'edit_appeal_channel',
                emoji: '📢'
            },
            {
                label: 'Edit Appeal Manager Role',
                description: 'Manage roles that can handle appeals',
                value: 'edit_manager_roles',
                emoji: '👥'
            }
        ]);
    
    const settingsRow = new ActionRowBuilder().addComponents(settingsMenu);
    container.addActionRowComponents(settingsRow);
    
    // Footer with status
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**System Status:** ${config.enabled ? 'Enabled ✅' : 'Disabled ❌'}`
        )
    );
    
    return container;
}

function createMainPanelComponents(config, userId) {
    // Only the disable system button remains as a separate component
    const disableButton = new ButtonBuilder()
        .setCustomId(`cmd{mod-toggle-system}usr{${userId}}`)
        .setLabel(config.enabled ? 'Disable System' : 'Enable System')
        .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(config.enabled ? '🔴' : '🟢');
    
    const row = new ActionRowBuilder().addComponents(disableButton);
    
    return [row];
}

module.exports = {
    createMainPanelEmbed,
    createMainPanelComponents,
    updateMainPanel
};
