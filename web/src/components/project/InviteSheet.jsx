import { useEffect, useState } from 'react';
import { Avatar, Field, Select, Sheet } from '../ui/Primitives';
import { api } from '../../lib/api';
import { IconCopy, IconTrash } from '../../lib/icons';
import { inviteUrl, PROJECT_ROLES, roleLabel } from '../../lib/profile';
import { useApp } from '../../context/AppContext';

export default function InviteSheet({ open, project, onClose }) {
  const { currentUser, notify, loadBootstrap } = useApp();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [link, setLink] = useState('');

  const projectId = project?.id;

  const reload = async () => {
    if (!projectId) return;
    const [roster, pending] = await Promise.all([
      api.listProjectMembers(projectId),
      api.listProjectInvites(projectId),
    ]);
    setMembers(roster);
    setInvites(pending);
  };

  useEffect(() => {
    if (!open || !projectId) return;
    setEmail('');
    setRole('member');
    setLink('');
    reload().catch((e) => notify(e.message, 'warn'));
  }, [open, projectId]);

  const invite = async () => {
    setBusy(true);
    try {
      const row = await api.inviteToProject(projectId, email.trim(), role);
      const url = inviteUrl(row.token);
      setLink(url);
      setEmail('');
      notify('Convite criado. Copie o link.', 'success');
      await reload();
    } catch (e) {
      notify(e.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      notify('Link copiado', 'success');
    } catch {
      notify(url, 'info');
    }
  };

  const revoke = async (id) => {
    try {
      await api.revokeInvite(id);
      notify('Convite revogado', 'warn');
      await reload();
    } catch (e) {
      notify(e.message, 'warn');
    }
  };

  const remove = async (userId) => {
    try {
      await api.removeProjectMember(projectId, userId);
      notify(userId === currentUser?.id ? 'Voce saiu do projeto' : 'Membro removido', 'warn');
      await reload();
      loadBootstrap();
    } catch (e) {
      notify(e.message, 'warn');
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="sm:max-w-[480px]"
      eyebrow={project?.key}
      title="Convidar para o projeto"
      subtitle="A pessoa so ve este projeto — nao os outros do seu workspace."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr,140px]">
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="pessoa@email.com"
            />
          </Field>
          <Field label="Papel">
            <Select value={role} onChange={setRole} options={PROJECT_ROLES} />
          </Field>
        </div>
        <button type="button" disabled={busy || !email.trim()} onClick={invite} className="btn-primary w-full justify-center">
          {busy ? 'Enviando...' : 'Gerar convite'}
        </button>
        {link && (
          <button type="button" onClick={() => copy(link)} className="btn-ghost w-full justify-center gap-2">
            <IconCopy size={14} /> Copiar link
          </button>
        )}

        <div>
          <p className="card-title">Time</p>
          <div className="mt-3 space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3 py-2">
                <Avatar member={m} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-chalk">{m.name}</p>
                  <p className="truncate text-[11px] text-smoke">{roleLabel(m.projectRole || m.role)} · {m.email}</p>
                </div>
                {m.projectRole !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="grid h-8 w-8 place-items-center rounded-full text-smoke hover:text-rose"
                    aria-label="Remover"
                  >
                    <IconTrash size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {invites.length > 0 && (
          <div>
            <p className="card-title">Pendentes</p>
            <div className="mt-3 space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-2xl border border-lineSoft px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-chalk">{inv.email}</p>
                    <p className="text-[11px] text-smoke">{roleLabel(inv.role)}</p>
                  </div>
                  <button type="button" onClick={() => copy(inviteUrl(inv.token))} className="btn-ghost !px-2.5 !py-1 text-[11px]">
                    <IconCopy size={12} />
                  </button>
                  <button type="button" onClick={() => revoke(inv.id)} className="grid h-8 w-8 place-items-center text-smoke hover:text-rose">
                    <IconTrash size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
