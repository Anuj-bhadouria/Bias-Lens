import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CaseAudit from "./pages/CaseAudit";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/audit/:caseId" element={<CaseAudit />} />
    </Routes>
  );
}

export default App;