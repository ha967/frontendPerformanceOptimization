import { Navigate, Route, Routes } from 'react-router-dom';
import DemoPage from './pages/DemoPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/step/:index" element={<DemoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
