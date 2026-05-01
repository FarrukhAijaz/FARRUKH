import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  tables: {
    getAll: () => ipcRenderer.invoke('table:getAll'),
    updateStatus: (id, status) => ipcRenderer.invoke('table:updateStatus', { id, status }),
    assignOrder: (tableId, orderId) =>
      ipcRenderer.invoke('table:assignOrder', { tableId, orderId }),
    clearOrder: (tableId) => ipcRenderer.invoke('table:clearOrder', { tableId })
  },
  menu: {
    getAll: () => ipcRenderer.invoke('menu:getAll')
  },
  orders: {
    create: (tableId, channel, orderType, customerRef) =>
      ipcRenderer.invoke('order:create', { tableId, channel, orderType, customerRef }),
    getByTable: (tableId) => ipcRenderer.invoke('order:getByTable', { tableId }),
    getByChannel: (channel) => ipcRenderer.invoke('order:getByChannel', { channel }),
    updateRef: (orderId, customerRef) => ipcRenderer.invoke('order:updateRef', { orderId, customerRef }),
    updateItems: (orderId, items, specialInstructions) =>
      ipcRenderer.invoke('order:updateItems', { orderId, items, specialInstructions }),
    setFlag: (orderId, flag) =>
      ipcRenderer.invoke('order:setFlag', { orderId, flag }),
    checkout: (orderId, tableId, paymentMethod, cashReceived, changeGiven, discountType, discountValue) =>
      ipcRenderer.invoke('order:checkout', { orderId, tableId, paymentMethod, cashReceived, changeGiven, discountType, discountValue }),
    cancel: (orderId, tableId) =>
      ipcRenderer.invoke('order:cancel', { orderId, tableId })
  },
  printer: {
    printKitchen: (orderId, tableId) =>
      ipcRenderer.invoke('printer:printKitchen', { orderId, tableId }),
    printBill: (orderId, tableId) =>
      ipcRenderer.invoke('printer:printBill', { orderId, tableId })
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', { key }),
    set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },
  payments: {
    getDailyReport: (date) => ipcRenderer.invoke('payment:getDailyReport', { date }),
    listDates: () => ipcRenderer.invoke('payment:listDates')
  },
  events: {
    onOrderPushed: (cb) => ipcRenderer.on('order:pushed', (_, data) => cb(data))
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
