const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const ModerationSystem = require('../schemas/moderationSystemSchema');

const UserRegexp = /usr{(.*?)}/;

module.exports = {
    name: 'mod-settings-menu',
    
    run: async (client, interaction, args) => {
        try {
            // Check if user is authorized
            const userIdMatch = UserRegexp.exec(interaction.customId);
            if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
                return interaction.deferUpdate().catch(() => {});
            }
            
            const selectedValue = interaction.values[0];
            const config = await ModerationSystem.findOne({ guildId: interaction.guild.id });
            
            if (!config) {
                return await interaction.reply({
                    content: '❌ Moderation system not found.',
                    flags: ["Ephemeral"]
                });
            }
            
            switch (selectedValue) {
                case 'view_questions':
                    await handleViewQuestions(interaction, config, client);
                    break;
                case 'edit_questions':
                    await handleEditQuestions(interaction, config);
                    break;
                case 'edit_prefix':
                    await handleEditPrefixMenu(interaction);
                    break;
                case 'edit_max_appeals':
                    await handleEditMaxAppealsMenu(interaction);
                    break;
                case 'edit_log_channel':
                    await handleEditLogChannel(interaction);
                    break;
                case 'edit_log_manager_roles':
                    await handleEditLogManagerRoles(interaction, config);
                    break;
                case 'edit_appeal_channel':
                    await handleEditAppealChannel(interaction);
                    break;
                case 'edit_manager_roles':
                    await handleEditManagerRoles(interaction, config);
                    break;
            }
            
        } catch (error) {
            console.error('Error handling settings menu:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your selection.',
                    flags: ["Ephemeral"]
                }).catch(() => {});
            }
        }
    }
};

async function handleViewQuestions(interaction, config, client) {
    let description = '';
    
    if (config.banAppealSystem.enabled) {
        description += '## ⛔ **Ban Appeal Questions**\n';
        config.banAppealSystem.questions.forEach((q, i) => {
            description += `**Q ${i + 1}.** ${q}\n`;
        });
        description += '\n';
    }
    
    if (config.timeoutAppealSystem.enabled) {
        description += '## 🔒 **Timeout Appeal Questions**\n';
        config.timeoutAppealSystem.questions.forEach((q, i) => {
            description += `**Q ${i + 1}.** ${q}\n`;
        });
    }
    
    if (!config.banAppealSystem.enabled && !config.timeoutAppealSystem.enabled) {
        description = '❌ No appeal systems are currently enabled.';
    }
    
    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Appeal Questions')
        .setDescription(description)
        .setTimestamp();
    
    await interaction.reply({
        embeds: [embed],
        flags: ["Ephemeral"]
    });
}

async function handleEditQuestions(interaction, config) {
    const buttons = [];
    
    if (config.banAppealSystem.enabled) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('cmd{mod-edit-ban-questions}')
                .setLabel('Ban Appeal Questions')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⛔')
        );
    }
    
    if (config.timeoutAppealSystem.enabled) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('cmd{mod-edit-timeout-questions}')
                .setLabel('Timeout Appeal Questions')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔒')
        );
    }
    
    if (buttons.length === 0) {
        return await interaction.reply({
            content: '❌ No appeal systems are currently enabled.',
            flags: ["Ephemeral"]
        });
    }
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    await interaction.reply({
        content: '### Edit Appeal Questions\nSelect which appeal questions you want to edit:',
        components: [row],
        flags: ["Ephemeral"]
    });
}

async function handleEditPrefixMenu(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('cmd{mod-edit-prefix}')
        .setTitle('Edit Command Prefix');
    
    const prefixInput = new TextInputBuilder()
        .setCustomId('prefix')
        .setLabel('Command Prefix')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter prefix (e.g., -, !, $)')
        .setRequired(true)
        .setMaxLength(3);
    
    modal.addComponents(new ActionRowBuilder().addComponents(prefixInput));
    
    await interaction.showModal(modal);
}

async function handleEditMaxAppealsMenu(interaction) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('cmd{mod-max-appeals-ban}')
                .setLabel('Ban Appeals Per User')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⛔'),
            new ButtonBuilder()
                .setCustomId('cmd{mod-max-appeals-timeout}')
                .setLabel('Timeout Appeals Per User')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔒')
        );
    
    await interaction.reply({
        content: '### Edit Max Appeals Per User\nSelect which type of appeals you want to configure:',
        components: [row],
        flags: ["Ephemeral"]
    });
}

async function handleEditAppealChannel(interaction) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('cmd{mod-edit-ban-channel}')
                .setPlaceholder('Select Ban Appeal Channel')
                .addChannelTypes(ChannelType.GuildText)
        );
    
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('cmd{mod-edit-timeout-channel}')
                .setPlaceholder('Select Timeout Appeal Channel')
                .addChannelTypes(ChannelType.GuildText)
        );
    
    await interaction.reply({
        content: '### Edit Appeal Channels\nSelect the channels for each appeal type:',
        components: [row1, row2],
        flags: ["Ephemeral"]
    });
}

async function handleEditManagerRoles(interaction, config) {
    let description = '### Current Appeal Manager Roles\n\n';
    
    if (config.banAppealSystem.enabled && config.banAppealSystem.appealManagerRoles.length > 0) {
        description += '**Ban Appeals:**\n';
        config.banAppealSystem.appealManagerRoles.forEach(roleId => {
            description += `<@&${roleId}>\n`;
        });
        description += '\n';
    }
    
    if (config.timeoutAppealSystem.enabled && config.timeoutAppealSystem.appealManagerRoles.length > 0) {
        description += '**Timeout Appeals:**\n';
        config.timeoutAppealSystem.appealManagerRoles.forEach(roleId => {
            description += `<@&${roleId}>\n`;
        });
    }
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('cmd{mod-add-manager-roles}')
                .setLabel('Add Roles')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('cmd{mod-remove-manager-roles}')
                .setLabel('Remove Roles')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖')
        );
    
    await interaction.reply({
        content: description,
        components: [row],
        flags: ["Ephemeral"]
    });
}

async function handleEditLogChannel(interaction) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('cmd{mod-edit-log-channel}')
                .setPlaceholder('Select Log Channel')
                .addChannelTypes(ChannelType.GuildText)
        );
    
    await interaction.reply({
        content: '### Edit Log Channel\nSelect the channel where moderation logs will be sent:',
        components: [row],
        flags: ["Ephemeral"]
    });
}

async function handleEditLogManagerRoles(interaction, config) {
    let description = '### Current Log Manager Roles\n\n';
    
    if (config.logManagerRoles && config.logManagerRoles.length > 0) {
        config.logManagerRoles.forEach(roleId => {
            description += `<@&${roleId}>\n`;
        });
    } else {
        description += 'No roles set (no pings in logs)\n';
    }
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('cmd{mod-add-log-manager-roles}')
                .setLabel('Add Roles')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('cmd{mod-remove-log-manager-roles}')
                .setLabel('Remove Roles')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖'),
            new ButtonBuilder()
                .setCustomId('cmd{mod-skip-log-manager-roles}')
                .setLabel('Skip (No Pings)')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⏭️')
        );
    
    await interaction.reply({
        content: description,
        components: [row],
        flags: ["Ephemeral"]
    });
}
