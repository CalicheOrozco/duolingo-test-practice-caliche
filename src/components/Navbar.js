import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();

  return (
    <div className="bg-[#404040] px-4 py-8 min-h-[10vh] min-w-full">
      <div className="flex md:flex-row justify-between items-center">
        <div className="flex flex-col">
          <Link to="/">
            <img
              src="/logo.png"
              alt="Logo English Certify by Caliche Orozco"
              className="w-48 w- h-28"
            />
          </Link>
        </div>

        <div className="space-x-8 hidden md:block  text-white font-semibold">
        <Link to="/real-words-test">
            <span
              className={
                pathname === "/real-words-test"
                  ? ` text-orange-600 font-bold`
                  : `lg:hover:text-slate-400`
              }
            >
              Real words
              {pathname === "/real-words-test" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-down inline-block h-3 w-3"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                  />
                </svg>
              )}
            </span>
          </Link>
          <Link to="/image-test">
            <span
              className={
                pathname === "/image-test"
                  ? ` text-orange-600 font-bold`
                  : `lg:hover:text-slate-400`
              }
            >
              {"Image Test"}

              {pathname === "/image-test" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-down inline-block h-3 w-3"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                  />
                </svg>
              )}
            </span>
          </Link>
          
          <Link to="/read-and-select">
            <span
              className={
                pathname === "/read-and-select"
                  ? ` text-orange-600 font-bold`
                  : `lg:hover:text-slate-400`
              }
            >
              Read and select
              {pathname === "/read-and-select" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-down inline-block h-3 w-3"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                  />
                </svg>
              )}
            </span>
          </Link>
          <Link to="/fill-in-the-blanks">
            <span
              className={
                pathname === "/fill-in-the-blanks"
                  ? ` text-orange-600 font-bold`
                  : `lg:hover:text-slate-400`
              }
            >
              Fill in the blanks
              {pathname === "/fill-in-the-blanks" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-down inline-block h-3 w-3"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                  />
                </svg>
              )}
            </span>
          </Link>
          <Link to="/read-and-complete">
            <span
              className={
                pathname === "/read-and-complete"
                  ? ` text-orange-600 font-bold`
                  : `lg:hover:text-slate-400`
              }
            >
              Read and complete
              {pathname === "/read-and-complete" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-down inline-block h-3 w-3"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                  />
                </svg>
              )}
            </span>
          </Link>
          

          <Link to="/listening-test">
            <span
              className={
                pathname === "/listening-test"
                  ? ` text-orange-600 font-bold`
                  : `lg:hover:text-slate-400`
              }
            >
              {"Listening"}
              {pathname === "/listening-test" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-down inline-block h-3 w-3"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                  />
                </svg>
              )}
            </span>
          </Link>

          
          
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
      <div className="flex gap-x-4 justify-center md:hidden mt-4 text-white font-semibold">
      <Link to="/real-words-test">
          <span
            className={
              pathname === "/real-words-test"
                ? ` text-orange-600 font-bold`
                : `lg:hover:text-slate-400`
            }
          >
            {"Real words"}
          </span>
        </Link>
        <Link to="/image-test">
          <span
            className={
              pathname === "/image-test"
                ? ` text-orange-600 font-bold`
                : `lg:hover:text-slate-400`
            }
          >
            {"Image Test"}
          </span>
        </Link>
        <Link to="/read-and-select">
          <span
            className={
              pathname === "/read-and-select"
                ? ` text-orange-600 font-bold`
                : `lg:hover:text-slate-400`
            }
          >
            {"Read and select"}
          </span>
        </Link>
        <Link to="/read-and-select">
          <span
            className={
              pathname === "/fill-in-the-blanks"
                ? ` text-orange-600 font-bold`
                : `lg:hover:text-slate-400`
            }
          >
            {"Fill in the blanks"}
          </span>
        </Link>
        <Link to="/read-and-complete">
          <span
            className={
              pathname === "/read-and-complete"
                ? ` text-orange-600 font-bold`
                : `lg:hover:text-slate-400`
            }
          >
            {"Read and complete"}
          </span>
        </Link>
        <Link to="/listening-test">
          <span
            className={
              pathname === "/listening-test"
                ? ` text-orange-600 font-bold`
                : `lg:hover:text-slate-400`
            }
          >
            {"Listening"}
          </span>
        
        </Link>
        
        
      </div>
    </div>
  );
}

export default Navbar;
