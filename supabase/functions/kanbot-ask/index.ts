import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const MODEL = 'deepseek/deepseek-v4-flash';
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
          'columnId',
          'statusKey',
          'priority',
          'assigneeId',
          'dueDate',
          'estimateHours',
          'progress',
          'labels',
        ],
        properties: {
          op: { type: 'string', enum: ['create_project', 'create_task', 'update_task'] },
          id: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          color: { type: 'string' },
          icon: { type: 'string' },
          projectId: { type: 'string' },
          columnId: { type: 'string' },
          statusKey: { type: 'string' },
          priority: { type: 'string' },
          assigneeId: { type: 'string' },
          dueDate: { type: 'string' },
          estimateHours: { type: 'string' },
          progress: { type: 'string' },
          labels: { type: 'string' },
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return json({ error: 'OPENROUTER_API_KEY nao configurada' }, 500);
  }

  try {
    const { prompt = '', history = [], catalog = {}, context = null } = await req.json();
    const messages = [
      {
        role: 'system',
        content:
          'Voce e o Kanbot. Responda so com JSON kanbot_reply. Use IDs reais do catalogo. Portugues, direto. Se o usuario pedir criar projeto, criar tarefa ou editar tarefa, preencha actions. Consultas: actions vazio.\n\nCATALOGO:\n' +
          JSON.stringify(catalog) +
          (context
            ? '\n\nCONTEXTO ATUAL DA TELA (o usuario esta olhando isto agora):\n' +
              JSON.stringify(context) +
              '\n"esta tarefa"/"isso" = openTask do contexto (use o id em update_task). "este projeto"/"aqui" = projectId do contexto.'
            : ''),
      },
      ...history.slice(-8).map((m: { role?: string; text?: string }) => ({
        role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.text || ''),
      })),
      { role: 'user', content: String(prompt) },
    ];

    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kanbot.local',
        'X-Title': 'Kanbot',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.25,
        max_tokens: 2200,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'kanbot_reply', strict: true, schema: SCHEMA },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message || 'OpenRouter falhou' }, 502);
    return json({ content: data?.choices?.[0]?.message?.content || '' });
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
