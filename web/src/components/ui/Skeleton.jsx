function times(count) {
  return Array.from({ length: count }, (_, index) => index);
}

export function Bone({ className = '' }) {
  return <div className={'skeleton-bone ' + className} aria-hidden />;
}

function Frame({ className = '', children }) {
  return <div className={'rounded-4xl border border-lineSoft bg-white/[0.025] ' + className}>{children}</div>;
}

export function SkeletonHeader({ search = false, actions = 2 }) {
  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-7 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <Bone className="h-2.5 w-40 rounded-full" />
        <Bone className="h-10 w-48 rounded-2xl" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {search && <Bone className="h-10 w-[240px] rounded-full" />}
        {times(actions).map((index) => (
          <Bone key={index} className="h-10 w-[88px] rounded-full" />
        ))}
      </div>
    </div>
  );
}

function padClass(flush) {
  return flush ? '' : 'px-5 pb-10 sm:px-7';
}

function ProjectsBody({ flush }) {
  return (
    <div className={'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ' + padClass(flush)}>
      {times(6).map((index) => (
        <Frame key={index} className="flex flex-col p-5">
          <Bone className="h-10 w-10 rounded-2xl" />
          <Bone className="mt-4 h-5 w-2/3 rounded-full" />
          <Bone className="mt-2.5 h-3 w-full rounded-full" />
          <Bone className="mt-1.5 h-3 w-4/5 rounded-full" />
          <div className="mt-4 flex gap-2">
            <Bone className="h-5 w-12 rounded-md" />
            <Bone className="h-5 w-16 rounded-md" />
          </div>
          <Bone className="mt-5 h-1.5 w-full rounded-full" />
          <div className="mt-5 flex items-center justify-between border-t border-lineSoft pt-4">
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-8 w-24 rounded-full" />
          </div>
        </Frame>
      ))}
    </div>
  );
}

function BoardBody({ flush }) {
  return (
    <div className={'flex gap-3 overflow-hidden ' + padClass(flush)}>
      {times(4).map((column) => (
        <Frame key={column} className="w-[260px] shrink-0 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <Bone className="h-3 w-24 rounded-full" />
            <Bone className="h-5 w-7 rounded-full" />
          </div>
          {times(column === 1 ? 4 : 3).map((card) => (
            <div key={card} className="mb-2 rounded-2xl border border-white/[0.04] bg-white/[0.03] p-3">
              <Bone className="h-3.5 w-4/5 rounded-full" />
              <Bone className="mt-2 h-2.5 w-1/2 rounded-full" />
              <div className="mt-3 flex gap-1.5">
                <Bone className="h-5 w-12 rounded-full" />
                <Bone className="h-5 w-5 rounded-full" />
              </div>
            </div>
          ))}
        </Frame>
      ))}
    </div>
  );
}

