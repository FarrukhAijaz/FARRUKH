import { create } from 'zustand'
import { setBaseURL, fetchMenu, fetchTables, punchOrder as apiPunch } from '../api'

// Category order matching the desktop app
const CATEGORY_ORDER = [
  'Palate Teasers',
  'Heart of the Feast',
  'Ancient Flames',
  'The Sizzling Grate',
  'Liquid Alchemy',
  'Brainy Bites',
  'Shared Journeys',
]

function deriveCategories(items) {
  const found = new Set(items.map((item) => item.category))
  return CATEGORY_ORDER.filter((category) => found.has(category))
}

let pollingInterval = null

const useAppStore = create((set, get) => ({
  // Connection
  serverIp: '',
  connected: false,
  connectError: '',

  // Data
  tables: [],
  menu: [],
  categories: [],

  // Selection
  selectedTable: null,
  selectedCategory: '',

  // Cart (items added THIS session, before punching)
  cart: [],
  specialInstructions: '',

  // Loading / error states
  loading: false,
  punchLoading: false,
  punchError: '',

  // ── Actions ──────────────────────────────────────────────────────────────

  setServerIp: (ip) => set({ serverIp: ip }),

  connect: async (ip) => {
    set({ loading: true, connectError: '' })
    try {
      setBaseURL(ip)
      const [menuRes, tablesRes] = await Promise.all([fetchMenu(), fetchTables()])
      const items = menuRes.data
      const cats = deriveCategories(items)
      set({
        serverIp: ip,
        connected: true,
        menu: items,
        categories: cats,
        selectedCategory: cats[0] || '',
        tables: tablesRes.data,
        loading: false,
        connectError: '',
      })

      // Start polling menu every 5 seconds
      if (pollingInterval) clearInterval(pollingInterval)
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetchMenu()
          const items = res.data
          const categories = deriveCategories(items)
          set((state) => ({
            menu: items,
            categories,
            selectedCategory: categories.includes(state.selectedCategory)
              ? state.selectedCategory
              : categories[0] || ''
          }))
        } catch (err) {
          // Silently fail polling - don't interrupt user experience
        }
      }, 5000)
    } catch (err) {
      set({
        connected: false,
        loading: false,
        connectError: err.message || 'Cannot reach server',
      })
    }
  },

  refreshMenu: async () => {
    try {
      const res = await fetchMenu()
      const items = res.data
      const categories = deriveCategories(items)
      set((state) => ({
        menu: items,
        categories,
        selectedCategory: categories.includes(state.selectedCategory)
          ? state.selectedCategory
          : categories[0] || ''
      }))
    } catch (_) {
      // Silently fail
    }
  },

  loadTables: async () => {
    try {
      const res = await fetchTables()
      const tables = res.data
      set((state) => ({
        tables,
        // Keep selectedTable in sync so MenuScreen always reflects latest state
        selectedTable: state.selectedTable
          ? (tables.find((t) => t.id === state.selectedTable.id) ?? state.selectedTable)
          : null,
      }))
    } catch (_) {}
  },

  setSelectedTable: (table) =>
    set({ selectedTable: table, cart: [], specialInstructions: '', punchError: '' }),

  setSelectedCategory: (cat) => set({ selectedCategory: cat }),

  setSpecialInstructions: (text) => set({ specialInstructions: text }),

  addToCart: (item, modifier = null) => {
    set((state) => {
      const cartKey = `${item.id}_${JSON.stringify(modifier)}`
      const existing = state.cart.find((c) => c.cartKey === cartKey)
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.cartKey === cartKey ? { ...c, qty: c.qty + 1 } : c
          ),
        }
      }
      return {
        cart: [
          ...state.cart,
          { id: item.id, name: item.name, price: item.price, qty: 1, category: item.category || '', modifier, cartKey },
        ],
      }
    })
  },

  removeFromCart: (cartKey) => {
    set((state) => {
      const existing = state.cart.find((c) => c.cartKey === cartKey)
      if (!existing) return state
      if (existing.qty > 1) {
        return { cart: state.cart.map((c) => (c.cartKey === cartKey ? { ...c, qty: c.qty - 1 } : c)) }
      }
      return { cart: state.cart.filter((c) => c.cartKey !== cartKey) }
    })
  },

  clearCart: () => set({ cart: [], specialInstructions: '' }),

  punchOrder: async () => {
    const { selectedTable, cart, specialInstructions } = get()
    if (!selectedTable || cart.length === 0) return { success: false }
    set({ punchLoading: true, punchError: '' })
    try {
      // Transform cart to server format:
      // - strip cartKey (internal field)
      // - convert modifier (singular) → modifiers array (one entry per unit, matches POS desktop format)
      const items = cart.map(({ id, name, price, qty, category, modifier }) => {
        const item = { id, name, price, qty, category: category || '' }
        if (modifier) item.modifiers = Array(qty).fill(modifier)
        return item
      })
      const res = await apiPunch(selectedTable.id, items, specialInstructions)
      set({ punchLoading: false, cart: [], specialInstructions: '' })
      return { success: true, orderId: res.data.orderId, isNew: res.data.isNew }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Punch failed'
      set({ punchLoading: false, punchError: msg })
      return { success: false, error: msg }
    }
  },

  disconnect: () => {
    if (pollingInterval) clearInterval(pollingInterval)
    return set({
      connected: false,
      serverIp: '',
      tables: [],
      menu: [],
      categories: [],
      cart: [],
      selectedTable: null,
    })
  },
}))

export default useAppStore
