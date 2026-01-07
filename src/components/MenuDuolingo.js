import React from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const menuItems = [
  { to: "/full-test", label: "Full Test", icon: "/icons/DET.svg" },
  { to: "/real-words-test", label: "Real Words", icon: "/icons/real-words.svg" },
  { to: "/read-and-select", label: "Read and Select", icon: "/icons/read-and-select.svg" },
  { to: "/fill-in-the-blanks", label: "Fill in the Blanks", icon: "/icons/Fill-In-The-Blanks.svg" },
  { to: "/read-and-complete", label: "Read and Complete", icon: "/icons/read-and-complete.svg" },
  { to: "/interactive-reading", label: "Interactive Reading", icon: "/icons/interactive-reading.svg" },
  { to: "/listening-test", label: "Listen and Type", icon: "/icons/listen-and-type.svg" },
  { to: "/interactive-listening", label: "Interactive Listening", icon: "/icons/interactive-listening.svg" },
  { to: "/image-test", label: "Write About the Photo", icon: "/icons/write-about-the-photo.svg" },
  { to: "/interactive-writing", label: "Interactive Writing", icon: "/icons/interactive-writing.svg" },
  { to: "/speak-about-photo", label: "Speak About the Photo", icon: "/icons/speak-about-the-photo.svg" },
  { to: "/read-then-speak", label: "Read, Then Speak", icon: "/icons/read-then-speak.svg" },
  { to: "/interactive-speaking", label: "Interactive Speaking", icon: "/icons/interactive-speaking.svg" },
  { to: "/speaking-sample", label: "Speaking Sample", icon: "/icons/speaking-sample.svg" },
  { to: "/writing-sample", label: "Writing Sample", icon: "/icons/writing-sample.svg" },
];

function MenuDuolingo() {
  return (
    <>
      <Navbar />
      <div className="App bg-gray-900 w-full min-h-[60vh] flex items-center py-6 justify-center">
        <div className="px-4 py-6 w-full">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const isReal = item.label === 'Real Words';
              const outerLinkClass = `no-underline`;
              const cardClass = `flex items-center gap-4 rounded-lg p-6 border border-gray-700 ${isReal ? 'bg-gray-700 opacity-60' : 'bg-gray-800 hover:bg-gray-700'}`;

              return (
                <Link key={item.to} to={item.to} className={outerLinkClass} target="_blank" rel="noopener noreferrer">
                  <div className={cardClass}>
                    <div className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center">
                      <img src={item.icon} alt={item.label} className="w-12 h-12" />
                    </div>
                    <div>
                      <div className="text-gray-200 font-semibold text-lg">{item.label}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </>
  );
}

export default MenuDuolingo;
