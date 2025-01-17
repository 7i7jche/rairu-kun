import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

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
        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        // Validation checks
        if (!member) {
            return interaction.reply({
                content: 'This user is not in the server.',
                ephemeral: true
            });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: 'You cannot warn a member with a higher or equal role.',
                ephemeral: true
            });
        }

        try {
            // Create warning embed
            const warnEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⚠️ Warning Issued')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            // Log the warning
            const logData = {
                userId: user.id,
                moderatorId: interaction.user.id,
                reason,
                timestamp: new Date().toISOString(),
                guildId: interaction.guild.id
            };

            // Ensure logs directory exists
            const logsDir = path.join(process.cwd(), 'logs');
            await fs.mkdir(logsDir, { recursive: true });

            // Append to log file
            await fs.appendFile(
                path.join(logsDir, 'warnings.log'),
                `${JSON.stringify(logData)}\n`
            );

            // Send response
            await interaction.reply({ embeds: [warnEmbed] });

            // DM the warned user
            try {
                await user.send({
                    content: `You have been warned in ${interaction.guild.name}`,
                    embeds: [warnEmbed]
                });
            } catch (error) {
                // User might have DMs disabled
                await interaction.followUp({
                    content: 'Warning issued, but unable to DM the user.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Warning error:', error);
            await interaction.reply({
                content: 'There was an error executing this command.',
                ephemeral: true
            });
        }
    },

    async messageExecute(message, args) {
        // Similar implementation for message commands
        // ... (implement similar logic as above)
    }
};
