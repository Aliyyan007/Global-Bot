/**
 * Handler for sticky command manager - requirement selection for a specific command
 * CustomId: cmd{scm_add_req}
 * Handles the actual requirement selection after a command is chosen
 * **Validates: Requirements 5.2, 5.3**
 */

const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { getSession, setCommandRequirements } = require("../handler/stickyManagerSession.js")
const { SUPPORTED_COMMANDS } = require("../slash-commands/sticky-cmd-manager.js")
const { requirementCommandSelection, getRequirementNamesDisplay } = require("./scm-add-requirement.js")

module.exports = {
    name: `scm_add_req`,
    run: async (client, interaction) => {
        // Get session for this user
        const session = getSession(interaction.guildId, interaction.user.id)
        
        if (!session) {
            return interaction.reply({
                content: `${client.config.emojis.NO} **Session Expired**\n\n` +
                         `Your configuration session has expired.\n` +
                         `💡 Please run \`/sticky-cmd-manager\` again to start over.`,
                flags: ["Ephemeral"]
            })
        }

        // Get the selected command from temporary storage
        const userKey = `${interaction.guildId}_${interaction.user.id}`
        const selectedCommand = requirementCommandSelection.get(userKey)

        if (!selectedCommand) {
            // No command selected, show error
            return interaction.update({
                content: `⚠️ Please select a command first using the command dropdown above.`,
                embeds: [],
                components: interaction.message.components
            })
        }

        // Get selected requirement IDs from the interaction
        const selectedRequirementIds = interaction.values

        // Update session with selected requirements for this command
        setCommandRequirements(interaction.guildId, interaction.user.id, selectedCommand, selectedRequirementIds)

        // Get updated session
        const updatedSession = getSession(interaction.guildId, interaction.user.id)

        // Build confirmation message
        const cmd = SUPPORTED_COMMANDS.find(c => c.name === selectedCommand)
        let confirmationMsg = `${client.config.emojis.YES} **Requirements Updated for ${cmd ? cmd.label : selectedCommand}**\n\n`
        
        if (selectedRequirementIds.length > 0) {
            confirmationMsg += `📋 **Selected (${selectedRequirementIds.length}):**\n`
            for (const reqId of selectedRequirementIds) {
                const permission = client.cache.permissions.get(reqId)
                if (permission) {
                    confirmationMsg += `• ${permission.name}\n`
                } else {
                    confirmationMsg += `• ${reqId}\n`
                }
            }
            confirmationMsg += `\n💡 Users must meet ALL requirements to use this command.`
        } else {
            confirmationMsg += `🗑️ All requirements cleared for this command.\n\n` +
                              `💡 Anyone can use this command now.`
        }

        // Build current requirements display for all commands
        let requirementsDisplay = ''
        if (updatedSession.requirements.size > 0) {
            requirementsDisplay = `\n\n📊 **All Command Requirements:**\n`
            for (const [cmdName, reqIds] of updatedSession.requirements) {
                const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
                const emoji = cmdInfo ? cmdInfo.emoji : '⚙️'
                const reqNames = reqIds.map(reqId => {
                    const permission = client.cache.permissions.get(reqId)
                    return permission ? permission.name : reqId
                }).join(', ')
                requirementsDisplay += `${emoji} **${cmdName}**: ${reqNames}\n`
            }
        }

        confirmationMsg += requirementsDisplay
        confirmationMsg += `\n\n💡 Click **Done** to save changes to the panel.`

        // Rebuild the UI with updated defaults
        // Get all permissions (requirements) for this guild
        const guildPermissions = client.cache.permissions.filter(p => p.guildID === interaction.guildId)
        
        // Build requirement options from guild permissions
        const requirementOptions = []
        guildPermissions.forEach(permission => {
            if (permission.enable) {
                requirementOptions.push({
                    label: permission.name.length > 100 ? permission.name.substring(0, 97) + '...' : permission.name,
                    description: `ID: ${permission.id}`.substring(0, 100),
                    value: permission.id,
                    default: selectedRequirementIds.includes(permission.id)
                })
            }
        })

        // Limit to 25 options (Discord limit)
        const limitedOptions = requirementOptions.slice(0, 25)

        // Command select menu
        const commandOptions = updatedSession.selectedCommands.map(cmdName => {
            const cmdInfo = SUPPORTED_COMMANDS.find(c => c.name === cmdName)
            const cmdReqs = updatedSession.requirements.get(cmdName) || []
            
            return {
                label: cmdInfo ? cmdInfo.label : cmdName,
                description: getRequirementNamesDisplay(client, cmdReqs, 100),
                value: cmdName,
                emoji: cmdInfo ? cmdInfo.emoji : '⚙️',
                default: cmdName === selectedCommand
            }
        })

        const commandSelect = new StringSelectMenuBuilder()
            .setCustomId('cmd{scm_req_cmd}')
            .setPlaceholder('📌 Step 1: Select command')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(commandOptions)

        // Requirement select menu
        const requirementSelect = new StringSelectMenuBuilder()
            .setCustomId('cmd{scm_add_req}')
            .setPlaceholder('📌 Step 2: Select requirements')
            .setMinValues(0)
            .setMaxValues(Math.max(1, limitedOptions.length))
            .addOptions(limitedOptions.length > 0 ? limitedOptions : [{ label: 'No requirements available', value: 'none', description: 'Create requirements first' }])

        // Done button
        const doneButton = new ButtonBuilder()
            .setCustomId('cmd{scm_req_done}')
            .setLabel('Done')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')

        const row1 = new ActionRowBuilder().addComponents(commandSelect)
        const row2 = new ActionRowBuilder().addComponents(requirementSelect)
        const row3 = new ActionRowBuilder().addComponents(doneButton)

        // Update the ephemeral message
        await interaction.update({
            content: confirmationMsg,
            components: [row1, row2, row3]
        })
    }
}
