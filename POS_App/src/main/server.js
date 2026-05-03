import express from 'express'
import cors from 'cors'
import { app as electronApp } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getDatabase, getBusinessDate } from './db/index.js'
import { printKitchenReceipt } from './services/printerService.js'
import {
  createChallenge,
  enrollDevice,
  getAttendanceSnapshot,
  verifyChallenge
} from './services/attendanceService.js'
import { getServerUrls } from './services/networkService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = 3000

// ── helpers ──────────────────────────────────────────────────────────────────

function getPrinterConfig(db) {
  const settings = db.get('settings').value()
  return {
    mock: settings.printer_mock ?? 'true',
    type: settings.printer_type ?? 'network',
    interface: settings.printer_interface ?? '127.0.0.1:9100'
  }
}

function nextOrderId(db) {
  const counter = db.get('_counters.orders').value() + 1
  db.set('_counters.orders', counter).write()
  return counter
}

function parseItems(items) {
  return typeof items === 'string' ? JSON.parse(items) : items || []
}

function getRequestNetworkFingerprint(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }

  return req.ip || req.socket?.remoteAddress || null
}

// ── server factory ────────────────────────────────────────────────────────────

export function startServer(mainWindow) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  // Serve seed menu images.
  // electronApp.getAppPath() always returns the project root (works in both dev and prod).
  // In dev:  POS_App/                  → src/renderer/public exists
  // In prod: POS_App/                  → resources/app.asar exists, but images are in out/renderer
  const appRoot = electronApp.getAppPath()
  const seedPublicDir = join(appRoot, 'src', 'renderer', 'public')
  const seedPublicDirProd = join(appRoot, '..', 'renderer', 'public')
  const uploadedPublicDir = join(electronApp.getPath('userData'), 'public')
  console.log('[Server] Serving seed images from:', seedPublicDir)
  console.log('[Server] Serving uploaded images from:', uploadedPublicDir)
  app.use(express.static(seedPublicDir))
  app.use(express.static(seedPublicDirProd))
  app.use(express.static(uploadedPublicDir))

  // ── GET /api/menu ──────────────────────────────────────────────────────────
  app.get('/api/menu', (req, res) => {
    try {
      const db = getDatabase()
      const items = db.get('menu_items').value()
      res.json(items)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ── GET /api/tables ────────────────────────────────────────────────────────
  // Returns each table enriched with its current_order summary (items + total)
  app.get('/api/tables', (req, res) => {
    try {
      const db = getDatabase()
      const tables = db.get('tables').sortBy('id').value()
      const enriched = tables.map((table) => {
        if (!table.current_order_id) return { ...table, current_order: null }
        const order = db.get('orders').find({ id: table.current_order_id }).value()
        if (!order) return { ...table, current_order: null }
        const items = parseItems(order.items)
        return {
          ...table,
          current_order: {
            id: order.id,
            items,
            item_count: items.filter((i) => !i.cancelled).length,
            total_amount: order.total_amount,
            special_instructions: order.special_instructions || '',
            created_at: order.created_at,
            kitchen_sent_at: order.kitchen_sent_at
          }
        }
      })
      res.json(enriched)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ── GET /api/tables/:id/order ──────────────────────────────────────────────
  app.get('/api/tables/:id/order', (req, res) => {
    try {
      const db = getDatabase()
      const tableId = parseInt(req.params.id, 10)
      const table = db.get('tables').find({ id: tableId }).value()
      if (!table) return res.status(404).json({ error: 'Table not found' })
      if (!table.current_order_id) return res.json(null)
      const order = db.get('orders').find({ id: table.current_order_id }).value() || null
      if (!order) return res.json(null)
      res.json({ ...order, items: parseItems(order.items) })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.get('/api/attendance/status', (req, res) => {
    try {
      const db = getDatabase()
      res.json(getAttendanceSnapshot(db, req.query.businessDate || getBusinessDate()))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.get('/api/attendance/connection-info', (req, res) => {
    res.json({
      port: PORT,
      urls: getServerUrls(PORT)
    })
  })

  app.post('/api/attendance/challenge', (req, res) => {
    try {
      const db = getDatabase()
      const challenge = createChallenge(db, {
        staffId: req.body.staffId,
        purpose: req.body.purpose || 'attendance',
        networkFingerprint: getRequestNetworkFingerprint(req)
      }, 'mobile-api')
      res.json(challenge)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  app.post('/api/attendance/enroll', (req, res) => {
    try {
      const db = getDatabase()
      const enrollment = enrollDevice(
        db,
        {
          staffId: req.body.staffId,
          deviceLabel: req.body.deviceLabel,
          managerPin: req.body.managerPin,
          networkFingerprint: getRequestNetworkFingerprint(req)
        },
        'mobile-api'
      )
      res.json(enrollment)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  app.post('/api/attendance/verify', (req, res) => {
    try {
      const db = getDatabase()
      const result = verifyChallenge(db, {
        challengeCode: req.body.challengeCode,
        pin: req.body.pin,
        deviceToken: req.body.deviceToken,
        networkFingerprint: getRequestNetworkFingerprint(req),
        type: req.body.type
      })
      res.json(result)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  // ── POST /api/order ────────────────────────────────────────────────────────
  // Smart upsert: create a new order OR append items to the existing open order.
  // Kitchen print fires only for the NEWLY punched items.
  app.post('/api/order', async (req, res) => {
    try {
      const db = getDatabase()
      const { tableId, items: newItems = [], specialInstructions = '' } = req.body

      if (!tableId || !Array.isArray(newItems) || newItems.length === 0) {
        return res.status(400).json({ error: 'tableId and a non-empty items array are required' })
      }

      const table = db.get('tables').find({ id: tableId }).value()
      if (!table) return res.status(404).json({ error: 'Table not found' })

      const now = new Date().toISOString()
      const config = getPrinterConfig(db)
      let orderId
      let isNew = false

      if (!table.current_order_id) {
        // ── Create fresh order ────────────────────────────────────
        isNew = true
        orderId = nextOrderId(db)
        const total = newItems.reduce((sum, i) => sum + (i.price * i.qty), 0)
        const order = {
          id: orderId,
          table_id: tableId,
          channel: 'dine_in',
          order_type: 'dine_in',
          customer_ref: null,
          takeaway_token: null,
          items: newItems.map((i) => ({ ...i, cancelled: false })),
          total_amount: total,
          status: 'open',
          special_instructions: specialInstructions,
          kitchen_sent_at: now,
          bill_printed_at: null,
          created_at: now,
          updated_at: now
        }
        db.get('orders').push(order).write()
        db.get('tables').find({ id: tableId }).assign({
          current_order_id: orderId,
          status: 'active'
        }).write()

        // Print kitchen receipt
        await printKitchenReceipt({ ...order, items: order.items }, table, config)

      } else {
        // ── Merge into existing open order ────────────────────────
        orderId = table.current_order_id
        const existing = db.get('orders').find({ id: orderId }).value()
        if (!existing) {
          return res.status(404).json({ error: 'Open order not found in database' })
        }

        const existingItems = parseItems(existing.items)

        // Merge: increment qty for matching id + first-modifier combo, else push as new line
        // modifiers is an array (one entry per unit). Compare the first entry to identify the "style".
        const firstMod = (i) => JSON.stringify((i.modifiers && i.modifiers[0]) ?? null)
        const merged = [...existingItems]
        for (const newItem of newItems) {
          const match = merged.find((i) => i.id === newItem.id && !i.cancelled && firstMod(i) === firstMod(newItem))
          if (match) {
            match.qty += newItem.qty
            // Append the new modifier entries to keep the per-unit array in sync
            if (newItem.modifiers) {
              match.modifiers = [...(match.modifiers || []), ...newItem.modifiers]
            }
          } else {
            merged.push({ ...newItem, cancelled: false })
          }
        }

        const total = merged
          .filter((i) => !i.cancelled)
          .reduce((sum, i) => sum + i.price * i.qty, 0)

        // Append special instructions if any
        const updatedInstructions = specialInstructions
          ? [existing.special_instructions, specialInstructions].filter(Boolean).join(' | ')
          : existing.special_instructions

        db.get('orders').find({ id: orderId }).assign({
          items: merged,
          total_amount: total,
          special_instructions: updatedInstructions,
          kitchen_sent_at: now,
          updated_at: now
        }).write()

        // Print only the NEW items to kitchen
        const partialOrder = {
          ...existing,
          id: orderId,
          items: newItems.map((i) => ({ ...i, cancelled: false })),
          special_instructions: specialInstructions,
          kitchen_sent_at: now
        }
        await printKitchenReceipt(partialOrder, table, config)
      }

      // Notify renderer to refresh table map
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('order:pushed', { tableId })
      }

      res.json({ success: true, orderId, isNew })
    } catch (err) {
      console.error('[SERVER] POST /api/order error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // ── Start listening ────────────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Express API running on port ${PORT}`)
  })
}
