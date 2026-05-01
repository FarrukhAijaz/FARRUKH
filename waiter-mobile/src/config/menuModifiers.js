// Identical modifier rules to the POS desktop app.
// Each entry describes what options to show when a waiter taps "+" on an item.
//   spice:         3-level spice selector (Mild / Medium / Hot)
//   accompaniment: Rice or Naan picker
//   lassi:         Sweet/Salty + Ice/No Ice

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

export function getModifierConfig(item) {
  return MODIFIER_RULES.byName[item.name] || MODIFIER_RULES.byCategory[item.category] || null
}

export function needsModifier(item) {
  return !!getModifierConfig(item)
}

// Human-readable label for a modifier object
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
