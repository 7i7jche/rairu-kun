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

// Create Discord client with ALL necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildIntegrations
    ]
});

// Set up commands collection
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
    if (!interaction.isCommand()) return;
    console.log(`Received command: ${interaction.commandName}`);

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'There was an error executing this command!', 
            ephemeral: true 
        });
    }
});

// Add a ready event handler
client.once('ready', () => {
    console.log('=== Bot Ready ===');
    console.log(`Logged in as: ${client.user.tag}`);
    console.log(`In ${client.guilds.cache.size} servers`);
    console.log('================');
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
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

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Express routes
app.get('/', (req, res) => {
    const status = {
        server: 'running',
        port: PORT,
        botStatus: client.user ? 'online' : 'offline',
        botUsername: client.user?.tag || 'not logged in',
        guilds: client.guilds.cache.size
    };
    res.json(status);
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Start both the bot and the web server
async function startBot() {
    try {
        // Load commands
        await loadCommands();
        
        // Start express server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Debug token
        const token = process.env.TOKEN;
        if (!token) {
            throw new Error('Discord TOKEN is not set');
        }

        // Log token details (safely)
        console.log('Token validation:');
        console.log('- Length:', token.length);
        console.log('- Starts with:', token.substring(0, 6) + '...');
        console.log('- Ends with:', '...' + token.substring(token.length - 6));

        // Attempt login with longer timeout and retry
        console.log('Attempting to log in to Discord...');
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`Login attempt ${attempts}/${maxAttempts}`);
                await Promise.race([
                    client.login(token),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Login attempt timed out')), 60000)
                    )
                ]);
                console.log('Discord login successful!');
                break;
            } catch (error) {
                console.error(`Login attempt ${attempts} failed:`, error.message);
                if (attempts === maxAttempts) {
                    throw new Error('All login attempts failed');
                }
                // Wait 5 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

    } catch (error) {
        console.error('Startup error:', error);
        console.error('Full error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    }
}

startBot();

export { updatePrefix, loadPrefix };