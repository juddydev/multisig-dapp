import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MultisigCreation from './components/MultisigCreation';
import TransferTokens from './components/TokenTransfer';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<MultisigCreation />} />
          <Route path="/transfer-tokens" element={<TransferTokens />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
