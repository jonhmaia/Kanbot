const REPO = 'jonhmaia/Kanbot';
const PAGES_INSTALLER = 'https://jonhmaia.github.io/Kanbot/Kanbot-setup.exe';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

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

async function urlExists(url) {
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (head.ok) return true;
    const get = await fetch(url, { method: 'GET', redirect: 'follow', headers: { Range: 'bytes=0-0' } });
    return get.ok;
  } catch {
    return false;
  }
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

export async function sendWindowsInstaller(res, { token } = {}) {
  const auth = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const pinned = process.env.WINDOWS_INSTALLER_URL || process.env.WINDOWS_DOWNLOAD_URL;

  if (pinned && (await urlExists(pinned))) {
    sendJson(res, 200, { url: pinned, filename: 'Kanbot-setup.exe' });
    return;
  }

  if (await urlExists(PAGES_INSTALLER)) {
    sendJson(res, 200, { url: PAGES_INSTALLER, filename: 'Kanbot-setup.exe' });
    return;
  }

  const asset = await resolveWindowsAsset(auth);
  const url = asset?.browser_download_url;
  if (url) {
    sendJson(res, 200, { url, filename: asset.name || 'Kanbot-setup.exe' });
    return;
  }

  sendJson(res, 404, {
    error: 'Instalador ainda nao esta pronto. O build Windows sai sozinho a cada push na main.',
  });
}
