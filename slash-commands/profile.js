const { ActivityType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ApplicationCommandOptionType, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, Collection, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, MessageFlags, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ComponentType, LabelBuilder, UserSelectMenuBuilder } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const MemberRegexp = /mbr{(.*?)}/
const { AchievementType } = require("../enums")
const { SocialLinks } = require(`social-links`)
const { format } = require('date-format-parse')
module.exports = {
    name: "profile",
    nameLocalizations: {
        "ru": "профиль",
        "uk": "профіль",
        "es-ES": "perfil"
    },
    description: `View profile`,
    descriptionLocalizations: {
       "ru": "Посмотреть профиль",
       "uk": "Переглянути профіль",
       "es-ES": "Ver perfil"
    },
    options: [
        {
            name: "user",
            nameLocalizations: {
                "ru": "юзер",
                "uk": "користувач",
                "es-ES": "usuario"
            },
            description: `View user's profile`,
            descriptionLocalizations: {
                "ru": "Посмотреть профиль пользователя",
                "uk": "Переглянути профіль користувача",
                "es-ES": "Ver perfil del usuario"
            },
            type: ApplicationCommandOptionType.User,
            required: false
        },

        {
            name: 'ephemeral',
            nameLocalizations: {
                'ru': "эфемерный",
                'uk': "ефемерний",
                'es-ES': "efímero"
            },
            description: 'Message visible only for you',
            descriptionLocalizations: {
                'ru': "Сообщение видно только тебе",
                'uk': "Повідомлення видно тільки вам",
                'es-ES': "Mensaje visible solo para ti"
            },
            type: ApplicationCommandOptionType.Boolean
        }
    ],
    dmPermission: false,
    group: `profile-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        // Helper function to escape regex special characters
        const escapeRegexChars = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match)
        
        // Regex for shortened user format used in gender sub-menu: u{userId}
        const ShortUserRegexp = /u{(\d+)}/
        
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand() && (UserRegexp.exec(interaction.customId) || ShortUserRegexp.exec(interaction.customId))) {
            // Allow anyone to click the like button - don't block based on usr{} for like interactions
            const isLikeButton = interaction.isButton() && interaction.customId.includes("like")
            // Allow anyone to click the reload button - anyone can refresh the profile view
            const isReloadButton = interaction.isButton() && interaction.customId.includes("reload")
            // Allow anyone to use profile-menu select options EXCEPT the "Profile" option itself (cmd{profile})
            // Other options like stats, inventory, achievements etc. are allowed for other users
            const isProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            const isProfileOption = isProfileMenu && interaction.values?.[0]?.includes("cmd{profile}")
            // Check for gender sub-menu (has g{messageId} in customId)
            const isGenderSubMenu = interaction.isStringSelectMenu() && /g{\d+}/.test(interaction.customId)
            // Get user ID from either format
            const userIdMatch = UserRegexp.exec(interaction.customId) || ShortUserRegexp.exec(interaction.customId)
            const userId = userIdMatch ? userIdMatch[1] : null
            if (!isLikeButton && !isReloadButton && !isGenderSubMenu && (!isProfileMenu || isProfileOption) && userId && interaction.user.id !== userId) return interaction.deferUpdate().catch(e => null)
        }
        const flags = []
        const isEphemeralMessage = interaction.message?.flags?.toArray().includes("Ephemeral")
        if (interaction.isChatInputCommand() || interaction.message?.flags.toArray().includes("IsComponentsV2") || args?.ephemeral) flags.push(MessageFlags.IsComponentsV2)
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph") || args?.ephemeral || isEphemeralMessage) flags.push("Ephemeral")
        let member
        if (args?.user) member = await interaction.guild.members.fetch(args.user).catch(e => null)
        else if (interaction.isButton() && MemberRegexp.exec(interaction.customId)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        else if (interaction.isStringSelectMenu() && (MemberRegexp.exec(interaction.customId) || MemberRegexp.exec(interaction.values[0]))) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(e => null)
            if (!(member instanceof GuildMember)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        }
        else member = interaction.member
        if (!member) {
            if (!interaction.replied && !interaction.deferred) return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            else return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [], flags: ["Ephemeral"] })
        }
        
        // Preserve editMode when interacting with profile-settings menu
        // The profile-settings menu is only shown when editMode is true, so if user is interacting with it, preserve editMode
        if (!args) args = {}
        if (interaction.isStringSelectMenu() && interaction.customId.includes("profile-settings")) {
            args.editMode = true
            // Preserve ephemeral flag if the original message was ephemeral
            if (interaction.message?.flags?.toArray().includes("Ephemeral")) {
                args.ephemeral = true
            }
        }
        
        const embed = new EmbedBuilder()
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        let globalUser = await client.globalProfileSchema.findOne({ userID: member.user.id })
        
        // Handle gender selection from sub-menu - directly update the public profile embed
        // Detect by presence of g{messageId} in customId (shortened format for gender select)
        const genderMsgRegexp = /g{(\d+)}/
        const genderMsgMatch = interaction.isStringSelectMenu() ? genderMsgRegexp.exec(interaction.customId) : null
        
        if (genderMsgMatch && genderMsgMatch[1]) {
            const selectedGender = interaction.values[0]
            const genderMap = {
                'sexMale': 'male',
                'sexFemale': 'female',
                'sexNonbinary': 'nonbinary',
                'sexOther': 'other',
                'sexPrefernottosay': 'prefernottosay'
            }
            
            if (genderMap[selectedGender]) {
                profile.sex = genderMap[selectedGender]
                await profile.save()
            }
            
            const originalMessageId = genderMsgMatch[1]
            // Check if editMode flag 'e' is present at the end of customId (after the message ID)
            const isEditMode = interaction.customId.endsWith('e')
            
            try {
                // Fetch the original profile message
                const originalMessage = await interaction.channel.messages.fetch(originalMessageId)
                
                // Check if the original message is ephemeral (only visible to the user)
                const isEphemeral = originalMessage.flags?.toArray().includes("Ephemeral")
                
                if (isEditMode) {
                    if (isEphemeral) {
                        // For ephemeral messages: we can't edit them directly, so just show success
                        // and tell user to use the reload button
                        await interaction.update({ 
                            content: `${client.config.emojis.YES} ${client.language({ textId: "Gender updated successfully", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Please click the Reload button to view the changes", guildId: interaction.guildId, locale: interaction.locale })}.`, 
                            components: [] 
                        })
                        return
                    }
                    
                    // For public /profile-edit command: auto-update the profile and show simple success message
                    await interaction.update({ 
                        content: `${client.config.emojis.YES} ${client.language({ textId: "Gender updated successfully", guildId: interaction.guildId, locale: interaction.locale })}`, 
                        components: [] 
                    })
                    
                    // Rebuild the profile embed with updated gender
                    // Create a fake interaction object that points to the original message
                    const fakeInteraction = {
                        ...interaction,
                        guild: interaction.guild,
                        channel: interaction.channel,
                        user: interaction.user,
                        member: interaction.member,
                        guildId: interaction.guildId,
                        locale: interaction.locale,
                        message: originalMessage,
                        customId: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}`,
                        values: [`usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}`],
                        update: (data) => originalMessage.edit(data),
                        editReply: (data) => originalMessage.edit(data),
                        isChatInputCommand: () => false,
                        isContextMenuCommand: () => false,
                        isButton: () => false,
                        isStringSelectMenu: () => true,
                        isUserSelectMenu: () => false,
                        replied: true,
                        deferred: false
                    }
                    
                    // Update flags based on original message
                    flags.length = 0
                    if (originalMessage.flags?.toArray().includes("IsComponentsV2")) {
                        flags.push(MessageFlags.IsComponentsV2)
                    }
                    
                    // Preserve editMode since this came from /profile-edit
                    args.editMode = true
                    
                    // Continue with the rest of the profile command using the fake interaction
                    interaction = fakeInteraction
                } else {
                    // For regular /profile command: tell user to click Reload button
                    await interaction.update({ 
                        content: `${client.config.emojis.YES} ${client.language({ textId: "Gender updated successfully", guildId: interaction.guildId, locale: interaction.locale })}. ${client.language({ textId: "Please click the Reload button to view the changes", guildId: interaction.guildId, locale: interaction.locale })}.`, 
                        components: [] 
                    })
                    
                    // Don't auto-update the profile - let user click Reload button
                    return
                }
            } catch (err) {
                // If we can't fetch the original message, just acknowledge and continue
                return interaction.deferUpdate()
            }
        }
        
        if (interaction.isStringSelectMenu()) {
            if (interaction.values[0].includes(`joinDate`)) {
                if (profile.joinDateIsHiden) profile.joinDateIsHiden = undefined
                else profile.joinDateIsHiden = true
                await profile.save()
            } else
            if (interaction.values[0].includes(`isHiden`)) {
                // Show ephemeral privacy settings UI
                const embed = new EmbedBuilder()
                    .setTitle(`${client.language({ textId: "Profile privacy settings", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setColor(member.displayHexColor)
                
                // Show currently hidden users if any exist
                let description = `${client.language({ textId: "Select users to hide profile from", guildId: interaction.guildId, locale: interaction.locale })}`
                if (profile.hiddenFromAll) {
                    description += `\n\n**${client.language({ textId: "Current status", guildId: interaction.guildId, locale: interaction.locale })}:** ${client.language({ textId: "Profile hidden from all", guildId: interaction.guildId, locale: interaction.locale })}`
                } else if (profile.hiddenFromUsers && profile.hiddenFromUsers.length > 0) {
                    const hiddenUserMentions = profile.hiddenFromUsers.map(id => `<@${id}>`).join(', ')
                    description += `\n\n**${client.language({ textId: "Hidden from", guildId: interaction.guildId, locale: interaction.locale })}:** ${hiddenUserMentions}`
                }
                embed.setDescription(description)
                
                // User select menu for selecting users to hide from
                const userSelectMenu = new UserSelectMenuBuilder()
                    .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-select-users mbr{${member.user.id}}`)
                    .setPlaceholder(`${client.language({ textId: "Select users", guildId: interaction.guildId, locale: interaction.locale })}...`)
                    .setMaxValues(25)
                
                // Buttons for "Hide For All" and "Clear Hidden List"
                const hideForAllBtn = new ButtonBuilder()
                    .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-hide-all mbr{${member.user.id}}`)
                    .setLabel(`${client.language({ textId: "Hide from all", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(client.config.emojis.block)
                
                const clearHiddenBtn = new ButtonBuilder()
                    .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-clear mbr{${member.user.id}}`)
                    .setLabel(`${client.language({ textId: "Clear hidden list", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(client.config.emojis.on)
                
                const userSelectRow = new ActionRowBuilder().addComponents(userSelectMenu)
                const buttonsRow = new ActionRowBuilder().addComponents(hideForAllBtn, clearHiddenBtn)
                
                return interaction.reply({ 
                    embeds: [embed], 
                    components: [userSelectRow, buttonsRow], 
                    flags: ["Ephemeral"] 
                })
            } else
            if (interaction.values[0].includes(`achievementsHide`)) {
                if (profile.achievementsHiden) profile.achievementsHiden = undefined
                else profile.achievementsHiden = true
                await profile.save()
            } else
            if (interaction.values[0].includes(`sexMale`)) {
                profile.sex = `male`
                await profile.save()
            } else
            if (interaction.values[0].includes(`sexFemale`)) {
                profile.sex = `female`
                await profile.save()
            } else
            if (interaction.values[0].includes(`sexNonbinary`)) {
                profile.sex = `nonbinary`
                await profile.save()
            } else
            if (interaction.values[0].includes(`sexOther`)) {
                profile.sex = `other`
                await profile.save()
            } else
            if (interaction.values[0].includes(`sexPrefernottosay`)) {
                profile.sex = `prefernottosay`
                await profile.save()
            } else
            if (interaction.values[0].includes(`selectGender`)) {
                // Show gender selection sub-menu with 5 options
                // Include original message ID in customId so we can edit it directly after selection
                // Use shortened format to stay under 100 char limit: u{user}c{profile}m{member}g{msgId}
                // Add 'e' flag at the end if in editMode to differentiate behavior
                const originalMessageId = interaction.message.id
                const editModeFlag = args?.editMode ? 'e' : ''
                const genderSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`u{${interaction.user.id}}cmd{profile}m{${member.user.id}}g{${originalMessageId}}${editModeFlag}`)
                    .setPlaceholder(`${client.language({ textId: "Select gender", guildId: interaction.guildId, locale: interaction.locale })}...`)
                    .addOptions([
                        { label: `${client.language({ textId: "Male", guildId: interaction.guildId, locale: interaction.locale })}`, value: `sexMale` },
                        { label: `${client.language({ textId: "Female", guildId: interaction.guildId, locale: interaction.locale })}`, value: `sexFemale` },
                        { label: `${client.language({ textId: "Non-binary", guildId: interaction.guildId, locale: interaction.locale })}`, value: `sexNonbinary` },
                        { label: `${client.language({ textId: "Other", guildId: interaction.guildId, locale: interaction.locale })}`, value: `sexOther` },
                        { label: `${client.language({ textId: "Prefer not to say", guildId: interaction.guildId, locale: interaction.locale })}`, value: `sexPrefernottosay` }
                    ])
                
                const genderRow = new ActionRowBuilder().addComponents(genderSelectMenu)
                
                return interaction.reply({
                    components: [genderRow],
                    flags: ["Ephemeral"]
                })
            } else
            if (interaction.values[0].includes(`sexHide`)) {
                if (profile.hideSex) profile.hideSex = undefined
                else profile.hideSex = true
                await profile.save()
            } else
            if (interaction.values[0].includes(`trophyHide`)) {
                if (profile.trophyHide) profile.trophyHide = undefined
                else profile.trophyHide = true
                await profile.save()
            } else
            if (interaction.values[0].includes(`lastOnlineHide`)) {
                if (!globalUser) globalUser = await client.functions.fetchGlobalProfile(client, member.user.id)
                if (!globalUser.lastOnlineHiden) globalUser.lastOnlineHiden = true
                else globalUser.lastOnlineHiden = undefined
                await globalUser.save()
            } else
            if (interaction.values[0].includes(`VK`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editVK_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "VK Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.vk || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editVK_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.link = interaction.fields.getTextInputValue("link") || null
                    if (!modalArgs.link) {
                        profile.vk = undefined
                    } else if (modalArgs.link) {
                        const socialLinks = new SocialLinks()
                        const VK = {
                            name: `VK`,
                            matches: [
                                {
                                    match: `(https?://)?(www.)?vk.com/({PROFILE_ID})(/)?`, group: 3,
                                    pattern: `https://vk.com/{PROFILE_ID}`
                                }
                            ]
                        }
                        const profileMatches = VK.matches
                        socialLinks.addProfile(`VK`, profileMatches)
                        if (!socialLinks.isValid("VK", modalArgs.link)) {
                            return interaction.reply({ content: `${client.language({ textId: "Invalid link", guildId: interaction.guildId, locale: interaction.locale })} VK`, flags: ["Ephemeral"] })
                        }
                        profile.vk = modalArgs.link    
                    }
                    await profile.save()
                } else return
            } else
            if (interaction.values[0].includes(`TikTok`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editTikTok_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "TikTok Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.tiktok || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editTikTok_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.link = interaction.fields.getTextInputValue("link") || null
                    if (!modalArgs.link) {
                        profile.tiktok = undefined
                    } else if (modalArgs.link) {
                        const socialLinks = new SocialLinks()
                        if (!socialLinks.isValid("tiktok", modalArgs.link)) {
                            return interaction.reply({ content: `${client.language({ textId: "Invalid link", guildId: interaction.guildId, locale: interaction.locale })} TikTok`, flags: ["Ephemeral"] })
                        }
                        profile.tiktok = modalArgs.link    
                    }
                    await profile.save()
                } else return
            } else
            if (interaction.values[0].includes(`Instagram`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editInstagram_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Instagram Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.instagram || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editInstagram_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.link = interaction.fields.getTextInputValue("link") || null
                    if (!modalArgs.link) {
                        profile.instagram = undefined
                    } else if (modalArgs.link) {
                        const socialLinks = new SocialLinks()
                        if (!socialLinks.isValid("instagram", modalArgs.link)) {
                            return interaction.reply({ content: `${client.language({ textId: "Invalid link", guildId: interaction.guildId, locale: interaction.locale })} Instagram`, flags: ["Ephemeral"] })
                        }
                        profile.instagram = modalArgs.link    
                    }
                    await profile.save()
                } else return 
            } else
            if (interaction.values[0].includes(`Steam`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editSteam_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Steam Link", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("link")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.steam || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editSteam_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.link = interaction.fields.getTextInputValue("link") || null
                    if (!modalArgs.link) {
                        profile.steam = undefined
                    } else if (modalArgs.link) {
                        const socialLinks = new SocialLinks()
                        const Steam = {
                            name: `Steam`,
                            matches: [
                                {
                                    match: `(https?://)?(www.)?steamcommunity.com/id/({PROFILE_ID})(/)?`, group: 3,
                                    pattern: `https://steamcommunity.com/id/{PROFILE_ID}`
                                },
                                {
                                    match: `(https?://)?(www.)?steamcommunity.com/profiles/({PROFILE_ID})(/)?`, group: 3,
                                    pattern: `https://steamcommunity.com/profiles/{PROFILE_ID}`
                                }
                            ]
                        }
                        const profileMatches = Steam.matches
                        socialLinks.addProfile(`Steam`, profileMatches)
                        if (!socialLinks.isValid("Steam", modalArgs.link)) {
                            return interaction.reply({ content: `${client.language({ textId: "Invalid link", guildId: interaction.guildId, locale: interaction.locale })} Steam`, flags: ["Ephemeral"] })
                        }
                        profile.steam = modalArgs.link    
                    }
                    await profile.save()
                } else return
            } else
            if (interaction.values[0].includes(`description`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editDescription_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Profile description", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("description")
                                .setMaxLength(300)
                                .setRequired(false)
                                .setStyle(TextInputStyle.Paragraph)
                                .setValue(`${profile.bio || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editDescription_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.description = interaction.fields.getTextInputValue("description") || null
                    if (!modalArgs.description) profile.bio = undefined
                    else profile.bio = modalArgs.description
                    await profile.save()
                } else return
            } else
            if (interaction.values[0].includes(`banner`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editBanner_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Profile banner", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("banner")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.image || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editBanner_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.banner = interaction.fields.getTextInputValue("banner") || null
                    if (!modalArgs.banner) {
                        profile.image = undefined
                    } else {
                        const isImageURL = require('image-url-validator').default;
                        const banner = await isImageURL(modalArgs.banner)
                        if (!banner) {
                            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "String", guildId: interaction.guildId, locale: interaction.locale })} **${modalArgs.banner}** ${client.language({ textId: "is not a direct link to image", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
                        }
                        profile.image = modalArgs.banner    
                    }
                    await profile.save()
                } else return
            } else
            if (interaction.values[0].includes(`birthday`)) {
                const modal = new ModalBuilder()
                .setCustomId(`editBirthday_${interaction.id}`)
                .setTitle(`${client.language({ textId: "EDIT PROFILE", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setLabelComponents([
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("day")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.birthday_day ? convert(profile.birthday_day) : ""}`)
                        ),
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Month", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("month")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.birthday_month ? convert(profile.birthday_month) : ""}`)
                        ),
                    new LabelBuilder()
                        .setLabel(`${client.language({ textId: "Year", guildId: interaction.guildId, locale: interaction.locale })}`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("year")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false)
                                .setValue(`${profile.birthday_year || ""}`)
                        )
                ])
                await interaction.showModal(modal);delete client.globalCooldown[`${interaction.guildId}_${interaction.user.id}`]
                const filter = (i) => i.customId === `editBirthday_${interaction.id}` && i.user.id === interaction.user.id;
                interaction = await interaction.awaitModalSubmit({ filter, time: 180000 }).catch(e => interaction)
                if (interaction && interaction.type === InteractionType.ModalSubmit) {
                    const modalArgs = {}
                    modalArgs.day = interaction.fields.getTextInputValue("day") || null
                    modalArgs.month = interaction.fields.getTextInputValue("month") || null
                    modalArgs.year = interaction.fields.getTextInputValue("year") || null
                    if (!modalArgs.day && !modalArgs.month && !modalArgs.year) {
                        profile.birthday_day = undefined;
                        profile.birthday_month = undefined;
                        profile.birthday_year = undefined;
                    } else {
                        // Parse day and month as integers to accept both "6" and "06" formats
                        const dayNum = parseInt(modalArgs.day, 10)
                        const monthNum = parseInt(modalArgs.month, 10)
                        const yearNum = parseInt(modalArgs.year, 10)
                        
                        // Validate the parsed values
                        if (isNaN(dayNum) || isNaN(monthNum) || dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || 
                            (modalArgs.year && (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() - 1))) {
                            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Invalid format", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                        }
                        
                        // Additional validation using Date object to check if the date is valid (e.g., no Feb 30)
                        if (modalArgs.year) {
                            const testDate = new Date(yearNum, monthNum - 1, dayNum)
                            if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum - 1) {
                                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Invalid format", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })
                            }
                        }
                        
                        profile.birthday_day = dayNum;
                        profile.birthday_month = monthNum;
                        profile.birthday_year = modalArgs.year ? yearNum : undefined;  
                    }
                    await profile.save()
                } else return
            }
        }
        if (interaction.values?.[0].includes("mentions") || interaction.customId?.includes("mentions")) {
            embed.setAuthor({ name: `${member.displayName} | ${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() }) 
            embed.setTitle(`${client.language({ textId: "Mention settings", guildId: interaction.guildId, locale: interaction.locale })}`)
            embed.setColor(member.displayHexColor)
            if (interaction.customId.includes("edit")) {
                interaction.values.forEach(e => {
                    if (profile[e]) profile[e] = undefined
                    else profile[e] = true
                })
                await profile.save()
            }
            embed.addFields([
                {
                    name: `${client.language({ textId: "New level mention", guildId: interaction.guildId, locale: interaction.locale })}`, value: profile.levelMention ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, inline: true
                },
                {
                    name: `${client.language({ textId: "New achievement mention", guildId: interaction.guildId, locale: interaction.locale })}`, value: profile.achievementMention ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, inline: true
                },
                {
                    name: `${client.language({ textId: "New item mention", guildId: interaction.guildId, locale: interaction.locale })}`, value: profile.itemMention ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, inline: true
                },
                {
                    name: `${client.language({ textId: "Role income mention", guildId: interaction.guildId, locale: interaction.locale })}`, value: profile.roleIncomeMention ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, inline: true
                },
                {
                    name: `${client.language({ textId: "Invited user join mention", guildId: interaction.guildId, locale: interaction.locale })}`, value: profile.inviteJoinMention ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, inline: true
                },
                {
                    name: `${client.language({ textId: "Invited user leave mention", guildId: interaction.guildId, locale: interaction.locale })}`, value: profile.inviteLeaveMention ? `${client.config.emojis.on}${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.config.emojis.off}${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, inline: true
                }
            ])
            const selectMenuOptions = [
                {
                    emoji: client.config.emojis.medal, label: `${client.language({ textId: "New level mention", guildId: interaction.guildId, locale: interaction.locale })}`, description: profile.levelMention ? `🔔${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔕${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `levelMention`
                },
                {
                    emoji: client.config.emojis.achievements, label: `${client.language({ textId: "New achievement mention", guildId: interaction.guildId, locale: interaction.locale })}`, description: profile.achievementMention ? `🔔${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔕${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `achievementMention`
                },
                {
                    emoji: client.config.emojis.box, label: `${client.language({ textId: "New item mention", guildId: interaction.guildId, locale: interaction.locale })}`, description: profile.itemMention ? `🔔${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔕${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `itemMention`
                },
                {
                    emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role income mention", guildId: interaction.guildId, locale: interaction.locale })}`, description: profile.roleIncomeMention ? `🔔${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔕${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `roleIncomeMention`
                },
                {
                    emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invited user join mention", guildId: interaction.guildId, locale: interaction.locale })}`, description: profile.inviteJoinMention ? `🔔${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔕${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `inviteJoinMention`
                },
                {
                    emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invited user leave mention", guildId: interaction.guildId, locale: interaction.locale })}`, description: profile.inviteLeaveMention ? `🔔${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}` : `🔕${client.language({ textId: "Disabled", guildId: interaction.guildId, locale: interaction.locale })}`, value: `inviteLeaveMention`
                }
            ]
            if (interaction.customId.includes("edit")) {
                return interaction.update({ 
                    embeds: [embed], 
                    components: [
                        new ActionRowBuilder()
                            .addComponents([
                                new StringSelectMenuBuilder()
                                    .setCustomId(`usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}mentions edit`)
                                    .setOptions(selectMenuOptions).setMaxValues(selectMenuOptions.length)
                                    .setPlaceholder(`${client.language({ textId: "Mentions...", guildId: interaction.guildId, locale: interaction.locale })}`)
                            ])
                    ]
                })
            } else {
                return interaction.reply({ 
                    embeds: [embed], 
                    components: [
                        new ActionRowBuilder()
                            .addComponents([
                                new StringSelectMenuBuilder()
                                    .setCustomId(`usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}mentions edit`)
                                    .setOptions(selectMenuOptions).setMaxValues(selectMenuOptions.length)
                                    .setPlaceholder(`${client.language({ textId: "Mentions...", guildId: interaction.guildId, locale: interaction.locale })}`)
                            ])
                    ],
                    flags: ["Ephemeral"]
                })
            }
            
        }
        // Task 4.5: Enhanced visibility check using isHiddenFrom method
        // Check visibility BEFORE deferReply so we can respond with ephemeral message
        const isAdmin = interaction.member.permissions.has("Administrator")
        if (member.user.bot || profile.isHiddenFrom(interaction.user.id, isAdmin)) {
            const container = new ContainerBuilder()
                .setAccentColor(hex2rgb(member.displayHexColor))
            const section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${member.displayName} | ${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`))
            try {
                section.setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(profile.thumbnail || member.displayAvatarURL()))
            } catch (err) {
                section.setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(member.displayAvatarURL()))
            }
            container.addSectionComponents(section)
            container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large))
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.config.emojis.block} ${client.language({ textId: "This user has hidden their profile", guildId: interaction.guildId, locale: interaction.locale })}`))
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] })
        }
        if (interaction.isChatInputCommand()) await interaction.deferReply({ flags })
        if (interaction.isButton() && interaction.customId.includes("like")) {
            // Check for self-like attempt
            if (interaction.user.id === member.user.id) {
                return interaction.reply({ content: "You cannot like your own profile", flags: [MessageFlags.Ephemeral] })
            }
            // Check for duplicate like attempt
            if (profile.usersWhoLiked?.includes(interaction.user.id)) {
                return interaction.reply({ content: "You have already liked this profile", flags: [MessageFlags.Ephemeral] })
            }
            
            // Prevent double-click by checking a temporary lock
            const lockKey = `like_${interaction.user.id}_${member.user.id}`
            if (client.tempLikes?.[lockKey]) {
                return interaction.reply({ content: "Please wait...", flags: [MessageFlags.Ephemeral] })
            }
            if (!client.tempLikes) client.tempLikes = {}
            client.tempLikes[lockKey] = true
            
            // Calculate predicted values for immediate UI update
            const settings = client.cache.settings.get(interaction.guildId)
            const predictedLikes = (profile.likes || 0) + 1
            const rpReward = settings.rpForLike && !profile.blockActivities?.like?.RP ? settings.rpForLike + (settings.rpForLike * profile.getRpBoost()) : 0
            const curReward = settings.curForLike && !profile.blockActivities?.like?.CUR ? settings.curForLike + (settings.curForLike * profile.getCurBoost()) : 0
            const predictedRp = (profile.rp || 0) + rpReward
            const predictedCurrency = Math.floor((profile.currency || 0) + curReward)
            
            // Check if using Components V2 (container-based)
            const isComponentsV2 = interaction.message.flags.toArray().includes("IsComponentsV2")
            if (isComponentsV2) {
                // For Components V2, rebuild the container's action rows with updated like count
                try {
                    const messageComponents = interaction.message.components
                    const heartEmoji = client.config.emojis.heart
                    const rpEmoji = client.config.emojis.RP
                    const currencyEmoji = settings.displayCurrencyEmoji
                    
                    // Helper function to update stats in text content
                    const updateStatsContent = (content) => {
                        if (!content || typeof content !== 'string') return content
                        
                        let updated = content
                        
                        // Update heart/likes count
                        const escapedHeart = escapeRegexChars(heartEmoji)
                        const heartRegex = new RegExp(escapedHeart + '[\\u200e\\u200f\\s]+[\\d,\\.]+', 'g')
                        updated = updated.replace(heartRegex, heartEmoji + '\u200e \u200e ' + predictedLikes.toLocaleString())
                        
                        // Update RP count (only if rewards enabled)
                        if (rpReward > 0) {
                            const escapedRP = escapeRegexChars(rpEmoji)
                            const rpRegex = new RegExp(escapedRP + '[\\u200e\\u200f\\s]+[\\d,\\.]+', 'g')
                            updated = updated.replace(rpRegex, rpEmoji + '\u200e \u200e ' + Math.floor(predictedRp).toLocaleString())
                        }
                        
                        // Update currency count (only if rewards enabled)
                        if (curReward > 0) {
                            const escapedCurrency = escapeRegexChars(currencyEmoji)
                            const currencyRegex = new RegExp(escapedCurrency + '[\\u200e\\u200f\\s]+[\\d,\\.]+', 'g')
                            updated = updated.replace(currencyRegex, currencyEmoji + '\u200e \u200e ' + predictedCurrency.toLocaleString())
                        }
                        
                        return updated
                    }
                    
                    // Recursively update components
                    const updateComponent = (comp) => {
                        if (!comp) return comp
                        
                        // Update text display content (type 10 - TextDisplay)
                        if (comp.type === 10 && comp.content) {
                            comp.content = updateStatsContent(comp.content)
                        }
                        
                        // Update like button (type 2)
                        if (comp.type === 2 && comp.custom_id?.includes("like")) {
                            comp.label = `${predictedLikes}`
                            comp.disabled = false
                        }
                        
                        // Recursively update nested components
                        if (comp.components && Array.isArray(comp.components)) {
                            comp.components = comp.components.map(updateComponent)
                        }
                        
                        // Handle section accessory (thumbnail sections have text in accessory)
                        if (comp.accessory) {
                            comp.accessory = updateComponent(comp.accessory)
                        }
                        
                        return comp
                    }
                    
                    // Find and update the container's components
                    const updatedComponents = messageComponents.map(component => {
                        // Check if this is a container (type 17)
                        if (component.type === 17) {
                            const containerData = component.toJSON()
                            if (containerData.components) {
                                containerData.components = containerData.components.map(updateComponent)
                            }
                            return containerData
                        }
                        return component.toJSON()
                    })
                    // Update UI immediately with predicted values
                    await interaction.update({ components: updatedComponents, flags: [MessageFlags.IsComponentsV2] })
                    
                    // Run addLike in background (don't await) - handles DB updates, achievements, DM
                    client.functions.addLike(client, interaction.user.id, interaction.guildId, member.user.id, 1, interaction.channel)
                        .then(() => delete client.tempLikes[lockKey])
                        .catch(err => {
                            console.error('Error in addLike:', err)
                            delete client.tempLikes[lockKey]
                        })
                    
                    return interaction.followUp({ content: "Successfully liked", flags: [MessageFlags.Ephemeral] })
                } catch (err) {
                    // Log the error for debugging
                    console.error('Error updating Components V2 like:', err)
                    // Clear the lock on error too
                    delete client.tempLikes[lockKey]
                    // If update failed but interaction was acknowledged, just return
                    return
                }
            }
            // Update the like button with new count and disable it for this user (regular components)
            const updatedComponents = interaction.message.components.map(row => {
                const newRow = new ActionRowBuilder()
                row.components.forEach(component => {
                    if (component.customId?.includes("like")) {
                        newRow.addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Secondary)
                                .setCustomId(component.customId)
                                .setEmoji(client.config.emojis.heart)
                                .setLabel(`${predictedLikes}`)
                        )
                    } else if (component.type === 2) { // Button
                        newRow.addComponents(ButtonBuilder.from(component))
                    } else if (component.type === 3) { // StringSelectMenu
                        newRow.addComponents(StringSelectMenuBuilder.from(component))
                    }
                })
                return newRow
            }).filter(row => row.components.length > 0)
            // Update embed description and fields with new stats
            const heartEmoji = client.config.emojis.heart
            const rpEmoji = client.config.emojis.RP
            const currencyEmoji = settings.displayCurrencyEmoji
            
            const updateStatsInText = (text) => {
                if (!text) return text
                let updated = text
                
                // Update heart/likes
                const escapedHeart = escapeRegexChars(heartEmoji)
                const heartRegex = new RegExp(escapedHeart + '[\\u200e\\u200f\\s]+[\\d,\\.]+', 'g')
                updated = updated.replace(heartRegex, heartEmoji + '\u200e \u200e ' + predictedLikes.toLocaleString())
                
                // Update RP (only if rewards enabled)
                if (rpReward > 0) {
                    const escapedRP = escapeRegexChars(rpEmoji)
                    const rpRegex = new RegExp(escapedRP + '[\\u200e\\u200f\\s]+[\\d,\\.]+', 'g')
                    updated = updated.replace(rpRegex, rpEmoji + '\u200e \u200e ' + Math.floor(predictedRp).toLocaleString())
                }
                
                // Update currency (only if rewards enabled)
                if (curReward > 0) {
                    const escapedCurrency = escapeRegexChars(currencyEmoji)
                    const currencyRegex = new RegExp(escapedCurrency + '[\\u200e\\u200f\\s]+[\\d,\\.]+', 'g')
                    updated = updated.replace(currencyRegex, currencyEmoji + '\u200e \u200e ' + predictedCurrency.toLocaleString())
                }
                
                return updated
            }
            
            const updatedEmbeds = interaction.message.embeds.map(embed => {
                const newEmbed = EmbedBuilder.from(embed)
                if (embed.description) {
                    newEmbed.setDescription(updateStatsInText(embed.description))
                }
                // Update the stats in fields (Statistics section)
                if (embed.fields && embed.fields.length > 0) {
                    const updatedFields = embed.fields.map(field => ({
                        name: field.name,
                        value: updateStatsInText(field.value),
                        inline: field.inline
                    }))
                    newEmbed.setFields(updatedFields)
                }
                return newEmbed
            })
            
            // Update UI immediately with predicted values
            await interaction.update({ embeds: updatedEmbeds, components: updatedComponents })
            
            // Run addLike in background (don't await) - handles DB updates, achievements, DM
            client.functions.addLike(client, interaction.user.id, interaction.guildId, member.user.id, 1, interaction.channel)
                .then(() => delete client.tempLikes[lockKey])
                .catch(err => {
                    console.error('Error in addLike:', err)
                    delete client.tempLikes[lockKey]
                })
            
            return interaction.followUp({ content: "Successfully liked", flags: [MessageFlags.Ephemeral] })
        }
        // Reload button handler - refresh profile with latest data
        // Shows the same view-only profile (no settings menu) - just refreshes the data
        if (interaction.isButton() && interaction.customId.includes("reload")) {
            // Extract member ID from customId using MemberRegexp
            const memberMatch = MemberRegexp.exec(interaction.customId)
            if (!memberMatch) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            
            // Fetch fresh member data
            const reloadMember = await interaction.guild.members.fetch(memberMatch[1]).catch(e => null)
            if (!reloadMember) {
                return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
            }
            
            // Update member reference to use fresh data
            member = reloadMember
            
            // Fetch fresh profile data from database (bypass cache)
            const freshProfile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
            
            // Continue with the rest of the profile command to rebuild the embed
            // The code below will use the fresh profile data and call interaction.update()
            interaction.isReload = true
            
            // Re-assign profile to use fresh data
            Object.assign(profile, freshProfile)
            
            // Check if editMode was set in the reload button's customId
            // If so, preserve it; otherwise use viewOnly mode
            if (!args) args = {}
            if (interaction.customId.includes("editMode")) {
                args.editMode = true
            } else {
                args.viewOnly = true
            }
            // Preserve ephemeral flag if it was set
            if (interaction.customId.includes("eph")) {
                args.ephemeral = true
            }
        }
        // Privacy settings - User select menu handler (Task 4.2)
        if (interaction.isUserSelectMenu() && interaction.customId.includes("privacy-select-users")) {
            const selectedUserIds = interaction.values
            // Filter out the profile owner from the selection (can't hide from yourself)
            const filteredUserIds = selectedUserIds.filter(id => id !== profile.userID)
            
            // Replace the hidden list with the new selection (allows adding AND removing)
            if (filteredUserIds.length > 0) {
                profile.hiddenFromUsers = filteredUserIds
                profile.hiddenFromAll = undefined // Clear "hide from all" when selecting specific users
            } else {
                profile.hiddenFromUsers = undefined
            }
            await profile.save()
            
            // Update the embed with live preview of hidden users
            const embed = new EmbedBuilder()
                .setTitle(`${client.language({ textId: "Profile privacy settings", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setColor(member.displayHexColor)
            
            let description = `${client.language({ textId: "Select users to hide profile from", guildId: interaction.guildId, locale: interaction.locale })}`
            
            // Show all currently hidden users
            if (profile.hiddenFromUsers && profile.hiddenFromUsers.length > 0) {
                const hiddenUserMentions = profile.hiddenFromUsers.map(id => `<@${id}>`).join(' ・ ')
                description += `\n\n**${client.language({ textId: "Hidden from", guildId: interaction.guildId, locale: interaction.locale })}:** ${hiddenUserMentions}`
            }
            embed.setDescription(description)
            
            // Rebuild the components
            const userSelectMenu = new UserSelectMenuBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-select-users mbr{${member.user.id}}`)
                .setPlaceholder(`${client.language({ textId: "Select users", guildId: interaction.guildId, locale: interaction.locale })}...`)
                .setMaxValues(25)
            
            const hideForAllBtn = new ButtonBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-hide-all mbr{${member.user.id}}`)
                .setLabel(`${client.language({ textId: "Hide from all", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(client.config.emojis.block)
            
            const clearHiddenBtn = new ButtonBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-clear mbr{${member.user.id}}`)
                .setLabel(`${client.language({ textId: "Clear hidden list", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(client.config.emojis.on)
            
            const userSelectRow = new ActionRowBuilder().addComponents(userSelectMenu)
            const buttonsRow = new ActionRowBuilder().addComponents(hideForAllBtn, clearHiddenBtn)
            
            return interaction.update({ 
                embeds: [embed], 
                components: [userSelectRow, buttonsRow]
            })
        }
        // Privacy settings - Hide For All button handler (Task 4.3)
        if (interaction.isButton() && interaction.customId.includes("privacy-hide-all")) {
            profile.hideFromAll()
            await profile.save()
            
            // Update the embed to show "hidden from all" status
            const embed = new EmbedBuilder()
                .setTitle(`${client.language({ textId: "Profile privacy settings", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setColor(member.displayHexColor)
            
            let description = `${client.language({ textId: "Select users to hide profile from", guildId: interaction.guildId, locale: interaction.locale })}`
            description += `\n\n**${client.language({ textId: "Current status", guildId: interaction.guildId, locale: interaction.locale })}:** ${client.language({ textId: "Profile hidden from all", guildId: interaction.guildId, locale: interaction.locale })}`
            embed.setDescription(description)
            
            // Rebuild the components
            const userSelectMenu = new UserSelectMenuBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-select-users mbr{${member.user.id}}`)
                .setPlaceholder(`${client.language({ textId: "Select users", guildId: interaction.guildId, locale: interaction.locale })}...`)
                .setMaxValues(25)
            
            const hideForAllBtn = new ButtonBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-hide-all mbr{${member.user.id}}`)
                .setLabel(`${client.language({ textId: "Hide from all", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(client.config.emojis.block)
            
            const clearHiddenBtn = new ButtonBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-clear mbr{${member.user.id}}`)
                .setLabel(`${client.language({ textId: "Clear hidden list", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(client.config.emojis.on)
            
            const userSelectRow = new ActionRowBuilder().addComponents(userSelectMenu)
            const buttonsRow = new ActionRowBuilder().addComponents(hideForAllBtn, clearHiddenBtn)
            
            return interaction.update({ 
                embeds: [embed], 
                components: [userSelectRow, buttonsRow]
            })
        }
        // Privacy settings - Clear Hidden List button handler (Task 4.4)
        if (interaction.isButton() && interaction.customId.includes("privacy-clear")) {
            profile.unhideProfile()
            await profile.save()
            
            // Update the embed to show cleared status
            const embed = new EmbedBuilder()
                .setTitle(`${client.language({ textId: "Profile privacy settings", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setColor(member.displayHexColor)
            
            let description = `${client.language({ textId: "Select users to hide profile from", guildId: interaction.guildId, locale: interaction.locale })}`
            embed.setDescription(description)
            
            // Rebuild the components
            const userSelectMenu = new UserSelectMenuBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-select-users mbr{${member.user.id}}`)
                .setPlaceholder(`${client.language({ textId: "Select users", guildId: interaction.guildId, locale: interaction.locale })}...`)
                .setMaxValues(25)
            
            const hideForAllBtn = new ButtonBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-hide-all mbr{${member.user.id}}`)
                .setLabel(`${client.language({ textId: "Hide from all", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji(client.config.emojis.block)
            
            const clearHiddenBtn = new ButtonBuilder()
                .setCustomId(`usr{${interaction.user.id}}cmd{profile}privacy-clear mbr{${member.user.id}}`)
                .setLabel(`${client.language({ textId: "Clear hidden list", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(client.config.emojis.on)
            
            const userSelectRow = new ActionRowBuilder().addComponents(userSelectMenu)
            const buttonsRow = new ActionRowBuilder().addComponents(hideForAllBtn, clearHiddenBtn)
            
            return interaction.update({ 
                embeds: [embed], 
                components: [userSelectRow, buttonsRow]
            })
        }
        const settings = client.cache.settings.get(interaction.guildId)
        ms = require(`ms`)
        let birthday = ``
        if (profile.birthday_day && profile.birthday_month) {
            const convertedDay = convert(profile.birthday_day)
            const convertedMonth = convert(profile.birthday_month)
            birthday = `\n${client.language({ textId: "Birthday", guildId: interaction.guildId, locale: interaction.locale })}: ${convertedDay}/${convertedMonth}`
        }
        if (profile.birthday_year) birthday = `${birthday}/${profile.birthday_year}・${Math.floor((Date.now() - new Date(profile.birthday_year, (profile.birthday_month - 1), profile.birthday_day))/1000/60/60/24/365.25)} ${client.language({ textId: `years old`, guildId: interaction.guildId, locale: interaction.locale })}`
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}`, description: `${member.displayName}'s ${client.language({ textId: "Personal profile", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
            { emoji: client.config.emojis.statistics, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${member.displayName}'s ${client.language({ textId: "Inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` }
        ]
        const menuOptions_options = []
        // Show settings menu only when editMode is true (from /profile-edit command)
        // viewOnly takes precedence and hides the menu completely
        if (member.user.id === interaction.user.id && !args?.viewOnly && args?.editMode) {
            menuOptions_options.push(
                { emoji: client.config.emojis.editDescription, label: `${client.language({ textId: "Edit description", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile} description mbr{${member.user.id}}`, description: profile.description ? profile.description.slice(0, 99) : undefined },
                { emoji: client.config.emojis.banner, label: `${client.language({ textId: "Edit banner", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile} banner mbr{${member.user.id}}` },
                { emoji: client.config.emojis.edit, label: `${client.language({ textId: "Edit birthday", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile} birthday mbr{${member.user.id}}`, description: profile.birthday_day ? birthday : undefined },
                { emoji: client.config.emojis.VK, label: `${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })} VK`, value: `usr{${interaction.user.id}}cmd{profile} VK mbr{${member.user.id}}`, description: profile.vk || undefined },
                { emoji: client.config.emojis.TikTok, label: `${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })} TikTok`, value: `usr{${interaction.user.id}}cmd{profile} TikTok mbr{${member.user.id}}`, description: profile.tiktok || undefined },
                { emoji: client.config.emojis.Instagram, label: `${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })} Instagram`, value: `usr{${interaction.user.id}}cmd{profile} Instagram mbr{${member.user.id}}`, description: profile.instagram || undefined },
                { emoji: client.config.emojis.Steam, label: `${client.language({ textId: "Link", guildId: interaction.guildId, locale: interaction.locale })} Steam`, value: `usr{${interaction.user.id}}cmd{profile} Steam mbr{${member.user.id}}`, description: profile.steam || undefined },
                { emoji: client.config.emojis.gender2, label: `${client.language({ textId: "Select gender", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile} selectGender mbr{${member.user.id}}`, description: profile.sex ? client.language({ textId: profile.sex, guildId: interaction.guildId, locale: interaction.locale }) : undefined },
                { emoji: client.config.emojis.watch, label: `${profile.joinDateIsHiden ? `${client.language({ textId: "Show join date", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Hide join date", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `usr{${interaction.user.id}}cmd{profile} joinDate mbr{${member.user.id}}` },
                { emoji: client.config.emojis.achievements, label: `${profile.achievementsHiden ? `${client.language({ textId: "Show achievements", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Hide achievements", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `usr{${interaction.user.id}}cmd{profile} achievementsHide mbr{${member.user.id}}` },
                { emoji: client.config.emojis.gender, label: `${profile.hideSex ? `${client.language({ textId: "Show gender", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Hide gender", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `usr{${interaction.user.id}}cmd{profile} sexHide mbr{${member.user.id}}` },
                { emoji: client.config.emojis.trophies, label: `${profile.trophyHide ? `${client.language({ textId: "Show trophies", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Hide trophies", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `usr{${interaction.user.id}}cmd{profile} trophyHide mbr{${member.user.id}}` },
                { emoji: client.config.emojis.hideProfile, label: `${profile.isHiden ? `${client.language({ textId: "Open profile", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Hide profile", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `usr{${interaction.user.id}}cmd{profile} isHiden mbr{${member.user.id}}` },
                { emoji: client.config.emojis.status_online, label: `${globalUser?.lastOnlineHiden ? `${client.language({ textId: "Unhide last online", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Hide last online", guildId: interaction.guildId, locale: interaction.locale })}`}`, value: `usr{${interaction.user.id}}cmd{profile} lastOnlineHide mbr{${member.user.id}}` },
                { emoji: client.config.emojis.ring, label: `${client.language({ textId: "Mention settings", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile} mentions mbr{${member.user.id}}` },
            )
        }
        let second_row 
        if (menuOptions_options.length) second_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}mbr{${member.user.id}}profile-settings`).addOptions(menuOptions_options).setPlaceholder(`⚙️ ${client.language({ textId: "Profile settings", guildId: interaction.guildId, locale: interaction.locale })}`)])
        if (member.user.id !== interaction.user.id || args?.viewOnly) {
            menu_options = [
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}`, description: `${member.displayName}'s ${client.language({ textId: "Personal profile", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
                { emoji: client.config.emojis.statistics, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
                { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${member.displayName}'s ${client.language({ textId: "Inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
                { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}` },
                { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}` },
                { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}` },
                { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}${flags.includes(MessageFlags.IsComponentsV2) ? "eph reply" : ""}`, description: `${member.displayName}'s ${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` },
            ]
            if (profile.achievementsHiden && !interaction.member.permissions.has("Administrator")) menu_options = menu_options.filter(e => e.value !== `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`)
        }
        const achievementsMemberSince = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.type === AchievementType.MemberSince && e.enabled)
        await Promise.all(achievementsMemberSince.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && Date.now() - member.joinedTimestamp >= achievement.amount * 60 * 1000 && !client.tempAchievements[profile.userID]?.includes(achievement.id)) {
                if (!client.tempAchievements[profile.userID]) client.tempAchievements[profile.userID] = []
                client.tempAchievements[profile.userID].push(achievement.id)
                await profile.addAchievement(achievement, true)
            }    
        }))
        const components = []
        let achArr = []
        let achCount = 0
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled).map(e => e)
        if (!profile.achievementsHiden) {
            if (achievements.length > 0) {
                let a = achievements.length < 11 ? achievements.length : 11
                for (let i = 0; i < a; i++) {
                    if (profile.achievements?.some(e => e.achievmentID == achievements[i].id)) {
                        let combo = `> ${client.config.emojis.YES} ` + achievements[i].displayEmoji + achievements[i].name
                        achArr.push(combo)
                    } else {
                        let combo = `> ${client.config.emojis.NO} ` + achievements[i].displayEmoji + achievements[i].name
                        achArr.push(combo)
                    }
                }
                for (let i = 0; i < achievements.length; i++) {
                    if (profile.achievements?.some(e => e.achievmentID == achievements[i].id)) {
                        achCount++
                    }
                }
                if (achievements.length > 11) achArr.push(`> *... ${client.language({ textId: "and more", guildId: interaction.guildId, locale: interaction.locale })} ${achievements.length - a}*`)
                achArr = achArr.join(`\n`)
            }
        }
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}}mbr{${member.user.id}}profile-menu`).addOptions(menu_options)])
        components.push(first_row)
        if (second_row) components.push(second_row)    
        let bonusXP
        let bonusCUR
        let bonusLuck
        let bonusRP
        let premium
        let marry
        let gender
        let badgeLine
        const fetchedUser = await member.user.fetch(true).catch(e => null)
        embed.setColor(member.displayHexColor)
        if (profile.getXpBoost()) bonusXP = `${booster(client.config, profile.getXpBoost())} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.XP} ${profile.getXpBoost() ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.getXpBoostTime() / 1000)}>` : ""}`
        if (profile.getCurBoost()) bonusCUR = `${booster(client.config, profile.getCurBoost())} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${settings.displayCurrencyEmoji} ${profile.getCurBoostTime() ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.getCurBoostTime() / 1000)}>` : ""}`
        if (profile.getLuckBoost()) bonusLuck = `${booster(client.config, profile.getLuckBoost())} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.random} ${profile.getLuckBoostTime() ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.getLuckBoostTime() / 1000)}>` : ""}`
        if (profile.getRpBoost()) bonusRP = `${booster(client.config, profile.getRpBoost())} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.RP} ${profile.getRpBoostTime() ? `${client.language({ textId: `until`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.getRpBoostTime() / 1000)}>` : ""}`
        if (member.premiumSince) premium = `${client.config.emojis.serverBoosting}${client.language({ textId: "Boosting server since", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(member.premiumSince.valueOf() / 1000)}>`
        if (profile.marry) marry = `${client.config.emojis.purplebutterflies} ${client.language({ textId: "Married to", guildId: interaction.guildId, locale: interaction.locale })} <@${profile.marry}> ${profile.marryDate ? `${client.language({ textId: `since`, guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.marryDate/1000)}:d>` : ""}`
        embed.setTitle(`<@${member.user.id}>\n**${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })} 🎖${profile.level}**${settings.seasonLevelsEnabled ? `\n**${client.language({ textId: "Season level", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.seasonLevel}${profile.seasonLevel}**` : ""}`)
        if (member.user.id === interaction.user.id || interaction.member.permissions.has("Administrator") || interaction.member.permissions.has("ManageGuild")) embed.setURL(`https://wetbot.space/guilds/${interaction.guildId}/profiles/${member.user.id}`)
        // Map status codes to full text translation keys
        const statusTextMap = {
            'dnd': 'Do Not Disturb',
            'idle': 'Idle',
            'online': 'Online',
            'offline': 'Offline'
        }
        const getFullStatusText = (statusCode) => client.language({ textId: statusTextMap[statusCode] || statusCode, guildId: interaction.guildId, locale: interaction.locale })
        const status = !member.presence || member.presence.status === "offline" ? (globalUser?.lastOnlineHiden) || !globalUser || !globalUser.lastOnline ? `${client.config.emojis.status_offline}‎ ‎ ${getFullStatusText('offline')}` : `${client.config.emojis.status_offline}‎ ‎ ${client.language({ textId: "Was online", guildId: interaction.guildId, locale: interaction.locale })} <t:${globalUser.lastOnline}:R>` : `${client.config.emojis[`status_${member.presence.status}`]}‎ ‎ ${getFullStatusText(member.presence.status)}`
        
        // Separate custom status (thought) from other activities
        let customStatus = null
        const otherActivities = []
        if (member.presence) {
            for (const activity of member.presence.activities) {
                // Custom status has type 4 (ActivityType.Custom)
                if (activity.type === 4) {
                    customStatus = `${activity.emoji ? activity.emoji : ""}‎ ${activity.state || ""}`
                } else {
                    const transformedActivity = transformActivity(client, interaction.guildId, interaction.locale, activity)
                    otherActivities.push(transformedActivity)
                }
            }
        }
        
        // Build thought section (custom status) - just emoji and text, no header
        const thought = customStatus ? customStatus : undefined
        
        // Build activity section with header
        const activitySection = otherActivities.length ? `**${client.language({ textId: `On Going Activity`, guildId: interaction.guildId, locale: interaction.locale })}:**‎ ‎ ${otherActivities.join("\n‎ ‎ ")}` : undefined
        
        // Calculate top position from leaderboard
        const leaderboard = await client.functions.fetchLeaderboard(client, interaction.guildId, 'alltime.level')
        const topPosition = (leaderboard && Array.isArray(leaderboard)) ? leaderboard.findIndex(p => p.userID === member.user.id) + 1 : 0
        
        if (profile.sex && !profile.hideSex) gender = `${client.config.emojis.gender2}‎ ‎ **${client.language({ textId: profile.sex, guildId: interaction.guildId, locale: interaction.locale })}**`
        
        // Build badge line using buildBadgeLine function
        badgeLine = client.functions.buildBadgeLine(member, fetchedUser)
        
        const description = [
            status,
            thought,
            activitySection,
            bonusXP,
            bonusCUR,
            bonusLuck,
            bonusRP,
            premium,
            marry,
            gender,
            badgeLine,
            profile.autoIncomeExpire ? `${client.language({ textId: "Auto role income until", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.autoIncomeExpire/1000)}:f>` : undefined
        ]
        embed.setDescription(description.filter(e => e).join("\n"))

        const container = new ContainerBuilder().setAccentColor(hex2rgb(member.displayHexColor))
        const text1 = new TextDisplayBuilder().setContent([
            `<@${member.user.id}>`,
            `**${client.language({ textId: "Level", guildId: interaction.guildId, locale: interaction.locale })} 🎖${profile.level}**`,
            `${settings.seasonLevelsEnabled ? `**${client.language({ textId: "Season level", guildId: interaction.guildId, locale: interaction.locale })} ${client.config.emojis.seasonLevel}${profile.seasonLevel}**` : ""}`,
            description.filter(e => e).join("\n")
        ].join("\n"))
        if (!profile.thumbnailHidden) {
            try {
                container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(text1).setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(profile.thumbnail || member.displayAvatarURL())))
            }
            catch (err) {
                container.addSectionComponents(new SectionBuilder().addTextDisplayComponents(text1).setThumbnailAccessory(ThumbnailBuilder => ThumbnailBuilder.setURL(member.displayAvatarURL())))
            }
        } else {
            container.addTextDisplayComponents(text1)
        }
        container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large))
        
        // Add Statistics section with hours (VC time) - in its own separator box
        // Calculate total hours including current active VC session if user is in voice
        let displayHours = profile.hours || 0
        if (profile.startTime) {
            // User is currently in a voice channel, add the ongoing session time
            const currentSessionHours = (Date.now() - profile.startTime) / 1000 / 60 / 60
            if (currentSessionHours <= 100) { // Same sanity check as in voiceStateUpdate
                displayHours += currentSessionHours
            }
        }
        const statsLine = `${client.config.emojis.mic}‎ ‎ ${displayHours.toFixed(2)} ‎ ‎ ${client.config.emojis.message}‎ ‎ ${(profile.messages || 0).toLocaleString()} ‎ ‎ ${settings.displayCurrencyEmoji}‎ ‎ ${Math.floor(profile.currency || 0).toLocaleString()} ‎ ‎ ${client.config.emojis.RP}‎ ‎ ${(profile.rp || 0).toLocaleString()} ‎ ‎ ${client.config.emojis.heart}‎ ‎ ${(profile.likes || 0).toLocaleString()} ‎ ‎ ${client.config.emojis.top}‎ ‎ ${topPosition || 0} ‎ ‎ ${client.config.emojis.trophies}‎ ‎ ${(profile.trophies?.length || 0).toLocaleString()}`
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent([`### ${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}:`, statsLine].join("\n")))
        container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large))
        embed.addFields([{ name: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}:`, value: statsLine }])
        
        const mainContent = []
        if (!profile.bioHidden && profile.bio) {
            const text = profile.bio.replace(/\\n/g,`\n`)
            mainContent.push([`### ${client.language({ textId: `Bio`, guildId: interaction.guildId, locale: interaction.locale })}:`, text.slice(0, 1011)].join("\n"))
            embed.addFields([{ name: `${client.language({ textId: `Bio`, guildId: interaction.guildId, locale: interaction.locale })}:`, value: `${text.slice(0, 1011)}` }])
        }
        if (!profile.socialLinksHidden && (profile.vk || profile.tiktok || profile.instagram || profile.steam)) {
            const socials = []
            if (profile.vk) socials.push(`${client.config.emojis.VK} ${profile.vk}`)
            if (profile.tiktok) socials.push(`${client.config.emojis.TikTok} ${profile.tiktok}`)
            if (profile.instagram) socials.push(`${client.config.emojis.Instagram} ${profile.instagram}`)
            if (profile.steam) socials.push(`${client.config.emojis.Steam} ${profile.steam}`)
            mainContent.push([`### ${client.language({ textId: "Social networks", guildId: interaction.guildId, locale: interaction.locale })}:`, socials.join("\n")].join("\n"))
            embed.addFields([{ name: `${client.language({ textId: "Social networks", guildId: interaction.guildId, locale: interaction.locale })}:`, value: socials.join("\n") }])    
        }
        if (profile.trophies?.length && !profile.trophyHide) {
            mainContent.push([`### ${client.language({ textId: "Trophies", guildId: interaction.guildId, locale: interaction.locale })}:`, profile.trophies.join(`\n`)].join("\n"))
            embed.addFields([{ name: `${client.language({ textId: "Trophies", guildId: interaction.guildId, locale: interaction.locale })}:`, value: profile.trophies.join(`\n`) }])
        }
        try {
            if (!profile.thumbnailHidden) embed.setThumbnail(profile.thumbnail || member.displayAvatarURL())
        } catch (err) {

        }
        if (mainContent.length) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(mainContent.join("\n")))
            container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large))    
        }
        if (!profile.rolesHidden && member.roles.cache.filter(e => e.name !== "@everyone").size) {
            const button = new ButtonBuilder()
                .setCustomId(`cmd{inventory-roles}mbr{${member.user.id}}eph reply`)
                .setEmoji(client.config.emojis.roles)
                .setLabel(`${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Secondary)
            const maxRoles = 10
            const roles = member.roles.cache.filter(e => e.name !== "@everyone").sort((role1, role2) => role2.position - role1.position)
            container.addSectionComponents(new SectionBuilder().setButtonAccessory(button).addTextDisplayComponents(new TextDisplayBuilder().setContent([
                `### ${client.language({ textId: "Roles", guildId: interaction.guildId, locale: interaction.locale })}`, roles.first(maxRoles).map(role => `<@&${role.id}>`).join(" ") + `${roles.size > maxRoles ? ` _${client.language({ textId: "and more", guildId: interaction.guildId, locale: interaction.locale })} ${roles.size - maxRoles}..._`: ""}`,
            ].join("\n"))))
            embed.addFields([{
                name: `${client.language({ textId: "Roles", guildId: interaction.guildId, locale: interaction.locale })}`,
                value: roles.first(maxRoles).map(role => `<@&${role.id}>`).join(" ") + `${roles.size > maxRoles ? ` _${client.language({ textId: "and more", guildId: interaction.guildId, locale: interaction.locale })} ${roles.size - maxRoles}..._`: ""}`
            }])
        }
        if (!profile.achievementsHiden && achArr.length) {
            const button = new ButtonBuilder()
                .setCustomId(`cmd{achievements}usr{${interaction.user.id}}mbr{${member.user.id}}eph reply`)
                .setEmoji(client.config.emojis.achievements)
                .setLabel(`${client.language({ textId: "All achievements", guildId: interaction.guildId, locale: interaction.locale })}`)
                .setStyle(ButtonStyle.Secondary)
            container.addSectionComponents(new SectionBuilder().setButtonAccessory(button).addTextDisplayComponents(new TextDisplayBuilder().setContent([
                `### ${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })} (${achCount}/${achievements.length}):`,
                achArr
            ].join("\n"))))
            embed.addFields([{ name: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })} (${achCount}/${achievements.length}):`, value: achArr }])
        }
        if (!profile.bannerHidden && (profile.image || fetchedUser?.bannerURL({ size: 4096 }))) {
            try {
                container.addMediaGalleryComponents(MediaGalleryBuilder => MediaGalleryBuilder.addItems(MediaGalleryItemBuilder => MediaGalleryItemBuilder.setURL(profile.image || fetchedUser?.bannerURL({ size: 4096 }))))
                embed.setImage(profile.image || fetchedUser?.bannerURL({ size: 4096 }) || undefined)
            } catch (err) {
                if (fetchedUser?.bannerURL({ size: 4096 })) container.addMediaGalleryComponents(MediaGalleryBuilder => MediaGalleryBuilder.addItems(MediaGalleryItemBuilder => MediaGalleryItemBuilder.setURL(fetchedUser?.bannerURL({ size: 4096 }))))
            }
        }
        let footerText = ""
        const footerContent = []
        if (!profile.joinDateIsHiden) {
            footerContent.push(`-# ${client.language({ textId: `Member since`, guildId: interaction.guildId, locale: interaction.locale })} ${format(member.joinedAt, 'DD/MM/YYYY')}`)
            footerText += `${client.language({ textId: `Member since`, guildId: interaction.guildId, locale: interaction.locale })} ${format(member.joinedAt, 'DD/MM/YYYY')}`
        }
        if (!profile.birthdateHidden && profile.birthday_day !== undefined && profile.birthday_month !== undefined && profile.birthday_year !== undefined) {
            if (!profile.birthYearHidden) {
                footerContent.push(`-# ${`${client.language({ textId: "Birthday", guildId: interaction.guildId, locale: interaction.locale })}: ${convert(profile.birthday_day)}/${convert(profile.birthday_month)}`}/${profile.birthday_year}・${Math.floor((Date.now() - new Date(profile.birthday_year, (profile.birthday_month - 1), profile.birthday_day))/1000/60/60/24/365.25)} ${client.language({ textId: `years old`, guildId: interaction.guildId, locale: interaction.locale })}`)
                footerText += `${`\n${client.language({ textId: "Birthday", guildId: interaction.guildId, locale: interaction.locale })}: ${convert(profile.birthday_day)}/${convert(profile.birthday_month)}`}/${profile.birthday_year}・${Math.floor((Date.now() - new Date(profile.birthday_year, (profile.birthday_month - 1), profile.birthday_day))/1000/60/60/24/365.25)} ${client.language({ textId: `years old`, guildId: interaction.guildId, locale: interaction.locale })}`
            }
            else {
                footerContent.push(`-# ${client.language({ textId: "Birthday", guildId: interaction.guildId, locale: interaction.locale })}: ${convert(profile.birthday_day)}/${convert(profile.birthday_month)}`)
                footerText += `${`\n${client.language({ textId: "Birthday", guildId: interaction.guildId, locale: interaction.locale })}: ${convert(profile.birthday_day)}/${convert(profile.birthday_month)}`}`
            }
        }
        if (footerText.length) {
            embed.setFooter({ iconURL: interaction.guild.iconURL(), text: footerText })
        }
        if (footerContent.length) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footerContent.join("\n")))
        }
        let close_row = new ActionRowBuilder()
        close_row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(`cmd{profile}usr{${interaction.user.id}}mbr{${member.user.id}}like`).setEmoji(client.config.emojis.heart).setLabel(`${profile.likes || 0}`))
        // Add reload button after like button
        // Include editMode and eph flags in customId so they persist on reload
        const reload_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(client.config.emojis.reload)
            .setCustomId(`usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}reload${args?.editMode ? ' editMode' : ''}${flags.includes("Ephemeral") ? ' eph' : ''}`)
        close_row.addComponents(reload_btn)
        // Only show close button if:
        // 1. Message is NOT ephemeral
        // 2. NOT in viewOnly mode (sticky button view)
        // 3. User is viewing their OWN profile (not someone else's)
        // This prevents other users from closing someone else's profile message
        if (!flags.includes("Ephemeral") && !args?.viewOnly && member.user.id === interaction.user.id) {
            const close_btn = new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(client.config.emojis.close)
                .setCustomId(`usr{${interaction.user.id}} close`)
            close_row.addComponents(close_btn)
        }
        if (close_row.components.length) components.push(close_row)
        container.addActionRowComponents(components)    
        const embeds = []
        if (!flags.includes(MessageFlags.IsComponentsV2)) {
            embeds.push(embed)
        }
        if (interaction.customId?.includes("reply") || interaction.values?.[0].includes("reply") || interaction.isContextMenuCommand()) {
            return interaction.reply({ embeds, components: flags.includes(MessageFlags.IsComponentsV2) ? [container] : components, flags })
        }
        if (interaction.isChatInputCommand()) return interaction.editReply({ embeds, components: flags.includes(MessageFlags.IsComponentsV2) ? [container] : components, flags })
        // Handle UCP (User Control Panel) button interactions - use editReply if already deferred
        if (interaction.deferred) {
            return interaction.editReply({ embeds, components: flags.includes(MessageFlags.IsComponentsV2) ? [container] : components, flags })
        }
        return interaction.update({ embeds, components: flags.includes(MessageFlags.IsComponentsV2) ? [container] : components })
    }
}
function convert(number){
    const converted = number.toString()
    const length = converted.length
    return length == `1` ? `0${converted}` : converted
}
function booster(config, number){
    return `${number < 0 ? config.emojis.DOWN : config.emojis.UP}${number * 100}%`
}
function transformActivity(client, guildId, locale, activity) {
    return activity.type === ActivityType.Playing 
    ? `🎮 ${client.language({ textId: "Playing", guildId: guildId, locale: locale })} ${activity.name}` 
    : activity.type === ActivityType.Streaming
    ? `🎥 ${client.language({ textId: "Streaming", guildId: guildId, locale: locale })} ${activity.state}` 
    : activity.type === ActivityType.Listening
    ? `🎧 ${client.language({ textId: "Listening to", guildId: guildId, locale: locale })} ${activity.state} - ${activity.details}`
    : activity.type === ActivityType.Watching
    ? `📺 ${client.language({ textId: "Watching", guildId: guildId, locale: locale })} ${activity.state}`
    : activity.type === ActivityType.Competing
    ?  `🏆 ${client.language({ textId: "Competing in", guildId: guildId, locale: locale })} ${activity.name}`
    : `${activity.emoji ? activity.emoji + " " : ""}${activity.state || ""}`
}
function hex2rgb(color) {
    const r = color.match(/^#(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}))$/i)
    if (!r) return [0, 0, 0]
    return [parseInt(r[2], 16), 
            parseInt(r[3], 16), 
            parseInt(r[4], 16)]
}