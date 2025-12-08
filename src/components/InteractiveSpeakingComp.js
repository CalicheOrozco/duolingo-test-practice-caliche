import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pushSectionResult } from '../utils/fullTestResults';
import WaveAudioPlayer from './WaveAudioPlayer';
import ReactCountdownClock from 'react-countdown-clock';
import DifficultyBadge from './DifficultyBadge';

// --- Detección de Safari ---
const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent || ''
);

//
// Helper: elegir un mimeType soportado por el navegador
//
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

export default function InteractiveSpeakingComp() {
  const [exercises, setExercises] = useState([]);         // ejercicios DEL BLOQUE ACTUAL
  const [allSets, setAllSets] = useState(null);           // todos los bloques (interactive01, interactive02, ...)
  const [current, setCurrent] = useState(null);           // pregunta actual del bloque
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [responses, setResponses] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedTimeSeconds, setSelectedTimeSeconds] = useState(35);
  const [selectedDifficulty, setSelectedDifficulty] = useState('any');
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const prepareTime = 30;
  const [prepKey, setPrepKey] = useState(0);

  // recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const intervalRef = useRef(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationRef = useRef(null);

  // Safari extra (WAV)
  const safariProcessorRef = useRef(null);
  const safariSamplesRef = useRef([]);
  const safariSampleRateRef = useRef(44100);

  // contador basado en tiempo real
  const startTimeRef = useRef(null);

  const location = useLocation();

  // keep selected difficulty updated when query changes
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const d = params.get('difficulty');
      if (d) setSelectedDifficulty(d);
    } catch (e) {}
  }, [location.search]);

  // fetch data once on mount
  useEffect(() => {
    setIsLoading(true);
    fetch('/dataInteractiveSpeaking.json')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0 && Array.isArray(d[0].questions)) {
          // array de bloques con "questions" -> guardamos los sets
          // no aplanamos todo en `exercises` porque eso causa que el componente
          // muestre múltiples bloques y re-ejecute lógicas al cambiar query
          setAllSets(d);
          // `exercises` se inicializará cuando el usuario haga Start (o el flujo FullTest lo auto-inicie)
          setExercises([]);
          setResponses([]);
        } else if (d && Array.isArray(d.questions)) {
          // Caso: un solo bloque en vez de array de bloques
          setAllSets([d]);
          const ex = d.questions.map((q, idx) => ({
            id: q.id ?? idx,
            prompt: q.prompt || '',
            audio: (q.audio && q.audio.length) ? q.audio : (d.file || ''),
            difficulty: q.difficulty || d.difficulty || 'basic',
            ...q,
          }));
          setExercises(ex);
          setResponses(new Array(ex.length).fill(null));
        } else if (Array.isArray(d)) {
          // array plano de ejercicios (sin bloques)
          setAllSets(null);
          const ex = d.map((q, idx) => ({
            id: q.id ?? idx,
            prompt: q.prompt || '',
            audio: q.audio || '',
            difficulty: q.difficulty || 'basic',
            ...q,
          }));
          setExercises(ex);
          setResponses(new Array(ex.length).fill(null));
        } else {
          setExercises([]);
          setResponses([]);
        }
      })
      .catch((e) => { console.error(e); setExercises([]); })
      .finally(() => setIsLoading(false));

    // cleanup
    return () => {
      try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch(e){}
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); }
      if (audioContextRef.current) { try { audioContextRef.current.close(); } catch(e){} }
      if (intervalRef.current) { clearInterval(intervalRef.current); }
      if (safariProcessorRef.current) {
        try { safariProcessorRef.current.disconnect(); } catch(e){}
      }
    };
  }, []);

  // Auto-start for Full Test: pick a set or exercises and begin
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && !started && !isLoading) {
        // reuse the logic from start() but inline to avoid unstable deps
        if (allSets && Array.isArray(allSets) && allSets.length > 0) {
          const candidateSetIndices = allSets
            .map((setObj, idx) => {
              const questions = (setObj.questions || []).filter((q) =>
                selectedDifficulty === 'any'
                  ? true
                  : (q.difficulty || setObj.difficulty || 'basic') === selectedDifficulty
              );
              return { idx, setObj, questions };
            })
            .filter(entry => entry.questions.length > 0);

          const pool = candidateSetIndices.length
            ? candidateSetIndices
            : allSets
                .map((setObj, idx) => ({ idx, setObj, questions: setObj.questions || [] }))
                .filter(entry => entry.questions.length > 0);

          if (!pool.length) return;
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          console.log('InteractiveSpeaking auto-start: pool size', pool.length, 'chosen idx', chosen.idx, 'questions', chosen.questions.length);
          const setObj = chosen.setObj;
          const questions = chosen.questions;
          const ex = questions.map((q, index) => ({
            id: q.id ?? index,
            prompt: q.prompt || '',
            audio: (q.audio && q.audio.length) ? q.audio : (setObj.file || ''),
            difficulty: q.difficulty || setObj.difficulty || 'basic',
            ...q,
          }));

          setCurrentSetIndex(chosen.idx);
          setExercises(ex);
          setResponses(new Array(ex.length).fill(null));
          setQuestionIndex(0);
          setCurrent(ex[0]);
        } else {
          const pool = selectedDifficulty === 'any' ? exercises : exercises.filter(e => e.difficulty === selectedDifficulty);
          const final = pool.length ? pool : exercises;
          if (!final.length) return;
          setExercises(final);
          setResponses(new Array(final.length).fill(null));
          setQuestionIndex(0);
          setCurrent(final[0]);
        }

        setStarted(true);
        setIsPreparing(true);
        setPrepKey(k => k + 1);
      }
    } catch (e) {}
  }, [location.search, started, isLoading, allSets, exercises, selectedDifficulty]);

  const navigate = useNavigate();
  const fullTestAdvanceRef = useRef(false);
  // reset guard when difficulty or fullTest param changes so repeated runs work
  useEffect(() => {
    fullTestAdvanceRef.current = false;
  }, [location.search]);

  // During Full Test, when this module shows results, advance immediately to the next module
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && showResults) {
        // prevent double-push / navigation loops
        if (!fullTestAdvanceRef.current) {
          try {
            const total = exercises ? exercises.length : 0;
            const correct = Array.isArray(responses) ? responses.filter(Boolean).length : 0;
            const incorrect = Math.max(0, total - correct);
            console.log('FullTest: interactive-speaking pushing result', { total, correct, incorrect });
            pushSectionResult({ module: 'interactive-speaking', totalQuestions: total, totalCorrect: correct, totalIncorrect: incorrect, timestamp: Date.now() });
          } catch(e) { console.warn('pushSectionResult failed', e); }

          const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
          const idx = order.indexOf(window.location.pathname);
          const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
          console.log('FullTest: interactive-speaking next path', { idx, next, pathname: window.location.pathname, selectedDifficulty });
          fullTestAdvanceRef.current = true;
          if (next) {
            // prefer the difficulty indicated in the URL (if present), otherwise use selectedDifficulty
            try {
              const params = new URLSearchParams(location.search);
              const d = params.get('difficulty') || selectedDifficulty || 'any';
              navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(d)}`);
            } catch (e) {
              navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(selectedDifficulty)}`);
            }
          } else {
            // no next path found — clear state to avoid hang
            console.warn('FullTest: no next path from interactive-speaking, clearing state');
            setShowResults(false);
            setStarted(false);
          }
        }
      }
    } catch (e) {}
  }, [showResults, location.search, selectedDifficulty, navigate, exercises, responses]);

  useEffect(() => {
    if (!current && exercises && exercises.length) {
      setQuestionIndex(0);
      setCurrent(exercises[0]);
    }
  }, [exercises, current]);

  // If running a Full Test, once all responses have been recorded, show results automatically
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && exercises && exercises.length && Array.isArray(responses)) {
        const allAnswered = responses.length === exercises.length && responses.every(r => r && r.url);
        if (allAnswered) {
          setShowResults(true);
        }
      }
    } catch (e) {}
  }, [responses, exercises, location.search]);

  // --- Elegir un bloque (set) y cargar TODAS sus preguntas en orden ---
  const start = () => {
    if (isLoading) return;

    // Si tenemos bloques (tu caso normal)
    if (allSets && Array.isArray(allSets) && allSets.length > 0) {
      // 1) Filtramos bloques que contengan preguntas con la dificultad elegida
      const candidateSetIndices = allSets
        .map((setObj, idx) => {
          const questions = (setObj.questions || []).filter((q) =>
            selectedDifficulty === 'any'
              ? true
              : (q.difficulty || setObj.difficulty || 'basic') === selectedDifficulty
          );
          return { idx, setObj, questions };
        })
        .filter(entry => entry.questions.length > 0);

      // Si no hay ningún bloque que cumpla la dificultad, usamos cualquier bloque que tenga preguntas
      const pool = candidateSetIndices.length
        ? candidateSetIndices
        : allSets
            .map((setObj, idx) => ({
              idx,
              setObj,
              questions: setObj.questions || [],
            }))
            .filter(entry => entry.questions.length > 0);

      if (!pool.length) return;

      // 2) Elegimos UN bloque de ese pool (por ejemplo al azar)
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const setObj = chosen.setObj;
      const questions = chosen.questions;
      console.log('InteractiveSpeaking start(): chosen set index', chosen.idx, 'questions', (questions || []).length);

      // 3) Creamos los ejercicios del BLOQUE, en orden, uno por cada pregunta
      const ex = questions.map((q, index) => ({
        id: q.id ?? index,
        prompt: q.prompt || '',
        audio: (q.audio && q.audio.length) ? q.audio : (setObj.file || ''),
        difficulty: q.difficulty || setObj.difficulty || 'basic',
        ...q,
      }));

      setCurrentSetIndex(chosen.idx);
      setExercises(ex);
      setResponses(new Array(ex.length).fill(null));
      setQuestionIndex(0);
      setCurrent(ex[0]);
    } else {
      // Caso sin bloques: usamos la lista plana tal cual, filtrando por dificultad
      const pool = selectedDifficulty === 'any'
        ? exercises
        : exercises.filter(e => e.difficulty === selectedDifficulty);
      const final = pool.length ? pool : exercises;
      console.log('InteractiveSpeaking start(): flat final length', final.length);

      if (!final.length) return;

      setExercises(final);
      setResponses(new Array(final.length).fill(null));
      setQuestionIndex(0);
      setCurrent(final[0]);
    }

    setStarted(true);
    setIsPreparing(true);
    setPrepKey(k => k + 1);
  };

  const startElapsedTicker = () => {
    startTimeRef.current = Date.now();
    setSecondsElapsed(0);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const diffMs = Date.now() - startTimeRef.current;
      const diffSec = Math.floor(diffMs / 1000);
      setSecondsElapsed(diffSec);
      if (diffSec >= 10) setCanSubmit(true);
      if (diffSec >= selectedTimeSeconds) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        stopRecording();
      }
    }, 250);
  };

  const startRecording = async () => {
    setAudioUrl(null);
    setCanSubmit(false);
    setSecondsElapsed(0);

    try {
      const qi = questionIndex;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!isSafari) {
        // Navegadores con MediaRecorder usable
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : undefined;

        const mr = new MediaRecorder(stream, options);
        chunksRef.current = [];

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size) chunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          const blobType = mr.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: blobType });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          setResponses(prev => {
            const next = Array.isArray(prev) ? [...prev] : [];
            next[qi] = { url, blob };
            return next;
          });

          try { stream.getTracks().forEach(t => t.stop()); } catch(e){}
          streamRef.current = null;
        };

        mediaRecorderRef.current = mr;
        mr.start();
        setIsRecording(true);

        // audio meter
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
        } catch(e){ console.warn(e); }

      } else {
        // Safari: capturar audio a WAV con Web Audio
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

            setResponses(prev => {
              const next = Array.isArray(prev) ? [...prev] : [];
              next[qi] = { url, blob };
              return next;
            });

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
    if (safariProcessorRef.current) {
      try { safariProcessorRef.current.disconnect(); } catch(e){}
      safariProcessorRef.current = null;
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) { alert('You must record at least 10 seconds before submitting.'); return; }
    stopRecording();
  };

  const handleNext = () => {
    stopRecording();
    setAudioUrl(null);
    setCanSubmit(false);
    setSecondsElapsed(0);

    if (!exercises || exercises.length === 0) {
      // Avoid returning to the pre-start menu mid-run. If exercises are unexpectedly empty,
      // show results/summary instead so the UI doesn't flip back to the start menu.
      setShowResults(true);
      return;
    }

    const hasResponse = responses && responses[questionIndex] && responses[questionIndex].url;
    if (!hasResponse) {
      alert('Please record and submit your response before moving to the next question.');
      return;
    }

    if (questionIndex < exercises.length - 1) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setCurrent(exercises[nextIndex]);  // siguiente pregunta DEL MISMO BLOQUE
      setIsPreparing(false);
    } else {
      setShowResults(true);
    }
  };

  const handleCloseResults = () => {
    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      responses && responses.forEach(r => { if (r && r.url) try { URL.revokeObjectURL(r.url); } catch(e){} });
    } catch(e){}

    setShowResults(false);
    setStarted(false);
    setCurrent(null);
    setQuestionIndex(0);
    setAudioUrl(null);
    setCanSubmit(false);
    setResponses(new Array(exercises.length).fill(null));
  };

  // ==== JSX ====

  if (!started) {
    const availableCount = (() => {
      if (!allSets || !Array.isArray(allSets)) {
        return selectedDifficulty === 'any'
          ? exercises.length
          : exercises.filter(e => e.difficulty === selectedDifficulty).length;
      }
      let cnt = 0;
      allSets.forEach(setObj => {
        (setObj.questions || []).forEach(q => {
          const diff = q.difficulty || setObj.difficulty || 'basic';
          if (selectedDifficulty === 'any' || diff === selectedDifficulty) cnt++;
        });
      });
      return cnt;
    })();

    return (
      <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-start text-white">
        <div className="max-w-3xl w-full px-4 text-center">
          <h1 className="text-3xl font-bold mb-2">Interactive Speaking</h1>
          <p className="text-gray-300 mb-4">
            You will listen several questions and have {selectedTimeSeconds} seconds to answer each.
          </p>
          <div className="mb-4">
            <label className="mr-2">Timer:</label>
            <select
              value={selectedTimeSeconds}
              onChange={(e)=>setSelectedTimeSeconds(Number(e.target.value))}
              className="text-black px-2 py-1 rounded"
            >
              <option value={35}>35</option>
              <option value={30}>30</option>
              <option value={25}>25</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="mr-2">Difficulty:</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-black px-2 py-1 rounded"
            >
              <option value="any">Any</option>
              <option value="basic">Basic</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="text-sm text-gray-300 mb-4">
            Available questions: {availableCount}
          </div>
          <div>
            <button
              onClick={start}
              className="bg-green-500 text-white p-2 w-24 cursor-pointer rounded-xl"
              disabled={isLoading || availableCount === 0}
            >
              {isLoading ? 'Loading...' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare phase
  if (started && isPreparing) {
    return (
      <div className="bg-gray-900 min-h-[60vh] py-8 flex flex-col items-center justify-center text-white">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute transform -translate-x-1/2 -translate-y-6 flex items-center gap-3 text-gray-300">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <ReactCountdownClock
                key={`prepclock-${prepKey}`}
                seconds={prepareTime}
                color="#fff"
                size={48}
                onComplete={() => { setIsPreparing(false); }}
              />
            </div>
            <div className="text-sm">to prepare</div>
          </div>

          <div className="text-center py-12 px-4">
            <h1 className="text-3xl font-bold text-center mb-2">Prepare to have a conversation</h1>
            <p className="text-gray-300 text-center mb-6">
              You will listen questions from one exercise block and have {selectedTimeSeconds} seconds to answer each.
            </p>

            <div className="flex justify-center">
              <button
                className="bg-blue-600 px-6 py-2 rounded font-semibold"
                onClick={() => { setIsPreparing(false); }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-start text-white">
      <div className="max-w-4xl w-full px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">Interactive Speaking</h2>
            <DifficultyBadge difficulty={current?.difficulty || selectedDifficulty} />
          </div>
          <div className="flex items-center gap-4">
            {exercises && exercises.length > 0 && (
              <div className="text-sm text-gray-300">
                Question {Math.min(questionIndex + 1, exercises.length)} of {exercises.length}
              </div>
            )}
            <div className="text-gray-300 text-sm">
              <ReactCountdownClock
                key={`q-${questionIndex}-${selectedTimeSeconds}`}
                seconds={selectedTimeSeconds}
                color="#fff"
                size={60}
                paused={!isRecording}
                onComplete={stopRecording}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded mb-6">
          {showResults ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Results</h2>
                <button onClick={handleCloseResults} className="px-3 py-1 bg-green-500 rounded">Close</button>
              </div>
              {exercises && exercises.length ? (
                exercises.map((ex, i) => (
                  <div key={i} className="mb-6 p-4 bg-gray-700 rounded">
                    <h3 className="font-semibold mb-2">Question {i+1}</h3>
                    <div className="mb-2">
                      <div className="text-sm text-gray-300 mb-1">Audio:</div>
                      <WaveAudioPlayer
                        key={`sample-${i}-${ex.audio || ''}`}
                        audioSrc={ex.audio ? `Audios/${ex.audio}` : ''}
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-300 mb-1">Your response:</div>
                      {responses && responses[i] && responses[i].url ? (
                        <WaveAudioPlayer key={`response-${i}`} audioSrc={responses[i].url} />
                      ) : (
                        <div className="text-gray-400">No response recorded</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div>No exercises available</div>
              )}
            </div>
          ) : (current ? (
            <>
              <div className="mb-4">
                <WaveAudioPlayer
                  key={current.audio || current.id || questionIndex}
                  audioSrc={current.audio ? `Audios/${current.audio}` : ''}
                  autoPlay={true} 
                  disableAfterEnd={true}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {!isRecording ? (
                    <button
                      className={`px-4 py-2 rounded ${audioUrl ? 'bg-gray-600' : 'bg-green-500'}`}
                      onClick={startRecording}
                      disabled={isRecording}
                    >
                      Record
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white">
                      <span className="w-2 h-2 bg-red-500 rounded-full" /> Recording...
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-300">Recorded: {secondsElapsed}s</div>
                  <div className="w-24 h-2 bg-gray-700 rounded overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.round(volume*300))}%` }}
                      className="h-2 bg-green-400"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <button
                    className={`px-4 py-2 rounded ${canSubmit ? 'bg-blue-500' : 'bg-gray-600'}`}
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                  >
                    Submit
                  </button>
                </div>
                <div>
                  {audioUrl && <audio src={audioUrl} controls className="rounded" />}
                </div>
              </div>
            </>
          ) : (
            <div>Loading...</div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          {showResults ? (
            <>
              <button
                onClick={() => {
                  try { stopRecording(); } catch(e){}
                  setAudioUrl(null);
                  setCanSubmit(false);
                  setSecondsElapsed(0);

                  // ---- NUEVO BLOQUE (set) ----
                  if (allSets && Array.isArray(allSets) && allSets.length > 0) {
                    const max = allSets.length;
                    let idx = Math.floor(Math.random() * max);

                    // Intentamos que no repita el mismo bloque inmediatamente si hay más de uno
                    if (max > 1) {
                      let attempts = 0;
                      while (idx === currentSetIndex && attempts < 8) {
                        idx = Math.floor(Math.random() * max);
                        attempts++;
                      }
                    }

                    const setObj = allSets[idx];

                    const filteredQs = (setObj.questions || []).filter((q) => {
                      const diff = q.difficulty || setObj.difficulty || 'basic';
                      return selectedDifficulty === 'any' ? true : diff === selectedDifficulty;
                    });

                    const sourceQs = filteredQs.length > 0
                      ? filteredQs
                      : (setObj.questions || []);

                    const ex = sourceQs.map((q, index) => ({
                      id: q.id ?? index,
                      prompt: q.prompt || '',
                      audio: (q.audio && q.audio.length) ? q.audio : (setObj.file || ''),
                      difficulty: q.difficulty || setObj.difficulty || 'basic',
                      ...q,
                    }));

                    setExercises(ex);
                    setResponses(new Array(ex.length).fill(null));
                    setQuestionIndex(0);
                    setCurrentSetIndex(idx);
                    setCurrent(ex[0]);
                  }

                  setShowResults(false);
                  setStarted(true);
                  setIsPreparing(true);
                  setPrepKey(k => k + 1);
                }}
                className="bg-white text-green-700 px-4 py-2 rounded"
              >
                New exercise
              </button>
              <button
                onClick={handleCloseResults}
                className="bg-gray-200 text-gray-900 px-4 py-2 rounded"
              >
                Menu
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="bg-white text-green-700 px-4 py-2 rounded"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
