import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic Discord client setup
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Express route
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Start server and bot
async function startBot() {
    try {
        // Start express
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Start Discord bot
        console.log('Starting Discord bot...');
        await client.login(process.env.TOKEN);
        console.log(`Bot logged in as ${client.user.tag}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

startBot();