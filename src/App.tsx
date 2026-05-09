import { BrowserRouter, Routes, Route } from "react-router-dom";
import Submit from "./pages/sixthsubmit";
import SixthSubmit from "./pages/sixthsubmit";
import TopChurch from "./pages/top-church";
import Habits from "./pages/habits";


function App() {
  return (
    <div  className="min-h-screen bg-white">
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
