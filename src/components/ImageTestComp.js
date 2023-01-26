import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import ReactCountdownClock from "react-countdown-clock";

export default function ImageTestComp() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();


  const [submited, setSubmited] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isCorrect, setIsCorrect] = useState();
  const [answer, setAnswer] = useState("");
  const [urlImg, setUrlImg] = useState("");
  const [altImg, setAltImg] = useState("");
  const [linkImg, setLinkImg] = useState("");
  const [imgUser, setImgUser] = useState("");
  const [imgUserLink, setImgUserLink] = useState("");



  const getImg = async () => {
    // fetch to https://api.unsplash.com//photos/random?client_id=znmwFjLJbaJ3gM24NzwykppMQewnLbWRl4QFr_L5TgQ
    const response = await fetch("https://api.unsplash.com//photos/random?client_id=znmwFjLJbaJ3gM24NzwykppMQewnLbWRl4QFr_L5TgQ")
    const data = await response.json();
    setUrlImg(`${data.urls.raw}&w=400`);
    setAltImg(data.alt_description);
    setImgUserLink(data.user.links.html);
    setLinkImg(data.links.html);
    setImgUser(data.user.name);



  }

  // function to restart the form
  const restart = () => {
    setIsCorrect(null);
    setSubmited(false);
    reset();
  };

  const next = () => {
    restart();
    getImg()
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
    getImg()
  }, []);



  

  return (
    <div className="App bg-[#404040] w-full min-h-[60vh] py-3 flex items-center justify-center px-3">
      {isStarted ? (
        urlImg ? (
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
                <img className="rounded" src={urlImg} width="400" height="400" alt="random" />
               
                {/* text area */}
                <textarea
                  className="border-2 border-gray-700 text-black focus:border-orange-600 outline-none text-xl w-full md:w-96 h-64 p-1 rounded-md font-bold"
                  placeholder="Your response"
                  spellCheck="false"
                  {...register("answereText", {
                    required: true,
                    maxLength: 1000,
                  })}
                />
              </div>
              <p className="text-white mr-3"> Photo by <a href={imgUserLink}>{imgUser}</a> on <a href="https://unsplash.com/es?utm_source=englishcertify&utm_medium=referral">Unsplash</a></p>
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
                  <p className="text-xl text-center text-green-600 font-bold">
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
                    alt={altImg}
                    href={linkImg}
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
