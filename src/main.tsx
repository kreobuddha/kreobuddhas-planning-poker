import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
// The library's tokens must land before the app's own stylesheet, so the app can override them.
import '@kreobuddha/ui/styles.css';
import './index.scss';
import App from './App.tsx';
import store from '@/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
