import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
config();

const rest = new REST().setToken(process.env.TOKEN);

// Clear all commands using ES modules
const clearCommands = async () => {
    try {
        console.log('Started clearing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );

        console.log('Successfully cleared application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

clearCommands();
