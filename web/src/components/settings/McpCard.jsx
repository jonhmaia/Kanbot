import { useEffect, useMemo, useState } from 'react';
import { Card, SegmentedControl, Sheet } from '../ui/Primitives';
import { api, mcpEndpoint } from '../../lib/api';
import { useApp } from '../../context/AppContext';

const SNIPPETS = [
  { value: 'cursor', label: 'Cursor' },
  { value: 'claude', label: 'Claude' },
  { value: 'n8n', label: 'n8n' },
];

function formatWhen(iso) {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function buildSnippet(kind, url, token, anonKey) {
  const bearer = token || 'SEU_TOKEN';
  const headers = {
    Authorization: 'Bearer ' + bearer,
    ...(anonKey ? { apikey: anonKey } : {}),
  };
  if (kind === 'n8n') {
    return [
      'n8n → MCP Client',
      'SSE / HTTP URL: ' + url,
      'Header Authorization: Bearer ' + bearer,
      anonKey ? 'Header apikey: ' + anonKey : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  const config =
    kind === 'claude'
      ? { mcpServers: { kanbot: { type: 'http', url, headers } } }
      : { mcpServers: { kanbot: { url, headers } } };
  return JSON.stringify(config, null, 2);
}

export default function McpCard() {
  const { workspaceId, currentUser, notify } = useApp();
  const url = mcpEndpoint();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const [role, setRole] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [tab, setTab] = useState('cursor');
  const [copied, setCopied] = useState('');
  const canEdit = role && role !== 'viewer';

  const load = () => {
    if (!workspaceId) return;
    api.myWorkspaceRole(workspaceId).then(setRole).catch(() => setRole(null));
    api.listMcpTokens(workspaceId).then(setTokens).catch((e) => notify(e.message, 'warn'));
  };

  useEffect(load, [workspaceId]);

  const snippet = useMemo(
    () => buildSnippet(tab, url, created?.token, anonKey),
    [tab, url, created, anonKey],
  );

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      notify('Copiado', 'success');
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1600);
    } catch {
      notify('Nao foi possivel copiar', 'warn');
    }
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!canEdit || !workspaceId) return;
    setBusy(true);
    try {
      const row = await api.createMcpToken(workspaceId, name.trim() || 'MCP');
      setCreated(row);
      setName('');
      const list = await api.listMcpTokens(workspaceId);
      setTokens(list);
    } catch (err) {
      notify(err.message, 'warn');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    try {
      await api.revokeMcpToken(id);
      setTokens((list) => list.filter((t) => t.id !== id));
      notify('Token revogado', 'warn');
    } catch (err) {
      notify(err.message, 'warn');
    }
  };

  return (
    <>
      <Card className="grain p-5 sm:p-6">
        <h3 className="card-title">Model Context Protocol</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
          Endpoint para Cursor, Claude e n8n. O token autentica neste workspace e herda a sua
          permissao — leitura e escrita, exceto para viewer.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-2xl border border-line bg-white/[0.04] px-3 py-2 text-[11.5px] text-dust">
            {url}
          </code>
          <button type="button" className="btn-ghost" onClick={() => copy(url, 'url')}>
            {copied === 'url' ? 'Copiado' : 'Copiar URL'}
          </button>
        </div>

        <form onSubmit={generate} className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="label !mb-0">Nome do token</span>
            <span className="text-[11px] text-smoke">
              {canEdit ? 'Ex: Claude, Cursor, n8n' : 'Viewers nao geram token'}
            </span>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <input
              className="field min-w-0 flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Claude"
              disabled={!canEdit}
            />
            <button type="submit" className="btn-primary shrink-0 justify-center sm:self-stretch" disabled={!canEdit || busy}>
              {busy ? 'Gerando...' : 'Gerar token'}
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2">
          {tokens.length === 0 && (
            <p className="text-[12px] text-smoke">Nenhum token ativo neste workspace.</p>
          )}
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-lineSoft bg-white/[0.03] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-chalk/90">{t.name}</p>
                <p className="truncate text-[11px] text-smoke">
                  {t.token_prefix}… · criado {formatWhen(t.created_at)} · uso {formatWhen(t.last_used_at)}
                  {t.user_id === currentUser?.id ? ' · seu' : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost !border-rose/25 !px-3 !py-1.5 !text-[11.5px] !text-rose hover:!bg-rose/10"
                onClick={() => revoke(t.id)}
              >
                Revogar
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="label !mb-0">Snippet</span>
            <SegmentedControl options={SNIPPETS} value={tab} onChange={setTab} />
          </div>
          <pre className="scroll-slim max-h-52 overflow-auto rounded-2xl border border-line bg-black/25 p-3 text-[11px] leading-relaxed text-dust">
            {snippet}
          </pre>
          <button type="button" className="btn-ghost mt-2" onClick={() => copy(snippet, 'snippet')}>
            {copied === 'snippet' ? 'Copiado' : 'Copiar snippet'}
          </button>
          <p className="mt-2 text-[11px] text-smoke">
            Sem o token recem-gerado, o snippet usa o placeholder SEU_TOKEN. Cole o Bearer no cliente MCP.
          </p>
        </div>
      </Card>

      <Sheet
        open={Boolean(created?.token)}
        onClose={() => setCreated(null)}
        eyebrow="Mostre uma vez"
        title="Token MCP criado"
        subtitle="Copie agora. O valor completo nao volta a aparecer."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCreated(null)}>
              Fechar
            </button>
            <button type="button" className="btn-primary" onClick={() => copy(created.token, 'token')}>
              {copied === 'token' ? 'Copiado' : 'Copiar token'}
            </button>
          </>
        }
      >
        <code className="block break-all rounded-2xl border border-line bg-white/[0.04] px-3.5 py-3 text-[12.5px] text-chalk">
          {created?.token}
        </code>
        <p className="mt-4 text-[12.5px] leading-relaxed text-smoke">
          Authorization: Bearer {created?.token_prefix}…
        </p>
      </Sheet>
    </>
  );
}
