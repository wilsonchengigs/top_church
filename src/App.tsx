import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopChurch from "./pages/top-church";
import Habits from "./pages/habits";
import Submit from "./pages/submit";
import SixthSubmit from "./pages/sixthsubmit";

function App() {
  return (
    <div className="min-h-screen bg-white">
      <BrowserRouter>
        <Routes>
          <Route path="/top-church" element={<TopChurch />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/sixthsubmit" element={<SixthSubmit />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
