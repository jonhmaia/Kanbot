import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { Avatar, Card, Field, Select } from '../components/ui/Primitives';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { PRESENCE_META, presenceMeta, profileBadges, xpProgress } from '../lib/profile';
import { formatFocusMinutes } from '../lib/focusSession';

const COLORS = ['#F5A524', '#BFE3F2', '#8FE3B0', '#C4B5FD', '#FDA4AF', '#7DD3FC', '#E5484D'];

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, refreshCurrentUser, notify } = useApp();
  const id = userId || currentUser?.id;
  const mine = id === currentUser?.id;
  const [profile, setProfile] = useState(mine ? currentUser : null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getProfile(id)
      .then((row) => {
        setProfile(row);
        if (mine && row) {
          setForm({
            name: row.name || '',
            role: row.role || '',
            color: row.color || '#F5A524',
            statusNote: row.statusNote || '',
            presence: row.presence || 'available',
          });
        }
      })
      .catch((e) => notify(e.message, 'warn'));
  }, [id, mine]);

  if (!profile) {
    return (
      <div className="px-7 pt-24">
        <div className="h-[360px] animate-pulseSoft rounded-4xl bg-white/[0.04]" />
      </div>
    );
  }

  const xp = xpProgress(profile);
  const badges = profileBadges(profile);
  const presence = presenceMeta(profile.presence);

  const save = async () => {
    setBusy(true);
    try {
      const next = await api.updateProfile(form);
      setProfile(next);
      await refreshCurrentUser();
      notify('Perfil atualizado', 'success');
    } catch (e) {
      notify(e.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={mine ? 'Meu perfil' : profile.name} eyebrow="Status, nivel e historico de foco" />

      <div className="grid gap-4 px-5 pb-10 sm:px-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="grain p-6">
          <div className="flex items-center gap-4">
            <Avatar member={profile} size={64} />
            <div className="min-w-0">
              <h2 className="font-display text-[26px] tracking-tight text-chalk">{profile.name}</h2>
              <p className="mt-1 text-[13px] text-smoke">{profile.role || 'Sem cargo'} · {profile.email}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px]" style={{ color: presence.color }}>
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: presence.color }} />
                {presence.label}
                {profile.statusNote ? ' · ' + profile.statusNote : ''}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="metric !text-[36px]">Nv. {profile.level}</p>
                <p className="metric-label mt-1">{profile.xp} XP</p>
              </div>
              <p className="text-[12px] text-smoke">{xp.into}/100 para o proximo nivel</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-amber" style={{ width: Math.round(xp.ratio * 100) + '%' }} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Concluidas" value={profile.tasksCompleted} />
            <Stat label="Foco" value={formatFocusMinutes(profile.focusMinutes)} />
            <Stat label="Streak" value={(profile.currentStreak || 0) + 'd'} />
          </div>

          <div className="mt-6">
            <p className="card-title">Selos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span
                  key={b.id}
                  className={
                    'rounded-full border px-3 py-1.5 text-[12px] ' +
                    (b.earned ? 'border-amber/40 bg-amber/10 text-amber' : 'border-line bg-white/[0.03] text-smoke')
                  }
                  title={b.hint}
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {mine && form && (
          <Card className="grain h-fit p-5">
            <h3 className="card-title">Editar</h3>
            <div className="mt-4 space-y-3">
              <Field label="Nome">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field" />
              </Field>
              <Field label="Cargo">
                <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="field" placeholder="Designer, PM..." />
              </Field>
              <Field label="Status">
                <Select
                  value={form.presence}
                  onChange={(presence) => setForm((f) => ({ ...f, presence }))}
                  options={Object.entries(PRESENCE_META).map(([value, v]) => ({ value, label: v.label, dot: v.color }))}
                />
              </Field>
              <Field label="Nota">
                <input
                  value={form.statusNote}
                  onChange={(e) => setForm((f) => ({ ...f, statusNote: e.target.value }))}
                  className="field"
                  placeholder="Em deep work ate as 16h"
                />
              </Field>
              <Field label="Cor">
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={
                        'h-8 w-8 rounded-full ' +
                        (form.color === c ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[#171718]' : 'ring-1 ring-white/10')
                      }
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </Field>
              <button type="button" disabled={busy} onClick={save} className="btn-primary mt-2 w-full justify-center">
                {busy ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-lineSoft bg-white/[0.03] px-3 py-3">
      <p className="font-display text-[20px] text-chalk">{value}</p>
      <p className="mt-1 text-[11px] text-smoke">{label}</p>
    </div>
  );
}
