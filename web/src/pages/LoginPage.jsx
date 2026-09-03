import { useState } from 'react';
import { Card } from '../components/ui/Primitives';
import { IconLogo } from '../lib/icons';
import { api } from '../lib/api';

export default function LoginPage({ onReady }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('jason@kanbot.io');
  const [password, setPassword] = useState('Kanbot!demo');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'signup') {
        const data = await api.signUp(email.trim(), password, name.trim());
        if (!data.session) {
          setInfo('Conta criada. Confirme o e-mail ou entre se a confirmacao estiver desligada.');
          setMode('signin');
          return;
        }
      } else {
        await api.signIn(email.trim(), password);
      }
      await onReady?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="grain w-full max-w-[420px] p-7">
        <div className="mb-6 flex items-center gap-3">
          <IconLogo size={34} />
          <div>
            <p className="font-display text-[22px] text-chalk">Kanbot</p>
            <p className="text-[12px] text-smoke">Entre para ver o board no Supabase</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-smoke">Nome</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                placeholder="Seu nome"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-smoke">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-smoke">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
              minLength={6}
            />
          </label>

          {error && <p className="text-[12.5px] text-rose">{error}</p>}
          {info && <p className="text-[12.5px] text-mint">{info}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            {busy ? 'Entrando...' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-smoke">
          {mode === 'signin' ? 'Nao tem conta?' : 'Ja tem conta?'}{' '}
          <button
            type="button"
            className="text-amber hover:underline"
            onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          >
            {mode === 'signin' ? 'Criar agora' : 'Entrar'}
          </button>
        </p>
        <p className="mt-3 text-center text-[11px] text-smoke">
          Demo: jason@kanbot.io / Kanbot!demo
        </p>
      </Card>
    </div>
  );
}
