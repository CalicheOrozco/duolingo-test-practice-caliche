import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactCountdownClock from 'react-countdown-clock';
import { LazyLoadImage } from 'react-lazy-load-image-component';

const topics = [
  "daily life",
  "education",
  "university",
  "campus life",
  "lectures",
  "presentations",
  "research",
  "academic writing",
  "studies",
  "career",
  "job interview",
  "workplace",
  "meetings",
  "business",
  "startups",
  "marketing",
  "customer service",
  "technology",
  "internet",
  "social media",
  "innovation",
  "science",
  "research methods",
  "health",
  "healthcare",
  "medicine",
  "mental health",
  "environment",
  "climate change",
  "sustainability",
  "transportation",
  "travel",
  "tourism",
  "accommodation",
  "food",
  "restaurants",
  "shopping",
  "finance",
  "banking",
  "economy",
  "news",
  "politics",
  "law",
  "culture",
  "traditions",
  "art",
  "music",
  "films",
  "literature",
  "history",
  "architecture",
  "science and technology",
  "education policy",
  "family",
  "relationships",
  "friends",
  "hobbies",
  "sports",
  "fitness",
  "photography",
  "nature",
  "animals",
  "cities",
  "urban life",
  "rural life",
  "weather",
  "gardening",
  "design",
  "fashion",
  "business travel",
  "presentations",
  "telecommuting",
  "education online",
  "study abroad",
  "campus housing",
  "social issues",
  "public health",
  "technology and society",
  "work-life balance",
  "career development",
  "interviews",
  "customer experience",
  "product design",
  "transport",
  "sustainability initiatives",
];

// --- Detección de Safari ---
const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent || ''
);

// Helper para elegir un mimeType soportado por el navegador (cuando usamos MediaRecorder real)
function getSupportedMimeType() {
  if (isSafari) {
    return 'audio/mp4';
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
  ];

  for (const type of types) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ''; // que use el default del navegador
}

