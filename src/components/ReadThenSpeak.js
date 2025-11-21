import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactCountdownClock from 'react-countdown-clock';

export default function ReadThenSpeak() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [current, setCurrent] = useState(null);

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

  // timer state
  const [selectedTime, setSelectedTime] = useState(90);
  const [readTime, setReadTime] = useState(20);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioRef = useRef(null);

  // UI flags
  const [isStarted, setIsStarted] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    fetch('dataReadThenSpeak.json')
      .then((r) => r.json())
      .then((data) => setExercises(data))
      .catch((e) => console.error('failed to load exercises', e));
    return () => {
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      }
    };
  }, []);

  // responsive detection for small screens (mobile)
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

  // choose initial prompt when exercises load
  useEffect(() => {
    if (exercises.length > 0 && current === null) {
      setCurrent(exercises[Math.floor(Math.random() * exercises.length)]);
      // keep selectedTime controlled by the UI selector; do not override from JSON
      setSelectedTime((s) => s || 90);
    }
  }, [exercises, current]);

  const startElapsedTicker = () => {
    setSecondsElapsed(0);
    let t = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      t += 1;
      setSecondsElapsed(t);
      if (t >= 30) setCanSubmit(true);
      if (t >= selectedTime) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        try { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch (e) {}
        setIsRecording(false);
      }
    }, 1000);
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
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
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

  // preparation (reading) state: user reads the prompt for `readTime` seconds
  const [isPreparing, setIsPreparing] = useState(false);

  const handleStartFromMenu = () => {
    // enter exercise and begin reading countdown
    setIsStarted(true);
    setIsPreparing(true);
    // bump timer key so countdowns remount
    setTimerKey((k) => k + 1);
  };

  const onReadComplete = () => {
    setIsPreparing(false);
    // automatically start recording when reading time ends
    startRecording();
  };

  const handleNextExercise = () => {
    // reset submission and audio state
    setIsSubmitted(false);
    setAudioUrl(null);
    setSecondsElapsed(0);
    setCanSubmit(false);
    setTimerKey(k => k + 1);

    // stop any running visualiser / audio context / stream
    try { if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; } } catch (e) {}
    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch (e) {}
    try { if (audioContextRef.current) audioContextRef.current.close(); } catch (e) {}
    analyserRef.current = null;
    audioContextRef.current = null;
    try { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); } } catch (e) {}
    streamRef.current = null;

    // pick a new prompt (prefer one different than current)
    if (exercises && exercises.length > 0) {
      const candidates = exercises.filter((ex) => !current || ex.id !== current.id);
      const next = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : exercises[Math.floor(Math.random() * exercises.length)];
      setCurrent(next);
    }

    // start the read/prep phase for the new exercise
    setIsPreparing(true);
    setIsRecording(false);
  };

  // show pre-start menu (timer selector + Start) similar to other pages
  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-4">
        <h1 className="text-4xl text-white font-bold mb-1">Prepare to speak about the prompt</h1>
        <p className="text-lg text-white">Choose how long you want to speak and press Start.</p>

        <div className="flex flex-col md:flex-row items-center gap-4 mt-3">
          <div className="flex items-center gap-3">
            <label className="text-white">Read time:</label>
            <select value={readTime} onChange={(e) => setReadTime(Number(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-white">Speak time:</label>
            <select value={selectedTime} onChange={(e) => setSelectedTime(Number(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
              <option value={90}>90 seconds</option>
              <option value={75}>75 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={45}>45 seconds</option>
            </select>
          </div>

        </div>

        <div className="flex mt-4">
          <button
            className="mt-6 bg-green-500 text-white p-2 w-32 rounded-xl"
            onClick={handleStartFromMenu}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] py-6 flex flex-col items-center justify-start text-white px-4 sm:px-6">
      <h2 className="text-3xl font-bold mb-2">Read then speak</h2>
      <p className="text-gray-300 mb-4">Read the prompt below, then press Start to record. Minimum 30 seconds required to submit.</p>

      <div className="bg-gray-800 p-6 rounded-md shadow-md w-full max-w-3xl">
        <div className="mb-4">
          {current ? (
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-xl font-semibold mb-2">{current.prompt}</h3>
              <ul className="list-disc pl-5 text-gray-300">
                {current.bullets.map((b, i) => <li key={`b-${i}`} className="mb-1">{b}</li>)}
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
                    className={`mt-1 bg-blue-500 text-white px-3 py-1 rounded ${isSmallScreen ? 'w-full text-center' : ''}`}
                    onClick={() => {
                      // user chooses to start recording immediately, cancel preparing
                      setIsPreparing(false);
                      // start recording right away
                      startRecording();
                    }}
                  >
                    Start recording now
                  </button>
                </div>
              </div>
            ) : !isRecording ? (
              <button
                className={`px-4 py-2 rounded ${isSubmitted ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-500'} ${isSmallScreen ? 'w-full text-center' : ''}`}
                onClick={startRecording}
                disabled={isSubmitted}
              >
                Start recording
              </button>
            ) : (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white ${isSmallScreen ? 'w-full justify-center' : ''}`}>
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Recording...
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
              <div className="text-sm text-gray-300 truncate">Recorded: {secondsElapsed}s</div>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-600'}`} />
                <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden min-w-0">
                  <div style={{ width: `${Math.min(100, Math.round(volume * 300))}%` }} className="h-2 bg-green-400" />
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

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              className={`px-4 py-2 rounded ${canSubmit ? 'bg-green-500' : 'bg-gray-600 cursor-not-allowed'}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Submit
            </button>
          </div>

          <div className="text-sm text-gray-400">You can submit after 30 seconds</div>
        </div>

        {isSubmitted && audioUrl ? (
          <div className="md:fixed left-0 right-0 md:bottom-0 bottom-auto bg-green-700 text-white p-4 shadow-inner">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-700 font-bold">✓</div>
                <div>
                  <div className="font-semibold">Review sample answer:</div>
                  <div className="mt-2">
                    <button
                      className="bg-black bg-opacity-30 text-white px-3 py-2 rounded mr-2"
                      onClick={() => { if (audioRef.current) audioRef.current.play(); }}
                    >
                      Your recording
                    </button>
                    <audio ref={audioRef} src={audioUrl} className="hidden" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                  className="px-4 py-2 rounded bg-gray-900 text-white w-full md:w-auto"
                  onClick={() => navigate('/')}
                >
                  Back to the main
                </button>

                <button
                  className="px-4 py-2 rounded bg-white text-green-700 font-bold w-full md:w-auto"
                  onClick={handleNextExercise}
                >
                  Next exercises
                </button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
