import { useState } from 'react';
import { downloadWindowsInstaller } from '../../lib/downloads';
import { IconWindows } from '../../lib/icons';

export default function WindowsDownloadButton({
  className = 'btn-primary',
  label = 'Baixar para Windows',
  quiet = false,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onClick = async () => {
    setBusy(true);
    setError('');
    try {
      await downloadWindowsInstaller();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={onClick} disabled={busy} className={className}>
        <IconWindows size={14} />
        {busy ? 'Baixando…' : label}
      </button>
      {error && <p className="max-w-sm text-center text-[12px] text-rose">{error}</p>}
      {!quiet && (
        <p className="max-w-sm text-center text-[11.5px] leading-relaxed text-smoke">
          Se o Windows bloquear sem &quot;Executar assim mesmo&quot;, não é arquivo corrompido: é o
          Smart App Control. Em Segurança do Windows, Controle de aplicativos e do navegador, desliga
          temporariamente, instala e religa.
        </p>
      )}
    </div>
  );
}
