const { Schema, model, models } = require('mongoose')
const settingsSchema = new Schema({
    guildID: { type: String, require: true, unique: true },
    language: { type: String, default: "en-US" },
    xpForMessage: { type: Number, require: true, default: 0 },
    curForMessage: { type: Number, require: true, default: 0 },
    rpForMessage: { type: Number, require: true, default: 0 },
    messageCooldown: { type: Number, default: 60 },
    xpForVoice: { type: Number, require: true, default: 0 },
    curForVoice: { type: Number, require: true, default: 0 },
    rpForVoice: { type: Number, require: true, default: 0 },
    xpForInvite: { type: Number, require: true, default: 0 },
    curForInvite: { type: Number, require: true, default: 0 },
    rpForInvite: { type: Number, require: true, default: 0 },
    xpForBump: { type: Number, require: true, default: 200 },
    curForBump: { type: Number, require: true, default: 30 },
    rpForBump: { type: Number, require: true, default: 0 },
    xpForLike: { type: Number, require: true, default: 1000 },
    curForLike: { type: Number, require: true, default: 0 },
    rpForLike: { type: Number, require: true, default: 0 },
    xpForFirstFoundItem: { type: Number, require: true, default: 1000  },
    curForFirstFoundItem: { type: Number, require: true, default: 0 },
    levelfactor: { type: Number, default: 250 },
    seasonLevelfactor: { type: Number, default: 10 },
    baitPrice: { type: Number, default: 100 },
    baitCurrency: { type: String, default: "currency" },
    miningPrice: { type: Number, default: 100 },
    miningTool: { type: String, default: "currency" },
    currencyName: { type: String, default: "Coins" },
    currencyDescription: { type: String, default: "Server currency" },
    shopName: { type: String, default: null },
    shopMessages: [],
    shopThumbnail: { type: String },
    emojis: {
        currency: { type: String, default: "🪙" },
    },
    channels: {
        mutedChannels: [],
        botChannelId: { type: String },
        generalChannelId: { type: String },
        giveawaysChannelId: { type: String },
        levelNotificationChannelId: { type: String },
        itemsNotificationChannelId: { type: String },
        achievmentsNotificationChannelId: { type: String },
        giveawaysMeetingRoom: { type: String },
        customRoleModerationChannel: { type: String },
        marketChannel: { type: String },
        auctionsChannelId: { type: String },
        userControlPanelChannel: { type: String },
        userControlPanelMessages: [{
            channelId: { type: String },
            messageId: { type: String }
        }],
        userControlPanelButtons: [{ type: String }],
    },
    giveawayManagerPermission: { type: String },
    giveawayRerollPermission: { type: String },
    roles: {
        mutedRoles: [],
        rolesToNewMember: [],
        giveawaysNotification: { type: String },
        wormholesNotification: { type: String },
        bumpNotification: { type: String },
        customRolePosition: { type: String }
    },
    daily: {
        day1: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number }  
        }],
        day2: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number }
        }],
        day3: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number }  
        }],
        day4: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number }
        }],
        day5: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number }  
        }],
        day6: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number }
        }],
        day7: [{
            itemID: { type: String },
            valueFrom: { type: Number },
            valueTo: { type: Number } 
        }],
    },
    levelsRoles: [{
        levelFrom: { type: Number },
        levelTo: { type: Number },
        roleId: { type: String }
    }],
    levelUpNotifications: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String }
    },
    seasonLevelsRoles: [{
        levelFrom: { type: Number },
        levelTo: { type: Number },
        roleId: { type: String }
    }],
    top_report: {
        daily: { type: Boolean },
        weekly: { type: Boolean },
        monthly: { type: Boolean },
        yearly: { type: Boolean },
        channelId: { type: String }
    },
    weekMaxBonus: { type: Number, default: 0 },
    logs: {
        webhook: { type: String },
        channelCreate: { type: Boolean },
        channelDelete: { type: Boolean },
        channelUpdate: { type: Boolean },
        guildUpdate: { type: Boolean },
        memberAdd: { type: Boolean },
        memberRemove: { type: Boolean },
        memberUpdate: { type: Boolean },
        memberKick: { type: Boolean },
        memberPrune: { type: Boolean },
        memberRoleUpdate: { type: Boolean },
        memberBanAdd: { type: Boolean },
        memberBanRemove: { type: Boolean },
        inviteCreate: { type: Boolean },
        inviteDelete: { type: Boolean },
        inviteUpdate: { type: Boolean },
        messageReactionAdd: { type: Boolean },
        roleCreate: { type: Boolean },
        roleDelete: { type: Boolean },
        roleUpdate: { type: Boolean },
        stickerCreate: { type: Boolean },
        stickerDelete: { type: Boolean },
        stickerUpdate: { type: Boolean },
        messageCreate: { type: Boolean },
        messageDelete: { type: Boolean },
        voiceStateUpdate: { type: Boolean },
        emojiCreate: { type: Boolean },
        emojiDelete: { type: Boolean },
        emojiUpdate: { type: Boolean },
        interactionCreate: { type: Boolean },
        botAdd: { type: Boolean },
        applicationCommandPermissionUpdate: { type: Boolean },
        guildScheduledEventCreate: { type: Boolean },
        guildScheduledEventDelete: { type: Boolean },
        guildScheduledEventUpdate: { type: Boolean },
        integrationCreate: { type: Boolean },
        integrationDelete: { type: Boolean },
        integrationUpdate: { type: Boolean },
        webhookCreate: { type: Boolean },
        webhookDelete: { type: Boolean },
        webhookUpdate: { type: Boolean },
        economyLogCreate: { type: Boolean },
    },
    action_logs: [],
    max_items: { type: Number, default: 1000 },
    max_achievements: { type: Number, default: 1000 },
    max_wormholes: { type: Number, default: 1000 },
    max_quests: { type: Number, default: 1000 },
    max_bonusChannels: { type: Number, default: 1000 },
    max_styles: { type: Number, default: 1000 },
    max_categories: { type: Number, default: 25 },
    max_quests: { type: Number, default: 1000 },
    max_roles: { type: Number, default: 100 },
    max_promocodes: { type: Number, default: 1000 },
    deleteFromDB: { type: Date },
    rank_card: {
        background: { type: String },
        background_brightness: { type: Number, default: 100 },
        background_blur: { type: Number, default: 0 },
        font_color: {
            r: { type: Number, default: 255 },
            g: { type: Number, default: 255 },
            b: { type: Number, default: 255 },
            a: { type: Number, default: 1 },
        },
        xp_color: {
            r: { type: Number, default: 85 },
            g: { type: Number, default: 118 },
            b: { type: Number, default: 255 },
            a: { type: Number, default: 0.8 },
        },
        xp_background_color: {
            r: { type: Number, default: 85 },
            g: { type: Number, default: 118 },
            b: { type: Number, default: 255 },
            a: { type: Number, default: 0.3 },
        }
    },
    startKit: [{
        itemID: { type: String },
        amount: { type: Number }
    }],
    startKitEnabled: { type: Boolean },
    fishingName: { type: String },
    fishingIcon: { type: String },
    miningName: { type: String },
    miningIcon: { type: String },
    cooldowns: { type: Map, default: new Map() },
    cooldown_immune_roles: [],
    lastSeasonReset: { type: Date, default: new Date() },
    maxDailyQuests: { type: Number, default: 1000 },
    maxWeeklyQuests: { type: Number, default: 1000 },
    takeDailyQuestPermission: { type: String },
    takeWeeklyQuestPermission: { type: String },
    daysSeason: { type: Number, default: 7 },
    seasonLevelsEnabled: { type: Boolean },
    apiKey: { type: String },
    customRolePrice: [{
        type: { type: Number },
        id: { type: String },
        amount: { type: Number }
    }],
    customRolePriceMinute: [{
        type: { type: Number },
        id: { type: String },
        amount: { type: Number }
    }],
    customRolePermission: { type: String },
    customRoleHoist: { type: Boolean },
    customRoleTemporaryEnabled: { type: Boolean, default: false },
    customRoleProperties: [],
    marketStorageLifeDays: { type: Number, default: 14 },
    xp_booster: {
        multiplier: { type: Number, default: 0 },
        until: { type: Date }
    },
    cur_booster: {
        multiplier: { type: Number, default: 0 },
        until: { type: Date }
    },
    rp_booster: {
        multiplier: { type: Number, default: 0 },
        until: { type: Date }
    },
    luck_booster: {
        multiplier: { type: Number, default: 0 },
        until: { type: Date }
    },
    global_boosters_stacking: { type: Boolean, default: false },
    auctions_permission: { type: String },
    currency_no_transfer: { type: Boolean, default: false },
    currency_no_drop: { type: Boolean, default: false },
    currency_transfer_permission: { type: String },
    currency_drop_permission: { type: String },
    usedSeasonCardsChannelId: { type: String },
    usedAllTimeCardsChannelId: { type: String },
    usedTeamCardsChannelId: { type: String },
    usedPlayerCardsNoLimitsChannelId: { type: String },
    customRoleMinimumMinutes: { type: Number },
    customRoleCreationLimit: { type: Number },
    notificationChannels: {
        levelUp: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String },
            messageType: { type: String, enum: ['default', 'custom'], default: 'default' },
            customMessage: {
                content: { type: String },
                embeds: [{
                    title: { type: String },
                    description: { type: String },
                    color: { type: Number },
                    thumbnail: {
                        url: { type: String }
                    },
                    image: {
                        url: { type: String }
                    },
                    fields: [{
                        name: { type: String },
                        value: { type: String },
                        inline: { type: Boolean }
                    }],
                    footer: {
                        text: { type: String },
                        iconURL: { type: String }
                    },
                    timestamp: { type: String }
                }]
            },
            thumbnailType: { type: String, enum: ['static', 'user_specific'] }
        },
        birthday: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String },
            messageType: { type: String, enum: ['default', 'custom'], default: 'default' },
            customMessage: {
                content: { type: String },
                embeds: [{
                    title: { type: String },
                    description: { type: String },
                    color: { type: Number },
                    thumbnail: {
                        url: { type: String }
                    },
                    image: {
                        url: { type: String }
                    },
                    fields: [{
                        name: { type: String },
                        value: { type: String },
                        inline: { type: Boolean }
                    }],
                    footer: {
                        text: { type: String },
                        iconURL: { type: String }
                    },
                    timestamp: { type: String }
                }]
            },
            thumbnailType: { type: String, enum: ['static', 'user_specific'] }
        },
        welcome: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String },
            messageType: { type: String, enum: ['default', 'custom'], default: 'default' },
            customMessage: {
                content: { type: String },
                embeds: [{
                    title: { type: String },
                    description: { type: String },
                    color: { type: Number },
                    thumbnail: {
                        url: { type: String }
                    },
                    image: {
                        url: { type: String }
                    },
                    fields: [{
                        name: { type: String },
                        value: { type: String },
                        inline: { type: Boolean }
                    }],
                    footer: {
                        text: { type: String },
                        iconURL: { type: String }
                    },
                    timestamp: { type: String }
                }]
            },
            thumbnailType: { type: String, enum: ['static', 'user_specific'] }
        },
        goodbye: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String },
            messageType: { type: String, enum: ['default', 'custom'], default: 'default' },
            customMessage: {
                content: { type: String },
                embeds: [{
                    title: { type: String },
                    description: { type: String },
                    color: { type: Number },
                    thumbnail: {
                        url: { type: String }
                    },
                    image: {
                        url: { type: String }
                    },
                    fields: [{
                        name: { type: String },
                        value: { type: String },
                        inline: { type: Boolean }
                    }],
                    footer: {
                        text: { type: String },
                        iconURL: { type: String }
                    },
                    timestamp: { type: String }
                }]
            },
            thumbnailType: { type: String, enum: ['static', 'user_specific'] },
            mentions: [{ type: String }],
            mentionEveryone: { type: Boolean, default: false }
        },
        dailyReward: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String },
            messageId: { type: String }
        }
    }
}, { minimize: false })
const name = "settings"
module.exports = models[name] || model(name, settingsSchema)