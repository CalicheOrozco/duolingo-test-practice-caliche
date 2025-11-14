import React, { useEffect, useState, useRef } from 'react';
import WaveAudioPlayer from './WaveAudioPlayer';
import ReactCountdownClock from 'react-countdown-clock';

export default function InteractiveSpeakingComp() {
  const [exercises, setExercises] = useState([]);
  const [allSets, setAllSets] = useState(null); // store raw sets if JSON contains multiple sets
  const [current, setCurrent] = useState(null);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [responses, setResponses] = useState([]); // store { url, blob } per question
  const [showResults, setShowResults] = useState(false);
  const [selectedTimeSeconds, setSelectedTimeSeconds] = useState(35);
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

  useEffect(() => {
    setIsLoading(true);
    fetch('/dataInteractiveSpeaking.json')
      .then((r) => r.json())
      .then((d) => {
        // Accept either:
        // - an array of sets (each with a `questions` array) -> take first set's questions
        // - a single object with `questions`
        // - an array that's already a flat questions array
        if (Array.isArray(d)) {
          // if array of sets (first item has questions), map that questions array
          if (d.length > 0 && d[0] && Array.isArray(d[0].questions)) {
            // store all sets so we can pick another later
            setAllSets(d);
            setCurrentSetIndex(0);
            const setObj = d[0];
            const ex = setObj.questions.map((q, idx) => ({
              id: q.id ?? idx,
              prompt: q.prompt || '',
              sampleAudio: (q.audio && q.audio.length) ? q.audio : (setObj.file || ''),
              ...q,
            }));
            setExercises(ex);
            setResponses(new Array(ex.length).fill(null));
          } else {
            // flat array of exercises
            setAllSets(null);
            setExercises(d);
            setResponses(new Array(d.length).fill(null));
          }
        } else if (d && Array.isArray(d.questions)) {
          // single object with questions
          setAllSets([d]);
          setCurrentSetIndex(0);
          const ex = d.questions.map((q, idx) => ({
            id: q.id ?? idx,
            prompt: q.prompt || '',
            sampleAudio: (q.audio && q.audio.length) ? q.audio : (d.file || ''),
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
    return () => {
      try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch(e){}
    };
  }, []);

  useEffect(() => {
    if (!current && exercises && exercises.length) {
      setQuestionIndex(0);
      setCurrent(exercises[0]);
    }
  }, [exercises, current]);

  const start = () => {
    if (isLoading || !exercises || exercises.length === 0) return;
    // start at the first prompt and enter prepare phase
    setQuestionIndex(0);
    setCurrent(exercises[0]);
    setStarted(true);
    setIsPreparing(true);
    setPrepKey(k => k + 1);
    
  };

  const startElapsedTicker = () => {
    setSecondsElapsed(0);
    let t = 0;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    intervalRef.current = setInterval(() => {
      t += 1;
      setSecondsElapsed(t);
      if (t >= 10) setCanSubmit(true);
      if (t >= selectedTimeSeconds) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        stopRecording();
      }
    }, 1000);
  };

  const startRecording = async () => {
    setAudioUrl(null);
    setCanSubmit(false);
    setSecondsElapsed(0);
    try {
      const qi = questionIndex;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // save response for this question index
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
    if (!canSubmit) { alert('You must record at least 10 seconds before submitting.'); return; }
    stopRecording();
  };

  const handleNext = () => {
    // cleanup current recording state
    stopRecording();
    setAudioUrl(null);
    setCanSubmit(false);
    setSecondsElapsed(0);

    if (!exercises || exercises.length === 0) {
      setStarted(false);
      return;
    }

    // require a recorded/submitted response for the current question before advancing
    const hasResponse = responses && responses[questionIndex] && responses[questionIndex].url;
    if (!hasResponse) {
      alert('Please record and submit your response before moving to the next question.');
      return;
    }

    // if there are more questions, advance to the next one immediately (skip prepare)
    if (questionIndex < exercises.length - 1) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setCurrent(exercises[nextIndex]);
      // do NOT re-enter prepare phase here — show the next question immediately
      setIsPreparing(false);
    } else {
      // no more questions: show results overlay
      setShowResults(true);
    }
  };

  const handleCloseResults = () => {
    // revoke created object URLs
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

  if (!started) {
    return (
      <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-start text-white">
        <div className="max-w-3xl w-full px-4 text-center">
          <h1 className="text-3xl font-bold mb-2">Interactive Speaking</h1>
          <p className="text-gray-300 mb-4">You will listen 3 question and have {selectedTimeSeconds} seconds to answer each.</p>
          <div className="mb-4">
            <label className="mr-2">Timer:</label>
            <select value={selectedTimeSeconds} onChange={(e)=>setSelectedTimeSeconds(Number(e.target.value))} className="text-black px-2 py-1 rounded">
              <option value={35}>35</option>
              <option value={30}>30</option>
              <option value={25}>25</option>  
              <option value={20}>20</option>
              

            </select>
          </div>
          <div>
            <button onClick={start} className="bg-green-500 px-4 py-2 rounded" disabled={isLoading || exercises.length === 0}>
              {isLoading ? 'Loading...' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we are in the prepare phase, show a full-screen prepare UI before recording
  if (started && isPreparing) {
    return (
      <div className="bg-gray-900 min-h-[60vh] py-8 flex flex-col items-center justify-center text-white">
        <div className="max-w-4xl mx-auto relative">
          {/* small top-left countdown positioned above the header (reduced size and offset so it doesn't overlap title) */}
          <div className="absolute transform -translate-x-1/2 -translate-y-6 flex items-center gap-3 text-gray-300">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <ReactCountdownClock key={`prepclock-${prepKey}`} seconds={prepareTime} color="#fff" size={48} onComplete={() => { setIsPreparing(false); }} />
            </div>
            <div className="text-sm">to prepare</div>
          </div>

          <div className="text-center py-12 px-4">
            <h1 className="text-3xl font-bold text-center mb-2">Prepare to have a conversation</h1>
            <p className="text-gray-300 text-center mb-6">You will listen 3 question and have {selectedTimeSeconds} seconds to answer each </p>


            <div className="flex justify-center">
              <button className="bg-blue-600 px-6 py-2 rounded font-semibold" onClick={() => { setIsPreparing(false); }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // results are rendered inline below inside the main page container

  return (
    <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-start text-white">
      <div className="max-w-4xl w-full px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Interactive Speaking</h2>
          <div className="text-gray-300 text-sm">
            <ReactCountdownClock seconds={selectedTimeSeconds} color="#fff" size={60} paused={!isRecording} onComplete={stopRecording} />
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
                              <WaveAudioPlayer key={`sample-${i}-${ex.sampleAudio || ''}`} audioSrc={ex.sampleAudio ? `Audios/${ex.sampleAudio}` : ''} />
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
                <WaveAudioPlayer key={`current-${current.id || questionIndex}`} audioSrc={current.sampleAudio ? `Audios/${current.sampleAudio}` : ''} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {!isRecording ? (
                    <button className={`px-4 py-2 rounded ${audioUrl ? 'bg-gray-600' : 'bg-green-500'}`} onClick={startRecording} disabled={isRecording}>Record</button>
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
          ))}
        </div>

        <div className="flex justify-end gap-2">
          {showResults ? (
            <>
              <button
                onClick={() => {
                  // stop any leftover recording and reset transient state
                  try { stopRecording(); } catch(e){}
                  setAudioUrl(null);
                  setCanSubmit(false);
                  setSecondsElapsed(0);

                  // If we have multiple sets, pick a different one; otherwise restart same set
                  if (allSets && Array.isArray(allSets) && allSets.length > 1) {
                    // pick a different set index
                    const nextSet = (() => {
                      const max = allSets.length;
                      let idx = Math.floor(Math.random() * max);
                      if (max > 1) {
                        let attempts = 0;
                        while (idx === currentSetIndex && attempts < 8) { idx = Math.floor(Math.random() * max); attempts++; }
                      }
                      return idx;
                    })();

                    // map that set's questions into exercises
                    const setObj = allSets[nextSet];
                    const ex = setObj.questions.map((q, idx) => ({
                      id: q.id ?? idx,
                      prompt: q.prompt || '',
                      sampleAudio: (q.audio && q.audio.length) ? q.audio : (setObj.file || ''),
                      ...q,
                    }));
                    setExercises(ex);
                    setResponses(new Array(ex.length).fill(null));
                    setQuestionIndex(0);
                    setCurrentSetIndex(nextSet);
                    setCurrent(ex[0]);
                  } else {
                    // reset responses and question pointer for same set
                    setResponses(new Array(exercises.length).fill(null));
                    setQuestionIndex(0);
                    if (exercises && exercises.length) setCurrent(exercises[0]);
                  }

                  // ensure results hidden and start the prepare phase
                  setShowResults(false);
                  setStarted(true);
                  setIsPreparing(true);
                  setPrepKey(k => k + 1);
                }}
                className="bg-white text-green-700 px-4 py-2 rounded"
              >
                New exercise
              </button>
              <button onClick={handleCloseResults} className="bg-gray-200 text-gray-900 px-4 py-2 rounded">Menu</button>
            </>
          ) : (
            <button onClick={handleNext} className="bg-white text-green-700 px-4 py-2 rounded">Next</button>
          )}
        </div>
      </div>
    </div>
  );
}
