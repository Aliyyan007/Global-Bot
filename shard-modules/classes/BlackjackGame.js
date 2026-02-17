const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const config = require("../config/botconfig")
const uniqid = require('uniqid');
const { RewardType } = require('../enums');
class BlackjackGame {
    constructor(client, userId, guildId, betType, betId, betAmount, emojiBet, nameBet) {
        this.client = client
        this.guildId = guildId
        this.id = uniqid.time()
        this.userId = userId
        this.deck = []
        this.playerHand = []
        this.dealerHand = []
        this.playerScore = 0
        this.dealerScore = 0
        this.gameOver = false
        this.currentBet = betAmount
        this.betType = betType
        this.betId = betId
        this.emojiBet = emojiBet
        this.nameBet = nameBet
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ value, suit });
            }
        }
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCard(hand) {
        if (this.deck.length === 0) {
            this.createDeck();
        }
        const card = this.deck.pop();
        hand.push(card);
        return card;
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;

        for (let card of hand) {
            if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else if (card.value === 'A') {
                aces += 1;
                score += 11;
            } else {
                score += parseInt(card.value);
            }
        }

        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }

        return score;
    }

    formatHand(hand, hideFirstCard = false) {
        if (hideFirstCard) {
            return `[${config.blackjack.backside}] ${hand.slice(1).map(card => `[${card.value}${card.suit}]`).join(' ')}`;
        }
        return hand.map(card => `[${card.value}${card.suit}]`).join(' ');
    }

    async getContainer(interaction) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent([
                        `## ${this.client.language({ textId: "Blackjack", guildId: interaction.guildId, locale: interaction.locale })}`
                    ].join("\n"))
            ])
            .addSeparatorComponents([
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            ])
            .addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent([
                        `💵 ${this.client.language({ textId: "Bid", guildId: interaction.guildId, locale: interaction.locale })}`,
                        `${this.emojiBet}${this.nameBet} (${this.currentBet.toLocaleString()})`
                    ].join("\n"))
            ])
            .addSeparatorComponents([
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            ])
            .addSectionComponents([
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                `👤 ${this.client.language({ textId: "Your hand", guildId: interaction.guildId, locale: interaction.locale })}`,
                                `${this.formatHand(this.playerHand)}`,
                                `${this.client.language({ textId: "Points", guildId: interaction.guildId, locale: interaction.locale })}: **${this.playerScore}**`
                            ].join("\n"))
                    ])
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.member.displayAvatarURL()))
            ])
            .addSeparatorComponents([
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            ])
            .addSectionComponents([
                new SectionBuilder()
                    .addTextDisplayComponents([
                        new TextDisplayBuilder()
                            .setContent([
                                `🃏 ${this.client.language({ textId: "Dealer's hand", guildId: interaction.guildId, locale: interaction.locale })}`,
                                `${this.formatHand(this.dealerHand, !this.gameOver)}`,
                                `${this.client.language({ textId: "Points", guildId: interaction.guildId, locale: interaction.locale })}: ${this.gameOver ? `**${this.dealerScore}**` : '?'}`
                            ].join("\n"))
                    ])
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.guild.members.me.displayAvatarURL()))
            ])
        if (this.gameOver) {
            const result = await this.determineWinner(interaction)
            container.spliceComponents(1, 0, [
                new TextDisplayBuilder()
                    .setContent([
                        `**${result}**`
                    ].join("\n"))
            ])
        }
        const actionRow = this.getButtons(interaction)
        if (actionRow) container.addActionRowComponents(actionRow)
        return container
    }

    getButtons(interaction) {
        if (this.gameOver) {
            return
        }
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`cmd{blackjack}id{${this.id}}hit`)
                    .setLabel(`${this.client.language({ textId: "Hit", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`cmd{blackjack}id{${this.id}}stand`)
                    .setLabel(`${this.client.language({ textId: "Stand", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setStyle(ButtonStyle.Secondary)
            )

        // Добавляем кнопку удвоения только если у игрока ровно 2 карты
        if (this.playerHand.length === 2) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`cmd{blackjack}id{${this.id}}double`)
                    .setLabel(`${this.client.language({ textId: "Double", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setStyle(ButtonStyle.Success)
            );
        }

        return row;
    }

    async determineWinner(interaction) {
        const profile = this.client.cache.profiles.get(this.guildId+this.userId)
        if (this.playerScore > 21) {
            return `💥${this.client.language({ textId: "Bust! You lost", guildId: interaction.guildId, locale: interaction.locale })} ${this.emojiBet}${this.nameBet} (${this.currentBet.toLocaleString()})`;
        } else if (this.dealerScore > 21) {
            const multiplier = this.playerHand.length === 2 && this.playerHand.some(e => e.value === "10") && this.playerHand.some(e => e.value === "A") ? 2.5 : 2
            if (this.betType === RewardType.Currency) {
                await profile.addCurrency(this.currentBet * multiplier)
            }
            if (this.betType === RewardType.Item) {
                await profile.addItem(this.betId, this.currentBet * multiplier) 
            }
            await profile.save()
            return `🎉 ${this.client.language({ textId: "Dealer busted! You won", guildId: interaction.guildId, locale: interaction.locale })} ${this.emojiBet}${this.nameBet} (${(this.currentBet * multiplier).toLocaleString()})`;
        } else if (this.playerScore > this.dealerScore) {
            const multiplier = this.playerHand.length === 2 && this.playerHand.some(e => e.value === "10") && this.playerHand.some(e => e.value === "A") ? 2.5 : 2
            if (this.betType === RewardType.Currency) {
                await profile.addCurrency(this.currentBet * multiplier)
            }
            if (this.betType === RewardType.Item) {
                await profile.addItem(this.betId, this.currentBet * multiplier) 
            }
            await profile.save()
            return `🎉 ${this.client.language({ textId: "You won", guildId: interaction.guildId, locale: interaction.locale })} ${this.emojiBet}${this.nameBet} (${(this.currentBet * multiplier).toLocaleString()})`;
        } else if (this.dealerScore > this.playerScore) {
            return `💸 ${this.client.language({ textId: "Dealer won. You lost", guildId: interaction.guildId, locale: interaction.locale })} ${this.emojiBet}${this.nameBet} (${this.currentBet.toLocaleString()})`;
        } else {
            if (this.betType === RewardType.Currency) {
                await profile.addCurrency(this.currentBet)
            }
            if (this.betType === RewardType.Item) {
                await profile.addItem(this.betId, this.currentBet) 
            }
            await profile.save()
            return `🤝 ${this.client.language({ textId: "Tie!", guildId: interaction.guildId, locale: interaction.locale })}`;
        }
    }

    startGame() {
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameOver = false;

        // Раздача начальных карт
        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);
        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);

        this.playerScore = this.calculateScore(this.playerHand);
        this.dealerScore = this.calculateScore(this.dealerHand);

        // Проверка на блекджек
        if (this.playerScore === 21) {
            this.gameOver = true;
        }
    }

    playerHit() {
        this.dealCard(this.playerHand);
        this.playerScore = this.calculateScore(this.playerHand);
        
        if (this.playerScore > 21) {
            this.gameOver = true;
        }
    }

    playerStand() {
        this.gameOver = true;
        this.dealerPlay();
    }

    playerDouble() {
        this.currentBet *= 2;
        this.dealCard(this.playerHand);
        this.playerScore = this.calculateScore(this.playerHand);
        this.gameOver = true;
        this.dealerPlay();
    }

    dealerPlay() {
        while (this.dealerScore < 17) {
            this.dealCard(this.dealerHand);
            this.dealerScore = this.calculateScore(this.dealerHand);
        }
    }
}
module.exports = BlackjackGame