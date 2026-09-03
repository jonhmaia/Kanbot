import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import IslandApp from './components/island/IslandApp';
import { AppProvider } from './context/AppContext';
import { FocusProvider } from './context/FocusContext';
import './index.css';

const isIsland = new URLSearchParams(window.location.search).has('island');
if (isIsland) {
  document.documentElement.classList.add('island');
  document.title = 'Kanbot';
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isIsland ? (
      <AppProvider>
        <FocusProvider>
          <IslandApp />
        </FocusProvider>
      </AppProvider>
    ) : (
      <BrowserRouter>
        <AppProvider>
          <FocusProvider>
            <App />
          </FocusProvider>
        </AppProvider>
      </BrowserRouter>
    )}
  </React.StrictMode>,
);
