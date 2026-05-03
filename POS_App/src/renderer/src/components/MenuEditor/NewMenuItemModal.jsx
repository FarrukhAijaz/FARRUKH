import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'

const CATEGORIES = [
  'Palate Teasers',
  'Heart of the Feast',
  'Ancient Flames',
  'The Sizzling Grate',
  'Liquid Alchemy',
  'Brainy Bites',
  'Shared Journeys',
]

function NewMenuItemModal({ onSave, onCancel }) {
  const [category, setCategory] = useState('Palate Teasers')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [imagePath, setImagePath] = useState('🍽️')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const getCategoryFolder = () => {
    const folderMap = {
      'Palate Teasers': 'appetizers',
      'Heart of the Feast': 'main-course',
      'Ancient Flames': 'hot-tandoor',
      'The Sizzling Grate': 'sizzling-bbq',
      'Liquid Alchemy': 'drinks',
      'Brainy Bites': 'brainy-bites',
      'Shared Journeys': 'deals',
    }
    return folderMap[category] || 'menu'
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setLoading(true)

    // Show a local blob URL instantly — no network round-trip needed for preview
    const blobUrl = URL.createObjectURL(file)
    setPreviewUrl(blobUrl)

    try {
      const buffer = await file.arrayBuffer()
      const categoryFolder = getCategoryFolder()
      const newPath = await window.api.menu.uploadImage(categoryFolder, file.name, buffer)
      setImagePath(newPath)
      // Keep blob URL for preview (already showing correctly)
    } catch (err) {
      setError('Failed to upload image')
      setPreviewUrl(null)
      console.error(err)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setError('')
    if (!name.trim()) {
      setError('Name cannot be empty')
      return
    }
    if (!price || Number(price) < 0) {
      setError('Price must be a valid number')
      return
    }

    setLoading(true)
    try {
      await onSave(category, name, Number(price), imagePath)
    } catch (err) {
      setError('Failed to create item')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ink-300">Add New Item</h2>
          <button onClick={onCancel} className="text-cream-400 hover:text-ink-200">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-ink-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-ink-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-ink-300 mb-1">Price (₺)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
          </div>

          {/* Image Preview */}
          <div>
            <label className="block text-sm font-semibold text-ink-300 mb-2">Image</label>
            <div className="relative w-full h-32 bg-cream-100 rounded-lg border border-cream-300 flex items-center justify-center overflow-hidden">
              {previewUrl && previewUrl.startsWith('/') ? (
                <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
              ) : previewUrl ? (
                <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
              ) : imagePath && !imagePath.startsWith('/') ? (
                <span className="text-5xl">{imagePath}</span>
              ) : (
                <span className="text-gray-400">No image</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-cream-200 hover:bg-cream-300 disabled:opacity-50 text-ink-300 font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              <Upload size={16} />
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-cream-200 hover:bg-cream-300 text-ink-300 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewMenuItemModal
