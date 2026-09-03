function compactTask(t) {
  return {
    id: t.id,
    title: t.title,
    status: t.statusKey,
    column: t.columnName,
    priority: t.priority,
    projectId: t.projectId,
    project: t.projectKey || t.projectName,
    assigneeId: t.assigneeId,
    assignee: t.assignee?.name || null,
    due: t.dueDate,
    progress: t.progress,
    hours: t.estimateHours,
    logged: t.loggedHours,
    labels: t.labels || [],
  };
}

export function buildCatalog({
  tasks = [],
  projects = [],
  members = [],
  statuses = [],
  insights = [],
  stats = null,
  workload = [],
  activity = [],
  columns = [],
  today,
} = {}) {
  return {
    today: today || new Date().toISOString().slice(0, 10),
    stats: stats || null,
    statuses: statuses.map((s) => ({ key: s.key, name: s.name, color: s.color })),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      color: m.color,
    })),
    workload: (workload || []).map((m) => ({
      id: m.id,
      name: m.name,
      openTasks: m.openTasks,
      hours: m.hours,
      utilization: m.utilization,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      status: p.status,
      progress: p.progress,
      taskCount: p.taskCount,
      doneCount: p.doneCount,
      color: p.color,
      ownerId: p.ownerId,
    })),
    tasks: tasks.map(compactTask),
    insights: insights.map((i) => ({
      id: i.id,
      title: i.title,
      detail: i.detail,
      kind: i.kind,
      applied: Boolean(i.applied),
    })),
    activity: (activity || []).slice(0, 8).map((a) => ({
      id: a.id,
      action: a.action,
      target: a.target,
      memberId: a.memberId,
      at: a.at,
    })),
    columns: (columns.length
      ? columns
      : uniqueColumns(tasks)
    ).map((c) => ({
      id: c.id,
      name: c.name || c.columnName || c.column,
      statusKey: c.statusKey || c.status,
      projectId: c.projectId,
      projectName: c.projectName || c.project,
      wipLimit: c.wipLimit ?? null,
    })),
  };
}

function uniqueColumns(tasks) {
  const map = new Map();
  for (const t of tasks) {
    const id = t.columnId || t.column || t.status;
    if (!id || map.has(id)) continue;
    map.set(id, {
      id,
      name: t.columnName || t.column || t.status,
      statusKey: t.statusKey || t.status,
      projectId: t.projectId,
      projectName: t.projectKey || t.project,
    });
  }
  return [...map.values()];
}

export function indexCatalog(catalog) {
  const tasks = catalog?.tasks || [];
  const members = catalog?.members || [];
  const projects = catalog?.projects || [];
  const insights = catalog?.insights || [];
  const columns = catalog?.columns || [];
  const workload = catalog?.workload || [];
  return {
    catalog,
    taskById: Object.fromEntries(tasks.map((t) => [t.id, t])),
    memberById: Object.fromEntries(members.map((m) => [m.id, m])),
    projectById: Object.fromEntries(projects.map((p) => [p.id, p])),
    insightById: Object.fromEntries(insights.map((i) => [i.id, i])),
    columnById: Object.fromEntries(columns.map((c) => [c.id, c])),
    workloadById: Object.fromEntries(workload.map((m) => [m.id, m])),
  };
}
