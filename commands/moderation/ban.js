import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member')
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for banning'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        // Check if user is bannable
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (member) {
            if (!member.bannable) {
                return interaction.editReply('I cannot ban this user! They may have higher permissions than me.');
            }
            if (member.id === interaction.user.id) {
                return interaction.editReply('You cannot ban yourself!');
            }
        }

        try {
            await interaction.guild.members.ban(target.id, { reason });
            await interaction.editReply(`Successfully banned ${target.tag} for: ${reason}`);
        } catch (error) {
            console.error('Ban error:', error);
            await interaction.editReply('Failed to ban the member! Check my permissions and role hierarchy.');
        }
    },
    async messageExecute(message, args) {
        // Check permissions first
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('You do not have permission to ban members!');
        }

        // Get the target user efficiently
        const target = message.mentions.members.first() || 
                      (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);

        if (!target) {
            return message.reply('Please mention a user to ban or provide their ID!');
        }

        // Validation checks
        if (!target.bannable) {
            return message.reply('I cannot ban this user! They may have higher permissions than me.');
        }
        if (target.id === message.author.id) {
            return message.reply('You cannot ban yourself!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.ban({ reason });
            await message.reply(`Successfully banned ${target.user.tag} for: ${reason}`);
        } catch (error) {
            console.error('Ban error:', error);
            await message.reply('Failed to ban the member! Check my permissions and role hierarchy.');
        }
    }
}; 