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

function isWindowsExe(bytes) {
  return bytes.length >= 80_000 && bytes[0] === 0x4d && bytes[1] === 0x5a;
}

export async function downloadWindowsInstaller() {
  const res = await fetch('/api/download-windows');
  const type = res.headers.get('content-type') || '';

  if (type.includes('json')) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Instalador indisponivel no momento.');
  }

  if (!res.ok) {
    throw new Error('Instalador indisponivel no momento.');
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!isWindowsExe(bytes)) {
    throw new Error('O instalador veio incompleto. Atualiza a pagina e tenta de novo.');
  }

  saveBlob(new Blob([bytes], { type: 'application/octet-stream' }), 'Kanbot-setup.exe');
}
