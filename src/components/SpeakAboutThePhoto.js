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

  // timer state
  const [selectedTime, setSelectedTime] = useState(90);
  const [prepareTime, setPrepareTime] = useState(20);
  const [timerKey, setTimerKey] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [volume, setVolume] = useState(0);
  const audioRef = useRef(null);

  // preparation (prepare) state: user sees the image and can read/prepare for `prepareTime` seconds
  const [isPreparing, setIsPreparing] = useState(false);

  // UI flags
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // fetch a random image on mount
    fetchRandomImage();
    // cleanup on unmount
    return () => {
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRandomImage = async () => {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    setUrlImg(null);
    try {
      const resp = await fetch(`https://api.unsplash.com/photos/random?client_id=znmwFjLJbaJ3gM24NzwykppMQewnLbWRl4QFr_L5TgQ&query=${encodeURIComponent(topic)}&orientation=landscape`);
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

  const startRecording = async () => {
    setIsSubmitted(false);
    setAudioUrl(null);
    setSecondsElapsed(0);
    setCanSubmit(false);
    setTimerKey((k) => k + 1);
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
        // if submit was requested while recording, mark submitted after blob is ready
        if (submitAfterStopRef.current) {
          submitAfterStopRef.current = false;
          setIsSubmitted(true);
        }
        // stop tracks
        try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        streamRef.current = null;
      };
      mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
      // set up audio context and analyser for mic level feedback
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
          // compute RMS
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
      // start an elapsed timer to enforce min 30s submit
      startElapsedTicker();
    } catch (err) {
      console.error('startRecording failed', err);
      alert('No microphone available or permission denied.');
    }
  };

  const startElapsedTicker = () => {
    setSecondsElapsed(0);
    let t = 0;
    // clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      t += 1;
      setSecondsElapsed(t);
      if (t >= 30) setCanSubmit(true);
      if (t >= totalSeconds) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        // stop recording when time finishes
        try { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop(); } catch (e) {}
        setIsRecording(false);
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    setIsRecording(false);
    // stop analyser and audio context meter
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
    // clear elapsed interval if present
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const onCountdownComplete = () => {
    // Stop recording when countdown finishes
    stopRecording();
    // ensure submit becomes available when time finishes
    setCanSubmit(true);
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      alert('You must record at least 30 seconds before submitting.');
      return;
    }

    // If currently recording, stop recorder and submit after onstop produces blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      submitAfterStopRef.current = true;
      // stop the recorder
      try { mediaRecorderRef.current.stop(); } catch (e) { console.error(e); }
      setIsRecording(false);
      // clear the elapsed interval immediately so the Recorded counter stops
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // stop analyser and audio context meter immediately
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
      return;
    }

    // if not recording, require audioUrl to exist
    if (!audioUrl) {
      alert('No recording available to submit. Please record first.');
      return;
    }

    setIsSubmitted(true);
  };

  // removed sample playback — not needed for this task

  // reset helper intentionally removed from UI; image can be changed via navigation if needed

  // use selectedTime as countdown length
  const totalSeconds = selectedTime;

  const handleStartFromMenu = () => {
    setIsStarted(true);
    setIsPreparing(true);
    setTimerKey(k => k + 1);
  };

  const onPrepareComplete = () => {
    setIsPreparing(false);
    // automatically start recording when prepare time ends
    startRecording();
  };

  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex flex-col items-center justify-center px-5 gap-4">
        <h1 className="text-4xl text-white font-bold mb-1">Welcome to the speak about the photo test</h1>
        <p className="text-lg text-white">Choose how long you want to speak and then press Start.</p>

        <div className="flex flex-col md:flex-row items-center gap-4 mt-3">
          <div className="flex items-center gap-3">
            <label className="text-white">Prepare time:</label>
            <select value={prepareTime} onChange={(e) => setPrepareTime(Number(e.target.value))} className="bg-gray-800 text-white p-2 rounded">
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-white">Timer:</label>
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
    <div className="App bg-gray-900 w-full min-h-[60vh] py-6 flex flex-col items-center justify-start text-white">
      <h2 className="text-3xl font-bold mb-2">Speak about the image below</h2>
      <p className="text-gray-300 mb-4">You have {totalSeconds} seconds to speak. Minimum 30 seconds required to submit.</p>

      <div className="bg-gray-800 p-4 rounded-md shadow-md w-full max-w-3xl">
        <div className="flex justify-center mb-4">
          {urlImg ? (
            <LazyLoadImage src={urlImg} alt={altImg} className="w-80 h-auto rounded-md object-cover" />
          ) : (
            <div className="w-80 h-48 bg-gray-700 rounded flex items-center justify-center">Loading image...</div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
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
                  size={50}
                  paused={false}
                  onComplete={onPrepareComplete}
                />
                <div className="mt-2">
                  <button
                    className="mt-1 bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => {
                      // start recording immediately, cancel preparing
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-300">Recorded: {secondsElapsed}s</div>
              {/* mic status indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-600'}`} />
                <div className="w-24 h-2 bg-gray-700 rounded overflow-hidden">
                  <div style={{ width: `${Math.min(100, Math.round(volume * 300))}%` }} className="h-2 bg-green-400" />
                </div>
              </div>
            </div>
            <div>
              {/* Countdown clock visual */}
              <ReactCountdownClock
                key={timerKey}
                seconds={totalSeconds}
                color="#fff"
                size={60}
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

        {/* final bottom bar similar to capture: full width green area with review and navigation */}
        {isSubmitted && audioUrl ? (
          <div className="fixed left-0 right-0 bottom-0 bg-green-700 text-white p-4 shadow-inner">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-700 font-bold">✓</div>
                <div>
                  <div className="font-semibold">Review sample answer:</div>
                  <div className="mt-2">
                    {/* Your recording play button */}
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

              <div className="flex items-center gap-4">
                <button
                  className="px-4 py-2 rounded bg-gray-900 text-white"
                  onClick={() => navigate('/')}
                >
                  Back to the main
                </button>

                <button
                  className="px-4 py-2 rounded bg-white text-green-700 font-bold"
                  onClick={() => {
                    // Next exercises: fetch new image and reset UI/timer
                    setIsSubmitted(false);
                    setAudioUrl(null);
                    setSecondsElapsed(0);
                    setCanSubmit(false);
                    setTimerKey((k) => k + 1);
                    // stop any audio context
                    try { if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; } } catch(e){}
                    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch(e){}
                    try { if (audioContextRef.current) audioContextRef.current.close(); } catch(e){}
                    analyserRef.current = null;
                    audioContextRef.current = null;
                    // ensure media tracks stopped
                    try { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); } catch(e){}
                    streamRef.current = null;
                    fetchRandomImage();
                  }}
                >
                  Next exercises
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-gray-400 mt-4">Photo by <a href={imgUserLink} className="underline">{imgUser || 'Unsplash'}</a> — images are fetched from Unsplash for practice only.</p>
      </div>
    </div>
  );
}
