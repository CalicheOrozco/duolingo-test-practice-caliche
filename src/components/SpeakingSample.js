import React, { useState, useRef, useEffect } from 'react';
import ReactCountdownClock from 'react-countdown-clock';

// --- Detección de Safari ---
const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent || ''
);

// --- Helper: elegir mimeType para navegadores que sí usan MediaRecorder ---
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

export default function SpeakingSample() {
  const [exercises, setExercises] = useState([]);
  const [current, setCurrent] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('any');

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

  // timers / UI
  const [selectedTime, setSelectedTime] = useState(180); // 3 minutes default like screenshot
  const [readTime, setReadTime] = useState(30);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);

  const [isStarted, setIsStarted] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  // para contador basado en tiempo real
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetch('/dataSpeakingSample.json')
      .then(r => r.json())
      .then(d => {
        // ensure each exercise has a difficulty field (default to 'basic')
        const list = Array.isArray(d) ? d.map(item => ({ ...item, difficulty: item.difficulty || 'basic' })) : [];
        setExercises(list);
      })
      .catch(e => { console.error(e); setExercises([]); });

    return () => {
      try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch(e){}
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); }
      if (audioContextRef.current) { try { audioContextRef.current.close(); } catch(e){} }
      if (intervalRef.current) { clearInterval(intervalRef.current); }
    };
  }, []);

  useEffect(() => {
    if (!current && exercises && exercises.length) {
      // choose first exercise matching selected difficulty (or first overall)
      const pool = selectedDifficulty === 'any' ? exercises : exercises.filter(e => e.difficulty === selectedDifficulty);
      setCurrent(pool && pool.length ? pool[0] : exercises[0]);
    }
  }, [exercises, current, selectedDifficulty]);

  const startElapsedTicker = () => {
    startTimeRef.current = Date.now();
    setSecondsElapsed(0);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const diffMs = Date.now() - startTimeRef.current;
      const diffSec = Math.floor(diffMs / 1000);
      setSecondsElapsed(diffSec);
      if (diffSec >= 30) setCanSubmit(true);
      if (diffSec >= selectedTime) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        stopRecording();
      }
    }, 250);
  };

  // Fisher-Yates shuffle (in place) -> returns new array copy
  const shuffleArray = (arr) => {
    const a = Array.isArray(arr) ? arr.slice() : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
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
        // Chrome / Brave / Edge: MediaRecorder
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : undefined;
        const mr = new MediaRecorder(stream, options);
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          const blobType = mr.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: blobType });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          if (submitAfterStopRef.current) {
            submitAfterStopRef.current = false;
            setIsSubmitted(true);
          }
          try { stream.getTracks().forEach(t => t.stop()); } catch(e){}
          streamRef.current = null;
        };
        mediaRecorderRef.current = mr;
        mr.start();
        setIsRecording(true);

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
            for (let i=0;i<dataArrayRef.current.length;i++){ const v = (dataArrayRef.current[i]-128)/128; sum += v*v; }
            const rms = Math.sqrt(sum/dataArrayRef.current.length);
            setVolume(rms);
            animationRef.current = requestAnimationFrame(updateMeter);
          };
          animationRef.current = requestAnimationFrame(updateMeter);
        } catch(e){ console.warn(e); }

      } else {
        // Safari: grabar a WAV con Web Audio
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
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
          const rms = Math.sqrt(sum / input.length);
          setVolume(rms);
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);

        // "MediaRecorder" falso compatible con nuestro stopRecording
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

            try { stream.getTracks().forEach(t => t.stop()); } catch(e){}
            if (safariProcessorRef.current) {
              try { safariProcessorRef.current.disconnect(); } catch(e){}
              safariProcessorRef.current = null;
            }
            if (audioContextRef.current) {
              try { audioContextRef.current.close(); } catch(e){}
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
      alert('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch(e){}
    }
    setIsRecording(false);
    startTimeRef.current = null;
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch(e){} analyserRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch(e){} audioContextRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const handleSubmit = () => {
    if (!canSubmit) { alert('You must record at least 30 seconds before submitting.'); return; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      submitAfterStopRef.current = true;
      try { mediaRecorderRef.current.stop(); } catch(e){}
      setIsRecording(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
      if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch(e){} analyserRef.current = null; }
      if (audioContextRef.current) { try { audioContextRef.current.close(); } catch(e){} audioContextRef.current = null; }
      startTimeRef.current = null;
      return;
    }
    if (!audioUrl) { alert('No recording available to submit. Please record first.'); return; }
    setIsSubmitted(true);
  };

  const onReadComplete = () => {
    setIsPreparing(false);
    // auto-start recording when read time completes (act like pressing "Start recording now")
    try { startRecording(); } catch (e) { console.warn('Failed to auto-start recording', e); }
  };

  const handleStartFromMenu = () => {
    // choose starting exercise according to selected difficulty and shuffle
    const pool = selectedDifficulty === 'any' ? exercises : exercises.filter(e => e.difficulty === selectedDifficulty);
    const shuffled = shuffleArray(pool && pool.length ? pool : exercises);
    if (shuffled && shuffled.length) {
      setExercises(shuffled);
      setCurrent(shuffled[0]);
    }
    setIsStarted(true);
    setIsPreparing(true);
    setTimerKey(k => k + 1);
  };

  const handleNextExercise = () => {
    setIsSubmitted(false);
    setAudioUrl(null);
    setSecondsElapsed(0);
    setCanSubmit(false);
    setTimerKey(k => k + 1);
    try { if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; } } catch(e){}
    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch(e){}
    try { if (audioContextRef.current) audioContextRef.current.close(); } catch(e){}
    analyserRef.current = null; audioContextRef.current = null;
    try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch(e){}
    streamRef.current = null;
    startTimeRef.current = null;

    if (exercises && exercises.length > 0) {
      // navigate within the filtered pool when a difficulty is selected
      const pool = selectedDifficulty === 'any' ? exercises : exercises.filter(e => e.difficulty === selectedDifficulty);
      if (pool && pool.length) {
        const idx = pool.findIndex(x => x.id === (current && current.id));
        const nextIdx = idx >= 0 && idx < pool.length-1 ? idx+1 : 0;
        setCurrent(pool[nextIdx]);
      } else {
        const idx = exercises.findIndex(x => x.id === (current && current.id));
        const nextIdx = idx >= 0 && idx < exercises.length-1 ? idx+1 : 0;
        setCurrent(exercises[nextIdx]);
      }
    }
    setIsPreparing(true);
    setIsRecording(false);
  };

  // ==== A partir de aquí, JSX tal cual lo tenías ====

  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-2">
        <h1 className="text-4xl text-white font-bold mb-1">Prepare to speak about the topic below</h1>
        <p className="text-lg text-white">Choose read & speak time and press Start.</p>

        <div className="flex gap-6 mt-4 items-center">
          <div className="flex items-center gap-3">
            <label className="text-white">Read time:</label>
            <select value={readTime} onChange={e=>setReadTime(Number(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-white">Speak time:</label>
            <select value={selectedTime} onChange={e=>setSelectedTime(Number(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
              <option value={180}>3 minutes</option>
              <option value={120}>2 minutes</option>
              <option value={90}>90 seconds</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-white">Difficulty:</label>
            <select value={selectedDifficulty} onChange={e=>setSelectedDifficulty(e.target.value)} className="bg-gray-800 text-white p-2 rounded">
              <option value="any">Any</option>
              <option value="basic">Basic</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="my-2 text-sm text-gray-300">Available exercises: {selectedDifficulty === 'any' ? exercises.length : exercises.filter(e => e.difficulty === selectedDifficulty).length}</div>

        <div>
          <div>
            <button
              className={` bg-green-500 text-white p-2 w-24 cursor-pointer rounded-xl ${ (selectedDifficulty !== 'any' && exercises.filter(e => e.difficulty === selectedDifficulty).length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleStartFromMenu}
              disabled={selectedDifficulty !== 'any' && exercises.filter(e => e.difficulty === selectedDifficulty).length === 0}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  // prepare screen (match ReadThenSpeak countdown layout)
  if (isStarted && isPreparing) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-4 text-white">
        <div className="max-w-4xl w-full">
          <div className="text-center mt-6 px-4">
            <div className="bg-gray-800 p-8 rounded-md">
              <h2 className="text-2xl font-semibold mb-4">Prepare to speak about the topic below</h2>
              <h3 className='text-lg mb-4'>You will have 3 minutes to speak after reading</h3>
              <div className="bg-gray-700 p-6 rounded border border-gray-600 text-left">
                <p className="text-lg">{current ? current.prompt : 'Loading...'}</p>
              </div>
            </div>
            <div className="mt-3">
                <div className="inline-flex flex-col items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span>Reading...</span>
            </div>
            <ReactCountdownClock
              key={`read-${timerKey}`}
              seconds={readTime}
              color="#fff"
              size={50}
              paused={false}
              onComplete={onReadComplete}
            />
            <div className="mt-2">
              <button
                className="mt-1 bg-blue-500 text-white px-3 py-1 rounded"
                onClick={() => {
                  // user chooses to start recording immediately, cancel preparing
                  setIsPreparing(false);
                  startRecording();
                }}
              >
                Start recording now
              </button>
            </div>
          </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-start text-white">
      <div className="max-w-4xl w-full px-4">
        <h2 className="text-3xl font-bold mb-2">Speaking Sample</h2>
        <p className="text-gray-300 mb-4">Read the prompt, then record your response. Minimum 30s required to submit.</p>

        <div className="bg-gray-800 p-6 rounded mb-6">
          {current ? (
            <>
              <div className="mb-4">
                <div className="bg-gray-700 p-4 rounded">
                  <h3 className="text-xl font-semibold mb-2">{current.prompt}</h3>
                  <ul className="list-disc pl-5 text-gray-300">
                    {current.bullets && current.bullets.map((b,i)=>(<li key={i} className="mb-1">{b}</li>))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {!isRecording ? (
                    <button className={`px-4 py-2 rounded ${isSubmitted ? 'bg-gray-600' : 'bg-green-500'}`} onClick={startRecording} disabled={isSubmitted}>Record</button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white">
                      <span className="w-2 h-2 bg-red-500 rounded-full" /> Recording...
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-300">Recorded: {secondsElapsed}s</div>
                  <div className="w-24 h-2 bg-gray-700 rounded overflow-hidden">
                    <div style={{ width: `${Math.min(100, Math.round(volume*300))}%` }} className="h-2 bg-green-400" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <button className={`px-4 py-2 rounded ${canSubmit ? 'bg-green-500' : 'bg-gray-600'}`} onClick={handleSubmit} disabled={!canSubmit}>Submit</button>
                </div>
                <div>
                  {audioUrl && <audio src={audioUrl} controls className="rounded" />}
                </div>
              </div>
            </>
          ) : (
            <div>Loading...</div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              if (!isSubmitted) {
                alert('Por favor, envía (Submit) tu grabación antes de avanzar al siguiente ejercicio.');
                return;
              }
              handleNextExercise();
            }}
            disabled={!isSubmitted}
            className={`px-4 py-2 rounded ${isSubmitted ? 'bg-white text-green-700' : 'bg-gray-600 text-gray-300'}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
