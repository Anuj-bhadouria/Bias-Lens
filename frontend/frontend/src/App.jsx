import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CaseAudit from './pages/CaseAudit';
import UploadAudit from './pages/UploadAudit';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audit/:caseId" element={<CaseAudit />} />
        <Route path="/upload" element={<UploadAudit />} />
        {/* Add placeholders for other links if needed */}
        <Route path="/text" element={<div className="text-white p-20">Text Analysis Coming Soon</div>} />
        <Route path="/jobs" element={<div className="text-white p-20">Jobs Board Coming Soon</div>} />
      </Routes>
    </Router>
  );
}

export default App;