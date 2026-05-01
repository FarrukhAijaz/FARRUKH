import { create } from 'zustand'

const parseItems = (items) =>
  typeof items === 'string' ? JSON.parse(items) : items || []

const useOrderStore = create((set, get) => ({
  currentOrder: null, // { id, table_id, channel, order_type, customer_ref, items: [], total_amount, ... }
  specialInstructions: '',
  isLoading: false,

  loadOrder: async (tableId) => {
    set({ isLoading: true })
    const order = await window.api.orders.getByTable(tableId)
    if (order) {
      set({
        currentOrder: { ...order, items: parseItems(order.items) },
        specialInstructions: order.special_instructions || '',
        isLoading: false
      })
    } else {
      set({ currentOrder: null, specialInstructions: '', isLoading: false })
    }
  },

  initOrder: (order) => {
    set({
      currentOrder: { ...order, items: parseItems(order.items) },
      specialInstructions: order.special_instructions || ''
    })
  },

  addItem: (menuItem, modifier = null) => {
    set((state) => {
      if (!state.currentOrder) return state
      const items = state.currentOrder.items.map((i) => ({ ...i }))
      // Only consider non-cancelled items when checking for existing qty
      const existing = items.find((i) => i.id === menuItem.id && !i.cancelled)
      if (existing) {
        existing.qty += 1
        if (modifier !== null) existing.modifiers = [...(existing.modifiers || []), modifier]
      } else {
        const newItem = { id: menuItem.id, name: menuItem.name, category: menuItem.category || '', price: menuItem.price, qty: 1, cancelled: false }
        if (menuItem.deal_items) newItem.deal_items = menuItem.deal_items
        if (modifier !== null) newItem.modifiers = [modifier]
        items.push(newItem)
      }
      const total = items
        .filter((i) => !i.cancelled)
        .reduce((sum, i) => sum + i.price * i.qty, 0)
      return { currentOrder: { ...state.currentOrder, items, total_amount: total } }
    })
  },

  // Stack-based cancel: mark the item as cancelled rather than removing it.
  // The full history is preserved so the kitchen slip can show [CANCELLED] items.
  cancelItem: (menuItemId) => {
    set((state) => {
      if (!state.currentOrder) return state
      const now = new Date().toISOString()
      const items = state.currentOrder.items.map((i) =>
        i.id === menuItemId && !i.cancelled
          ? { ...i, cancelled: true, cancelled_at: now }
          : { ...i }
      )
      const total = items
        .filter((i) => !i.cancelled)
        .reduce((sum, i) => sum + i.price * i.qty, 0)
      return { currentOrder: { ...state.currentOrder, items, total_amount: total } }
    })
  },

  // Decrement qty from the menu grid minus button — removes the row when qty hits 0
  // Also pops the last per-unit modifier to keep the modifiers array in sync
  removeItem: (menuItem) => {
    set((state) => {
      if (!state.currentOrder) return state
      const items = state.currentOrder.items
        .map((i) => {
          if (i.id === menuItem.id && !i.cancelled) {
            const updated = { ...i, qty: i.qty - 1 }
            if (i.modifiers && i.modifiers.length > 0) {
              updated.modifiers = i.modifiers.slice(0, -1)
            }
            return updated
          }
          return { ...i }
        })
        .filter((i) => i.cancelled || i.qty > 0)
      const total = items
        .filter((i) => !i.cancelled)
        .reduce((sum, i) => sum + i.price * i.qty, 0)
      return { currentOrder: { ...state.currentOrder, items, total_amount: total } }
    })
  },

  setSpecialInstructions: (text) => set({ specialInstructions: text }),

  markKitchenSent: async () => {
    const { currentOrder } = get()
    if (!currentOrder) return
    const updated = await window.api.orders.setFlag(currentOrder.id, 'kitchen_sent_at')
    set((state) => ({
      currentOrder: { ...state.currentOrder, kitchen_sent_at: updated.kitchen_sent_at }
    }))
  },

  markBillPrinted: async () => {
    const { currentOrder } = get()
    if (!currentOrder) return
    const updated = await window.api.orders.setFlag(currentOrder.id, 'bill_printed_at')
    set((state) => ({
      currentOrder: { ...state.currentOrder, bill_printed_at: updated.bill_printed_at }
    }))
  },

  getItemQty: (menuItemId) => {
    const { currentOrder } = get()
    if (!currentOrder) return 0
    return currentOrder.items.find((i) => i.id === menuItemId && !i.cancelled)?.qty || 0
  },

  clearOrder: () => set({ currentOrder: null, specialInstructions: '' })
}))

export default useOrderStore
