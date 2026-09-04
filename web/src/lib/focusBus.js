import { emitDesktop, listenDesktop } from './desktop';

export const FOCUS_BUS = 'kanbot-focus';
export const ISLAND_PREFS_BUS = 'kanbot-island-prefs';

export function publishFocusBus(payload) {
  try {
    window.dispatchEvent(new CustomEvent(FOCUS_BUS, { detail: payload }));
  } catch {
    /* ignore */
  }
  emitDesktop(FOCUS_BUS, payload).catch(() => {});
}

export function subscribeFocusBus(handler) {
  const onWindow = (event) => handler(event.detail);
  window.addEventListener(FOCUS_BUS, onWindow);
  let stopDesktop = () => {};
  listenDesktop(FOCUS_BUS, (event) => handler(event?.payload)).then((unlisten) => {
    stopDesktop = unlisten;
  });
  return () => {
    window.removeEventListener(FOCUS_BUS, onWindow);
    stopDesktop();
  };
}

export function publishIslandPrefsBus(prefs) {
  try {
    window.dispatchEvent(new CustomEvent(ISLAND_PREFS_BUS, { detail: prefs }));
  } catch {
    /* ignore */
  }
  emitDesktop(ISLAND_PREFS_BUS, prefs).catch(() => {});
}

export function subscribeIslandPrefsBus(handler) {
  const onWindow = (event) => handler(event.detail);
  window.addEventListener(ISLAND_PREFS_BUS, onWindow);
  let stopDesktop = () => {};
  listenDesktop(ISLAND_PREFS_BUS, (event) => handler(event?.payload)).then((unlisten) => {
    stopDesktop = unlisten;
  });
  return () => {
    window.removeEventListener(ISLAND_PREFS_BUS, onWindow);
    stopDesktop();
  };
}
