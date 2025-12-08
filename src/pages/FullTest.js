import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

const modules = [
  { to: '/read-and-select', label: 'Read and Select' },
  { to: '/fill-in-the-blanks', label: 'Fill in the Blanks' },
  { to: '/read-and-complete', label: 'Read and Complete' },
  { to: '/interactive-reading', label: 'Interactive Reading' },
  { to: '/listening-test', label: 'Listen and Type' },
  { to: '/interactive-listening', label: 'Interactive Listening' },
  { to: '/image-test', label: 'Write About the Photo' },
  { to: '/interactive-writing', label: 'Interactive Writing' },
  { to: '/speak-about-photo', label: 'Speak About the Photo' },
  { to: '/read-then-speak', label: 'Read, Then Speak' },
  { to: '/interactive-speaking', label: 'Interactive Speaking' },
  { to: '/speaking-sample', label: 'Speaking Sample' },
  { to: '/writing-sample', label: 'Writing Sample' },
];

export default function FullTest() {
  const [difficulty, setDifficulty] = useState('any');
  const navigate = useNavigate();

  const start = () => {
    // Navigate to first module with difficulty in query params
    if (modules.length === 0) return;
    const first = modules[0].to;
    navigate(`${first}?fullTest=1&difficulty=${encodeURIComponent(difficulty)}`);
  };

  return (
    <>
      <Navbar />
      <div className="App bg-gray-900 min-h-[60vh] text-white px-6 py-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-3">Full Test</h1>
          <p className="text-gray-300 mb-6">This guided full test will take you through each Duolingo-style module (in order). Choose a difficulty — all modules will receive this difficulty as a filter.</p>

          <div className="flex items-center justify-center gap-3 mb-4">
            <label className="text-sm">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="bg-gray-800 p-2 rounded text-white">
              <option value="any">Any</option>
              <option value="basic">Basic</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="flex justify-center">
            <button onClick={start} className="bg-green-500 px-6 py-2 rounded font-semibold">Start Full Test</button>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
