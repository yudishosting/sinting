const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const Jimp = require('jimp');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const app = express();
const upload = multer({ dest: 'uploads/' });
let sock = null;

// Global variables untuk pairing
let pairingCode = null;
let connectionStatus = 'disconnected';
let isWaitingForPairing = false;

// Fungsi untuk connect ke WhatsApp
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

// Fungsi untuk memproses foto profil persegi panjang (tetap bentuk asli)
async function processProfilePictureRectangle(media) {
    try {
        const jimp1 = await Jimp.read(media);
        // Tidak crop, hanya resize dengan mempertahankan aspek rasio
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

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve HTML utama
app.get('/', (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Profile Picture Setter</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f23, #1a1a2e, #16213e, #0f3460);
            background-size: 400% 400%;
            animation: gradientShift 8s ease infinite;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-x: hidden;
        }

        .container {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 25px;
            box-shadow: 
                0 25px 50px rgba(0,0,0,0.3),
                0 0 0 1px rgba(255,255,255,0.05),
                inset 0 1px 0 rgba(255,255,255,0.1);
            max-width: 500px;
            width: 100%;
            position: relative;
            animation: containerFloat 6s ease-in-out infinite;
        }

        .container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #25D366, #128C7E, #075E54, #25D366);
            background-size: 300% 300%;
            animation: borderGlow 4s linear infinite;
            border-radius: 27px;
            z-index: -1;
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        @keyframes containerFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(0.5deg); }
        }

        @keyframes borderGlow {
            0% { background-position: 0% 50%; opacity: 0.8; }
            50% { background-position: 100% 50%; opacity: 1; }
            100% { background-position: 0% 50%; opacity: 0.8; }
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            animation: headerPulse 2s ease-in-out infinite alternate;
        }

        .header h1 {
            color: #ffffff;
            font-size: 32px;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #25D366, #128C7E, #ffffff);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: textGlow 3s ease-in-out infinite;
            text-shadow: 0 0 30px rgba(37, 211, 102, 0.5);
        }

        .header p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 16px;
            animation: fadeInUp 1s ease-out 0.5s both;
        }

        @keyframes headerPulse {
            0% { transform: scale(1); }
            100% { transform: scale(1.02); }
        }

        @keyframes textGlow {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .status-indicator {
            display: inline-block;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
            animation: statusBounce 2s ease-in-out infinite;
        }

        .status-connected {
            background: linear-gradient(45deg, rgba(37, 211, 102, 0.2), rgba(18, 140, 126, 0.2));
            color: #25D366;
            border: 1px solid rgba(37, 211, 102, 0.3);
            box-shadow: 0 0 20px rgba(37, 211, 102, 0.3);
        }

        .status-connected::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: shimmer 2s infinite;
        }

        .status-disconnected {
            background: linear-gradient(45deg, rgba(211, 47, 47, 0.2), rgba(244, 67, 54, 0.2));
            color: #ff4444;
            border: 1px solid rgba(211, 47, 47, 0.3);
            box-shadow: 0 0 20px rgba(211, 47, 47, 0.3);
        }

        @keyframes statusBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        .upload-section {
            margin-bottom: 30px;
            animation: sectionSlideIn 0.8s ease-out;
            transform-origin: center;
        }

        .upload-section:nth-child(even) {
            animation-delay: 0.2s;
        }

        .upload-section h3 {
            color: #ffffff;
            margin-bottom: 15px;
            font-size: 20px;
            background: linear-gradient(45deg, #25D366, #128C7E);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: textShine 3s ease-in-out infinite;
        }

        @keyframes sectionSlideIn {
            from { opacity: 0; transform: translateX(-50px) rotateY(-10deg); }
            to { opacity: 1; transform: translateX(0) rotateY(0deg); }
        }

        @keyframes textShine {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }

        .file-input-wrapper {
            position: relative;
            display: inline-block;
            width: 100%;
            margin-bottom: 15px;
            perspective: 1000px;
        }

        .file-input {
            position: absolute;
            opacity: 0;
            width: 100%;
            height: 100%;
            cursor: pointer;
            z-index: 2;
        }

        .file-input-button {
            display: block;
            width: 100%;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 2px dashed rgba(37, 211, 102, 0.5);
            border-radius: 15px;
            text-align: center;
            color: rgba(255, 255, 255, 0.8);
            font-size: 16px;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .file-input-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(37, 211, 102, 0.1), transparent);
            transition: left 0.5s ease;
        }

        .file-input-button:hover {
            background: rgba(37, 211, 102, 0.1);
            border-color: #25D366;
            color: #25D366;
            transform: translateY(-3px) rotateX(5deg);
            box-shadow: 0 15px 35px rgba(37, 211, 102, 0.3);
        }

        .file-input-button:hover::before {
            left: 100%;
        }

        .upload-btn {
            width: 100%;
            padding: 18px;
            background: linear-gradient(45deg, #25D366, #128C7E, #075E54);
            background-size: 200% 200%;
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3);
            animation: buttonPulse 3s ease-in-out infinite;
        }

        .upload-btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.5s ease;
        }

        .upload-btn:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 15px 40px rgba(37, 211, 102, 0.4);
            background-position: 100% 50%;
        }

        .upload-btn:hover::before {
            width: 300px;
            height: 300px;
        }

        .upload-btn:active {
            transform: translateY(-2px) scale(0.98);
        }

        .upload-btn:disabled {
            background: rgba(255, 255, 255, 0.1);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
            animation: none;
        }

        @keyframes buttonPulse {
            0%, 100% { box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3); }
            50% { box-shadow: 0 12px 35px rgba(37, 211, 102, 0.5); }
        }

        .preview {
            margin-top: 15px;
            text-align: center;
            animation: previewFadeIn 0.5s ease-out;
        }

        .preview img {
            max-width: 200px;
            max-height: 200px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.3);
            border: 2px solid rgba(37, 211, 102, 0.3);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            animation: imageGlow 2s ease-in-out infinite alternate;
        }

        .preview img:hover {
            transform: scale(1.05) rotateY(5deg);
            box-shadow: 0 20px 50px rgba(37, 211, 102, 0.4);
        }

        @keyframes previewFadeIn {
            from { opacity: 0; transform: scale(0.8) rotateY(-15deg); }
            to { opacity: 1; transform: scale(1) rotateY(0deg); }
        }

        @keyframes imageGlow {
            0% { box-shadow: 0 15px 35px rgba(0,0,0,0.3), 0 0 20px rgba(37, 211, 102, 0.2); }
            100% { box-shadow: 0 15px 35px rgba(0,0,0,0.3), 0 0 30px rgba(37, 211, 102, 0.4); }
        }

        .message {
            padding: 15px;
            border-radius: 15px;
            margin-top: 15px;
            font-weight: bold;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: messageSlideIn 0.5s ease-out;
        }

        .success {
            background: rgba(37, 211, 102, 0.1);
            color: #25D366;
            box-shadow: 0 0 20px rgba(37, 211, 102, 0.2);
            animation: successPulse 1s ease-in-out;
        }

        .error {
            background: rgba(244, 67, 54, 0.1);
            color: #ff4444;
            box-shadow: 0 0 20px rgba(244, 67, 54, 0.2);
            animation: errorShake 0.5s ease-in-out;
        }

        @keyframes messageSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        @keyframes errorShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        .divider {
            height: 3px;
            background: linear-gradient(90deg, #25D366, #128C7E, #075E54, #128C7E, #25D366);
            background-size: 300% 300%;
            margin: 30px 0;
            border-radius: 2px;
            animation: dividerFlow 4s linear infinite;
            position: relative;
            overflow: hidden;
        }

        .divider::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: dividerShine 2s infinite;
        }

        @keyframes dividerFlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 300% 50%; }
        }

        @keyframes dividerShine {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        .info-box {
            background: rgba(37, 211, 102, 0.05);
            backdrop-filter: blur(15px);
            border-left: 4px solid #25D366;
            border: 1px solid rgba(37, 211, 102, 0.2);
            padding: 20px;
            margin: 20px 0;
            border-radius: 15px;
            position: relative;
            overflow: hidden;
            animation: infoBoxFloat 4s ease-in-out infinite;
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.1);
        }

        .info-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, #25D366, #128C7E, #25D366);
            background-size: 200% 200%;
            animation: infoBoxGlow 3s linear infinite;
        }

        .info-box h4 {
            color: #25D366;
            margin-bottom: 10px;
            font-size: 18px;
            animation: infoTitlePulse 2s ease-in-out infinite;
        }

        .info-box p {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            line-height: 1.6;
        }

        @keyframes infoBoxFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }

        @keyframes infoBoxGlow {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }

        @keyframes infoTitlePulse {
            0%, 100% { text-shadow: 0 0 10px rgba(37, 211, 102, 0.5); }
            50% { text-shadow: 0 0 20px rgba(37, 211, 102, 0.8); }
        }

        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
            animation: loadingBounce 1s ease-in-out infinite;
        }

        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid #25D366;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spinGlow 1s linear infinite;
            margin: 0 auto 15px;
            position: relative;
        }

        .spinner::before {
            content: '';
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border-radius: 50%;
            border: 4px solid transparent;
            border-top: 4px solid rgba(37, 211, 102, 0.3);
            animation: spinGlow 2s linear infinite reverse;
        }

        .loading p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 16px;
            animation: loadingText 2s ease-in-out infinite;
        }

        @keyframes spinGlow {
            0% { 
                transform: rotate(0deg);
                box-shadow: 0 0 10px rgba(37, 211, 102, 0.3);
            }
            50% {
                box-shadow: 0 0 30px rgba(37, 211, 102, 0.6);
            }
            100% { 
                transform: rotate(360deg);
                box-shadow: 0 0 10px rgba(37, 211, 102, 0.3);
            }
        }

        @keyframes loadingBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        @keyframes loadingText {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }

        /* Pairing Styles */
        .pairing-section {
            animation: pairingSlideIn 0.8s ease-out;
        }

        .pairing-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(37, 211, 102, 0.2);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .pairing-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #25D366, #128C7E, #25D366);
            animation: pairingGlow 3s linear infinite;
        }

        .pairing-card h3 {
            color: #ffffff;
            margin-bottom: 15px;
            font-size: 24px;
            background: linear-gradient(45deg, #25D366, #128C7E);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .pairing-card p {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 25px;
            line-height: 1.5;
        }

        .phone-input-wrapper {
            margin-bottom: 20px;
        }

        .phone-input {
            width: 100%;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(37, 211, 102, 0.3);
            border-radius: 15px;
            color: white;
            font-size: 16px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            text-align: center;
        }

        .phone-input:focus {
            outline: none;
            border-color: #25D366;
            box-shadow: 0 0 20px rgba(37, 211, 102, 0.3);
        }

        .phone-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }

        .pairing-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, #25D366, #128C7E);
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.4s ease;
            animation: pairingBtnPulse 2s ease-in-out infinite;
        }

        .pairing-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(37, 211, 102, 0.4);
        }

        .pairing-code-display {
            margin-top: 25px;
            padding: 20px;
            background: rgba(37, 211, 102, 0.1);
            border-radius: 15px;
            border: 1px solid rgba(37, 211, 102, 0.3);
            animation: codeDisplayFadeIn 0.8s ease-out;
        }

        .pairing-code-display h4 {
            color: #25D366;
            margin-bottom: 15px;
            font-size: 20px;
        }

        .pairing-code {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
            background: rgba(37, 211, 102, 0.2);
            padding: 15px 25px;
            border-radius: 10px;
            margin: 15px 0;
            letter-spacing: 3px;
            animation: codeGlow 2s ease-in-out infinite;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .pairing-code:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.3);
        }

        .pairing-instruction {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            line-height: 1.6;
            margin-top: 15px;
        }

        @keyframes pairingSlideIn {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pairingGlow {
            0%, 100% { left: -100%; }
            50% { left: 100%; }
        }

        @keyframes pairingBtnPulse {
            0%, 100% { box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3); }
            50% { box-shadow: 0 12px 35px rgba(37, 211, 102, 0.5); }
        }

        @keyframes codeDisplayFadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        @keyframes codeGlow {
            0%, 100% { 
                text-shadow: 0 0 10px rgba(37, 211, 102, 0.5);
                box-shadow: 0 0 20px rgba(37, 211, 102, 0.2);
            }
            50% { 
                text-shadow: 0 0 20px rgba(37, 211, 102, 0.8);
                box-shadow: 0 0 30px rgba(37, 211, 102, 0.4);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 WhatsApp Profile Setter</h1>
            <p>Atur foto profil WhatsApp dengan mudah</p>
            <div id="connectionStatus" class="status-indicator status-disconnected">
                🔴 Tidak Terhubung
            </div>
        </div>

        <!-- Pairing Section -->
        <div id="pairingSection" class="pairing-section" style="display: none;">
            <div class="pairing-card">
                <h3>🔗 Hubungkan WhatsApp</h3>
                <p>Masukkan nomor WhatsApp Anda untuk mendapatkan pairing code</p>
                
                <div class="phone-input-wrapper">
                    <input type="text" id="phoneInput" placeholder="6281234567890" class="phone-input">
                    <button onclick="requestPairingCode()" class="pairing-btn" id="pairingBtn">
                        Dapatkan Kode Pairing
                    </button>
                </div>
                
                <div id="pairingCodeDisplay" class="pairing-code-display" style="display: none;">
                    <h4>🎁 Pairing Code Anda:</h4>
                    <div class="pairing-code" id="pairingCodeValue" onclick="copyPairingCode()"></div>
                    <p class="pairing-instruction">
                        1. Buka WhatsApp di HP Anda<br>
                        2. Pilih <strong>Tautkan Perangkat</strong><br>
                        3. Masukkan kode di atas<br>
                        <small>(Klik kode untuk menyalin)</small>
                    </p>
                </div>
                
                <div id="pairingMessage"></div>
            </div>
        </div>

        <!-- Main Content -->
        <div id="mainContent" style="display: none;">
            <div class="info-box">
                <h4>🚀 Fitur Baru: Foto Profil Persegi Panjang!</h4>
                <p>Sekarang Anda bisa mengatur foto profil WhatsApp yang tetap berbentuk persegi panjang (tidak dipotong jadi kotak). Pilih gambar dan klik tombol yang sesuai.</p>
            </div>

            <!-- Upload Foto Profil Biasa (Kotak) -->
            <div class="upload-section">
                <h3>🟦 Foto Profil Kotak (Normal)</h3>
                <div class="file-input-wrapper">
                    <input type="file" id="squareImage" class="file-input" accept="image/*">
                    <label for="squareImage" class="file-input-button">
                        📁 Pilih Gambar (akan dipotong jadi kotak)
                    </label>
                </div>
                <button onclick="uploadSquare()" class="upload-btn" id="squareBtn">
                    🟦 Set Foto Profil Kotak
                </button>
                <div id="squarePreview" class="preview"></div>
                <div id="squareMessage"></div>
            </div>

            <div class="divider"></div>

            <!-- Upload Foto Profil Persegi Panjang -->
            <div class="upload-section">
                <h3>🟩 Foto Profil Persegi Panjang (Baru!)</h3>
                <div class="file-input-wrapper">
                    <input type="file" id="rectangleImage" class="file-input" accept="image/*">
                    <label for="rectangleImage" class="file-input-button">
                        📁 Pilih Gambar (tetap bentuk asli)
                    </label>
                </div>
                <button onclick="uploadRectangle()" class="upload-btn" id="rectangleBtn">
                    🟩 Set Foto Profil Persegi Panjang
                </button>
                <div id="rectanglePreview" class="preview"></div>
                <div id="rectangleMessage"></div>
            </div>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Sedang memproses...</p>
            </div>
        </div>
    </div>

    <script>
        // Cek status koneksi
        async function checkStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();
                const statusEl = document.getElementById('connectionStatus');
                const pairingSection = document.getElementById('pairingSection');
                const mainContent = document.getElementById('mainContent');
                
                if (data.connected) {
                    statusEl.textContent = '🟢 Terhubung ke WhatsApp';
                    statusEl.className = 'status-indicator status-connected';
                    pairingSection.style.display = 'none';
                    mainContent.style.display = 'block';
                } else if (data.isWaitingForPairing) {
                    statusEl.textContent = '🟡 Menunggu Pairing';
                    statusEl.className = 'status-indicator status-disconnected';
                    pairingSection.style.display = 'block';
                    mainContent.style.display = 'none';
                    
                    if (data.pairingCode) {
                        document.getElementById('pairingCodeValue').textContent = data.pairingCode;
                        document.getElementById('pairingCodeDisplay').style.display = 'block';
                    }
                } else {
                    statusEl.textContent = '🔴 Tidak Terhubung';
                    statusEl.className = 'status-indicator status-disconnected';
                    pairingSection.style.display = 'block';
                    mainContent.style.display = 'none';
                }
            } catch (error) {
                console.error('Error checking status:', error);
            }
        }

        // Request pairing code
        async function requestPairingCode() {
            const phoneInput = document.getElementById('phoneInput');
            const messageEl = document.getElementById('pairingMessage');
            const phoneNumber = phoneInput.value.trim();

            if (!phoneNumber) {
                showMessage(messageEl, 'Masukkan nomor WhatsApp terlebih dahulu!', 'error');
                return;
            }

            if (!/^\\d+$/.test(phoneNumber)) {
                showMessage(messageEl, 'Nomor telepon hanya boleh berisi angka!', 'error');
                return;
            }

            try {
                const response = await fetch('/request-pairing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber })
                });

                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('pairingCodeValue').textContent = result.pairingCode;
                    document.getElementById('pairingCodeDisplay').style.display = 'block';
                    showMessage(messageEl, '✅ Pairing code berhasil dibuat!', 'success');
                    
                    // Copy to clipboard
                    navigator.clipboard.writeText(result.pairingCode).then(() => {
                        showMessage(messageEl, '✅ Kode pairing disalin ke clipboard!', 'success');
                    });
                } else {
                    showMessage(messageEl, '❌ ' + result.message, 'error');
                }
            } catch (error) {
                showMessage(messageEl, '❌ Terjadi kesalahan: ' + error.message, 'error');
            }
        }

        // Copy pairing code when clicked
        function copyPairingCode() {
            const codeEl = document.getElementById('pairingCodeValue');
            const code = codeEl.textContent;
            
            navigator.clipboard.writeText(code).then(() => {
                const messageEl = document.getElementById('pairingMessage');
                showMessage(messageEl, '📋 Kode disalin ke clipboard!', 'success');
            });
        }

        // Preview gambar
        function previewImage(input, previewId) {
            const file = input.files[0];
            const preview = document.getElementById(previewId);
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
                };
                reader.readAsDataURL(file);
            }
        }

        // Upload foto profil kotak
        async function uploadSquare() {
            const fileInput = document.getElementById('squareImage');
            const messageEl = document.getElementById('squareMessage');
            const loadingEl = document.getElementById('loading');
            
            if (!fileInput.files[0]) {
                showMessage(messageEl, 'Pilih gambar terlebih dahulu!', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);

            try {
                loadingEl.style.display = 'block';
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    showMessage(messageEl, '✅ Foto profil kotak berhasil diatur!', 'success');
                } else {
                    showMessage(messageEl, '❌ ' + result.message, 'error');
                }
            } catch (error) {
                showMessage(messageEl, '❌ Terjadi kesalahan: ' + error.message, 'error');
            } finally {
                loadingEl.style.display = 'none';
            }
        }

        // Upload foto profil persegi panjang
        async function uploadRectangle() {
            const fileInput = document.getElementById('rectangleImage');
            const messageEl = document.getElementById('rectangleMessage');
            const loadingEl = document.getElementById('loading');
            
            if (!fileInput.files[0]) {
                showMessage(messageEl, 'Pilih gambar terlebih dahulu!', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);

            try {
                loadingEl.style.display = 'block';
                const response = await fetch('/setpppanjang', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    showMessage(messageEl, '✅ Foto profil persegi panjang berhasil diatur!', 'success');
                } else {
                    showMessage(messageEl, '❌ ' + result.message, 'error');
                }
            } catch (error) {
                showMessage(messageEl, '❌ Terjadi kesalahan: ' + error.message, 'error');
            } finally {
                loadingEl.style.display = 'none';
            }
        }

        // Tampilkan pesan
        function showMessage(element, message, type) {
            element.innerHTML = '<div class="message ' + type + '">' + message + '</div>';
            setTimeout(() => {
                element.innerHTML = '';
            }, 5000);
        }

        // Event listeners untuk preview
        document.addEventListener('DOMContentLoaded', function() {
            // Add event listeners for file inputs
            const squareImage = document.getElementById('squareImage');
            const rectangleImage = document.getElementById('rectangleImage');
            
            if (squareImage) {
                squareImage.addEventListener('change', function() {
                    previewImage(this, 'squarePreview');
                });
            }

            if (rectangleImage) {
                rectangleImage.addEventListener('change', function() {
                    previewImage(this, 'rectanglePreview');
                });
            }

            // Allow enter key on phone input
            const phoneInput = document.getElementById('phoneInput');
            if (phoneInput) {
                phoneInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        requestPairingCode();
                    }
                });
            }
        });

        // Cek status setiap 5 detik
        checkStatus();
        setInterval(checkStatus, 5000);

        // Efek partikel background
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-10';
        canvas.style.pointerEvents = 'none';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 0.5;
                this.opacity = Math.random() * 0.5 + 0.2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(37, 211, 102, ' + this.opacity + ')';
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });
            
            requestAnimationFrame(animate);
        }

        // Initialize particles
        resizeCanvas();
        initParticles();
        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });
    </script>
