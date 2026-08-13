import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useCheckAuth } from '@/auth/useCheckAuth';
import Home from '@/main/sections/Home/Home';
import Room from '@/main/sections/Room/Room';

const App = (): ReactElement => {
  const { userId, loading, error } = useCheckAuth();

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
};

export default App;
