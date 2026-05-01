import { ipcMain } from 'electron'
import { getDatabase } from '../db/index.js'

function registerSettingsHandlers() {
  ipcMain.handle('settings:get', (_, { key }) => {
    const db = getDatabase()
    return db.get(`settings.${key}`).value() || null
  })

  ipcMain.handle('settings:set', (_, { key, value }) => {
    const db = getDatabase()
    db.set(`settings.${key}`, value).write()
    return { success: true }
  })

  ipcMain.handle('settings:getAll', () => {
    const db = getDatabase()
    return db.get('settings').value()
  })
}

export { registerSettingsHandlers }
