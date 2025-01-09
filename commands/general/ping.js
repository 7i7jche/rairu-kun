import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Shows bot latency'),
    async execute(interaction) {
        const wsLatency = interaction.client.ws.ping;
        const sent = await interaction.reply({ 
            content: 'Pinging...', 
            fetchReply: true 
        });
        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(getLatencyColor(apiLatency))
            .addFields(
                { name: 'Bot Latency', value: `${apiLatency}ms`, inline: true },
                { name: 'WebSocket Latency', value: `${wsLatency}ms`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    },
    async messageExecute(message) {
        const wsLatency = message.client.ws.ping;
        const sent = await message.reply('Pinging...');
        const apiLatency = sent.createdTimestamp - message.createdTimestamp;

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(getLatencyColor(apiLatency))
            .addFields(
                { name: 'Bot Latency', value: `${apiLatency}ms`, inline: true },
                { name: 'WebSocket Latency', value: `${wsLatency}ms`, inline: true }
            )
            .setTimestamp();

        await sent.edit({ content: null, embeds: [embed] });
    }
};

function getLatencyColor(latency) {
    if (latency < 100) return '#00ff00'; // Green
    if (latency < 200) return '#ffff00'; // Yellow
    return '#ff0000'; // Red
} 