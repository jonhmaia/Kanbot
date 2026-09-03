import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { AvatarStack, Card, Dropdown, EmptyState } from '../components/ui/Primitives';
import { ProjectSheet } from '../components/board/BoardSheets';
import { IconChevronRight, IconPencil, IconPlus, IconTrash, projectIcons } from '../lib/icons';
import { formatDate } from '../lib/format';
import { useApp } from '../context/AppContext';

const FILTERS = [
  { value: 'all', label: 'Todos os projetos' },
  { value: 'active', label: 'Ativos' },
  { value: 'on_hold', label: 'Em pausa' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, members, createProject, updateProject, removeProject, setTaskScope, setTaskTab } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState(null); // null | { project? }

  const list = useMemo(
    () =>
      projects
        .filter((p) => (filter === 'all' ? true : p.status === filter))
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, filter, search],
  );

  const save = async (payload) => {
    if (sheet?.project) await updateProject(sheet.project.id, payload);
    else await createProject(payload);
    setSheet(null);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        eyebrow={projects.length + ' projetos neste workspace'}
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
                <Card key={project.id} className="grain group flex flex-col p-5 transition hover:border-white/20">
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
                        onClick={() => setSheet({ project })}
                        className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white/[0.05] text-smoke transition hover:text-chalk"
                        aria-label="Editar"
                      >
                        <IconPencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProject(project.id)}
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
                      onClick={() => {
                        setTaskScope(project.id);
                        setTaskTab('board');
                        navigate('/tasks/' + project.id);
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
    </>
  );
}
