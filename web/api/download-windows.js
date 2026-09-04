import { sendWindowsInstaller } from '../src/lib/serveWindowsInstaller.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  try {
    await sendWindowsInstaller(res);
  } catch {
    res.status(502).json({ error: 'Nao consegui buscar o instalador.' });
  }
}
