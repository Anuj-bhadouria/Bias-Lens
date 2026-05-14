import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CaseAudit from './pages/CaseAudit';
import TextBias from './pages/TextBias';
import UploadAudit from './pages/UploadAudit';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audit/:caseId" element={<CaseAudit />} />
        <Route path="/text" element={<TextBias />} />
        <Route path="/upload" element={<UploadAudit />} />

      </Routes>
    </Router>
  );
}

export default App;