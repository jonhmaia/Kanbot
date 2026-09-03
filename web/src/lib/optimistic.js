export function tempId() {
  return 'tmp-' + Math.random().toString(36).slice(2, 10);
}

export function draftTask(payload, extras = {}) {
  return {
    id: extras.id || tempId(),
    projectId: extras.projectId || '',
    columnId: payload.columnId || extras.columnId || '',
    title: payload.title?.trim() || 'Nova tarefa',
    description: payload.description || '',
    priority: payload.priority || 'medium',
    assigneeId: payload.assigneeId || null,
    labels: payload.labels || [],
    dueDate: payload.dueDate || null,
    estimateHours: Number(payload.estimateHours) || 4,
    loggedHours: 0,
    progress: Number(payload.progress) || 0,
    checklist: payload.checklist || [],
    comments: 0,
    attachments: 0,
    position: extras.position ?? 0,
    createdAt: extras.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusKey: extras.statusKey || 'backlog',
    columnName: extras.columnName || '',
    projectName: extras.projectName || '',
    projectKey: extras.projectKey || '',
    projectColor: extras.projectColor || '#F5A524',
    assignee: extras.assignee || null,
  };
}

export function mergeTask(task, payload, members = [], column) {
  const assigneeId = payload.assigneeId !== undefined ? payload.assigneeId : task.assigneeId;
  const assignee =
    payload.assigneeId !== undefined
      ? members.find((m) => m.id === payload.assigneeId) || null
      : task.assignee;
  return {
    ...task,
    title: payload.title != null ? payload.title : task.title,
    description: payload.description != null ? payload.description : task.description,
    priority: payload.priority || task.priority,
    assigneeId,
    assignee,
    labels: payload.labels || task.labels,
    dueDate: payload.dueDate !== undefined ? payload.dueDate : task.dueDate,
    estimateHours: payload.estimateHours != null ? Number(payload.estimateHours) : task.estimateHours,
    progress: payload.progress != null ? Number(payload.progress) : task.progress,
    columnId: payload.columnId || task.columnId,
    columnName: column?.name || task.columnName,
    statusKey: column?.statusKey || task.statusKey,
    updatedAt: new Date().toISOString(),
  };
}

export function moveOnBoard(board, task, target) {
  if (!board) return board;
  const columns = board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== task.id) }));
  const dest = columns.find(
    (c) => (target.columnId && c.id === target.columnId) || (target.statusKey && c.statusKey === target.statusKey),
  );
  if (dest) {
    dest.tasks.splice(target.position ?? dest.tasks.length, 0, {
      ...task,
      columnId: dest.id,
      statusKey: dest.statusKey || task.statusKey,
      columnName: dest.name,
    });
  }
  return { ...board, columns };
}

export function addTaskToBoard(board, task, columnId) {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map((c) =>
      c.id === columnId || c.statusKey === columnId ? { ...c, tasks: [...c.tasks, task] } : c,
    ),
  };
}

export function replaceTaskOnBoard(board, fromId, next) {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map((c) => ({
      ...c,
      tasks: c.tasks.map((t) => (t.id === fromId ? { ...t, ...next } : t)),
    })),
  };
}

export function removeTaskFromBoard(board, taskId) {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })),
  };
}

export function applyTaskPatch(board, task, payload, members) {
  if (!board) return board;
  let next = board;
  if (payload.columnId && payload.columnId !== task.columnId) {
    next = moveOnBoard(next, task, { columnId: payload.columnId });
  }
  return {
    ...next,
    columns: next.columns.map((c) => ({
      ...c,
      tasks: c.tasks.map((t) => (t.id === task.id ? mergeTask(t, payload, members, c) : t)),
    })),
  };
}

export function addColumnToBoard(board, column) {
  if (!board) return board;
  return { ...board, columns: [...board.columns, { ...column, tasks: column.tasks || [] }] };
}

export function patchColumnOnBoard(board, columnId, payload) {
  if (!board) return board;
  return {
    ...board,
    columns: board.columns.map((c) =>
      c.id === columnId
        ? {
            ...c,
            name: payload.name ?? c.name,
            color: payload.color ?? c.color,
            wipLimit: payload.wipLimit !== undefined ? payload.wipLimit : c.wipLimit,
            statusKey: payload.statusKey || c.statusKey,
          }
        : c,
    ),
  };
}

export function removeColumnFromBoard(board, column) {
  if (!board) return board;
  const fallback = board.columns.find((c) => c.id !== column.id);
  return {
    ...board,
    columns: board.columns
      .filter((c) => c.id !== column.id)
      .map((c) => (fallback && c.id === fallback.id ? { ...c, tasks: [...c.tasks, ...column.tasks] } : c)),
  };
}

export function draftProject(payload, workspaceId) {
  const columns = payload.columns || [];
  return {
    id: tempId(),
    workspaceId,
    name: payload.name?.trim() || 'Novo projeto',
    key: (payload.key || payload.name || 'PRJ').slice(0, 3).toUpperCase(),
    description: payload.description || '',
    color: payload.color || '#F5A524',
    icon: payload.icon || 'sparkle',
    status: 'active',
    ownerId: payload.ownerId || null,
    startDate: payload.startDate || new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate || null,
    createdAt: new Date().toISOString(),
    columnCount: columns.length || 4,
    taskCount: 0,
    doneCount: 0,
    progress: 0,
    memberIds: payload.ownerId ? [payload.ownerId] : [],
  };
}
