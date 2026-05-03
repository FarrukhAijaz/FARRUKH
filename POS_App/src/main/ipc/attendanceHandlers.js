import { ipcMain } from 'electron'
import { getBusinessDate, getDatabase } from '../db/index.js'
import {
  createChallenge,
  createManualEvent,
  createStaff,
  enrollDevice,
  getAttendanceSnapshot,
  listStaff,
  updateStaff
} from '../services/attendanceService.js'
import { getServerUrls } from '../services/networkService.js'

const ATTENDANCE_PORT = 3000

function registerAttendanceHandlers() {
  ipcMain.handle('attendance:listStaff', () => {
    const db = getDatabase()
    return listStaff(db)
  })

  ipcMain.handle('attendance:createStaff', (_, payload) => {
    const db = getDatabase()
    return createStaff(db, payload, 'desktop')
  })

  ipcMain.handle('attendance:updateStaff', (_, { staffId, updates }) => {
    const db = getDatabase()
    return updateStaff(db, Number(staffId), updates, 'desktop')
  })

  ipcMain.handle('attendance:enrollDevice', (_, payload) => {
    const db = getDatabase()
    return enrollDevice(db, payload, 'desktop')
  })

  ipcMain.handle('attendance:createChallenge', (_, payload = {}) => {
    const db = getDatabase()
    return createChallenge(db, payload, 'desktop')
  })

  ipcMain.handle('attendance:createManualEvent', (_, payload) => {
    const db = getDatabase()
    return createManualEvent(db, payload, 'desktop')
  })

  ipcMain.handle('attendance:getSnapshot', (_, { businessDate = getBusinessDate() } = {}) => {
    const db = getDatabase()
    return getAttendanceSnapshot(db, businessDate)
  })

  ipcMain.handle('attendance:getConnectionInfo', () => {
    return {
      port: ATTENDANCE_PORT,
      urls: getServerUrls(ATTENDANCE_PORT)
    }
  })

  // Dev-only: wipe all attendance data so you can re-test from a clean state.
  // Keeps staff intact but clears events, challenges, enrollments, and audit.
  ipcMain.handle('attendance:devClearAttendanceData', () => {
    const db = getDatabase()
    db.set('attendance_events', []).write()
    db.set('attendance_challenges', []).write()
    db.set('device_enrollments', []).write()
    db.set('attendance_audit', []).write()
    db.get('staff').value().forEach((s) => {
      db.get('staff').find({ id: s.id }).assign({
        enrolled_device_id: null,
        last_check_in_at: null,
        last_check_out_at: null
      }).write()
    })
    db.set('_counters.attendance_events', 0).write()
    db.set('_counters.attendance_challenges', 0).write()
    db.set('_counters.device_enrollments', 0).write()
    db.set('_counters.attendance_audit', 0).write()
    console.log('[DEV] Attendance data cleared')
    return { success: true }
  })

  // Dev-only: wipe staff completely so the seed runs again on next restart.
  ipcMain.handle('attendance:devResetStaff', () => {
    const db = getDatabase()
    db.set('staff', []).write()
    db.set('attendance_events', []).write()
    db.set('attendance_challenges', []).write()
    db.set('device_enrollments', []).write()
    db.set('attendance_audit', []).write()
    db.set('_counters.staff', 0).write()
    db.set('_counters.attendance_events', 0).write()
    db.set('_counters.attendance_challenges', 0).write()
    db.set('_counters.device_enrollments', 0).write()
    db.set('_counters.attendance_audit', 0).write()
    console.log('[DEV] Staff and all attendance data reset. Restart the app to re-seed.')
    return { success: true, message: 'Restart the app to re-seed staff.' }
  })
}

export { registerAttendanceHandlers }