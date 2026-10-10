const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

// Import history management from embed-generator
const embedGeneratorModule = require("../slash-commands/embed-generator");

// Lazy load AI module to handle missing dependencies gracefully
let aiModule;
try {
    aiModule = require("../handler/aiEmbedGenerator");
} catch (error) {
    console.warn('[AI Embed Generator] Module not available:', error.message);
    aiModule = null;
}

const { 
    generateAIEmbed, 
    aiGenerationStates, 
    aiLastGenerationInfo, 
    aiRegenerateCooldowns, 
    AI_REGENERATE_COOLDOWN_SECONDS 
} = aiModule || {};

// Per-user cooldown for creating a new AI embed (separate from regenerate cooldown)
// Map<userId, timestamp_ms>
const aiCreateCooldowns = new Map();
const AI_CREATE_COOLDOWN_SECONDS = 60; // 1 minute between creations

// Cleanup expired cooldown entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    const expiryMs = AI_CREATE_COOLDOWN_SECONDS * 1000;
    for (const [userId, timestamp] of aiCreateCooldowns.entries()) {
        if (now - timestamp > expiryMs) {
            aiCreateCooldowns.delete(userId);
        }
    }
}, 5 * 60 * 1000);

/**
 * Handle simple AI generation (new flow - just ask for prompt in channel)
 * @param {import('discord.js').ButtonInteraction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleSimpleAIGenerate(interaction, client) {
    // Extract user ID from custom ID and validate
    const userIdMatch = interaction.customId.match(/ai_generate_simple_(\d+)/);
    if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
        return interaction.reply({
            content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`,
            flags: ["Ephemeral"]
        });
    }

    if (!aiModule) {
        return interaction.reply({
            content: "⚠️ AI features are not available. Please install dependencies: `npm install groq-sdk axios`",
            flags: ["Ephemeral"]
        });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return interaction.reply({
            content: "⚠️ Groq API key not found! Please set GROQ_API_KEY in your environment variables.",
            flags: ["Ephemeral"]
        });
    }

    // Enforce 1-minute cooldown between AI embed creations per user
    const lastCreateTime = aiCreateCooldowns.get(interaction.user.id);
    if (lastCreateTime) {
        const elapsed = (Date.now() - lastCreateTime) / 1000;
        if (elapsed < AI_CREATE_COOLDOWN_SECONDS) {
            const remaining = Math.ceil(AI_CREATE_COOLDOWN_SECONDS - elapsed);
            return interaction.reply({
                content: `⏳ Please wait **${remaining}** second${remaining === 1 ? '' : 's'} before creating another AI embed.`,
                flags: ["Ephemeral"]
            });
        }
    }

    // Store original components and disable them
    const components = JSON.parse(JSON.stringify(interaction.message.components));
    await interaction.update({ embeds: interaction.message.embeds, components: [] });

    // Send public prompt request message
    const filter = m => m.author.id === interaction.user.id && m.channel.id === interaction.channelId;
    const promptMessage = await interaction.followUp({
        content: `## 🤖  AI Embed Generator\n\`\`\`Please send your embed prompt in this channel within 5 minutes\`\`\`\n> To cancel enter: **cancel**`
    });

    // Wait for user's prompt message
    const description = await waitingForPrompt(client, interaction, filter);
    
    if (!description) {
        // Delete the public message and restore components if cancelled or timed out
        promptMessage.delete().catch(e => null);
        await interaction.editReply({ embeds: interaction.message.embeds, components: components });
        return;
    }

    // Show loading embed in the prompt message (not the main message)
    const loadingEmbed = new EmbedBuilder()
        .setDescription("###\n<a:Loading:1463867438209699883> Generating Embed...")
        .setColor(0xFFFFFF);

    await promptMessage.edit({ content: null, embeds: [loadingEmbed] });

    // Generate embed with AI (default to 'both' for images)
    const { embed: embedObj, error } = await generateAIEmbed(
        description,
        'both',
        null,
        interaction.guild,
        client,
        interaction.user.id
    );

    if (error) {
        // Delete loading message, restore components and show error
        promptMessage.delete().catch(e => null);
        await interaction.editReply({ embeds: interaction.message.embeds, components: components });
        await interaction.followUp({
            content: `❌ ${error}`,
            flags: ["Ephemeral"]
        });
        return;
    }

    // Mark successful creation for the cooldown window
    aiCreateCooldowns.set(interaction.user.id, Date.now());

    // Convert to Discord.js EmbedBuilder
    const discordEmbed = new EmbedBuilder(embedObj);

    // Update the original embed-generator message with the generated embed
    try {
        // Get current embeds from the message
        const previousEmbeds = interaction.message.embeds.map(e => new EmbedBuilder(e.toJSON()));
        
        // Save current state to history before replacing
        if (embedGeneratorModule.saveToHistory) {
            embedGeneratorModule.saveToHistory(
                interaction.user.id,
                previousEmbeds,
                interaction.message.content
            );
        }
        
        // Save new state with AI generation info
        if (embedGeneratorModule.saveToHistory) {
            embedGeneratorModule.saveToHistory(
                interaction.user.id,
                [discordEmbed],
                interaction.message.content,
                {
                    description,
                    imageChoice: 'both',
                    imageDetails: null,
                    guild: interaction.guild,
                    regenerated: false
                }
            );
        }
        
        // Rebuild components with updated button states instead of using cached components
        // This ensures undo/redo buttons reflect the current history state
        const embedGeneratorCommand = require("../slash-commands/embed-generator");
        
        // Create a mock interaction object for buildAndSendComponents
        const mockInteraction = {
            ...interaction,
            message: {
                ...interaction.message,
                embeds: [discordEmbed],
                content: interaction.message.content
            }
        };
        
        // Use the embed-generator's component builder to ensure consistent state
        await interaction.editReply({ 
            content: interaction.message.content,
            embeds: [discordEmbed], 
            components: [] // Clear first
        });
        
        // Now rebuild with proper button states
        // Get the current embeds and rebuild components
        const currentEmbeds = [discordEmbed];
        const embedIndex = 0;
        const fieldIndex = 0;
        
        // Build components manually to match embed-generator structure
        const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
        const rebuiltComponents = [];
        
        // ROW 1: Embed selector
        const select_embed = [{ label: `Embed 1`, value: `0`, default: true }];
        const first_row = new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
                .setCustomId(`cmd{embed-generator}embed{0}field{0}usr{${interaction.user.id}} selectEmbed`)
                .addOptions(select_embed)
        ]);
        rebuiltComponents.push(first_row);
        
        // ROW 2: Field selector (if fields exist)
        if (discordEmbed.data.fields?.length) {
            const select_field = [];
            for (let i = 0; i < discordEmbed.data.fields.length; i++) {
                select_field.push({ label: `Field ${i + 1}`, value: `${i}`, default: i === 0 });
            }
            const field_row = new ActionRowBuilder().addComponents([
                new StringSelectMenuBuilder()
                    .setCustomId(`cmd{embed-generator}embed{0}field{0}usr{${interaction.user.id}} selectField`)
                    .addOptions(select_field)
            ]);
            rebuiltComponents.push(field_row);
        }
        
        // ROW 3: Edit options
        const embed_options = [
            { label: "Content", value: `content`, emoji: "✏️" },
            { label: "Description, title, color", value: `body`, emoji: "✏️" },
            { label: "Thumbnail, image", value: `images`, emoji: "✏️" },
            { label: "Header", value: `author`, emoji: "✏️" },
            { label: "Footer", value: `footer`, emoji: "✏️" },
            { label: "Add field", value: `AddField`, emoji: "➕" }
        ];
        const edit_row = new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
                .setCustomId(`cmd{embed-generator}embed{0}field{0}usr{${interaction.user.id}}`)
                .setPlaceholder("Make a Selection")
                .addOptions(embed_options)
        ]);
        rebuiltComponents.push(edit_row);
        
        // ROW 4: Quick Actions
        const quick_actions = [
            { label: "Upload JSON", value: `upload_json`, emoji: "📤" },
            { label: "Paste JSON", value: `paste_json`, emoji: "📋" },
            { label: "Copy Message", value: `copy_message_menu`, emoji: "📋" },
            { label: "Edit Embed", value: `edit_embed_direct`, emoji: "✏️" },
            { label: "Reset", value: `reset_embed`, emoji: "🔄" }
        ];
        const quick_row = new ActionRowBuilder().addComponents([
            new StringSelectMenuBuilder()
                .setCustomId(`cmd{embed-generator}embed{0}field{0}usr{${interaction.user.id}} quick_actions`)
                .setPlaceholder("Quick Actions")
                .addOptions(quick_actions)
        ]);
        rebuiltComponents.push(quick_row);
        
        // ROW 5: Buttons with UPDATED states
        const undoBtn = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} undo`)
            .setLabel("Undo")
            .setEmoji("↩️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!embedGeneratorModule.canUndo(interaction.user.id));
        
        const redoBtn = new ButtonBuilder()
            .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} redo`)
            .setLabel("Redo")
            .setEmoji("↪️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!embedGeneratorModule.canRedo(interaction.user.id));
        
        const buttons_row = new ActionRowBuilder().addComponents([
            undoBtn,
            redoBtn,
            new ButtonBuilder()
                .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} send`)
                .setLabel("Send")
                .setEmoji("📤")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_json`)
                .setLabel("JSON")
                .setEmoji("📋")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`ai_generate_simple_${interaction.user.id}`)
                .setLabel("AI Embed")
                .setEmoji("🤖")
                .setStyle(ButtonStyle.Primary)
        ]);
        rebuiltComponents.push(buttons_row);
        
        // Update with rebuilt components
        await interaction.editReply({ 
            content: interaction.message.content,
            embeds: [discordEmbed], 
            components: rebuiltComponents 
        });
        
        // Delete the loading message
        promptMessage.delete().catch(e => null);

        // Send success message
        const successMsg = await interaction.channel.send({
            content: `✅ ${interaction.user} Embed generated successfully!`
        });

        // Delete success message after 5 seconds
        setTimeout(() => {
            successMsg.delete().catch(() => {});
        }, 5000);

    } catch (err) {
        promptMessage.delete().catch(e => null);
        await interaction.editReply({ embeds: interaction.message.embeds, components: components });
        await interaction.followUp({
            content: `❌ Failed to update embed: ${err.message}`,
            flags: ["Ephemeral"]
        });
    }
}

/**
 * Wait for user to send a prompt message
 * @param {import('discord.js').Client} client 
 * @param {import('discord.js').Interaction} interaction 
 * @param {Function} filter 
 * @returns {Promise<string|false>} The prompt text or false if cancelled/timed out
 */
async function waitingForPrompt(client, interaction, filter) {
    while (true) {
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 300000 });
        if (!collected.size) return false;
        
        const message = collected.first();
        const content = message.content.trim();
        
        // Check for cancel
        if (content.toLowerCase() === 'cancel') {
            message.delete().catch(e => null);
            return false;
        }
        
        // Check if message has content
        if (content.length > 0) {
            message.delete().catch(e => null);
            return content;
        }
        
        // If empty message, ask again
        message.delete().catch(e => null);
        interaction.followUp({ 
            content: `${client.config.emojis.NO} ${client.language({ textId: "Please provide a description for the embed", guildId: interaction.guildId, locale: interaction.locale })}`, 
            flags: ["Ephemeral"] 
        });
    }
}

/**
 * Handle AI embed generation button click
 * @param {import('discord.js').ButtonInteraction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleAIGenerateButton(interaction, client) {
    if (!aiModule) {
        return interaction.reply({
            content: "⚠️ AI features are not available. Please install dependencies: `npm install groq-sdk axios`",
            flags: ["Ephemeral"]
        });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return interaction.reply({
            content: "⚠️ Groq API key not found! Please set GROQ_API_KEY in your environment variables.",
            flags: ["Ephemeral"]
        });
    }

    // Show modal to collect embed description
    const modal = new ModalBuilder()
        .setCustomId(`ai_embed_description_${interaction.user.id}`)
        .setTitle("🤖 AI Embed Generator")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("description")
                    .setLabel("Describe your embed")
                    .setPlaceholder("E.g., Welcome message for gaming server with rules and features")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000)
            )
        );

    await interaction.showModal(modal);
}

/**
 * Handle AI embed description modal submission
 * @param {import('discord.js').ModalSubmitInteraction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleAIDescriptionModal(interaction, client) {
    // Extract user ID from custom ID and validate
    const userIdMatch = interaction.customId.match(/ai_embed_description_(\d+)/);
    if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
        return interaction.reply({
            content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`,
            flags: ["Ephemeral"]
        });
    }

    const description = interaction.fields.getTextInputValue("description");
    
    // Store the description and show image choice buttons
    aiGenerationStates.set(interaction.user.id, {
        description,
        stage: "awaiting_image_choice",
        channelId: interaction.channelId,
        messageId: interaction.message?.id
    });

    const embed = new EmbedBuilder()
        .setTitle("🖼️ Image Options")
        .setDescription("**Would you like to add images to your embed?**\n\nChoose one of the following options:")
        .setColor(0x5865F2);

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ai_image_both_${interaction.user.id}`)
            .setLabel("Both (Thumbnail + Image)")
            .setEmoji("🖼️")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`ai_image_thumbnail_${interaction.user.id}`)
            .setLabel("Thumbnail Only")
            .setEmoji("📸")
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ai_image_image_${interaction.user.id}`)
            .setLabel("Main Image Only")
            .setEmoji("🎨")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ai_image_none_${interaction.user.id}`)
            .setLabel("No Images")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        flags: ["Ephemeral"]
    });
}

/**
 * Handle image choice button click
 * @param {import('discord.js').ButtonInteraction} interaction 
 * @param {import('discord.js').Client} client 
 * @param {string} imageChoice - 'both', 'thumbnail', 'image', or 'none'
 */
async function handleImageChoice(interaction, client, imageChoice) {
    // Extract user ID from custom ID and validate
    const userIdMatch = interaction.customId.match(/ai_image_\w+_(\d+)/);
    if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
        return interaction.reply({
            content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`,
            flags: ["Ephemeral"]
        });
    }

    const state = aiGenerationStates.get(interaction.user.id);
    if (!state) {
        return interaction.reply({
            content: "Session expired. Please start again.",
            flags: ["Ephemeral"]
        });
    }

    state.imageChoice = imageChoice;
    state.stage = "generating";

    await interaction.deferReply({ ephemeral: true });

    // Generate the embed
    const { embed: embedObj, error } = await generateAIEmbed(
        state.description,
        imageChoice,
        null,
        interaction.guild,
        client,
        interaction.user.id
    );

    if (error) {
        aiGenerationStates.delete(interaction.user.id);
        return interaction.editReply({
            content: `❌ ${error}`,
            flags: ["Ephemeral"]
        });
    }

    // Store generation info for regeneration
    aiLastGenerationInfo.set(interaction.user.id, {
        description: state.description,
        imageChoice,
        imageDetails: null
    });

    // Convert to Discord.js EmbedBuilder
    const discordEmbed = new EmbedBuilder(embedObj);

    // Create the embed message with edit buttons
    const editRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ai_regenerate_${interaction.user.id}`)
            .setLabel("Regenerate")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ai_edit_description_${interaction.user.id}`)
            .setLabel("Edit Description")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`ai_use_embed_${interaction.user.id}`)
            .setLabel("Use This Embed")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
    );

    // Send the generated embed to the channel
    const embedMessage = await interaction.channel.send({
        content: `**AI Generated Embed** (requested by ${interaction.user})`,
        embeds: [discordEmbed],
        components: [editRow]
    });

    // Store message ID for later editing
    state.embedMessageId = embedMessage.id;
    aiGenerationStates.set(interaction.user.id, state);

    await interaction.editReply({
        content: "✨ Embed generated successfully! Check the message above.",
        flags: ["Ephemeral"]
    });

    // Clean up state after 15 minutes
    setTimeout(() => {
        aiGenerationStates.delete(interaction.user.id);
    }, 15 * 60 * 1000);
}

/**
 * Handle regenerate button click
 * @param {import('discord.js').ButtonInteraction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleRegenerateButton(interaction, client) {
    // Extract user ID from custom ID and validate
    const userIdMatch = interaction.customId.match(/ai_regenerate_(\d+)/);
    if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
        return interaction.reply({
            content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`,
            flags: ["Ephemeral"]
        });
    }

    const genInfo = aiLastGenerationInfo.get(interaction.user.id);
    if (!genInfo) {
        return interaction.reply({
            content: "No previous generation to regenerate from. Use 'Generate with AI' first.",
            flags: ["Ephemeral"]
        });
    }

    // Check cooldown
    const lastTime = aiRegenerateCooldowns.get(interaction.user.id);
    if (lastTime) {
        const elapsed = (Date.now() - lastTime) / 1000;
        if (elapsed < AI_REGENERATE_COOLDOWN_SECONDS) {
            const remaining = Math.ceil(AI_REGENERATE_COOLDOWN_SECONDS - elapsed);
            return interaction.reply({
                content: `⏳ Please wait ${remaining} seconds before regenerating.`,
                flags: ["Ephemeral"]
            });
        }
    }

    await interaction.deferUpdate();

    // Update cooldown
    aiRegenerateCooldowns.set(interaction.user.id, Date.now());

    // Generate new embed with same parameters
    const { embed: embedObj, error } = await generateAIEmbed(
        genInfo.description,
        genInfo.imageChoice,
        genInfo.imageDetails,
        interaction.guild,
        client,
        interaction.user.id
    );

    if (error) {
        return interaction.followUp({
            content: `❌ ${error}`,
            flags: ["Ephemeral"]
        });
    }

    // Convert to Discord.js EmbedBuilder
    const discordEmbed = new EmbedBuilder(embedObj);

    // Update the message
    await interaction.message.edit({
        embeds: [discordEmbed]
    });

    await interaction.followUp({
        content: "🔄 Embed regenerated successfully!",
        flags: ["Ephemeral"]
    });
}

/**
 * Handle "Use This Embed" button click
 * @param {import('discord.js').ButtonInteraction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleUseEmbedButton(interaction, client) {
    // Extract user ID from custom ID and validate
    const userIdMatch = interaction.customId.match(/ai_use_embed_(\d+)/);
    if (userIdMatch && interaction.user.id !== userIdMatch[1]) {
        return interaction.reply({
            content: `${client.config.emojis.NO} ${interaction.member.displayName} ${client.language({ textId: "Not your button/menu", guildId: interaction.guildId, locale: interaction.locale })}`,
            flags: ["Ephemeral"]
        });
    }

    const embed = interaction.message.embeds[0];
    if (!embed) {
        return interaction.reply({
            content: "No embed found to use.",
            flags: ["Ephemeral"]
        });
    }

    // Convert embed to the format expected by the main embed-generator
    const embedData = embed.toJSON();
    
    // Create the standard embed-generator interface
    const embedBuilder = new EmbedBuilder(embedData);
    
    // Create the standard buttons from embed-generator
    const sendEmbedBTN = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} send`)
        .setLabel(client.language({ textId: "Send message", guildId: interaction.guildId, locale: interaction.locale }))
        .setEmoji(client.config.emojis.send)
        .setStyle(ButtonStyle.Secondary);
    
    const editEmbedBTN = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} edit`)
        .setEmoji(client.config.emojis.edit)
        .setLabel(client.language({ textId: "Edit message", guildId: interaction.guildId, locale: interaction.locale }))
        .setStyle(ButtonStyle.Secondary);
    
    const copyEmbedBTN = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_json`)
        .setEmoji(client.config.emojis.copy)
        .setLabel(client.language({ textId: "Copy JSON", guildId: interaction.guildId, locale: interaction.locale }))
        .setStyle(ButtonStyle.Secondary);
    
    const pasteEmbedBTN = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} paste`)
        .setEmoji(client.config.emojis.paste)
        .setLabel(client.language({ textId: "Paste JSON", guildId: interaction.guildId, locale: interaction.locale }))
        .setStyle(ButtonStyle.Secondary);
    
    const copyMessageBTN = new ButtonBuilder()
        .setCustomId(`cmd{embed-generator}usr{${interaction.user.id}} copy_message`)
        .setEmoji(client.config.emojis.copy)
        .setLabel(client.language({ textId: "Copy message", guildId: interaction.guildId, locale: interaction.locale }))
        .setStyle(ButtonStyle.Secondary);
    
    const tools_row = new ActionRowBuilder().addComponents([sendEmbedBTN, editEmbedBTN, copyMessageBTN, copyEmbedBTN, pasteEmbedBTN]);
    
    // Delete the AI generation message
    try {
        await interaction.message.delete();
    } catch (e) {
        console.error("Failed to delete AI generation message:", e);
    }
    
    // Send the embed with standard controls
    await interaction.reply({
        embeds: [embedBuilder],
        components: [tools_row]
    });
    
    // Clean up state
    aiGenerationStates.delete(interaction.user.id);
}

module.exports = {
    handleSimpleAIGenerate,
    handleAIGenerateButton,
    handleAIDescriptionModal,
    handleImageChoice,
    handleRegenerateButton,
    handleUseEmbedButton
};
