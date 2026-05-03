import { useState } from 'react'
import { ArrowLeft, Edit, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import useMenuStore from '../../store/useMenuStore'
import MenuItemEditModal from './MenuItemEditModal'
import NewMenuItemModal from './NewMenuItemModal'

function MenuEditor({ onBack }) {
  const { menuItems, updateItem, toggleStock, createItem, deleteItem } = useMenuStore()
  const [selectedItem, setSelectedItem] = useState(null)
  const [showNewItemModal, setShowNewItemModal] = useState(false)

  // Group by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const handleSaveItem = async (changes) => {
    try {
      await updateItem(selectedItem.id, changes)
      setSelectedItem(null)
    } catch (err) {
      console.error('Failed to update item:', err)
    }
  }

  const handleToggleStock = async (item) => {
    try {
      await toggleStock(item.id)
    } catch (err) {
      console.error('Failed to toggle stock:', err)
    }
  }

  const handleCreateItem = async (category, name, price, imagePath) => {
    try {
      await createItem(category, name, price, imagePath)
      setShowNewItemModal(false)
    } catch (err) {
      console.error('Failed to create item:', err)
    }
  }

  const handleDeleteItem = async (item) => {
    const confirmed = window.confirm(`Delete ${item.name} permanently? This cannot be undone.`)

    if (!confirmed) return

    try {
      await deleteItem(item.id)
      if (selectedItem?.id === item.id) {
        setSelectedItem(null)
      }
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-cream-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-cream-300 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-cream-100 transition-colors"
            title="Back"
          >
            <ArrowLeft size={20} className="text-ink-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-ink-300">Menu Editor</h1>
            <p className="text-sm text-cream-600">{menuItems.length} items total</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewItemModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold rounded-lg transition-colors"
          title="Add new item"
        >
          <Plus size={18} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h2 className="text-sm font-bold text-ink-200 uppercase tracking-wide mb-3 px-3">
              {category}
            </h2>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg border border-cream-300 p-3 flex items-center justify-between hover:shadow-md transition-shadow ${
                    item.in_stock === 0 ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink-300 line-clamp-1">{item.name}</h3>
                      {item.in_stock === 0 && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                          OUT OF STOCK
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-cream-600">₺{item.price.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>

                    {/* Stock Toggle */}
                    <button
                      onClick={() => handleToggleStock(item)}
                      title={item.in_stock === 0 ? 'Mark in stock' : 'Mark out of stock'}
                      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-cream-100 transition-colors"
                    >
                      {item.in_stock === 0 ? (
                        <EyeOff size={18} className="text-cream-600" />
                      ) : (
                        <Eye size={18} className="text-forest-600" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-forest-50 hover:bg-forest-100 transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} className="text-forest-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedItem && (
        <MenuItemEditModal
          item={selectedItem}
          onSave={handleSaveItem}
          onCancel={() => setSelectedItem(null)}
        />
      )}

      {/* New Item Modal */}
      {showNewItemModal && (
        <NewMenuItemModal
          onSave={handleCreateItem}
          onCancel={() => setShowNewItemModal(false)}
        />
      )}
    </div>
  )
}

export default MenuEditor
