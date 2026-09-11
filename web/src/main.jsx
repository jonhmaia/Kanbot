import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import IslandApp from './components/island/IslandApp';
import { AppProvider } from './context/AppContext';
import { ChatProvider } from './context/ChatContext';
import { FocusProvider } from './context/FocusContext';
import { UpdateProvider } from './context/UpdateContext';
import { isDesktop } from './lib/desktop';
import './index.css';

function urlSaysIsland() {
  return (
    window.__KANBOT_ISLAND__ === 1 ||
    document.documentElement.classList.contains('island') ||
    new URLSearchParams(window.location.search).has('island') ||
    window.location.hash.includes('island')
  );
}

async function detectIsland() {
  if (urlSaysIsland()) return true;
  if (!isDesktop()) return false;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return getCurrentWindow().label === 'island';
  } catch {
    return false;
  }
}

function renderApp(isIsland) {
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
              <UpdateProvider>
                <App />
              </UpdateProvider>
            </FocusProvider>
          </AppProvider>
        </BrowserRouter>
      )}
    </React.StrictMode>,
  );
}

detectIsland().then(renderApp);
