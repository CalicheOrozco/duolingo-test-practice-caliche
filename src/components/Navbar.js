import React from "react";
import { Link } from "react-router-dom";

function Navbar() {
  

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
          <Link to="/duolingo-menu" className="px-3 py-2 rounded hover:bg-gray-800">Duolingo</Link>
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
          <Link to="/duolingo-menu" className="px-4 py-2 bg-gray-800 rounded">Duolingo</Link>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
