import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';  // Using promises version for better performance
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '../../config.json');

// Cache the config
let configCache = null;

const updatePrefix = async (newPrefix) => {
    try {
        // Read config only if cache is empty
        if (!configCache) {
            const configData = await fs.readFile(configPath, 'utf8');
            configCache = JSON.parse(configData);
        }
        
        configCache.prefix = newPrefix;
        await fs.writeFile(configPath, JSON.stringify(configCache, null, 2));
        return configCache;
    } catch (error) {
        console.error('Error updating prefix:', error);
        throw error;
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Change the bot prefix')
        .addStringOption(option =>
            option.setName('newprefix')
                .setDescription('The new prefix to use')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply();
        
        const newPrefix = interaction.options.getString('newprefix');
        if (newPrefix.length > 3) {
            return interaction.editReply('Prefix must be 3 characters or less!');
        }

        try {
            const config = await updatePrefix(newPrefix);
            await interaction.editReply(`Prefix has been updated to: ${config.prefix}`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to update prefix!');
        }
    },
    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('You need Manage Server permission to use this command!');
        }

        const newPrefix = args[0];
        if (!newPrefix) {
            return message.reply('Please provide a new prefix!');
        }
        if (newPrefix.length > 3) {
            return message.reply('Prefix must be 3 characters or less!');
        }

        try {
            const config = await updatePrefix(newPrefix);
            await message.reply(`Prefix has been updated to: ${config.prefix}`);
        } catch (error) {
            console.error(error);
            await message.reply('Failed to update prefix!');
        }
    }
}; 