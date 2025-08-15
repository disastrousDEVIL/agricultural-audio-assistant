from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from dotenv import load_dotenv
import asyncio
import aiofiles
import os
import uuid
import time
from pathlib import Path
from typing import Optional
import logging
from contextlib import asynccontextmanager
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
TEMP_DIR = Path("temp")

# Create directories
for directory in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR]:
    directory.mkdir(exist_ok=True)

# Load environment from .env if present
load_dotenv()

# OpenAI API client
api_key = os.getenv("OPENAI_API_KEY")
client: Optional[OpenAI] = None
if not api_key:
    logger.warning(
        "OPENAI_API_KEY is not set. OpenAI-dependent endpoints will fail until it's configured."
    )
else:
    client = OpenAI(api_key=api_key)

# Cleanup old files periodically
async def cleanup_old_files():
    """Remove files older than 1 hour to save disk space"""
    current_time = time.time()
    for directory in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR]:
        for file_path in directory.glob("*"):
            if file_path.is_file() and (current_time - file_path.stat().st_mtime) > 3600:
                try:
                    file_path.unlink()
                    logger.info(f"Cleaned up old file: {file_path}")
                except Exception as e:
                    logger.error(f"Error cleaning up file {file_path}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Agricultural Audio Assistant API")
    
    # Schedule periodic cleanup
    cleanup_task = asyncio.create_task(periodic_cleanup())
    
    yield
    
    # Shutdown
    cleanup_task.cancel()
    logger.info("Shutting down Agricultural Audio Assistant API")

async def periodic_cleanup():
    """Run cleanup every 30 minutes"""
    while True:
        try:
            await asyncio.sleep(1800)  # 30 minutes
            await cleanup_old_files()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")

# FastAPI app initialization
app = FastAPI(
    title="Agricultural Audio Assistant",
    description="AI-powered agricultural advice system for Senegalese farmers",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

async def transcribe_audio_async(file_path: str, language: str = "en") -> str:
    """
    Asynchronously transcribes audio using OpenAI's Whisper API.
    
    Args:
        file_path (str): Path to the audio file
        language (str): Language code (default: 'en')
    
    Returns:
        str: Transcribed text
    """
    try:
        async with aiofiles.open(file_path, "rb") as audio_file:
            audio_content = await audio_file.read()
            
        # Create a temporary file for the API call
        temp_file_path = TEMP_DIR / f"temp_audio_{uuid.uuid4().hex}.wav"
        
        async with aiofiles.open(temp_file_path, "wb") as temp_file:
            await temp_file.write(audio_content)
        
        if client is None:
            raise HTTPException(status_code=500, detail="Server misconfigured: OPENAI_API_KEY not set")

        # Transcribe using OpenAI (Whisper)
        with open(temp_file_path, "rb") as audio_file:
            transcript = await asyncio.to_thread(
                lambda: client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language
                )
            )
        
        # Clean up temp file
        temp_file_path.unlink(missing_ok=True)
        
        return transcript.text
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

async def query_llama_async(prompt: str) -> str:
    """
    Asynchronously query LLaMA model (placeholder - replace with your actual implementation)
    
    Args:
        prompt (str): The prompt to send to the model
    
    Returns:
        str: Model response
    """
    try:
        # Replace this with your actual LLaMA implementation
        # For now, using OpenAI as a placeholder
        if client is None:
            raise HTTPException(status_code=500, detail="Server misconfigured: OPENAI_API_KEY not set")

        response = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.7
            )
        )
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Error querying LLaMA: {e}")
        raise HTTPException(status_code=500, detail=f"LLaMA query failed: {str(e)}")

async def text_to_speech_async(text: str, output_file: str) -> str:
    """
    Asynchronously convert text to speech using OpenAI's TTS API.
    
    Args:
        text (str): Text to convert
        output_file (str): Output file path
    
    Returns:
        str: Path to the generated audio file
    """
    try:
        if client is None:
            raise HTTPException(status_code=500, detail="Server misconfigured: OPENAI_API_KEY not set")

        response = await asyncio.to_thread(
            lambda: client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice="alloy",
                input=text
            )
        )
        
        async with aiofiles.open(output_file, "wb") as f:
            await f.write(response.content)
        
        return output_file
        
    except Exception as e:
        logger.error(f"Error in text-to-speech: {e}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")

