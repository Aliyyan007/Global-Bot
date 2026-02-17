/**
 * Handler for user selection from View Others sticky button
 * Handles UserSelectMenu interaction for viewing other users' profiles or ranks
 * **Validates: Requirements 3.3, 6.3**
 */

// Regex patterns to extract data from customId (old format)
const commandRegexp = /command{(.*?)}/
const guildRegexp = /guild{(.*?)}/
const channelRegexp = /channel{(.*?)}/

// Regex patterns for compact format: c{sus}n{<name>}ch{<channelId>}
const compactPrefixRegexp = /^c{sus}/
const compactNameRegexp = /n{(.*?)}/
const compactChannelRegexp = /ch{(.*?)}/

/**
 * Parses a custom ID for sticky-user-select (supports both old and new compact formats)
 * @param {string} customId - The custom ID to parse
 * @param {string} guildId - The guild ID from interaction context
 * @returns {Object|null} Parsed data { commandName, guildId, channelId } or null if invalid
 */
function parseUserSelectCustomId(customId, guildId) {
    // Detect format by checking for compact prefix c{sus}
    if (compactPrefixRegexp.test(customId)) {
        // Compact format parsing
        const nameMatch = compactNameRegexp.exec(customId)
        const channelMatch = compactChannelRegexp.exec(customId)
        
        if (!nameMatch || !channelMatch) {
            return null
        }
        
        return {
            commandName: nameMatch[1],
            guildId: guildId,
            channelId: channelMatch[1]
        }
    } else {
        // Old format parsing
        const commandMatch = commandRegexp.exec(customId)
        const guildMatch = guildRegexp.exec(customId)
        const channelMatch = channelRegexp.exec(customId)
        
        if (!commandMatch || !channelMatch) {
            return null
        }
        
        return {
            commandName: commandMatch[1],
            guildId: guildMatch ? guildMatch[1] : guildId,
            channelId: channelMatch[1]
        }
    }
}

module.exports = {
    name: `sticky-user-select`,
    // Export helper function for testing
    parseUserSelectCustomId,
    run: async (client, interaction) => {
        // Parse customId using the parseUserSelectCustomId function (supports both old and compact formats)
        const parsed = parseUserSelectCustomId(interaction.customId, interaction.guildId)

        if (!parsed || !parsed.commandName || !parsed.channelId) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "Error processing command", guildId: interaction.guildId, locale: interaction.locale })}`, 
                flags: ["Ephemeral"] 
            })
        }

        const { commandName, guildId, channelId } = parsed

        // Get the selected user ID from the UserSelectMenu
        const selectedUserId = interaction.values[0]

        if (!selectedUserId) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "User not selected", guildId: interaction.guildId, locale: interaction.locale }) || 'No user selected'}`, 
                flags: ["Ephemeral"] 
            })
        }

        // Get the target command from client.slashCommands
        const targetCommand = client.slashCommands.get(commandName)

        if (!targetCommand) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} ${client.language({ textId: "Command", guildId: interaction.guildId, locale: interaction.locale })} \`/${commandName}\` ${client.language({ textId: "not found", guildId: interaction.guildId, locale: interaction.locale })}`, 
                flags: ["Ephemeral"] 
            })
        }

        // Execute the target command with the selected user
        // Create a wrapped interaction that passes the selected user as an argument
        const wrappedInteraction = Object.create(interaction)
        wrappedInteraction.isChatInputCommand = () => true
        wrappedInteraction.isButton = () => false
        wrappedInteraction.isStringSelectMenu = () => false
        wrappedInteraction.isUserSelectMenu = () => false
        wrappedInteraction.deferred = false
        wrappedInteraction.replied = false

        // Defer the reply first (public, not ephemeral) since we're viewing another user's profile/rank
        await interaction.deferReply()
        
        // Update wrapped interaction to reflect deferred state
        wrappedInteraction.deferred = true
        wrappedInteraction.deferReply = async () => {} // No-op since already deferred
        wrappedInteraction.reply = async (options) => interaction.editReply(options) // Redirect to editReply

        try {
            // Pass the selected user ID as an argument to the command
            // The profile and rank commands accept { user: userId } as args
            // NOT ephemeral - viewing other users' profiles/ranks should be public
            await targetCommand.run(client, wrappedInteraction, { user: selectedUserId })
        } catch (error) {
            console.error(`Error executing sticky-user-select for ${commandName}:`, error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: `${client.config.emojis.NO} ${client.language({ textId: "An error occurred while executing the command", guildId: interaction.guildId, locale: interaction.locale })}`,
                    flags: ["Ephemeral"]
                })
            }
        }
    }
}
