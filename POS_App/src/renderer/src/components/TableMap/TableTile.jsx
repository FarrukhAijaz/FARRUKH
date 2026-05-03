import { STATUS_CONFIG } from '../../store/useTableStore'
import { UtensilsCrossed } from 'lucide-react'

// Fallback prefix → seed image map (used when table has no custom image_path)
const TABLE_IMAGES = {
  'Lahori':     { src: 'http://127.0.0.1:3000/tables/Lahore.png' },
  'Karachi':    { src: 'http://127.0.0.1:3000/tables/Karachi.png' },
  'Islamabadi': { src: 'http://127.0.0.1:3000/tables/Islamabad.png' },
  'Peshawari':  { src: 'http://127.0.0.1:3000/tables/Peshawar.png' },
  'Multani':    { src: 'http://127.0.0.1:3000/tables/multan.png' },
  'Faisalabadi':{ src: 'http://127.0.0.1:3000/tables/Faislabad.png' },
  'Rawalpindi': { src: 'http://127.0.0.1:3000/tables/Rawalpindi.png' },
  'Hyderabadi': { src: 'http://127.0.0.1:3000/tables/Hyderabad.png' },
  'Quetta':     { src: 'http://127.0.0.1:3000/tables/Quetta.png' },
  'Gujrati':    { src: 'http://127.0.0.1:3000/tables/Gujrat.png', pos: 'object-[center_32%]' },
}

function getTableImage(table) {
  // Custom uploaded image takes priority
  if (table.image_path) {
    return { src: `http://127.0.0.1:3000${table.image_path}`, pos: 'object-center' }
  }
  // Fall back to seed image by name prefix
  const key = Object.keys(TABLE_IMAGES).find((k) => table.name.startsWith(k))
  return key ? TABLE_IMAGES[key] : null
}

function TableTile({ table, onClick }) {
  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.empty
  const imgEntry = getTableImage(table)
  const imgSrc = imgEntry?.src ?? null
  const imgPos = imgEntry?.pos ?? 'object-top'

  return (
    <button
      onClick={() => onClick(table)}
      className={`
        relative flex flex-col w-full rounded-2xl border-2 overflow-hidden
        transition-all duration-200 cursor-pointer
        hover:scale-105 hover:shadow-xl active:scale-100
        ${cfg.border} ${cfg.ring}
        ring-offset-cream-100 hover:ring-2 ring-offset-2
        bg-white
      `}
    >
      {/* Image — fills top 3/4, anchored to top */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={table.name}
            className={`absolute inset-0 w-full h-full object-cover ${imgPos}`}
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${cfg.bg}`}>
            <UtensilsCrossed size={32} className={`${cfg.text} opacity-40`} />
          </div>
        )}
        {/* Status dot on top-right of image */}
        <span className={`absolute top-2 right-2 inline-block w-3 h-3 rounded-full border-2 border-white shadow ${cfg.dot}`} />
      </div>

      {/* Name + status label below image */}
      <div className={`flex flex-col items-center gap-1 px-2 py-2 ${cfg.bg}`}>
        <span className="font-heading text-lg leading-tight tracking-wide text-center text-ink-300 uppercase">
          {table.name}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold tracking-wide ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>
    </button>
  )
}

export default TableTile
