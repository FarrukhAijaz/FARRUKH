import { useState } from 'react'
import { X } from 'lucide-react'
import { getModifierConfig, SPICE_LEVELS } from '../../config/menuModifiers'

function OptionBtn({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border-2 transition-all font-semibold text-sm ${
        selected
          ? 'border-forest-500 bg-forest-500/10 text-forest-700'
          : 'border-cream-300 bg-white text-ink-200 hover:border-forest-400'
      }`}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-ink-100/50 uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

function ItemModifierModal({ item, onConfirm, onCancel }) {
  const config = getModifierConfig(item)

  const [spice, setSpice] = useState(1)
  const [accompaniment, setAccompaniment] = useState('Naan')
  const [lassiStyle, setLassiStyle] = useState('Sweet')
  const [ice, setIce] = useState(true)

  if (!config) return null

  const handleConfirm = () => {
    const modifier = {}
    if (config.spice) modifier.spice = spice
    if (config.accompaniment) modifier.accompaniment = accompaniment
    if (config.lassi) {
      modifier.style = lassiStyle
      modifier.ice = ice
    }
    onConfirm(modifier)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-cream-200">
          <div>
            <p className="text-xs font-semibold text-ink-100/50 uppercase tracking-widest mb-0.5">
              Customise
            </p>
            <h2 className="text-ink-300 font-bold text-lg leading-tight">{item.name}</h2>
          </div>
          <button
            onClick={onCancel}
            className="mt-0.5 text-ink-100/40 hover:text-ink-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* ── Accompaniment ── */}
          {config.accompaniment && (
            <div>
              <SectionLabel>Served with</SectionLabel>
              <div className="flex gap-3">
                <OptionBtn selected={accompaniment === 'Naan'} onClick={() => setAccompaniment('Naan')}>
                  <span className="text-2xl">🫓</span>
                  <span>Naan</span>
                </OptionBtn>
                <OptionBtn selected={accompaniment === 'Rice'} onClick={() => setAccompaniment('Rice')}>
                  <span className="text-2xl">🍚</span>
                  <span>Rice</span>
                </OptionBtn>
              </div>
            </div>
          )}

          {/* ── Spice level ── */}
          {config.spice && (
            <div>
              <SectionLabel>Spice Level</SectionLabel>
              <div className="flex gap-2">
                {SPICE_LEVELS.map((s) => (
                  <OptionBtn key={s.level} selected={spice === s.level} onClick={() => setSpice(s.level)}>
                    <span className="text-lg leading-none">{s.emoji}</span>
                    <span className="text-xs">{s.label}</span>
                  </OptionBtn>
                ))}
              </div>
            </div>
          )}

          {/* ── Lassi style ── */}
          {config.lassi && (
            <>
              <div>
                <SectionLabel>Style</SectionLabel>
                <div className="flex gap-3">
                  <OptionBtn selected={lassiStyle === 'Sweet'} onClick={() => setLassiStyle('Sweet')}>
                    <span className="text-2xl">🍬</span>
                    <span>Sweet</span>
                  </OptionBtn>
                  <OptionBtn selected={lassiStyle === 'Salty'} onClick={() => setLassiStyle('Salty')}>
                    <span className="text-2xl">🧂</span>
                    <span>Salty</span>
                  </OptionBtn>
                </div>
              </div>
              <div>
                <SectionLabel>Ice</SectionLabel>
                <div className="flex gap-3">
                  <OptionBtn selected={ice === true} onClick={() => setIce(true)}>
                    <span className="text-2xl">🧊</span>
                    <span>With Ice</span>
                  </OptionBtn>
                  <OptionBtn selected={ice === false} onClick={() => setIce(false)}>
                    <span className="text-2xl">🚫</span>
                    <span>No Ice</span>
                  </OptionBtn>
                </div>
              </div>
            </>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-cream-300 text-ink-200 font-semibold text-sm hover:bg-cream-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-xl bg-forest-600 hover:bg-forest-500 text-cream-50 font-bold text-sm transition-colors"
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemModifierModal
