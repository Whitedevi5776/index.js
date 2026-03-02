const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const app = express();

app.get('/', (req, res) => {
    res.send("<h1>Pappy Session Gen</h1><p>Use /pair?num=234xxx</p>");
});

app.get('/pair', async (req, res) => {
    const num = req.query.num;
    if (!num) return res.send("Provide ?num=");
    const id = Math.random().toString(36).substring(7);
    const { state, saveCreds } = await useMultiFileAuthState('./temp_' + id);
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome')
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(num);
            res.send({ status: "success", code: code });
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (up) => {
        if (up.connection === 'open') {
            const creds = JSON.parse(fs.readFileSync('./temp_' + id + '/creds.json'));
            const sessionStr = Buffer.from(JSON.stringify(creds)).toString('base64');
            // Log this to Render console; you copy it from there or set up a redirect
            console.log("SESSION_STRING: PAPPY_SESSION;;" + sessionStr);
            fs.removeSync('./temp_' + id);
        }
    });
});

app.listen(process.env.PORT || 3000);
