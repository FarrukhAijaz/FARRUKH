import axios from 'axios'

let baseURL = ''

export const setBaseURL = (ip) => {
  // Accept bare IP or full URL
  baseURL = ip.startsWith('http') ? ip.replace(/\/$/, '') : `http://${ip}:3000`
}

export const getBaseURL = () => baseURL

export const fetchMenu = () => axios.get(`${baseURL}/api/menu`, { timeout: 5000 })

export const fetchTables = () =>
  axios.get(`${baseURL}/api/tables?_t=${Date.now()}`, { timeout: 5000 })

export const fetchTableOrder = (tableId) =>
  axios.get(`${baseURL}/api/tables/${tableId}/order`, { timeout: 5000 })

export const punchOrder = (tableId, items, specialInstructions = '') =>
  axios.post(
    `${baseURL}/api/order`,
    { tableId, items, specialInstructions },
    { timeout: 10000 }
  )
