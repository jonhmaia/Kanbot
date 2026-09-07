import { emitDesktop, listenDesktop } from './desktop';
import { readLocalJson, writeLocalJson } from './userPrefs';

export const CHAT_BUS = 'kanbot-chat';
export const CHAT_KEY = 'kanbot:chat';

function stripMessage(message) {
  if (!message || typeof message !== 'object') return null;
  return {
    role: message.role === 'bot' || message.role === 'assistant' ? 'bot' : 'user',
    text: String(message.text || ''),
    blocks: Array.isArray(message.blocks) ? message.blocks : undefined,
    suggestions: Array.isArray(message.suggestions) ? message.suggestions : undefined,
    applied: Array.isArray(message.applied) ? message.applied : undefined,
    sawScreen: message.sawScreen === true,
  };
}

export function readChatThread() {
  const raw = readLocalJson(CHAT_KEY, {}) || {};
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(stripMessage).filter(Boolean).slice(-40)
    : [];
  return {
    messages,
    suggested: Array.isArray(raw.suggested) ? raw.suggested : null,
  };
}

export function persistChatThread(patch) {
  const current = readChatThread();
  const next = {
    messages: Array.isArray(patch.messages)
      ? patch.messages.map(stripMessage).filter(Boolean).slice(-40)
      : current.messages,
    suggested: patch.suggested === undefined ? current.suggested : patch.suggested,
  };
  writeLocalJson(CHAT_KEY, next);
  publishChatBus(next);
  return next;
}

export function publishChatBus(thread) {
  try {
    window.dispatchEvent(new CustomEvent(CHAT_BUS, { detail: thread }));
  } catch {
    /* ignore */
  }
  emitDesktop(CHAT_BUS, thread).catch(() => {});
}

export function subscribeChatBus(handler) {
  const onWindow = (event) => handler(event.detail);
  window.addEventListener(CHAT_BUS, onWindow);
  let stopDesktop = () => {};
  listenDesktop(CHAT_BUS, (event) => handler(event?.payload)).then((unlisten) => {
    stopDesktop = unlisten;
  });
  return () => {
    window.removeEventListener(CHAT_BUS, onWindow);
    stopDesktop();
  };
}
