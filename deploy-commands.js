import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

config();

const commands = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const foldersPath = join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = await import(`./commands/${folder}/${file}`);
        if ('data' in command.default && 'execute' in command.default) {
            commands.push(command.default.data.toJSON());
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}