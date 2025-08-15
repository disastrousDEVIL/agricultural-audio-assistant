# Agricultural Audio Assistant 🌾

An AI-powered agricultural advice system designed for Senegalese farmers. Upload audio questions and receive personalized agricultural recommendations in audio format.

## ✨ Features

- 🎤 **Audio Upload** - Supports WAV, MP3, M4A, OGG, FLAC
- 🗣️ **Speech-to-Text** - OpenAI Whisper API transcription
- 🤖 **AI Recommendations** - GPT-3.5-turbo powered advice
- 🔊 **Text-to-Speech** - Audio responses for easy consumption
- 🌍 **Multi-language** - Support for multiple languages
- 🧹 **Auto Cleanup** - Automatic file management

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- OpenAI API key
- Node.js 16+ (for frontend)

### Installation

1. **Clone & Setup**
   ```bash
   git clone https://github.com/yourusername/agricultural-audio-assistant.git
   cd agricultural-audio-assistant
   ```

2. **Python Environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   ```

3. **Configuration**
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Frontend (Optional)**
   ```bash
   cd agricultural-audio-app
   npm install
   ```

## 🏃‍♂️ Running

### Backend
```bash
python main.py
# API available at http://127.0.0.1:8000
```

### Frontend
```bash
cd agricultural-audio-app
npm run dev
# Available at http://localhost:5173
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recommend-from-audio` | POST | Upload audio for advice |
| `/download-audio/{filename}` | GET | Download response audio |
| `/health` | GET | Health check |
| `/` | GET | API info |

### Example Request
```bash
curl -X POST "http://127.0.0.1:8000/recommend-from-audio" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@question.wav"
```

## 🏗️ Project Structure

```
├── main.py                    # FastAPI backend
├── requirements.txt           # Python dependencies
├── env.example               # Environment template
├── uploads/                  # User audio files
├── outputs/                  # Generated responses
├── temp/                     # Processing files
└── agricultural-audio-app/   # React frontend
```

## 🔧 Configuration

### Environment Variables
```env
# Required
OPENAI_API_KEY=your_api_key_here

# Optional
HOST=127.0.0.1
PORT=8000
LOG_LEVEL=INFO
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use meaningful commit messages
- Test your changes before submitting
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 **Issues**: [GitHub Issues](https://github.com/yourusername/agricultural-audio-assistant/issues)
- 📖 **Documentation**: Check the API docs at `/docs` when running locally
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/agricultural-audio-assistant/discussions)

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT APIs
- FastAPI for the web framework
- React/Vite for the frontend
- Senegalese farmers for inspiration

---

⭐ **Star this repository if you find it helpful!**
