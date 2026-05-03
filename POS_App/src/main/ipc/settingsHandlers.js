import { ipcMain } from 'electron'
import { createHash, timingSafeEqual } from 'crypto'
import { getDatabase } from '../db/index.js'
import { getServerUrls } from '../services/networkService.js'
import { getMetroStatus, startMetro } from '../services/metroService.js'

function hashPin(pin) {
  return createHash('sha256').update(String(pin)).digest('hex')
}

function comparePinHash(expectedHash, inputPin) {
  const expectedBuffer = Buffer.from(expectedHash, 'hex')
  const inputBuffer = Buffer.from(hashPin(inputPin), 'hex')

  if (expectedBuffer.length !== inputBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, inputBuffer)
}

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

  ipcMain.handle('settings:setSuperuserPin', (_, { pin }) => {
    const db = getDatabase()
    const pinHash = hashPin(pin)
    db.set('settings.superuser_pin_hash', pinHash).write()
    return { success: true }
  })

  ipcMain.handle('settings:verifySuperuserPin', (_, { pin }) => {
    const db = getDatabase()
    const storedHash = db.get('settings.superuser_pin_hash').value()
    
    if (!storedHash) {
      return { valid: false, message: 'No superuser PIN set' }
    }
    
    try {
      const isValid = comparePinHash(storedHash, pin)
      return { valid: isValid, message: isValid ? 'PIN valid' : 'PIN invalid' }
    } catch (err) {
      console.error('[IPC] PIN verification error:', err)
      return { valid: false, message: 'Verification error' }
    }
  })

  ipcMain.handle('network:getUrls', () => {
    return getServerUrls(3000)
  })

  ipcMain.handle('metro:getStatus', () => {
    return getMetroStatus()
  })

  ipcMain.handle('metro:restart', async () => {
    await startMetro()
    return getMetroStatus()
  })
}

export { registerSettingsHandlers }
