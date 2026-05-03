import { create } from 'zustand'

function getTodayBusinessDate() {
  const now = new Date()
  const date = now.getHours() < 2 ? new Date(now.getTime() - 86400000) : now

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

const useAttendanceStore = create((set, get) => ({
  snapshot: null,
  connectionInfo: null,
  selectedDate: getTodayBusinessDate(),
  loading: false,
  error: '',

  loadSnapshot: async (businessDate = get().selectedDate) => {
    set({ loading: true, error: '', selectedDate: businessDate })
    try {
      const snapshot = await window.api.attendance.getSnapshot(businessDate)
      set({ snapshot, loading: false })
      return snapshot
    } catch (error) {
      set({ error: error.message || 'Failed to load attendance', loading: false })
      throw error
    }
  },

  loadConnectionInfo: async () => {
    const connectionInfo = await window.api.attendance.getConnectionInfo()
    set({ connectionInfo })
    return connectionInfo
  },

  createStaff: async (payload) => {
    await window.api.attendance.createStaff(payload)
    return get().loadSnapshot()
  },

  updateStaff: async (staffId, updates) => {
    await window.api.attendance.updateStaff(staffId, updates)
    return get().loadSnapshot()
  },

  enrollDevice: async (payload) => {
    const enrollment = await window.api.attendance.enrollDevice(payload)
    await get().loadSnapshot()
    return enrollment
  },

  createChallenge: async (payload) => {
    const challenge = await window.api.attendance.createChallenge(payload)
    await get().loadSnapshot()
    return challenge
  },

  createManualEvent: async (payload) => {
    const event = await window.api.attendance.createManualEvent(payload)
    await get().loadSnapshot()
    return event
  }
}))

export default useAttendanceStore
