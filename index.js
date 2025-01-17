import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { startDashboard } from './dashboard/server.js';
import { createLogger, format, transports } from 'winston';
import ngrok from 'ngrok';
import express from 'express';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a Map to store guild prefixes
const guildPrefixes = new Map();

// Function to load prefix
function loadPrefix(guildId) {
    try {
        const config = JSON.parse(readFileSync('./config.json', 'utf8'));
        return guildId ? guildPrefixes.get(guildId) || config.prefix : config.prefix;
    } catch (error) {
        console.error('Error loading prefix:', error);
        return '!';
    }
}

// Function to update prefix
async function updatePrefix(guildId, newPrefix) {
    guildPrefixes.set(guildId, newPrefix);
    try {
        const config = JSON.parse(readFileSync('./config.json', 'utf8'));
        config.prefix = newPrefix;
        writeFileSync('./config.json', JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving prefix:', error);
    }
}

// Create client with proper intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();

// Create logger
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
}

// Error handling
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    // Give time for logs to be written before exiting
    setTimeout(() => process.exit(1), 1000);
});

// Rate limiting map
const cooldowns = new Map();

// Async function to load commands
async function loadCommands() {
    const foldersPath = join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = await import(`./commands/${folder}/${file}`);
            if (command.default.data) {
                client.commands.set(command.default.data.name, command.default);
            }
        }
    }
}

// Message event handler
client.on('messageCreate', async message => {
    const prefix = loadPrefix(message.guild?.id);
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command || !command.messageExecute) return;

    try {
        await command.messageExecute(message, args);
    } catch (error) {
        console.error('Error executing command:', error);
        message.reply('There was an error executing this command!');
    }
});

// Interaction event handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Check cooldown
    const { cooldown = 3 } = command;
    if (cooldowns.has(`${interaction.user.id}-${command.data.name}`)) {
        const expirationTime = cooldowns.get(`${interaction.user.id}-${command.data.name}`);
        const timeLeft = (expirationTime - Date.now()) / 1000;

        if (timeLeft > 0) {
            return interaction.reply({
                content: `Please wait ${timeLeft.toFixed(1)} more seconds before using \`${command.data.name}\``,
                ephemeral: true
            });
        }
    }

    try {
        // Set cooldown
        cooldowns.set(
            `${interaction.user.id}-${command.data.name}`,
            Date.now() + cooldown * 1000
        );

        await command.execute(interaction);
        logger.info(`Command ${command.data.name} executed by ${interaction.user.tag}`);
    } catch (error) {
        logger.error(`Error executing ${command.data.name}:`, error);
        
        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'There was an error executing this command.'
            : `Error: ${error.message}`;

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: errorMessage,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        }
    } finally {
        // Clean up cooldown after execution
        setTimeout(() => cooldowns.delete(`${interaction.user.id}-${command.data.name}`), cooldown * 1000);
    }
});

// Add a ready event handler
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is now online!');
    startDashboard(client);
});

// Connect to ngrok
async function connectToNgrok() {
    try {
        const url = await ngrok.connect({
            addr: process.env.PORT || 3000,
            authtoken: process.env.NGROK_TOKEN,
            region: process.env.REGION || 'ap'
        });
        console.log('Ngrok tunnel created:', url);
    } catch (error) {
        console.error('Ngrok connection error:', error);
    }
}

// Add port configuration
const PORT = process.env.PORT || 3000;

// Start the bot and server
async function startBot() {
    try {
        await loadCommands();
        await client.login(process.env.TOKEN);
        
        // Add express server
        const app = express();
        app.get('/', (req, res) => {
            res.send('Bot is running!');
        });
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
        
        // Connect to ngrok
        const url = await ngrok.connect({
            addr: PORT,
            authtoken: process.env.NGROK_TOKEN,
            region: 'ap'  // Asia Pacific region
        });
        console.log('Ngrok tunnel created:', url);
        
    } catch (error) {
        console.error('Error starting bot:', error);
    }
}

startBot();

export { updatePrefix, loadPrefix };