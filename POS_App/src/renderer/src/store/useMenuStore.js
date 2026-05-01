import { create } from 'zustand'

const CATEGORY_ORDER = [
  'Palate Teasers', 'Heart of the Feast', 'Ancient Flames', 'The Sizzling Grate', 'Liquid Alchemy', 'Shared Journeys'
]

const useMenuStore = create((set) => ({
  menuItems: [],
  categories: [],
  selectedCategory: 'Palate Teasers',

  loadMenu: async () => {
    const items = await window.api.menu.getAll()
    const found = new Set(items.map((i) => i.category))
    const cats = CATEGORY_ORDER.filter((c) => found.has(c))
    set({ menuItems: items, categories: cats })
  },

  setCategory: (category) => set({ selectedCategory: category })
}))

export default useMenuStore
