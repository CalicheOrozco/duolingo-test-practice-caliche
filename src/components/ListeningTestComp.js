import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import { HiSpeakerWave } from "react-icons/hi2";

function ListeningTestComp() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const [audios, setAudios] = useState([]);
  // keep a separate pool of all available audios fetched from disk
  const [pool, setPool] = useState([]);
  const [audio, setAudio] = useState(null);
  const [selectedTimer, setSelectedTimer] = useState("60");
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [results, setResults] = useState([]);
  const [testFinished, setTestFinished] = useState(false);
  const autoNextTimerRef = useRef(null);
  const [isStarted, setIsStarted] = useState(false);
  const [replay, setReplay] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // fetch to get the information from information.json
  const getAudios = async () => {
    const response = await fetch("dataListening.json");
    const data = await response.json();
    // store in pool; `audios` will be used as the mutable queue of remaining items
    setPool(data);
  };

  useEffect(() => {
    return () => {
      // cleanup auto timer on unmount
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  // function to get a random phrase
  const getRandomAudio = (source) => {
    const arr = source || audios;
    if (!arr || arr.length === 0) {
      // no audios left
      setAudio(null);
      setTestFinished(true);
      return;
    }
    const randomNumero = Math.floor(Math.random() * arr.length);
    const randomAudio = arr[randomNumero];
    setAudio(randomAudio);
    // bump question index so countdown resets
    setQuestionIndex((q) => q + 1);

    // remove the phrase that was taken
    const newAudios = [...arr];
    newAudios.splice(randomNumero, 1);
    setAudios(newAudios);
    restart();
  };

  // function to restart the form
  const restart = () => {
    // reset per-question state (no per-question feedback shown)
    setReplay(3);
    reset();
  };

  

  // useEffect to execute only once
  useEffect(() => {
    getAudios();
  }, []);

  // NOTE: removed automatic getRandomAudio on `audios` changes to avoid double-advances.

  const onSubmit = (data) => {
    // set the answere to trim and first letter to capital
    data["answereText"] = data["answereText"].trim();
    data["answereText"] =
      data["answereText"].charAt(0).toUpperCase() +
      data["answereText"].slice(1);
    // compare the answers
    const correct = data["answereText"] === (audio && audio.answer);

    // store result (but don't show per-question feedback)
    setResults((prev) => [
      ...prev,
      {
        file: audio ? audio.file : null,
        userAnswer: data["answereText"],
        correct,
        correctAnswer: audio ? audio.answer : null,
      },
    ]);

    // clear the form for next question
    reset();

    // schedule automatic advance after a short delay
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
    }
    autoNextTimerRef.current = setTimeout(() => {
      if (audios && audios.length > 0) {
        // silently advance to next audio
        getRandomAudio();
      } else {
        setTestFinished(true);
      }
    }, 300);
  };

  // function to start the audio
  const startAudio = () => {
    if (replay > 0 && !isPlaying) {
      setReplay(replay - 1);
      const audioFile = new Audio(`Audios/${audio.file}`);
      setIsPlaying(true);
      audioFile.play();
      // when the audio is finished
      audioFile.onended = () => {
        setIsPlaying(false);
      }
    }
  };

  const startTest = () => {
    // set timer seconds
    setTimerSeconds(parseInt(selectedTimer, 10));
    // reset previous run state
    setResults([]);
    setTestFinished(false);
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  // filter pool by difficulty (pool contains the full fetched dataset)
  let filtered = pool || [];
    // use the full fetched list (we fetched into audios initially). If audios already filtered earlier, it's fine.
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter((a) => a.difficulty === selectedDifficulty);
    }

    // choose random number of exercises between 8 and 12 (inclusive)
    const minExercises = 8;
    const maxExercises = 12;
    const randomCount = Math.min(
      filtered.length,
      Math.floor(Math.random() * (maxExercises - minExercises + 1)) + minExercises
    );

    // shuffle and pick randomCount items (Fisher-Yates)
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedSet = shuffled.slice(0, randomCount);

  setAudios(selectedSet);
  setTotalCount(randomCount);
    setIsStarted(true);
    setQuestionIndex(0);
    if (selectedSet.length > 0) getRandomAudio(selectedSet);
    else setTestFinished(true);
  };
  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] py-3 flex items-center justify-center">
      {/* Main page (when not started) */}
      {!isStarted && !testFinished && (
        <div className="flex flex-col items-center text-center px-5 gap-4">
          <h1 className="text-4xl text-white font-bold mb-1 ">
            Welcome to the Listening test
          </h1>
          <span className="text-xl text-white">
            Choose difficulty and timer, then start. You will have the selected time to
            write what you hear.
          </span>

          <div className="flex gap-4 mt-4 items-center">
            <label className="text-white">Timer:</label>
            <select
              value={selectedTimer}
              onChange={(e) => setSelectedTimer(e.target.value)}
              className="p-2 rounded"
            >
              <option value="60">1:00</option>
              <option value="55">55 seconds</option>
              <option value="50">50 seconds</option>
              <option value="45">45 seconds</option>
            </select>

            <label className="text-white">Difficulty:</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="p-2 rounded"
            >
              <option value="all">All</option>
              <option value="basic">Basic</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="flex gap-4 mt-4">
            <input
              type="button"
              value="Start"
              className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
              onClick={() => {
                startTest();
              }}
            />
          </div>
          {testFinished && (
            <div className="text-white mt-3">No audios available for the selected difficulty.</div>
          )}
        </div>
      )}

      {/* Active test (when started) */}
      {isStarted && !testFinished && (
        audio ? (
          <div className="px-10 lg:w-1/2">
            {/* progress indicator */}
            <div className="w-full flex justify-between items-center mb-2">
              <div className="text-white">Question {questionIndex} of {totalCount}</div>
              <div className="text-white text-sm">Remaining: {audios ? audios.length : 0}</div>
            </div>
            {/* Countdown */}
            <div className="w-full flex justify-end mt-3">
              <ReactCountdownClock
                key={questionIndex}
                weight={10}
                seconds={timerSeconds}
                color="#fff"
                size={80}
                paused={false}
                onComplete={() => {
                  // timeout: record an empty answer and advance
                  onSubmit({ answereText: "" });
                }}
              />
            </div>
            {/* Form with white space */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className=" text-4xl font-bold  text-white text-center py-5">
                Type the statement that you hear
              </h1>
              <div className="flex justify-around p-1 flex-col md:flex-row items-center gap-3 md:gap-0">
                <HiSpeakerWave
                  className={
                    replay && !isPlaying > 0
                      ? "text-white text-9xl rounded-full bg-orange-600 p-5 cursor-pointer lg:hover:bg-orange-800"
                      : "text-white text-9xl rounded-full p-5 cursor-not-allowed bg-orange-800"
                  }
                  onClick={() => {
                    startAudio();
                  }}
                />
                {/* text area */}
                <textarea
                  className="border-2 border-gray-700 text-black focus:border-orange-600 outline-none text-xl w-80 p-1 rounded-md"
                  placeholder="Your response"
                  spellCheck="false"
                  {...register("answereText", {
                    required: true,
                    maxLength: 1000,
                  })}
                />
              </div>
              <div className="text-white text-lg text-right">
                <span>Number of replay left: {replay}</span>
              </div>
              {/* handle errors */}
              {errors.answereText && (
                <span className=" text-red-500 text-lg text-center">
                  {"You need type someting"}
                </span>
              )}

              <div className="w-full flex justify-end ">
                <input
                  type="submit"
                  value="Submit"
                  className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                />
              </div>
            </form>
            {/* No per-question feedback shown. The test advances silently until the summary. */}
          </div>
        ) 
        : audio === null ? ( <h1 className="text-3xl text-white">Loading...</h1> ) 
        : (
          <h1 className="text-xl text-white">the audios are over 😢😢</h1>
        )
      )}
      {/* Results when test finished */}
      {testFinished && results && results.length > 0 && (
        <div className="w-full max-w-4xl text-white p-6 rounded">
          <h2 className="text-3xl font-bold mb-3">Results</h2>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-xl">Total: <span className="font-bold">{results.length}</span></div>
            <div className="text-xl text-green-400">Correct: <span className="font-bold">{results.filter(r => r.correct).length}</span></div>
            <div className="text-xl text-red-400">Incorrect: <span className="font-bold">{results.filter(r => !r.correct).length}</span></div>
            <div className="ml-auto text-lg">
              Score: <span className="font-bold">{Math.round((results.filter(r => r.correct).length / results.length) * 100)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((r, idx) => (
              <div key={idx} className={`p-3 rounded border ${r.correct ? 'border-green-700 bg-green-900/10' : 'border-red-700 bg-red-900/10'}`}>
                <div className="flex justify-between items-center">
                  <div className={`${r.correct ? 'text-green-300' : 'text-red-300'}`}>{r.correct ? 'Correct' : 'Incorrect'}</div>
                </div>
                <div className="mt-2">
                  <div className="text-sm text-gray-200">Your answer: <span className={`${r.correct ? 'text-green-200' : 'text-red-200'}`}>"{r.userAnswer || '—'}"</span></div>
                  <div className="text-sm text-green-200 mt-1">Correct: "{r.correctAnswer}"</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ListeningTestComp;
