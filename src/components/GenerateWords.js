import React, { useEffect } from "react";
import fake from "fake-words";
import randomWords from "random-words";

function GenerateWords() {
  let final = [];

  const generateWords = () => {
    // generate random number between 5 and 15
    const randomNum = Math.floor(Math.random() * 12) + 3;
    const restNum = 18 - randomNum;
    let fakeWords = [];
    let realWords = randomWords(randomNum);
    let FinalObj = [];
    // generate random fake words the number of restNum
    for (let i = 0; i < restNum; i++) {
      fakeWords.push(fake.word());
    }

    // iterate over realWords and fakeWords and create an object with the word and a boolean true if it's real and false if it's fake
    for (let i = 0; i < randomNum; i++) {
      FinalObj.push({ word: realWords[i], answer: true });
    }
    for (let i = 0; i < restNum; i++) {
      FinalObj.push({ word: fakeWords[i], answer: false });
    }

    // add the object to the final array
    final.push(FinalObj);

  };



  // repeat the function 1000 times
  for (let i = 0; i < 1000; i++) {
      generateWords()
  }
  console.log(final)

  return <div>GenerateWords</div>;
}

export default GenerateWords;
