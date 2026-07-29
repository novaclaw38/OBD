// Premium (Pro) costume overlays — decorative accessories layered on top of
// whichever animal type/color the child already picked, drawn last in
// BuddyAvatar's SVG so they sit above the body, ears, and face.
// Same flat-fill + soft-highlight language as BuddyCostumes.jsx, just with
// their own fixed colors (a hat shouldn't recolor itself to --body).

function ChefHat() {
  return (
    <g>
      <rect x="30" y="14" width="40" height="14" rx="7" fill="#f8fafc" />
      <circle cx="34" cy="10" r="10" fill="#f8fafc" />
      <circle cx="50" cy="4"  r="12" fill="#f8fafc" />
      <circle cx="66" cy="10" r="10" fill="#f8fafc" />
      <rect x="30" y="20" width="40" height="8" rx="4" fill="#e2e8f0" />
    </g>
  )
}

function WizardHat() {
  return (
    <g>
      <ellipse cx="50" cy="26" rx="30" ry="6" fill="#5b21b6" />
      <path d="M38 26 L47 -6 Q50 -10 53 -6 L62 26 Z" fill="#7c3aed" />
      <path d="M46 6 l3 6 6 2 -6 2 -3 6 -3-6 -6-2 6-2 Z" fill="#ffd23f" />
    </g>
  )
}

function AstronautHelmet() {
  return (
    <g>
      <path d="M14 34 A36 36 0 0 1 86 34" fill="none" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
      <path d="M18 30 A32 32 0 0 1 82 30" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="4" r="4" fill="#f97316" />
      <line x1="50" y1="8" x2="50" y2="16" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

function SuperheroMask() {
  return (
    <g>
      <path d="M18 44 Q34 30 50 40 Q66 30 82 44 Q66 52 50 48 Q34 52 18 44 Z" fill="#ef4444" opacity="0.88" />
      <polygon points="14,40 22,32 26,44" fill="#ef4444" opacity="0.88" />
      <polygon points="86,40 78,32 74,44" fill="#ef4444" opacity="0.88" />
    </g>
  )
}

const OVERLAYS = {
  chef: ChefHat,
  wizard: WizardHat,
  astronaut: AstronautHelmet,
  superhero: SuperheroMask,
}

export const COSTUME_OVERLAY_IDS = Object.keys(OVERLAYS)

export function CostumeOverlay({ costumeId }) {
  const C = costumeId && OVERLAYS[costumeId]
  if (!C) return null
  return <C />
}
