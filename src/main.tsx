import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 2600,
        style: {
          borderRadius: '999px',
          border: '1px solid rgba(251, 113, 133, 0.22)',
          background: 'rgba(255, 255, 255, 0.92)',
          color: '#9f1239',
          boxShadow: '0 20px 50px rgba(190, 18, 60, 0.16)',
          backdropFilter: 'blur(18px)',
        },
      }}
    />
  </React.StrictMode>,
);
