require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, CommandInteraction } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ] 
});

// Configuration
const CONFIG = {
  TOKEN: process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
  GUILD_ID: process.env.DISCORD_GUILD_ID || 'YOUR_GUILD_ID_HERE'
};

// Store keys in memory and persist to file
let licenseKeys = [];
const KEYS_FILE = path.join(__dirname, 'license_keys.json');

// Load keys from file
function loadKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf-8');
      licenseKeys = JSON.parse(data);
      console.log(`✓ Loaded ${licenseKeys.length} license keys from file`);
    }
  } catch (error) {
    console.warn('⚠️ Could not load keys file, starting with empty keys');
    licenseKeys = [];
  }
}

// Save keys to file
function saveKeys() {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(licenseKeys, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Error saving keys:', error);
  }
}

// Generate License Key
function generateKey(username, expiryDays = 365, maxUses = null) {
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(Math.random().toString(36).substr(2, 5).toUpperCase());
  }
  
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
  
  const expiryString = expiresAt.toISOString().split('T')[0];
  
  return {
    keyId: 'KEY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    key: `STX-${segments.join('-')}-${expiryString}`,
    username: username,
    createdBy: 'discord_bot',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    active: true,
    uses: 0,
    maxUses: maxUses,
    usageHistory: []
  };
}

// Validate License Key Format
function validateKeyFormat(key) {
  const regex = /^STX-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-\d{4}-\d{2}-\d{2}$/;
  return regex.test(key);
}

// Check if key is expired
function isKeyExpired(key) {
  const expiryDate = new Date(key.expiresAt);
  return new Date() > expiryDate;
}

// Load commands
client.commands = new Collection();
const commands = [];

// ===== COMMAND 1: Generate Key =====
commands.push({
  name: 'genkey',
  description: 'Generate a license key for a user',
  options: [
    {
      name: 'username',
      description: 'Username to generate key for',
      type: 3,
      required: true
    },
    {
      name: 'expiry_days',
      description: 'Days until key expires (default: 365)',
      type: 4,
      required: false
    },
    {
      name: 'max_uses',
      description: 'Maximum uses (leave blank for unlimited)',
      type: 4,
      required: false
    }
  ]
});

// ===== COMMAND 2: List Keys =====
commands.push({
  name: 'listkeys',
  description: 'List all active license keys'
});

// ===== COMMAND 3: Revoke Key =====
commands.push({
  name: 'revokekey',
  description: 'Revoke a license key',
  options: [
    {
      name: 'key',
      description: 'License key to revoke',
      type: 3,
      required: true
    }
  ]
});

// ===== COMMAND 4: Check Key =====
commands.push({
  name: 'checkkey',
  description: 'Check license key validity',
  options: [
    {
      name: 'key',
      description: 'License key to check',
      type: 3,
      required: true
    }
  ]
});

// ===== COMMAND 5: Count Keys =====
commands.push({
  name: 'countkeys',
  description: 'Show total and active license key counts'
});

// ===== COMMAND 6: User Keys =====
commands.push({
  name: 'userkeys',
  description: 'List all license keys for a username',
  options: [
    {
      name: 'username',
      description: 'Username to search',
      type: 3,
      required: true
    }
  ]
});

// ===== COMMAND 7: Help =====
commands.push({
  name: 'help',
  description: 'Show available bot commands and usage'
});

