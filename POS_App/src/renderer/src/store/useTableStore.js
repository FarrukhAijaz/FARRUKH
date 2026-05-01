import { create } from 'zustand'

// Status → visual config map used by both TableTile and badges
export const STATUS_CONFIG = {
  empty: {
    label: 'Empty',
    bg: 'bg-cream-200',
    border: 'border-cream-300',
    text: 'text-ink-100',
    badge: 'bg-ink-200 text-cream-100',
    dot: 'bg-ink-100',
    ring: 'ring-cream-300'
  },
  active: {
    label: 'Active',
    bg: 'bg-forest-600/10',
    border: 'border-forest-500',
    text: 'text-forest-600',
    badge: 'bg-forest-600 text-cream-50',
    dot: 'bg-forest-500',
    ring: 'ring-forest-500'
  },
  inprogress: {
    label: 'In Progress',
    bg: 'bg-amber-400/20',
    border: 'border-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-500 text-ink-300',
    dot: 'bg-amber-500',
    ring: 'ring-amber-500'
  },
  served: {
    label: 'Served',
    bg: 'bg-teal-400/15',
    border: 'border-teal-500',
    text: 'text-teal-700',
    badge: 'bg-teal-500 text-white',
    dot: 'bg-teal-500',
    ring: 'ring-teal-500'
  },
  waiting: {
    label: 'Waiting',
    bg: 'bg-orange-400/15',
    border: 'border-orange-500',
    text: 'text-orange-700',
    badge: 'bg-orange-500 text-white',
    dot: 'bg-orange-500',
    ring: 'ring-orange-500'
  }
}

const useTableStore = create((set, get) => ({
  tables: [],
  selectedTableId: null,
  _mobileListenerRegistered: false,

  loadTables: async () => {
    const tables = await window.api.tables.getAll()
    set({ tables })
  },

  // Call once on app mount to auto-refresh the table map when a mobile order arrives
  registerMobileOrderListener: () => {
    if (get()._mobileListenerRegistered) return
    window.api.events.onOrderPushed(() => get().loadTables())
    set({ _mobileListenerRegistered: true })
  },

  selectTable: (id) => set({ selectedTableId: id }),

  updateTableStatus: (id, status) => {
    set((state) => ({
      tables: state.tables.map((t) => (t.id === id ? { ...t, status } : t))
    }))
  },

  updateTableRecord: (updated) => {
    set((state) => ({
      tables: state.tables.map((t) => (t.id === updated.id ? updated : t))
    }))
  },

  getSelectedTable: () => {
    const { tables, selectedTableId } = get()
    return tables.find((t) => t.id === selectedTableId) || null
  }
}))

export default useTableStore
