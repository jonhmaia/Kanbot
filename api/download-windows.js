const REPO = 'jonhmaia/Kanbot';
const PAGES_INSTALLER = 'https://jonhmaia.github.io/Kanbot/Kanbot-setup.exe';

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
    return head.ok;
  } catch {
    return false;
  }
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const pinned = process.env.WINDOWS_INSTALLER_URL || process.env.WINDOWS_DOWNLOAD_URL;

    if (pinned && (await urlExists(pinned))) {
      res.status(200).json({ url: pinned, filename: 'Kanbot-setup.exe' });
      return;
    }

    if (await urlExists(PAGES_INSTALLER)) {
      res.status(200).json({ url: PAGES_INSTALLER, filename: 'Kanbot-setup.exe' });
      return;
    }

    const asset = await resolveAsset(token);
    if (asset?.browser_download_url) {
      res.status(200).json({ url: asset.browser_download_url, filename: asset.name || 'Kanbot-setup.exe' });
      return;
    }

    res.status(404).json({
      error: 'Instalador ainda nao esta pronto. O build Windows sai sozinho a cada push na main.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Nao consegui buscar o instalador.' });
  }
}
