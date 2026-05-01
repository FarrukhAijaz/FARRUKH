import { useState } from 'react'
import useMenuStore from '../../store/useMenuStore'
import useOrderStore from '../../store/useOrderStore'
import FoodTile from './FoodTile'
import ItemModifierModal from '../ItemModifierModal/ItemModifierModal'
import { needsModifier } from '../../config/menuModifiers'

function MenuGrid() {
  const { menuItems, categories, selectedCategory, setCategory } = useMenuStore()
  const { addItem, removeItem, getItemQty } = useOrderStore()
  const [pendingItem, setPendingItem] = useState(null)

  const filtered = menuItems.filter((i) => i.category === selectedCategory)

  const handleAdd = (item) => {
    if (needsModifier(item)) {
      setPendingItem(item)
    } else {
      addItem(item)
    }
  }

  const handleModifierConfirm = (modifier) => {
    addItem(pendingItem, modifier)
    setPendingItem(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex gap-2 px-4 py-3 bg-cream-200 border-b border-cream-300 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`
              px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors
              ${
                selectedCategory === cat
                  ? 'bg-forest-600 text-cream-50'
                  : 'bg-cream-300 text-ink-200 hover:bg-cream-400'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food item grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-cream-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <FoodTile
              key={item.id}
              item={item}
              qty={getItemQty(item.id)}
              onAdd={handleAdd}
              onRemove={removeItem}
            />
          ))}
        </div>
      </div>

      {pendingItem && (
        <ItemModifierModal
          item={pendingItem}
          onConfirm={handleModifierConfirm}
          onCancel={() => setPendingItem(null)}
        />
      )}
    </div>
  )
}

export default MenuGrid
