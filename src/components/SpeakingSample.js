import React, { useState, useRef, useEffect } from 'react';
import ReactCountdownClock from 'react-countdown-clock';

export default function SpeakingSample() {
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

  // timers / UI
  const [selectedTime, setSelectedTime] = useState(180); // 3 minutes default like screenshot
  const [readTime, setReadTime] = useState(30);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);

  const [isStarted, setIsStarted] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    fetch('/dataSpeakingSample.json')
      .then(r => r.json())
      .then(d => {
        setExercises(d || []);
      })
      .catch(e => { console.error(e); setExercises([]); });

    return () => {
      try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch(e){}
    };
  }, []);

  useEffect(() => {
    if (!current && exercises && exercises.length) {
      setCurrent(exercises[0]);
    }
  }, [exercises, current]);

  const startElapsedTicker = () => {
    setSecondsElapsed(0);
    let t = 0;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    intervalRef.current = setInterval(() => {
      t += 1;
      setSecondsElapsed(t);
      if (t >= 30) setCanSubmit(true);
      if (t >= selectedTime) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        stopRecording();
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
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
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

    if (exercises && exercises.length > 0) {
      const idx = exercises.findIndex(x => x.id === (current && current.id));
      const nextIdx = idx >= 0 && idx < exercises.length-1 ? idx+1 : 0;
      setCurrent(exercises[nextIdx]);
    }
    setIsPreparing(true);
    setIsRecording(false);
  };

  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-4">
        <h1 className="text-4xl text-white font-bold mb-1">Prepare to speak about the topic below</h1>
        <p className="text-lg text-white">Choose read & speak time and press Start.</p>

        <div className="flex gap-6 mt-4">
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
        </div>

        <div className="mt-6">
          <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleStartFromMenu}>Start</button>
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
