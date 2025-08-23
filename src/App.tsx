import { BrowserRouter, Routes, Route } from "react-router-dom";
import Submit from "./pages/submit";
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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
