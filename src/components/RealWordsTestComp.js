import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";

function RealWordsTestComp() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const selectedBtn =
    "text-white text-center p-2 w-32 cursor-pointer rounded-xl bg-orange-600 font-bold rounded-lg";
  const unselectedBtn =
    "text-white text-center p-2 w-32 cursor-pointer rounded-xl border-2 border-orange-900 lg:hover:bg-orange-600 font-bold rounded-lg";
  const correctAnswer =
    "text-white text-center p-2 w-32 cursor-pointer rounded-xl bg-green-400 font-bold rounded-lg";
  const wrongAnswer =
    "text-white text-center p-2 w-32 cursor-pointer rounded-xl bg-red-400 font-bold rounded-lg";
 
  const [wordLists, setWordLists] = useState([]);
  const [wordList, setWordList] = useState(null);
  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isCorrect, setIsCorrect] = useState();
  const [selectedWords, setSelectedWords] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [answersReceived, setAnswersReceived] = useState([]);
  const [numCorrectAnswers, setNumCorrectAnswers] = useState(0);
  const [numCorrectAnswersReceived, setNumCorrectAnswersReceived] = useState(0);

  // fetch to get the information from information.json
  const getWordLists = async () => {
    const response = await fetch("dataRealWords.json");
    const data = await response.json();
    setWordLists(data);
  };

  const handleWordClick = (word) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else {
      setSelectedWords([...selectedWords, word]);
    }
  };

  // function to get a random phrase
  const getRandomWordList = () => {
    const randomNum = Math.floor(Math.random() * wordLists.length);
    const randomWordList = wordLists[randomNum];

    // put the first letter of each word in uppercase
    for (let i = 0; i < randomWordList.length; i++) {
      randomWordList[i].word = randomWordList[i].word
        .split(" ")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
    }

    if (randomWordList === undefined) {
      setWordList(null);
    } else {
      // suffle randomWordList
      for (let i = randomWordList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomWordList[i], randomWordList[j]] = [
          randomWordList[j],
          randomWordList[i],
        ];
      }

      let words = [];
      let answers = [];

      for (let i = 0; i < randomWordList.length; i++) {
        words.push(randomWordList[i].word);
        answers.push(randomWordList[i].answer);
      }

      // extraer la palabra del objeto

      setWordList(words);
      setAnswers(answers);

      // remove the phrase that was taken
      const newWordLists = wordLists;
      newWordLists.splice(randomNum, 1);
      setWordLists(newWordLists);
      restart();
    }
  };

  // function to restart the form
  const restart = () => {
    setIsCorrect(null);
    setSubmited(false);
    setNumCorrectAnswersReceived(0);
    setSelectedWords([]);
    reset();
  };

  const next = () => {
    restart();
    getRandomWordList();
  };

  // useEffect to execute only once
  useEffect(() => {
    getWordLists();
  }, []);

  // useEffect to execute when setWordLists changes
  useEffect(() => {
    if (wordLists.length > 0) {
      getRandomWordList();
    }
  }, [wordLists]);

  const onSubmit = (data) => {
    let counter = 0;
    // get the name of the keys
    let keys = Object.keys(data);
    // for any key in the keys array
    for (let i = 0; i < keys.length; i++) {
      // Verify if the key is in the selectedWords array
      if (selectedWords.includes(keys[i])) {
        // if it is, set the value to true
        data[keys[i]] = "true";
      }
      // if the value is true, add 1 to the counter
      if (data[keys[i]] === "true" && data[keys[i]] === answers[i]) {
        counter++;
      }
    }
    

    // get only the true answers
    let onlyCorrect = Object.keys(answers).filter(
      (key) => answers[key] === "true"
    );
    setNumCorrectAnswers(onlyCorrect.length);
    // get the values of the data object
    data = Object.values(data);
    setAnswersReceived(data);
    setNumCorrectAnswersReceived(counter);
    // set the data and submited to true
    setSubmited(true);
    // compare the answers
    if (JSON.stringify(data) === JSON.stringify(answers)) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };
  return (
    <div className="App bg-neutral-800 w-full min-h-[55vh] py-3 flex items-center justify-center">
      {isStarted ? (
        wordList ? (
          <div className="px-10 lg:w-1/2">
            {/* Countdown */}
            <div className="w-full flex justify-end mt-3">
              <ReactCountdownClock
                weight={10}
                seconds={!submited ? 60 : 0}
                color="#fff"
                size={80}
                paused={submited}
                onComplete={handleSubmit(onSubmit)}
              />
            </div>
            {/* Form with white space */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className=" text-4xl font-bold  text-white text-center py-5">
                Type the statement that you hear
              </h1>
              <div className="flex justify-around p-1 flex-wrap md:flex-row items-center gap-3">
                {/* bottons with the words */}
                {wordList.map((word, index) => {
                  return (
                    <span
                      className={
                        !submited
                          ? selectedWords.includes(`answereText-${index}`)
                            ? selectedBtn
                            : unselectedBtn
                          : selectedWords.includes(`answereText-${index}`) ?
                          (answers[index] === "true" &&
                              answersReceived[index] === "true") ||
                            (answersReceived[index] === "false" &&
                              answers[index] === "true")
                          ? correctAnswer
                          : wrongAnswer
                          : unselectedBtn
                      }
                      key={`answereText-${index}`}
                      onClick={() => {
                        handleWordClick(`answereText-${index}`);
                      }}
                      {...register(`answereText-${index}`, { value: "false" })}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>

              {/* handle errors */}
              {errors.answereText && (
                <p className=" text-red-500 text-lg text-center">
                  {"Check your answer something is going wrong"}
                </p>
              )}

              {!submited ? (
                <div className="w-full flex justify-end ">
                  <input
                    type="submit"
                    value="Submit"
                    className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                  />
                </div>
              ) : null}
            </form>

            <>
              {submited ? (
                <>
                  {/* show how many answers */}
                  <p className="text-xl text-center py-3">
                    {!isCorrect ? (
                      <span className="text-red-600 text-xl text-center">
                        {`you got ${numCorrectAnswersReceived} correct answers of a posible ${numCorrectAnswers}`}
                      </span>
                    ) : (
                      <span className="text-green-600 text-xl text-center">
                        {`you got ${numCorrectAnswersReceived} correct answers of a posible ${numCorrectAnswers}`}
                      </span>
                    )}
                  </p>

                  {/* show answers */}
                  {numCorrectAnswersReceived !== numCorrectAnswers ? (
                    <div className="flex justify-around p-1 flex-wrap bg-gray-600 rounded-xl md:flex-row items-center gap-3 py-5">
                      {/* bottons with the words */}
                      {wordList.map((word, index) => {
                        return (
                          <span
                            className={
                              (answers[index] === "true" &&
                                answersReceived[index]) ||
                              (answersReceived[index] === "false" &&
                                answers[index] === "true")
                                ? correctAnswer
                                : wrongAnswer
                            }
                            key={`answereText-${index}`}
                            onClick={() => {
                              handleWordClick(`answereText-${index}`);
                            }}
                            {...register(`answereText-${index}`, {
                              value: "false",
                            })}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* show the gif */}
                  {isCorrect === true ? (
                    <div className="w-full flex justify-center py-3">
                      {/* put a gif */}
                      <img
                        src="https://media2.giphy.com/media/cEODGfeOYMRxK/giphy.gif?cid=790b76113a36dbcb096f3bdb8f34cb67c3a1044614210cc9&rid=giphy.gif&ct=g"
                        alt="gif for good job"
                        className=" w-96 h-80 mt-3"
                      />
                    </div>
                  ) : isCorrect === false ? (
                    <div className="w-full flex justify-center">
                      {/* put a gif */}
                      <img
                        src="https://i.giphy.com/media/AKkfLuovkXuvocw7Au/giphy.webp"
                        alt="gif for wrong job"
                        className="w-96 h-80 my-3"
                      />
                    </div>
                  ) : null}

                  {/* button repeat and next */}
                  <div className="w-full flex justify-between">
                    <input
                      type="submit"
                      value="Repeat"
                      onClick={() => {
                        restart();
                      }}
                      className="mt-6 bg-blue-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                    />
                    <input
                      type="submit"
                      value="Next"
                      onClick={() => {
                        next();
                      }}
                      className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
                    />
                  </div>
                </>
              ) : null}
            </>
          </div>
        ) : (
          <h1 className="text-xl text-white">the words are over 😢😢</h1>
        )
      ) : (
        // main page with the start button
        <div className="flex flex-col items-center text-center px-3">
          <h1 className="text-4xl text-white font-bold mb-3 ">
            Welcome to the real word test
          </h1>
          <p className="text-xl text-white">
            You will have 1 minutes to choose the corrects words
          </p>
          <input
            type="submit"
            value="Start"
            className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
            onClick={() => {
              setIsStarted(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default RealWordsTestComp;
