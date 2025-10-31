import React, { useEffect, useState } from "react";
import ReactCountdownClock from "react-countdown-clock";

function ReadAndSelectComp() {
  const [allItems, setAllItems] = useState([]);
  const [roundItems, setRoundItems] = useState([]);
  const [current, setCurrent] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [submited, setSubmited] = useState(false);
  const [selectedSeconds, setSelectedSeconds] = useState(5);
  const [selectedDifficulty, setSelectedDifficulty] = useState("any");

  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalIncorrect, setTotalIncorrect] = useState(0);
  const [correctList, setCorrectList] = useState([]);
  const [wrongList, setWrongList] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null); // true = yes, false = no, null = none

  useEffect(() => {
    const load = async () => {
      const res = await fetch("dataReadAndSelect.json");
      const data = await res.json();
      setAllItems(data);
    };
    load();
  }, []);

  const startRound = () => {
    setCorrectList([]);
    setWrongList([]);
    setTotalCorrect(0);
    setTotalIncorrect(0);
    setAnsweredCount(0);
    setSubmited(false);

    const pool = selectedDifficulty === "any" ? [...allItems] : allItems.filter(i => i.difficulty === selectedDifficulty);
    const desired = 15 + Math.floor(Math.random() * 4); // 15-18
    const count = Math.min(desired, pool.length);
    const indices = new Set();
    while (indices.size < count) indices.add(Math.floor(Math.random() * pool.length));
    const items = Array.from(indices).map(i => pool[i]);
    setRoundItems(items);
    setTotalQuestions(items.length);
    setIsStarted(true);
    setCurrent(null);
  };

  useEffect(() => {
    if (isStarted && current === null) nextItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  const nextItem = () => {
    if (roundItems.length === 0) {
      setCurrent(undefined);
      setSubmited(true);
      return;
    }
    const idx = Math.floor(Math.random() * roundItems.length);
    const item = roundItems[idx];
    const copy = [...roundItems];
    copy.splice(idx, 1);
    setRoundItems(copy);
    setCurrent(item);
    setSubmited(false);
  };

  const answer = (choice) => {
    if (!current) return;
    setSubmited(true);
    setSelectedChoice(choice);
    const correct = Boolean(current.is_real) === Boolean(choice);
    setAnsweredCount(v => v + 1);
    if (correct) {
      setTotalCorrect(v => v + 1);
      setCorrectList(arr => [...arr, current]);
    } else {
      setTotalIncorrect(v => v + 1);
      setWrongList(arr => [...arr, current]);
    }
    setTimeout(() => {
      setSelectedChoice(null);
      nextItem();
    }, 500);
  };

  return (
    <div className="App bg-[#404040] w-full min-h-[60vh] flex items-center py-3 justify-center">
      {isStarted ? (
        current ? (
          <div className="px-10 w-full max-w-3xl">
            <div className="w-full flex justify-between items-center mt-3">
              <div className="text-white font-semibold">Question {answeredCount + 1} of {totalQuestions}</div>
              <ReactCountdownClock
                weight={10}
                seconds={!submited ? selectedSeconds : 0}
                color="#fff"
                size={80}
                paused={submited}
                onComplete={() => answer(false)}
              />
            </div>
            <div className="w-full text-center mt-6">
              <h1 className="text-4xl md:text-5xl text-white font-extrabold">Is this a real English word?</h1>
              <div className="text-6xl md:text-7xl text-white font-extrabold my-10">{current.word}</div>
              <div className="flex gap-6 justify-center">
                <button
                  className={`px-10 py-4 rounded-xl text-2xl border-2 transition-colors duration-150 ${selectedChoice === true ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : 'bg-white/10 border-white text-white hover:bg-white/20'}`}
                  onClick={() => answer(true)}
                >
                  ✓ Yes
                </button>
                <button
                  className={`px-10 py-4 rounded-xl text-2xl border-2 transition-colors duration-150 ${selectedChoice === false ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : 'bg-white/10 border-white text-white hover:bg-white/20'}`}
                  onClick={() => answer(false)}
                >
                  ✕ No
                </button>
              </div>
            </div>
          </div>
        ) : current === undefined ? (
          <div className="px-6 max-w-3xl">
            <h2 className="text-white text-3xl font-bold text-center">Results</h2>
            <div className="text-white text-center mt-2">Total: <span className="font-semibold">{totalQuestions}</span> · Correct: <span className="text-green-400 font-semibold">{totalCorrect}</span> · Incorrect: <span className="text-red-400 font-semibold">{totalIncorrect}</span></div>
            <div className="text-center mt-2 text-white">Score: <span className="font-bold">{totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0}%</span></div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {correctList.length > 0 && (
                <div>
                  <h3 className="text-green-400 text-xl font-semibold mb-2">Correct</h3>
                  <div className="flex flex-wrap gap-2">
                    {correctList.map((w, i) => (
                      <span key={`c-${i}`} className="px-2 py-1 bg-green-700 text-white rounded">{w.word}</span>
                    ))}
                  </div>
                </div>
              )}

              {wrongList.length > 0 && (
                <div>
                  <h3 className="text-red-400 text-xl font-semibold mb-2">Incorrect</h3>
                  <div className="flex flex-wrap gap-2">
                    {wrongList.map((w, i) => (
                      <span key={`w-${i}`} className="px-2 py-1 bg-red-700 text-white rounded">{w.word}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full flex justify-center mt-6">
              <button className="mt-6 bg-blue-500 text-white p-2 px-6 cursor-pointer rounded-xl" onClick={() => setIsStarted(false)}>Play again</button>
            </div>
          </div>
        ) : (
          <h1 className="text-3xl text-white">Loading...</h1>
        )
      ) : (
        <div className="flex flex-col items-center text-center px-5 md:px-0">
          <h1 className="text-4xl text-white font-bold mb-3 ">Read and Select</h1>
          <div className="flex flex-col items-center gap-3 text-white">
            <div>
              <span className="mr-2">Seconds:</span>
              <select className="text-black px-2 py-1 rounded" value={selectedSeconds} onChange={(e) => setSelectedSeconds(parseInt(e.target.value))}>
                <option value={5}>5</option>
                <option value={4}>4</option>
                <option value={3}>3</option>
              </select>
            </div>
            <div>
              <span className="mr-2">Difficulty:</span>
              <select className="text-black px-2 py-1 rounded" value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
                <option value="any">Any</option>
                <option value="basic">Basic</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <input
            type="submit"
            value="Start"
            className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
            onClick={() => startRound()}
          />
        </div>
      )}
    </div>
  );
}

export default ReadAndSelectComp;


