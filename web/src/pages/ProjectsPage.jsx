import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { AvatarStack, Card, Dropdown, EmptyState } from '../components/ui/Primitives';
import { ProjectSheet } from '../components/board/BoardSheets';
import InviteSheet from '../components/project/InviteSheet';
import { IconChevronRight, IconPencil, IconPlus, IconTrash, IconUsers, projectIcons } from '../lib/icons';
import { formatDate } from '../lib/format';
import { useApp } from '../context/AppContext';
import { useAssistantContext } from '../context/ChatContext';

const FILTERS = [
  { value: 'all', label: 'Todos os projetos' },
  { value: 'active', label: 'Ativos' },
  { value: 'on_hold', label: 'Em pausa' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, members, pendingInvites, createProject, updateProject, removeProject, setTaskScope, setTaskTab, loadBootstrap } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState(null);
  const [invite, setInvite] = useState(null);

  const list = useMemo(
    () =>
      projects
        .filter((p) => (filter === 'all' ? true : p.status === filter))
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, filter, search],
  );

  /* o assistente enxerga a lista de projetos e o projeto em edicao */
  useAssistantContext(
    'projects',
    useMemo(
      () => ({
        projectId: sheet?.project?.id || null,
        projectName: sheet?.project?.name || null,
        projectKey: sheet?.project?.key || null,
        view: {
          visible: list.length,
          total: projects.length,
          filter,
          search: search || undefined,
          editingProject: sheet?.project?.name,
          newProjectSheet: Boolean(sheet && !sheet.project) || undefined,
        },
      }),
      [list.length, projects.length, filter, search, sheet],
    ),
  );

  const save = async (payload) => {
    if (sheet?.project) await updateProject(sheet.project.id, payload);
    else await createProject(payload);
    setSheet(null);
  };

  const openBoard = (project) => {
    setTaskScope(project.id);
    setTaskTab('board');
    navigate('/tasks/' + project.id);
  };

  return (
    <>
      <PageHeader
        title="Projetos"
        eyebrow={projects.length + ' projetos visiveis para voce'}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar projeto..."
        right={<Dropdown value={filter} options={FILTERS} onChange={setFilter} />}
        action={
          <button type="button" onClick={() => setSheet({})} className="btn-primary">
            <IconPlus size={14} /> Novo projeto
          </button>
        }
      />

      <div className="px-5 pb-10 sm:px-7">
        {pendingInvites?.length > 0 && (
          <div className="mb-4 space-y-2">
            {pendingInvites.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => navigate('/invite/' + inv.token)}
                className="flex w-full items-center justify-between rounded-2xl border border-amber/30 bg-amber/[0.07] px-4 py-3 text-left"
              >
                <span className="text-[13px] text-chalk">
                  Convite para <strong>{inv.projectName}</strong>
                </span>
                <span className="text-[12px] text-amber">Aceitar</span>
              </button>
            ))}
          </div>
        )}
        {list.length === 0 ? (
          <EmptyState
            title="Nenhum projeto por aqui"
            description="Crie um projeto para ganhar um kanban proprio, com colunas e limites de WIP customizaveis."
            action={
              <button type="button" onClick={() => setSheet({})} className="btn-primary">
                <IconPlus size={14} /> Criar projeto
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((project) => {
              const Icon = projectIcons[project.icon] || projectIcons.layers;
              const team = members.filter((m) => project.memberIds.includes(m.id));
              return (
                <Card
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openBoard(project)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openBoard(project);
                    }
                  }}
                  className="grain group flex cursor-pointer flex-col p-5 transition hover:border-white/20"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-2xl"
                      style={{ background: project.color + '22', color: project.color }}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvite(project);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-smoke transition hover:text-chalk"
                        aria-label="Convidar"
                      >
                        <IconUsers size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSheet({ project });
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-smoke transition hover:text-chalk"
                        aria-label="Editar"
                      >
                        <IconPencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProject(project.id);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-smoke transition hover:border-rose/40 hover:text-rose"
                        aria-label="Excluir"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </div>

                  <h3 className="mt-4 font-display text-[18px] tracking-tight text-chalk">{project.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-smoke">{project.description}</p>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-smoke">
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 tracking-wider">{project.key}</span>
                    <span>{project.taskCount} tarefas</span>
                    <span>·</span>
                    <span>{project.columnCount} colunas</span>
                    {project.status === 'on_hold' && (
                      <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-amber">em pausa</span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-smoke">
                      <span>Progresso</span>
                      <span className="tabular-nums text-dust">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: project.progress + '%', background: project.color }}
                      />
                    </div>
                  </div>

                  <footer className="mt-5 flex items-center justify-between border-t border-lineSoft pt-4">
                    <div className="flex items-center gap-3">
                      <AvatarStack members={team} size={24} />
                      <span className="text-[11px] text-smoke">
                        {project.dueDate ? 'entrega ' + formatDate(project.dueDate) : 'sem prazo'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBoard(project);
                      }}
                      className="flex items-center gap-1 rounded-full border border-line bg-white/[0.05] px-3 py-1.5 text-[12px] text-dust transition hover:border-white/25 hover:text-chalk"
                    >
                      Abrir board <IconChevronRight size={12} />
                    </button>
                  </footer>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ProjectSheet open={!!sheet} project={sheet?.project} onClose={() => setSheet(null)} onSave={save} />
      <InviteSheet open={!!invite} project={invite} onClose={() => { setInvite(null); loadBootstrap(); }} />
    </>
  );
}
