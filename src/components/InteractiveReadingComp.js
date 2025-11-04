import { useEffect, useState, useRef, useMemo } from "react";
import ReactCountdownClock from "react-countdown-clock";

function InteractiveReadingComp() {
  const [allItems, setAllItems] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("any");
  const [exercise, setExercise] = useState(null);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  // Timer options: seconds
  const [selectedTimeSeconds, setSelectedTimeSeconds] = useState(8 * 60); // default 8:00
  const [viewMode, setViewMode] = useState(null); // 'selectors' | 'passage'
  const [passageStage, setPassageStage] = useState(1); // 1: sentence-choice, 2: highlight
  const passageRef = useRef(null);

  // Group questions by type to avoid repeated maps and filters
  const questionGroups = useMemo(() => {
    const q = (exercise && exercise.questions) || [];
    const map = (type) => q.map((item, idx) => ({ q: item, idx })).filter(x => x.q.type === type);
    return {
      complete: map('CompleteTheSentence'),
      selectBest: map('SelectTheBestSentence'),
      highlight: map('HighlightTheAnswer'),
      identify: map('IdentifyTheIdea'),
      title: map('TitleThePassage'),
      all: q
    };
  }, [exercise]);

  const completeQs = questionGroups.complete;
  const selectBestQs = questionGroups.selectBest;
  const highlightQs = questionGroups.highlight;
  const identifyQs = questionGroups.identify;
  const titleQs = questionGroups.title;

  const hasHighlight = highlightQs.length > 0;
  const hasIdentify = identifyQs.length > 0;
  const hasTitle = titleQs.length > 0;

  // Compute dynamic stages in order: sentence-choice (1) -> highlight -> identify -> title
  const stageOrder = useMemo(() => {
    const stages = [ { name: 'sentence', id: 1 } ];
    let counter = 1;
    if (hasHighlight) stages.push({ name: 'highlight', id: ++counter });
    if (hasIdentify) stages.push({ name: 'identify', id: ++counter });
    if (hasTitle) stages.push({ name: 'title', id: ++counter });
    return { stages, lastStage: counter };
  }, [hasHighlight, hasIdentify, hasTitle]);

  const lastStage = stageOrder.lastStage;
  const highlightStage = stageOrder.stages.find(s => s.name === 'highlight')?.id;
  const identifyStage = stageOrder.stages.find(s => s.name === 'identify')?.id;
  const titleStage = stageOrder.stages.find(s => s.name === 'title')?.id;

  useEffect(() => {
    fetch("/dataInteractiveReading.json")
      .then((r) => r.json())
      .then((d) => setAllItems(d))
      .catch((err) => console.error("Failed to load interactive reading data", err));
  }, []);

  const start = () => {
    const pool = selectedDifficulty === "any" ? allItems : allItems.filter((i) => i.difficulty === selectedDifficulty);
    if (!pool || pool.length === 0) return;

    // prefer exercises that are of type CompleteTheSentence and have >=5 questions and matching [n] markers in passage
    const candidates = pool.filter((item) => {
      if (!item.questions || item.questions.length < 5) return false;
      // all questions should be CompleteTheSentence
      if (!item.questions.every((q) => q.type === "CompleteTheSentence")) return false;
      // count markers in passage
      const passageText = (item.passage || []).join(" ");
      const markers = passageText.match(/\[\d+\]/g) || [];
      return markers.length >= 5;
    });

    const pickPool = candidates.length > 0 ? candidates : pool;
    const idx = Math.floor(Math.random() * pickPool.length);
    setExercise(pickPool[idx]);
    setAnswers({});
    setStarted(true);
    setShowResults(false);
    setScore(0);
    setViewMode('selectors');
    setPassageStage(1);
    // timer will be handled by ReactCountdownClock component for visuals and auto-submit
  };

  const choose = (qIdx, choiceIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: choiceIdx }));
  };

  const submit = () => {
    if (!exercise) return;
    let correct = 0;
    exercise.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    setScore(correct);
    setShowResults(true);
    // ReactCountdownClock will stop automatically; no manual interval to clear
  };

  // Reset to initial menu
  const resetToMenu = () => {
    setStarted(false);
    setExercise(null);
    setAnswers({});
    setShowResults(false);
    setScore(0);
    setViewMode(null);
    setPassageStage(1);
  };

  // Try the same exercise again (clears answers and returns to selectors)
  const tryAgain = () => {
    setAnswers({});
    setShowResults(false);
    setScore(0);
    setViewMode('selectors');
    setPassageStage(1);
  };


  const percent = exercise ? Math.round((score / exercise.questions.length) * 100) : 0;

  // Listen for text selection inside the passage when there are HighlightTheAnswer questions
  useEffect(() => {
    if (!exercise || viewMode !== 'passage') return;
    if (highlightQs.length === 0) return;
    const handler = (ev) => {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const anchor = sel.anchorNode;
        if (!anchor || !passageRef.current || !passageRef.current.contains(anchor)) return;
        const text = sel.toString().trim();
        if (!text) return;
        const idx = highlightQs[0].idx;
        // store the selected text as the answer for the highlight question
        choose(idx, text);
        sel.removeAllRanges();
      } catch (err) {
        // ignore selection errors
      }
    };
    const el = passageRef.current;
    el && el.addEventListener('mouseup', handler);
    return () => { el && el.removeEventListener('mouseup', handler); };
  }, [highlightQs, viewMode, exercise]);

  

  return (
    <div className="bg-gray-900 min-h-[60vh] py-8 flex justify-center items-center text-white">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl text-center font-bold mb-4">Interactive Reading</h1>

        {!started && (
          <div className="mb-4 flex flex-col items-center gap-4">
            <div>
              <label className="mr-2">Difficulty:</label>
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} className="text-black px-2 py-1 rounded">
                <option value="any">Any</option>
                <option value="basic">basic</option>
                <option value="medium">medium</option>
                <option value="advanced">advanced</option>
              </select>
            </div>

            <div>
              <label className="mr-2">Timer:</label>
              <select value={selectedTimeSeconds} onChange={(e) => setSelectedTimeSeconds(Number(e.target.value))} className="text-black px-2 py-1 rounded">
                <option value={8*60}>8:00</option>
                <option value={7*60 + 30}>7:30</option>
                <option value={7*60}>7:00</option>
                <option value={6*60 + 30}>6:30</option>
                <option value={6*60}>6:00</option>
              </select>
            </div>

            <div>
              <button onClick={start} className="ml-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow">Start</button>
            </div>
          </div>
        )}

      {started && exercise && (
        <>
          {!showResults ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{exercise.title} <span className="text-sm text-gray-300">({exercise.difficulty})</span></h2>
                <div className="text-gray-300 text-sm">
                  <ReactCountdownClock
                    weight={10}
                    seconds={selectedTimeSeconds}
                    color="#fff"
                    size={80}
                    paused={showResults}
                    onComplete={submit}
                  />
                </div>
              </div>

              {/* Show only selectors first */}
              {viewMode === 'selectors' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left: passage preview (visible while selecting) */}
                  <div className="bg-[#1f1f1f] rounded p-6 max-h-[70vh] overflow-auto border border-gray-700">
                    {exercise.passage.map((p, pi) => {
                      const parts = p.split(/(\[\d+\])/);
                      return (
                        <p key={pi} className="text-gray-200 leading-7 mb-4">
                          {parts.map((part, k) => {
                            const m = part.match(/^\[(\d+)\]$/);
                            if (m) {
                              const num = parseInt(m[1], 10);
                              const qObj = exercise.questions[num - 1];
                              const sel = answers[num - 1];
                              const display = sel !== undefined && qObj ? qObj.choices[sel] : '';
                              const blankClasses = sel === undefined
                                ? 'inline-flex items-center px-2 py-1 mx-1 rounded text-sm font-medium bg-gray-900 text-gray-200 border border-gray-600'
                                : 'inline-flex items-center px-2 py-1 mx-1 rounded text-sm font-medium bg-gray-700 text-gray-100 border border-gray-600';
                              return (
                                <span key={k} className={blankClasses}>
                                  <span className="text-xs mr-2 px-1">{num}</span>
                                  <span className="whitespace-nowrap">{display || '______'}</span>
                                </span>
                              );
                            }
                            return <span key={k}>{part}</span>;
                          })}
                        </p>
                      );
                    })}

                    {selectBestQs.map(({ q, idx }) => {
                      const sel = answers[idx];
                      if (sel === undefined) return null;
                      const cardClasses = `p-3 rounded border ${'border-blue-400 bg-gray-900 text-gray-200'}`;
                      return (
                        <div key={`mc-preview-${idx}`} className={`${cardClasses} mt-4`}>
                          <div className="text-sm">{q.choices[sel]}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: selectors column */}
                  <div className="bg-[#111111] rounded p-6 max-h-[70vh] overflow-auto border border-gray-700">
                    {(() => {
                      const hasComplete = exercise.questions.some(q => q.type === 'CompleteTheSentence');
                      if (hasComplete) {
                        return <h3 className="text-lg font-semibold text-gray-200 mb-3">Select the best option for each missing word</h3>;
                      }
                      return <h3 className="text-lg font-semibold text-gray-200 mb-3">Your answers</h3>;
                    })()}
                    <div className="space-y-4">
                      {completeQs.map(({ q, idx }) => (
                        <div key={idx} className="bg-[#0f0f0f] border border-gray-700 rounded p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-900 text-gray-200 rounded">{idx + 1}</div>
                            <div className="text-sm text-gray-300">Select a word</div>
                          </div>
                          <select
                            value={answers[idx] ?? ""}
                            onChange={(e) => choose(idx, e.target.value === "" ? undefined : Number(e.target.value))}
                            className="w-full bg-[#0b0b0b] text-gray-200 p-2 rounded border border-gray-700"
                          >
                            <option value="">Select a word</option>
                            {q.choices.map((c, ci) => (
                              <option key={ci} value={ci}>{c}</option>
                            ))}
                          </select>
                        </div>
                      ))}

                      <div className="mt-4 flex justify-end">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow" onClick={() => { setViewMode('passage'); setPassageStage(1); }}>Next</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show only passage after Next */}
              {viewMode === 'passage' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left: full passage */}
                  <div ref={passageRef} className="bg-[#1f1f1f] rounded p-6 max-h-[70vh] overflow-auto border border-gray-700">
                    {exercise.passage.map((p, pi) => {
                      const parts = p.split(/(\[\d+\])/);
                      return (
                        <p key={pi} className="text-gray-200 leading-7 mb-4">
                          {parts.map((part, k) => {
                            const m = part.match(/^\[(\d+)\]$/);
                            if (m) {
                              const num = parseInt(m[1], 10);
                              const qObj = exercise.questions[num - 1];
                              const correctIdx = qObj && typeof qObj.correct === 'number' ? qObj.correct : undefined;
                              const display = correctIdx !== undefined && qObj ? qObj.choices[correctIdx] : '';
                              const plainClasses = 'text-gray-200';
                              return (
                                <span key={k} className={plainClasses}>
                                  <span className="whitespace-nowrap">{display || '______'}</span>
                                </span>
                              );
                            }
                            return <span key={k}>{part}</span>;
                          })}
                        </p>
                      );
                    })}

                    {selectBestQs.map(({ q, idx }) => {
                      const before = q.beforeSelectTheBestSentence || '';
                      const after = q.afterSelectTheBestSentence || '';
                      const correctIdx = typeof q.correct === 'number' ? q.correct : undefined;
                      const modelText = correctIdx !== undefined ? q.choices[correctIdx] : '';
                      const selIdx = answers[idx];
                      const selectedText = selIdx !== undefined ? q.choices[selIdx] : null;
                      const displayText = (highlightStage !== undefined && passageStage === highlightStage) ? modelText : (selectedText || '');
                      let middleArea = null;
                      if (displayText) {
                        if (passageStage === 1 && selectedText) {
                          middleArea = (
                            <div className="p-3 rounded border border-blue-400 bg-gray-900 text-gray-200 mt-2">
                              <div className="text-sm">{displayText}</div>
                            </div>
                          );
                        } else {
                          middleArea = (
                            <div className="text-gray-200">{displayText}</div>
                          );
                        }
                      } else {
                        middleArea = <div className="w-full min-h-[56px] mt-2 rounded border border-gray-700 bg-transparent" />;
                      }
                      return (
                        <div key={idx} className="mt-6">
                          {before ? <p className="text-gray-200 leading-7 mb-4">{before}</p> : null}

                          {middleArea}

                          {after ? <p className="text-gray-200 leading-7 mt-4">{after}</p> : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: selectors (visible alongside passage) */}
                  <div className="bg-[#111111] rounded p-6 max-h-[70vh] overflow-auto border border-gray-700 flex flex-col">
                    {passageStage === 1 && (
                      <>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">Choose the best sentence to complete the passage</h3>
                        <div className="space-y-4 flex-1 overflow-auto">
                          {selectBestQs.length === 0 ? (
                            <div className="text-gray-400">No sentence-choice questions for this exercise.</div>
                          ) : (
                            selectBestQs.map(({ q, idx }) => (
                              <div key={idx} className="bg-[#0f0f0f] border border-gray-700 rounded p-3">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 flex items-center justify-center bg-gray-900 text-gray-200 rounded">{idx + 1}</div>
                                  <div className="text-sm text-gray-300">Select a sentence</div>
                                </div>
                                <div className="space-y-3">
                                  {q.choices.map((c, ci) => {
                                    const selected = answers[idx] === ci;
                                    const isCorrect = showResults && q.correct === ci;
                                    const cardClasses = `p-3 rounded border ${selected ? 'border-blue-400 bg-gray-900' : 'border-gray-700 bg-[#0b0b0b]'} ${showResults ? (isCorrect ? 'border-green-500 bg-green-900/10' : (selected ? 'border-red-500 bg-red-900/10' : '')) : ''}`;
                                    return (
                                      <div key={ci} className={cardClasses} onClick={() => choose(idx, ci)} style={{cursor: 'pointer'}}>
                                        <div className="text-gray-200 text-sm">{c}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}

                    {highlightStage !== undefined && passageStage === highlightStage && hasHighlight && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">Highlight text in the passage to answer the question below</h3>
                        {highlightQs.map(({ q, idx }) => (
                          <div key={`highlight-${idx}`} className="mb-4">
                            <div className="text-sm text-gray-300 mb-2">{q.prompt || "Select the text in the passage"}</div>
                            <div className="p-4 rounded border border-gray-700 bg-[#0b0b0b] text-gray-200 min-h-[72px]">
                              {answers[idx] ? (
                                <div className="whitespace-pre-wrap">{answers[idx]}</div>
                              ) : (
                                <div className="text-gray-500">Select text in the passage above</div>
                              )}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded" onClick={() => { choose(idx, undefined); }}>Clear</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {identifyStage !== undefined && passageStage === identifyStage && hasIdentify && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">Select the idea that is expressed in the passage</h3>
                        <div className="space-y-4 flex-1 overflow-auto">
                          {identifyQs.length === 0 ? <div className="text-gray-400">No idea-identification questions for this exercise.</div> : identifyQs.map(({ q, idx }) => (
                            <div key={`idea-${idx}`} className="bg-[#0f0f0f] border border-gray-700 rounded p-3">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 flex items-center justify-center bg-gray-900 text-gray-200 rounded">{idx + 1}</div>
                                <div className="text-sm text-gray-300">{q.prompt || 'Select the idea'}</div>
                              </div>
                              <div className="space-y-3">
                                {q.choices.map((c, ci) => {
                                  const selected = answers[idx] === ci;
                                  const isCorrect = showResults && q.correct === ci;
                                  const cardClasses = `p-3 rounded border ${selected ? 'border-blue-400 bg-gray-900' : 'border-gray-700 bg-[#0b0b0b]'} ${showResults ? (isCorrect ? 'border-green-500 bg-green-900/10' : (selected ? 'border-red-500 bg-red-900/10' : '')) : ''}`;
                                  return (
                                    <div key={ci} className={cardClasses} onClick={() => choose(idx, ci)} style={{cursor: 'pointer'}}>
                                      <div className="text-gray-200 text-sm">{c}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {titleStage !== undefined && passageStage === titleStage && hasTitle && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">Select the best title for the passage</h3>
                        <div className="space-y-4 flex-1 overflow-auto">
                          {titleQs.length === 0 ? <div className="text-gray-400">No title questions for this exercise.</div> : titleQs.map(({ q, idx }) => (
                            <div key={`title-${idx}`} className="bg-[#0f0f0f] border border-gray-700 rounded p-3">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 flex items-center justify-center bg-gray-900 text-gray-200 rounded">{idx + 1}</div>
                                <div className="text-sm text-gray-300">{q.prompt || 'Select the title'}</div>
                              </div>
                              <div className="space-y-3">
                                {q.choices.map((c, ci) => {
                                  const selected = answers[idx] === ci;
                                  const isCorrect = showResults && q.correct === ci;
                                  const cardClasses = `p-3 rounded border ${selected ? 'border-blue-400 bg-gray-900' : 'border-gray-700 bg-[#0b0b0b]'} ${showResults ? (isCorrect ? 'border-green-500 bg-green-900/10' : (selected ? 'border-red-500 bg-red-900/10' : '')) : ''}`;
                                  return (
                                    <div key={ci} className={cardClasses} onClick={() => choose(idx, ci)} style={{cursor: 'pointer'}}>
                                      <div className="text-gray-200 text-sm">{c}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end items-center">
                      {passageStage < lastStage && (
                        <button
                          className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded mr-3"
                          onClick={() => setPassageStage(passageStage + 1)}
                        >
                          Next
                        </button>
                      )}

                      {/* Submit only visible on the final stage */}
                      {passageStage === lastStage && (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow" onClick={submit}>Submit</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded p-4 text-center">
                    <div className="text-4xl font-extrabold">{score}</div>
                    <div className="text-sm">Correct</div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Results</h3>
                    <div className="text-gray-300">Final Score: {score} / {exercise.questions.length} ({percent}%)</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={tryAgain} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">Try again</button>
                  <button onClick={resetToMenu} className="bg-gray-700 hover:bg-gray-900 text-white px-4 py-2 rounded">Back to menu</button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                {exercise.questions.map((q, i) => (
                  <div key={i} className={`p-3 rounded border ${answers[i] === q.correct ? "border-green-600 bg-green-900/10" : "border-red-600 bg-red-900/10"}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-900 text-gray-200 rounded">{i + 1}</div>
                      <div>
                        <div className="text-sm text-gray-200">Your answer: <span className={answers[i] === q.correct ? "text-green-300 font-bold" : "text-red-300 font-bold"}>{answers[i] !== undefined ? (q.type === 'HighlightTheAnswer' ? answers[i] : q.choices[answers[i]]) : "(no answer)"}</span></div>
                        <div className="text-sm text-gray-300">Correct: <span className="text-green-300 font-bold">{q.type === 'HighlightTheAnswer' ? q.correct : q.choices[q.correct]}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

export default InteractiveReadingComp;
