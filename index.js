import express from 'express';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Set up directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
async function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = await import(filePath);
            
            if ('data' in command.default && 'execute' in command.default) {
                client.commands.set(command.default.data.name, command.default);
                console.log(`Loaded command: ${command.default.data.name}`);
            }
        }
    }
}

// Handle commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    console.log(`Received command: ${interaction.commandName}`);
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.log(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'There was an error executing this command!', 
            ephemeral: true 
        }).catch(console.error);
    }
});

// Start server and bot
async function startBot() {
    try {
        // Load commands first
        console.log('Loading commands...');
        await loadCommands();
        console.log('Commands loaded successfully');

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

// Add ready event
client.once('ready', () => {
    console.log('Bot is ready!');
    console.log(`Loaded ${client.commands.size} commands`);
});

startBot();