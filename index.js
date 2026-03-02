const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs-extra');
const app = express();

const TG_TOKEN = '8647913571:AAFd5jFINXWIQOdH1qhvfxxmIRn5kzg4j0Q';
const OWNER_ID = '8380969639';

app.get('/pair', async (req, res) => {
    const num = req.query.num;
    const { state, saveCreds } = await useMultiFileAuthState('./temp_auth');
    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu('Chrome'),
        logger: require('pino')({ level: 'silent' })
    });

    if (!state.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(num);
            // Send code to your Telegram automatically
            await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                chat_id: OWNER_ID,
                text: `🔢 Your Pairing Code: ${code}`
            });
            res.send("Code sent to Telegram!");
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (up) => {
        if (up.connection === 'open') {
            const creds = JSON.parse(fs.readFileSync('./temp_auth/creds.json'));
            const sessionStr = Buffer.from(JSON.stringify(creds)).toString('base64');
            
            // Send the final Session String to your Telegram
            await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                chat_id: OWNER_ID,
                text: `📦 *SESSION GENERATED!*\n\nCopy this to VPS:\n\n/login PAPPY_SESSION;;${sessionStr}`,
                parse_mode: 'Markdown'
            });
            process.exit(0); // Kill process after success to save Render resources
        }
    });
});

app.listen(process.env.PORT || 3000);
