import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
// use the canonical component
import InteractiveListeningComp from '../components/InteractiveListeningComp';

function InteractiveListening() {
  return (
    <>
      <Navbar />
      <InteractiveListeningComp />
      <Footer />
    </>
  );
}

export default InteractiveListening;
