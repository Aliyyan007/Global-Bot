const { TextInputStyle, InteractionType, ActionRowBuilder, ModalBuilder, TextInputBuilder, Collection, LabelBuilder } = require("discord.js")

/**
 * SECURITY WARNING: This command uses eval() which can execute arbitrary code.
 * It is restricted to the bot owner only and should NEVER be exposed to other users.
 * This command is intended for debugging and development purposes only.
 */
module.exports = {
    name: 'eval',
    description: 'Run JS code (OWNER ONLY - DANGEROUS)',
    dmPermission: true,
    group: `admins-group`,
    defaultMemberPermissions: "Administrator",
    owner: true,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        // CRITICAL: Double-check owner permission - this command is extremely dangerous
        if (interaction.user.id !== client.config.discord.ownerId) {
            console.warn(`[SECURITY] Unauthorized eval attempt by user ${interaction.user.id} (${interaction.user.tag})`)
            return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const modal = new ModalBuilder()
            .setCustomId(`content`)
            .setTitle(`Run JS code`)
            .setLabelComponents([
                new LabelBuilder()
                    .setLabel(`Expression`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("content")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph)
                    ),
            ])
        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
        const filter = (i) => i.customId === `content` && i.user.id === interaction.user.id
        interaction = await interaction.awaitModalSubmit({ filter, time: 300000 }).catch(e => interaction)
        if (interaction && interaction.type === InteractionType.ModalSubmit) {
            const modalArgs = {}
            interaction.fields.fields.each(field => modalArgs[field.customId] = field.value)
            try {
                const result = await eval(modalArgs.content)
                let json = JSON.stringify(result)
                return interaction.reply({ content: `${json?.slice(0, 2000)}`, flags: ["Ephemeral"] })
            } catch (err) {
                interaction.reply({ content: err.stack, flags: ["Ephemeral"] })
            }
        } else return
    }
}