// --- Helper: convertir Float32 -> WAV (16-bit PCM mono) para Safari ---
function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  let offset = 0;

  writeString(offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + samples.length * 2, true); offset += 4;
  writeString(offset, 'WAVE'); offset += 4;
  writeString(offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;   // PCM
  view.setUint16(offset, 1, true); offset += 2;   // mono
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * 2, true); offset += 4; // byte rate
  view.setUint16(offset, 2, true); offset += 2;   // block align
  view.setUint16(offset, 16, true); offset += 2;  // bits per sample
  writeString(offset, 'data'); offset += 4;
  view.setUint32(offset, samples.length * 2, true); offset += 4;

  let index = 44;
  for (let i = 0; i < samples.length; i++, index += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export default function SpeakAboutThePhoto() {
  const navigate = useNavigate();
  const [urlImg, setUrlImg] = useState(null);
  const [altImg, setAltImg] = useState('Image');
  const [imgUser, setImgUser] = useState('');
  const [imgUserLink, setImgUserLink] = useState('');

  // recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const submitAfterStopRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationRef = useRef(null);
  const intervalRef = useRef(null);

  // refs extra para Safari (WAV)
  const safariProcessorRef = useRef(null);
  const safariSamplesRef = useRef([]);
  const safariSampleRateRef = useRef(44100);

  // timer state
  const [selectedTime, setSelectedTime] = useState(90);
  const [prepareTime, setPrepareTime] = useState(20);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);

  // para contador basado en tiempo real
  const startTimeRef = useRef(null);

  // preparation (prepare) state
  const [isPreparing, setIsPreparing] = useState(false);

  // responsive flag for small screens
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // UI flags
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // fetch a random image on mount
    fetchRandomImage();
    // responsive watcher
    const onResize = () => setIsSmallScreen(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);

    // cleanup on unmount
    return () => {
      window.removeEventListener('resize', onResize);
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRandomImage = async () => {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    setUrlImg(null);
    try {
      const resp = await fetch(
        `https://api.unsplash.com/photos/random?client_id=znmwFjLJbaJ3gM24NzwykppMQewnLbWRl4QFr_L5TgQ&query=${encodeURIComponent(
          topic
        )}&orientation=landscape`
      );
      const data = await resp.json();
      const candidate = data.urls?.small || data.urls?.regular || data.urls?.thumb;
      const img = new Image();
      img.src = candidate;
      img.onload = () => setUrlImg(candidate);
      setAltImg(data.alt_description || data.description || topic);
      setImgUser(data.user?.name || '');
      setImgUserLink(data.user?.links?.html || '');
    } catch (err) {
      console.error('fetchRandomImage failed', err);
      setUrlImg(null);
    }
  };

  const totalSeconds = selectedTime;

  const startElapsedTicker = () => {
    startTimeRef.current = Date.now();
    setSecondsElapsed(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const diffMs = Date.now() - startTimeRef.current;
      const diffSec = Math.floor(diffMs / 1000);
      setSecondsElapsed(diffSec);
      if (diffSec >= 30) setCanSubmit(true);
      if (diffSec >= totalSeconds) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        try {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        } catch (e) {}
        setIsRecording(false);
      }
    }, 250);
  };

  const startRecording = async () => {
    setIsSubmitted(false);
    setAudioUrl(null);
    setSecondsElapsed(0);
    setCanSubmit(false);
    setTimerKey((k) => k + 1);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!isSafari) {
        // Navegadores normales: MediaRecorder
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : undefined;

        const mr = new MediaRecorder(stream, options);
        chunksRef.current = [];

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          const blobType = mr.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: blobType });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          if (submitAfterStopRef.current) {
            submitAfterStopRef.current = false;
            setIsSubmitted(true);
          }
          try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
          streamRef.current = null;
        };

        mediaRecorderRef.current = mr;
        mr.start();
        setIsRecording(true);

        // Mic meter
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          source.connect(analyser);
          analyserRef.current = analyser;
          const bufferLength = analyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);

          const updateMeter = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
            let sum = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
              const v = (dataArrayRef.current[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / dataArrayRef.current.length);
            setVolume(rms);
            animationRef.current = requestAnimationFrame(updateMeter);
          };
          animationRef.current = requestAnimationFrame(updateMeter);
        } catch (e) {
          console.warn('AudioContext not available for mic meter', e);
        }
      } else {
        // Safari: grabar a WAV con Web Audio API
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        safariSampleRateRef.current = audioCtx.sampleRate;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        safariProcessorRef.current = processor;
        safariSamplesRef.current = [];

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          safariSamplesRef.current.push(new Float32Array(input));

          // volumen desde el propio buffer
          let sum = 0;
          for (let i = 0; i < input.length; i++) {
            sum += input[i] * input[i];
          }
          const rms = Math.sqrt(sum / input.length);
          setVolume(rms);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);

        // "MediaRecorder" falso para usar misma lógica de stop/submit
        mediaRecorderRef.current = {
          state: 'recording',
          stop: () => {
            if (mediaRecorderRef.current.state === 'inactive') return;
            mediaRecorderRef.current.state = 'inactive';

            const chunks = safariSamplesRef.current;
            let length = 0;
            chunks.forEach(c => { length += c.length; });
            const samples = new Float32Array(length);
            let offset = 0;
            chunks.forEach(c => { samples.set(c, offset); offset += c.length; });

            const blob = encodeWav(samples, safariSampleRateRef.current);
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            if (submitAfterStopRef.current) {
              submitAfterStopRef.current = false;
              setIsSubmitted(true);
            }

            try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
            if (safariProcessorRef.current) {
              try { safariProcessorRef.current.disconnect(); } catch (e) {}
              safariProcessorRef.current = null;
            }
            if (audioContextRef.current) {
              try { audioContextRef.current.close(); } catch (e) {}
              audioContextRef.current = null;
            }
            safariSamplesRef.current = [];
            streamRef.current = null;
          }
        };

        setIsRecording(true);
      }

      startElapsedTicker();
    } catch (err) {
      console.error('startRecording failed', err);
      alert('No microphone available or permission denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    setIsRecording(false);
    startTimeRef.current = null;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch (e) {}
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const onCountdownComplete = () => {
    stopRecording();
    setCanSubmit(true);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      alert('You must record at least 30 seconds before submitting.');
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      submitAfterStopRef.current = true;
      try { mediaRecorderRef.current.stop(); } catch (e) { console.error(e); }
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) {}
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
        audioContextRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    if (!audioUrl) {
      alert('No recording available to submit. Please record first.');
      return;
    }

    setIsSubmitted(true);
  };

  const handleStartFromMenu = () => {
    setIsStarted(true);
    setIsPreparing(true);
    setTimerKey(k => k + 1);
  };

  const onPrepareComplete = () => {
    setIsPreparing(false);
    startRecording();
  };

  const handleNextExercise = () => {
    setIsSubmitted(false);
    setAudioUrl(null);
    setSecondsElapsed(0);
    setCanSubmit(false);
    setTimerKey((k) => k + 1);

    try {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } catch (e) {}
    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch (e) {}
    try { if (audioContextRef.current) audioContextRef.current.close(); } catch (e) {}
    analyserRef.current = null;
    audioContextRef.current = null;
    try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
    streamRef.current = null;
    startTimeRef.current = null;

    fetchRandomImage();
  };

  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-4">
        <h1 className="text-4xl text-white font-bold mb-1">Welcome to the speak about the photo test</h1>
        <p className="text-lg text-white">Choose how long you want to speak and then press Start.</p>

        <div className="flex flex-col md:flex-row items-center gap-4 mt-3">
          <div className="flex items-center gap-3">
            <label className="text-white">Prepare time:</label>
            <select
              value={prepareTime}
              onChange={(e) => setPrepareTime(Number(e.target.value))}
              className="bg-gray-800 text-white p-2 rounded"
            >
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-white">Timer:</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(Number(e.target.value))}
              className="bg-gray-800 text-white p-2 rounded"
            >
              <option value={90}>90 seconds</option>
              <option value={75}>75 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={45}>45 seconds</option>
            </select>
          </div>
        </div>

        <div className="flex mt-4">
          <button
            className="mt-6 bg-green-500 text-white px-6 py-2 rounded-xl"
            onClick={handleStartFromMenu}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] py-6 px-4 sm:px-6 flex flex-col items-center justify-start text-white">
      <h2 className="text-3xl font-bold mb-2">Speak about the image below</h2>
      <p className="text-gray-300 mb-4">
        You have {totalSeconds} seconds to speak. Minimum 30 seconds required to submit.
      </p>

      <div className="bg-gray-800 p-4 rounded-md shadow-md w-full max-w-3xl">
        <div className="flex justify-center mb-4">
          {urlImg ? (
            <LazyLoadImage
              src={urlImg}
              alt={altImg}
              className="w-full max-w-md md:w-80 h-auto rounded-md object-cover"
            />
          ) : (
            <div className="w-full max-w-md md:w-80 h-48 bg-gray-700 rounded flex items-center justify-center">
              Loading image...
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
          <div>
            {isPreparing ? (
              <div className="inline-flex flex-col items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span>Preparing...</span>
                </div>
                <ReactCountdownClock
                  key={`prep-${timerKey}`}
                  seconds={prepareTime}
                  color="#fff"
                  size={isSmallScreen ? 40 : 50}
                  paused={false}
                  onComplete={onPrepareComplete}
                />
                <div className="mt-2">
                  <button
                    className="mt-1 bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => {
                      setIsPreparing(false);
                      startRecording();
                    }}
                  >
                    Start recording now
                  </button>
                </div>
              </div>
            ) : !isRecording ? (
              <button
                className={`px-4 py-2 rounded ${isSubmitted ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-500'}`}
                onClick={startRecording}
                disabled={isSubmitted}
              >
                Start recording
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Recording...
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-300">Recorded: {secondsElapsed}s</div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-600'}`} />
                <div className="w-24 h-2 bg-gray-700 rounded overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.round(volume * 300))}%` }}
                    className="h-2 bg-green-400"
                  />
                </div>
              </div>
            </div>
            <div>
              <ReactCountdownClock
                key={timerKey}
                seconds={totalSeconds}
                color="#fff"
                size={isSmallScreen ? 44 : 60}
                paused={!isRecording}
                onComplete={onCountdownComplete}
              />
            </div>
          </div>
        </div>

        {/* Igual que SpeakingSample: fila con Submit a la izq y audio a la der */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <button
              className={`px-4 py-2 rounded ${canSubmit ? 'bg-green-500' : 'bg-gray-600 cursor-not-allowed'}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Submit
            </button>
          </div>
          <div>
            {audioUrl && (
              <audio src={audioUrl} controls className="rounded" />
            )}
          </div>
        </div>

        <div className="text-sm text-gray-400 mt-2">
          You can submit after 30 seconds
        </div>

        {/* Navegación, igual idea que SpeakingSample (Next abajo a la derecha) */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-900 text-white"
            onClick={() => navigate('/')}
          >
            Back to the main
          </button>

          <button
            className="px-4 py-2 rounded bg-white text-green-700 font-bold disabled:bg-gray-600 disabled:text-gray-300"
            onClick={handleNextExercise}
            disabled={!isSubmitted || !audioUrl}
          >
            Next exercises
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Photo by{' '}
          <a href={imgUserLink} className="underline">
            {imgUser || 'Unsplash'}
          </a>{' '}
          — images are fetched from Unsplash for practice only.
        </p>
      </div>
    </div>
  );
}
