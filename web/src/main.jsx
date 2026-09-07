import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import DesktopUpdater from './components/desktop/DesktopUpdater';
import IslandApp from './components/island/IslandApp';
import { AppProvider } from './context/AppContext';
import { ChatProvider } from './context/ChatContext';
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
      <MemoryRouter initialEntries={['/desktop']}>
        <AppProvider>
          <FocusProvider>
            <ChatProvider>
              <IslandApp />
            </ChatProvider>
          </FocusProvider>
        </AppProvider>
      </MemoryRouter>
    ) : (
      <BrowserRouter>
        <AppProvider>
          <FocusProvider>
            <DesktopUpdater />
            <App />
          </FocusProvider>
        </AppProvider>
      </BrowserRouter>
    )}
  </React.StrictMode>,
);
