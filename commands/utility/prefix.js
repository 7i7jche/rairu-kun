import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { updatePrefix } from '../../index.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Change the bot prefix')
        .addStringOption(option =>
            option.setName('newprefix')
                .setDescription('The new prefix to use')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const newPrefix = interaction.options.getString('newprefix');
        await updatePrefix(interaction.guild.id, newPrefix);
        await interaction.reply(`Prefix updated to: \`${newPrefix}\``);
    },

    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You need Administrator permissions to use this command!');
        }

        const newPrefix = args[0];
        if (!newPrefix) return message.reply('Please provide a new prefix!');

        await updatePrefix(message.guild.id, newPrefix);
        await message.reply(`Prefix updated to: \`${newPrefix}\``);
    }
}; 