import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Index() {
  return (
    <>
      <Navbar />
      <div className="App bg-neutral-800 w-full min-h-[55vh] flex flex-col px-5 gap-5 items-center justify-center">
        <h1 className="text-2xl text-white font-bold text-center">
          Welcome to the Duolingo English test practice Website by Caliche
          Orozco
        </h1>
        <p className="text-white text-center">
          This website is made for people who want to improve they score in the
          Duolingo English Test. You can practice English by listening to audios
          and reading the text totally free, but if you want to support me for
          the hours that I dedicated creating this website, you can donate to me
          by PayPal.
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
