const { TextInputStyle, InteractionType, ModalBuilder, TextInputBuilder, Collection, LabelBuilder } = require("discord.js")

/**
 * /del — delete any message by its link. OWNER ONLY.
 *
 * Opens a modal immediately, asks for a Discord message link, then fetches
 * and deletes that message wherever the bot can reach it (any guild channel
 * it can see + Manage Messages, or its own DM messages via @me links).
 */
module.exports = {
    name: 'del',
    description: 'Delete a message by link (OWNER ONLY)',
    dmPermission: true,
    group: `admins-group`,
    guildOnly: true,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        if (interaction.user.id !== client.config.discord.ownerId) {
            console.warn(`[SECURITY] Unauthorized del attempt by user ${interaction.user.id} (${interaction.user.tag})`)
            return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const modal = new ModalBuilder()
            .setCustomId(`del_modal`)
            .setTitle(`Delete message`)
            .setLabelComponents([
                new LabelBuilder()
                    .setLabel(`Message link`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId("msglink")
                            .setRequired(true)
                            .setMaxLength(200)
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder("https://discord.com/channels/…/…/…")
                    ),
            ])
        await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
        const filter = (i) => i.customId === `del_modal` && i.user.id === interaction.user.id
        const submitted = await interaction.awaitModalSubmit({ filter, time: 120000 }).catch(e => null)
        if (!submitted || submitted.type !== InteractionType.ModalSubmit) return

        const fail = (msg) => submitted.reply({ content: `${client.config.emojis.NO} ${msg}`, flags: ["Ephemeral"] })

        const modalArgs = {}
        submitted.fields.fields.each(field => modalArgs[field.customId] = field.value)
        // Accepts guild links (…/channels/guild/channel/message) and DM links
        // (…/channels/@me/channel/message)
        const linkMatch = /channels\/(@me|\d+)\/(\d+)\/(\d+)/.exec((modalArgs.msglink || "").trim())
        if (!linkMatch) return fail(`That doesn't look like a message link — right-click a message → **Copy Message Link**.`)

        const channel = await client.channels.fetch(linkMatch[2]).catch(() => null)
        if (!channel?.isTextBased?.() || !channel?.messages) {
            return fail(`I can't access that channel — I'm either not in the server or missing permissions there.`)
        }
        const msg = await channel.messages.fetch(linkMatch[3], { force: true }).catch(() => null)
        if (!msg) return fail(`Message not found — it may already be deleted, or I can't see it.`)

        // Trust the delete call itself — it resolves with the deleted Message
        // and throws on failure. (Re-fetching to "confirm" can return the
        // still-cached copy before the gateway delete event lands.)
        try {
            await msg.delete()
        } catch (e) {
            if (e?.code === 50013 || e?.code === 50001) {
                return fail(`I can't delete that message — I need **Manage Messages** in <#${channel.id}> (or it isn't mine, in DMs).`)
            }
            if (e?.code === 10008) return fail(`Message not found — it may already be deleted.`)
            return fail(`Delete failed: ${e?.message || 'Unknown error'}`)
        }

        const where = channel.guild ? `<#${channel.id}> in **${channel.guild.name}**` : `your DMs`
        return submitted.reply({ content: `${client.config.emojis.YES} Deleted the message in ${where}.`, flags: ["Ephemeral"] })
    }
}
