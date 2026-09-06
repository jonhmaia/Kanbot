export function isDesktop() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isIslandWindow() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('island');
}

export async function invokeDesktop(cmd, args) {
  if (!isDesktop()) return undefined;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

export async function listenDesktop(event, handler) {
  if (!isDesktop()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  return listen(event, handler);
}

export async function emitDesktop(event, payload) {
  if (!isDesktop()) return;
  const { emit } = await import('@tauri-apps/api/event');
  return emit(event, payload);
}

function samePoint(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

async function waitForIslandDrag(win) {
  const begun = Date.now();
  let last = await win.outerPosition().catch(() => null);
  let lastChange = Date.now();
  let moved = false;

  return new Promise((resolve) => {
    const idle = setInterval(async () => {
      const pos = await win.outerPosition().catch(() => last);
      if (pos && last && !samePoint(pos, last)) {
        moved = true;
        lastChange = Date.now();
        last = pos;
      } else if (pos && !last) {
        last = pos;
      }

      const waiting = Date.now() - begun;
      if (moved && Date.now() - lastChange >= 200) {
        clearInterval(idle);
        resolve();
        return;
      }
      if (!moved && waiting >= 700) {
        clearInterval(idle);
        resolve();
        return;
      }
      if (waiting >= 8000) {
        clearInterval(idle);
        resolve();
      }
    }, 40);
  });
}

export async function dragIslandThenSnap() {
  if (!isDesktop()) return undefined;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  try {
    await invokeDesktop('start_drag_island');
    await waitForIslandDrag(win);
    return invokeDesktop('snap_island', { expanded: false });
  } catch {
    return invokeDesktop('snap_island', { expanded: false });
  }
}
