const blacklist = {
	guilds: {
		full_ban: new Set(),
	},
	users: {
		full_ban: new Set(),
	}
}
const loadBlackList = async (client) => {
  let fullBanIDs = await client.blackListSchema.find({ guildID: { $exists: true }, full_ban: true }).distinct("guildID")
  fullBanIDs.forEach(id => blacklist.guilds.full_ban.add(id))
  fullBanIDs = await client.blackListSchema.find({ userID: { $exists: true }, full_ban: true }).distinct("userID")
  fullBanIDs.forEach(id => blacklist.users.full_ban.add(id))
  console.log(`Successfully loaded blacklist.`)
}

const addBlackList = async (client, id, type, type2) => {
  if (type2 === "guilds") await client.blackListSchema.updateOne({ guildID: id }, { $set: { guildID: id, [type]: true } }, { upsert: true })
  else await client.blackListSchema.updateOne({ userID: id }, { $set: { userID: id, [type]: true } }, { upsert: true })
  blacklist[type2][type].add(id)
}
const removeBlackList = async (client, id, type, type2) => {
  if (type2 === "guilds") await client.blackListSchema.updateOne({ guildID: id }, { $set: { guildID: id, [type]: false } }, { upsert: true })
  else await client.blackListSchema.updateOne({ userID: id }, { $set: { userID: id, [type]: false } }, { upsert: true })
  blacklist[type2][type].delete(id)
}
module.exports = (id, type, type2) => {
  return blacklist[type2][type].has(id)
}

module.exports.loadBlackList = loadBlackList
module.exports.addBlackList = addBlackList
module.exports.removeBlackList = removeBlackList