import { callOpenRouter } from '../web/src/lib/ai/openrouter.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  try {
    const content = await callOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      prompt: body.prompt || '',
      history: body.history || [],
      catalog: body.catalog || {},
    });
    res.status(200).json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Falha no OpenRouter' });
  }
}
