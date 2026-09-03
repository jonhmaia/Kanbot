import { loadEnv } from 'vite';
import { callOpenRouter } from './src/lib/ai/openrouter.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function handleAsk(req, res, apiKey) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Use POST' });
    return;
  }
  try {
    const body = JSON.parse((await readBody(req)) || '{}');
    const content = await callOpenRouter({
      apiKey,
      prompt: body.prompt || '',
      history: body.history || [],
      catalog: body.catalog || {},
    });
    send(res, 200, { content });
  } catch (e) {
    send(res, 500, { error: e.message || 'Falha no OpenRouter' });
  }
}

export function kanbotAskPlugin() {
  return {
    name: 'kanbot-ask',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/ask') return next();
        handleAsk(req, res, apiKey);
      });
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '');
      const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/ask') return next();
        handleAsk(req, res, apiKey);
      });
    },
  };
}
