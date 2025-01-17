import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a member by their ID')
        .addStringOption(option => 
            option.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.options.getString('user_id');

        // Validate user ID
        if (!/^\d{17,19}$/.test(userId)) {
            return interaction.editReply('Please provide a valid user ID!');
        }

        try {
            // Check if user is banned
            const banList = await interaction.guild.bans.fetch();
            if (!banList.has(userId)) {
                return interaction.editReply('This user is not banned!');
            }

            await interaction.guild.members.unban(userId);
            await interaction.editReply(`Successfully unbanned the user with ID: ${userId}`);
        } catch (error) {
            console.error('Unban error:', error);
            await interaction.editReply('Failed to unban the member! Check my permissions and role hierarchy.');
        }
    },
    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('You do not have permission to unban members!');
        }

        const userId = args[0];
        if (!userId) {
            return message.reply('Please provide the ID of the user to unban!');
        }

        // Validate user ID
        if (!/^\d{17,19}$/.test(userId)) {
            return message.reply('Please provide a valid user ID!');
        }

        try {
            // Check if user is banned
            const banList = await message.guild.bans.fetch();
            if (!banList.has(userId)) {
                return message.reply('This user is not banned!');
            }

            await message.guild.members.unban(userId);
            await message.reply(`Successfully unbanned the user with ID: ${userId}`);
        } catch (error) {
            console.error('Unban error:', error);
            await message.reply('Failed to unban the member! Check my permissions and role hierarchy.');
        }
    }
};
