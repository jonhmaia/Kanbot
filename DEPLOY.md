# Produção Kanbot

Web na Vercel, instaladores Windows/Mac pelo GitHub Releases, updates assinado no app.

O repositório `jonhmaia/Kanbot` está **privado**. O updater baixa `latest.json` e os instaladores sem autenticação. Para outras pessoas receberem update, deixe o repo público ou publique as Releases num repo público e troque o endpoint em `src-tauri/tauri.conf.json`.

## 1. Contas

1. [Apple Developer Program](https://developer.apple.com/programs/) — certificado **Developer ID Application**. No Apple ID, crie uma [senha de app](https://appleid.apple.com/account/manage) para notarizar.
2. [Azure Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/) (ou um `.pfx` OV). Sem isso o Windows mostra SmartScreen.
3. [Vercel](https://vercel.com) — importe `jonhmaia/Kanbot`, **Root Directory = `web`**, framework Vite.
4. GitHub — Secrets do repositório (Settings → Secrets and variables → Actions).

## 2. Vercel

Variáveis (Production + Preview):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY` — só no server, sem prefixo `VITE_`

Push na `main` publica o site. Refresh em `/settings` e o POST `/api/ask` passam a funcionar.

## 3. Chave do updater

Já existe um par local em `src-tauri/.updater-key` (gitignored). A **pública** está em `tauri.conf.json`. A **privada** vai só para o GitHub:

```bash
npx tauri signer generate -w src-tauri/.updater-key
```

Se gerar de novo, cole a nova pública em `plugins.updater.pubkey`. Sem a privada correspondente os usuários atuais não atualizam.

## 4. Secrets do GitHub

Updater (obrigatório para auto-update):

- `TAURI_SIGNING_PRIVATE_KEY` — conteúdo de `src-tauri/.updater-key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — senha usada no `signer generate` (vazio se não usou)

Front embutido no app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Mac (notarização):

- `APPLE_CERTIFICATE` — `.p12` em base64
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY` — ex. `Developer ID Application: Seu Nome (TEAMID)`
- `APPLE_ID`
- `APPLE_PASSWORD` — senha de app
- `APPLE_TEAM_ID`

Windows (escolha um):

- Azure Trusted Signing: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_TRUSTED_SIGNING_ACCOUNT_NAME`, `AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE`
- Ou `.pfx`: `WINDOWS_CERTIFICATE` (base64) e `WINDOWS_CERTIFICATE_PASSWORD`

## 5. Primeiro release

```bash
git tag v1.0.1
git push origin main --tags
```

O workflow sobe NSIS + DMG + `latest.json` na Release. Instale uma vez; a tag seguinte atualiza o app na abertura.

Enquanto os certificados não estiverem nos Secrets, o build sobe mas o Gatekeeper/SmartScreen ainda bloqueia usuários novos.
