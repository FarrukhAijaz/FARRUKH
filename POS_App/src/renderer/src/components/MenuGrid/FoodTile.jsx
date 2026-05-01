import { Plus, Minus } from 'lucide-react'

const CATEGORY_COLORS = {
  'Palate Teasers':   'bg-amber-50 text-amber-800',
  'Heart of the Feast': 'bg-forest-600/10 text-forest-700',
  'Ancient Flames':   'bg-orange-50 text-orange-800',
  'The Sizzling Grate': 'bg-red-50 text-red-800',
  'Liquid Alchemy':   'bg-sky-50 text-sky-700',
  'Shared Journeys':  'bg-yellow-50 text-yellow-800',
}

function FoodTile({ item, qty, onAdd, onRemove }) {
  const colorClass = CATEGORY_COLORS[item.category] || 'bg-cream-200 text-ink-200'
  const hasImage = item.image_path && item.image_path.startsWith('/')
  const isDeal = item.category === 'Shared Journeys'

  return (
    <div className="flex flex-col bg-white rounded-xl border border-cream-300 overflow-hidden hover:border-forest-500 hover:shadow-md transition-all">
      {/* Image or Emoji */}
      <div className="relative w-full h-28 overflow-hidden">
        {hasImage ? (
          <img src={item.image_path} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`flex items-center justify-center text-4xl h-28 w-full ${colorClass}`}>
            {item.image_path || '🍽️'}
          </div>
        )}
        {isDeal && (
          <span className="absolute top-1.5 right-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide shadow">
            DEAL
          </span>
        )}
      </div>

      {/* Name + Price */}
      <div className="flex flex-col px-3 pt-2 pb-1 flex-1">
        <span className="text-ink-300 text-sm font-semibold leading-tight line-clamp-2">
          {item.name}
        </span>
        {isDeal && item.deal_items && (
          <ul className="mt-1 space-y-0.5">
            {item.deal_items.map((di, i) => (
              <li key={i} className="text-[10px] text-ink-200/70 leading-tight">
                • {di.qty}× {di.name}
              </li>
            ))}
          </ul>
        )}
        <span className="text-forest-600 text-sm font-bold mt-1">
          ₺{item.price.toFixed(2)}
        </span>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center justify-between px-2 pb-2 pt-1 gap-1">
        <button
          onClick={() => onRemove(item)}
          disabled={qty === 0}
          className="flex-1 flex items-center justify-center h-9 rounded-lg bg-cream-200 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={16} className="text-ink-200" />
        </button>

        <span className="w-8 text-center text-ink-300 font-bold text-base tabular-nums">
          {qty}
        </span>

        <button
          onClick={() => onAdd(item)}
          className="flex-1 flex items-center justify-center h-9 rounded-lg bg-cream-200 hover:bg-forest-500/20 transition-colors"
        >
          <Plus size={16} className="text-ink-200" />
        </button>
      </div>
    </div>
  )
}

export default FoodTile
