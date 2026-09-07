import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { persistChatThread, readChatThread, subscribeChatBus } from '../lib/chatBus';
import { listenDesktop } from '../lib/desktop';
import { contextChips, contextLabel, contextPayload, mergeContext, routeContext } from '../lib/ai/context';
import { useApp } from './AppContext';
import { useFocus } from './FocusContext';

const ChatContext = createContext(null);

function sameThread(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Assistente unico do Kanbot. Uma so conversa, aberta pelo botao do assistente
 * ou pela Notch, sempre ciente da tela atual e da tarefa aberta.
 */
export function ChatProvider({ children }) {
  const { loadProjects, loadBootstrap, notify, currentUser, projects } = useApp();
  const { activeTask, running, session: focusSession } = useFocus();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);
  const [messages, setMessages] = useState(() => readChatThread().messages);
  const [value, setValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [suggested, setSuggested] = useState(() => readChatThread().suggested);
  const [extras, setExtras] = useState({});

  useEffect(() => {
    const thread = readChatThread();
    setMessages(thread.messages);
    setSuggested(thread.suggested);
  }, [currentUser?.id]);

  useEffect(() => {
    return subscribeChatBus((next) => {
      if (!next) return;
      setMessages((current) => (sameThread(current, next.messages) ? current : next.messages || []));
      setSuggested((current) => (sameThread(current, next.suggested) ? current : next.suggested));
    });
  }, []);

  const publishContext = useCallback((source, payload) => {
    setExtras((current) => {
      if (!payload) {
        if (!(source in current)) return current;
        const next = { ...current };
        delete next[source];
        return next;
      }
      return { ...current, [source]: payload };
    });
  }, []);

  const focusPhase = focusSession?.phase;
  const focus = useMemo(
    () => (running && activeTask ? { taskId: activeTask.id, title: activeTask.title, phase: focusPhase } : null),
    [running, activeTask?.id, activeTask?.title, focusPhase],
  );

  const context = useMemo(
    () => ({ ...mergeContext(routeContext(pathname, { projects }), extras), focus }),
    [pathname, projects, extras, focus],
  );

  const chips = suggested?.length ? suggested : contextChips(context);

  const send = useCallback(
    async (text, options = {}) => {
      const prompt = (text ?? value).trim();
      const image = typeof options.image === 'string' && options.image.startsWith('data:image') ? options.image : null;
      if ((!prompt && !image) || thinking) return;
      const asked = prompt || 'O que voce ve nesta tela?';
      setValue('');
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const userMessage = { role: 'user', text: asked, sawScreen: Boolean(image) };
      const pending = [...messages, userMessage];
      setMessages(pending);
      persistChatThread({ messages: pending, suggested });
      setThinking(true);
      try {
        const payload = contextPayload(context) || { screen: 'desktop', screenLabel: 'Notch' };
        if (image) payload.watchingScreen = true;
        const res = await api.ask(asked, history, payload, image);
        if (res.applied?.some((a) => a.ok)) {
          loadProjects();
          loadBootstrap();
          notify(
            res.applied
              .filter((a) => a.ok)
              .map((a) => a.label)
              .join(' · '),
            'success',
          );
        } else if (res.applied?.some((a) => !a.ok)) {
          notify(res.applied.find((a) => !a.ok).error, 'warn');
        }
        const botMessage = {
          role: 'bot',
          text: res.answer,
          blocks: res.blocks || [],
          suggestions: res.suggestions,
          applied: res.applied || [],
        };
        const next = [...pending, botMessage];
        setMessages(next);
        persistChatThread({ messages: next, suggested: res.suggestions?.length ? res.suggestions : suggested });
        if (res.suggestions?.length) setSuggested(res.suggestions);
      } catch {
        const next = [...pending, { role: 'bot', text: 'Nao consegui responder agora.' }];
        setMessages(next);
        persistChatThread({ messages: next, suggested });
      } finally {
        setThinking(false);
      }
    },
    [value, thinking, messages, suggested, context, loadProjects, loadBootstrap, notify],
  );

  const focusChat = useCallback((prefill) => {
    setOpen(true);
    if (typeof prefill === 'string' && prefill) setValue(prefill);
    setFocusNonce((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setSuggested(null);
    setValue('');
    persistChatThread({ messages: [], suggested: null });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};
    listenDesktop('kanbot-open-chat', () => {
      focusChat();
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else stop = unlisten;
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [focusChat]);

  const valueBag = {
    open,
    setOpen,
    focusChat,
    focusNonce,
    toggle: () => setOpen((o) => !o),
    messages,
    value,
    setValue,
    thinking,
    chips,
    send,
    reset,
    context,
    contextLabel: contextLabel(context),
    publishContext,
    userName: currentUser?.name?.split(' ')[0] || 'voce',
  };

  return <ChatContext.Provider value={valueBag}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat precisa estar dentro de <ChatProvider>');
  return ctx;
}

/**
 * Publica o contexto de uma tela no assistente enquanto ela estiver montada.
 * `source` identifica a tela; `payload` e serializado para evitar re-publicacao
 * a cada render.
 */
export function useAssistantContext(source, payload) {
  const { publishContext } = useChat();
  const json = JSON.stringify(payload ?? null);

  useEffect(() => {
    publishContext(source, JSON.parse(json));
    return () => publishContext(source, null);
  }, [source, json, publishContext]);
}