def create_human_like_prompt(query: str) -> str:
    """
    Create a more human-like prompt with natural speech patterns
    """
    return f"""Act as a friendly, experienced agricultural trainer who has been working with Senegalese farmers for many years. 

The farmer asked: '{query}'

Respond as if you're having a natural conversation with them. Include:
- Natural speech patterns with occasional "umm", "well", "you know"
- Brief pauses indicated by "..." where appropriate
- Warm, encouraging tone
- Practical, actionable advice
- Local context when relevant
- Simple, clear language

Keep your response conversational and under 200 words. Make it sound like you're actually speaking to them in person.

Example style: "Well, you know... that's a really good question about soil preparation. Umm... let me tell you what I've seen work well for many farmers in your area..."

Your response:"""

@app.post("/recommend-from-audio")
async def recommend_from_audio(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    language: str = "en"
):
    """
    Process uploaded audio file and return agricultural recommendation
    
    Args:
        audio_file: Uploaded audio file (WAV, MP3, etc.)
        language: Language code for transcription (default: 'en')
    
    Returns:
        JSON response with transcription, recommendation, and download link
    """
    if not audio_file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Validate file type
    allowed_extensions = {'.wav', '.mp3', '.m4a', '.ogg', '.flac'}
    file_extension = Path(audio_file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique IDs for this request
    request_id = uuid.uuid4().hex
    
    try:
        # Save uploaded file
        upload_path = UPLOAD_DIR / f"{request_id}_{audio_file.filename}"
        async with aiofiles.open(upload_path, "wb") as f:
            content = await audio_file.read()
            await f.write(content)
        
        logger.info(f"Processing audio file: {upload_path}")
        
        # Step 1: Transcribe audio
        transcribed_query = await transcribe_audio_async(str(upload_path), language)
        logger.info(f"Transcribed query: {transcribed_query}")
        
        # Step 2: Generate human-like recommendation
        human_prompt = create_human_like_prompt(transcribed_query)
        recommendation = await query_llama_async(human_prompt)
        logger.info(f"Generated recommendation: {recommendation[:100]}...")
        
        # Step 3: Convert to speech
        output_filename = f"response_{request_id}.mp3"
        output_path = OUTPUT_DIR / output_filename
        await text_to_speech_async(recommendation, str(output_path))
        
        # Schedule cleanup of upload file
        background_tasks.add_task(lambda: upload_path.unlink(missing_ok=True))
        
        # Generate download URL
        download_url = f"/download-audio/{output_filename}"
        
        logger.info(f"Successfully processed request {request_id}")
        
        return JSONResponse({
            "success": True,
            "request_id": request_id,
            "transcribed_query": transcribed_query,
            "recommendation": recommendation,
            "audio_download_url": download_url,
            "audio_filename": output_filename
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/download-audio/{filename}")
async def download_audio(filename: str):
    """
    Download generated audio file
    
    Args:
        filename: Name of the audio file to download
    
    Returns:
        Audio file as download
    """
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        path=str(file_path),
        media_type="audio/mpeg",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Agricultural Audio Assistant API",
        "version": "1.0.0",
        "endpoints": {
            "POST /recommend-from-audio": "Upload audio for agricultural advice",
            "GET /download-audio/{filename}": "Download generated audio response",
            "GET /health": "Health check"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

    # Run with optimized settings
    # uvicorn.run(
    #     "main:app",
    #     host="0.0.0.0",
    #     port=8000,
    #     reload=False,  # Disable in production
    #     workers=1,     # Adjust based on your server capacity
      
    #     http="httptools",  # Use faster HTTP parser
    #     log_level="info"
    # )
