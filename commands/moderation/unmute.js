import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);

        try {
            await member.timeout(null);
            await interaction.reply(`🔊 **${user.tag}** has been unmuted!`);
        } catch (error) {
            await interaction.reply('Failed to unmute user. Make sure I have the correct permissions.');
        }
    },

    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('You do not have permission to use this command.');
        }

        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention a user to unmute.');

        const member = message.guild.members.cache.get(user.id);

        try {
            await member.timeout(null);
            await message.reply(`🔊 **${user.tag}** has been unmuted!`);
        } catch (error) {
            await message.reply('Failed to unmute user. Make sure I have the correct permissions.');
        }
    }
}; 