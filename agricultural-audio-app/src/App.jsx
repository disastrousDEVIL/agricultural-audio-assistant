import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, Play, Pause, Download, Loader2, Volume2, FileAudio, Sparkles, Leaf } from 'lucide-react';

const AgriculturalAudioApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  // Audio conversion utility function
const convertWebMToWAV = async (webmBlob) => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const fileReader = new FileReader();
    
    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Convert to WAV
        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        
        resolve(wavBlob);
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(webmBlob);
  });
};

// Helper function to convert AudioBuffer to WAV format
const audioBufferToWav = (buffer) => {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  view.setUint16(32, numberOfChannels * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * bytesPerSample, true);
  
  // Audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return arrayBuffer;
};

const startRecording = async () => {
  try {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true, 
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100 // Set a standard sample rate
      } 
    });
    
    // Try to use WAV format first, fallback to WebM
    let mimeType = 'audio/wav';
    if (!MediaRecorder.isTypeSupported('audio/wav')) {
      mimeType = 'audio/webm;codecs=opus';
    }
    
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
    audioChunksRef.current = [];
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorderRef.current.onstop = async () => {
      try {
        const originalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Convert to WAV if originally WebM
        let finalBlob = originalBlob;
        if (mimeType.includes('webm')) {
          console.log('Converting WebM to WAV...');
          finalBlob = await convertWebMToWAV(originalBlob);
          console.log('Conversion completed');
        }
        
        setAudioBlob(finalBlob);
      } catch (conversionError) {
        console.error('Audio conversion failed:', conversionError);
        // Fallback: use original blob and let backend handle it
        const originalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(originalBlob);
      } finally {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    
    mediaRecorderRef.current.start();
    setIsRecording(true);
  } catch (err) {
    setError('Microphone access denied. Please allow microphone access and try again.');
    console.error('Error accessing microphone:', err);
  }
};

const stopRecording = () => {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Check if file type is supported
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/ogg', 'audio/flac'];
    const isSupported = allowedTypes.some(type => file.type.includes(type.split('/')[1]));
    
    if (!isSupported) {
      setError('Unsupported file type. Please upload WAV, MP3, M4A, OGG, or FLAC files.');
      return;
    }
    
    setAudioBlob(file);
    setError(null);
  }
};

