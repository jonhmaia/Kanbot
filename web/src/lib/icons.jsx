/**
 * Conjunto de icones em SVG inline (stroke 1.5, cantos arredondados),
 * no mesmo peso visual da referencia de design.
 */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Svg = ({ children, size = 16, className = '', viewBox = '0 0 24 24', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    className={className}
    aria-hidden="true"
    {...base}
    {...rest}
  >
    {children}
  </svg>
);

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const IconExport = (p) => (
  <Svg {...p}>
    <path d="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5" />
    <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
  </Svg>
);

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconChevronLeft = (p) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m5 12 5 5 9-9" />
  </Svg>
);

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3.5v3" />
    <path d="M16 3.5v3" />
  </Svg>
);

export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </Svg>
);

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9Z" />
    <path d="M10.3 18a2 2 0 0 0 3.4 0" />
  </Svg>
);

export const IconExpand = (p) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 13 11" />
    <path d="M10 20H4v-6" />
    <path d="m4 20 7-7" />
  </Svg>
);

export const IconArrowUpRight = (p) => (
  <Svg {...p}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </Svg>
);

export const IconSpark = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.7L12 18l-1.7-5.6L5 10.7 10.3 9 12 3.5Z" />
    <path d="M18.5 16.5 19.2 18.6 21 19.3l-1.8.7-.7 2.1-.7-2.1-1.8-.7 1.8-.7.7-2.1Z" />
  </Svg>
);

export const IconClipboard = (p) => (
  <Svg {...p}>
    <rect x="5" y="4.5" width="14" height="16" rx="3" />
    <path d="M9 4.5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v.5" />
    <path d="m9 12.5 2 2 4-4" />
  </Svg>
);

export const IconGauge = (p) => (
  <Svg {...p}>
    <g transform="translate(0 -1.5)">
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="m12 17 4-5" />
      <circle cx="12" cy="17" r="1.2" />
    </g>
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.4a3.2 3.2 0 0 1 0 5.2" />
    <path d="M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
  </Svg>
);

export const IconLayers = (p) => (
  <Svg {...p}>
    <path d="m12 3.5 8.5 4.3L12 12 3.5 7.8 12 3.5Z" />
    <path d="m3.5 12.2 8.5 4.3 8.5-4.3" />
    <path d="m3.5 16.4 8.5 4.3 8.5-4.3" />
  </Svg>
);

export const IconTarget = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6 18 18M18 6 6 18" />
  </Svg>
);

export const IconDots = (p) => (
  <Svg {...p}>
    <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15" />
    <path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
    <path d="M6.5 6.5 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.5" />
  </Svg>
);

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M4.5 19.5h4L20 8a2.1 2.1 0 0 0-3-3L5.5 16.5l-1 3Z" />
  </Svg>
);

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
);

export const IconPlay = (p) => (
  <Svg {...p}>
    <path d="M8 6.5v11l10-5.5-10-5.5Z" />
  </Svg>
);

export const IconPause = (p) => (
  <Svg {...p}>
    <path d="M8 6h3v12H8zM13 6h3v12h-3z" />
  </Svg>
);

export const IconFlame = (p) => (
  <Svg {...p}>
    <path d="M12 3.5s2.2 3.4 2.2 6.1A2.2 2.2 0 1 1 9.6 8C8 10.2 7 12.2 7 14.2a5 5 0 0 0 10 0c0-3.4-2.4-6.4-5-10.7Z" />
  </Svg>
);

export const IconList = (p) => (
  <Svg {...p}>
    <path d="M9 7h11M9 12h11M9 17h11" />
    <path d="M5 7h.01M5 12h.01M5 17h.01" />
  </Svg>
);

export const IconChat = (p) => (
  <Svg {...p}>
    <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5a9.6 9.6 0 0 1-2.6-.35L4.5 20.5l1.1-3.3A6.2 6.2 0 0 1 4 12.5C4 8.9 7.6 6 12 6s8 2.9 8 6.5Z" />
  </Svg>
);

export const IconPaperclip = (p) => (
  <Svg {...p}>
    <path d="M20 11.5 12.6 19a4.5 4.5 0 0 1-6.4-6.4l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.5 7.5a1.5 1.5 0 1 1-2.1-2.1l6.9-6.9" />
  </Svg>
);

export const IconSend = (p) => (
  <Svg {...p}>
    <path d="M4.5 12 20 4.5 15.5 20l-4-6.2L4.5 12Z" />
  </Svg>
);

export const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 19 6v6c0 4.2-3 7.3-7 8.5-4-1.2-7-4.3-7-8.5V6l7-2.5Z" />
  </Svg>
);

export const IconMail = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 8 7.5 5.2L19.5 8" />
  </Svg>
);

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
  </Svg>
);

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </Svg>
);

export const IconWindows = (p) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" className={p.className} aria-hidden="true" fill="currentColor">
    <path d="M3 5.2 10.4 4.2v7.1H3V5.2Zm8.2-1.2L21 2.6v8.7h-9.8V4ZM3 12.7h7.4v7.1L3 18.8v-6.1Zm8.2 0H21v8.7l-9.8-1.4v-7.3Z" />
  </svg>
);

export const IconDevice = (p) => (
  <Svg {...p}>
    <rect x="7" y="3" width="10" height="18" rx="3" />
    <path d="M11 18h2" />
  </Svg>
);

export const IconPulse = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l2-6 4 12 2.5-6H21" />
  </Svg>
);

export const IconSettings = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.7 1.7 0 0 0 .35 1.9l.05.05a2 2 0 1 1-2.85 2.85l-.05-.05a1.7 1.7 0 0 0-2.9 1.2v.15a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-2.95-1.15l-.05.05A2 2 0 1 1 4.15 16.4l.05-.05A1.7 1.7 0 0 0 3 13.5H2.9a2 2 0 0 1 0-4h.08A1.7 1.7 0 0 0 4.13 6.6l-.05-.05A2 2 0 1 1 6.93 3.7l.05.05a1.7 1.7 0 0 0 2.9-1.2V2.4a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 2.9 1.2l.05-.05a2 2 0 1 1 2.85 2.85l-.05.05a1.7 1.7 0 0 0-.23 2.07" />
  </Svg>
);

export const IconSwatch = (p) => (
  <Svg {...p}>
    <circle cx="8.2" cy="10" r="3.1" />
    <circle cx="15.8" cy="10" r="3.1" />
    <circle cx="12" cy="16.2" r="3.1" />
  </Svg>
);

export const IconFilter = (p) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
);

export const IconFlag = (p) => (
  <Svg {...p}>
    <path d="M6 21V4.5" />
    <path d="M6 5h9.5l-1.5 3 1.5 3H6" />
  </Svg>
);

export const IconLogo = ({ size = 30, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="#F5A524" />
    <rect x="8" y="8.2" width="7.2" height="15.6" rx="3.6" fill="#141415" />
    <rect x="16.8" y="8.2" width="7.2" height="10.4" rx="3.6" fill="#141415" />
  </svg>
);

export const projectIcons = {
  sparkle: IconSpark,
  pulse: IconPulse,
  device: IconDevice,
  shield: IconShield,
  layers: IconLayers,
  target: IconTarget,
};
