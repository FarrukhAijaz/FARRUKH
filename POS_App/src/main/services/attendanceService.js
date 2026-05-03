import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { getBusinessDate } from '../db/index.js'

const DEFAULT_CHALLENGE_TTL_SECONDS = 45

function hashPin(pin) {
  return createHash('sha256').update(String(pin)).digest('hex')
}

function compareHash(expected, input) {
  const expectedBuffer = Buffer.from(expected, 'hex')
  const inputBuffer = Buffer.from(hashPin(input), 'hex')

  if (expectedBuffer.length !== inputBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, inputBuffer)
}

function nextCounter(db, key) {
  const currentValue = db.get(`_counters.${key}`).value() || 0
  const nextValue = currentValue + 1
  db.set(`_counters.${key}`, nextValue).write()
  return nextValue
}

function nowIso() {
  return new Date().toISOString()
}

function getAttendanceSettings(db) {
  const settings = db.get('settings').value() || {}
  const rawPrefixes = settings.attendance_allowed_subnet_prefixes
  const subnetPrefixes = Array.isArray(rawPrefixes)
    ? rawPrefixes
    : typeof rawPrefixes === 'string' && rawPrefixes.trim().length > 0
      ? rawPrefixes.split(',').map((part) => part.trim()).filter(Boolean)
      : []

  return {
    challengeTtlSeconds: Number(settings.attendance_challenge_ttl_seconds) || DEFAULT_CHALLENGE_TTL_SECONDS,
    subnetPrefixes,
    requireSelfie: settings.attendance_require_selfie === 'true'
  }
}

function sanitizeStaff(staff) {
  if (!staff) return null

  return {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    active: staff.active,
    is_manager: Boolean(staff.is_manager),
    phone_label: staff.phone_label || '',
    shift_start: staff.shift_start || '',
    shift_end: staff.shift_end || '',
    enrolled_device_id: staff.enrolled_device_id || null,
    created_at: staff.created_at,
    updated_at: staff.updated_at,
    last_check_in_at: staff.last_check_in_at || null,
    last_check_out_at: staff.last_check_out_at || null
  }
}

function sanitizeEnrollment(enrollment) {
  if (!enrollment) return null

  return {
    id: enrollment.id,
    staff_id: enrollment.staff_id,
    device_label: enrollment.device_label,
    device_token: enrollment.device_token,
    active: enrollment.active,
    approved_at: enrollment.approved_at,
    revoked_at: enrollment.revoked_at || null,
    last_seen_at: enrollment.last_seen_at || null,
    created_at: enrollment.created_at,
    updated_at: enrollment.updated_at,
    network_fingerprint: enrollment.network_fingerprint || null
  }
}

function sanitizeChallenge(challenge) {
  if (!challenge) return null

  return {
    id: challenge.id,
    code: challenge.code,
    staff_id: challenge.staff_id || null,
    purpose: challenge.purpose,
    expires_at: challenge.expires_at,
    consumed_at: challenge.consumed_at || null,
    created_at: challenge.created_at,
    network_fingerprint: challenge.network_fingerprint || null
  }
}

function sanitizeEvent(event) {
  if (!event) return null

  return {
    id: event.id,
    staff_id: event.staff_id,
    type: event.type,
    status: event.status,
    business_date: event.business_date,
    timestamp: event.timestamp,
    verification_method: event.verification_method,
    device_enrollment_id: event.device_enrollment_id || null,
    challenge_id: event.challenge_id || null,
    network_fingerprint: event.network_fingerprint || null,
    exception_reason: event.exception_reason || '',
    notes: event.notes || '',
    created_by: event.created_by,
    approved_by: event.approved_by || null,
    created_at: event.created_at,
    corrected_event_id: event.corrected_event_id || null
  }
}

function logAudit(db, payload) {
  const timestamp = nowIso()
  const id = nextCounter(db, 'attendance_audit')
  const record = {
    id,
    timestamp,
    ...payload
  }
  db.get('attendance_audit').push(record).write()
  return record
}

function listStaff(db) {
  const staffMembers = db.get('staff').sortBy('name').value()
  const enrollments = db.get('device_enrollments').value()
  return staffMembers.map((staff) => {
    const enrollment = enrollments.find((item) => item.id === staff.enrolled_device_id && item.active)
    return {
      ...sanitizeStaff(staff),
      enrollment: sanitizeEnrollment(enrollment)
    }
  })
}

