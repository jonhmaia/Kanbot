import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const MODEL = 'deepseek/deepseek-v4-flash';
const VISION_MODEL = 'google/gemini-2.5-flash';
const URL = 'https://openrouter.ai/api/v1/chat/completions';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'suggestions', 'blocks', 'actions'],
  properties: {
    answer: { type: 'string' },
    suggestions: { type: 'array', items: { type: 'string' } },
    actions: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'op',
          'id',
          'name',
          'key',
          'title',
          'description',
          'color',
          'icon',
          'projectId',
          'boardId',
          'sprintId',
          'columnId',
          'statusKey',
          'priority',
          'assigneeId',
          'dueDate',
          'estimateHours',
          'progress',
          'labels',
          'kind',
          'frequencyDays',
          'startsOn',
          'endsOn',
        ],
        properties: {
          op: {
            type: 'string',
            enum: [
              'create_project',
              'create_task',
              'update_task',
              'delete_task',
              'move_task',
              'create_board',
              'update_board',
              'delete_board',
              'create_sprint',
              'close_sprint',
            ],
          },
          id: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          icon: { type: 'string' },
          projectId: { type: 'string' },
          boardId: { type: 'string' },
          sprintId: { type: 'string' },
          columnId: { type: 'string' },
          statusKey: { type: 'string' },
          priority: { type: 'string' },
          assigneeId: { type: 'string' },
          dueDate: { type: 'string' },
          estimateHours: { type: 'string' },
          progress: { type: 'string' },
          labels: { type: 'string' },
          kind: { type: 'string' },
          frequencyDays: { type: 'string' },
          startsOn: { type: 'string' },
          endsOn: { type: 'string' },
        },
      },
    },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'title', 'text', 'ids', 'chartType', 'series', 'stats', 'columns', 'rows'],
        properties: {
          type: {
            type: 'string',
            enum: ['text', 'tasks', 'people', 'projects', 'stats', 'chart', 'table', 'insights', 'activity', 'columns'],
          },
          title: { type: 'string' },
          text: { type: 'string' },
          ids: { type: 'array', items: { type: 'string' } },
          chartType: { type: 'string', enum: ['bar', 'donut', 'line', 'none'] },
          series: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'value', 'color'],
              properties: {
                label: { type: 'string' },
                value: { type: 'number' },
                color: { type: 'string' },
              },
            },
          },
          stats: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'value', 'tone'],
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
                tone: { type: 'string', enum: ['default', 'warn', 'ok', ''] },
              },
            },
          },
          columns: { type: 'array', items: { type: 'string' } },
          rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
        },
      },
    },
  },
};

function isMutation(prompt: string) {
  const q = String(prompt)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /\b(cria(?:r|e)?|adicion(?:a|e|ar)?|nova tarefa|novo card|edita(?:r)?|renomeia(?:r)?|atualiza(?:r)?|altera(?:r)?|muda(?:r)?|move(?:r)?|mova|passa(?:r)?|exclui(?:r)?|apaga(?:r)?|deleta(?:r)?|remove(?:r)?)\b/.test(
    q,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return json({ error: 'OPENROUTER_API_KEY nao configurada' }, 500);
  }

  try {
    const { prompt = '', history = [], catalog = {}, context = null, image = null } = await req.json();
    const mutation = isMutation(String(prompt));
    const userContent = image
      ? [
          { type: 'text', text: String(prompt || 'O que voce ve nesta tela?') },
          { type: 'image_url', image_url: { url: String(image) } },
        ]
      : String(prompt);
    const messages = [
      {
        role: 'system',
        content:
          'Voce e o Kanbot, copiloto de um kanban multi-produto: cada produto tem varios boards (normal = continuo; dinamico = sprints). Responda so com JSON kanbot_reply. Use IDs reais do catalogo. Portugues, direto. Actions: create_project, create_task, update_task, delete_task, move_task, create_board, update_board, delete_board, create_sprint, close_sprint. "neste board" = boardId do contexto. Consultas: actions vazio. Se o usuario pediu criar/editar/mover/excluir, actions NAO pode ser vazio. Se houver print do monitor, use a imagem com o catalogo.\n\nCATALOGO:\n' +
          JSON.stringify(catalog) +
          (context
            ? '\n\nCONTEXTO ATUAL DA TELA (o usuario esta olhando isto agora):\n' +
              JSON.stringify(context) +
              '\n"esta tarefa"/"isso" = openTask. "este projeto"/"aqui" = projectId. "neste board" = boardId do contexto.'
            : '') +
          (mutation
            ? '\n\nO usuario PEDIU uma mutacao real. Preencha actions com pelo menos 1 item. Campos nao usados: string vazia.'
            : ''),
      },
      ...history.slice(-8).map((m: { role?: string; text?: string }) => ({
        role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.text || ''),
      })),
      { role: 'user', content: userContent },
    ];

    const headers = {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kanbot.local',
      'X-Title': 'Kanbot',
    };
    const bodyBase = {
      model: image ? VISION_MODEL : MODEL,
      temperature: 0.25,
      max_tokens: 2200,
      messages,
    };
    const schemaFormat = {
      type: 'json_schema',
      json_schema: { name: 'kanbot_reply', strict: true, schema: SCHEMA },
    };
    const objectFormat = { type: 'json_object' };
    const attempts = mutation ? [objectFormat, schemaFormat] : [schemaFormat, objectFormat];

    let lastError = 'OpenRouter falhou';
    for (const response_format of attempts) {
      const res = await fetch(URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...bodyBase, response_format }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return json({ content: data?.choices?.[0]?.message?.content || '' });
      lastError = (data as { error?: { message?: string } })?.error?.message || lastError;
    }
    return json({ error: lastError }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Falha' }, 500);
  }
});

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}
