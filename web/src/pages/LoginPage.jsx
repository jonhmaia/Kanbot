import LoginCard from '../components/auth/LoginCard';
import WindowsDownloadButton from '../components/download/WindowsDownloadButton';
import { isDesktop } from '../lib/desktop';
import { IconLogo } from '../lib/icons';

function Corner({ className }) {
  return <span aria-hidden="true" className={'pointer-events-none absolute h-4 w-4 border-white/20 ' + className} />;
}

export default function LoginPage({ onReady }) {
  const native = isDesktop();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 10%, transparent 75%)',
        }}
      />

      <div className="relative z-[1] mb-7 flex flex-col items-center gap-3">
        <IconLogo size={42} />
        <p className="font-display text-[15px] tracking-tight text-chalk/80">Kanbot</p>
      </div>

      <div className="relative z-[1] w-full max-w-[420px] animate-floatIn">
        <Corner className="-left-3 -top-3 border-l border-t" />
        <Corner className="-right-3 -top-3 border-r border-t" />
        <Corner className="-bottom-3 -left-3 border-b border-l" />
        <Corner className="-bottom-3 -right-3 border-b border-r" />
        <LoginCard onReady={onReady} />
      </div>

      {!native && (
        <div className="relative z-[1] mt-8">
          <WindowsDownloadButton className="btn-ghost" />
        </div>
      )}
    </div>
  );
}
