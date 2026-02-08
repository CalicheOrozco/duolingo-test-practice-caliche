import React, { useEffect, useState } from 'react';
import { pushSectionResult } from '../utils/fullTestResults';
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useLocation, useNavigate } from 'react-router-dom';


const initialTopics = [
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

export default function ImageTestComp() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isCorrect, setIsCorrect] = useState();
  const [answer, setAnswer] = useState("");
  const [urlImg, setUrlImg] = useState(null);
  const [altImg, setAltImg] = useState("");
  const [linkImg, setLinkImg] = useState("");
  const [imgUser, setImgUser] = useState("");
  const [imgUserLink, setImgUserLink] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedTime, setSelectedTime] = useState(60); // default 60 seconds
  const [spellErrors, setSpellErrors] = useState([]);
  const [suggestedText, setSuggestedText] = useState("");
  const [grammarScore, setGrammarScore] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [topicsPool, setTopicsPool] = useState(initialTopics);
  const [currentRound, setCurrentRound] = useState(0);
  const totalRounds = 3;
  const [results, setResults] = useState([]);
  const [timerKey, setTimerKey] = useState(0);
  const [showResults, setShowResults] = useState(false);
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
  const fullTestDifficulty = (() => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('difficulty') || 'any';
    } catch (e) {
      return 'any';
    }
  })();

  const countWords = (text) => {
    const t = String(text || '').trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  };

  const wordCountClass = (n) => {
    if (n >= 50 && n <= 60) return 'text-green-400';
    if (n >= 40 && n <= 49) return 'text-yellow-300';
    return 'text-red-400';
  };

  // topics are taken from initialTopics stored in state (topicsPool)

  const getImg = async (forTopic) => {
    // require a topic
    const query = forTopic || topic;
    if (!query) return;
    setUrlImg(null); // indicate loading
    try {
      const response = await fetch(
        `https://api.unsplash.com/photos/random?client_id=znmwFjLJbaJ3gM24NzwykppMQewnLbWRl4QFr_L5TgQ&query=${encodeURIComponent(query)}&orientation=landscape`
      );
      const data = await response.json();
      // pick a reasonably small but good quality url for quick load
      const candidate = data.urls.small || data.urls.thumb || data.urls.regular;

      // preload image before setting state to avoid flicker/delay
      const img = new Image();
      img.src = candidate;
      img.onload = () => {
        setUrlImg(candidate);
        setAltImg(data.alt_description || data.description || 'Image');
      };
      img.onerror = () => {
        // fallback to regular if small fails
        const fallback = data.urls.regular || candidate;
        setUrlImg(fallback);
        setAltImg(data.alt_description || data.description || 'Image');
      };

      setImgUserLink(data.user?.links?.html || '');
      setLinkImg(data.links?.html || '');
      setImgUser(data.user?.name || '');
    } catch (err) {
      console.error('Failed to fetch image', err);
      setUrlImg(null);
    }
  };


  const getTopic = async () => {
    if (!topicsPool || topicsPool.length === 0) return;
    const randomNumero = Math.floor(Math.random() * topicsPool.length);
    const randomTopic = topicsPool[randomNumero];
    setTopic(randomTopic);
    // remove used topic from pool
    setTopicsPool((prev) => prev.filter((t) => t !== randomTopic));
    restart();
    // fetch image for the chosen topic and preload it
    await getImg(randomTopic);
  };

  // Move to next round (called when user clicks Next or when finishing last round)
  const handleNext = (entryOverride) => {
    // save current round result (use override when available to avoid state race)
    const entry = entryOverride || {
      image: urlImg,
      imgUser,
      userAnswer: answer,
      suggested: suggestedText,
      issues: spellErrors,
      score: grammarScore,
      topic,
    };
    setResults((prev) => [...prev, entry]);

    if (currentRound + 1 < totalRounds) {
      // prepare next round
      setCurrentRound((r) => r + 1);
      // reset UI
      setSubmited(false);
      setIsCorrect(null);
      setAnswer("");
      reset();
      setSpellErrors([]);
      setSuggestedText("");
      setGrammarScore(null);
      // bump timer key to remount the countdown clock and restart
      setTimerKey((k) => k + 1);
      // fetch a new topic/image
      getTopic();
    } else {
      // finished all rounds
      if (isFullTest) {
        try {
          // results state update is async; include the current entry in the pushed totals
          const total = (results ? results.length : 0) + 1;
          try { pushSectionResult({ module: 'image-test', totalQuestions: total, totalCorrect: total, totalIncorrect: 0, timestamp: Date.now() }); } catch(e) {}
          const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
          const idx = order.indexOf(window.location.pathname);
          const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
            if (next) {
            navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(fullTestDifficulty)}`);
            return;
          }
        } catch (e) {}
        // fallback to showing results if navigation failed
      }
      setShowResults(true);
    }
  };
  // function to restart the form
  const restart = () => {
    setIsCorrect(null);
    setSubmited(false);
    reset();
  };

  // reset the whole session to initial state
  const resetSession = () => {
    setTopicsPool(initialTopics.slice());
    setCurrentRound(0);
    setResults([]);
    setShowResults(false);
    setTimerKey((k) => k + 1);
    setSubmited(false);
    setIsStarted(false);
    setSpellErrors([]);
    setSuggestedText("");
    setGrammarScore(null);
    setAnswer("");
    // fetch a fresh topic when starting again
    getTopic();
  };

  const onSubmit = (data) => {
    // set the data and submited to true
    // normalize
    data["answereText"] = (data["answereText"] || "").trim();
    data["answereText"] =
      data["answereText"].charAt(0).toUpperCase() +
      data["answereText"].slice(1);

    const original = data["answereText"];
    setAnswer(original);

    // Run spellcheck and build suggested corrected text
    (async () => {
      // pass setIsChecking so UI can show spinner / disable Next while we wait
      const result = await checkSpelling(null, setSpellErrors, setIsChecking, original);
      // result shape: { issues: [...], corrected: string|null, score: number|null }
      const foundMatches = result && result.issues ? result.issues : [];
      const corrected = result && result.corrected ? result.corrected : null;
      const score = result && typeof result.score === 'number' ? result.score : null;
      // set score if present
      if (score !== null) setGrammarScore(score);
      if (foundMatches && foundMatches.length > 0) {
        // keep the raw errors for the UI
        setSpellErrors(foundMatches);
        // if replacements provided, build a suggested text
        const hasReplacements = foundMatches.some((e) => e.replacements && e.replacements.length > 0);
        if (hasReplacements) {
          const suggested = applyReplacements(foundMatches, original);
          // keep contraction transformation optional: prefer model output
          setSuggestedText(suggested);
        } else {
          // if the model returned a full corrected text, use it as suggestion
          if (corrected) setSuggestedText(corrected);
          else setSuggestedText("");
        }
      } else {
        setSpellErrors([]);
        setSuggestedText(corrected || "");
      }
      setSubmited(true);
      setIsCorrect(true);
      // build entry from returned result to avoid state race
      const entry = {
        image: urlImg,
        imgUser,
        userAnswer: original,
        suggested: corrected || (foundMatches.length ? applyReplacements(foundMatches, original) : ""),
        issues: foundMatches,
        score: score,
        topic,
      };
      if (currentRound + 1 >= totalRounds) {
        // final round: push final entry and show results modal
        handleNext(entry);
      }
    })();
  };

  useEffect(() => {
    // on mount, pick a topic and fetch its image
    getTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // If running as part of Full Test, auto-start the exercise (no pre-start config)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      try {
        if (isFullTest && !isStarted) {
          setIsStarted(true);
          // ensure we have a topic ready; getTopic() was called on mount but call again if needed
          if (!topic) getTopic();
        }
      } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullTest, isStarted]);

  // Apply replacements using offsets returned by LanguageTool
  const applyReplacements = (errors, text) => {
    if (!errors || errors.length === 0) return text;
    // Sort descending by offset so replacements don't change following offsets
    const sorted = [...errors].sort((a, b) => b.offset - a.offset);
    let result = text;
    for (const e of sorted) {
      if (!e.replacements || e.replacements.length === 0) continue;
      const rep = e.replacements[0];
      // guard offsets
      const off = Math.max(0, Math.min(e.offset, result.length));
      const len = Math.max(0, Math.min(e.length, result.length - off));
      result = result.slice(0, off) + rep + result.slice(off + len);
    }
    return result;
  };



  

  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] py-3 flex items-center justify-center">
      {(isStarted || isFullTest) ? (
        topic ? (
          <div >
            {/* Countdown */}
            <div className="w-full flex justify-end mt-3">
              <ReactCountdownClock
                key={timerKey}
                weight={10}
                seconds={selectedTime}
                color="#fff"
                size={80}
                paused={submited}
                onComplete={handleSubmit(onSubmit)}
              />
            </div>
            {/* Form with white space */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className=" text-4xl font-bold  text-white text-center py-5">
                Write a description of the image below for 1 minute.
              </h1>
              {/* Round indicator: show which question out of total the user is on */}
              <div className="text-center text-sm text-gray-300 mb-4">
                Question {Math.min(currentRound + 1, totalRounds)} of {totalRounds}
              </div>
              <div className="flex justify-around p-1 items-center flex-col md:flex-row  gap-6 md:gap-5">
                <LazyLoadImage
                  className="rounded max-w-[400px] w-full h-auto"
                  src={urlImg}
                  alt={altImg ? altImg : "Loading..."}
                />
            {/* Final results modal */}
              {showResults ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black opacity-70" onClick={() => {
                  if (isFullTest) {
                    try {
                      const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
                      const idx = order.indexOf(window.location.pathname);
                      const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
                      if (next) {
                        navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(fullTestDifficulty)}`);
                        return;
                      }
                    } catch (e) {}
                  }
                  setShowResults(false);
                }} />
                <div className="relative bg-gray-800 text-white rounded-lg max-w-4xl w-full p-6 z-50">
                  <h2 className="text-2xl font-bold mb-4 text-white">Results — Session Summary</h2>
                  <div className="text-sm text-gray-300 mb-4">
                    Expected length: <span className="font-semibold text-white">50–60</span> words.
                    <span className="ml-2">(50–60 green · 40–49 yellow · under 40 red)</span>
                  </div>
                  <div className="space-y-4 max-h-[60vh] overflow-auto">
                    {results.map((r, i) => (
                      <div key={i} className="flex gap-4 p-3 border border-gray-700 rounded bg-gray-900">
                        <img src={r.image} alt={`round-${i}-img`} className="w-36 h-24 object-cover rounded" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">Topic: {r.topic}</p>
                          <p className="font-semibold text-white">Your answer:</p>
                          <p className="text-sm mb-2 text-gray-100">{r.userAnswer}</p>
                          <p className="text-sm text-gray-300 mb-2">
                            Words:{' '}
                            <span className={`font-bold ${wordCountClass(countWords(r.userAnswer))}`}>
                              {countWords(r.userAnswer)}
                            </span>
                          </p>
                          {r.suggested ? (
                            <>
                              <p className="font-semibold text-white">ChatGPT suggested:</p>
                              <p className="text-sm mb-2 text-gray-100">{r.suggested}</p>
                            </>
                          ) : null}
                          {r.issues && r.issues.length > 0 ? (
                            <div className="mt-1">
                              <p className="font-semibold text-white">Issues:</p>
                              <ul className="list-disc list-inside text-sm text-gray-200">
                                {r.issues.map((it, idx) => (
                                  <li key={idx} className="text-gray-200">{it.word} — {it.replacements && it.replacements.length > 0 ? it.replacements.join(', ') : '(no replacement)'}{it.message ? ` — ${it.message}` : ''}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {typeof r.score === 'number' ? (
                            <p className="text-xs text-gray-400 mt-2">DET score: {r.score}/100</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      className="px-4 py-2 bg-gray-700 text-white rounded"
                      onClick={() => {
                        if (isFullTest) {
                          try {
                            const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
                            const idx = order.indexOf(window.location.pathname);
                            const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
                            if (next) {
                              navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(fullTestDifficulty)}`);
                              return;
                            }
                          } catch (e) {}
                        }
                        setShowResults(false);
                      }}
                    >
                      Close
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                      onClick={() => {
                        if (isFullTest) {
                          try {
                            const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
                            const idx = order.indexOf(window.location.pathname);
                            const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
                            if (next) {
                              navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(fullTestDifficulty)}`);
                              return;
                            }
                          } catch (e) {}
                        }
                        resetSession();
                      }}
                    >
                      Restart session
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
               
                {/* text area */}
                <div className="w-full md:w-1/2">
                  <textarea
                    className="border-2 border-gray-700 text-black focus:border-orange-600 outline-none text-xl w-full h-64 p-1 rounded-md font-bold"
                    placeholder="Your response"
                    spellCheck={true}
                    readOnly={submited}
                    {...register("answereText", {
                      required: true,
                      maxLength: 1000,
                    })}
                  />

                  {/* Controls below textarea: word counter and spelling check */}
                  <div className="flex items-center justify-between mt-2">
                    <WordCounter watch={watch} />

                    <div className="flex items-center gap-2">
                      {/* Word counter shown left; no manual spell check button anymore. */}
                    </div>
                  </div>

                  {/* Spelling result list - ONLY shown in final results modal; hide per-round detailed suggestions */}
                  {submited && showResults && spellErrors.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-800 rounded">
                      <h4 className="text-white font-semibold">Spelling suggestions</h4>
                      <ul className="mt-2 space-y-2">
                        {spellErrors.map((e, idx) => (
                          <li key={idx} className="text-white">
                            <div>
                              <span className="font-bold">{e.word}</span>
                              {e.replacements && e.replacements.length > 0 ? (
                                <span className="ml-2 text-yellow-300">Suggestion: {e.replacements.join(", ")}</span>
                              ) : (
                                <span className="ml-2 text-gray-400">(no automated suggestions — see explanation below)</span>
                              )}
                              {/* Show LanguageTool message explaining the issue */}
                              {e.message ? (
                                <p className="text-gray-300 mt-1">{e.message}</p>
                              ) : null}
                            </div>
                            <div className="mt-1">
                              {/* Apply buttons removed per user request; suggestions are shown above. */}
                              <button
                                type="button"
                                className="bg-gray-600 text-white px-2 py-1 rounded"
                                onClick={() => removeError(idx, setSpellErrors)}
                              >
                                Dismiss
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-white mr-3"> Photo by <a href={imgUserLink}>{imgUser}</a> on <a href="https://unsplash.com/es?utm_source=englishcertify&utm_medium=referral">Unsplash</a></p>
              {/* handle errors */}
              {errors.answereText && (
                <p className=" text-red-500 text-lg text-center">
                  {"Check your answer something is going wrong"}
                </p>
              )}

              {!submited ? (
                <div className="w-full flex justify-end ">
                  <button
                    type="submit"
                    disabled={isChecking}
                    className={`mt-6 text-white p-2 w-32 cursor-pointer rounded-xl ${isChecking ? 'bg-gray-600 opacity-80 cursor-wait' : 'bg-blue-500'}`}
                  >
                    {isChecking ? (
                      <span className="flex items-center justify-center">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      </span>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              ) : null}
            </form>
            {/* button repeat and next */}
            <>
              {submited ? (
                <>
                  <div className="text-center">
                    <p className="text-xl text-center text-green-600 font-bold">Round submitted</p>
                    <p className="text-lg text-white">Press Next to continue to the next image.</p>
                    <div className="w-full flex justify-between mt-4">
                      <button
                        type="button"
                        onClick={() => restart()}
                        className="mt-6 bg-blue-500 text-white p-2 w-24 cursor-pointer rounded-xl"
                      >
                        Repeat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNext()}
                        disabled={isChecking}
                        className={`mt-6 text-white p-2 w-24 cursor-pointer rounded-xl ${isChecking ? 'bg-gray-600 opacity-70 cursor-wait' : 'bg-green-500'}`}
                      >
                        {isChecking ? (
                          <span className="flex items-center justify-center">
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </span>
                        ) : (
                          'Next'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
              {isCorrect === true ? (
                <div className="w-full flex justify-center py-3">
                  {/* put a gif */}
                  <img
                    src="https://i.giphy.com/media/f9RzoxHizH72k15FKS/giphy.webp"
                    alt={altImg}
                    href={linkImg}
                    className=" w-96 h-80 mt-3"
                  />
                </div>
              ) : null}
            </>
          </div>
        ) : urlImg === null ? (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl text-white mb-2">Loading...</h1>
            <div className="text-sm text-gray-300">Question {Math.min(currentRound + 1, totalRounds)} of {totalRounds}</div>
          </div>
        ) : (
          <h1 className="text-xl text-white">The images are over 😢😢</h1>
        ) // end topic ternary
      ) : ( // not started -> show pre-start menu (hidden if fullTest)
        !isFullTest ? (
          <div className="flex flex-col items-center text-center px-5 gap-4">
            <h1 className="text-4xl text-white font-bold mb-1">Welcome to the image test</h1>
            <p className="text-lg text-white">Choose how long you want to write and then press Start.</p>

            <div className="flex flex-col md:flex-row items-center gap-4 mt-3">
              <label className="text-white">Timer:</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(Number(e.target.value))}
                className="bg-gray-800 text-white p-2 rounded"
              >
                <option value={60}>1 minuto</option>
                <option value={55}>55 segundos</option>
                <option value={50}>50 segundos</option>
                <option value={45}>45 segundos</option>
                <option value={40}>40 segundos</option>
              </select>
            </div>

            <div className="flex mt-4">
              <button
                className="bg-green-500 text-white p-2 w-24 cursor-pointer rounded-xl"
                onClick={() => {
                  setIsStarted(true);
                }}
              >
                Start
              </button>
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}


// Small presentational component for word counting to keep main comp tidy
function WordCounter({ watch }) {
  const text = watch("answereText") || "";
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <p className="text-white mt-2">Words: {count}</p>
  );
}

// New grammar check using ChatGPT directly from the client (fetch key from secret proxy)
async function checkSpelling(watchFn, setSpellErrorsFn, setSpellCheckingFn, explicitText) {
  const text = (explicitText !== undefined && explicitText !== null)
    ? explicitText
    : (watchFn && watchFn("answereText")) || "";
  if (!text.trim()) {
    return { issues: [], corrected: null, score: null };
  }
  setSpellCheckingFn && setSpellCheckingFn(true);
  try {
    // get api key from your secret proxy
    const keyResp = await fetch('https://api-secret.vercel.app/api/get-api-key', { method: 'POST' });
    if (!keyResp.ok) {
      console.error('get-api-key failed', await keyResp.text());
      return { issues: [], corrected: null, score: null };
    }
    const keyData = await keyResp.json();
    const OPENAI_KEY = keyData?.apiKey;
    if (!OPENAI_KEY) {
      console.error('No API key returned from proxy');
      return { issues: [], corrected: null, score: null };
    }

      const system = `You are an assistant that evaluates short written responses for the Duolingo English Test (DET) "Write about the photo" task. For the input text, return ONLY a JSON object with shape: { "corrected": string, "score": number, "issues": [ { "original": string, "replacement": string, "explanation": string }, ... ] }. Score must be 0-100 and reflect grammar/fluency/vocabulary for DET practice. Be concise. Do not add any other text.`;
    const user = `Text: """${text.replace(/"""/g, '"')}"""`;

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 800,
      temperature: 0.2,
    };

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!openaiResp.ok) {
      console.error('OpenAI call failed', await openaiResp.text());
      return { issues: [], corrected: null, score: null };
    }

    const openaiData = await openaiResp.json();
    const content = openaiData.choices?.[0]?.message?.content || '';

    // parse JSON (tolerant)
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch (e2) { parsed = null; }
      }
    }

    if (!parsed) {
      console.error('Failed to parse model JSON', content);
      return { issues: [], corrected: null, score: null };
    }

    const corrected = parsed.corrected || null;
    const score = typeof parsed.score === 'number' ? parsed.score : null;
    const issuesRaw = Array.isArray(parsed.issues) ? parsed.issues : [];

    const issues = issuesRaw.map((it) => {
      const original = it.original || '';
      const offset = original ? text.indexOf(original) : -1;
      return {
        offset: offset >= 0 ? offset : 0,
        length: original ? original.length : 0,
        word: original,
        replacements: it.replacement ? [it.replacement] : [],
        message: it.explanation || '',
      };
    });

    return { issues, corrected, score };
  } catch (err) {
    console.error('checkSpelling (client -> OpenAI) failed', err);
    return { issues: [], corrected: null, score: null };
  } finally {
    setSpellCheckingFn && setSpellCheckingFn(false);
  }
}

// applySuggestion helper removed — Apply buttons were removed per user request.

function removeError(idx, setSpellErrorsFn) {
  setSpellErrorsFn && setSpellErrorsFn((prev) => prev.filter((_, i) => i !== idx));
}
