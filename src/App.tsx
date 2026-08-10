import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Room from './pages/Room';
import './App.css';

function App() {
  const { userId, loading, error } = useAuth();

  if (error) {
    return <div className="app-loading">Could not connect: {error}</div>;
  }

  if (loading || !userId) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home userId={userId} />} />
        <Route path="/room/:code" element={<Room userId={userId} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
