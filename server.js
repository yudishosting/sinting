const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const Jimp = require('jimp');
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage for Vercel
let sock = null;

let pairingCode = null;
let connectionStatus = 'disconnected';
let isWaitingForPairing = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        version,
        syncFullHistory: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            return { conversation: '' };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        isWaitingForPairing = true;
        connectionStatus = 'waiting_phone';
        console.log('🚀 Bot siap! Buka http://localhost:3001 untuk melakukan pairing');
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Koneksi terputus, mencoba reconnect...');
                connectToWhatsApp();
            } else {
                console.error('Logged out. Jalankan ulang untuk mendapatkan pairing code baru.');
            }
        } else if (connection === 'open') {
            console.log('✅ Terhubung ke WhatsApp!');
            connectionStatus = 'connected';
            isWaitingForPairing = false;
            pairingCode = null;
        }
    });
}

async function processProfilePictureRectangle(media) {
    try {
        const jimp1 = await Jimp.read(media.buffer);
        const resized = jimp1.scaleToFit(720, 720);
        return {
            img: await resized.getBufferAsync(Jimp.MIME_JPEG),
            preview: await resized.normalize().getBufferAsync(Jimp.MIME_JPEG),
        };
    } catch (error) {
        console.error('Error saat memproses gambar:', error);
        throw new Error('Gagal memproses gambar.');
    }
}

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/status', (req, res) => {
    res.json({ 
        connected: sock && sock.user ? true : false,
        status: connectionStatus,
        isWaitingForPairing: isWaitingForPairing,
        pairingCode: pairingCode
    });
});

app.post('/request-pairing', express.json(), async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
        return res.json({ success: false, message: 'Nomor telepon tidak valid' });
    }

    if (!isWaitingForPairing) {
        return res.json({ success: false, message: 'Bot sudah terhubung atau tidak memerlukan pairing' });
    }

    try {
        const code = await sock.requestPairingCode(phoneNumber);
        pairingCode = code;
        connectionStatus = 'waiting_scan';
        console.log(`📱 Pairing code generated for ${phoneNumber}: ${code}`);
        res.json({ success: true, pairingCode: code });
    } catch (err) {
        console.error('Error generating pairing code:', err);
        res.json({ success: false, message: 'Gagal mendapatkan pairing code: ' + err.message });
    }
});

app.post('/upload', upload.single('image'), async (req, res) => {
    if (!sock || !sock.user) {
        return res.json({ success: false, message: 'WhatsApp belum terhubung. Cek terminal untuk pairing code.' });
    }

    const fileBuffer = req.file?.buffer;
    if (!fileBuffer) {
        return res.json({ success: false, message: 'Gambar tidak ditemukan' });
    }

    try {
        const image = await Jimp.read(fileBuffer);
        const { width, height } = image.bitmap;
        if (width !== height) {
            const size = Math.min(width, height);
            const x = (width - size) / 2;
            const y = (height - size) / 2;
            image.crop(x, y, size, size);
        }

        const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        await sock.updateProfilePicture(sock.user.id, buffer);

        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: 'Gagal mengatur foto profil: ' + err.message });
    }
});

app.post('/setpppanjang', upload.single('image'), async (req, res) => {
    if (!sock || !sock.user) {
        return res.json({ success: false, message: 'WhatsApp belum terhubung. Cek terminal untuk pairing code.' });
    }

    const fileBuffer = req.file?.buffer;
    if (!fileBuffer) {
        return res.json({ success: false, message: 'Gambar tidak ditemukan' });
    }

    try {
        let { img } = await processProfilePictureRectangle(req.file);
        
        await sock.query({
            tag: 'iq',
            attrs: {
                to: '@s.whatsapp.net',
                type: 'set',
                xmlns: 'w:profile:picture'
            },
            content: [
                { 
                    tag: 'picture', 
                    attrs: { type: 'image' }, 
                    content: img 
                }
            ]
        });
        
        res.json({ success: true, message: 'Sukses mengatur foto profil persegi panjang!' });
    } catch (error) {
        console.error('Error saat mengupdate profile picture:', error);
        res.json({ success: false, message: 'Gagal mengupdate foto profil persegi panjang: ' + error.message });
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`🚀 Server berjalan di http://localhost:${port}`);
    console.log('📱 Buka browser dan akses alamat tersebut untuk melakukan pairing');
    connectToWhatsApp();
}).on('error', (err) => {
    console.error('Express Error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} sudah digunakan. Coba port lain atau hentikan proses di port ${port}.`);
        process.exit(1);
    }
});