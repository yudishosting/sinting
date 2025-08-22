# 📱 WhatsApp Profile Picture Setter

A modern web application to set your WhatsApp profile picture in **original rectangle format** or **traditional square format** with an elegant user interface.

## ✨ Features

- 🟩 **Rectangle Profile Picture**: Set profile pictures that maintain their original aspect ratio (no cropping!)
- 🟦 **Square Profile Picture**: Traditional square cropped profile pictures
- 🔗 **Easy Pairing**: Simple phone number pairing with generated codes
- 🌟 **Modern UI**: Beautiful animated interface with glassmorphism design
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- 🚀 **Real-time Status**: Live connection status updates
- 🎨 **Interactive Preview**: See your image before setting it as profile picture

## 🛠️ Technologies Used

- **Backend**: Node.js + Express.js
- **WhatsApp Integration**: Baileys Library
- **Image Processing**: Jimp
- **File Upload**: Multer
- **Frontend**: Vanilla JavaScript with modern CSS animations
- **UI/UX**: Glassmorphism design with particle effects

## 📦 Installation

### Prerequisites
- Node.js (version 16 or higher)
- NPM (version 8 or higher)
- A WhatsApp account

### Local Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/setpp.git

# Navigate to project directory
cd setpp

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at `http://localhost:3001`

### Development Mode
```bash
# Run with nodemon for auto-restart
npm run dev
```

## 🚀 Deployment Options

### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway project create
railway up
```

### Render
1. Connect your GitHub repository to Render
2. Use the following build settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
git push heroku main
```

### VPS/Digital Ocean
```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/yourusername/whatsapp-profile-setter.git
cd whatsapp-profile-setter
npm install

# Start with PM2
pm2 start server.js --name whatsapp-profile-setter
pm2 startup
pm2 save
```

## 📖 How to Use

1. **Start the Application**: Run `npm start` and open `http://localhost:3001`

2. **Connect WhatsApp**:
   - Enter your WhatsApp phone number (with country code, e.g., 6281234567890)
   - Click "Get Pairing Code"
   - Copy the generated pairing code

3. **Pair with WhatsApp**:
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices → Link a Device
   - Enter the pairing code from step 2

4. **Set Profile Picture**:
   - Once connected, choose your image file
   - Select either:
     - **Square Format**: Traditional cropped square (🟦)
     - **Rectangle Format**: Original aspect ratio maintained (🟩)
   - Click the respective button to update your profile picture

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# WhatsApp Configuration (optional)
WA_BROWSER_NAME=Ubuntu
WA_BROWSER_VERSION=Chrome
WA_OS_VERSION=20.0.04
```

### File Structure
```
whatsapp-profile-setter/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── README.md             # Documentation
├── .gitignore           # Git ignore rules
├── auth_info/           # WhatsApp authentication data (auto-created)
├── uploads/             # Temporary uploaded images (auto-created)
└── node_modules/        # Dependencies
```

## 📱 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main web interface |
| GET | `/status` | Connection status check |
| POST | `/request-pairing` | Request pairing code |
| POST | `/upload` | Upload square profile picture |
| POST | `/setpppanjang` | Upload rectangle profile picture |

## 🛡️ Security Features

- ✅ File type validation (images only)
- ✅ File size limits via Multer
- ✅ Automatic file cleanup after processing
- ✅ Input sanitization for phone numbers
- ✅ Error handling and user feedback
- ✅ No sensitive data in client-side code

## 🐛 Troubleshooting

### Common Issues

**Connection Issues**:
- Make sure your phone number includes country code
- Check if WhatsApp Web is already connected on other devices
- Restart the application if pairing fails

**Image Upload Issues**:
- Supported formats: JPG, JPEG, PNG, GIF
- Maximum file size depends on server configuration
- Ensure stable internet connection

**Server Issues**:
- Check if port 3001 is available
- Verify all dependencies are installed
- Check Node.js version compatibility

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm start
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ Disclaimer

This tool is for educational and personal use only. Please comply with WhatsApp's Terms of Service and use responsibly. The developers are not responsible for any misuse or violations of WhatsApp's policies.

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API library
- [Jimp](https://github.com/jimp-dev/jimp) - Image processing library
- [Express.js](https://expressjs.com/) - Web framework
- Community contributors and testers

## 📞 Support

If you encounter any issues or have questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

---

Made with ❤️ by Xyuraa | Powered by Node.js & Baileys
