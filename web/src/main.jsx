import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './context/AppContext';
import { FocusProvider } from './context/FocusContext';
import { UpdateProvider } from './context/UpdateContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <FocusProvider>
          <UpdateProvider>
            <App />
          </UpdateProvider>
        </FocusProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
