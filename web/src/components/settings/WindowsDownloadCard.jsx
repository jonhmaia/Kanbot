import WindowsDownloadButton from '../download/WindowsDownloadButton';
import { isDesktop } from '../../lib/desktop';
import { Card } from '../ui/Primitives';

export default function WindowsDownloadCard() {
  if (isDesktop()) return null;

  return (
    <Card className="grain p-5">
      <h3 className="card-title">App Windows</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-smoke">
        Notch nativa e atualizacoes automaticas no desktop.
      </p>
      <div className="mt-4">
        <WindowsDownloadButton className="btn-primary w-full justify-center" quiet />
      </div>
    </Card>
  );
}
