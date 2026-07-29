// Hand-tuned icon set for Buddy — replaces emoji-as-icons across the app.
// Thick rounded strokes on a 24px grid so every glyph reads "clay/candy",
// inherits currentColor, and stays crisp at any size.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Icon({ size = 20, children, label, className, style, filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      {...base}
      fill={filled ? 'currentColor' : 'none'}
    >
      {children}
    </svg>
  )
}

export const IconMenu = (p) => (
  <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
)

export const IconMusic = (p) => (
  <Icon {...p}>
    <path d="M9 18V6.5l10-2.2V16" />
    <circle cx="6.6" cy="18" r="2.6" />
    <circle cx="16.6" cy="16" r="2.6" />
  </Icon>
)

export const IconBook = (p) => (
  <Icon {...p}>
    <path d="M12 6.5C10.5 5 8.4 4.3 5.5 4.3c-.9 0-1.5.6-1.5 1.4v11c0 .8.6 1.4 1.5 1.4 2.9 0 5 .7 6.5 2.2 1.5-1.5 3.6-2.2 6.5-2.2.9 0 1.5-.6 1.5-1.4v-11c0-.8-.6-1.4-1.5-1.4-2.9 0-5 .7-6.5 2.2Z" />
    <path d="M12 6.5v13.4" />
  </Icon>
)

export const IconPalette = (p) => (
  <Icon {...p}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.9-.8 1.9-1.7 0-.8-.5-1.3-.5-2 0-1 .8-1.8 1.9-1.8h1.9a3.3 3.3 0 0 0 3.3-3.3c0-4.6-3.9-8.2-8.5-8.2Z" />
    <circle cx="8" cy="10" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10" r="1.15" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconGear = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
  </Icon>
)

export const IconMic = (p) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </Icon>
)

export const IconEar = (p) => (
  <Icon {...p}>
    <path d="M8.5 19.5a3.5 3.5 0 0 0 6.4-1.3c.3-1.7 1.3-2.6 2.2-3.7a6.5 6.5 0 1 0-11-5.4" />
    <path d="M9.7 9.7a3 3 0 0 1 5.4 1.4c.1.9-.2 1.6-.9 2.4" />
  </Icon>
)

export const IconChat = (p) => (
  <Icon {...p}>
    <path d="M12 4a8 8 0 0 0-6.8 12.2L4 20l3.9-1.1A8 8 0 1 0 12 4Z" />
  </Icon>
)

export const IconSparkle = (p) => (
  <Icon {...p}>
    <path d="M12 4l1.8 4.6L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.4L12 4Z" />
    <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
  </Icon>
)

export const IconPlay = (p) => (
  <Icon {...p} filled><path d="M8.5 5.8c0-.9 1-1.5 1.8-1L18.6 11c.7.5.7 1.5 0 2l-8.3 6.2c-.8.5-1.8 0-1.8-1V5.8Z" stroke="none" /></Icon>
)

export const IconPause = (p) => (
  <Icon {...p} filled>
    <rect x="6.5" y="5" width="4" height="14" rx="1.6" stroke="none" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.6" stroke="none" />
  </Icon>
)

export const IconRepeat = (p) => (
  <Icon {...p}>
    <path d="M17.5 3.8l3 3-3 3" />
    <path d="M4 12v-.8a4.4 4.4 0 0 1 4.4-4.4h12" />
    <path d="M6.5 20.2l-3-3 3-3" />
    <path d="M20 12v.8a4.4 4.4 0 0 1-4.4 4.4h-12" />
  </Icon>
)

export const IconArrowLeft = (p) => (
  <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>
)

export const IconArrowRight = (p) => (
  <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
)