function createStaff(db, payload, actor = 'desktop') {
  const name = String(payload.name || '').trim()
  const role = String(payload.role || '').trim()
  const pin = String(payload.pin || '').trim()

  if (!name) throw new Error('Staff name is required')
  if (!role) throw new Error('Staff role is required')
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4 to 8 digits')

  const timestamp = nowIso()
  const id = nextCounter(db, 'staff')
  const staff = {
    id,
    name,
    role,
    active: payload.active !== false,
    is_manager: Boolean(payload.is_manager),
    phone_label: String(payload.phone_label || '').trim(),
    shift_start: String(payload.shift_start || '').trim(),
    shift_end: String(payload.shift_end || '').trim(),
    pin_hash: hashPin(pin),
    enrolled_device_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    last_check_in_at: null,
    last_check_out_at: null
  }

  db.get('staff').push(staff).write()
  logAudit(db, {
    action: 'staff.created',
    actor,
    staff_id: id,
    metadata: { role: staff.role, is_manager: staff.is_manager }
  })

  return sanitizeStaff(staff)
}

function updateStaff(db, staffId, payload, actor = 'desktop') {
  const staff = db.get('staff').find({ id: staffId }).value()
  if (!staff) throw new Error('Staff member not found')

  const updates = {
    updated_at: nowIso()
  }

  if (payload.name !== undefined) {
    const name = String(payload.name).trim()
    if (!name) throw new Error('Staff name is required')
    updates.name = name
  }

  if (payload.role !== undefined) {
    const role = String(payload.role).trim()
    if (!role) throw new Error('Staff role is required')
    updates.role = role
  }

  if (payload.phone_label !== undefined) {
    updates.phone_label = String(payload.phone_label || '').trim()
  }

  if (payload.shift_start !== undefined) {
    updates.shift_start = String(payload.shift_start || '').trim()
  }

  if (payload.shift_end !== undefined) {
    updates.shift_end = String(payload.shift_end || '').trim()
  }

  if (payload.active !== undefined) {
    updates.active = Boolean(payload.active)
  }

  if (payload.is_manager !== undefined) {
    updates.is_manager = Boolean(payload.is_manager)
  }

  if (payload.pin !== undefined) {
    const pin = String(payload.pin).trim()
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4 to 8 digits')
    updates.pin_hash = hashPin(pin)
  }

  db.get('staff').find({ id: staffId }).assign(updates).write()
  logAudit(db, {
    action: 'staff.updated',
    actor,
    staff_id: staffId,
    metadata: { fields: Object.keys(updates).filter((key) => key !== 'updated_at') }
  })

  return sanitizeStaff(db.get('staff').find({ id: staffId }).value())
}

function validateManagerPin(db, managerPin) {
  const pin = String(managerPin || '').trim()
  if (!pin) return null

  return db
    .get('staff')
    .find((staff) => Boolean(staff.is_manager) && staff.active && compareHash(staff.pin_hash, pin))
    .value() || null
}

function createChallenge(db, payload = {}, actor = 'desktop') {
  const staffId = payload.staffId ? Number(payload.staffId) : null
  if (staffId) {
    const staff = db.get('staff').find({ id: staffId }).value()
    if (!staff || !staff.active) throw new Error('Staff member is not available for attendance')
  }

  const settings = getAttendanceSettings(db)
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + settings.challengeTtlSeconds * 1000).toISOString()
  const id = nextCounter(db, 'attendance_challenges')
  const challenge = {
    id,
    code: randomBytes(12).toString('hex'),
    staff_id: staffId,
    purpose: payload.purpose || 'attendance',
    expires_at: expiresAt,
    consumed_at: null,
    created_at: createdAt,
    network_fingerprint: payload.networkFingerprint || null
  }

  db.get('attendance_challenges').push(challenge).write()
  logAudit(db, {
    action: 'attendance.challenge.created',
    actor,
    staff_id: staffId,
    metadata: { challenge_id: id, purpose: challenge.purpose }
  })

  return sanitizeChallenge(challenge)
}

function enrollDevice(db, payload, actor = 'desktop') {
  const staffId = Number(payload.staffId)
  const staff = db.get('staff').find({ id: staffId }).value()
  if (!staff) throw new Error('Staff member not found')
  if (!staff.active) throw new Error('Staff member is inactive')

  const manager = validateManagerPin(db, payload.managerPin)
  if (!manager) throw new Error('Manager PIN is required to approve device enrollment')

  const deviceLabel = String(payload.deviceLabel || '').trim()
  if (!deviceLabel) throw new Error('Device label is required')

  const timestamp = nowIso()
  const existingEnrollmentId = staff.enrolled_device_id
  if (existingEnrollmentId) {
    db.get('device_enrollments')
      .find({ id: existingEnrollmentId })
      .assign({ active: false, revoked_at: timestamp, updated_at: timestamp })
      .write()
  }

  const id = nextCounter(db, 'device_enrollments')
  const enrollment = {
    id,
    staff_id: staffId,
    device_label: deviceLabel,
    device_token: randomBytes(20).toString('hex'),
    active: true,
    approved_at: timestamp,
    revoked_at: null,
    last_seen_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    network_fingerprint: payload.networkFingerprint || null
  }

  db.get('device_enrollments').push(enrollment).write()
  db.get('staff')
    .find({ id: staffId })
    .assign({ enrolled_device_id: id, updated_at: timestamp })
    .write()

  logAudit(db, {
    action: 'attendance.device.enrolled',
    actor,
    staff_id: staffId,
    metadata: {
      device_enrollment_id: id,
      device_label: deviceLabel,
      approved_by: manager.id
    }
  })

  return sanitizeEnrollment(enrollment)
}

