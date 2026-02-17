const { Collection } = require("discord.js")
const cooldowns = new Collection()
const loadCooldowns = async (client) => {
  client.guilds.cache.forEach(guild => {
    const settings = client.cache.settings.find(settings => settings.guildID === guild.id && (settings.cooldowns || settings.cooldown_immune_roles?.[0]))
    if (settings) {
      cooldowns.set(guild.id, new Collection([["cooldowns", new Collection()], ["immune_roles", new Array()]]))
      if (settings.cooldowns) {
        Array.from(settings.cooldowns.keys()).forEach((key) => {
          cooldowns.get(guild.id).get("cooldowns").set(key, settings.cooldowns.get(key))
        })  
      }
      if (settings.cooldown_immune_roles?.[0]) cooldowns.get(guild.id).set("immune_roles", settings.cooldown_immune_roles)
    }
  })
  console.log(`Successfully loaded languages.`)
}

const setCooldown = (commandName, guildId, cooldown) => {
    const guild = cooldowns.get(guildId)
    if (!guild) cooldowns.set(guildId, new Collection([["cooldowns", new Collection([[commandName, cooldown]])], ["immune_roles", new Array()]]))
    else guild.get("cooldowns").set(commandName, cooldown)
}
const setImmuneRoles = (guildId, roles) => {
    const guild = cooldowns.get(guildId)
    if (!guild) cooldowns.set(guildId, new Collection([["cooldowns", new Collection()], ["immune_roles", roles]]))
    else cooldowns.get(guildId).set("immune_roles", roles)
}

module.exports = (data) => {
  const commandName = data.commandName
  const guildId = data.guildId
  if (!guildId) return
  const guild = cooldowns.get(guildId)
  if (guild) return [guild.get("cooldowns").get(commandName), guild.get("immune_roles")]
  else return
}

module.exports.loadCooldowns = loadCooldowns
module.exports.setCooldown = setCooldown
module.exports.setImmuneRoles = setImmuneRoles