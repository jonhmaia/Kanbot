import { OPENROUTER_MODEL, OPENROUTER_URL, OPENROUTER_VISION_MODEL, REPLY_JSON_SCHEMA, buildSystemPrompt } from './schema.js';
import { describeContext } from './context.js';

function userContent(prompt, image) {
  if (!image) return prompt;
  return [
    { type: 'text', text: prompt || 'O que voce ve nesta tela?' },
    { type: 'image_url', image_url: { url: image } },
  ];
}

export async function callOpenRouter({
  apiKey,
  prompt,
  history = [],
  catalog,
  context = null,
  image = null,
}) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY ausente');

  const messages = [
    {
      role: 'system',
      content:
        buildSystemPrompt() +
        '\n\nCATALOGO DO WORKSPACE:\n' +
        JSON.stringify(catalog) +
        (context ? '\n\n' + describeContext(context) : ''),
    },
    ...history.slice(-8).map((m) => ({
      role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.text === 'string' ? m.text : String(m.content || ''),
    })),
    { role: 'user', content: userContent(prompt, image) },
  ];

  const headers = {
    Authorization: 'Bearer ' + apiKey,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://kanbot.local',
    'X-Title': 'Kanbot',
  };

  const bodyBase = {
    model: image ? OPENROUTER_VISION_MODEL : OPENROUTER_MODEL,
    messages,
    temperature: 0.25,
    max_tokens: 2200,
  };

  let res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...bodyBase,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'kanbot_reply', strict: true, schema: REPLY_JSON_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...bodyBase,
        response_format: { type: 'json_object' },
      }),
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'OpenRouter HTTP ' + res.status;
    throw new Error(msg);
  }

  return data?.choices?.[0]?.message?.content || '';
}
