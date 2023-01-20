import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import { HiSpeakerWave } from "react-icons/hi2";

function ListeningTestComp() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const [audios, setAudios] = useState([]);
  const [audio, setAudio] = useState(null);
  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isCorrect, setIsCorrect] = useState();
  const [replay, setReplay] = useState(3);

  // fetch to get the information from information.json
  const getAudios = async () => {
    const response = await fetch("dataListening.json");
    const data = await response.json();
    setAudios(data);
  };

  // function to get a random phrase
  const getRandomAudio = () => {
    const randomNumero = Math.floor(Math.random() * audios.length);
    const randomAudio = audios[randomNumero];
    setAudio(randomAudio);

    // remove the phrase that was taken
    const newAudios = audios;
    newAudios.splice(randomNumero, 1);
    setAudios(newAudios);
    restart();
  };

  // function to restart the form
  const restart = () => {
    setIsCorrect(null);
    setSubmited(false);
    setReplay(3);
    reset();
  };

  const next = () => {
    getRandomAudio();
    restart();
    setReplay(3);
  };

  // useEffect to execute only once
  useEffect(() => {
    getAudios();
  }, []);

  // useEffect to execute when setAudios changes
  useEffect(() => {
    if (audios.length > 0) {
      getRandomAudio();
    }
  }, [audios]);

  const onSubmit = (data) => {
    // set the data and submited to true
    setSubmited(true);

    // set the answere to trim and first letter to capital
    data["answereText"] = data["answereText"].trim();
    data["answereText"] =
      data["answereText"].charAt(0).toUpperCase() +
      data["answereText"].slice(1);

    // compare the answers
    if (data["answereText"] === audio.answer) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  // function to start the audio
  const startAudio = () => {
    if (replay > 0) {
      setReplay(replay - 1);
      const audioFile = new Audio(`Audios/${audio.file}`);
      audioFile.play();
    }
  };
  return (
    <div className="App bg-neutral-800 w-full min-h-[55vh] py-3 flex items-center justify-center">
      {isStarted ? (
        audio ? (
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
              <div className="flex justify-around p-1 flex-col md:flex-row items-center gap-3 md:gap-0">
                <HiSpeakerWave
                  className={
                    replay > 0
                      ? "text-white text-9xl rounded-full bg-orange-600 p-5 cursor-pointer hover:bg-orange-800"
                      : "text-white text-9xl rounded-full p-5 cursor-not-allowed bg-orange-800"
                  }
                  onClick={() => {
                    startAudio();
                  }}
                />
                {/* text area */}
                <textarea
                  className="border-2 border-gray-700 text-black focus:border-orange-600 outline-none text-xl w-80 p-1 rounded-md"
                  placeholder="Your response"
                  spellCheck="false"
                  {...register("answereText", {
                    required: true,
                    maxLength: 1000,
                  })}
                />
              </div>
              <div className="text-white text-lg text-right">
                <span>Number of replay left: {replay}</span>
              </div>
              {/* handle errors */}
              {errors.answereText && (
                <span className=" text-red-500 text-lg text-center">
                  {"You need type someting"}
                </span>
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
            {/* button repeat and next */}
            <>
              {submited ? (
                <div className="text-xl text-center">
                  {isCorrect ? (
                    <span className="text-green-600 text-xl text-center">
                      Correct: The correct answer is: {audio.answer}
                    </span>
                  ) : (
                    <span className="text-red-600 text-xl text-center">
                      Incorrect: The correct answer is: {audio.answer}
                    </span>
                  )}

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
                </div>
              ) : null}
              {isCorrect === true ? (
                <div className="w-full flex justify-center my-3">
                  {/* put a gif */}
                  <img
                    src="https://i.giphy.com/media/ZdUnQS4AXEl1AERdil/giphy.webp"
                    alt="gif for good job"
                    width={384}
                    height={320}
                  />
                </div>
              ) : isCorrect === false ? (
                <div className="w-full flex justify-center my-3">
                  {/* put a gif */}
                  <img
                    src="https://i.giphy.com/media/W5qyPxP1CVLFVsmlsl/giphy.webp"
                    alt="gif for wrong job"
                    width={384}
                    height={320}
                  />
                </div>
              ) : null}
            </>
          </div>
        ) : (
          <h1 className="text-xl text-white">the audios are over 😢😢</h1>
        )
      ) : (
        // main page with the start button
        <div className="flex flex-col items-center text-center px-5">
          <h1 className="text-4xl text-white font-bold mb-3 ">
            Welcome to the Listening test
          </h1>
          <span className="text-xl text-white">
            You will have 1 minutes to write what you hear
          </span>
          <input
            type="submit"
            value="Start"
            className="mt-6 bg-green-500  text-white p-2 w-24 cursor-pointer rounded-xl"
            onClick={() => {
              setIsStarted(true);
              startAudio();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ListeningTestComp;