function assertNetworkAllowed(settings, networkFingerprint) {
  if (!settings.subnetPrefixes.length) return true
  if (!networkFingerprint) return false
  return settings.subnetPrefixes.some((prefix) => networkFingerprint.startsWith(prefix))
}

function getOpenAttendanceEvent(db, staffId) {
  return db
    .get('attendance_events')
    .findLast((event) => event.staff_id === staffId && event.type === 'check_in' && event.status === 'open')
    .value() || null
}

function markCheckIn(db, payload, actor = 'desktop') {
  const staffId = Number(payload.staffId)
  const staff = db.get('staff').find({ id: staffId }).value()
  if (!staff) throw new Error('Staff member not found')
  if (!staff.active) throw new Error('Staff member is inactive')

  if (getOpenAttendanceEvent(db, staffId)) {
    throw new Error('Staff member is already checked in')
  }

  const timestamp = nowIso()
  const id = nextCounter(db, 'attendance_events')
  const event = {
    id,
    staff_id: staffId,
    type: 'check_in',
    status: 'open',
    business_date: getBusinessDate(),
    timestamp,
    verification_method: payload.verificationMethod || 'desktop_manual',
    device_enrollment_id: payload.deviceEnrollmentId || null,
    challenge_id: payload.challengeId || null,
    network_fingerprint: payload.networkFingerprint || null,
    exception_reason: String(payload.exceptionReason || ''),
    notes: String(payload.notes || ''),
    created_by: actor,
    approved_by: payload.approvedBy || null,
    created_at: timestamp,
    corrected_event_id: null
  }

  db.get('attendance_events').push(event).write()
  db.get('staff').find({ id: staffId }).assign({ last_check_in_at: timestamp, updated_at: timestamp }).write()
  logAudit(db, {
    action: 'attendance.check_in',
    actor,
    staff_id: staffId,
    metadata: { event_id: id, verification_method: event.verification_method }
  })
  return sanitizeEvent(event)
}

function markCheckOut(db, payload, actor = 'desktop') {
  const staffId = Number(payload.staffId)
  const staff = db.get('staff').find({ id: staffId }).value()
  if (!staff) throw new Error('Staff member not found')

  const openEvent = getOpenAttendanceEvent(db, staffId)
  if (!openEvent) throw new Error('Staff member is not currently checked in')

  const timestamp = nowIso()
  db.get('attendance_events')
    .find({ id: openEvent.id })
    .assign({ status: 'closed', updated_at: timestamp })
    .write()

  const id = nextCounter(db, 'attendance_events')
  const event = {
    id,
    staff_id: staffId,
    type: 'check_out',
    status: 'closed',
    business_date: getBusinessDate(),
    timestamp,
    verification_method: payload.verificationMethod || 'desktop_manual',
    device_enrollment_id: payload.deviceEnrollmentId || openEvent.device_enrollment_id || null,
    challenge_id: payload.challengeId || null,
    network_fingerprint: payload.networkFingerprint || null,
    exception_reason: String(payload.exceptionReason || ''),
    notes: String(payload.notes || ''),
    created_by: actor,
    approved_by: payload.approvedBy || null,
    created_at: timestamp,
    corrected_event_id: openEvent.id
  }

  db.get('attendance_events').push(event).write()
  db.get('staff').find({ id: staffId }).assign({ last_check_out_at: timestamp, updated_at: timestamp }).write()
  logAudit(db, {
    action: 'attendance.check_out',
    actor,
    staff_id: staffId,
    metadata: { event_id: id, opened_event_id: openEvent.id, verification_method: event.verification_method }
  })
  return sanitizeEvent(event)
}

