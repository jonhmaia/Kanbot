import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LoginCard from '../components/auth/LoginCard';
import { Card } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { IconLogo } from '../lib/icons';
import { roleLabel } from '../lib/profile';

export default function InvitePage({ token: tokenProp, onReady }) {
  const params = useParams();
  const token = tokenProp || params.token;
  const navigate = useNavigate();
  const app = useApp();
  const session = app.session;
  const currentUser = app.currentUser;
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const auto = useRef(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    api
      .peekInvite(token)
      .then((row) => {
        if (alive) setInvite(row);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api.acceptInvite(token);
      await (onReady || app.loadBootstrap)?.();
      navigate('/tasks/' + result.projectId, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const emailMismatch = invite && currentUser?.email && invite.email && currentUser.email.toLowerCase() !== invite.email;
  const canAccept = session && invite && invite.status === 'pending' && !emailMismatch;

  useEffect(() => {
    if (!canAccept || auto.current) return;
    auto.current = true;
    accept();
  }, [canAccept]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="mb-7 flex flex-col items-center gap-3">
        <IconLogo size={42} />
        <p className="font-display text-[15px] tracking-tight text-chalk/80">Convite para colaborar</p>
      </div>

      <Card tone="dark" className="grain w-full max-w-[420px] px-8 py-8">
        {error && !invite && <p className="text-[13px] text-rose">{error}</p>}
        {invite && (
          <>
            <p className="text-[11px] uppercase tracking-[0.14em] text-smoke">Projeto</p>
            <h1 className="mt-1 font-display text-[24px] tracking-tight text-chalk">{invite.projectName}</h1>
            <p className="mt-2 text-[13px] text-smoke">
              {invite.inviterName || 'Alguem'} convidou <span className="text-chalk">{invite.email}</span> como{' '}
              {roleLabel(invite.role).toLowerCase()}.
            </p>
            {invite.status !== 'pending' && (
              <p className="mt-3 text-[12.5px] text-amber">Este convite ja foi {invite.status === 'accepted' ? 'aceito' : invite.status}.</p>
            )}
            {emailMismatch && (
              <p className="mt-3 text-[12.5px] text-rose">
                Entre com {invite.email}. Voce esta em {currentUser.email}.
              </p>
            )}
            {error && invite && <p className="mt-3 text-[12.5px] text-rose">{error}</p>}
            {canAccept && (
              <button type="button" disabled={busy} onClick={accept} className="btn-primary mt-5 w-full justify-center py-3">
                {busy ? 'Entrando...' : 'Aceitar convite'}
              </button>
            )}
          </>
        )}
      </Card>

      {!session && invite?.status === 'pending' && (
        <div className="mt-6 w-full max-w-[420px]">
          <LoginCard onReady={onReady || app.loadBootstrap} defaultEmail={invite.email} />
        </div>
      )}
    </div>
  );
}
