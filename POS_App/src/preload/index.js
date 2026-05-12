import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  tables: {
    getAll: () => ipcRenderer.invoke('table:getAll'),
    updateStatus: (id, status) => ipcRenderer.invoke('table:updateStatus', { id, status }),
    assignOrder: (tableId, orderId) =>
      ipcRenderer.invoke('table:assignOrder', { tableId, orderId }),
    clearOrder: (tableId) => ipcRenderer.invoke('table:clearOrder', { tableId }),
    create: (name, image_path) => ipcRenderer.invoke('table:create', { name, image_path }),
    delete: (id) => ipcRenderer.invoke('table:delete', { id }),
    update: (id, changes) => ipcRenderer.invoke('table:update', { id, changes }),
    uploadImage: (filename, buffer) => ipcRenderer.invoke('table:uploadImage', { filename, buffer })
  },
  menu: {
    getAll: () => ipcRenderer.invoke('menu:getAll'),
    update: (id, changes) => ipcRenderer.invoke('menu:update', { id, changes }),
    toggleStock: (id) => ipcRenderer.invoke('menu:toggleStock', { id }),
    uploadImage: (categoryFolder, filename, buffer) => ipcRenderer.invoke('menu:uploadImage', { categoryFolder, filename, buffer }),
    create: (category, name, price, image_path) => ipcRenderer.invoke('menu:create', { category, name, price, image_path }),
    delete: (id) => ipcRenderer.invoke('menu:delete', { id })
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
    splitPay: (orderId, tableId, selectedItems, paymentMethod, cashReceived, changeGiven, discountType, discountValue) =>
      ipcRenderer.invoke('order:splitPay', { orderId, tableId, selectedItems, paymentMethod, cashReceived, changeGiven, discountType, discountValue }),
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
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    setSuperuserPin: (pin) => ipcRenderer.invoke('settings:setSuperuserPin', { pin }),
    verifySuperuserPin: (pin) => ipcRenderer.invoke('settings:verifySuperuserPin', { pin })
  },
  attendance: {
    listStaff: () => ipcRenderer.invoke('attendance:listStaff'),
    createStaff: (payload) => ipcRenderer.invoke('attendance:createStaff', payload),
    updateStaff: (staffId, updates) => ipcRenderer.invoke('attendance:updateStaff', { staffId, updates }),
    enrollDevice: (payload) => ipcRenderer.invoke('attendance:enrollDevice', payload),
    createChallenge: (payload) => ipcRenderer.invoke('attendance:createChallenge', payload),
    createManualEvent: (payload) => ipcRenderer.invoke('attendance:createManualEvent', payload),
    getSnapshot: (businessDate) => ipcRenderer.invoke('attendance:getSnapshot', { businessDate }),
    getConnectionInfo: () => ipcRenderer.invoke('attendance:getConnectionInfo'),
    devClearAttendanceData: () => ipcRenderer.invoke('attendance:devClearAttendanceData'),
    devResetStaff: () => ipcRenderer.invoke('attendance:devResetStaff')
  },
  payments: {
    getDailyReport: (date) => ipcRenderer.invoke('payment:getDailyReport', { date }),
    listDates: () => ipcRenderer.invoke('payment:listDates'),
    getDateRange: (startDate, endDate) => ipcRenderer.invoke('payment:getDateRange', { startDate, endDate }),
    exportCSV: (startDate, endDate) => ipcRenderer.invoke('payment:exportCSV', { startDate, endDate })
  },
  events: {
    onOrderPushed: (cb) => ipcRenderer.on('order:pushed', (_, data) => cb(data))
  },
  network: {
    getUrls: () => ipcRenderer.invoke('network:getUrls')
  },
  metro: {
    getStatus: () => ipcRenderer.invoke('metro:getStatus'),
    getLogs: () => ipcRenderer.invoke('metro:getLogs'),
    restart: () => ipcRenderer.invoke('metro:restart')
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
