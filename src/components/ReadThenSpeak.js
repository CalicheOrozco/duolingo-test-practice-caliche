import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactCountdownClock from 'react-countdown-clock';
import { pushSectionResult } from '../utils/fullTestResults';
import DifficultyBadge from './DifficultyBadge';

// --- Detección de Safari ---
const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent || ''
);

//
// Helper para elegir un mimeType soportado por el navegador (NO Safari)
//
function getSupportedMimeType() {
  if (isSafari) return 'audio/mp4';

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
  return '';
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

export default function ReadThenSpeak() {
  const [exercises, setExercises] = useState([]);
  const [current, setCurrent] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('any');

  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const d = params.get('difficulty');
      if (d) setSelectedDifficulty(d);
    } catch (e) {}
  }, [location.search]);

  

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

  // extra refs para Safari (WAV)
  const safariProcessorRef = useRef(null);
  const safariSamplesRef = useRef([]);
  const safariSampleRateRef = useRef(44100);

  // timer state
  const [selectedTime, setSelectedTime] = useState(90);
  const [readTime, setReadTime] = useState(20);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);

  // UI flags
  const [isStarted, setIsStarted] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // preparation (reading) state
  const [isPreparing, setIsPreparing] = useState(false);

  // para contador basado en tiempo real
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetch('dataReadThenSpeak.json')
      .then((r) => r.json())
      .then((data) => setExercises(data))
      .catch((e) => console.error('failed to load exercises', e));
    return () => {
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
  }, []);

  // responsive detection for small screens
  useEffect(() => {
    const onResize = () => {
      try {
        setIsSmallScreen(window.innerWidth < 640);
      } catch (e) {
        setIsSmallScreen(false);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // choose initial prompt
  useEffect(() => {
    if (exercises.length > 0 && current === null) {
      const pool = selectedDifficulty === 'any' ? exercises : exercises.filter((e) => e.difficulty === selectedDifficulty);
      const choice = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : exercises[Math.floor(Math.random() * exercises.length)];
      setCurrent(choice);
      setSelectedTime((s) => s || 90);
    }
  }, [exercises, current, selectedDifficulty]);

  const navigate = useNavigate();

  // Auto-advance to next module after submission/results when running Full Test
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && isSubmitted) {
        try { pushSectionResult({ module: 'read-then-speak', totalQuestions: 1, totalCorrect: 1, totalIncorrect: 0, timestamp: Date.now() }); } catch(e) {}
        const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
        const idx = order.indexOf(window.location.pathname);
        const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
        if (next) navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(selectedDifficulty)}`);
      }
    } catch (e) {}
  }, [isSubmitted, location.search, selectedDifficulty, navigate]);

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
      if (diffSec >= selectedTime) {
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
    setTimerKey(k => k + 1);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!isSafari) {
        // --- Navegadores normales: MediaRecorder ---
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

        // mic meter
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
        // --- Safari: grabar a WAV con Web Audio API ---
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

          // volumen directo desde el buffer
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

  const handleSubmit = () => {
    if (!canSubmit) {
      alert('You must record at least 30 seconds before submitting.');
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      submitAfterStopRef.current = true;
      try { mediaRecorderRef.current.stop(); } catch (e) { console.error(e); }
      setIsRecording(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
      if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch (e) {} analyserRef.current = null; }
      if (audioContextRef.current) { try { audioContextRef.current.close(); } catch (e) {} audioContextRef.current = null; }
      startTimeRef.current = null;
      return;
    }
    if (!audioUrl) {
      alert('No recording available to submit. Please record first.');
      return;
    }
    setIsSubmitted(true);
  };

  const onCountdownComplete = () => {
    stopRecording();
    setCanSubmit(true);
  };

  

  // When starting from the menu, choose a prompt matching the selected difficulty
  // so the user immediately sees an exercise that matches their choice.
  // If no exercises match, fall back to the full list.
  const handleStartFromMenuWithDifficulty = () => {
    setIsStarted(true);
    setIsPreparing(true);
    setTimerKey((k) => k + 1);

    if (exercises && exercises.length > 0) {
      const pool = selectedDifficulty === 'any' ? exercises : exercises.filter((e) => e.difficulty === selectedDifficulty);
      const choice = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : exercises[Math.floor(Math.random() * exercises.length)];
      setCurrent(choice);
    }
  };

  // Auto-start when running Full Test (skip the pre-start menu)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && !isStarted) {
        const doStart = () => {
          setIsStarted(true);
          setIsPreparing(true);
          setTimerKey((k) => k + 1);
          if (exercises && exercises.length > 0) {
            const pool = selectedDifficulty === 'any' ? exercises : exercises.filter((e) => e.difficulty === selectedDifficulty);
            const choice = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : exercises[Math.floor(Math.random() * exercises.length)];
            setCurrent(choice);
          }
        };

        if (exercises && exercises.length > 0) {
          doStart();
        } else {
          const id = setInterval(() => {
            if (exercises && exercises.length > 0) {
              doStart();
              clearInterval(id);
            }
          }, 150);
        }
      }
    } catch (e) {}
  }, [location.search, isStarted, exercises, selectedDifficulty]);

  const onReadComplete = () => {
    setIsPreparing(false);
    startRecording();
  };

  const handleNextExercise = () => {
    setIsSubmitted(false);
    setAudioUrl(null);
    setSecondsElapsed(0);
    setCanSubmit(false);
    setTimerKey(k => k + 1);

    try { if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; } } catch (e) {}
    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch (e) {}
    try { if (audioContextRef.current) audioContextRef.current.close(); } catch (e) {}
    analyserRef.current = null;
    audioContextRef.current = null;
    try { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); } } catch (e) {}
    streamRef.current = null;
    startTimeRef.current = null;

    if (exercises && exercises.length > 0) {
      const pool = selectedDifficulty === 'any' ? exercises : exercises.filter((ex) => ex.difficulty === selectedDifficulty);
      const candidates = pool.filter((ex) => !current || ex.id !== current.id);
      const next = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : exercises[Math.floor(Math.random() * exercises.length)];
      setCurrent(next);
    }

    setIsPreparing(true);
    setIsRecording(false);
  };

  // ================== JSX ==================

  // pre-start menu
  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-2">
        <h1 className="text-4xl text-white font-bold mb-1">Prepare to speak about the prompt</h1>
        <p className="text-lg text-white">Choose how long you want to speak and press Start.</p>

        <div className="flex flex-col md:flex-row items-center gap-4 mt-3">
          <div className="flex items-center gap-3">
            <label className="text-white">Read time:</label>
            <select
              value={readTime}
              onChange={(e) => setReadTime(Number(e.target.value))}
              className="bg-gray-800 text-white p-2 rounded"
            >
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-white">Speak time:</label>
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

          <div className="flex items-center gap-3">
            <label className="text-white">Difficulty:</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded"
            >
              <option value="any">Any</option>
              <option value="basic">Basic</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-300">Available exercises: {selectedDifficulty === 'any' ? exercises.length : exercises.filter(e => e.difficulty === selectedDifficulty).length}</div>

        <div className="flex">
          <button
            className="mt-4 bg-green-500 text-white p-2 w-24 cursor-pointer rounded-xl"
            onClick={handleStartFromMenuWithDifficulty}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

    

  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] py-6 flex flex-col items-center justify-start text-white px-4 sm:px-6">
      <div className="flex items-center justify-center gap-3">
        <h2 className="text-3xl font-bold mb-2">Read then speak</h2>
        <DifficultyBadge difficulty={current?.difficulty || selectedDifficulty} />
      </div>
      <p className="text-gray-300 mb-4">
        Read the prompt below, then press Start to record. Minimum 30 seconds required to submit.
      </p>

      <div className="bg-gray-800 p-6 rounded-md shadow-md w-full max-w-3xl">
        <div className="mb-4">
          {current ? (
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-xl font-semibold mb-2">{current.prompt}</h3>
              <ul className="list-disc pl-5 text-gray-300">
                {current.bullets.map((b, i) => (
                  <li key={`b-${i}`} className="mb-1">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>Loading prompt...</div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <div className="w-full md:w-auto">
            {isPreparing ? (
              <div className="inline-flex flex-col items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span>Reading...</span>
                </div>
                <ReactCountdownClock
                  key={`read-${timerKey}`}
                  seconds={readTime}
                  color="#fff"
                  size={isSmallScreen ? 36 : 50}
                  paused={false}
                  onComplete={onReadComplete}
                />
                <div className="mt-2 w-full">
                  <button
                    className={`mt-1 bg-blue-500 text-white px-3 py-1 rounded ${
                      isSmallScreen ? 'w-full text-center' : ''
                    }`}
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
                className={`px-4 py-2 rounded ${
                  isSubmitted ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-500'
                } ${isSmallScreen ? 'w-full text-center' : ''}`}
                onClick={startRecording}
                disabled={isSubmitted}
              >
                Start recording
              </button>
            ) : (
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white ${
                  isSmallScreen ? 'w-full justify-center' : ''
                }`}
              >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording...
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
              <div className="text-sm text-gray-300 truncate">Recorded: {secondsElapsed}s</div>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                {/* fixed width bar so the green level indicator is always visible */}
                <div className="w-24 h-2 bg-gray-700 rounded overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.round(volume * 300))}%` }}
                    className="h-2 bg-green-400"
                  />
                </div>
              </div>
            </div>
            <div className="ml-2">
              <ReactCountdownClock
                key={timerKey}
                seconds={selectedTime}
                color="#fff"
                size={isSmallScreen ? 48 : 60}
                paused={!isRecording}
                onComplete={onCountdownComplete}
              />
            </div>
          </div>
        </div>

        {/* fila tipo SpeakingSample: Submit + audio a la derecha */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <button
              className={`px-4 py-2 rounded ${
                canSubmit ? 'bg-blue-500' : 'bg-gray-600 cursor-not-allowed'
              }`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Submit
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 hidden sm:block">
              You can submit after 30 seconds
            </div>
            <div>
              {audioUrl && (
                <audio src={audioUrl} controls className="rounded" />
              )}
            </div>
          </div>
        </div>

        {/* botones de navegación debajo de la tarjeta */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            className="px-4 py-2 rounded bg-white text-green-700 font-bold disabled:bg-gray-600 disabled:text-gray-300"
            onClick={() => { if (!isSubmitted) return; window.location.href = '/read-then-speak'; }}
            disabled={!isSubmitted}
          >
            Back to the main
          </button>

          <button
            className="px-4 py-2 rounded bg-white text-green-700 font-bold disabled:bg-gray-600 disabled:text-gray-300"
            onClick={handleNextExercise}
            disabled={!isSubmitted}
          >
            Next exercises
          </button>
        </div>
      </div>
    </div>
  );
}
