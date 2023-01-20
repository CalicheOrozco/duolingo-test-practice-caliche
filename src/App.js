import { Routes, Route } from "react-router-dom";
import ListeningTest from "./pages/Listening-test";
import ImageTest from "./pages/Image-test";
import FillInTheBlanks from "./pages/FillInTheBlanks";
import RealWordsTest from "./pages/RealWordsTest";
import Index from "./pages/Index";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/listening-test" element={<ListeningTest />} />
      <Route path="/image-test" element={<ImageTest />} />
      <Route path="/fill-in-the-blanks" element={<FillInTheBlanks />} />
      <Route path="/real-words-test" element={<RealWordsTest />} />
    </Routes>

  );
}

export default App;
