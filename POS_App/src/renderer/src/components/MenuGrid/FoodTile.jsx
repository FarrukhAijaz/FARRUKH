import { useEffect, useState } from 'react'
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
  const isOutOfStock = item.in_stock === 0
  // Always load through Express (port 3000) which serves BOTH seed images and uploaded images.
  // Cache-bust by hashing the path so the browser refetches when image_path changes.
  const pathHash = hasImage
    ? Math.abs(item.image_path.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0))
        .toString(36).slice(-6)
    : ''
  // Use updated_at/created_at as cache-buster when available (changes on every save)
  const cacheKey = item.updated_at || item.created_at || pathHash
  const imageSrc = hasImage ? `http://127.0.0.1:3000${item.image_path}?v=${encodeURIComponent(cacheKey)}` : null
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [item.image_path, item.updated_at])

  return (
    <div className={`flex flex-col bg-white rounded-xl border border-cream-300 overflow-hidden hover:border-forest-500 hover:shadow-md transition-all ${isOutOfStock ? 'opacity-50' : ''}`}>
      {/* Image or Emoji */}
      <div className="relative w-full h-28 overflow-hidden">
        {hasImage && !imgError ? (
          <img
            src={imageSrc}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`flex items-center justify-center text-4xl h-28 w-full ${colorClass}`}>
            {item.image_path && !item.image_path.startsWith('/') ? item.image_path : '🍽️'}
          </div>
        )}
        {isDeal && !isOutOfStock && (
          <span className="absolute top-1.5 right-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide shadow">
            DEAL
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <span className="bg-red-600 text-white text-[11px] font-black px-2 py-1 rounded-full shadow-lg">
              OUT OF STOCK
            </span>
          </div>
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
          disabled={qty === 0 || isOutOfStock}
          className="flex-1 flex items-center justify-center h-9 rounded-lg bg-cream-200 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={16} className="text-ink-200" />
        </button>

        <span className="w-8 text-center text-ink-300 font-bold text-base tabular-nums">
          {qty}
        </span>

        <button
          onClick={() => !isOutOfStock && onAdd(item)}
          disabled={isOutOfStock}
          className="flex-1 flex items-center justify-center h-9 rounded-lg bg-cream-200 hover:bg-forest-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} className="text-ink-200" />
        </button>
      </div>
    </div>
  )
}

export default FoodTile
