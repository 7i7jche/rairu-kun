import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for kicking'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        // Check if user is kickable
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
            return interaction.editReply('User not found in this server!');
        }
        if (!member.kickable) {
            return interaction.editReply('I cannot kick this user! They may have higher permissions than me.');
        }
        if (member.id === interaction.user.id) {
            return interaction.editReply('You cannot kick yourself!');
        }

        try {
            await member.kick(reason);
            await interaction.editReply(`Successfully kicked ${target.tag} for: ${reason}`);
        } catch (error) {
            console.error('Kick error:', error);
            await interaction.editReply('Failed to kick the member! Check my permissions and role hierarchy.');
        }
    },
    async messageExecute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('You do not have permission to kick members!');
        }

        const target = message.mentions.members.first() || 
                      (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);

        if (!target) {
            return message.reply('Please mention a user to kick or provide their ID!');
        }

        if (!target.kickable) {
            return message.reply('I cannot kick this user! They may have higher permissions than me.');
        }
        if (target.id === message.author.id) {
            return message.reply('You cannot kick yourself!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.kick(reason);
            await message.reply(`Successfully kicked ${target.user.tag} for: ${reason}`);
        } catch (error) {
            console.error('Kick error:', error);
            await message.reply('Failed to kick the member! Check my permissions and role hierarchy.');
        }
    }
}; 