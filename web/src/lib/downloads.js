function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function looksLikeInstaller(blob, type) {
  if (!blob || blob.size < 80_000) return false;
  if (type.includes('text/html') || type.includes('json') || type.includes('text/plain')) return false;
  return true;
}

async function saveFromUrl(url, filename) {
  try {
    const file = await fetch(url, { redirect: 'follow' });
    const type = file.headers.get('content-type') || '';
    if (file.ok) {
      const blob = await file.blob();
      if (looksLikeInstaller(blob, type)) {
        saveBlob(blob, filename);
        return;
      }
    }
  } catch {
    /* CORS do GitHub/Pages: cai no download direto do arquivo */
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadWindowsInstaller() {
  const res = await fetch('/api/download-windows');
  const type = res.headers.get('content-type') || '';

  if (type.includes('json')) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Instalador indisponivel no momento.');
    }
    await saveFromUrl(data.url, data.filename || 'Kanbot-setup.exe');
    return;
  }

  if (!res.ok) {
    throw new Error('Instalador indisponivel no momento.');
  }

  const blob = await res.blob();
  if (!looksLikeInstaller(blob, type)) {
    throw new Error('Instalador indisponivel no momento.');
  }
  saveBlob(blob, 'Kanbot-setup.exe');
}
