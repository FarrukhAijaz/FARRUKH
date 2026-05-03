import { ipcMain, app } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getDatabase } from '../db/index.js'

function registerTableHandlers() {
  ipcMain.handle('table:getAll', () => {
    const db = getDatabase()
    return db.get('tables').sortBy('id').value()
  })

  ipcMain.handle('table:updateStatus', (_, { id, status }) => {
    const db = getDatabase()
    db.get('tables').find({ id }).assign({ status }).write()
    return db.get('tables').find({ id }).value()
  })

  ipcMain.handle('table:assignOrder', (_, { tableId, orderId }) => {
    const db = getDatabase()
    db.get('tables').find({ id: tableId }).assign({ current_order_id: orderId }).write()
    return { success: true }
  })

  ipcMain.handle('table:clearOrder', (_, { tableId }) => {
    const db = getDatabase()
    db.get('tables').find({ id: tableId }).assign({ current_order_id: null, status: 'empty' }).write()
    return { success: true }
  })

  // ── Table management (superuser) ─────────────────────────────────────────

  ipcMain.handle('table:create', (_, { name, image_path }) => {
    const db = getDatabase()
    if (!name || name.trim() === '') throw new Error('Table name is required')
    const tables = db.get('tables').value()
    const maxId = tables.reduce((max, t) => Math.max(max, t.id || 0), 0)
    const newTable = {
      id: maxId + 1,
      name: name.trim(),
      status: 'empty',
      current_order_id: null,
      image_path: image_path || null
    }
    tables.push(newTable)
    db.set('tables', tables).write()
    return newTable
  })

  ipcMain.handle('table:delete', (_, { id }) => {
    const db = getDatabase()
    const tables = db.get('tables').value()
    const idx = tables.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`Table ${id} not found`)
    const table = tables[idx]
    if (table.status !== 'empty') throw new Error('Cannot delete a table that has an active order. Clear the order first.')
    tables.splice(idx, 1)
    db.set('tables', tables).write()
    return { success: true }
  })

  ipcMain.handle('table:update', (_, { id, changes }) => {
    const db = getDatabase()
    const tables = db.get('tables').value()
    const idx = tables.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`Table ${id} not found`)
    if (changes.name !== undefined && changes.name.trim() === '') throw new Error('Table name cannot be empty')
    if (changes.name) changes.name = changes.name.trim()
    tables[idx] = { ...tables[idx], ...changes }
    db.set('tables', tables).write()
    return tables[idx]
  })

  ipcMain.handle('table:uploadImage', async (_, { filename, buffer }) => {
    try {
      const publicDir = join(app.getPath('userData'), 'public', 'tables')
      await mkdir(publicDir, { recursive: true })
      const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '.jpg'
      const uniqueName = `${Date.now()}${ext}`
      const filePath = join(publicDir, uniqueName)
      await writeFile(filePath, Buffer.from(buffer))
      return `/tables/${uniqueName}`
    } catch (err) {
      console.error('[IPC] table:uploadImage error:', err)
      throw err
    }
  })
}

export { registerTableHandlers }
