import { Routes, Route } from "react-router-dom";
import ListeningTest from "./pages/Listening-test";
import ImageTest from "./pages/Image-test";
import ReadAndComplete from "./pages/ReadAndComplete";
import RealWordsTest from "./pages/RealWordsTest";
import Index from "./pages/Index";
import FillInTheBlanks from "./pages/FillInTheBlanks";
import ReadAndSelect from "./pages/ReadAndSelect";
import InteractiveReading from "./pages/InteractiveReading";
import InteractiveListening from "./pages/InteractiveListening";
import InteractiveSpeaking from "./pages/InteractiveSpeaking";
import InteractiveWriting from "./pages/InteractiveWriting";
import WritingSamplePage from "./pages/WritingSample";
import SpeakAboutThePhoto from "./pages/SpeakAboutThePhoto";
import ReadThenSpeak from "./pages/ReadThenSpeak";
import SpeakingSample from "./pages/SpeakingSample";
import FullTest from "./pages/FullTest";
import MenuDuolingo from "./components/MenuDuolingo";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/full-test" element={<FullTest />} />
      <Route path="/duolingo-menu" element={<MenuDuolingo />} />
      <Route path="/listening-test" element={<ListeningTest />} />
      <Route path="/image-test" element={<ImageTest />} />
      <Route path="/read-and-complete" element={<ReadAndComplete />} />
      <Route path="/fill-in-the-blanks" element={<FillInTheBlanks />} />
      <Route path="/read-and-select" element={<ReadAndSelect />} />
      <Route path="/interactive-reading" element={<InteractiveReading />} />
  <Route path="/interactive-listening" element={<InteractiveListening />} />
  <Route path="/interactive-writing" element={<InteractiveWriting />} />
  <Route path="/writing-sample" element={<WritingSamplePage />} />
  <Route path="/interactive-speaking" element={<InteractiveSpeaking />} />
    <Route path="/speak-about-photo" element={<SpeakAboutThePhoto />} />
      <Route path="/read-then-speak" element={<ReadThenSpeak />} />
      <Route path="/speaking-sample" element={<SpeakingSample />} />
      <Route path="/real-words-test" element={<RealWordsTest />} />
    </Routes>

  );
}

export default App;
