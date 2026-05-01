import { ipcMain } from 'electron'
import { getDatabase } from '../db/index.js'
import { printKitchenReceipt, printInterimBill } from '../services/printerService.js'

function getPrinterConfig(db) {
  const settings = db.get('settings').value()
  return {
    mock: settings.printer_mock ?? 'true',
    type: settings.printer_type ?? 'network',
    interface: settings.printer_interface ?? '127.0.0.1:9100'
  }
}

function registerPrinterHandlers() {
  ipcMain.handle('printer:printKitchen', async (_, { orderId, tableId }) => {
    const db = getDatabase()
    const order = db.get('orders').find({ id: orderId }).value()
    const table = db.get('tables').find({ id: tableId }).value()
    const config = getPrinterConfig(db)
    return printKitchenReceipt(order, table, config)
  })

  ipcMain.handle('printer:printBill', async (_, { orderId, tableId }) => {
    const db = getDatabase()
    const order = db.get('orders').find({ id: orderId }).value()
    const table = db.get('tables').find({ id: tableId }).value()
    const config = getPrinterConfig(db)
    return printInterimBill(order, table, config)
  })
}

export { registerPrinterHandlers }
