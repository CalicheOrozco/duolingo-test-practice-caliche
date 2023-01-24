import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Index() {
  return (
    <>
      <Navbar />
      <div className="App bg-[#404040] w-full min-h-[55vh] flex flex-col px-5 gap-5 items-center justify-center">
        <h1 className="text-2xl text-white font-bold text-center">
          Welcome to the Duolingo English test practice Website by Caliche
          Orozco
        </h1>
        <p className="text-white text-center">
          This website is designed to help individuals improve their scores on
          the Duolingo English Test. Users can access free audio and text-based
          practice materials, and if you would like to support the time and
          effort that went into creating the website, you can make a donation
          via PayPal.
        </p>
        <div className="flex justify-center mt-5">
          <span className="text-white text-center">
            <a
              href="https://paypal.me/CalicheOrozco"
              target="_blank"
              rel="noreferrer"
              className="w-20 bg-orange-600 text-white font-bold py-4 px-16 rounded-lg hover:bg-orange-800 ml-2"
            >
              Donate
            </a>
          </span>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Index;