export const IconArrowDown = (p) => (
  <Icon {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Icon>
)

export const IconPrinter = (p) => (
  <Icon {...p}>
    <path d="M7 8V4.5h10V8" />
    <rect x="4" y="8" width="16" height="8" rx="2" />
    <rect x="7" y="13.5" width="10" height="6" rx="1.2" />
    <circle cx="17" cy="11" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconLock = (p) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconCheck = (p) => (
  <Icon {...p}><path d="M4.5 12.5l5 5 10-11" /></Icon>
)

export const IconX = (p) => (
  <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
)

export const IconStar = (p) => (
  <Icon {...p} filled={p?.filled ?? true}>
    <path
      d="M12 3.2l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 15.9l-5.1 2.7 1.1-5.6L3.8 9.1l5.7-.7L12 3.2Z"
      stroke={p?.filled === false ? 'currentColor' : 'none'}
    />
  </Icon>
)

export const IconTrophy = (p) => (
  <Icon {...p}>
    <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5.5H4.8c0 3 1.4 4.8 3.4 5.2M16 5.5h3.2c0 3-1.4 4.8-3.4 5.2" />
    <path d="M12 14v3M8.5 20h7M10 17h4" />
  </Icon>
)

export const IconCamera = (p) => (
  <Icon {...p}>
    <rect x="3" y="7" width="13" height="11" rx="2.5" />
    <path d="M16 11l5-2.6v7.2L16 13" />
  </Icon>
)

export const IconPhoto = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4.5 17l4.5-4 3.5 3 3-2.5 4 3.5" />
  </Icon>
)

export const IconMail = (p) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M4 8l8 5.5L20 8" />
  </Icon>
)

export const IconSun = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
  </Icon>
)

export const IconMoon = (p) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Icon>
)

export const IconSpeaker = (p) => (
  <Icon {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
  </Icon>
)

export const IconPencil = (p) => (
  <Icon {...p}>
    <path d="M15.5 5.2l3.3 3.3L8.4 18.9l-4.2.9.9-4.2L15.5 5.2Z" />
    <path d="M13.8 6.9l3.3 3.3" />
  </Icon>
)

export const IconEye = (p) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
)

export const IconEyeOff = (p) => (
  <Icon {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17.6 17.6 0 0 1-3 3.8M6.1 6.8A16.9 16.9 0 0 0 2.5 12S6 19 12 19c1.4 0 2.7-.4 3.9-1" />
    <path d="M9.5 9.8a2.9 2.9 0 0 0 4.1 4.1" />
  </Icon>
)

export const IconHeart = (p) => (
  <Icon {...p} filled={p?.filled ?? false}>
    <path d="M12 20s-7.5-4.6-9.3-9.4C1.5 7.5 3.6 4.5 6.7 4.5c2.1 0 3.9 1.2 5.3 3.2 1.4-2 3.2-3.2 5.3-3.2 3.1 0 5.2 3 4 6.1C19.5 15.4 12 20 12 20Z" />
  </Icon>
)

export const IconWarning = (p) => (
  <Icon {...p}>
    <path d="M12 4L2.8 19.5h18.4L12 4Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none" />
  </Icon>
)

export const IconBell = (p) => (
  <Icon {...p}>
    <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.7 5.3-1.7 5.3h14.4s-1.7-1.3-1.7-5.3A5.5 5.5 0 0 0 12 4Z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </Icon>
)

export const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.2l3 1.8" />
  </Icon>
)

export const IconGift = (p) => (
  <Icon {...p}>
    <rect x="4" y="10" width="16" height="10" rx="1.8" />
    <path d="M4 13.5h16M12 10v10" />
    <path d="M12 10s-4.6.3-5.4-2C6 6.3 7.5 4.8 9.1 5.4 11 6.1 12 10 12 10ZM12 10s4.6.3 5.4-2c.6-1.7-.9-3.2-2.5-2.6C13 6.1 12 10 12 10Z" />
  </Icon>
)

export const IconBolt = (p) => (
  <Icon {...p}><path d="M13 3L5 13.5h5L10.5 21l8-10.5h-5L13 3Z" /></Icon>
)

export const IconPlus = (p) => (
  <Icon {...p}><path d="M12 4v16M4 12h16" /></Icon>
)

export const IconUsers = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
    <path d="M15.5 5.3c1.5.4 2.5 1.7 2.5 3.2s-1 2.8-2.5 3.2" />
    <path d="M15.5 14c2.4.4 4 2.3 4 4.9" />
  </Icon>
)

export const IconShield = (p) => (
  <Icon {...p}>
    <path d="M12 3.5l7.5 2.8v5.2c0 4.6-3 7.6-7.5 9-4.5-1.4-7.5-4.4-7.5-9V6.3L12 3.5Z" />
    <path d="M9 12l2.2 2.2L15.5 9.7" />
  </Icon>
)
