// ── Modifier rules ────────────────────────────────────────────────────────────
// Each entry describes what popup sections to show when the user taps "+"
//  spice:         show 3-level spice selector
//  accompaniment: show Rice / Naan picker
//  lassi:         show Sweet/Salty + Ice/No Ice picker

export const MODIFIER_RULES = {
  byName: {
    'Butter Chicken':            { spice: true, accompaniment: true },
    'Biryani':                   { spice: true },
    'Mandi':                     { spice: true },
    'Beef Karahi 1kg (3–4 ppl)': { spice: true },
    'Beef Karahi ½kg (2–3 ppl)': { spice: true },
    'French Fries':              { spice: true },
    'Garlic Mayo Fries':         { spice: true },
    'Lassi':                     { lassi: true },
  },
  byCategory: {
    'The Sizzling Grate': { spice: true },
  },
}

export const SPICE_LEVELS = [
  { level: 1, label: 'Mild',   emoji: '🌶' },
  { level: 2, label: 'Medium', emoji: '🌶🌶' },
  { level: 3, label: 'Hot',    emoji: '🌶🌶🌶' },
]

// Return the modifier config for a given menu item (or null if no popup needed)
export function getModifierConfig(item) {
  return MODIFIER_RULES.byName[item.name] || MODIFIER_RULES.byCategory[item.category] || null
}

export function needsModifier(item) {
  return !!getModifierConfig(item)
}

// Human-readable single-modifier string for sidebar display
export function formatModifier(m) {
  if (!m) return ''
  const parts = []
  if (m.accompaniment) parts.push(m.accompaniment)
  if (m.spice) {
    const s = SPICE_LEVELS.find((l) => l.level === m.spice)
    if (s) parts.push(`${s.emoji} ${s.label}`)
  }
  if (m.style) parts.push(m.style)
  if (m.ice !== undefined) parts.push(m.ice ? 'Ice' : 'No Ice')
  return parts.join(' · ')
}

// Group an array of modifier objects by unique combination, returning [{modifier, count}]
export function groupModifiers(modifiers) {
  if (!modifiers || modifiers.length === 0) return []
  const map = new Map()
  for (const m of modifiers) {
    const key = JSON.stringify(m)
    const entry = map.get(key)
    if (entry) entry.count++
    else map.set(key, { modifier: m, count: 1 })
  }
  return Array.from(map.values())
}
