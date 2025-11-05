import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import { LazyLoadImage } from 'react-lazy-load-image-component';


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

  let topics = [
    // Topics suited for Duolingo English Test practice
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
    if (!topics || topics.length === 0) return;
    const randomNumero = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomNumero];
    setTopic(randomTopic);
    restart();
    // remove used topic from pool
    topics = topics.filter((t) => t !== randomTopic);
    // fetch image for the chosen topic and preload it
    await getImg(randomTopic);
  };

  // function to restart the form
  const restart = () => {
    setIsCorrect(null);
    setSubmited(false);
    reset();
  };

  const next = () => {
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
      const result = await checkSpelling(null, setSpellErrors, null, original);
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
    })();
  };

  useEffect(() => {
    // on mount, pick a topic and fetch its image
    getTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {isStarted ? (
        topic ? (
          <div >
            {/* Countdown */}
            <div className="w-full flex justify-end mt-3">
              <ReactCountdownClock
                weight={10}
                seconds={!submited ? selectedTime : 0}
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
              <div className="flex justify-around p-1 items-center flex-col md:flex-row  gap-6 md:gap-5">
                <LazyLoadImage
                  className="rounded max-w-[400px] w-full h-auto"
                  src={urlImg}
                  alt={altImg ? altImg : "Loading..."}
                />
               
                {/* text area */}
                <div className="w-full md:w-1/2">
                  <textarea
                    className="border-2 border-gray-700 text-black focus:border-orange-600 outline-none text-xl w-full h-64 p-1 rounded-md font-bold"
                    placeholder="Your response"
                    spellCheck={true}
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

                  {/* Spelling result list */}
                  {submited && spellErrors.length > 0 && (
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
                  <input
                    type="submit"
                    value="Submit"
                    className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                  />
                </div>
              ) : null}
            </form>
            {/* button repeat and next */}
            <>
              {submited ? (
                <>
                  <div className="text-center">
                    <p className="text-xl text-center text-green-600 font-bold">Your response:</p>
                    <p className="text-lg text-white">{answer}</p>
                    {grammarScore !== null ? (
                      <p className="text-sm text-gray-300 mt-2">Score (DET practice): {grammarScore}/100</p>
                    ) : null}
                    {suggestedText ? (
                      <>
                        <p className="text-xl text-center text-yellow-400 font-bold mt-3">Suggested correction:</p>
                        <p className="text-lg text-white">{suggestedText}</p>
                      </>
                    ) : null}
                  </div>

                  <div className="w-full flex justify-between">
                    <input
                      type="submit"
                      value="Repeat"
                      onClick={() => {
                        restart();
                      }}
                      className="mt-6 bg-blue-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                    />
                    <input
                      type="submit"
                      value="Next"
                      onClick={() => {
                        next();
                      }}
                      className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                    />
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
        ) : urlImg === null ? ( <h1 className="text-3xl text-white">Loading...</h1> ) 
         : (
          <h1 className="text-xl text-white">The images are over 😢😢</h1>
        )
      ) : (
        // main page with the start menu
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
              className="mt-6 bg-green-500 text-white p-2 w-32 rounded-xl"
              onClick={() => {
                setIsStarted(true);
              }}
            >
              Start
            </button>
          </div>
        </div>
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

// New grammar check using our serverless ChatGPT proxy
async function checkSpelling(watchFn, setSpellErrorsFn, setSpellCheckingFn, explicitText) {
  const text = (explicitText !== undefined && explicitText !== null)
    ? explicitText
    : (watchFn && watchFn("answereText")) || "";
  if (!text.trim()) {
    return { issues: [], corrected: null, score: null };
  }
  setSpellCheckingFn && setSpellCheckingFn(true);
  try {
    const resp = await fetch('/api/checkGrammar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) {
      console.error('checkGrammar failed', await resp.text());
      return { issues: [], corrected: null, score: null };
    }
    const data = await resp.json();
    // data shape expected: { corrected: string, score: number, issues: [{ original, replacement, explanation }] }
    const corrected = data.corrected || null;
    const score = typeof data.score === 'number' ? data.score : null;

    const issues = (data.issues || []).map((it) => {
      const original = it.original || '';
      // try to find offset of original substring in text
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
    console.error('checkSpelling (ChatGPT) failed', err);
    return { issues: [], corrected: null, score: null };
  } finally {
    setSpellCheckingFn && setSpellCheckingFn(false);
  }
}

// applySuggestion helper removed — Apply buttons were removed per user request.

function removeError(idx, setSpellErrorsFn) {
  setSpellErrorsFn && setSpellErrorsFn((prev) => prev.filter((_, i) => i !== idx));
}
