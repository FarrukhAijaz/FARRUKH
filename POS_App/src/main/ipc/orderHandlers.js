import { ipcMain } from 'electron'
import { getDatabase, getBusinessDate } from '../db/index.js'

function nextOrderId(db) {
  const counter = db.get('_counters.orders').value() + 1
  db.set('_counters.orders', counter).write()
  return counter
}

function nextTakeawayNumber(db) {
  const n = (db.get('_counters.takeaway').value() || 0) + 1
  db.set('_counters.takeaway', n).write()
  return `T-${String(n).padStart(3, '0')}`
}

function registerOrderHandlers() {
  ipcMain.handle('order:create', (_, { tableId, channel, orderType, customerRef }) => {
    const db = getDatabase()
    const now = new Date().toISOString()
    const id = nextOrderId(db)
    const isTakeaway = (channel === 'takeaway')
    const takeawayToken = isTakeaway ? nextTakeawayNumber(db) : null
    const order = {
      id,
      table_id: tableId || null,
      channel: channel || 'dine_in',
      order_type: orderType || 'dine_in',
      customer_ref: customerRef || takeawayToken || null,
      takeaway_token: takeawayToken,
      items: [],
      total_amount: 0,
      status: 'open',
      special_instructions: '',
      kitchen_sent_at: null,
      bill_printed_at: null,
      created_at: now,
      updated_at: now
    }
    db.get('orders').push(order).write()
    if (tableId) {
      db.get('tables').find({ id: tableId }).assign({ current_order_id: id, status: 'active' }).write()
    }
    return order
  })

  ipcMain.handle('order:getByTable', (_, { tableId }) => {
    const db = getDatabase()
    const table = db.get('tables').find({ id: tableId }).value()
    if (!table || !table.current_order_id) return null
    return db.get('orders').find({ id: table.current_order_id }).value() || null
  })

  // Get all open orders for a non-table channel (whatsapp / delivery)
  ipcMain.handle('order:getByChannel', (_, { channel }) => {
    const db = getDatabase()
    return db.get('orders').filter({ channel, status: 'open' }).value()
  })

  // Update the customer reference label on an order
  ipcMain.handle('order:updateRef', (_, { orderId, customerRef }) => {
    const db = getDatabase()
    db.get('orders').find({ id: orderId }).assign({ customer_ref: customerRef }).write()
    return db.get('orders').find({ id: orderId }).value()
  })

  // Stamp a workflow flag (kitchen_sent_at or bill_printed_at) on an order
  ipcMain.handle('order:setFlag', (_, { orderId, flag }) => {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.get('orders').find({ id: orderId }).assign({ [flag]: now }).write()
    return db.get('orders').find({ id: orderId }).value()
  })

  ipcMain.handle('order:updateItems', (_, { orderId, items, specialInstructions }) => {
    const db = getDatabase()
    // Only sum active (non-cancelled) items for the total
    const total = items
      .filter((item) => !item.cancelled)
      .reduce((sum, item) => sum + item.price * item.qty, 0)
    const now = new Date().toISOString()
    db.get('orders')
      .find({ id: orderId })
      .assign({ items, total_amount: total, special_instructions: specialInstructions || '', updated_at: now })
      .write()
    return db.get('orders').find({ id: orderId }).value()
  })

  ipcMain.handle('order:checkout', (_, { orderId, tableId, paymentMethod, cashReceived, changeGiven, discountType, discountValue }) => {
    const db = getDatabase()
    const now = new Date().toISOString()

    // Fetch the order before mutating it so we can capture the total
    const order = db.get('orders').find({ id: orderId }).value()
    const table = db.get('tables').find({ id: tableId }).value()

    const subtotal = order ? order.total_amount : 0

    // Compute discount amount (flat or percentage)
    let discountAmount = 0
    const dVal = parseFloat(discountValue) || 0
    if (dVal > 0) {
      if (discountType === 'percent') {
        discountAmount = parseFloat(((subtotal * Math.min(dVal, 100)) / 100).toFixed(2))
      } else {
        // flat — cannot exceed subtotal
        discountAmount = parseFloat(Math.min(dVal, subtotal).toFixed(2))
      }
    }
    const finalAmount = parseFloat((subtotal - discountAmount).toFixed(2))

    // Mark order paid, record discount on the order itself
    db.get('orders').find({ id: orderId }).assign({
      status: 'paid',
      payment_method: paymentMethod || 'cash',
      discount_type: discountType || null,
      discount_value: dVal || null,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      updated_at: now
    }).write()

    // Reset table (only if this order was tied to a physical table)
    if (tableId) {
      db.get('tables').find({ id: tableId }).assign({ current_order_id: null, status: 'empty' }).write()
    }

    // Log payment record
    const paymentId = db.get('_counters.payments').value() + 1
    db.set('_counters.payments', paymentId).write()
    const channelLabel =
      order && order.channel && order.channel !== 'dine_in'
        ? order.channel.charAt(0).toUpperCase() + order.channel.slice(1)
        : null
    db.get('payments').push({
      id: paymentId,
      order_id: orderId,
      table_id: tableId || null,
      table_name: table ? table.name : (channelLabel || `Table ${tableId}`),
      channel: order ? (order.channel || 'dine_in') : 'dine_in',
      order_type: order ? (order.order_type || 'dine_in') : 'dine_in',
      customer_ref: order ? (order.customer_ref || null) : null,
      subtotal,
      discount_type: discountType || null,
      discount_value: dVal || null,
      discount_amount: discountAmount,
      amount: finalAmount,
      payment_method: paymentMethod || 'cash',
      cash_received: cashReceived || null,
      change_given: changeGiven || null,
      business_date: getBusinessDate(),
      paid_at: now
    }).write()

    return { success: true, paymentId, discountAmount, finalAmount }
  })

  // Partial / split payment — pays for selected items (with per-item qty), keeps order open with remaining items
  ipcMain.handle('order:splitPay', (_, { orderId, tableId, selectedItems, paymentMethod, cashReceived, changeGiven, discountType, discountValue }) => {
    const db = getDatabase()
    const now = new Date().toISOString()

    const order = db.get('orders').find({ id: orderId }).value()
    if (!order) return { success: false, error: 'Order not found' }

    const table = tableId ? db.get('tables').find({ id: tableId }).value() : null

    // Build a lookup: item id → qty being paid now
    const selMap = {}
    for (const s of (selectedItems || [])) selMap[s.id] = s.qty

    const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])

    // Process each item: split row when only partial qty is paid
    const updatedItems = []
    for (const item of rawItems) {
      if (item.cancelled || item.split_paid) {
        updatedItems.push(item)
        continue
      }
      const payingQty = selMap[item.id] || 0
      if (payingQty <= 0) {
        updatedItems.push(item) // unchanged
      } else if (payingQty >= item.qty) {
        // Pay all of this item
        updatedItems.push({ ...item, split_paid: true })
      } else {
        // Partial — split into a paid row and a remaining row
        updatedItems.push({ ...item, qty: payingQty, split_paid: true })
        updatedItems.push({ ...item, qty: item.qty - payingQty, split_paid: false })
      }
    }

    // Split subtotal = sum of what we're paying now
    const splitSubtotal = (selectedItems || []).reduce((sum, s) => {
      const orig = rawItems.find((i) => i.id === s.id)
      return sum + (orig ? orig.price * s.qty : 0)
    }, 0)

    // Apply optional discount on the split subtotal
    let discountAmount = 0
    const dVal = parseFloat(discountValue) || 0
    if (dVal > 0) {
      if (discountType === 'percent') {
        discountAmount = parseFloat(((splitSubtotal * Math.min(dVal, 100)) / 100).toFixed(2))
      } else {
        discountAmount = parseFloat(Math.min(dVal, splitSubtotal).toFixed(2))
      }
    }
    const finalAmount = parseFloat((splitSubtotal - discountAmount).toFixed(2))

    // Recalculate order total — only remaining (non-cancelled, non-split_paid) items
    const newTotal = updatedItems
      .filter((i) => !i.cancelled && !i.split_paid)
      .reduce((sum, i) => sum + i.price * i.qty, 0)

    db.get('orders').find({ id: orderId }).assign({
      items: updatedItems,
      total_amount: newTotal,
      updated_at: now
    }).write()

    // Record split payment
    const paymentId = db.get('_counters.payments').value() + 1
    db.set('_counters.payments', paymentId).write()
    const channelLabel =
      order.channel && order.channel !== 'dine_in'
        ? order.channel.charAt(0).toUpperCase() + order.channel.slice(1)
        : null
    db.get('payments').push({
      id: paymentId,
      order_id: orderId,
      table_id: tableId || null,
      table_name: table ? table.name : (channelLabel || `Order ${orderId}`),
      channel: order.channel || 'dine_in',
      order_type: order.order_type || 'dine_in',
      customer_ref: order.customer_ref || null,
      subtotal: splitSubtotal,
      discount_type: discountType || null,
      discount_value: dVal || null,
      discount_amount: discountAmount,
      amount: finalAmount,
      payment_method: paymentMethod || 'cash',
      cash_received: cashReceived || null,
      change_given: changeGiven || null,
      is_split: true,
      business_date: getBusinessDate(),
      paid_at: now
    }).write()

    const updatedOrder = db.get('orders').find({ id: orderId }).value()

    // If no active items remain, auto-close the order and free the table
    const remainingActive = updatedItems.filter((i) => !i.cancelled && !i.split_paid)
    let orderClosed = false
    if (remainingActive.length === 0) {
      db.get('orders').find({ id: orderId }).assign({
        status: 'paid',
        updated_at: now
      }).write()
      if (tableId) {
        db.get('tables').find({ id: tableId }).assign({ current_order_id: null, status: 'empty' }).write()
      }
      orderClosed = true
    }

    return { success: true, paymentId, finalAmount, newTotal, order: updatedOrder, orderClosed }
  })

  // Cancel an order that was opened but had no items added
  ipcMain.handle('order:cancel', (_, { orderId, tableId }) => {
    const db = getDatabase()
    db.get('orders').remove({ id: orderId }).write()
    if (tableId) {
      db.get('tables').find({ id: tableId }).assign({ current_order_id: null, status: 'empty' }).write()
    }
    return { success: true }
  })
}

export { registerOrderHandlers }
