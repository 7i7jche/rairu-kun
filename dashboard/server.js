import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { updatePrefix, loadPrefix } from '../.github/index.js';

// Load environment variables
config();

// Check if required environment variables are set
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    console.error('Missing CLIENT_ID or CLIENT_SECRET in .env file');
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Add these lines to parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Session setup
app.use(session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: false
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Middleware to check authentication
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback', 
    passport.authenticate('discord', { 
        failureRedirect: '/',
        successRedirect: '/dashboard'
    })
);

app.get('/dashboard', checkAuth, (req, res) => {
    res.render('dashboard', {
        guilds: req.user.guilds,
        client: req.app.get('client')
    });
});

// Guild management route
app.get('/dashboard/guild/:guildId', checkAuth, async (req, res) => {
    try {
        const guild = req.user.guilds.find(g => g.id === req.params.guildId);
        if (!guild) {
            return res.redirect('/dashboard');
        }

        // Get current prefix for this guild
        const currentPrefix = loadPrefix(guild.id);

        res.render('guild', {
            guild: guild,
            user: req.user,
            currentPrefix: currentPrefix
        });
    } catch (error) {
        console.error('Error rendering guild page:', error);
        res.redirect('/dashboard');
    }
});

// Prefix update
app.post('/dashboard/guild/:guildId/prefix', checkAuth, async (req, res) => {
    try {
        const { prefix } = req.body;
        const guildId = req.params.guildId;

        // Debug logging
        console.log('Prefix update request:', {
            guildId,
            prefix,
            body: req.body
        });

        if (!prefix) {
            console.log('No prefix provided');
            return res.status(400).json({ success: false, error: 'Prefix is required' });
        }

        // Try to update the prefix
        await updatePrefix(guildId, prefix);
        console.log('Prefix updated successfully');
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating prefix:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Welcome message update
app.post('/dashboard/guild/:guildId/welcome', checkAuth, async (req, res) => {
    try {
        const { welcomeChannel, welcomeMessage } = req.body;
        // Add your welcome message update logic here
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating welcome settings:', error);
        res.status(500).json({ success: false });
    }
});

// Moderation settings update
app.post('/dashboard/guild/:guildId/moderation', checkAuth, async (req, res) => {
    try {
        const { automod, logActions, modLogChannel } = req.body;
        // Add your moderation settings update logic here
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating mod settings:', error);
        res.status(500).json({ success: false });
    }
});

// Auto roles update
app.post('/dashboard/guild/:guildId/autoroles', checkAuth, async (req, res) => {
    try {
        const { joinRole } = req.body;
        // Add your auto roles update logic here
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating role settings:', error);
        res.status(500).json({ success: false });
    }
});

export function startDashboard(client) {
    app.set('client', client);
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Dashboard is running on port ${PORT}`);
    });
}