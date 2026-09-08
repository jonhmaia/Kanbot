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

function stripFocus(focus) {
  if (!focus || typeof focus !== 'object') return null;
  const projectId = String(focus.projectId || '').trim();
  if (!projectId) return null;
  return {
    projectId,
    projectName: String(focus.projectName || ''),
    projectKey: String(focus.projectKey || ''),
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
    threadFocus: stripFocus(raw.threadFocus),
  };
}

export function persistChatThread(patch) {
  const current = readChatThread();
  const next = {
    messages: Array.isArray(patch.messages)
      ? patch.messages.map(stripMessage).filter(Boolean).slice(-40)
      : current.messages,
    suggested: patch.suggested === undefined ? current.suggested : patch.suggested,
    threadFocus: patch.threadFocus === undefined ? current.threadFocus : stripFocus(patch.threadFocus),
  };
  writeLocalJson(CHAT_KEY, next);
  publishChatBus(next);
  return next;
}

/** Ultimo projeto criado ou onde uma tarefa foi criada nesta conversa. */
export function focusFromApplied(applied, projects, prev) {
  const created = [...(applied || [])].reverse().find((a) => a.ok && a.project)?.project;
  if (created?.id) {
    return { projectId: created.id, projectName: created.name || '', projectKey: created.key || '' };
  }
  const taskHit = [...(applied || [])].reverse().find((a) => a.ok && a.task);
  const pid = taskHit?.task?.projectId;
  if (pid) {
    const p = (projects || []).find((x) => x.id === pid);
    if (p) return { projectId: p.id, projectName: p.name || '', projectKey: p.key || '' };
    if (prev?.projectId === pid) return prev;
    return { projectId: pid, projectName: prev?.projectName || '', projectKey: prev?.projectKey || '' };
  }
  return prev || null;
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
