import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { listenDesktop } from '../lib/desktop';
import { useApp } from './AppContext';

export const DEFAULT_CHIPS = [
  'Resumo do sprint',
  'Cria uma tarefa no SFR',
  'Quem esta sobrecarregado?',
  'Mostrar bloqueios',
];

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { loadProjects, loadBootstrap, notify, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);
  const [messages, setMessages] = useState([]);
  const [value, setValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [chips, setChips] = useState(DEFAULT_CHIPS);

  const send = useCallback(
    async (text) => {
      const prompt = (text ?? value).trim();
      if (!prompt || thinking) return;
      setValue('');
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      setMessages((m) => [...m, { role: 'user', text: prompt }]);
      setThinking(true);
      try {
        const res = await api.ask(prompt, history);
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
        if (res.suggestions?.length) setChips(res.suggestions);
      } catch {
        setMessages((m) => [...m, { role: 'bot', text: 'Nao consegui responder agora.' }]);
      } finally {
        setThinking(false);
      }
    },
    [value, thinking, messages, loadProjects, loadBootstrap, notify],
  );

  const focusChat = useCallback(() => {
    setOpen(true);
    setFocusNonce((n) => n + 1);
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
    userName: currentUser?.name?.split(' ')[0] || 'Jason',
  };

  return <ChatContext.Provider value={valueBag}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat precisa estar dentro de <ChatProvider>');
  return ctx;
}
