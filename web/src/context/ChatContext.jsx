import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { listenDesktop } from '../lib/desktop';
import { contextChips, contextLabel, contextPayload, mergeContext, routeContext } from '../lib/ai/context';
import { useApp } from './AppContext';
import { useFocus } from './FocusContext';

const ChatContext = createContext(null);

/**
 * Assistente unico do Kanbot. Uma so conversa, aberta pelo botao do assistente,
 * sempre ciente da tela atual e da tarefa aberta.
 */
export function ChatProvider({ children }) {
  const { loadProjects, loadBootstrap, notify, currentUser, projects } = useApp();
  const { activeTask, running, session: focusSession } = useFocus();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);
  const [messages, setMessages] = useState([]);
  const [value, setValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [suggested, setSuggested] = useState(null);
  const [extras, setExtras] = useState({});

  /* cada tela publica o que ela sabe (tarefa aberta, filtros, numeros da view) */
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

  /* sessao de foco em andamento tambem e contexto: "a tarefa que estou tocando" */
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
    async (text) => {
      const prompt = (text ?? value).trim();
      if (!prompt || thinking) return;
      setValue('');
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      setMessages((m) => [...m, { role: 'user', text: prompt }]);
      setThinking(true);
      try {
        const res = await api.ask(prompt, history, contextPayload(context));
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
        setMessages((m) => [
          ...m,
          {
            role: 'bot',
            text: res.answer,
            blocks: res.blocks || [],
            suggestions: res.suggestions,
            applied: res.applied || [],
          },
        ]);
        if (res.suggestions?.length) setSuggested(res.suggestions);
      } catch {
        setMessages((m) => [...m, { role: 'bot', text: 'Nao consegui responder agora.' }]);
      } finally {
        setThinking(false);
      }
    },
    [value, thinking, messages, context, loadProjects, loadBootstrap, notify],
  );

  /* abrir o assistente, opcionalmente ja com um texto pronto no input */
  const focusChat = useCallback((prefill) => {
    setOpen(true);
    if (typeof prefill === 'string' && prefill) setValue(prefill);
    setFocusNonce((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setSuggested(null);
    setValue('');
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
