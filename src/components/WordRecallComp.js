import React, { useEffect, useMemo, useState } from "react";

const CARD_OPTIONS = [5, 10, 15, 20, 25, 30];

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickRandomUnique(items, count) {
  const safeCount = Math.min(count, items.length);
  const indices = new Set();
  while (indices.size < safeCount) {
    indices.add(Math.floor(Math.random() * items.length));
  }
  return Array.from(indices).map((i) => items[i]);
}

function WordRecallComp() {
  const [allItems, setAllItems] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [selectedCount, setSelectedCount] = useState(10);
  const [roundItems, setRoundItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");

  // results: [{ word, translate, userAnswer, isCorrect }]
  const [results, setResults] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("dataWordRecall.json");
      const data = await res.json();
      const cleaned = Array.isArray(data)
        ? data
            .filter((x) => x && typeof x === "object")
            .map((x) => ({
              word: String(x.word || "").trim(),
              translate: String(x.translate || "").trim(),
            }))
            .filter((x) => x.word && x.translate)
        : [];
      setAllItems(cleaned);
    };

    load();
  }, []);

  const totalCards = roundItems.length;
  const currentCard = useMemo(() => {
    if (!isStarted || isFinished) return null;
    if (currentIndex < 0 || currentIndex >= roundItems.length) return null;
    return roundItems[currentIndex];
  }, [isStarted, isFinished, currentIndex, roundItems]);

  const startRound = () => {
    const picked = pickRandomUnique(allItems, selectedCount);
    setRoundItems(picked);
    setCurrentIndex(0);
    setCurrentInput("");
    setResults([]);
    setIsFinished(false);
    setIsStarted(true);
  };

  const recordCurrentAndAdvance = (advanceType) => {
    if (!currentCard) return;

    const expected = normalizeAnswer(currentCard.word);
    const got = normalizeAnswer(currentInput);
    const isCorrect = expected === got;

    setResults((prev) => [
      ...prev,
      {
        word: currentCard.word,
        translate: currentCard.translate,
        userAnswer: currentInput,
        isCorrect,
      },
    ]);

    setCurrentInput("");

    if (advanceType === "submit" || currentIndex === totalCards - 1) {
      setIsFinished(true);
      return;
    }

    setCurrentIndex((i) => i + 1);
  };

  const correctCount = useMemo(
    () => results.filter((r) => r.isCorrect).length,
    [results]
  );

  const scorePercent = useMemo(() => {
    if (!results.length) return 0;
    return Math.round((correctCount / results.length) * 100);
  }, [results.length, correctCount]);

  const reset = () => {
    setIsStarted(false);
    setIsFinished(false);
    setRoundItems([]);
    setCurrentIndex(0);
    setCurrentInput("");
    setResults([]);
  };

  const repeatSameWords = () => {
    if (!roundItems.length) return;
    setCurrentIndex(0);
    setCurrentInput("");
    setResults([]);
    setIsFinished(false);
    setIsStarted(true);
  };

  if (!isStarted) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex items-center py-3 justify-center">
        <div className="flex flex-col items-center text-center px-5 md:px-0 w-full max-w-2xl">
          <h1 className="text-4xl text-white font-bold mb-3">Word Recall</h1>
          <p className="text-white/80 mb-6">
            You will see the translation. Type the English word.
          </p>

          <div className="flex flex-col gap-4 text-white w-full">
            <div className="flex items-center justify-center gap-3">
              <span>Cards:</span>
              <select
                className="text-black px-3 py-2 rounded"
                value={selectedCount}
                onChange={(e) => setSelectedCount(parseInt(e.target.value, 10))}
              >
                {CARD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-white/70">
              Loaded words: <span className="font-semibold">{allItems.length}</span>
            </div>

            <div className="w-full flex justify-center mt-2">
              <button
                className="bg-blue-500 text-white py-3 px-10 cursor-pointer rounded-xl disabled:opacity-50"
                onClick={startRound}
                disabled={allItems.length === 0}
              >
                Start
              </button>
            </div>

            {allItems.length === 0 && (
              <div className="text-white/70 text-sm">
                Loading words…
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="App bg-gray-900 w-full min-h-[60vh] flex items-center py-3 justify-center">
        <div className="px-6 w-full max-w-4xl">
          <h2 className="text-white text-3xl font-bold text-center">Results</h2>
          <div className="text-white text-center mt-2">
            Total: <span className="font-semibold">{results.length}</span> · Correct:{" "}
            <span className="text-green-400 font-semibold">{correctCount}</span> · Incorrect:{" "}
            <span className="text-red-400 font-semibold">
              {Math.max(0, results.length - correctCount)}
            </span>
          </div>
          <div className="text-center mt-2 text-white">
            Score: <span className="font-bold">{scorePercent}%</span>
          </div>

          <div className="mt-6 space-y-3">
            {results.map((r, idx) => (
              <div
                key={`${r.word}-${idx}`}
                className={`border rounded-lg p-4 ${
                  r.isCorrect
                    ? "bg-green-900/40 border-green-700"
                    : "bg-red-900/40 border-red-700"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-white font-semibold">
                    {idx + 1}. {r.translate}
                  </div>
                  <div className="text-white font-extrabold text-xl">
                    {r.isCorrect ? "✓" : "✕"}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="text-white/80">
                    Your answer:{" "}
                    <span className="text-white font-semibold">
                      {String(r.userAnswer || "").trim() ? r.userAnswer : "(empty)"}
                    </span>
                  </div>
                  <div className="text-white/80">
                    Correct word:{" "}
                    <span className="text-white font-semibold">{r.word}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full flex justify-center mt-6 gap-3">
            <button
              className="bg-blue-500 text-white p-2 px-6 cursor-pointer rounded-xl"
              onClick={reset}
            >
              Play again
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white p-2 px-6 cursor-pointer rounded-xl disabled:opacity-50"
              onClick={repeatSameWords}
              disabled={!roundItems.length}
            >
              Repeat same words
            </button>
            <button
              className="bg-gray-700 text-white p-2 px-6 cursor-pointer rounded-xl"
              onClick={() => setIsStarted(false)}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shownNumber = Math.min(currentIndex + 1, totalCards);
  const remaining = Math.max(0, totalCards - shownNumber);

  return (
    <div className="App bg-gray-900 w-full min-h-[60vh] flex items-center py-3 justify-center">
      <div className="px-6 w-full max-w-3xl">
        <div className="w-full flex justify-between items-center mt-3 text-white font-semibold">
          <div>
            Card {shownNumber} of {totalCards}
            <span className="text-white/60 font-normal"> · Remaining: {remaining}</span>
          </div>
        </div>

        <div className="w-full text-center mt-8">
          <h1 className="text-4xl md:text-5xl text-white font-extrabold">
            Type the English word
          </h1>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 mt-8">
            <div className="text-white/70 text-lg">Translation</div>
            <div className="text-4xl md:text-5xl text-white font-extrabold mt-2">
              {currentCard?.translate}
            </div>

            <div className="mt-6">
              <input
                className="w-full text-center text-2xl px-4 py-3 rounded-xl"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Type here..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (currentIndex === totalCards - 1) {
                      recordCurrentAndAdvance("submit");
                    } else {
                      recordCurrentAndAdvance("next");
                    }
                  }
                }}
              />
              <div className="text-white/60 text-sm mt-2">
                Press Enter to go next
              </div>
            </div>
          </div>

          <div className="w-full flex justify-center mt-6">
            {currentIndex === totalCards - 1 ? (
              <button
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-10 cursor-pointer rounded-xl"
                onClick={() => recordCurrentAndAdvance("submit")}
              >
                Submit
              </button>
            ) : (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-10 cursor-pointer rounded-xl"
                onClick={() => recordCurrentAndAdvance("next")}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WordRecallComp;
