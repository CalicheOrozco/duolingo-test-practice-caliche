import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pushSectionResult } from '../utils/fullTestResults';
import ReactCountdownClock from 'react-countdown-clock';
import WaveAudioPlayer from './WaveAudioPlayer';
import DifficultyBadge from './DifficultyBadge';

function InteractiveListeningComp() {
  const [scenario, setScenario] = useState(null);

  // 🔹 NUEVO: guardamos todos los escenarios
  const [scenarios, setScenarios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('intro'); 
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState('any');
  const [selectedTimeSeconds, setSelectedTimeSeconds] = useState(6 * 60 + 30); // default 6:30
  const [countdownSeconds, setCountdownSeconds] = useState(6 * 60 + 30);
  const [countdownKey, setCountdownKey] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const isFullTest = (() => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('fullTest') === '1';
    } catch (e) {
      return false;
    }
  })();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const d = params.get('difficulty');
      if (d) setSelectedDifficulty(d);
    } catch (e) {}
  }, [location.search]);

  // keep countdown in sync with the selected timer before starting
  useEffect(() => {
    if (!started) setCountdownSeconds(selectedTimeSeconds);
  }, [selectedTimeSeconds, started]);

  // when starting, initialize countdown from the selected timer
  useEffect(() => {
    if (!started) return;
    setCountdownSeconds(selectedTimeSeconds);
    setCountdownKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Requirement: when entering Summary, reset timer to 75 seconds regardless of remaining time.
  useEffect(() => {
    if (!started) return;
    if (phase !== 'summary') return;
    setCountdownSeconds(75);
    setCountdownKey((k) => k + 1);
  }, [phase, started]);

  // Auto-start for Full Test: choose a scenario and go directly to questions
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && !started && !loading) {
        // choose scenario respecting difficulty when possible
        if (Array.isArray(scenarios) && scenarios.length > 0) {
          let pool = scenarios;
          if (selectedDifficulty !== 'any') {
            const filtered = scenarios.filter((s) => s.difficulty === selectedDifficulty);
            if (filtered.length > 0) pool = filtered;
          }
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          setScenario(chosen);
          setAnswers({});
          setPhase('questions');
          setStarted(true);
        }
      }
    } catch (e) {}
  }, [location.search, started, loading, scenarios, selectedDifficulty]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('dataInteractiveListening.json');
        const data = await res.json();

        // 🔹 ADAPTACIÓN: si viene array (como el tuyo), lo guardamos en `scenarios`
        if (Array.isArray(data)) {
          setScenarios(data);
          // opcional: no elegimos escenario todavía, se hará al pulsar Start
        } else {
          // compatibilidad con el formato antiguo (un solo objeto)
          setScenario(data);
        }
      } catch (err) {
        console.error('Failed to load interactive listening data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // when scenario changes, verify that the audio file exists
  useEffect(() => {
    const checkAudio = async () => {
      try {
        const file = scenario?.file;
        if (!file) {
          setHasAudio(false);
          return;
        }
        const resp = await fetch(`Audios/${file}`, { method: 'HEAD' });
        setHasAudio(resp && resp.ok);
      } catch (e) {
        try {
          const file = scenario?.file;
          if (!file) { setHasAudio(false); return; }
          const resp2 = await fetch(`Audios/${file}`);
          setHasAudio(resp2 && resp2.ok);
        } catch (err) {
          setHasAudio(false);
        }
      }
    };
    checkAudio();
  }, [scenario]);

  // Intro UI es manejado por WaveAudioPlayer

  const handleStart = () => {
    setPhase('questions');
    setAnswers({});
  };

  const handleChange = (id, value) => {
    setAnswers((p) => ({ ...p, [id]: value }));
  };

  const handleSubmit = () => {
    // Open the review panel with sample answers instead of navigating directly to results
    setShowReview(true);
  };

  const [showReview, setShowReview] = useState(false);

  // Respond-phase controls
  const [currentRespondIdx, setCurrentRespondIdx] = useState(null);
  const [showRespondFeedback, setShowRespondFeedback] = useState(false);
  const [respondSelectedIndex, setRespondSelectedIndex] = useState(null);
  const [respondFeedbackCorrect, setRespondFeedbackCorrect] = useState(false);
  // Summary phase state
  const [summaryText, setSummaryText] = useState('');
  const [showSummaryExample, setShowSummaryExample] = useState(false);

  const continueFromReview = () => {
    // close review and go to the ListenAndRespond section
    setShowReview(false);
    setPhase('respond');
    // start at first respond question (index within filtered respond array)
    const hasRespond = scenario.questions.some((qq) => qq.type === 'ListenAndRespond');
    setCurrentRespondIdx(hasRespond ? 0 : null);
  };

  const tryAgain = () => {
    setAnswers({});
    setPhase('intro');
    setStarted(false);
  };

  // 🔹 NUEVO: cuando el usuario pulsa el botón Start del menú inicial
  const handleBegin = () => {
    // Solo tiene sentido si cargó un array de escenarios
    if (Array.isArray(scenarios) && scenarios.length > 0) {
      let pool = scenarios;

      // Filtrar por dificultad si no es "any"
      if (selectedDifficulty !== 'any') {
        const filtered = scenarios.filter((s) => s.difficulty === selectedDifficulty);
        if (filtered.length > 0) {
          pool = filtered;
        }
      }

      // Elegimos uno (por ejemplo, aleatorio)
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      setScenario(chosen);
    }

    setPhase('intro');
    setAnswers({});
    setStarted(true);
  };

  if (loading) return <div className="text-white p-8">Loading...</div>;

  // 🔹 CAMBIO IMPORTANTE:
  // Antes: if (!scenario) return "No data found"
  // Ahora: solo mostramos eso si TAMPOCO hay escenarios cargados.
  if (!scenario && !scenarios.length) {
    return <div className="text-white p-8">No data found.</div>;
  }
  
  const summaryExample =
    scenario?.SummaryExample ||
    scenario?.questions?.find(
      (q) => q.type === 'Summary' && q.SummaryExample
    )?.SummaryExample;

  // Compute counts for ListenAndComplete and ListenAndRespond questions
  const listenCompleteQs = (scenario && scenario.questions)
    ? scenario.questions.filter((q) => q.type === 'ListenAndComplete')
    : [];
  const listenCompleteKeys = listenCompleteQs.map((q, i) => q.id ?? q.question ?? `lc-${i}`);
  const answeredLC = listenCompleteKeys.reduce((acc, k) => acc + (answers[k] ? 1 : 0), 0);

  const respondQsAll = (scenario && scenario.questions)
    ? scenario.questions.filter((q) => q.type === 'ListenAndRespond')
    : [];
  const totalRespond = respondQsAll.length;


  return (
    <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-start text-white">
      <div className="max-w-4xl w-full px-4">
        {/* Start menu (choose difficulty & timer) — styled like Interactive Reading */}
        <div className="flex items-center justify-between px-12 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Interactive Listening</h1>
            <DifficultyBadge difficulty={scenario?.difficulty || selectedDifficulty} />
          </div>
          {/* Global countdown visible while the exercise is started (applies to all phases including Summary) */}
          {started && (
            <div className="text-gray-300 text-sm">
              <ReactCountdownClock
                key={countdownKey}
                weight={10}
                seconds={countdownSeconds}
                color="#fff"
                size={64}
                paused={showReview || showSummaryExample}
                onComplete={handleSubmit}
              />
            </div>
          )}
        </div>

        {!started && (
          <div className="mb-4 flex flex-col items-center gap-3">
            <div>
              <label className="mr-2">Difficulty:</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="text-black px-2 py-1 rounded"
              >
                <option value="any">Any</option>
                <option value="basic">basic</option>
                <option value="medium">medium</option>
                <option value="advanced">advanced</option>
              </select>
            </div>

            <div>
              <label className="mr-2">Timer:</label>
              <select
                value={selectedTimeSeconds}
                onChange={(e) => setSelectedTimeSeconds(Number(e.target.value))}
                className="text-black px-2 py-1 rounded"
              >
                <option value={6 * 60 + 30}>6:30</option>
                <option value={6 * 60 + 15}>6:15</option>
                <option value={6 * 60}>6:00</option>
                <option value={5 * 60 + 45}>5:45</option>
                <option value={5 * 60 + 30}>5:30</option>
                <option value={5 * 60}>5:00</option>
              </select>
            </div>

            <div className="text-sm text-gray-300">Available exercises: {selectedDifficulty === 'any' ? (scenarios ? scenarios.length : 0) : (scenarios ? scenarios.filter(s => s.difficulty === selectedDifficulty).length : 0)}</div>

            <div>
              {/* 🔹 ANTES: onClick={() => setStarted(true)} */}
              {/* 🔹 AHORA: usamos handleBegin para elegir escenario del array */}
              <button
                onClick={handleBegin}
                className="bg-green-500 text-white p-2 w-24 cursor-pointer rounded-xl"
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* Intro screen */}
        {started && scenario && phase === 'intro' && (
          <div className="flex flex-col items-center justify-center py-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-200 mb-6">
              Listen to the scenario and then answer questions
            </h2>

            <div className="w-full max-w-3xl">
              <WaveAudioPlayer
                audioSrc={scenario?.file ? `Audios/${scenario.file}` : null}
                disabled={!hasAudio}
                playOnce={false}
                disableAfterEnd={false}
                allowPause={true}
              />
              {!hasAudio && (
                <div className="text-sm text-yellow-300 mt-2">Audio not available for this scenario — playback disabled.</div>
              )}
            </div>

            <div className="w-full mt-8 flex justify-end">
              <button
                onClick={handleStart}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md"
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* Questions screen */}
        {started && scenario && phase === 'questions' && (
          <div className="py-6">
            <h2 className="text-2xl font-semibold mb-2 text-center">{scenario.title}</h2>
            <div className="text-sm text-gray-300 text-center mb-4">
              Questions: <span className="font-medium text-white">{listenCompleteQs.length}</span>
              {' — '}
              Answered: <span className="font-medium text-white">{answeredLC}</span>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="w-full max-w-3xl">
                {/* autoplay the scenario audio when entering ListenAndComplete questions */}
                <WaveAudioPlayer
                  audioSrc={scenario?.file ? `Audios/${scenario.file}` : null}
                  autoPlay={true}
                  disableAfterEnd={false}
                  disabled={!hasAudio}
                  allowPause={true}
                />
                {!hasAudio && (
                  <div className="text-sm text-yellow-300 mt-2">Audio not available for this scenario — playback disabled.</div>
                )}
              </div>
            </div>

            <div className="space-y-5 max-w-3xl mx-auto w-full">
              {scenario.questions
                .filter((q) => q.type === 'ListenAndComplete')
                .map((q, idx) => {
                  // clave única por pregunta (usa id si existe, si no usa el texto de la pregunta)
                  const key = q.id ?? q.question ?? `lc-${idx}`;

                  return (
                    <div key={key} className="w-full">
                      <div className="text-gray-200 mb-2 font-medium">{q.question}</div>

                      <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 flex-wrap">
                        <span className="text-white text-sm md:text-base whitespace-nowrap flex-shrink-0">
                          {q.prefix}
                        </span>

                        <input
                          className="flex-1 min-w-0 bg-transparent text-white placeholder-gray-500 border-b border-gray-600 focus:border-gray-400 outline-none text-lg py-1"
                          value={answers[key] || ''}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder="Write here"
                        />

                        {q.suffix && (
                          <span className="text-white text-sm md:text-base whitespace-nowrap flex-shrink-0">
                            {q.suffix}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

            </div>


            <div className="w-full mt-8 flex justify-end">
              <button onClick={handleSubmit} className="bg-blue-500 text-white px-6 py-3 rounded-md">
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Respond screen: ListenAndRespond questions (one at a time) */}
        {started && scenario && phase === 'respond' && (
          <div className="py-6">
            <h2 className="text-2xl font-semibold mb-2 text-center">{scenario.title}</h2>
            {currentRespondIdx !== null && (
              <div className="text-sm text-gray-300 text-center mb-4">
                Question <span className="font-medium text-white">{currentRespondIdx + 1}</span> of <span className="font-medium text-white">{totalRespond}</span>
              </div>
            )}

            <div className="max-w-3xl mx-auto w-full">
              {(() => {
                const respondQs = scenario.questions.filter((qq) => qq.type === 'ListenAndRespond');
                if (!respondQs.length) {
                  return <div className="text-gray-300">No Listen & Respond questions available.</div>;
                }

                if (currentRespondIdx === null || currentRespondIdx >= respondQs.length) {
                  // finished respond section -> prompt to continue to summary
                  return (
                    <div className="p-6 bg-gray-800 rounded-lg text-center">
                      <div className="text-lg font-semibold text-green-300 mb-3">
                        You've completed this section.
                      </div>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => {
                            setPhase('summary');
                            setSummaryText('');
                            setShowSummaryExample(false);
                          }}
                          className="bg-green-500 text-white px-4 py-2 rounded"
                        >
                          Continue to summary
                        </button>
                      </div>
                    </div>
                  );
                }

                const q = respondQs[currentRespondIdx];
                const respondKey = q.id ?? `respond-${currentRespondIdx}`;


                const handleChoice = (i) => {
                  if (showRespondFeedback) return;

                  setRespondSelectedIndex(i);
                  setAnswers((prev) => ({ ...prev, [respondKey]: i }));

                  const correct = i === q.correct;
                  setRespondFeedbackCorrect(correct);
                  setShowRespondFeedback(true);
                };

                const handleNext = () => {
                  setShowRespondFeedback(false);
                  setRespondSelectedIndex(null);
                  // advance to next respond question or finish
                  const nextIdx = currentRespondIdx + 1;
                  if (nextIdx >= respondQs.length) {
                    setCurrentRespondIdx(null);
                    // move to summary phase when finished
                    setPhase('summary');
                    setSummaryText('');
                    setShowSummaryExample(false);
                  } else {
                    setCurrentRespondIdx(nextIdx);
                  }
                };

                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-full">
                        {/* autoplay each respond audio when shown and disable replay after playback */}
                        <WaveAudioPlayer audioSrc={q.audio} bars={40} className="rounded-lg p-3" autoPlay={true} disableAfterEnd={true} allowPause={false} onEnded={() => { /* ensure any UI hooks are safe */ }} />
                      </div>
                    </div>

                    <div className="text-gray-200 mb-2 font-medium">Select the best response</div>

                    <div className="space-y-3">
                      {q.choices.map((c, i) => {
                        const selected = answers[respondKey] === i;
                        return (
                          <div
                            key={i}
                            onClick={() => handleChoice(i)}
                            className={`flex items-center gap-4 p-4 rounded-lg border ${
                              selected ? 'border-white bg-[#121212]' : 'border-gray-700 bg-[#0b0b0b]'
                            } ${showRespondFeedback ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                selected ? 'bg-white' : 'bg-transparent'
                              }`}
                            />
                            <div className="text-gray-200">{c}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback bubble */}
                    {showRespondFeedback && (
                      <div className="mt-4">
                        {respondFeedbackCorrect ? (
                          <div className="inline-block bg-green-700 text-white p-3 rounded-lg">
                            ✓ Correct
                          </div>
                        ) : (
                          <div className="inline-block bg-[#111111] border border-gray-700 text-white p-3 rounded-lg">
                            <div className="text-red-400 font-semibold mb-1">
                              ✕ <span className="line-through text-gray-400">{q.choices[respondSelectedIndex]}</span>
                            </div>
                            <div className="text-sm text-gray-300">
                              <strong>Best Answer:</strong> {q.choices[q.correct]}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex justify-end">
                          <button onClick={handleNext} className="bg-green-500 text-white px-4 py-2 rounded">
                            {currentRespondIdx + 1 >= respondQs.length ? 'Finish' : 'Next'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Summary screen (writing) */}
        {started && scenario && phase === 'summary' && (
          <div className="py-6">
            <div className="bg-gray-900 rounded p-6">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-center">
                    Write a summary of the conversation you just had
                  </h3>
                  <div className="text-sm text-gray-300">
                    Words:{' '}
                    <span className="font-medium text-white">
                      {(summaryText || '').trim()
                        ? summaryText.trim().split(/\s+/).length
                        : 0}
                    </span>
                  </div>
                </div>

                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Your response"
                  className="w-full h-[340px] p-4 rounded border border-gray-700 bg-[#0b0b0b] text-gray-200 resize-none"
                />

                <div className="mt-6 flex justify-end items-center gap-4">
                  <button
                    onClick={() => setShowSummaryExample(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    SUBMIT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review panel shown after Submit (sample answers) */}
        {showReview && scenario && (
          <div className="fixed left-0 right-0 bottom-0 bg-green-800 text-white p-6 shadow-lg z-40">
            <div className="max-w-6xl mx-auto flex items-start gap-6">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">✓</div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Review sample answers:</h3>
                <ul className="list-disc ml-5 space-y-1">
                  {scenario.questions
                    .filter((q) => q.type === 'ListenAndComplete')
                    .map((q) => (
                      <li key={q.id} className="text-green-100">
                        {q.answer}
                      </li>
                    ))}
                </ul>
              </div>

              <div className="flex-shrink-0 flex items-center">
                <button
                  onClick={continueFromReview}
                  className="ml-6 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded shadow"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Example overlay (green) */}
        {showSummaryExample && scenario && (
          <div className="fixed left-0 right-0 bottom-0 bg-green-800 text-white p-6 shadow-lg z-50">
            <div className="max-w-6xl mx-auto flex items-start gap-6">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">✓</div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Review sample answer:</h3>
                <div className="text-green-100">
                  {summaryExample ||
                    'In the conversation, the speakers discussed various topics including their weekend plans, favorite hobbies, and recent movies they have watched. They shared their thoughts and opinions, highlighting the importance of balancing work and leisure time.'}
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center">
                <button
                    onClick={() => {
                    setShowSummaryExample(false);
                    if (isFullTest) {
                      try {
                        // compute totals using available answers; if exact expected answer exists, compare, otherwise count answered items
                        const total = scenario ? (scenario.questions ? scenario.questions.length : 0) : 0;
                        let correctCount = 0;
                        if (scenario && scenario.questions) {
                          correctCount = scenario.questions.reduce((acc, q) => {
                            const uid = q.id;
                            const user = answers && Object.prototype.hasOwnProperty.call(answers, uid) ? answers[uid] : null;

                            // Treat ListenAndComplete items as correct when the user provided any non-empty answer
                            if (q.type === 'ListenAndComplete') {
                              if (user != null && String(user).trim() !== '') return acc + 1;
                              return acc;
                            }

                            const expected = q.answer || q.correct || q.correctAnswer || '';
                            if (user == null || String(user).trim() === '') return acc;
                            if (expected) {
                              try {
                                if (String(user).trim().toLowerCase() === String(expected).trim().toLowerCase()) return acc + 1;
                                return acc;
                              } catch (e) { return acc; }
                            }
                            // if no expected answer provided, count as completed
                            return acc + 1;
                          }, 0);
                        }
                        const incorrectCount = Math.max(0, total - correctCount);
                        try { pushSectionResult({ module: 'interactive-listening', totalQuestions: total, totalCorrect: correctCount, totalIncorrect: incorrectCount, timestamp: Date.now() }); } catch(e) {}
                        const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
                        const idx = order.indexOf(window.location.pathname);
                        const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
                        if (next) {
                          navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(selectedDifficulty)}`);
                          return;
                        }
                      } catch (e) {}
                      // fallback: reset local state if no next module
                      tryAgain();
                    } else {
                      tryAgain();
                    }
                  }}
                  className="ml-6 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded shadow"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InteractiveListeningComp;