// Register commands
client.on('ready', async () => {
  console.log(`✓ Bot logged in as ${client.user.tag}`);
  console.log(`🤖 Bot is online!`);
  console.log(`📍 Server ID: ${CONFIG.GUILD_ID}`);
  
  // Load keys from file
  loadKeys();
  
  const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
  
  try {
    console.log('📝 Registering slash commands...');
    
    await rest.put(
      Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
      { body: commands }
    );
    
    console.log('✓ Slash commands registered');
    console.log('✓ Bot is ready! Use /genkey, /listkeys, /checkkey, /revokekey in Discord');
  } catch (error) {
    console.error('✗ Error registering commands:', error);
  }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // ===== GENKEY COMMAND =====
    if (interaction.commandName === 'genkey') {
      const username = interaction.options.getString('username');
      const expiryDays = interaction.options.getInteger('expiry_days') || 365;
      const maxUses = interaction.options.getInteger('max_uses') || null;

      const newKey = generateKey(username, expiryDays, maxUses);
      licenseKeys.push(newKey);
      saveKeys(); // Save to file

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ License Key Generated')
        .setDescription('A new license key has been created!')
        .addFields(
          { name: '🔑 License Key', value: `\`${newKey.key}\``, inline: false },
          { name: '👤 Username', value: username, inline: true },
          { name: '📅 Expires', value: newKey.expiresAt.split('T')[0], inline: true },
          { name: '⏰ Created', value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), inline: true },
          { name: '📊 Max Uses', value: maxUses ? `${maxUses} uses` : '∞ Unlimited', inline: true },
          { name: '\u200b', value: '⚠️ **Keep this key safe!** Share only with trusted users.', inline: false }
        )
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      await interaction.reply({ embeds: [embed], ephemeral: false });
      console.log(`✓ Generated key for ${username}: ${newKey.key}`);
    }

    // ===== LISTKEYS COMMAND =====
    else if (interaction.commandName === 'listkeys') {
      const activeKeys = licenseKeys.filter(k => k.active && !isKeyExpired(k));

      if (activeKeys.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('📋 License Keys')
          .setDescription('No active license keys found.');

        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Active License Keys')
        .setDescription(`Total: **${activeKeys.length}** active keys`)
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      activeKeys.slice(0, 10).forEach((key, index) => {
        const usageText = key.maxUses ? `${key.uses}/${key.maxUses}` : `${key.uses}/∞`;
        embed.addFields({
          name: `${index + 1}. ${key.key.substring(0, 20)}...`,
          value: `👤 **User:** ${key.username}\n📅 **Expires:** ${key.expiresAt.split('T')[0]}\n📊 **Uses:** ${usageText}`,
          inline: false
        });
      });

      if (activeKeys.length > 10) {
        embed.addFields({
          name: '\u200b',
          value: `... and ${activeKeys.length - 10} more keys`
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // ===== REVOKEKEY COMMAND =====
    else if (interaction.commandName === 'revokekey') {
      const key = interaction.options.getString('key');
      const keyObj = licenseKeys.find(k => k.key === key);

      if (!keyObj) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Key Not Found')
          .setDescription(`License key \`${key}\` was not found.`);

        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      keyObj.active = false;
      saveKeys(); // Save to file

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('✅ Key Revoked')
        .setDescription('The license key has been revoked!')
        .addFields(
          { name: '🔑 Key', value: `\`${keyObj.key}\``, inline: false },
          { name: '👤 Username', value: keyObj.username, inline: true },
          { name: '⏰ Revoked At', value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), inline: true },
          { name: '🚫 Status', value: 'REVOKED - This key can no longer be used.', inline: false }
        )
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      await interaction.reply({ embeds: [embed], ephemeral: false });
      console.log(`✓ Revoked key: ${key}`);
    }

    // ===== CHECKKEY COMMAND =====
    else if (interaction.commandName === 'checkkey') {
      const key = interaction.options.getString('key');

      if (!validateKeyFormat(key)) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Invalid Key Format')
          .setDescription('The key format is invalid.');

        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const keyObj = licenseKeys.find(k => k.key === key);

      if (!keyObj) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Key Not Found')
          .setDescription(`License key \`${key}\` was not found in the system.`);

        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const isExpired = isKeyExpired(keyObj);
      const status = keyObj.active && !isExpired ? '✅ ACTIVE' : '❌ INACTIVE';
      const statusColor = keyObj.active && !isExpired ? 0x00FF00 : 0xFF0000;
      const usageText = keyObj.maxUses ? `${keyObj.uses}/${keyObj.maxUses}` : `${keyObj.uses}/∞`;
      
      // Track usage statistics
      if (!keyObj.usageHistory) keyObj.usageHistory = [];
      keyObj.usageHistory.push({
        checkedBy: interaction.user.username,
        checkedAt: new Date().toISOString(),
        status: status
      });
      saveKeys();

      const embed = new EmbedBuilder()
        .setColor(statusColor)
        .setTitle('🔍 License Key Information')
        .addFields(
          { name: '🔑 Key', value: `\`${keyObj.key}\``, inline: false },
          { name: '👤 Username', value: keyObj.username, inline: true },
          { name: '📊 Status', value: status, inline: true },
          { name: '📅 Created', value: keyObj.createdAt.split('T')[0], inline: true },
          { name: '⏰ Expires', value: keyObj.expiresAt.split('T')[0], inline: true },
          { name: '📈 Uses', value: usageText, inline: true },
          { name: '\u200b', value: isExpired ? '⚠️ This key has **EXPIRED**' : '✓ This key is **VALID**', inline: false }
        )
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ===== COUNTKEYS COMMAND =====
    else if (interaction.commandName === 'countkeys') {
      const totalKeys = licenseKeys.length;
      const activeKeys = licenseKeys.filter(k => k.active && !isKeyExpired(k)).length;

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📊 License Key Stats')
        .setDescription('Current license key overview')
        .addFields(
          { name: 'Total keys', value: `${totalKeys}`, inline: true },
          { name: 'Active keys', value: `${activeKeys}`, inline: true }
        )
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // ===== USERKEYS COMMAND =====
    else if (interaction.commandName === 'userkeys') {
      const username = interaction.options.getString('username');
      const userKeys = licenseKeys.filter(k => k.username.toLowerCase() === username.toLowerCase());

      if (userKeys.length === 0) {
        return await interaction.reply({ content: `❌ No keys found for user **${username}**.`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`🔑 Keys for ${username}`)
        .setDescription(`Found **${userKeys.length}** keys for this user.`)
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      userKeys.slice(0, 10).forEach((key, index) => {
        const status = key.active && !isKeyExpired(key) ? '✅ ACTIVE' : '❌ INACTIVE';
        embed.addFields({
          name: `${index + 1}. ${key.key}`,
          value: `Expires: ${key.expiresAt.split('T')[0]} • Status: ${status}`,
          inline: false
        });
      });

      if (userKeys.length > 10) {
        embed.addFields({ name: '\u200b', value: `...and ${userKeys.length - 10} more keys` });
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // ===== HELP COMMAND =====
    else if (interaction.commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🤖 Streamer X Bot Help')
        .setDescription('Available license key commands')
        .addFields(
          { name: '/genkey', value: 'Generate a license key for a user', inline: false },
          { name: '/listkeys', value: 'List all active license keys', inline: false },
          { name: '/revokekey', value: 'Revoke a license key', inline: false },
          { name: '/checkkey', value: 'Check license key validity', inline: false },
          { name: '/countkeys', value: 'Show total and active license key counts', inline: false },
          { name: '/userkeys', value: 'List all license keys for a username', inline: false },
          { name: '/help', value: 'Show this help message', inline: false }
        )
        .setFooter({ text: 'Streamer X Cloud | Key System' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

  } catch (error) {
    console.error('Error handling command:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while processing your command.', 
      ephemeral: true 
    });
  }
});

// Login
console.log('🚀 Starting Streamer X Cloud Discord Bot...');
console.log('⏳ Connecting to Discord...');
console.log('');

if (CONFIG.TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ ERROR: Bot token not configured!');
  console.error('Please set DISCORD_BOT_TOKEN in .env file');
  process.exit(1);
}

if (CONFIG.CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
  console.error('❌ ERROR: Client ID not configured!');
  console.error('Please set DISCORD_CLIENT_ID in .env file');
  process.exit(1);
}

if (CONFIG.GUILD_ID === 'YOUR_GUILD_ID_HERE') {
  console.error('❌ ERROR: Guild ID not configured!');
  console.error('Please set DISCORD_GUILD_ID in .env file');
  process.exit(1);
}

client.login(CONFIG.TOKEN);

// Export for use in web app
module.exports = { generateKey, validateKeyFormat, isKeyExpired, licenseKeys };
