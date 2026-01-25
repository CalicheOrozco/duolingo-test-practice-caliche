import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { pushSectionResult } from '../utils/fullTestResults';
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import DifficultyBadge from './DifficultyBadge';

function FillIntheBlanksComp() {
  const { register, handleSubmit, setFocus, getValues, reset } = useForm();

  const [allItems, setAllItems] = useState([]);
  const [frases, setFrases] = useState([]); // remaining questions in the round
  const [frase, setFrase] = useState(null);
  const [formData, setFormData] = useState(null);
  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // pre-start controls
  const [selectedSeconds, setSelectedSeconds] = useState(20);
  const [selectedDifficulty, setSelectedDifficulty] = useState("any");

  const location = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const d = params.get('difficulty');
      if (d) setSelectedDifficulty(d);
    } catch (e) {}
  }, [location.search]);

  // Auto-start when running Full Test
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && !isStarted) {
        const doStart = () => {
          setTotalCorrect(0);
          setTotalIncorrect(0);
          setCorrectList([]);
          setWrongList([]);
          setFormData(null);
          setSubmited(false);
          setFrase(null);
          setAnsweredCount(0);

          const pool = selectedDifficulty === 'any'
            ? [...allItems]
            : allItems.filter((item) => item.difficulty === selectedDifficulty);

          const desired = 6 + Math.floor(Math.random() * 4);
          const count = Math.min(desired, pool.length);
          const indices = new Set();
          while (indices.size < count) indices.add(Math.floor(Math.random() * pool.length));
          const roundQuestions = Array.from(indices).map((i) => pool[i]);
          setFrases(roundQuestions);
          setTotalQuestions(roundQuestions.length);
          setIsStarted(true);
        };

        if (allItems && allItems.length > 0) doStart();
        else {
          const id = setInterval(() => {
            if (allItems && allItems.length > 0) {
              doStart();
              clearInterval(id);
            }
          }, 150);
        }
      }
    } catch (e) {}
  }, [location.search, isStarted, allItems, selectedDifficulty]);

  // round results and progress
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalIncorrect, setTotalIncorrect] = useState(0);
  const [correctList, setCorrectList] = useState([]);
  const [wrongList, setWrongList] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Keep totals in sync with the visible lists to avoid mismatched counts
  useEffect(() => {
    setTotalCorrect(correctList.length);
    setTotalIncorrect(wrongList.length);
  }, [correctList, wrongList]);

  // derive answeredCount from lists to avoid double increments
  useEffect(() => {
    setAnsweredCount(correctList.length + wrongList.length);
  }, [correctList, wrongList]);

  const getFrases = async () => {
    const response = await fetch("dataFillIntheBlanks.json");
    const data = await response.json();
    setAllItems(data);
  };

  const startRound = () => {
    // reset round state
    setTotalCorrect(0);
    setTotalIncorrect(0);
    setCorrectList([]);
    setWrongList([]);
    setFormData(null);
    setSubmited(false);
    setFrase(null);
    setAnsweredCount(0);

    // select pool by difficulty
    const pool = selectedDifficulty === "any"
      ? [...allItems]
      : allItems.filter((item) => item.difficulty === selectedDifficulty);

    // pick random round size between 6 and 9
    const desired = 6 + Math.floor(Math.random() * 4); // 6–9
    const count = Math.min(desired, pool.length);

    // random unique selection
    const indices = new Set();
    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * pool.length));
    }
    const roundQuestions = Array.from(indices).map((i) => pool[i]);

    setFrases(roundQuestions);
    setTotalQuestions(roundQuestions.length);
    setIsStarted(true);
  };

  const getRandomFrase = () => {
    console.debug('[Fill] getRandomFrase called, frases.length=', frases.length);
    if (frases.length === 0) {
      setFrase(undefined);
      return;
    }
    const randomNumero = Math.floor(Math.random() * frases.length);
    const randomFrase = frases[randomNumero];
    setFrase(randomFrase);
    const newFrases = [...frases];
    newFrases.splice(randomNumero, 1);
    setFrases(newFrases);
    restart();
  };

  const restart = () => {
    setSubmited(false);
    reset();
  };

  useEffect(() => {
    getFrases();
  }, []);

  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const timeoutRef = useRef(null);

  // Auto-advance after round results when running Full Test (skip showing results)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && frase === undefined && isStarted) {
        const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
        const idx = order.indexOf(window.location.pathname);
        const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
        if (next) navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(selectedDifficulty)}`);
      }
    } catch (e) {}
  }, [frase, isStarted, location.search, selectedDifficulty, navigate]);

  // when round starts and there is no current question, pull one
  useEffect(() => {
    if (isStarted && frase === null) {
      getRandomFrase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElementName = document.activeElement.name;
      const activeElementNameArray = activeElementName?.split("-") || [];
      const finalNumbers = activeElementNameArray.filter((item) => !isNaN(item));
      finalNumbers.map((item, index) => {
        finalNumbers[index] = parseInt(item);
        return finalNumbers[index];
      });

      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        if (finalNumbers.length === 1) {
          const path = `answer-${finalNumbers[0]}-1`;
          if (getValues(path) || getValues(path) === "") {
            setFocus(path);
          } else {
            setFocus(`answer-${finalNumbers[0] + 1}`);
          }
        } else {
          const path = `answer-${finalNumbers[0]}-${finalNumbers[1] + 1}`;
          if (getValues(path) || getValues(path) === "") {
            setFocus(path);
          } else {
            setFocus(`answer-${finalNumbers[0] + 1}`);
          }
        }
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        let prevPath = frase?.correct_answers?.[finalNumbers[0] - 1];
        if (!prevPath) return;
        if (finalNumbers.length === 1) {
          const previousInput =
            finalNumbers[0] > 0
              ? prevPath.word.length - prevPath.start - 1
              : frase.correct_answers[0].word.length - frase.correct_answers[0].start - 1;
          const path = `answer-${finalNumbers[0] - 1}-${previousInput}`;
          if (getValues(path) || getValues(path) === "") {
            setFocus(path);
          }
          if (previousInput === 0) {
            let path = `answer-${finalNumbers[0] - 1}`;
            if (getValues(path) || getValues(path) === "") {
              setFocus(path);
            }
          }
        } else {
          if (
            getValues(`answer-${finalNumbers[0]}-${finalNumbers[1] - 1}`) ||
            getValues(`answer-${finalNumbers[0]}-${finalNumbers[1] - 1}`) === ""
          ) {
            setFocus(`answer-${finalNumbers[0]}-${finalNumbers[1] - 1}`);
          } else {
            setFocus(`answer-${finalNumbers[0]}`);
          }
        }
      }

      if (e.key === "Backspace") {
        const currentInputValue = document.activeElement.value;
        if (currentInputValue === "") {
          if (finalNumbers.length === 1) {
            let prevPath = frase.correct_answers[finalNumbers[0] - 1];
            const previousInput =
              finalNumbers[0] > 0
                ? prevPath.word.length - prevPath.start - 1
                : frase.correct_answers[0].word.length - frase.correct_answers[0].start - 1;
            const path = `answer-${finalNumbers[0] - 1}-${previousInput}`;
            if (getValues(path) || getValues(path) === "") {
              setFocus(path);
            }
            if (previousInput === 0) {
              let path = `answer-${finalNumbers[0] - 1}`;
              if (getValues(path) || getValues(path) === "") {
                setFocus(path);
              }
            }
          } else {
            if (
              getValues(`answer-${finalNumbers[0]}-${finalNumbers[1] - 1}`) ||
              getValues(`answer-${finalNumbers[0]}-${finalNumbers[1] - 1}`) === ""
            ) {
              setFocus(`answer-${finalNumbers[0]}-${finalNumbers[1] - 1}`);
            } else {
              setFocus(`answer-${finalNumbers[0]}`);
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setFocus, getValues, frase]);

  const onSubmit = (data) => {
    console.debug('[Fill] onSubmit start', { submitting: submittingRef.current, time: Date.now() });
    if (submittingRef.current) {
      console.debug('[Fill] onSubmit ignored because submittingRef is true');
      return;
    }
    submittingRef.current = true;
    let counter = 0;
    let newData = data;
    for (const [key] of Object.entries(newData)) {
      if (key.includes(`-${counter}-`)) {
        const mainAnswer = `answer-${counter}`;
        let newValue = newData[mainAnswer].toLowerCase() + newData[key].toLowerCase();
        newData[mainAnswer] = newValue;
        delete newData[key];
      }
      if (key === `answer-${counter + 1}`) {
        counter++;
      }
      if (key === `answer-${counter}`) {
        newData[key] = newData[key].toLowerCase();
      }
    }
    setFormData(data);
    setSubmited(true);

      

    counter = 0;
    const correct_answers = afterAnswers.reduce((acc, item, index) => {
      acc[`answer-${index}`] = item;
      return acc;
    }, {});

    for (let i = 0; i < Object.keys(correct_answers).length; i++) {
      if (correct_answers[`answer-${i}`] === data[`answer-${i}`]) {
        counter++;
      }
    }
    const isAllCorrect = JSON.stringify(data) === JSON.stringify(correct_answers);
    // answeredCount will be incremented only when this submission actually adds a record
    const record = { sentence: frase.sentence, befores: beforeAnswers.slice(), expected: afterAnswers.slice(), received: Object.keys(correct_answers).map((k, i) => data[`answer-${i}`] || "") };
    if (isAllCorrect) {
      setCorrectList((arr) => {
        try {
          const exists = arr.some((el) => JSON.stringify(el) === JSON.stringify(record));
          if (exists) return arr;
          return [...arr, record];
        } catch (e) {
          return [...arr, record];
        }
      });
    } else {
      setWrongList((arr) => {
        try {
          const exists = arr.some((el) => JSON.stringify(el) === JSON.stringify(record));
          if (exists) return arr;
          return [...arr, record];
        } catch (e) {
          return [...arr, record];
        }
      });
    }

    // If running Full Test and this was the last question, record summary and advance immediately
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && frases.length === 0) {
        // compute accurate totals including the record we just added (state updates are async)
        let addedToCorrect = false;
        let addedToWrong = false;
        try {
          const existsCorrect = (correctList || []).some((el) => JSON.stringify(el) === JSON.stringify(record));
          addedToCorrect = isAllCorrect && !existsCorrect;
        } catch (e) {}
        try {
          const existsWrong = (wrongList || []).some((el) => JSON.stringify(el) === JSON.stringify(record));
          addedToWrong = !isAllCorrect && !existsWrong;
        } catch (e) {}
        const finalCorrect = (correctList.length || 0) + (addedToCorrect ? 1 : 0);
        const finalIncorrect = (wrongList.length || 0) + (addedToWrong ? 1 : 0);
        try { pushSectionResult({ module: 'fill-in-the-blanks', totalQuestions: totalQuestions || 0, totalCorrect: finalCorrect, totalIncorrect: finalIncorrect, timestamp: Date.now() }); } catch(e) {}
        const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
        const idx = order.indexOf(window.location.pathname);
        const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
        if (next) { navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(selectedDifficulty)}`); }
      }
    } catch (e) {}
    // auto-advance to next question after short delay, if there are more
    if (frases.length === 0) {
      // mark round as finished so UI shows results-only (no last question above results)
      setFrase(undefined);
    } else {
      // clear any previously scheduled advance to avoid double-advancing
      try { if (timeoutRef.current) clearTimeout(timeoutRef.current); } catch (e) {}
      timeoutRef.current = setTimeout(() => {
        console.debug('[Fill] advancing to next question via timeout, frases.length=', frases.length);
        if (frases.length > 0) {
          getRandomFrase();
        }
        // allow next submissions after advancing
        submittingRef.current = false;
        timeoutRef.current = null;
      }, 800);
    }

    // if there are no more questions we can clear the submitting flag so results UI can accept actions
    if (frases.length === 0) {
      try { if (timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current = null; } catch (e) {}
      submittingRef.current = false;
    }
  };

  let beforeAnswers = [];
  let afterAnswers = [];

  const renderSentenceWithAnswers = (sent, befores, afters, user) => {
    return (
      <div className="bg-[#737373] rounded-xl p-3 my-2 text-lg">
        {sent.map((item, index) => {
          const nextToken = sent[index + 1] || "";
          const nextIsPunct = /^[\\.,:;!?]/.test((nextToken || "").trim());
          const needsLeadingSpace = item && !/\s$/.test(item);
          const leading = needsLeadingSpace ? " " : "";
          const trailing = !nextIsPunct ? " " : "";
          return (
            <span className="inline" key={`sum-div-${index}`}>
              <span>{item}</span>
              <span className="inline whitespace-nowrap break-normal ">
                {befores[index] ? `${leading}${befores[index]}` : (needsLeadingSpace ? leading : "")}
                {afters[index] !== undefined ? (
                  user ? (
                    user[index] === afters[index] ? (
                      <span className={`font-bold text-green-600`}>{afters[index]}{trailing}</span>
                    ) : user[index] ? (
                      <span className="font-bold text-red-600">{user[index]}{trailing}</span>
                    ) : (
                      <span className={`font-bold text-yellow-400`}>{afters[index]}{trailing}</span>
                    )
                  ) : (
                    <span className={`font-bold text-green-600`}>{afters[index]}{trailing}</span>
                  )
                ) : null}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] flex items-center py-3 justify-center">
      {isStarted ? (
        frase ? (
          <div className="px-10">
            <div className="w-full flex justify-between items-center mt-3">
              <div className="flex items-center gap-3 text-white font-semibold">
                <div>Question {submited ? answeredCount : answeredCount + 1} of {totalQuestions}</div>
                <DifficultyBadge difficulty={frase?.difficulty || selectedDifficulty} />
              </div>
              <ReactCountdownClock
                weight={10}
                seconds={!submited ? selectedSeconds : 0}
                color="#fff"
                size={80}
                paused={submited}
                onComplete={() => { if (!submittingRef.current) { handleSubmit(onSubmit)(); } }}
              />
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className=" text-4xl font-bold  text-white text-center py-5">Complete the sentence with the correct word.</h1>
              <div className="flex flex-wrap p-3">
                {frase.sentence.map((item, index) => {
                  // safe access to correct_answers for this index
                  const ca = (frase && Array.isArray(frase.correct_answers)) ? frase.correct_answers[index] : null;
                  if (ca) {
                    const limit = ca.start || 0;
                    const answers = ca.word || '';
                    const before = answers.slice(0, limit);
                    const after = answers.slice(limit);
                    beforeAnswers.push(before);
                    afterAnswers.push(after);
                  }
                  const inputLen = ca ? Math.max(0, (ca.word ? ca.word.length : 0) - (ca.start || 0)) : 0;
                  // (removed debug logs)
                  // fallback: if token contains underscores or explicit placeholder, render a single input
                  const token = frase.sentence[index] || '';
                  const hasPlaceholder = /_+/.test(token) || token.trim() === '';
                  const usedInputLen = ca && inputLen > 0 ? inputLen : (hasPlaceholder ? 1 : 0);
                  const shouldRenderInputs = usedInputLen > 0;
                  if (!ca && hasPlaceholder) {
                    // fallback used (debug logs removed)
                  }

                  return (
                    <div className="flex flex-wrap" key={`div-${index}`}>
                      <span className="text-xl text-white mt-1" key={`sentence-${index}`}>
                        {item}
                      </span>
                      <div
                        className={
                          frase.sentence[index + 1]?.charAt(0) === "." ||
                          frase.sentence[index + 1]?.charAt(0) === ","
                            ? `flex pl-1 mt-1`
                            : "flex px-1 mt-1"
                        }
                        key={`inputContainer-${index}`}
                      >
                        {frase.correct_answers[index] ? (
                          <span className="text-xl text-white" key={`answerWord-${index}`}>
                            {" "}
                            {beforeAnswers[index]}{" "}
                          </span>
                        ) : null}
                        {!submited ? (
                          index === frase.sentence.length - 1 ? null : (
                            shouldRenderInputs ? (
                              Array.from({ length: usedInputLen }, (v, i) => {
                                const name = i > 0 ? `answer-${index}-${i}` : `answer-${index}`;
                                const nextName = i > 0 ? `answer-${index}-${i + 1}` : `answer-${index + 1}`;
                                  return (
                                    <input
                                      type="text"
                                      key={`input-${index}-${i}`}
                                      name={name}
                                      defaultValue={""}
                                      maxLength={1}
                                      inputMode="text"
                                      aria-label={`answer ${index} ${i}`}
                                        className="bg-[#737373] border-2 border-[#8A8EA6] text-orange-600 focus:border-orange-600 outline-none text-xl w-6 h-7 text-center rounded-t-md font-bold"
                                        {...register(name, {
                                          onChange: (e) => {
                                            // keep single character
                                            if (e.target.value.length > 1) {
                                              e.target.value = e.target.value.slice(-1);
                                            }
                                            // try to focus next right away for better mobile support
                                            const tryFocusNext = () => {
                                              try {
                                                const els = document.getElementsByName(nextName);
                                                if (els && els.length > 0) {
                                                  els[0].focus();
                                                  if (els[0].select) els[0].select();
                                                  return true;
                                                }
                                              } catch (err) {}
                                              try {
                                                const el = document.querySelector(`[name="${nextName}"]`);
                                                if (el) {
                                                  el.focus();
                                                  if (el.select) el.select();
                                                  return true;
                                                }
                                              } catch (err) {}
                                              try {
                                                // fallback: find all answer inputs and focus the next one in DOM order
                                                const all = Array.from(document.querySelectorAll('input[name^="answer-"]'));
                                                const idx = all.indexOf(e.target);
                                                if (idx >= 0 && idx < all.length - 1) {
                                                  all[idx + 1].focus();
                                                  if (all[idx + 1].select) all[idx + 1].select();
                                                  return true;
                                                }
                                              } catch (err) {}
                                              try { setFocus(nextName); } catch (err) {}
                                              return false;
                                            };
                                            if (e.target.value && e.target.value.length >= 1) {
                                              setTimeout(tryFocusNext, 0);
                                            }
                                          },
                                        })}
                                        onKeyUp={(e) => {
                                          // move to next input when a visible character is entered (desktop)
                                          const val = e.target.value || "";
                                          if (val.length >= 1) {
                                            setTimeout(() => {
                                              try {
                                                const els = document.getElementsByName(nextName);
                                                if (els && els.length > 0) {
                                                  els[0].focus();
                                                  if (els[0].select) els[0].select();
                                                  return;
                                                }
                                              } catch (err) {}
                                              try { setFocus(nextName); } catch (err) {}
                                              try {
                                                const all = Array.from(document.querySelectorAll('input[name^="answer-"]'));
                                                const idx = all.indexOf(e.target);
                                                if (idx >= 0 && idx < all.length - 1) {
                                                  all[idx + 1].focus();
                                                  if (all[idx + 1].select) all[idx + 1].select();
                                                }
                                              } catch (err) {}
                                            }, 0);
                                          }
                                        }}
                                        onPaste={(e) => {
                                          // if user pastes multiple chars, keep only the first and move focus
                                          const paste = (e.clipboardData || window.clipboardData).getData('text');
                                          if (paste && paste.length > 0) {
                                            e.preventDefault();
                                            const ch = paste.charAt(0);
                                            e.target.value = ch;
                                            try {
                                              // update react-hook-form internal value
                                              const evt = new Event('input', { bubbles: true });
                                              e.target.dispatchEvent(evt);
                                            } catch (err) {}
                                            setTimeout(() => {
                                              try {
                                                const els = document.getElementsByName(nextName);
                                                if (els && els.length > 0) {
                                                  els[0].focus();
                                                  if (els[0].select) els[0].select();
                                                  return;
                                                }
                                              } catch (err) {}
                                              try { setFocus(nextName); } catch (err) {}
                                              try {
                                                const all = Array.from(document.querySelectorAll('input[name^="answer-"]'));
                                                const idx = all.indexOf(e.target);
                                                if (idx >= 0 && idx < all.length - 1) {
                                                  all[idx + 1].focus();
                                                  if (all[idx + 1].select) all[idx + 1].select();
                                                }
                                              } catch (err) {}
                                            }, 0);
                                          }
                                        }}
                                    />
                                  );
                              })
                            ) : null
                          )
                        ) : formData[`answer-${index}`] === afterAnswers[index] ? (
                          <span className="text-xl text-green-600 font-bold" key={`answer-${index}`}>
                            {afterAnswers[index]}
                          </span>
                        ) : formData[`answer-${index}`] ? (
                          <span className="text-xl text-red-600 font-bold" key={`answer-${index}`}>
                            {formData[`answer-${index}`]}
                          </span>
                        ) : (
                          <span className="text-xl text-yellow-400 font-bold" key={`answer-${index}`}>
                            {afterAnswers[index]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!submited ? (
                <div className="w-full flex justify-end ">
                  <input
                    type="submit"
                    value="Submit"
                    className="mt-6 bg-blue-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                  />
                </div>
              ) : null}
            </form>

          </div>
        ) : frase === undefined ? (
          // When round finished we want to show results (no last question above results)
          <div className="mt-6 w-full max-w-4xl text-white p-4">
            <h2 className="text-3xl font-bold text-center mb-3">Results</h2>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="text-lg">Total: <span className="font-semibold">{totalQuestions}</span></div>
              <div className="text-lg text-green-400">Correct: <span className="font-semibold">{totalCorrect}</span></div>
              <div className="text-lg text-red-400">Incorrect: <span className="font-semibold">{totalIncorrect}</span></div>
              <div className="ml-auto text-lg">Score: <span className="font-bold">{totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0}%</span></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-green-400 text-xl font-semibold mb-2">Correct answers</h3>
                <div className="flex flex-col gap-3">
                  {correctList.length > 0 ? correctList.map((rec, idx) => (
                    <div key={`corr-${idx}`} className="p-3 rounded border border-green-700 bg-green-900/5">
                      {renderSentenceWithAnswers(rec.sentence, rec.befores, rec.expected, rec.received)}
                    </div>
                  )) : <div className="text-sm text-gray-300">No correct answers this round.</div>}
                </div>
              </div>

              <div>
                <h3 className="text-red-400 text-xl font-semibold mb-2">Incorrect answers</h3>
                <div className="flex flex-col gap-3">
                  {wrongList.length > 0 ? wrongList.map((rec, idx) => (
                    <div key={`wrong-${idx}`} className="p-3 rounded border border-red-700 bg-red-900/5">
                      <div className="mb-2 text-sm text-red-300 font-semibold">Your answer</div>
                      {renderSentenceWithAnswers(rec.sentence, rec.befores, rec.expected, rec.received)}

                      <div className="mt-4 p-3 rounded border border-green-700 bg-green-900/5">
                        <div className="mb-2 text-sm text-green-300 font-semibold">Correct answers</div>
                        {renderSentenceWithAnswers(rec.sentence, rec.befores, rec.expected, null)}
                      </div>
                    </div>
                  )) : <div className="text-sm text-gray-300">No incorrect answers this round.</div>}
                </div>
              </div>
            </div>

            <div className="w-full flex justify-center mt-6">
              <button
                className="mt-6 bg-blue-500 text-white p-2 px-6 cursor-pointer rounded-xl"
                onClick={() => setIsStarted(false)}
              >
                Play again
              </button>
            </div>
          </div>
        ) : (
          <h1 className="text-3xl text-white">Loading...</h1>
        )
      ) : (
        <div className="flex flex-col items-center text-center px-5 md:px-0">
          <h1 className="text-4xl text-white font-bold mb-3 ">Fill in the blanks</h1>
          <div className="flex flex-col items-center gap-3 text-white">
            <div>
              <span className="mr-2">Seconds:</span>
              <select
                className="text-black px-2 py-1 rounded"
                value={selectedSeconds}
                onChange={(e) => setSelectedSeconds(parseInt(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={15}>15</option>
                <option value={10}>10</option>
              </select>
            </div>
            <div>
              <span className="mr-2">Difficulty:</span>
              <select
                className="text-black px-2 py-1 rounded"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="any">Any</option>
                <option value="basic">Basic</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-300">Available exercises: {selectedDifficulty === 'any' ? allItems.length : allItems.filter(i => i.difficulty === selectedDifficulty).length}</div>
          <input
            type="submit"
            value="Start"
            className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
            onClick={() => {
              startRound();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default FillIntheBlanksComp;

