import React, { useEffect, useState } from 'react';
import ReactCountdownClock from 'react-countdown-clock';

export default function WritingSample() {
  const [topics, setTopics] = useState([]);
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState('menu'); // menu | prepare | writing | sample
  const [prepareSeconds, setPrepareSeconds] = useState(10);
  const [writeSeconds, setWriteSeconds] = useState(300);
  const [selectedDifficulty, setSelectedDifficulty] = useState('any');
  const [timerKey, setTimerKey] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/dataWritingSample.json')
      .then((r) => r.json())
      .then((d) => setTopics(d || []))
      .catch((err) => { console.error('Failed to load writing sample prompts', err); setTopics([]); });
  }, []);

  useEffect(() => {
    if (!current && topics && topics.length) {
      // choose a random prompt respecting selected difficulty when available
      const pool = selectedDifficulty === 'any' ? topics : topics.filter(t => t.difficulty === selectedDifficulty);
      const pick = pool && pool.length ? pool[Math.floor(Math.random() * pool.length)] : topics[0];
      setCurrent(pick);
    }
  }, [topics, current, selectedDifficulty]);

  const start = () => {
    if (!topics || topics.length === 0) return;
    // pick a random prompt respecting difficulty when possible
    const pool = selectedDifficulty === 'any' ? topics : topics.filter(t => t.difficulty === selectedDifficulty);
    const chosen = (pool && pool.length) ? pool[Math.floor(Math.random() * pool.length)] : topics[0];
    setCurrent(chosen);
    setPhase('prepare');
    setTimerKey((k) => k + 1);
    setAnswer('');
  };

  const onPrepareComplete = () => {
    setPhase('writing');
    setTimerKey((k) => k + 1);
  };

  const onWriteComplete = () => {
    setPhase('sample');
  };

  const submitNow = (e) => {
    e && e.preventDefault();
    setIsProcessing(true);
    // simulate quick processing then show sample
    setTimeout(() => {
      setIsProcessing(false);
      setPhase('sample');
    }, 250);
  };

  const restart = () => {
    setAnswer('');
    setPhase('menu');
    setCurrent(null);
  };

  const pickNext = () => {
    if (!topics || topics.length === 0) return;
    const pool = selectedDifficulty === 'any' ? topics : topics.filter(t => t.difficulty === selectedDifficulty);
    if (!pool || pool.length === 0) return;
    if (pool.length === 1) {
      setCurrent(pool[0]);
    } else {
      let next = Math.floor(Math.random() * pool.length);
      let tries = 0;
      while (pool[next].id === (current && current.id) && tries < 10) {
        next = Math.floor(Math.random() * pool.length);
        tries++;
      }
      setCurrent(pool[next]);
    }
    setAnswer('');
    setPhase('prepare');
    setTimerKey((k) => k + 1);
  };

  const wordCount = (text) => {
    if (!text) return 0;
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="App bg-gray-900 min-h-[60vh] text-white px-6">
      {phase === 'menu' && (
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Writing Sample</h1>
          <p className="text-gray-300 mb-6">Read the prompt, prepare, then write your response. No follow-up on this task.</p>

          <div className="flex items-center justify-center gap-3 mb-4">
            <label className="text-sm">Prepare sec</label>
            <select value={prepareSeconds} onChange={(e) => setPrepareSeconds(Number(e.target.value))} className="bg-gray-800 p-2 rounded">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
            <label className="text-sm">Write sec</label>
            <select value={writeSeconds} onChange={(e) => setWriteSeconds(Number(e.target.value))} className="bg-gray-800 p-2 rounded">
              <option value={180}>3:00</option>
              <option value={240}>4:00</option>
              <option value={300}>5:00</option>
            </select>
              <label className="text-sm">Difficulty</label>
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} className="bg-gray-800 p-2 rounded">
                <option value="any">Any</option>
                <option value="basic">Basic</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
          </div>

            <div className="my-2 text-sm text-gray-300">Available exercises: {selectedDifficulty === 'any' ? (topics ? topics.length : 0) : (topics ? topics.filter(t => t.difficulty === selectedDifficulty).length : 0)}</div>

          <div className="flex justify-center">
            <button onClick={start} className="bg-green-500 px-6 py-2 rounded font-semibold">Start</button>
          </div>
        </div>
      )}

      {phase === 'prepare' && current && (
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute left-0 top-0 mt-4 ml-4 flex items-center gap-3 text-gray-300">
            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <ReactCountdownClock key={timerKey} seconds={prepareSeconds} color="#fff" size={56} onComplete={onPrepareComplete} />
            </div>
            <div className="text-sm">to prepare</div>
          </div>

          <div className="text-center py-12 px-4">
            <h2 className="text-3xl font-bold mb-4">Prepare to write about the topic below</h2>
            <div className="mx-auto max-w-3xl border border-gray-700 rounded-lg p-6 bg-gray-800 text-left mb-6">
              <p className="text-lg leading-relaxed">{current.prompt}</p>
            </div>

            <div className="flex justify-center">
              <button onClick={() => { setPhase('writing'); setTimerKey(k => k + 1); }} className="bg-blue-600 px-6 py-2 rounded font-semibold">Continue</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'writing' && current && (
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-gray-200">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <ReactCountdownClock key={timerKey} seconds={writeSeconds} color="#fff" size={64} onComplete={onWriteComplete} />
                </div>
                <div className="text-sm">to write</div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-base font-semibold ring-1 ring-gray-700 shadow-sm leading-none flex-shrink-0">1</div>
                  <div>
                    <div className="text-2xl font-semibold">Write about the topic below</div>
                    <p className="text-gray-400 mt-2">{current.prompt}</p>
                  </div>
                </div>

                <form onSubmit={submitNow}>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className={`w-full h-96 bg-gray-900 text-gray-200 p-4 rounded-lg border border-gray-700 placeholder-gray-500 resize-none`}
                    placeholder="Your response"
                  />

                  <div className="flex justify-center mt-6">
                    <button type="submit" disabled={isProcessing} className={`px-6 py-3 rounded-full font-semibold text-white ${isProcessing ? 'bg-gray-600 cursor-wait' : 'bg-gray-700'}`}>
                      {isProcessing ? 'Processing...' : 'FINISH & SHOW EXAMPLE'}
                    </button>
                  </div>
                </form>

                <div className="text-gray-300 text-center mt-3">Words: {wordCount(answer)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'sample' && current && (
        <div className="fixed left-0 right-0 bottom-0 z-40">
          {/* user's answer shown in the background, muted (cover entire viewport) */}
          <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center px-6">
            <div className="max-w-5xl w-full text-left text-gray-100/80 text-base leading-relaxed bg-black/40 p-6 rounded shadow-lg overflow-auto" style={{maxHeight: '70vh'}}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Your response</div>
                <div className="text-sm text-gray-300">{wordCount(answer)} {wordCount(answer) === 1 ? 'word' : 'words'}</div>
              </div>
              <div className="whitespace-pre-wrap text-sm">
                {answer ? answer : <span className="text-gray-400">No response recorded.</span>}
              </div>
            </div>
          </div>

          {/* original sample panel (kept as before) */}
          <div className="relative z-20 bg-green-600 text-white p-6 flex items-start justify-between">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">✔ Example response</div>
              </div>
              <div className="mt-2 text-sm leading-relaxed">
                <div>
                  <div className="font-semibold">Sample:</div>
                  <div>{current.sample}</div>
                </div>
              </div>
            </div>
            <div className="pr-6 flex items-center gap-3">
              <button onClick={() => restart()} className="bg-blue-600 px-4 py-2 rounded font-semibold">Back to main</button>
              <button onClick={() => pickNext()} className="bg-gray-800 px-4 py-2 rounded font-semibold">Next exercise</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
