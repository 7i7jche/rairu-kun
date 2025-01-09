import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);

        try {
            await member.timeout(duration * 60 * 1000, reason);
            await interaction.reply(`🔇 **${user.tag}** has been muted for ${duration} minutes!\nReason: ${reason}`);
        } catch (error) {
            await interaction.reply('Failed to mute user. Make sure I have the correct permissions.');
        }
    },

    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('You do not have permission to use this command.');
        }

        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention a user to mute.');

        const duration = parseInt(args[1]);
        if (!duration || isNaN(duration)) {
            return message.reply('Please provide a valid duration in minutes.');
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';
        const member = message.guild.members.cache.get(user.id);

        try {
            await member.timeout(duration * 60 * 1000, reason);
            await message.reply(`🔇 **${user.tag}** has been muted for ${duration} minutes!\nReason: ${reason}`);
        } catch (error) {
            await message.reply('Failed to mute user. Make sure I have the correct permissions.');
        }
    }
}; 