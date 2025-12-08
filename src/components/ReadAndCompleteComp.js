import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { pushSectionResult } from '../utils/fullTestResults';
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import DifficultyBadge from './DifficultyBadge';

function ReadAndCompleteComp() {
  const { register, handleSubmit, setFocus, getValues, reset } = useForm();

  // data and round state
  const [allItems, setAllItems] = useState([]);
  const [frases, setFrases] = useState([]); // remaining in round
  const [frase, setFrase] = useState(null);

  // per-question state
  const [formData, setFormData] = useState(null);
  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // pre-start configuration
  const [selectedSeconds, setSelectedSeconds] = useState(180); // 3:00
  const [selectedDifficulty, setSelectedDifficulty] = useState("any"); // basic/medium/advanced/any

  const location = useLocation();
  const isFullTest = (() => {
    try {
      const params = new URLSearchParams(location.search);
      return params.get("fullTest") === "1";
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

  // Auto-start for Full Test: start a round automatically
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('fullTest') === '1' && !isStarted) {
        const doStart = () => {
          setFormData(null);
          setSubmited(false);
          setAnsweredCount(0);
          setTotalCorrect(0);
          setTotalIncorrect(0);
          setCorrectList([]);
          setWrongList([]);
          setFrase(null);

          const pool =
            selectedDifficulty === "any"
              ? [...allItems]
              : allItems.filter(
                  (it) =>
                    (it.difficulty || "").toLowerCase() ===
                    selectedDifficulty.toLowerCase()
                );

          const desired = 3 + Math.floor(Math.random() * 4);
          const count = Math.min(desired, pool.length);
          const indices = new Set();
          while (indices.size < count && pool.length > 0) {
            indices.add(Math.floor(Math.random() * pool.length));
          }
          const round = Array.from(indices).map((i) => pool[i]);

          setFrases(round);
          setTotalQuestions(round.length);
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

  // round progress + results
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalIncorrect, setTotalIncorrect] = useState(0);
  const [correctList, setCorrectList] = useState([]);
  const [wrongList, setWrongList] = useState([]);

  // fetch all items
  const loadAll = async () => {
    const response = await fetch("dataReadAndComplete.json");
    const data = await response.json();
    setAllItems(data);
  };

  // prepare a new round
  const startRound = () => {
    setFormData(null);
    setSubmited(false);
    setAnsweredCount(0);
    setTotalCorrect(0);
    setTotalIncorrect(0);
    setCorrectList([]);
    setWrongList([]);
    setFrase(null);

    const pool =
      selectedDifficulty === "any"
        ? [...allItems]
        : allItems.filter(
            (it) =>
              (it.difficulty || "").toLowerCase() ===
              selectedDifficulty.toLowerCase()
          );

    // random size 3–6
    const desired = 3 + Math.floor(Math.random() * 4);
    const count = Math.min(desired, pool.length);

    const indices = new Set();
    while (indices.size < count && pool.length > 0) {
      indices.add(Math.floor(Math.random() * pool.length));
    }
    const round = Array.from(indices).map((i) => pool[i]);

    setFrases(round);
    setTotalQuestions(round.length);
    setIsStarted(true);
  };

  // take a random next phrase from remaining
  const getRandomFrase = () => {
    if (frases.length === 0) {
      setFrase(undefined);
      return;
    }
    const randomNumero = Math.floor(Math.random() * frases.length);
    const next = frases[randomNumero];
    setFrase(next);
    const copy = [...frases];
    copy.splice(randomNumero, 1);
    setFrases(copy);
    restart();
  };

  // reset per-question UI
  const restart = () => {
    setFormData(null);
    setSubmited(false);
    reset();
  };

  // initial load
  useEffect(() => {
    loadAll();
  }, []);

  const navigate = useNavigate();

  // Auto-advance after results when running full test
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

  // when round starts, pull first question
  useEffect(() => {
    if (isStarted && frase === null) {
      getRandomFrase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  // keyboard nav (same as original)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElementName = document.activeElement.name;
      const activeElementNameArray = activeElementName?.split("-") || [];
      const finalNumbers = activeElementNameArray.filter(
        (item) => !isNaN(item)
      );
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
              : frase.correct_answers[0].word.length -
                frase.correct_answers[0].start -
                1;
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
            if (!prevPath) return;
            const previousInput =
              finalNumbers[0] > 0
                ? prevPath.word.length - prevPath.start - 1
                : frase.correct_answers[0].word.length -
                  frase.correct_answers[0].start -
                  1;
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
    // join the answers
    let counter = 0;
    let newData = data;
    for (const [key] of Object.entries(newData)) {
      if (key.includes(`-${counter}-`)) {
        const mainAnswer = `answer-${counter}`;
        let newValue =
          (newData[mainAnswer] || "").toLowerCase() +
          (newData[key] || "").toLowerCase();
        newData[mainAnswer] = newValue;
        delete newData[key];
      }
      if (key === `answer-${counter + 1}`) {
        counter++;
      }
      if (key === `answer-${counter}` && newData[key]) {
        newData[key] = newData[key].toLowerCase();
      }
    }
    setFormData(data);
    setSubmited(true);

    counter = 0;
    const beforesLocal = [];
    const aftersLocal = [];

    if (frase?.correct_answers) {
      frase.correct_answers.forEach((ca) => {
        const word = ca.word || "";
        const limit = ca.start || 0;
        beforesLocal.push(word.slice(0, limit));
        aftersLocal.push(word.slice(limit));
      });
    }

    const correct_answers = aftersLocal.reduce((acc, item, index) => {
      acc[`answer-${index}`] = item;
      return acc;
    }, {});

    for (let i = 0; i < Object.keys(correct_answers).length; i++) {
      if (correct_answers[`answer-${i}`] === data[`answer-${i}`]) {
        counter++;
      }
    }

    setAnsweredCount((v) => v + 1);

    const record = {
      sentence: frase.sentence,
      befores: beforesLocal.slice(),
      expected: aftersLocal.slice(),
      received: Object.keys(correct_answers).map(
        (k, i) => data[`answer-${i}`] || ""
      ),
    };

    if (counter === Object.keys(correct_answers).length) {
      setTotalCorrect((v) => v + 1);
      setCorrectList((arr) => [...arr, record]);
    } else {
      setTotalIncorrect((v) => v + 1);
      setWrongList((arr) => [...arr, record]);
    }

    // auto-advance after a short delay, or immediately navigate when running full test
    try {
      const params = new URLSearchParams(location.search);
      if (params.get("fullTest") === "1" && frases.length === 0) {
        try {
          // push section summary to session storage for final aggregation
          pushSectionResult({ module: 'read-and-complete', totalQuestions: totalQuestions || 0, totalCorrect: totalCorrect || 0, totalIncorrect: totalIncorrect || 0, timestamp: Date.now() });
        } catch (e) {}
        const order = ['/read-and-select','/fill-in-the-blanks','/read-and-complete','/interactive-reading','/listening-test','/interactive-listening','/image-test','/interactive-writing','/speak-about-photo','/read-then-speak','/interactive-speaking','/speaking-sample','/writing-sample'];
        const idx = order.indexOf(window.location.pathname);
        const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
        if (next) navigate(`${next}?fullTest=1&difficulty=${encodeURIComponent(selectedDifficulty)}`);
      } else {
        setTimeout(() => {
          if (frases.length > 0) {
            getRandomFrase();
          }
        }, 800);
      }
    } catch (e) {}
  };

  let beforeAnswers = [];
  let afterAnswers = [];

  const renderSentenceWithAnswers = (sent, befores, afters, user) => {
    return (
      <div className="bg-[#737373] rounded-xl p-3 my-2 text-lg">
        {sent.map((item, index) => (
          <span className="inline" key={`sum-div-${index}`}>
            <span>{item}</span>
            <span className="inline whitespace-nowrap break-normal ">
              {befores[index] || ""}
              {afters[index] !== undefined ? (
                user ? (
                  user[index] === afters[index] ? (
                    <span className={`font-bold text-green-600`}>
                      {afters[index]}
                    </span>
                  ) : user[index] ? (
                    <span className="font-bold text-red-600">
                      {user[index]}
                    </span>
                  ) : (
                    <span className={`font-bold text-yellow-400`}>
                      {afters[index]}
                    </span>
                  )
                ) : (
                  <span className={`font-bold text-green-600`}>
                    {afters[index]}
                  </span>
                )
              ) : null}
            </span>
          </span>
        ))}
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
                onComplete={handleSubmit(onSubmit)}
              />
            </div>
            {/* Form with white space */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col items-center">
                <h1 className=" text-4xl font-bold  text-white text-center py-5">Type the missing letters to complete the text below</h1>
                
              </div>
              <div className="flex flex-wrap p-3">
                {frase.sentence.map((item, index) => {
                  const answerMeta =
                    frase.correct_answers &&
                    index < frase.correct_answers.length
                      ? frase.correct_answers[index]
                      : null;

                  if (answerMeta) {
                    const limit = answerMeta.start;
                    const answers = answerMeta.word;
                    const before = answers.slice(0, limit);
                    const after = answers.slice(limit);
                    beforeAnswers[index] = before;
                    afterAnswers[index] = after;
                  }

                  return (
                    <div className="flex flex-wrap" key={`div-${index}`}>
                      <span
                        className="text-lg text-white mt-1"
                        key={`sentence-${index}`}
                      >
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
                        {answerMeta ? (
                          <span
                            className="text-lg text-white"
                            key={`answerWord-${index}`}
                          >
                            {" "}
                            {beforeAnswers[index]}{" "}
                          </span>
                        ) : null}
                        {!submited ? (
                          // solo dibujar inputs cuando HAY respuesta correcta para ese índice
                          !answerMeta || index === frase.sentence.length - 1 ? null : (
                            Array.from(
                              {
                                length:
                                  answerMeta.word.length - answerMeta.start,
                              },
                              (v, i) =>
                                i > 0 ? (
                                  <input
                                    type="text"
                                    key={`input-${index}-${i}`}
                                    className="bg-[#737373] border-2 border-[#8A8EA6] text-orange-600 focus:border-orange-600 outline-none text-lg w-6 h-7 text-center rounded-t-md font-bold"
                                    {...register(`answer-${index}-${i}`, {
                                      onChange: (e) => {
                                        e.target.value.length >= 1
                                          ? e.target.value.length >= 2
                                            ? (e.target.value =
                                                e.target.value.slice(-1))
                                            : getValues(
                                                `answer-${index}-${i + 1}`
                                              ) !== undefined
                                            ? setFocus(
                                                `answer-${index}-${i + 1}`
                                              )
                                            : setFocus(`answer-${index + 1}`)
                                          : setFocus(`answer-${index}-${i}`);
                                      },
                                    })}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    key={`input-${index}`}
                                    className="bg-[#737373] border-2 border-[#8A8EA6] text-orange-600 focus:border-orange-600 outline-none text-lg w-6 h-7 text-center rounded-t-md font-bold"
                                    {...register(`answer-${index}`, {
                                      onChange: (e) => {
                                        e.target.value.length >= 1
                                          ? e.target.value.length >= 2
                                            ? (e.target.value =
                                                e.target.value.slice(-1))
                                            : getValues(
                                                `answer-${index}-${i + 1}`
                                              ) !== undefined
                                            ? setFocus(
                                                `answer-${index}-${i + 1}`
                                              )
                                            : setFocus(`answer-${index + 1}`)
                                          : setFocus(`answer-${index}`);
                                      },
                                    })}
                                  />
                                )
                            )
                          )
                        ) : answerMeta ? (
                          formData?.[`answer-${index}`] ===
                          afterAnswers[index] ? (
                            <span
                              className="text-lg text-green-600 font-bold"
                              key={`answer-${index}`}
                            >
                              {afterAnswers[index]}
                            </span>
                          ) : formData?.[`answer-${index}`] ? (
                            <span
                              className="text-lg text-red-600 font-bold"
                              key={`answer-${index}`}
                            >
                              {formData[`answer-${index}`]}
                            </span>
                          ) : (
                            <span
                              className="text-lg text-yellow-400 font-bold"
                              key={`answer-${index}`}
                            >
                              {afterAnswers[index]}
                            </span>
                          )
                        ) : null}
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

            {/* End of round summary when no more frases */}
            {submited && frases.length === 0 && !isFullTest && (
              <div className="mt-6 w-full flex justify-center items-center flex-col text-white p-4">
                <h2 className="text-3xl font-bold text-center mb-3">
                  Results
                </h2>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="text-lg">
                    Total:{" "}
                    <span className="font-semibold">{totalQuestions}</span>
                  </div>
                  <div className="text-lg text-green-400">
                    Correct:{" "}
                    <span className="font-semibold">{totalCorrect}</span>
                  </div>
                  <div className="text-lg text-red-400">
                    Incorrect:{" "}
                    <span className="font-semibold">{totalIncorrect}</span>
                  </div>
                  <div className="ml-auto text-lg">
                    Score:{" "}
                    <span className="font-bold">
                      {totalQuestions
                        ? Math.round(
                            (totalCorrect / totalQuestions) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-green-400 text-lg font-semibold mb-2">
                      Correct answers
                    </h3>
                    <div className="flex flex-col gap-3">
                      {correctList.length > 0 ? (
                        correctList.map((rec, idx) => (
                          <div
                            key={`corr-${idx}`}
                            className="p-3 rounded border border-green-700 bg-green-900/5"
                          >
                            {renderSentenceWithAnswers(
                              rec.sentence,
                              rec.befores || [],
                              rec.expected,
                              rec.received
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-300">
                          No correct answers this round.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-red-400 text-lg font-semibold mb-2">
                      Incorrect answers
                    </h3>
                    <div className="flex flex-col gap-3">
                      {wrongList.length > 0 ? (
                        wrongList.map((rec, idx) => (
                          <div
                            key={`wrong-${idx}`}
                            className="p-3 rounded border border-red-700 bg-red-900/5"
                          >
                            <div className="mb-2 text-sm text-red-300 font-semibold">
                              Your answer
                            </div>
                            {renderSentenceWithAnswers(
                              rec.sentence,
                              rec.befores || [],
                              rec.expected,
                              rec.received
                            )}

                            <div className="mt-4 p-3 rounded border border-green-700 bg-green-900/5">
                              <div className="mb-2 text-sm text-green-300 font-semibold">
                                Correct answers
                              </div>
                              {renderSentenceWithAnswers(
                                rec.sentence,
                                rec.befores || [],
                                rec.expected,
                                null
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-300">
                          No incorrect answers this round.
                        </div>
                      )}
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
            )}
          </div>
        ) : frase === undefined ? (
          <h1 className="text-lg text-white">The round is over.</h1>
        ) : (
          <h1 className="text-3xl text-white">Loading...</h1>
        )
      ) : (
        // Pre-start configuration UI
        <div className="flex flex-col items-center text-center px-5 md:px-0">
          <h1 className="text-4xl text-white font-bold mb-3 ">
            Read and complete
          </h1>
          <div className="flex flex-col items-center gap-3 text-white">
            <div>
              <span className="mr-2">Time:</span>
              <select
                className="text-black px-2 py-1 rounded"
                value={selectedSeconds}
                onChange={(e) =>
                  setSelectedSeconds(parseInt(e.target.value, 10))
                }
              >
                <option value={180}>3:00</option>
                <option value={170}>2:50</option>
                <option value={160}>2:40</option>
                <option value={150}>2:30</option>
                <option value={140}>2:20</option>
                <option value={130}>2:10</option>
                <option value={120}>2:00</option>
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
            onClick={startRound}
          />
        </div>
      )}
    </div>
  );
}

export default ReadAndCompleteComp;
