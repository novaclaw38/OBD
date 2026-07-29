const KEYS = {
  SETTINGS: 'buddy_settings', // legacy flat key — pre-multi-child, read as a fallback
  PIN_LOCK: 'buddy_pin_lock',
  ACTIVE_CHILD: 'buddy_active_child',
}

const settingsKeyFor = (childId) => `buddy_settings::${childId}`

// Multi-child: which child this device is currently "on". null before the
// one-time migration in childrenService.ensureActiveChildMigrated() runs,
// in which case getSettings()/saveSettings() fall back to the old flat key
// so nothing breaks for code that runs before migration completes.
export function getActiveChildId() {
  try {
    return localStorage.getItem(KEYS.ACTIVE_CHILD) || null
  } catch {
    return null
  }
}

export function setActiveChildId(id) {
  localStorage.setItem(KEYS.ACTIVE_CHILD, id)
}

const DEFAULTS = {
  onboarded: false,
  childName: '',
  buddyName: 'Buddy',
  avatarType: 'bear',
  parentPinHash: null, // SHA-256 hex; see migratePinIfNeeded/hashPin
  voiceName: '',
  speechRate: 0.9,
  speechPitch: 1.1,
  voiceOnly: false,
  autoListen: false,
  avatarColor: '#7c3aed',
  costume: null, // Pro only — see BuddyCostumeOverlays.jsx for ids
  dailyLimitMinutes: null, // Pro only — null/0 = off; see utils/screenTime.js
  morningRoutine: [
    'Wake up and stretch!',
    'Brush your teeth',
    'Wash your face',
    'Get dressed',
    'Eat breakfast',
    'Pack your bag',
  ],
  bedtimeRoutine: [
    'Put on your pajamas',
    'Brush your teeth',
    'Use the bathroom',
    'Get into bed',
    'Take 3 deep breaths',
    'Goodnight!',
  ],
}

export function getSettings() {
  try {
    const childId = getActiveChildId()
    const raw = localStorage.getItem(childId ? settingsKeyFor(childId) : KEYS.SETTINGS)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings) {
  const childId = getActiveChildId()
  localStorage.setItem(childId ? settingsKeyFor(childId) : KEYS.SETTINGS, JSON.stringify(settings))
}

// Raw read/write against a specific child's namespaced settings, regardless
// of which child is currently active — used by the one-time migration and
// by the Parent dashboard when seeding a brand-new child.
export function getSettingsFor(childId) {
  try {
    const raw = localStorage.getItem(settingsKeyFor(childId))
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettingsFor(childId, settings) {
  localStorage.setItem(settingsKeyFor(childId), JSON.stringify(settings))
}

export function getLegacySettingsRaw() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

export async function hashPin(pin) {
  const enc = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// One-time migration from the old plaintext `parentPin` field to a hash.
// Idempotent — safe to call on every load. Returns the (possibly migrated)
// settings object.
export async function migratePinIfNeeded(settings) {
  if (settings.parentPinHash) return settings
  const plain = settings.parentPin || '1234'
  const parentPinHash = await hashPin(plain)
  const next = { ...settings, parentPinHash }
  delete next.parentPin
  saveSettings(next)
  return next
}

// Lockout state persists across refresh so the 30s cooldown can't be dodged
// by reloading the page.
export function getPinLock() {
  try {
    const raw = localStorage.getItem(KEYS.PIN_LOCK)
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 }
  } catch {
    return { attempts: 0, lockedUntil: 0 }
  }
}

export function savePinLock(state) {
  localStorage.setItem(KEYS.PIN_LOCK, JSON.stringify(state))
}
