const { PermissionFlagsBits } = require('discord.js');

/**
 * Removes moderation permissions from bots by creating restricted roles
 * @param {Array} botMembers - Array of bot members to process
 * @param {Guild} guild - Discord guild object
 */
async function removePermissionsFromBots(botMembers, guild) {
    try {
        const ourBot = await guild.members.fetch(guild.client.user.id);
        const ourBotRole = ourBot.roles.highest;
        
        console.log(`[Permission Removal] ========== STARTING PERMISSION REMOVAL ==========`);
        console.log(`[Permission Removal] Processing ${botMembers.length} bot(s)`);
        
        // STEP 1: SCAN ENTIRE GUILD FOR EXISTING RESTRICTED ROLES (BEFORE PROCESSING ANY BOTS)
        const guildRestrictedRoleMap = new Map();
        
        await guild.roles.fetch();
        const allGuildRoles = guild.roles.cache;
        
        console.log(`[Permission Removal] STEP 1: Scanning ${allGuildRoles.size} guild roles for existing restricted roles...`);
        
        for (const [roleId, role] of allGuildRoles) {
            if (role.name.endsWith(' ❗')) {
                const originalRoleName = role.name.slice(0, -2).trim();
                guildRestrictedRoleMap.set(originalRoleName, role);
                console.log(`[Permission Removal] ✓ Found existing restricted role: "${role.name}" (ID: ${role.id}) → maps to: "${originalRoleName}"`);
            }
        }
        
        console.log(`[Permission Removal] Found ${guildRestrictedRoleMap.size} existing restricted role(s) in guild`);
        
        const serverRoleMap = new Map();
        const managedRoleMap = new Map();
        
        // STEP 2: Categorize roles by type (managed vs server roles)
        console.log(`[Permission Removal] STEP 2: Categorizing bot roles...`);
        
        for (const botMember of botMembers) {
            console.log(`[Permission Removal] ━━━ Analyzing bot: ${botMember.user.username} (ID: ${botMember.id}) ━━━`);
            
            const targetBotRole = botMember.roles.highest;
            
            if (targetBotRole.position >= ourBotRole.position) {
                console.log(`[Permission Removal] ⚠ Skipping ${botMember.user.username} - role is above or equal to our bot's role`);
                continue;
            }
            
            const botRoles = botMember.roles.cache.filter(role => role.id !== guild.id);
            console.log(`[Permission Removal]   → Bot has ${botRoles.size} role(s): ${botRoles.map(r => r.name).join(', ')}`);
            
            for (const [roleId, role] of botRoles) {
                console.log(`[Permission Removal]   → Checking role: "${role.name}" (ID: ${role.id}, Position: ${role.position})`);
                
                if (role.position >= ourBotRole.position) {
                    console.log(`[Permission Removal]     ⚠ Skipping - above our bot's role`);
                    continue;
                }
                
                const hasBan = role.permissions.has(PermissionFlagsBits.BanMembers);
                const hasKick = role.permissions.has(PermissionFlagsBits.KickMembers);
                const hasTimeout = role.permissions.has(PermissionFlagsBits.ModerateMembers);
                const hasAdmin = role.permissions.has(PermissionFlagsBits.Administrator);
                
                console.log(`[Permission Removal]     → Permissions: Ban=${hasBan}, Kick=${hasKick}, Timeout=${hasTimeout}, Admin=${hasAdmin}`);
                
                if (!hasBan && !hasKick && !hasTimeout && !hasAdmin) {
                    console.log(`[Permission Removal]     → No moderation permissions, skipping`);
                    continue;
                }
                
                if (role.managed) {
                    managedRoleMap.set(botMember.id, { botMember, role, hasAdmin });
                    console.log(`[Permission Removal]     ✓ Categorized as MANAGED role (will modify directly)`);
                } else {
                    if (!serverRoleMap.has(roleId)) {
                        serverRoleMap.set(roleId, { role, bots: [], hasAdmin });
                    }
                    serverRoleMap.get(roleId).bots.push(botMember);
                    console.log(`[Permission Removal]     ✓ Categorized as SERVER role (will create/reuse restricted version)`);
                }
            }
        }
        
        // STEP 3: Handle managed roles (modify permissions directly)
        console.log(`[Permission Removal] STEP 3: Processing ${managedRoleMap.size} managed role(s)...`);
        
        for (const [botId, { botMember, role, hasAdmin }] of managedRoleMap) {
            try {
                if (hasAdmin) {
                    const allPermissionValues = Object.values(PermissionFlagsBits).filter(p => typeof p === 'bigint');
                    
                    const newPerms = allPermissionValues.filter(perm => 
                        perm !== PermissionFlagsBits.Administrator &&
                        perm !== PermissionFlagsBits.BanMembers &&
                        perm !== PermissionFlagsBits.KickMembers &&
                        perm !== PermissionFlagsBits.ModerateMembers
                    );
                    
                    console.log(`[Permission Removal] → Modifying managed role ${role.name}:`);
                    console.log(`[Permission Removal]   → Total available permissions: ${allPermissionValues.length}`);
                    console.log(`[Permission Removal]   → Permissions after filtering: ${newPerms.length}`);
                    console.log(`[Permission Removal]   → Removed: Administrator, BanMembers, KickMembers, ModerateMembers`);
                    
                    await role.setPermissions(newPerms);
                    
                    await role.fetch();
                    const finalPerms = role.permissions.toArray();
                    console.log(`[Permission Removal] ✓ Modified managed role ${role.name} for ${botMember.user.username}`);
                    console.log(`[Permission Removal]   → Final permissions count: ${finalPerms.length}`);
                    console.log(`[Permission Removal]   → Final permissions: ${finalPerms.join(', ')}`);
                } else {
                    await role.setPermissions(
                        role.permissions.remove([
                            PermissionFlagsBits.BanMembers,
                            PermissionFlagsBits.KickMembers,
                            PermissionFlagsBits.ModerateMembers
                        ])
                    );
                    console.log(`[Permission Removal] ✓ Modified managed role ${role.name} for ${botMember.user.username} (removed moderation perms)`);
                }
            } catch (error) {
                console.error(`[Permission Removal] ✗ Error modifying managed role for ${botMember.user.username}:`, error);
            }
        }
        
        // STEP 4: Handle server roles (create ONE restricted role per original role, or reuse existing)
        console.log(`[Permission Removal] STEP 4: Processing ${serverRoleMap.size} server role(s)...`);
        
        const restrictedRoleCache = new Map();
        
        for (const [roleId, { role, bots, hasAdmin }] of serverRoleMap) {
            try {
                let restrictedRole = null;
                
                console.log(`[Permission Removal] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`[Permission Removal] Processing server role: "${role.name}"`);
                console.log(`[Permission Removal]   → Role ID: ${role.id}`);
                console.log(`[Permission Removal]   → Position: ${role.position}`);
                console.log(`[Permission Removal]   → Has Administrator: ${hasAdmin}`);
                console.log(`[Permission Removal]   → Assigned to ${bots.length} bot(s): ${bots.map(b => b.user.username).join(', ')}`);
                console.log(`[Permission Removal] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                
                const targetRestrictedName = `${role.name} ❗`;
                console.log(`[Permission Removal] 🔍 SEARCHING for existing restricted role: "${targetRestrictedName}"`);
                
                // Method 1: Check guild-wide map
                console.log(`[Permission Removal]   [Method 1] Checking guild-wide map...`);
                if (guildRestrictedRoleMap.has(role.name)) {
                    restrictedRole = guildRestrictedRoleMap.get(role.name);
                    console.log(`[Permission Removal]   ✅ FOUND in guild map!`);
                    console.log(`[Permission Removal]      → Role: "${restrictedRole.name}" (ID: ${restrictedRole.id})`);
                    console.log(`[Permission Removal]      → Position: ${restrictedRole.position}`);
                    console.log(`[Permission Removal]   ✓ DECISION: REUSE existing role (found in guild scan)`);
                } else {
                    console.log(`[Permission Removal]   ❌ Not found in guild map`);
                }
                
                // Method 2: Check session cache
                if (!restrictedRole) {
                    console.log(`[Permission Removal]   [Method 2] Checking session cache...`);
                    if (restrictedRoleCache.has(roleId)) {
                        restrictedRole = restrictedRoleCache.get(roleId);
                        console.log(`[Permission Removal]   ✅ FOUND in session cache!`);
                        console.log(`[Permission Removal]      → Role: "${restrictedRole.name}" (ID: ${restrictedRole.id})`);
                        console.log(`[Permission Removal]      → Position: ${restrictedRole.position}`);
                        console.log(`[Permission Removal]   ✓ DECISION: REUSE role from this session`);
                    } else {
                        console.log(`[Permission Removal]   ❌ Not found in session cache`);
                    }
                }
                
                // Method 3: Direct search by exact name
                if (!restrictedRole) {
                    console.log(`[Permission Removal]   [Method 3] Direct search by name "${targetRestrictedName}"...`);
                    const existingRole = guild.roles.cache.find(r => r.name === targetRestrictedName);
                    if (existingRole) {
                        restrictedRole = existingRole;
                        console.log(`[Permission Removal]   ✅ FOUND by direct search!`);
                        console.log(`[Permission Removal]      → Role: "${restrictedRole.name}" (ID: ${restrictedRole.id})`);
                        console.log(`[Permission Removal]      → Position: ${restrictedRole.position}`);
                        console.log(`[Permission Removal]      → Adding to maps to prevent future searches`);
                        guildRestrictedRoleMap.set(role.name, restrictedRole);
                        restrictedRoleCache.set(roleId, restrictedRole);
                        console.log(`[Permission Removal]   ✓ DECISION: REUSE existing role (found by direct search)`);
                    } else {
                        console.log(`[Permission Removal]   ❌ Not found by direct search`);
                    }
                }
                
                // Only create if it doesn't exist anywhere
                if (!restrictedRole) {
                    console.log(`[Permission Removal] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    console.log(`[Permission Removal] ❌ NO EXISTING RESTRICTED ROLE FOUND (checked 3 methods)`);
                    console.log(`[Permission Removal] ✓ DECISION: CREATE NEW restricted role`);
                    console.log(`[Permission Removal] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    
                    let newPermissions;
                    
                    if (hasAdmin) {
                        const allPermissionValues = Object.values(PermissionFlagsBits).filter(p => typeof p === 'bigint');
                        
                        newPermissions = allPermissionValues.filter(perm => 
                            perm !== PermissionFlagsBits.Administrator &&
                            perm !== PermissionFlagsBits.BanMembers &&
                            perm !== PermissionFlagsBits.KickMembers &&
                            perm !== PermissionFlagsBits.ModerateMembers
                        );
                        
                        console.log(`[Permission Removal]   → Admin role detected`);
                        console.log(`[Permission Removal]   → Total available permissions: ${allPermissionValues.length}`);
                        console.log(`[Permission Removal]   → Keeping ${newPermissions.length} permissions (removed 4: Admin, Ban, Kick, Timeout)`);
                    } else {
                        newPermissions = role.permissions.remove([
                            PermissionFlagsBits.BanMembers,
                            PermissionFlagsBits.KickMembers,
                            PermissionFlagsBits.ModerateMembers
                        ]);
                        console.log(`[Permission Removal]   → Non-admin role: removing only moderation perms`);
                    }
                    
                    restrictedRole = await guild.roles.create({
                        name: `${role.name} ❗`,
                        color: role.color,
                        hoist: role.hoist,
                        permissions: newPermissions,
                        mentionable: role.mentionable
                    });
                    
                    console.log(`[Permission Removal] ✓ CREATED new restricted role: "${restrictedRole.name}" (ID: ${restrictedRole.id})`);
                    console.log(`[Permission Removal]   → Initial position: ${restrictedRole.position}, target position: ${role.position - 1}`);
                    
                    // Move role to correct position (just below original role)
                    try {
                        const targetPosition = Math.max(1, role.position - 1);
                        await restrictedRole.setPosition(targetPosition);
                        console.log(`[Permission Removal]   → Moved role to position ${targetPosition} (just below "${role.name}")`);
                    } catch (posError) {
                        console.error(`[Permission Removal]   ✗ Failed to set position:`, posError.message);
                    }
                    
                    // Verify what permissions were actually set
                    const actualPerms = restrictedRole.permissions.toArray();
                    console.log(`[Permission Removal]   → Actual permissions set: ${actualPerms.length}`);
                    console.log(`[Permission Removal]   → Permissions: ${actualPerms.join(', ')}`);
                    
                    const hasManageChannels = actualPerms.includes('ManageChannels');
                    const hasManageRoles = actualPerms.includes('ManageRoles');
                    const hasSendVoiceMessages = actualPerms.includes('SendVoiceMessages');
                    console.log(`[Permission Removal]   → Has ManageChannels: ${hasManageChannels}, ManageRoles: ${hasManageRoles}, SendVoiceMessages: ${hasSendVoiceMessages}`);
                    
                    restrictedRoleCache.set(roleId, restrictedRole);
                    guildRestrictedRoleMap.set(role.name, restrictedRole);
                }
                
                // Assign restricted role to ALL bots that had the original role
                console.log(`[Permission Removal] → Assigning "${restrictedRole.name}" to ${bots.length} bot(s)...`);
                
                for (const botMember of bots) {
                    try {
                        if (!botMember.roles.cache.has(restrictedRole.id)) {
                            await botMember.roles.add(restrictedRole);
                            console.log(`[Permission Removal]   ✓ Added restricted role to ${botMember.user.username}`);
                        } else {
                            console.log(`[Permission Removal]   → ${botMember.user.username} already has restricted role`);
                        }
                        
                        if (botMember.roles.cache.has(role.id)) {
                            await botMember.roles.remove(role);
                            console.log(`[Permission Removal]   ✓ Removed original role from ${botMember.user.username}`);
                        }
                        
                        console.log(`[Permission Removal]   ✓ Completed swap for ${botMember.user.username}: "${role.name}" → "${restrictedRole.name}"`);
                    } catch (error) {
                        console.error(`[Permission Removal]   ✗ Error swapping role for ${botMember.user.username}:`, error);
                    }
                }
            } catch (error) {
                console.error(`[Permission Removal] ✗ Error processing restricted role for ${role.name}:`, error);
            }
        }
        
        console.log(`[Permission Removal] ========== PERMISSION REMOVAL COMPLETE ==========`);
    } catch (error) {
        console.error('[Permission Removal] ✗ FATAL ERROR:', error);
        throw error;
    }
}

module.exports = { removePermissionsFromBots };
