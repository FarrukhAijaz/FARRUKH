import { create } from 'zustand'

const CATEGORY_ORDER = [
  'Palate Teasers',
  'Heart of the Feast',
  'Ancient Flames',
  'The Sizzling Grate',
  'Liquid Alchemy',
  'Brainy Bites',
  'Shared Journeys'
]

function deriveCategories(items) {
  const found = new Set(items.map((item) => item.category))
  return CATEGORY_ORDER.filter((category) => found.has(category))
}

function nextSelectedCategory(categories, currentCategory) {
  if (categories.includes(currentCategory)) {
    return currentCategory
  }

  return categories[0] || ''
}

const useMenuStore = create((set, get) => ({
  menuItems: [],
  categories: [],
  selectedCategory: 'Palate Teasers',

  loadMenu: async () => {
    try {
      const items = await window.api.menu.getAll()
      console.log(`[MenuStore] Loaded ${items.length} menu items`)
      const cats = deriveCategories(items)
      set((state) => ({
        menuItems: items,
        categories: cats,
        selectedCategory: nextSelectedCategory(cats, state.selectedCategory)
      }))
      return items
    } catch (err) {
      console.error('[MenuStore] Failed to load menu:', err)
      throw err
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),

  updateItem: async (id, changes) => {
    const updated = await window.api.menu.update(id, changes)
    const items = [...get().menuItems]
    const index = items.findIndex((item) => item.id === id)
    if (index !== -1) {
      items[index] = updated
      const categories = deriveCategories(items)
      set((state) => ({
        menuItems: items,
        categories,
        selectedCategory: nextSelectedCategory(categories, state.selectedCategory)
      }))
    }
    return updated
  },

  toggleStock: async (id) => {
    const updated = await window.api.menu.toggleStock(id)
    const items = [...get().menuItems]
    const index = items.findIndex((item) => item.id === id)
    if (index !== -1) {
      items[index] = updated
      const categories = deriveCategories(items)
      set((state) => ({
        menuItems: items,
        categories,
        selectedCategory: nextSelectedCategory(categories, state.selectedCategory)
      }))
    }
    return updated
  },

  createItem: async (category, name, price, image_path) => {
    const newItem = await window.api.menu.create(category, name, price, image_path)
    const items = [...get().menuItems, newItem]
    const categories = deriveCategories(items)
    set((state) => ({
      menuItems: items,
      categories,
      selectedCategory: nextSelectedCategory(categories, state.selectedCategory)
    }))
    return newItem
  },

  deleteItem: async (id) => {
    const deleted = await window.api.menu.delete(id)
    const items = get().menuItems.filter((item) => item.id !== id)
    const categories = deriveCategories(items)
    set((state) => ({
      menuItems: items,
      categories,
      selectedCategory: nextSelectedCategory(categories, state.selectedCategory)
    }))
    return deleted
  }
}))

export default useMenuStore
