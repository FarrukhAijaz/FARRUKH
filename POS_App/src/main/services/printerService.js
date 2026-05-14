import { spawn } from 'child_process'

const SPICE_TEXT = { 1: 'Mild', 2: 'Medium', 3: 'Hot!!!' }

function formatModifierText(m) {
  const parts = []
  if (m.accompaniment) parts.push(m.accompaniment)
  if (m.spice) parts.push(SPICE_TEXT[m.spice] || String(m.spice))
  if (m.style) parts.push(m.style)
  if (m.ice !== undefined) parts.push(m.ice ? 'With Ice' : 'No Ice')
  return parts.join(', ')
}

function groupModifiersText(modifiers) {
  const map = new Map()
  for (const m of modifiers) {
    const key = JSON.stringify(m)
    const entry = map.get(key)
    if (entry) entry.count++
    else map.set(key, { label: formatModifierText(m), count: 1 })
  }
  return Array.from(map.values())
}

const buildKitchenPayload = (order, table) => {
  const items = Array.isArray(order.items)
    ? order.items
    : order.items
    ? JSON.parse(order.items)
    : []
  return {
    type: 'KITCHEN',
    table: order.takeaway_token
      ? `TAKEAWAY ${order.takeaway_token}`
      : table
      ? table.name
      : order.customer_ref || 'Counter',
    tableId: table ? table.id : null,
    orderId: order.id,
    timestamp: new Date().toLocaleString(),
    // Include ALL items (active + cancelled) so chef can see what was removed
    items: items.map((item) => ({
      name: item.name,
      qty: item.qty,
      notes: item.notes || '',
      cancelled: item.cancelled || false,
      cancelled_at: item.cancelled_at || null,
      deal_items: item.deal_items || null,
      modifiers: item.modifiers || null
    })),
    specialInstructions: order.special_instructions || ''
  }
}

const buildBillPayload = (order, table) => {
  const items = Array.isArray(order.items)
    ? order.items
    : order.items
    ? JSON.parse(order.items)
    : []
  // Bill only shows active (non-cancelled) items
  const activeItems = items.filter((item) => !item.cancelled)
  return {
    type: 'BILL',
    table: order.takeaway_token
      ? `TAKEAWAY ${order.takeaway_token}`
      : table
      ? table.name
      : order.customer_ref || 'Counter',
    tableId: table ? table.id : null,
    orderId: order.id,
    timestamp: new Date().toLocaleString(),
    items: activeItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      unitPrice: item.price,
      subtotal: item.qty * item.price
    })),
    totalAmount: order.total_amount,
    specialInstructions: order.special_instructions || ''
  }
}

const formatKitchenReceipt = (payload) => {
  const lines = [
    '================================',
    `  KITCHEN ORDER -- ${payload.table.toUpperCase()}`,
    '================================',
    `Order #${payload.orderId}`,
    `Time:  ${payload.timestamp}`,
    '--------------------------------',
    ...payload.items.map((i) => {
      if (i.cancelled) {
        return `  [CANCELLED]  ${i.qty}x  ${i.name}`
      }
      const lines = [`  ${i.qty}x  ${i.name}${i.notes ? `  [${i.notes}]` : ''}`]
      if (i.deal_items) {
        i.deal_items.forEach((di) => lines.push(`       - ${di.qty}x ${di.name}`))
      }
      if (i.modifiers && i.modifiers.length > 0) {
        const grouped = groupModifiersText(i.modifiers)
        grouped.forEach(({ label, count }) =>
          lines.push(`       ~ ${count > 1 ? count + 'x ' : ''}${label}`)
        )
      }
      return lines.join('\n')
    }),
    '--------------------------------',
    payload.specialInstructions ? `Notes: ${payload.specialInstructions}` : null,
    '================================'
  ].filter(Boolean)
  return lines.join('\n')
}

const formatBillReceipt = (payload) => {
  const lines = [
    '================================',
    `   INTERIM BILL -- ${payload.table.toUpperCase()}`,
    '================================',
    `Order #${payload.orderId}`,
    `Time:  ${payload.timestamp}`,
    '--------------------------------',
    ...payload.items.map(
      (i) => `  ${i.qty}x ${i.name.padEnd(18)} ₺${i.subtotal.toFixed(2)}`
    ),
    '--------------------------------',
    `  TOTAL:              ₺${payload.totalAmount.toFixed(2)}`,  
    '================================'
  ]
  return lines.join('\n')
}

// Pipe a raw ESC/POS buffer to a CUPS printer by name
function printViaCups(buffer, printerName) {
  return new Promise((resolve, reject) => {
    const lp = spawn('lp', ['-d', printerName, '-o', 'raw', '-'])
    lp.on('error', (err) => reject(new Error(`lp spawn error: ${err.message}`)))
    lp.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`lp exited with code ${code}`))
    })
    lp.stdin.write(buffer)
    lp.stdin.end()
  })
}

// Send a raw ESC/POS buffer over TCP to network:port
function printViaNetwork(buffer, interfaceStr) {
  const [host, portStr] = interfaceStr.split(':')
  const port = parseInt(portStr, 10) || 9100
  return new Promise((resolve, reject) => {
    const net = require('net')
    const socket = net.createConnection({ host, port, timeout: 5000 }, () => {
      socket.write(buffer, () => {
        socket.end()
        resolve()
      })
    })
    socket.on('error', reject)
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error(`Connection to ${interfaceStr} timed out`))
    })
  })
}

async function buildKitchenBuffer(payload) {
  const { ThermalPrinter, PrinterTypes, CharacterSet } = await import('node-thermal-printer')
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: '/tmp/thermal-dummy',
    characterSet: CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: false,
    lineCharacter: '-'
  })
  printer.alignCenter()
  printer.bold(true)
  printer.println(`KITCHEN ORDER -- ${payload.table}`)
  printer.bold(false)
  printer.println(`Order #${payload.orderId}`)
  printer.println(`Time: ${payload.timestamp}`)
  printer.drawLine()
  for (const item of payload.items) {
    printer.alignLeft()
    if (item.cancelled) {
      printer.println(`  [VOID] ${item.qty}x  ${item.name}`)
    } else {
      printer.println(`  ${item.qty}x  ${item.name}${item.notes ? `  [${item.notes}]` : ''}`)
      if (item.deal_items) {
        for (const di of item.deal_items) {
          printer.println(`       - ${di.qty}x ${di.name}`)
        }
      }
      if (item.modifiers && item.modifiers.length > 0) {
        const grouped = groupModifiersText(item.modifiers)
        for (const { label, count } of grouped) {
          printer.println(`       ~ ${count > 1 ? count + 'x ' : ''}${label}`)
        }
      }
    }
  }
  printer.drawLine()
  if (payload.specialInstructions) printer.println(`Notes: ${payload.specialInstructions}`)
  printer.cut()
  return printer.getBuffer()
}

async function buildBillBuffer(payload) {
  const { ThermalPrinter, PrinterTypes, CharacterSet } = await import('node-thermal-printer')
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: '/tmp/thermal-dummy',
    characterSet: CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: false,
    lineCharacter: '-'
  })
  printer.alignCenter()
  printer.bold(true)
  printer.println('FARRUKH RESTAURANT')
  printer.bold(false)
  printer.println(`INTERIM BILL -- ${payload.table}`)
  printer.drawLine()
  printer.alignLeft()
  printer.println(`Order #${payload.orderId}`)
  printer.println(`Time: ${payload.timestamp}`)
  printer.drawLine()
  for (const item of payload.items) {
    printer.tableCustom([
      { text: `${item.qty}x ${item.name}`, align: 'LEFT', width: 0.75 },
      { text: `Rs ${item.subtotal.toFixed(0)}`, align: 'RIGHT', width: 0.25 }
    ])
  }
  printer.drawLine()
  printer.bold(true)
  printer.tableCustom([
    { text: 'TOTAL', align: 'LEFT', width: 0.5 },
    { text: `Rs ${payload.totalAmount.toFixed(0)}`, align: 'RIGHT', width: 0.5 }
  ])
  printer.bold(false)
  if (payload.specialInstructions) {
    printer.drawLine()
    printer.println(`Notes: ${payload.specialInstructions}`)
  }
  printer.cut()
  return printer.getBuffer()
}

export const printKitchenReceipt = async (order, table, config) => {
  const payload = buildKitchenPayload(order, table)

  if (config.mock === true || config.mock === 'true') {
    console.log('\n[MOCK PRINTER] Kitchen Receipt')
    console.log(formatKitchenReceipt(payload))
    return { success: true, mock: true, payload }
  }

  try {
    const buffer = await buildKitchenBuffer(payload)
    if (config.type === 'usb') {
      await printViaCups(buffer, config.interface)
    } else {
      await printViaNetwork(buffer, config.interface)
    }
    console.log(`[PRINTER] Kitchen receipt sent (${config.type}) → ${config.interface}`)
    return { success: true, mock: false }
  } catch (err) {
    console.error('[PRINTER ERROR]', err.message)
    return { success: false, error: err.message }
  }
}

export const printInterimBill = async (order, table, config) => {
  const payload = buildBillPayload(order, table)

  if (config.mock === true || config.mock === 'true') {
    console.log('\n[MOCK PRINTER] Interim Bill')
    console.log(formatBillReceipt(payload))
    return { success: true, mock: true, payload }
  }

  try {
    const buffer = await buildBillBuffer(payload)
    if (config.type === 'usb') {
      await printViaCups(buffer, config.interface)
    } else {
      await printViaNetwork(buffer, config.interface)
    }
    console.log(`[PRINTER] Bill sent (${config.type}) → ${config.interface}`)
    return { success: true, mock: false }
  } catch (err) {
    console.error('[PRINTER ERROR]', err.message)
    return { success: false, error: err.message }
  }
}
