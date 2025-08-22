// All JavaScript content from the original <script> tag
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

// [Include all other JS functions: requestPairingCode, copyPairingCode, previewImage, uploadSquare, uploadRectangle, showMessage, etc.]
// Ensure particle animation uses document.getElementById('particleCanvas')