import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@kreobuddha/ui';
import { useCheckAuth } from '@/auth/useCheckAuth';
import AppHeader from '@/components/AppHeader/AppHeader';
import Home from '@/main/sections/Home/Home';
import Room from '@/main/sections/Room/Room';

const App = (): ReactElement => {
  const { userId, loading, error } = useCheckAuth();

  const content = ((): ReactElement => {
    if (error) {
      return <div className="app-loading">Could not connect: {error}</div>;
    }

    if (loading || !userId) {
      return <div className="app-loading">Loading…</div>;
    }

    return (
      <Routes>
        <Route path="/" element={<Home userId={userId} />} />
        <Route path="/room/:code" element={<Room userId={userId} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  })();

  return (
    // Toast is the one component in the library that needs a provider above the tree, and
    // useToast throws without it.
    <ToastProvider label="Notifications">
      {/* The router also wraps the loading and error screens: AppHeader links home, and a Link
          outside a router throws. */}
      <BrowserRouter>
        <AppHeader />
        {content}
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
