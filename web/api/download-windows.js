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

async function resolveAsset(token) {
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

function sendFile(res, buf, filename) {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.setHeader('Content-Length', String(buf.length));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(buf);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const asset = await resolveAsset(token);
    const url = process.env.WINDOWS_INSTALLER_URL || asset?.browser_download_url;
    const filename = asset?.name || 'Kanbot-setup.exe';

    if (!url) {
      res.status(404).json({
        error: 'Instalador ainda nao esta pronto. O build Windows sai sozinho a cada push na main.',
      });
      return;
    }

    const file = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'kanbot-download' } });
    if (!file.ok) {
      res.status(200).json({ url, filename });
      return;
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_PROXY_BYTES) {
      res.status(200).json({ url, filename });
      return;
    }

    sendFile(res, buf, filename);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Nao consegui buscar o instalador.' });
  }
}
