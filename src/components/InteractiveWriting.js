import React, { useEffect, useState } from 'react';
import ReactCountdownClock from 'react-countdown-clock';

export default function InteractiveWriting() {
  const [topics, setTopics] = useState([]);
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState('menu'); // menu | prepare | writing | review
  const [prepareSeconds, setPrepareSeconds] = useState(10);
  const [writeSeconds, setWriteSeconds] = useState(300); // 5 minutes default
  const [followUpSeconds, setFollowUpSeconds] = useState(180); // 3 minutes follow-up (display only)
  const [timerKey, setTimerKey] = useState(0);
  const [answer, setAnswer] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const isProcessing = false;
  const [writeStage, setWriteStage] = useState('main'); // main | mainSample | followup | followUpSample

  useEffect(() => {
    // load prompts from public JSON
    fetch('/dataInteractiveWriting.json')
      .then((r) => r.json())
      .then((d) => setTopics(d))
      .catch((err) => {
        console.error('Failed to load interactive writing prompts', err);
      });
  }, []);

  const start = () => {
    if (!topics || topics.length === 0) return;
    // pick a random prompt
    const idx = Math.floor(Math.random() * topics.length);
    setCurrent(topics[idx]);
    setPhase('prepare');
    setTimerKey((k) => k + 1);
    setAnswer('');
    setFollowUpAnswer('');
    setWriteStage('main');
  };

  const onPrepareComplete = () => {
    setPhase('writing');
    setWriteStage('main');
    setTimerKey((k) => k + 1);
  };

  const onWriteComplete = () => {
    // If main stage completes, show the sample for the main part
    if (writeStage === 'main') {
      setWriteStage('mainSample');
      return;
    }

    // If follow-up completes, show follow-up sample
    if (writeStage === 'followup') {
      setWriteStage('followUpSample');
      return;
    }
  };

  const submitNow = (e) => {
    e && e.preventDefault();

    // Stage-aware submit behavior
    if (writeStage === 'main') {
      // user finished main: show sample and disable main textarea
      setWriteStage('mainSample');
      return;
    }

    if (writeStage === 'mainSample') {
      // move to follow-up and start follow-up timer
      setWriteStage('followup');
      setTimerKey((k) => k + 1);
      return;
    }

    if (writeStage === 'followup') {
      // user finished follow-up: show follow-up sample
      setWriteStage('followUpSample');
      return;
    }
  };

  const restart = () => {
    setAnswer('');
    setFollowUpAnswer('');
    setPhase('menu');
    setCurrent(null);
  };

  const wordCount = (text) => {
    if (!text) return 0;
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="App bg-gray-900 min-h-[60vh] text-white px-6">
      {phase === 'menu' && (
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Interactive Writing — Practice</h1>
          <p className="text-gray-300 mb-6">Prepare and write responses similar to the Duolingo English Test interactive writing task.</p>

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
              <option value={360}>6:00</option>
            </select>
            <label className="text-sm">Follow-up sec</label>
            <select value={followUpSeconds} onChange={(e) => setFollowUpSeconds(Number(e.target.value))} className="bg-gray-800 p-2 rounded">
              <option value={60}>1:00</option>
              <option value={120}>2:00</option>
              <option value={180}>3:00</option>
            </select>
          </div>

          <div className="flex justify-center">
            <button onClick={start} className="bg-green-500 px-6 py-2 rounded font-semibold">Start</button>
          </div>
        </div>
      )}

      {phase === 'prepare' && current && (
        <div className="max-w-4xl mx-auto relative">
          {/* small top-left countdown */}
          <div className="absolute left-0 top-0 mt-4 ml-4 flex items-center gap-3 text-gray-300">
            <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <ReactCountdownClock key={timerKey} seconds={prepareSeconds} color="#fff" size={56} onComplete={onPrepareComplete} />
            </div>
            <div className="text-sm">to prepare</div>
          </div>

          <div className="text-center py-12 px-4">
            <h2 className="text-3xl font-bold mb-4">Prepare to write about the topic below</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6">
              You will write for {Math.round(writeSeconds / 60)} minute{writeSeconds / 60 > 1 ? 's' : ''} and then write a follow-up response for {Math.round(followUpSeconds / 60)} minute{followUpSeconds / 60 > 1 ? 's' : ''}. Use the time to plan your ideas and examples.
            </p>

            <div className="mx-auto max-w-3xl border border-gray-700 rounded-lg p-6 bg-gray-800 text-left mb-6">
              <p className="text-lg leading-relaxed">{current.prompt}</p>
            </div>

            <div className="flex justify-center">
              <button onClick={() => setPhase('writing')} className="bg-blue-600 px-6 py-2 rounded font-semibold">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'writing' && current && (
        <div className="relative">
          {/* Top inline bar with timer (inside component, below navbar) */}
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-gray-200">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <ReactCountdownClock
                    key={timerKey}
                    seconds={writeStage === 'followup' ? followUpSeconds : writeSeconds}
                    color="#fff"
                    size={64}
                    onComplete={onWriteComplete}
                  />
                </div>
                <div className="text-sm">to {writeStage === 'followup' ? 'follow-up' : 'write'}</div>
              </div>
              <div />
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-base font-semibold ring-1 ring-gray-700 shadow-sm leading-none flex-shrink-0">1</div>
                  <div>
                        <div className="text-2xl font-semibold">Write about the topic below for {Math.round(writeSeconds / 60)} minutes</div>
                        <p className="text-gray-400 mt-2">{current.prompt}</p>
                  </div>
                </div>

                <form onSubmit={submitNow}>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    readOnly={writeStage !== 'main'}
                    className={`w-full h-96 bg-gray-900 text-gray-200 p-4 rounded-lg border border-gray-700 placeholder-gray-500 resize-none ${writeStage !== 'main' ? 'opacity-70' : ''}`}
                    placeholder="Your response"
                  />

                  <div className="flex justify-center mt-6">
                    <button type="submit" disabled={isProcessing} className={`px-6 py-3 rounded-full font-semibold text-white ${isProcessing ? 'bg-gray-600 cursor-wait' : 'bg-gray-700'}`}>
                      {isProcessing ? (
                        <span className="flex items-center">
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Enviando...
                        </span>
                      ) : (
                        writeStage === 'main' ? 'FINISH SECTION' : 'SUBMIT'
                      )}
                    </button>
                  </div>
                </form>

                <div className="text-gray-300 text-center mt-3">Words: {wordCount(answer)}</div>
              </div>

              <div className="col-span-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-base font-semibold ring-1 ring-gray-700 shadow-sm leading-none flex-shrink-0">2</div>
                  <div>
                    <div className="text-xl font-semibold">Write a follow-up response for {Math.round(followUpSeconds / 60)} minutes</div>
                    { (writeStage === 'followup' || writeStage === 'followUpSample') && (
                      <p className="text-gray-400 mt-2">{current.followUpPrompt || 'Use this space to plan or write a short follow-up. In the Duolingo test you will be asked to respond briefly after the main task.'}</p>
                    )}
                  </div>
                </div>

                <textarea
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  readOnly={writeStage !== 'followup'}
                  className={`w-full h-80 bg-gray-800 text-gray-200 p-4 rounded-lg border border-gray-700 placeholder-gray-500 resize-none ${writeStage !== 'followup' ? 'opacity-70' : ''}`}
                  placeholder="Your response"
                />

                <div className="text-gray-300 text-right mt-2">Words: {wordCount(followUpAnswer)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {writeStage === 'mainSample' && current && (
        <div className="fixed left-0 right-0 bottom-0 z-40">
          <div className="bg-green-600 text-white p-6 flex items-start justify-between">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">✔ Example response</div>
              </div>
              <div className="mt-2 text-sm leading-relaxed">
                <div>
                  <div className="font-semibold">Main sample:</div>
                  <div>{current.sample}</div>
                </div>
              </div>
            </div>
            <div className="pr-6 flex items-center gap-3">
              <button onClick={() => { setWriteStage('followup'); setTimerKey(k => k + 1); }} className="bg-gray-800 px-4 py-2 rounded font-semibold">Continue to follow-up</button>
            </div>
          </div>
        </div>
      )}

      {writeStage === 'followUpSample' && current && (
        <div className="fixed left-0 right-0 bottom-0 z-40">
          <div className="bg-green-600 text-white p-6 flex items-start justify-between">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">✔ Follow-up sample:</div>
              </div>
              <div className="mt-2 text-sm leading-relaxed">
                <div>
                  <div className="font-semibold">Follow-up sample:</div>
                  <div>{current.followUpSample || 'No follow-up sample provided.'}</div>
                </div>
              </div>
            </div>
            <div className="pr-6 flex items-center gap-3">
              <button onClick={() => restart()} className="bg-blue-600 px-4 py-2 rounded font-semibold">Back to main</button>
              <button onClick={() => {
                // pick next exercise
                if (!topics || topics.length === 0) return;
                let nextIdx = Math.floor(Math.random() * topics.length);
                // try to pick a different prompt
                if (topics.length > 1) {
                  let tries = 0;
                  while (topics[nextIdx].id === current.id && tries < 10) {
                    nextIdx = Math.floor(Math.random() * topics.length);
                    tries++;
                  }
                }
                setCurrent(topics[nextIdx]);
                setPhase('prepare');
                setWriteStage('main');
                setTimerKey(k => k + 1);
                setAnswer('');
                setFollowUpAnswer('');
              }} className="bg-gray-800 px-4 py-2 rounded font-semibold">Next exercise</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
