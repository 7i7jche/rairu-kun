import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { startDashboard } from '../dashboard/server.js';

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.commands = new Collection();

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

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Error executing command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Error executing command!', ephemeral: true });
        }
    }
});

// Ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    startDashboard(client);
});

// Load commands and login
async function startBot() {
    try {
        await loadCommands();
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error('Error starting bot:', error);
    }
}

startBot();

export { updatePrefix, loadPrefix };