</body>
</html>
    `;
    res.send(htmlContent);
});

// Endpoint untuk cek status koneksi
app.get('/status', (req, res) => {
    res.json({ 
        connected: sock && sock.user ? true : false,
        status: connectionStatus,
        isWaitingForPairing: isWaitingForPairing,
        pairingCode: pairingCode
    });
});

// Endpoint untuk request pairing code
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

// Endpoint untuk upload gambar kotak (existing)
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!sock || !sock.user) {
        return res.json({ success: false, message: 'WhatsApp belum terhubung. Cek terminal untuk pairing code.' });
    }

    const filePath = req.file?.path;
    if (!filePath) {
        return res.json({ success: false, message: 'Gambar tidak ditemukan' });
    }

    try {
        const image = await Jimp.read(filePath);
        const { width, height } = image.bitmap;
        if (width !== height) {
            const size = Math.min(width, height);
            const x = (width - size) / 2;
            const y = (height - size) / 2;
            image.crop(x, y, size, size);
        }

        const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        await sock.updateProfilePicture(sock.user.id, buffer);

        fs.unlinkSync(filePath);
        res.json({ success: true });
    } catch (err) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ success: false, message: 'Gagal mengatur foto profil: ' + err.message });
    }
});

// Endpoint untuk setpppanjang (foto profil persegi panjang - tetap bentuk asli)
app.post('/setpppanjang', upload.single('image'), async (req, res) => {
    if (!sock || !sock.user) {
        return res.json({ success: false, message: 'WhatsApp belum terhubung. Cek terminal untuk pairing code.' });
    }

    const filePath = req.file?.path;
    if (!filePath) {
        return res.json({ success: false, message: 'Gambar tidak ditemukan' });
    }

    try {
        let { img } = await processProfilePictureRectangle(filePath);
        
        // Menggunakan query WhatsApp langsung untuk set foto profil persegi panjang
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
        
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Sukses mengatur foto profil persegi panjang!' });
    } catch (error) {
        console.error('Error saat mengupdate profile picture:', error);
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({ success: false, message: 'Gagal mengupdate foto profil persegi panjang: ' + error.message });
    }
});

// Start server
app.listen(3001, () => {
    console.log('🚀 Server berjalan di http://localhost:3001');
    console.log('📱 Buka browser dan akses alamat tersebut untuk melakukan pairing');
    connectToWhatsApp();
}).on('error', (err) => {
    console.error('Express Error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error('Port 3001 sudah digunakan. Coba port lain atau hentikan proses di port 3001.');
        process.exit(1);
    }
});
