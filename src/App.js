import { Routes, Route } from "react-router-dom";
import ListeningTest from "./pages/Listening-test";
import ImageTest from "./pages/Image-test";
import ReadAndComplete from "./pages/ReadAndComplete";
import RealWordsTest from "./pages/RealWordsTest";
import Index from "./pages/Index";
import FillIntheBlanks from "./pages/FillIntheBlanks";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/listening-test" element={<ListeningTest />} />
      <Route path="/image-test" element={<ImageTest />} />
      <Route path="/read-and-complete" element={<ReadAndComplete />} />
      <Route path="/fill-in-the-blanks" element={<FillIntheBlanks />} />
      <Route path="/real-words-test" element={<RealWordsTest />} />
    </Routes>

  );
}

export default App;
