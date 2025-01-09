import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for warning')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        await interaction.reply(`⚠️ **${user.tag}** has been warned!\nReason: ${reason}`);
    },

    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('You do not have permission to use this command.');
        }

        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention a user to warn.');

        const reason = args.slice(1).join(' ') || 'No reason provided';

        await message.reply(`⚠️ **${user.tag}** has been warned!\nReason: ${reason}`);
    }
}; 