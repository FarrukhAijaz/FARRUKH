import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { ArrowLeft, QrCode, ShieldCheck, Smartphone, UserPlus, Clock3 } from 'lucide-react'
import QRCode from 'qrcode'
import useAttendanceStore from '../../store/useAttendanceStore'

function formatTimestamp(value) {
  if (!value) return 'Not recorded'
  return new Date(value).toLocaleString()
}

function AttendanceAdmin({ onBack }) {
  const {
    snapshot,
    connectionInfo,
    selectedDate,
    loading,
    error,
    loadConnectionInfo,
    loadSnapshot,
    createStaff,
    enrollDevice,
    createChallenge,
    createManualEvent
  } = useAttendanceStore()
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: '',
    pin: '',
    phone_label: '',
    shift_start: '',
    shift_end: '',
    is_manager: false
  })
  const [deviceDrafts, setDeviceDrafts] = useState({})
  const [managerPins, setManagerPins] = useState({})
  const [activeChallenge, setActiveChallenge] = useState(null)
  const [challengeQrDataUrl, setChallengeQrDataUrl] = useState('')
  const [busyAction, setBusyAction] = useState('')

  useEffect(() => {
    loadSnapshot(selectedDate)
  }, [loadSnapshot, selectedDate])

  useEffect(() => {
    loadConnectionInfo()
  }, [loadConnectionInfo])

  useEffect(() => {
    let active = true

    async function generateQr() {
      if (!activeChallenge?.code) {
        if (active) setChallengeQrDataUrl('')
        return
      }

      const baseUrl = connectionInfo?.urls?.[0]
      const payload = baseUrl
        ? `${baseUrl}/attendance/?challenge=${encodeURIComponent(activeChallenge.code)}`
        : JSON.stringify({ challengeCode: activeChallenge.code })
      const qrDataUrl = await QRCode.toDataURL(payload, {
        margin: 1,
        width: 220,
        color: {
          dark: '#1f2c28',
          light: '#fffdf8'
        }
      })

      if (active) {
        setChallengeQrDataUrl(qrDataUrl)
      }
    }

    generateQr()

    return () => {
      active = false
    }
  }, [activeChallenge, connectionInfo])

  const sortedRecords = useMemo(() => {
    return [...(snapshot?.records || [])].sort((left, right) =>
      left.staff.name.localeCompare(right.staff.name)
    )
  }, [snapshot])

  const handleStaffSubmit = async (event) => {
    event.preventDefault()
    setBusyAction('staff')
    try {
      await createStaff(staffForm)
      setStaffForm({
        name: '',
        role: '',
        pin: '',
        phone_label: '',
        shift_start: '',
        shift_end: '',
        is_manager: false
      })
    } finally {
      setBusyAction('')
    }
  }

  const handleEnroll = async (staffId) => {
    const deviceLabel = String(deviceDrafts[staffId] || '').trim()
    const managerPin = String(managerPins[staffId] || '').trim()
    if (!deviceLabel || !managerPin) return
    setBusyAction(`enroll:${staffId}`)
    try {
      await enrollDevice({ staffId, deviceLabel, managerPin })
      setDeviceDrafts((state) => ({ ...state, [staffId]: '' }))
      setManagerPins((state) => ({ ...state, [staffId]: '' }))
    } finally {
      setBusyAction('')
    }
  }

  const handleManualEvent = async (staffId, type) => {
    const managerPin = String(managerPins[staffId] || '').trim()
    if (!managerPin) return
    setBusyAction(`${type}:${staffId}`)
    try {
      await createManualEvent({
        staffId,
        type,
        managerPin,
        exceptionReason:
          type === 'check_in' ? 'Manual desktop check-in' : 'Manual desktop check-out'
      })
      setManagerPins((state) => ({ ...state, [staffId]: '' }))
    } finally {
      setBusyAction('')
    }
  }

  const handleCreateChallenge = async () => {
    setBusyAction('challenge')
    try {
      const challenge = await createChallenge({ purpose: 'attendance' })
      setActiveChallenge(challenge)
    } finally {
      setBusyAction('')
    }
  }

  const handleDevClearAttendance = async () => {
    if (!window.confirm('Clear all attendance events, enrollments and audit logs? Staff records are kept.')) return
    setBusyAction('dev-clear')
    try {
      await window.api.attendance.devClearAttendanceData()
      setActiveChallenge(null)
      setChallengeQrDataUrl('')
      await loadSnapshot(selectedDate)
    } finally {
      setBusyAction('')
    }
  }

  const handleDevResetStaff = async () => {
    if (!window.confirm('Wipe ALL staff and attendance data? Restart the app to re-seed the 5 default staff members.')) return
    setBusyAction('dev-reset')
    try {
      await window.api.attendance.devResetStaff()
      setActiveChallenge(null)
      setChallengeQrDataUrl('')
      await loadSnapshot(selectedDate)
      window.alert('Done. Restart the app to re-seed staff.')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="flex h-full flex-col bg-cream-100">
      <div className="flex items-center gap-4 border-b border-ink-100/20 bg-ink-300 px-6 py-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-cream-300 transition-colors hover:text-cream-50"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="h-5 w-px bg-cream-100/10" />
        <ShieldCheck size={18} className="text-forest-400" />
        <h1 className="text-base font-bold text-cream-100">Attendance Control</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink-300">Today&apos;s Staff Board</h2>
                  <p className="text-sm text-ink-200">
                    Business date {selectedDate}. Manual edits require a manager PIN.
                  </p>
                </div>
                <button
                  onClick={() => loadSnapshot(selectedDate)}
                  className="rounded-lg border border-cream-300 px-3 py-2 text-sm font-semibold text-ink-300 transition-colors hover:bg-cream-100"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-sm text-ink-200">Loading attendance…</div>
              ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedRecords.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-cream-300 px-4 py-8 text-center text-sm text-ink-200">
                      No staff configured yet.
                    </div>
                  ) : (
                    sortedRecords.map((record) => (
                      <article
                        key={record.staff.id}
                        className="rounded-xl border border-cream-200 bg-cream-50 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-ink-300">
                                {record.staff.name}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${record.isCheckedIn ? 'bg-forest-600 text-cream-50' : 'bg-cream-200 text-ink-200'}`}
                              >
                                {record.isCheckedIn ? 'Checked In' : 'Checked Out'}
                              </span>
                              {record.staff.is_manager && (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                  Manager
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-ink-200">{record.staff.role}</p>
                            <div className="mt-3 grid gap-1 text-xs text-ink-200 sm:grid-cols-2">
                              <span>
                                Last in: {formatTimestamp(record.latestCheckIn?.timestamp)}
                              </span>
                              <span>
                                Last out: {formatTimestamp(record.latestCheckOut?.timestamp)}
                              </span>
                              <span>Phone: {record.staff.phone_label || 'Not set'}</span>
                              <span>
                                Device: {record.staff.enrollment?.device_label || 'Not enrolled'}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:w-[360px]">
                            <input
                              value={deviceDrafts[record.staff.id] || ''}
                              onChange={(event) =>
                                setDeviceDrafts((state) => ({
                                  ...state,
                                  [record.staff.id]: event.target.value
                                }))
                              }
                              placeholder="Device label, e.g. Adeel iPhone"
                              className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-300 outline-none transition-colors focus:border-forest-500"
                            />
                            <button
                              onClick={() => handleEnroll(record.staff.id)}
                              disabled={busyAction === `enroll:${record.staff.id}`}
                              className="rounded-lg bg-ink-300 px-3 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-200 disabled:opacity-60"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Smartphone size={14} /> Enroll
                              </span>
                            </button>
                            <input
                              type="password"
                              value={managerPins[record.staff.id] || ''}
                              onChange={(event) =>
                                setManagerPins((state) => ({
                                  ...state,
                                  [record.staff.id]: event.target.value
                                }))
                              }
                              placeholder="Manager PIN for enroll or override"
                              className="rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-ink-300 outline-none transition-colors focus:border-forest-500 sm:col-span-2"
                            />
                            <button
                              onClick={() => handleManualEvent(record.staff.id, 'check_in')}
                              disabled={busyAction === `check_in:${record.staff.id}`}
                              className="rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-60"
                            >
                              Manual Check-In
                            </button>
                            <button
                              onClick={() => handleManualEvent(record.staff.id, 'check_out')}
                              disabled={busyAction === `check_out:${record.staff.id}`}
                              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-ink-300 transition-colors hover:bg-amber-400 disabled:opacity-60"
                            >
                              Manual Check-Out
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={16} className="text-forest-600" />
                <h2 className="text-base font-bold text-ink-300">Recent Audit</h2>
              </div>
              <div className="space-y-2 text-sm text-ink-200">
                {(snapshot?.audit || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-cream-300 px-4 py-6 text-center">
                    No audit entries yet.
                  </div>
                ) : (
                  snapshot.audit.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3"
                    >
                      <div className="font-semibold text-ink-300">{entry.action}</div>
                      <div>{formatTimestamp(entry.timestamp)}</div>
                      <div>Actor: {entry.actor}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-forest-600" />
                <h2 className="text-base font-bold text-ink-300">Add Staff Member</h2>
              </div>
              <form className="space-y-3" onSubmit={handleStaffSubmit}>
                <input
                  value={staffForm.name}
                  onChange={(event) =>
                    setStaffForm((state) => ({ ...state, name: event.target.value }))
                  }
                  placeholder="Full name"
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-300 outline-none focus:border-forest-500"
                />
                <input
                  value={staffForm.role}
                  onChange={(event) =>
                    setStaffForm((state) => ({ ...state, role: event.target.value }))
                  }
                  placeholder="Role, e.g. waiter"
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-300 outline-none focus:border-forest-500"
                />
                <input
                  type="password"
                  value={staffForm.pin}
                  onChange={(event) =>
                    setStaffForm((state) => ({ ...state, pin: event.target.value }))
                  }
                  placeholder="PIN (4-8 digits)"
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-300 outline-none focus:border-forest-500"
                />
                <input
                  value={staffForm.phone_label}
                  onChange={(event) =>
                    setStaffForm((state) => ({ ...state, phone_label: event.target.value }))
                  }
                  placeholder="Phone label"
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-300 outline-none focus:border-forest-500"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={staffForm.shift_start}
                    onChange={(event) =>
                      setStaffForm((state) => ({ ...state, shift_start: event.target.value }))
                    }
                    placeholder="Shift start e.g. 09:00"
                    className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-300 outline-none focus:border-forest-500"
                  />
                  <input
                    value={staffForm.shift_end}
                    onChange={(event) =>
                      setStaffForm((state) => ({ ...state, shift_end: event.target.value }))
                    }
                    placeholder="Shift end e.g. 18:00"
                    className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-ink-300 outline-none focus:border-forest-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <input
                    type="checkbox"
                    checked={staffForm.is_manager}
                    onChange={(event) =>
                      setStaffForm((state) => ({ ...state, is_manager: event.target.checked }))
                    }
                  />
                  This staff member can approve manual corrections
                </label>
                <button
                  type="submit"
                  disabled={busyAction === 'staff'}
                  className="w-full rounded-lg bg-forest-600 px-3 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-60"
                >
                  Save Staff Member
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <QrCode size={16} className="text-forest-600" />
                <h2 className="text-base font-bold text-ink-300">Phone Check-In Challenge</h2>
              </div>
              <p className="mb-4 text-sm text-ink-200">
                Show this one-time code on the POS. Staff must use their enrolled phone on the same
                network with their PIN.
              </p>
              {connectionInfo?.urls?.length > 0 && (
                <p className="mb-4 rounded-xl bg-cream-50 px-3 py-2 text-xs text-ink-200">
                  Staff phone URL: {connectionInfo.urls[0]}/attendance/
                </p>
              )}
              <button
                onClick={handleCreateChallenge}
                disabled={busyAction === 'challenge'}
                className="w-full rounded-lg bg-ink-300 px-3 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-ink-200 disabled:opacity-60"
              >
                Generate Check-In QR Code
              </button>
              <div className="mt-4 rounded-xl border border-dashed border-cream-300 bg-cream-50 px-4 py-6 text-center">
                {activeChallenge ? (
                  <>
                    {challengeQrDataUrl && (
                      <img
                        src={challengeQrDataUrl}
                        alt="Attendance challenge QR code"
                        className="mx-auto mb-4 h-52 w-52 rounded-xl border border-cream-300 bg-white p-3"
                      />
                    )}
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-200">
                      Challenge Code
                    </div>
                    <div className="mt-2 break-all text-xl font-black text-ink-300">
                      {activeChallenge.code}
                    </div>
                    <div className="mt-2 text-sm text-ink-200">
                      Expires at {formatTimestamp(activeChallenge.expires_at)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-ink-200">No active challenge generated yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold text-rose-700">Dev / Testing Tools</h2>
              <p className="mb-4 text-xs text-rose-600">
                Only use these during setup or testing. Production data will be permanently deleted.
              </p>
              <div className="grid gap-2">
                <button
                  onClick={handleDevClearAttendance}
                  disabled={!!busyAction}
                  className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
                >
                  Clear attendance data (keep staff)
                </button>
                <button
                  onClick={handleDevResetStaff}
                  disabled={!!busyAction}
                  className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                >
                  Reset all staff + attendance (re-seeds on restart)
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AttendanceAdmin

AttendanceAdmin.propTypes = {
  onBack: PropTypes.func.isRequired
}
