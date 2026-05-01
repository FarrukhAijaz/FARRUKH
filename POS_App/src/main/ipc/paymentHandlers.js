import { ipcMain } from 'electron'
import { getDatabase, getBusinessDate } from '../db/index.js'

function registerPaymentHandlers() {
  // Return full payment log + summary for a business day.
  // Pass { date: 'YYYY-MM-DD' } to query a specific day, or omit to get today.
  ipcMain.handle('payment:getDailyReport', (_, args) => {
    const db = getDatabase()
    const businessDate = args?.date || getBusinessDate()
    const payments = db.get('payments').filter({ business_date: businessDate }).value()

    // Build a quick lookup from menu item id → category and name → {price, category} for deal expansion
    const menuLookup = {}
    const menuByName = {}
    db.get('menu_items').value().forEach((m) => {
      menuLookup[String(m.id)] = m.category
      menuByName[m.name] = { price: m.price, category: m.category, id: m.id }
    })

    // Helper: add a single line-item entry (or increment) into itemMap
    const addToItemMap = (key, name, category, price, qty, cancelled) => {
      if (!itemMap[key]) {
        itemMap[key] = { id: key, name, category, price, qty_sold: 0, qty_cancelled: 0, revenue: 0 }
      }
      if (cancelled) {
        itemMap[key].qty_cancelled += qty
      } else {
        itemMap[key].qty_sold += qty
        itemMap[key].revenue += price * qty
      }
    }

    // Enrich each payment with item counts and build per-item breakdown in one pass
    const itemMap = {}
    const enrichedPayments = payments.map((p) => {
      const order = db.get('orders').find({ id: p.order_id }).value()
      const items = order ? (order.items || []) : []
      let items_sold = 0
      let items_cancelled = 0
      items.forEach((i) => {
        const qty = i.qty || 1
        const cancelled = !!i.cancelled
        const key = i.id != null ? String(i.id) : i.name
        const category = i.category || menuLookup[String(i.id)] || ''

        // Always record the top-level item (deal or regular)
        addToItemMap(key, i.name, category, i.price, qty, cancelled)

        if (cancelled) {
          items_cancelled += qty
        } else {
          items_sold += qty
        }

        // If this is a deal, also expand each sub-item into the breakdown
        if (!cancelled && i.deal_items && i.deal_items.length > 0) {
          i.deal_items.forEach((di) => {
            const subQty = (di.qty || 1) * qty
            const subMeta = menuByName[di.name]
            const subKey = subMeta ? String(subMeta.id) : `deal_sub:${di.name}`
            const subPrice = subMeta ? subMeta.price : 0
            const subCategory = subMeta ? subMeta.category : category
            addToItemMap(subKey, di.name, subCategory, subPrice, subQty, false)
          })
        }
      })
      return { ...p, items_sold, items_cancelled }
    })

    const item_breakdown = Object.values(itemMap).sort((a, b) => b.qty_sold - a.qty_sold)

    const cashPayments = enrichedPayments.filter((p) => p.payment_method === 'cash')
    const cardPayments = enrichedPayments.filter((p) => p.payment_method === 'card')

    return {
      business_date: businessDate,
      payments: enrichedPayments,
      item_breakdown,
      summary: {
        total: enrichedPayments.reduce((s, p) => s + p.amount, 0),
        subtotal: enrichedPayments.reduce((s, p) => s + (p.subtotal || p.amount), 0),
        discounts: enrichedPayments.reduce((s, p) => s + (p.discount_amount || 0), 0),
        cash: cashPayments.reduce((s, p) => s + p.amount, 0),
        card: cardPayments.reduce((s, p) => s + p.amount, 0),
        count: enrichedPayments.length,
        cash_count: cashPayments.length,
        card_count: cardPayments.length,
        discounted_count: enrichedPayments.filter((p) => (p.discount_amount || 0) > 0).length,
        items_sold: enrichedPayments.reduce((s, p) => s + p.items_sold, 0),
        items_cancelled: enrichedPayments.reduce((s, p) => s + p.items_cancelled, 0)
      }
    }
  })

  // Return sorted list of all unique business dates that have payments.
  ipcMain.handle('payment:listDates', () => {
    const db = getDatabase()
    const payments = db.get('payments').value()
    const dates = [...new Set(payments.map((p) => p.business_date))].sort().reverse()
    return dates
  })
}

export { registerPaymentHandlers }
