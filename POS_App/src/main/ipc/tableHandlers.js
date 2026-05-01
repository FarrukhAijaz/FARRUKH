import { ipcMain } from 'electron'
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
}

export { registerTableHandlers }