const submitAudio = async () => {
  if (!audioBlob) {
    setError('No audio file selected or recorded');
    return;
  }

  // Debug log
  console.log('Audio blob details:', {
    size: audioBlob.size,
    type: audioBlob.type
  });

  if (audioBlob.size === 0) {
    setError('Audio file is empty. Please record again.');
    return;
  }

  setIsProcessing(true);
  setError(null);
  setUploadProgress(0);

  const formData = new FormData();
  
  // Determine filename based on blob type
  let filename = 'recording.wav';
  if (audioBlob.type.includes('mp3')) filename = 'recording.mp3';
  else if (audioBlob.type.includes('m4a')) filename = 'recording.m4a';
  else if (audioBlob.type.includes('ogg')) filename = 'recording.ogg';
  else if (audioBlob.type.includes('flac')) filename = 'recording.flac';
  
  formData.append('audio_file', audioBlob, filename);
  formData.append('language', 'en');

  try {
    // Use XMLHttpRequest for better error handling and progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 50;
        setUploadProgress(progress);
      }
    });

    const response = await new Promise((resolve, reject) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr);
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error occurred'));
      xhr.ontimeout = () => reject(new Error('Request timed out'));
      
      xhr.timeout = 60000; // 60 second timeout
      xhr.open('POST', 'http://localhost:8000/recommend-from-audio');
      xhr.send(formData);
    });

    setUploadProgress(75);

    const result = JSON.parse(response.responseText);
    
    if (result.success) {
      setResponse(result);
      setUploadProgress(100);
    } else {
      throw new Error(result.detail || 'Processing failed');
    }
  } catch (err) {
    console.error('Error processing audio:', err);
    
    // More specific error handling
    if (err.message.includes('400')) {
      const errorMsg = err.message.includes('Unsupported file type') 
        ? 'Audio format not supported. Please use WAV, MP3, M4A, OGG, or FLAC.'
        : 'Invalid request. Please check your audio file and try again.';
      setError(errorMsg);
    } else if (err.message.includes('413')) {
      setError('Audio file too large. Please use a shorter recording.');
    } else if (err.message.includes('timeout')) {
      setError('Request timed out. Please try with a shorter audio file.');
    } else if (err.message.includes('Network')) {
      setError('Network error. Please check your connection.');
    } else {
      setError(`Failed to process audio: ${err.message}`);
    }
  } finally {
    setIsProcessing(false);
  }
};

  const playResponse = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadAudio = () => {
    if (response?.audio_download_url) {
      const link = document.createElement('a');
      link.href = `http://localhost:8000${response.audio_download_url}`;
      link.download = response.audio_filename;
      link.click();
    }
  };

  const resetApp = () => {
    setAudioBlob(null);
    setResponse(null);
    setError(null);
    setUploadProgress(0);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-full mr-4">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              AgriAssist AI
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Your intelligent agricultural companion. Speak your farming questions and get expert advice tailored for Senegalese agriculture.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700/50 shadow-2xl p-8 md:p-12">
          
          {/* Recording Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Volume2 className="w-6 h-6 mr-3 text-green-400" />
              Record Your Question
            </h2>
            
            <div className="flex flex-col items-center space-y-6">
              {/* Recording Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative w-24 h-24 rounded-full border-4 transition-all duration-300 transform hover:scale-105 ${
                  isRecording 
                    ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30 animate-pulse' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500 border-green-400 shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isRecording ? (
                  <MicOff className="w-10 h-10 text-white mx-auto" />
                ) : (
                  <Mic className="w-10 h-10 text-white mx-auto" />
                )}
                
                {/* Recording animation rings */}
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-50 animation-delay-300"></div>
                  </>
                )}
              </button>

              {/* Recording Timer */}
              {isRecording && (
                <div className="text-red-400 font-mono text-lg bg-red-900/20 px-4 py-2 rounded-lg border border-red-800/30">
                  🔴 Recording: {formatTime(recordingTime)}
                </div>
              )}

              <p className="text-gray-400 text-center max-w-md">
                {isRecording 
                  ? 'Speak clearly into your microphone. Click the button again to stop recording.' 
                  : 'Click the microphone to start recording your agricultural question.'
                }
              </p>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Upload className="w-6 h-6 mr-3 text-blue-400" />
              Or Upload Audio File
            </h2>
            
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-gray-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center justify-center mx-auto mb-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50"
              >
                <FileAudio className="w-8 h-8 mr-3 text-blue-400" />
                <span className="text-lg">Choose Audio File</span>
              </button>
              
              <p className="text-gray-400">
                Supported formats: WAV, MP3, M4A, OGG, FLAC
              </p>
            </div>
          </div>

          {/* Audio Preview */}
          {audioBlob && (
            <div className="mb-8 p-6 bg-gray-700/30 rounded-xl border border-gray-600/30">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
                Audio Ready
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">
                  {audioBlob instanceof File ? audioBlob.name : 'Recorded Audio'}
                </span>
                <button
                  onClick={submitAudio}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Get Agricultural Advice'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div className="mb-8 p-6 bg-blue-900/20 rounded-xl border border-blue-800/30">
              <div className="flex items-center mb-4">
                <Loader2 className="w-6 h-6 mr-3 text-blue-400 animate-spin" />
                <span className="text-lg font-semibold text-blue-300">Processing Your Question...</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Transcribing audio...</span>
                  <span>🎧</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Generating expert advice...</span>
                  <span>🧠</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Creating audio response...</span>
                  <span>🎵</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-8 p-4 bg-red-900/20 border border-red-800/30 rounded-xl">
              <p className="text-red-300 text-center">❌ {error}</p>
            </div>
          )}

          {/* Response Section */}
          {response && (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-xl border border-green-800/30">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Sparkles className="w-6 h-6 mr-3 text-green-400" />
                  Your Question
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed bg-gray-800/30 p-4 rounded-lg">
                  "{response.transcribed_query}"
                </p>
              </div>

              <div className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-800/30">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Leaf className="w-6 h-6 mr-3 text-blue-400" />
                  Expert Agricultural Advice
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed bg-gray-800/30 p-4 rounded-lg mb-4">
                  {response.recommendation}
                </p>

                {/* Audio Response Controls */}
                <div className="flex flex-wrap gap-4 items-center">
                  <audio
                    ref={audioRef}
                    src={`http://localhost:8000${response.audio_download_url}`}
                    onEnded={() => setIsPlaying(false)}
                    onLoadStart={() => setIsPlaying(false)}
                  />
                  
                  <button
                    onClick={playResponse}
                    className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    {isPlaying ? 'Pause' : 'Listen'}
                  </button>

                  <button
                    onClick={downloadAudio}
                    className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <div className="text-center">
                <button
                  onClick={resetApp}
                  className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  Ask Another Question
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400">
          <p className="flex items-center justify-center">
            {"Created with <3 by Krish BATRA"}
            <Leaf className="w-4 h-4 ml-2 text-green-400" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgriculturalAudioApp;