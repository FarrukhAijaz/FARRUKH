import { ipcMain, app } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getDatabase } from '../db/index.js'

function registerMenuHandlers() {
  ipcMain.handle('menu:getAll', () => {
    const db = getDatabase()
    return db.get('menu_items').sortBy(['category', 'name']).value()
  })

  ipcMain.handle('menu:update', (_, { id, changes }) => {
    const db = getDatabase()
    const items = db.get('menu_items').value()
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) throw new Error(`Menu item ${id} not found`)

    const updated = { ...items[index], ...changes, updated_at: new Date().toISOString() }
    items[index] = updated
    db.set('menu_items', items).write()
    return updated
  })

  ipcMain.handle('menu:toggleStock', (_, { id }) => {
    const db = getDatabase()
    const items = db.get('menu_items').value()
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) throw new Error(`Menu item ${id} not found`)

    const currentInStock = items[index].in_stock ?? 1
    const updated = { ...items[index], in_stock: currentInStock === 1 ? 0 : 1 }
    items[index] = updated
    db.set('menu_items', items).write()
    return updated
  })

  ipcMain.handle('menu:uploadImage', async (_, { categoryFolder, filename, buffer }) => {
    try {
      // Save to a writable public directory that the local HTTP server serves.
      const publicDir = join(app.getPath('userData'), 'public', 'menu', categoryFolder)
      await mkdir(publicDir, { recursive: true })

      // Always use a timestamp-based unique filename so URLs are never stale-cached.
      const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '.jpg'
      const uniqueName = `${Date.now()}${ext}`
      const filePath = join(publicDir, uniqueName)
      await writeFile(filePath, Buffer.from(buffer))

      // Return the relative path that will be served by Express
      return `/menu/${categoryFolder}/${uniqueName}`
    } catch (err) {
      console.error('[IPC] menu:uploadImage error:', err)
      throw err
    }
  })

  ipcMain.handle('menu:create', (_, { category, name, price, image_path }) => {
    const db = getDatabase()
    const items = db.get('menu_items').value()
    
    if (!name || name.trim() === '') throw new Error('Name is required')
    if (price === undefined || price === null) throw new Error('Price is required')
    if (price < 0) throw new Error('Price cannot be negative')
    if (!category || category.trim() === '') throw new Error('Category is required')
    
    // Get next ID (max existing + 1)
    const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0)
    const newId = maxId + 1
    
    const now = new Date().toISOString()
    const newItem = {
      id: newId,
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
      image_path: image_path || '🍽️',
      in_stock: 1,
      created_at: now,
      updated_at: now,
    }
    
    items.push(newItem)
    db.set('menu_items', items).write()
    return newItem
  })

  ipcMain.handle('menu:delete', (_, { id }) => {
    const db = getDatabase()
    const items = db.get('menu_items').value()
    const index = items.findIndex((item) => item.id === id)

    if (index === -1) throw new Error(`Menu item ${id} not found`)

    const [deletedItem] = items.splice(index, 1)
    db.set('menu_items', items).write()
    return deletedItem
  })
}

export { registerMenuHandlers }
