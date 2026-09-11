import { useEffect, useState } from 'react';
import { isDesktop } from '../../lib/desktop';
import { IconDownload } from '../../lib/icons';
import { useUpdate } from '../../context/UpdateContext';
import { Card } from '../ui/Primitives';

export default function DesktopUpdateCard() {
  const { available, version, status, progress, install } = useUpdate();
  const [current, setCurrent] = useState('');

  useEffect(() => {
    if (!isDesktop()) return undefined;
    let live = true;
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then((value) => {
        if (live) setCurrent(value);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!isDesktop()) return null;

  const busy = status === 'downloading';

  return (
    <Card className="grain p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="card-title">App desktop</h3>
        {available && <i className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
        {current ? `Kanbot ${current}` : 'Kanbot desktop'}
        {available && version ? ` · ${version} pronta` : ''}
      </p>
      {available ? (
        <button type="button" disabled={busy} onClick={install} className="btn-primary mt-4 w-full justify-center">
          <IconDownload size={14} />
          {busy ? (progress ? `Baixando ${progress}%` : 'Baixando…') : 'Instalar e reiniciar'}
        </button>
      ) : (
        <p className="mt-3 text-[12px] text-dust">Voce esta na ultima versao.</p>
      )}
    </Card>
  );
}
