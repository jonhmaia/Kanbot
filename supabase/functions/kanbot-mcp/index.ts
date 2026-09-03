import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { AuthError, ToolError, authenticate } from './kanbot.ts';
import { TOOLS, callTool } from './tools.ts';

const PROTOCOL = '2025-03-26';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors() });
  if (req.method === 'DELETE') return new Response(null, { status: 204, headers: cors() });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST (MCP Streamable HTTP)' }), {
      status: 405,
      headers: { ...cors(), 'Content-Type': 'application/json', Allow: 'POST, OPTIONS, DELETE' },
    });
  }

  let ctx;
  try {
    ctx = await authenticate(req);
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Nao autorizado' }), {
      status,
      headers: {
        ...cors(),
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="kanbot"',
      },
    });
  }

  let body: unknown;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    return rpcError(null, -32700, 'Parse error', 400);
  }

  if (Array.isArray(body)) {
    const replies = [];
    for (const item of body) {
      const reply = await handleMessage(item, ctx);
      if (reply) replies.push(reply);
    }
    return json(replies);
  }

  const reply = await handleMessage(body, ctx);
  if (!reply) return new Response(null, { status: 202, headers: cors() });
  return json(reply);
});

async function handleMessage(message: unknown, ctx: Awaited<ReturnType<typeof authenticate>>) {
  if (!message || typeof message !== 'object') return rpcPayload(null, null, { code: -32600, message: 'Invalid Request' });
  const msg = message as { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
  const id = msg.id ?? null;
  const isNotification = msg.id === undefined;

  try {
    if (msg.method === 'initialize') {
      return rpcPayload(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'kanbot', version: '1.0.0' },
        instructions:
          'Kanbot MCP do workspace "' +
          ctx.workspaceName +
          '". Comece com get_catalog. Status: backlog, in_progress, review, blocked, done. projectId aceita UUID, key ou nome.',
      });
    }
    if (msg.method === 'notifications/initialized' || msg.method === 'notifications/cancelled') {
      return null;
    }
    if (msg.method === 'ping') return rpcPayload(id, {});
    if (msg.method === 'tools/list') return rpcPayload(id, { tools: TOOLS });
    if (msg.method === 'tools/call') {
      const name = String(msg.params?.name || '');
      const args = (msg.params?.arguments || {}) as Record<string, unknown>;
      try {
        const result = await callTool(ctx, name, args);
        return rpcPayload(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (e) {
        const text = e instanceof Error ? e.message : 'Falha na tool';
        return rpcPayload(id, {
          content: [{ type: 'text', text }],
          isError: true,
        });
      }
    }
    if (isNotification) return null;
    return rpcPayload(id, null, { code: -32601, message: 'Method not found: ' + (msg.method || '') });
  } catch (e) {
    const text = e instanceof ToolError || e instanceof Error ? e.message : 'Internal error';
    if (isNotification) return null;
    return rpcPayload(id, null, { code: -32603, message: text });
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, content-type, accept, apikey, x-client-info, x-kanbot-token, mcp-session-id, mcp-protocol-version',
    'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
    'MCP-Protocol-Version': PROTOCOL,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}

function rpcPayload(id: string | number | null, result: unknown, error?: { code: number; message: string }) {
  const payload: Record<string, unknown> = { jsonrpc: '2.0', id };
  if (error) payload.error = error;
  else payload.result = result;
  return payload;
}

function rpcError(id: string | number | null, code: number, message: string, status = 200) {
  return json(rpcPayload(id, null, { code, message }), status);
}
