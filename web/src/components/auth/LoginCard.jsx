import { useEffect, useState } from 'react';
import { Card } from '../ui/Primitives';
import { IconLock, IconMail, IconShield, IconUser } from '../../lib/icons';
import { api } from '../../lib/api';

function AuthField({ icon: Icon, label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <span className="relative block">
        <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-smoke" />
        <input className={'field pl-11 ' + className} {...props} />
      </span>
    </label>
  );
}

export default function LoginCard({ onReady, defaultEmail = '' }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const signup = mode === 'signup';
  const reset = mode === 'reset';

  useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (reset) {
        await api.resetPassword(email.trim());
        setInfo('Se o e-mail existir, voce recebe o link para redefinir a senha.');
        setMode('signin');
        return;
      }
      if (signup) {
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
    <Card tone="dark" className="grain w-full overflow-hidden px-8 py-9">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <header className="mb-7">
        <h1 className="font-display text-[26px] font-light tracking-[-0.03em] text-chalk">
          {reset ? 'Recuperar senha' : signup ? 'Criar conta' : 'Entrar'}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-smoke">
          {reset
            ? 'Enviamos um link se este e-mail tiver uma conta.'
            : signup
              ? 'Preencha seus dados para usar o Kanbot no navegador e no app.'
              : 'E-mail e senha da mesma conta no navegador e no Windows.'}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-3">
        {!reset && signup && (
          <AuthField
            icon={IconUser}
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
          />
        )}
        <AuthField
          icon={IconMail}
          type="email"
          label="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          autoComplete="email"
          required
        />
        {!reset && (
          <AuthField
            icon={IconLock}
            type="password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />
        )}

        {error && <p className="text-[12.5px] text-rose">{error}</p>}
        {info && <p className="text-[12.5px] text-mint">{info}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-1 w-full justify-center py-3">
          {busy
            ? reset
              ? 'Enviando...'
              : signup
                ? 'Criando...'
                : 'Entrando...'
            : reset
              ? 'Enviar link'
              : signup
                ? 'Criar conta'
                : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-smoke">
        {reset ? (
          <button type="button" className="text-amber transition hover:underline" onClick={() => setMode('signin')}>
            Voltar ao login
          </button>
        ) : (
          <>
            {signup ? 'Ja tem conta?' : 'Nao tem conta?'}{' '}
            <button
              type="button"
              className="text-amber transition hover:underline"
              onClick={() => {
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                setError('');
                setInfo('');
              }}
            >
              {signup ? 'Entrar' : 'Criar conta'}
            </button>
            {!signup && (
              <>
                <span className="mx-2 text-white/20">·</span>
                <button type="button" className="text-dust transition hover:underline" onClick={() => setMode('reset')}>
                  Esqueci a senha
                </button>
              </>
            )}
          </>
        )}
      </p>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-smoke">
        <IconShield size={13} className="text-dust" />
        Protegido por criptografia
      </p>
    </Card>
  );
}
