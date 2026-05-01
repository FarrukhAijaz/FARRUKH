import { ipcMain } from 'electron'
import { getDatabase } from '../db/index.js'

function registerMenuHandlers() {
  ipcMain.handle('menu:getAll', () => {
    const db = getDatabase()
    return db.get('menu_items').sortBy(['category', 'name']).value()
  })
}

export { registerMenuHandlers }
