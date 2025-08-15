# Agricultural Audio Assistant

An AI-powered agricultural advice system designed for Senegalese farmers. This application allows farmers to upload audio recordings of their questions and receive personalized agricultural recommendations in audio format.

## Features

- **Audio Upload**: Accepts various audio formats (WAV, MP3, M4A, OGG, FLAC)
- **Speech-to-Text**: Transcribes farmer questions using OpenAI's Whisper API
- **AI Recommendations**: Generates personalized agricultural advice using GPT-3.5-turbo
- **Text-to-Speech**: Converts recommendations back to audio for easy consumption
- **Multi-language Support**: Supports multiple languages for transcription
- **Automatic Cleanup**: Removes old files to manage disk space

## Prerequisites

- Python 3.8+
- OpenAI API key
- Node.js 16+ (for the frontend)

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd agricultural-audio-assistant
   ```

2. **Set up Python environment**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your OpenAI API key
   # Get your API key from: https://platform.openai.com/api-keys
   ```

4. **Set up the frontend (optional)**
   ```bash
   cd agricultural-audio-app
   npm install
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
HOST=127.0.0.1
PORT=8000
LOG_LEVEL=INFO
```

### API Key Setup

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file

## Usage

### Running the Backend

```bash
# From the root directory
python main.py
```

The API will be available at `http://127.0.0.1:8000`

### Running the Frontend

```bash
# From the agricultural-audio-app directory
cd agricultural-audio-app
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### POST `/recommend-from-audio`
Upload an audio file to get agricultural advice.

**Parameters:**
- `audio_file`: Audio file (WAV, MP3, M4A, OGG, FLAC)
- `language`: Language code for transcription (default: "en")

**Response:**
```json
{
  "success": true,
  "request_id": "abc123",
  "transcribed_query": "How do I prepare my soil for planting?",
  "recommendation": "Well, you know... that's a really good question about soil preparation...",
  "audio_download_url": "/download-audio/response_abc123.mp3",
  "audio_filename": "response_abc123.mp3"
}
```

### GET `/download-audio/{filename}`
Download the generated audio response.

### GET `/health`
Health check endpoint.

### GET `/`
API information and available endpoints.

## Project Structure

```
├── main.py                 # FastAPI backend server
├── requirements.txt        # Python dependencies
├── env.example            # Environment variables template
├── .gitignore             # Git ignore rules
├── uploads/               # Uploaded audio files
├── outputs/               # Generated audio responses
├── temp/                  # Temporary processing files
└── agricultural-audio-app/ # React frontend
    ├── src/
    ├── package.json
    └── ...
```

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- API keys are loaded from environment variables only
- Temporary files are automatically cleaned up after 1 hour

## Development

### Adding New Features

1. The backend uses FastAPI for easy API development
2. Audio processing is handled asynchronously
3. File cleanup runs automatically every 30 minutes
4. CORS is enabled for frontend integration

### Testing

```bash
# Test the API endpoints
python test_request.py
```

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

For issues and questions, please open an issue on GitHub.