function ReportsBody({ flush }) {
  return (
    <div className={'grid gap-4 xl:grid-cols-[minmax(0,1fr)_378px] ' + padClass(flush)}>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            {times(4).map((index) => (
              <Frame key={index} className="p-4">
                <Bone className="h-3 w-16 rounded-full" />
                <Bone className="mt-4 h-8 w-20 rounded-2xl" />
              </Frame>
            ))}
          </div>
          <Frame className="p-5">
            <Bone className="h-3 w-28 rounded-full" />
            <Bone className="mt-6 h-28 w-full rounded-3xl" />
          </Frame>
        </div>
        <Frame className="p-5">
          <Bone className="h-3 w-32 rounded-full" />
          <Bone className="mt-5 h-36 w-full rounded-3xl" />
        </Frame>
        <div className="grid gap-4 lg:grid-cols-2">
          <Frame className="h-48 p-5">
            <Bone className="h-3 w-24 rounded-full" />
            <Bone className="mt-6 h-24 w-full rounded-3xl" />
          </Frame>
          <Frame className="h-48 p-5">
            <Bone className="h-3 w-28 rounded-full" />
            <div className="mt-5 space-y-3">
              {times(3).map((index) => (
                <Bone key={index} className="h-8 w-full rounded-2xl" />
              ))}
            </div>
          </Frame>
        </div>
      </div>
      <Frame className="p-5">
        <Bone className="h-3 w-24 rounded-full" />
        <div className="mt-5 space-y-3">
          {times(5).map((index) => (
            <div key={index} className="rounded-2xl border border-white/[0.04] p-3">
              <Bone className="h-3 w-3/4 rounded-full" />
              <Bone className="mt-2 h-2.5 w-full rounded-full" />
              <Bone className="mt-1.5 h-2.5 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
      </Frame>
    </div>
  );
}

function TeamBody({ flush }) {
  return (
    <div className={'grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] ' + padClass(flush)}>
      <div className="grid gap-4 sm:grid-cols-2">
        {times(4).map((index) => (
          <Frame key={index} className="p-5">
            <div className="flex items-center gap-3">
              <Bone className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-3.5 w-28 rounded-full" />
                <Bone className="h-2.5 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-5 flex justify-between">
              <Bone className="h-8 w-16 rounded-2xl" />
              <Bone className="h-8 w-14 rounded-2xl" />
            </div>
            <Bone className="mt-4 h-1.5 w-full rounded-full" />
          </Frame>
        ))}
      </div>
      <Frame className="h-fit p-5">
        <Bone className="h-3 w-28 rounded-full" />
        <div className="mt-5 space-y-4">
          {times(4).map((index) => (
            <div key={index} className="flex gap-3">
              <Bone className="h-6 w-6 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-3 w-full rounded-full" />
                <Bone className="h-2.5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Frame>
    </div>
  );
}

export function SkeletonInsights() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando insights">
      {times(4).map((index) => (
        <div key={index} className="rounded-2xl border border-white/[0.04] p-4">
          <Bone className="h-3 w-24 rounded-full" />
          <Bone className="mt-3 h-3.5 w-4/5 rounded-full" />
          <Bone className="mt-2 h-3 w-full rounded-full" />
          <Bone className="mt-1.5 h-3 w-2/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function InsightsBody({ flush }) {
  return (
    <div className={padClass(flush)}>
      <Frame className="p-5">
        <SkeletonInsights />
      </Frame>
    </div>
  );
}

function ProfileBody({ flush }) {
  return (
    <div className={'grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] ' + padClass(flush)}>
      <Frame className="p-6">
        <div className="flex items-center gap-4">
          <Bone className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Bone className="h-6 w-40 rounded-2xl" />
            <Bone className="h-3 w-52 rounded-full" />
          </div>
        </div>
        <Bone className="mt-6 h-2 w-full rounded-full" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          {times(3).map((index) => (
            <Bone key={index} className="h-16 rounded-2xl" />
          ))}
        </div>
      </Frame>
      <Frame className="h-fit p-5">
        <Bone className="h-3 w-20 rounded-full" />
        <div className="mt-4 space-y-3">
          {times(4).map((index) => (
            <Bone key={index} className="h-10 w-full rounded-2xl" />
          ))}
        </div>
      </Frame>
    </div>
  );
}

function BootChrome() {
  return (
    <header className="px-5 pt-4 sm:px-7 sm:pt-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-4">
        <div className="flex items-center gap-3">
          <Bone className="h-[30px] w-[30px] rounded-full" />
          <Bone className="h-9 w-36 rounded-full" />
        </div>
        <Bone className="hidden h-9 w-72 rounded-full xl:block" />
        <div className="col-start-3 flex justify-end gap-2.5">
          {times(3).map((index) => (
            <Bone key={index} className="h-9 w-9 rounded-full" />
          ))}
        </div>
      </div>
    </header>
  );
}

export function SkeletonPage({ variant = 'page', flush = false }) {
  const labeled =
    variant === 'boot'
      ? 'Abrindo o Kanbot'
      : variant === 'board'
        ? 'Carregando o board'
        : variant === 'reports'
          ? 'Carregando metricas'
          : variant === 'team'
            ? 'Carregando o time'
            : variant === 'insights'
              ? 'Carregando insights'
              : variant === 'profile'
                ? 'Carregando perfil'
                : variant === 'projects'
                  ? 'Carregando projetos'
                  : 'Carregando';

  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={labeled}>
      <span className="sr-only">{labeled}</span>
      {variant === 'boot' && <BootChrome />}
      {!flush && <SkeletonHeader search={variant !== 'insights' && variant !== 'profile' && variant !== 'boot'} />}
      {variant === 'projects' || variant === 'boot' ? (
        <ProjectsBody flush={flush} />
      ) : variant === 'board' ? (
        <BoardBody flush={flush} />
      ) : variant === 'reports' ? (
        <ReportsBody flush={flush} />
      ) : variant === 'team' ? (
        <TeamBody flush={flush} />
      ) : variant === 'insights' ? (
        <InsightsBody flush={flush} />
      ) : variant === 'profile' ? (
        <ProfileBody flush={flush} />
      ) : (
        <div className={'grid gap-4 lg:grid-cols-2 ' + padClass(flush)}>
          {times(4).map((index) => (
            <Frame key={index} className="h-40 p-5">
              <Bone className="h-3 w-24 rounded-full" />
              <Bone className="mt-6 h-20 w-full rounded-3xl" />
            </Frame>
          ))}
        </div>
      )}
    </div>
  );
}
