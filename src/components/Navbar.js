import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-900 px-4 py-8 min-h-[10vh] min-w-full">
      <div className="flex md:flex-row justify-between items-center">
        <div className="flex flex-row justify-center items-center gap-x-2">
        <div className="flex flex-col">
          <Link to="/">
            <img
              src="/logo.png"
              alt="Logo English Certify by Caliche Orozco"
              className="w-48 w- h-28"
            />
          </Link>
        </div>

        <div className="hidden md:block text-white font-semibold relative">
          <div
            className="inline-flex items-center cursor-pointer select-none"
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            <div className="px-3 py-2 rounded hover:bg-gray-800">Duolingo ▾</div>
            {showMenu && (
              <div className="absolute left-0 top-full mt-0 bg-gray-800 rounded shadow-lg p-4 z-50 w-64">
                {/* replicate the links inside the dropdown */}
                <div className="flex flex-col gap-2">
                  <Link to="/real-words-test"><span className={pathname === "/real-words-test" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Real words</span></Link>
                  <Link to="/read-and-select"><span className={pathname === "/read-and-select" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Read and select</span></Link>
                  <Link to="/fill-in-the-blanks"><span className={pathname === "/fill-in-the-blanks" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Fill in the blanks</span></Link>
                  <Link to="/read-and-complete"><span className={pathname === "/read-and-complete" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Read and complete</span></Link>
                  <Link to="/interactive-reading"><span className={pathname === "/interactive-reading" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Reading</span></Link>
                  <Link to="/listening-test"><span className={pathname === "/listening-test" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Listening</span></Link>
                  <Link to="/interactive-listening"><span className={pathname === "/interactive-listening" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Listening</span></Link>
                  <Link to="/image-test"><span className={pathname === "/image-test" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Image Test</span></Link>
                  <Link to="/interactive-writing"><span className={pathname === "/interactive-writing" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Writing</span></Link>
                  <Link to="/speak-about-photo"><span className={pathname === "/speak-about-photo" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Speak about photo</span></Link>
                  <Link to="/read-then-speak"><span className={pathname === "/read-then-speak" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Read then speak</span></Link>
                  <Link to="/interactive-speaking" onClick={() => setShowMenu(false)}><span className={pathname === "/interactive-speaking" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Speaking</span></Link>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="space-x-4 flex flex-row items-center">
          <a href="https://paypal.me/CalicheOrozco" target="_blank" rel="noreferrer">
            <button
              type="button"
              className="text-white font-bold bg-green-500 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 rounded-full text-sm px-7 py-3 text-center mr-2 mb-2 "
            >
              {"Donate"}
            </button>
          </a>
        </div>
      </div>
      <div className="md:hidden mt-4 text-white font-semibold">
        <div className="flex justify-center">
          <button
            className="px-4 py-2 bg-gray-800 rounded"
            onClick={() => setShowMenu((s) => !s)}
            aria-expanded={showMenu}
          >
            Duolingo ▾
          </button>
        </div>
        {showMenu && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <Link to="/real-words-test"><span className={pathname === "/real-words-test" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Real words</span></Link>
            <Link to="/read-and-select"><span className={pathname === "/read-and-select" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Read and select</span></Link>
            <Link to="/fill-in-the-blanks"><span className={pathname === "/fill-in-the-blanks" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Fill in the blanks</span></Link>
            <Link to="/read-and-complete"><span className={pathname === "/read-and-complete" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Read and complete</span></Link>
            <Link to="/interactive-reading"><span className={pathname === "/interactive-reading" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Reading</span></Link>
            <Link to="/listening-test"><span className={pathname === "/listening-test" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Listening</span></Link>
            <Link to="/interactive-listening"><span className={pathname === "/interactive-listening" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Listening</span></Link>
            <Link to="/image-test"><span className={pathname === "/image-test" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Image Test</span></Link>
            <Link to="/interactive-writing"><span className={pathname === "/interactive-writing" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Writing</span></Link>
            <Link to="/speak-about-photo"><span className={pathname === "/speak-about-photo" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Speak about photo</span></Link>
            <Link to="/read-then-speak"><span className={pathname === "/read-then-speak" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Read then speak</span></Link>
            <Link to="/interactive-speaking" onClick={() => setShowMenu(false)}><span className={pathname === "/interactive-speaking" ? ` text-orange-600 font-bold` : `lg:hover:text-slate-400`}>Interactive Speaking</span></Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;