function verifyChallenge(db, payload) {
  const code = String(payload.challengeCode || '').trim()
  const pin = String(payload.pin || '').trim()
  const deviceToken = String(payload.deviceToken || '').trim()
  const networkFingerprint = String(payload.networkFingerprint || '').trim() || null
  const type = payload.type === 'check_out' ? 'check_out' : 'check_in'

  if (!code || !pin || !deviceToken) {
    throw new Error('challengeCode, pin, and deviceToken are required')
  }

  const challenge = db.get('attendance_challenges').find({ code }).value()
  if (!challenge) throw new Error('Challenge not found')
  if (challenge.consumed_at) throw new Error('Challenge already used')
  if (new Date(challenge.expires_at).getTime() < Date.now()) throw new Error('Challenge expired')

  const enrollment = db.get('device_enrollments').find({ device_token: deviceToken, active: true }).value()
  if (!enrollment) throw new Error('Device enrollment not found')

  const staff = db.get('staff').find({ id: enrollment.staff_id }).value()
  if (!staff || !staff.active) throw new Error('Staff member is not available')
  if (challenge.staff_id && challenge.staff_id !== staff.id) throw new Error('Challenge is not valid for this staff member')
  if (!compareHash(staff.pin_hash, pin)) throw new Error('Invalid PIN')

  const settings = getAttendanceSettings(db)
  if (!assertNetworkAllowed(settings, networkFingerprint)) {
    throw new Error('Device is not on an allowed network')
  }

  const timestamp = nowIso()
  db.get('attendance_challenges').find({ id: challenge.id }).assign({ consumed_at: timestamp }).write()
  db.get('device_enrollments').find({ id: enrollment.id }).assign({ last_seen_at: timestamp, updated_at: timestamp, network_fingerprint: networkFingerprint }).write()

  const actor = `mobile:${enrollment.device_label}`
  const result = type === 'check_out'
    ? markCheckOut(db, {
        staffId: staff.id,
        verificationMethod: 'qr_phone',
        challengeId: challenge.id,
        deviceEnrollmentId: enrollment.id,
        networkFingerprint
      }, actor)
    : markCheckIn(db, {
        staffId: staff.id,
        verificationMethod: 'qr_phone',
        challengeId: challenge.id,
        deviceEnrollmentId: enrollment.id,
        networkFingerprint
      }, actor)

  return {
    staff: sanitizeStaff(staff),
    event: result,
    challenge: sanitizeChallenge(db.get('attendance_challenges').find({ id: challenge.id }).value())
  }
}

function createManualEvent(db, payload) {
  const type = payload.type === 'check_out' ? 'check_out' : 'check_in'
  if (!payload.managerPin) throw new Error('Manager PIN is required for manual attendance edits')
  const manager = validateManagerPin(db, payload.managerPin)
  if (!manager) throw new Error('Manager PIN is invalid')

  if (type === 'check_out') {
    return markCheckOut(db, {
      staffId: payload.staffId,
      verificationMethod: 'manager_override',
      exceptionReason: payload.exceptionReason || 'Manual manager check-out',
      notes: payload.notes || '',
      approvedBy: manager.id
    }, `manager:${manager.id}`)
  }

  return markCheckIn(db, {
    staffId: payload.staffId,
    verificationMethod: 'manager_override',
    exceptionReason: payload.exceptionReason || 'Manual manager check-in',
    notes: payload.notes || '',
    approvedBy: manager.id
  }, `manager:${manager.id}`)
}

function getAttendanceSnapshot(db, businessDate = getBusinessDate()) {
  const staffList = listStaff(db)
  const events = db.get('attendance_events').filter({ business_date: businessDate }).sortBy('timestamp').value()
  const audit = db.get('attendance_audit').sortBy('timestamp').takeRight(50).value().reverse()

  const byStaff = staffList.map((staff) => {
    const staffEvents = events.filter((event) => event.staff_id === staff.id)
    const latestCheckIn = [...staffEvents].reverse().find((event) => event.type === 'check_in') || null
    const latestCheckOut = [...staffEvents].reverse().find((event) => event.type === 'check_out') || null
    const isCheckedIn = Boolean(latestCheckIn) && (!latestCheckOut || latestCheckIn.timestamp > latestCheckOut.timestamp)

    return {
      staff,
      isCheckedIn,
      latestCheckIn: sanitizeEvent(latestCheckIn),
      latestCheckOut: sanitizeEvent(latestCheckOut),
      events: staffEvents.map(sanitizeEvent)
    }
  })

  return {
    businessDate,
    staff: staffList,
    records: byStaff,
    challenges: db.get('attendance_challenges').sortBy('created_at').takeRight(10).value().reverse().map(sanitizeChallenge),
    audit
  }
}

export {
  createChallenge,
  createManualEvent,
  createStaff,
  enrollDevice,
  getAttendanceSettings,
  getAttendanceSnapshot,
  hashPin,
  listStaff,
  sanitizeEnrollment,
  sanitizeEvent,
  sanitizeStaff,
  updateStaff,
  validateManagerPin,
  verifyChallenge
}