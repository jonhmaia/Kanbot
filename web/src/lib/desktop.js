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
