import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";
import QuickImage from "react-quick-image";

export default function ImageTestComp() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const [topic, setTopic] = useState(null);
  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isCorrect, setIsCorrect] = useState();
  const [answer, setAnswer] = useState("");

  let topics = [
    "people",
    "boy",
    "girl",
    "teenegers",
    "adults",
    "kids",
    "babies",
    "human",
    "couple in love",
    "toys",
    "folk",
    "dweller",
    "town",
    "health",
    "wellness",
    "yoga",
    "travel",
    "ride",
    "journey",
    "tour",
    "vacation",
    "get around",
    "wander",
    "trip",
    "cruise",
    "voyage",
    "nature",
    "world",
    "wild",
    "beach",
    "desert",
    "sylvan",
    "forrest",
    "oceans",
    "lakes",
    "rivers",
    "streams",
    "ecosystems",
    "wilderness",
    "film",
    "actor",
    "athletics",
    "soccer",
    "american football",
    "wrestling",
    "rugby",
    "skier",
    "tennis game",
    "BMX",
    "baseball game",
    "boxing",
    "basketball game",
    "dancing",
    "hockey game",
    "horse racing",
    "hiking",
    "sumo",
    "surfing",
    "swimming",
    "triathlon",
    "volleyball game",
    "music",
    "making music",
    "playing guitar",
    "concert",
    "singer",
    "festival",
    "party",
    "birthday party",
    "wedding",
    "carnaval",
    "fair",
    "food",
    "art",
    "museum",
    "art gallery",
    "history",
    "politics",
    "religion",
    "computers",
    "cellphones",
    "playing video games",
    "weather",
    "weather",
    "rain",
    "windy",
    "thunderstorm",
    "sunny",
    "storm",
    "winter storm",
    "snowing",
    "business",
    "buldings",
    "city night",
    "teacher",
    "school",
    "university",
    "playing",
    "park",
    "fashion",
    "library",
    "supermarket",
    "market",
    "sports",
    "transportation",
    "car",
    "taxi",
    "motorcycle",
    "bycicle",
    "roller skates",
    "plane",
    "rocket",
    "astronaut",
    "news",
    "war",
    "cooking",
    "eating",
    "dogs",
    "pitbull",
    "kats",
    "kitten",
    "statue of liberty",
    "mexico",
    "canada",
    "japan",
    "rome",
    "summer",
    "spring",
    "winter",
    "autumn",
    "christmas",
    "halloween",
    "mothers day",
    "mexicans",
    "canadians",
    "canada day",
    "americans",
    "africans",
    "happy",
    "angry",
    "slepping",
    "surprised",
    "magician",
    "engineer",
    "police",
    "doctor",
    "firefighters",
    "nurse",
    "chef",
    "business people",
    "farmers",
    "postman",
    "clown",
  ];
  // function to get a random phrase
  const getRandomTopic = () => {
    const randomNumero = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomNumero];
    setTopic(randomTopic);
    restart();
    topics = topics.filter((topic) => topic !== randomTopic);
  };

  // function to restart the form
  const restart = () => {
    setIsCorrect(null);
    setSubmited(false);
    reset();
  };

  const next = () => {
    restart();
    getRandomTopic();
  };

  const onSubmit = (data) => {
    // set the data and submited to true
    setSubmited(true);

    // set the answere to trim and first letter to capital
    data["answereText"] = data["answereText"].trim();
    data["answereText"] =
      data["answereText"].charAt(0).toUpperCase() +
      data["answereText"].slice(1);

    setAnswer(data["answereText"]);
    setIsCorrect(true);
  };

  useEffect(() => {
    getRandomTopic();
  }, []);

  return (
    <div className="App bg-neutral-800 w-full min-h-[60vh] py-3 flex items-center justify-center px-3">
      {isStarted ? (
        topic ? (
          <div className="px-10 lg:w-1/2">
            {/* Countdown */}
            <div className="w-full flex justify-end mt-3">
              <ReactCountdownClock
                weight={10}
                seconds={!submited ? 65 : 0}
                color="#fff"
                size={80}
                paused={submited}
                onComplete={handleSubmit(onSubmit)}
              />
            </div>
            {/* Form with white space */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className=" text-4xl font-bold  text-white text-center py-5">
                Write a description of the image below for 1 minute.
              </h1>
              <div className="flex justify-around p-1 items-center flex-col md:flex-row  gap-6 md:gap-5">
                <QuickImage width="350" height="250" find={topic} />
                {/* text area */}
                <textarea
                  className="border-2 border-gray-700 text-black focus:border-orange-600 outline-none text-xl w-full md:w-96 h-64 p-1 rounded-md"
                  placeholder="Your response"
                  spellCheck="false"
                  {...register("answereText", {
                    required: true,
                    maxLength: 1000,
                  })}
                />
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
            {/* button repeat and next */}
            <>
              {submited ? (
                <>
                  <p className="text-xl text-center text-green-600">
                    {`Your response: ${answer}`}
                  </p>

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
              {isCorrect === true ? (
                <div className="w-full flex justify-center py-3">
                  {/* put a gif */}
                  <img
                    src="https://i.giphy.com/media/f9RzoxHizH72k15FKS/giphy.webp"
                    alt="gif for good job"
                    className=" w-96 h-80 mt-3"
                  />
                </div>
              ) : null}
            </>
          </div>
        ) : (
          <h1 className="text-xl text-white">The images are over 😢😢</h1>
        )
      ) : (
        // main page with the start button
        <div className="flex flex-col items-center text-center px-5">
          <h1 className="text-4xl text-white font-bold mb-3 ">
            Welcome to the image test
          </h1>
          <p className="text-xl text-white">
            You will have to write a description of the image for 1 minute.
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
  )
}
