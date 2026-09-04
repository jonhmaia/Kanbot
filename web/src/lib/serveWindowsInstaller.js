const REPO = 'jonhmaia/Kanbot';
const MAX_PROXY_BYTES = 4_000_000;

function findExe(release) {
  const assets = release?.assets || [];
  return (
    assets.find((asset) => /\.exe$/i.test(asset.name) && /setup|nsis/i.test(asset.name)) ||
    assets.find((asset) => /\.exe$/i.test(asset.name)) ||
    null
  );
}

async function githubJson(url, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kanbot-download',
  };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function resolveWindowsAsset(token) {
  const latest = await githubJson('https://api.github.com/repos/' + REPO + '/releases/latest', token);
  const fromLatest = findExe(latest);
  if (fromLatest) return fromLatest;

  const list = await githubJson('https://api.github.com/repos/' + REPO + '/releases?per_page=10', token);
  if (!Array.isArray(list)) return null;
  for (const release of list) {
    const asset = findExe(release);
    if (asset) return asset;
  }
  return null;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export async function sendWindowsInstaller(res, { token } = {}) {
  const auth = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const asset = await resolveWindowsAsset(auth);
  const url = process.env.WINDOWS_INSTALLER_URL || asset?.browser_download_url;
  const filename = asset?.name || 'Kanbot-setup.exe';

  if (!url) {
    sendJson(res, 404, {
      error: 'Instalador ainda nao esta pronto. O build Windows sai sozinho a cada push na main.',
    });
    return;
  }

  const file = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'kanbot-download' } });
  if (!file.ok) {
    sendJson(res, 200, { url, filename });
    return;
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_PROXY_BYTES) {
    sendJson(res, 200, { url, filename });
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(buf);
}
