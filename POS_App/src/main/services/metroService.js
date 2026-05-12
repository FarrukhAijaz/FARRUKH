/**
 * metroService.js
 *
 * Manages the Expo Metro bundler child process so waiters can connect
 * via Expo Go without needing a separate terminal.
 *
 * Flow:
 *  1. On app start → startMetro()
 *  2. In production: waiter-mobile is bundled COMPLETE with node_modules in resources/
 *     → copy to userData on first run, or when version changes (userData is writable)
 *     → NO npm install at runtime — everything is already installed
 *  3. Spawn `npx expo start --lan --port 8081`
 *  4. Poll port 8081 to detect when Metro is ready
 *  5. stopMetro() called on app quit
 */

import { spawn } from 'child_process'
import { cpSync, existsSync, readFileSync, appendFileSync } from 'fs'
import { join } from 'path'
import { createConnection } from 'net'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

// ── File logger ───────────────────────────────────────────────────────────────
let _logPath = null
function getLogPath() {
  if (!_logPath) _logPath = join(app.getPath('userData'), 'metro-debug.log')
  return _logPath
}

function log(...args) {
  const line = `[${new Date().toISOString()}] [Metro] ${args.join(' ')}`
  console.log(line)
  try { appendFileSync(getLogPath(), line + '\n') } catch { /* non-fatal */ }
}

/** Read last N lines of the log — called via IPC from the renderer */
export function getMetroLogs(lines = 150) {
  try {
    const content = readFileSync(getLogPath(), 'utf8')
    return content.split('\n').filter(Boolean).slice(-lines).join('\n')
  } catch { return '' }
}

let metroProcess = null
let _status = 'stopped'   // 'stopped' | 'starting' | 'running' | 'error'
let _error = null
let _poller = null

// ── Public API ────────────────────────────────────────────────────────────────

export function getMetroStatus() {
  return { status: _status, error: _error }
}

export async function startMetro() {
  if (['running', 'starting'].includes(_status)) return

  log(`startMetro called | is.dev=${is.dev} | status=${_status}`)

  // Already something on port 8081?
  if (await checkPort()) {
    if (metroProcess) {
      log('Already running (our process)')
      _status = 'running'
      _error = null
      return
    }
    // Stale/zombie Metro from a previous crashed run – kill it and start fresh
    log('Stale process on port 8081 detected – killing it…')
    await killPort8081()
    await new Promise((r) => setTimeout(r, 800))
  }

  const waiterDir = await resolveWaiterDir()
  if (!waiterDir) return  // error already set inside resolveWaiterDir

  log(`Starting Metro in: ${waiterDir}`)
  spawnMetro(waiterDir)
}

export function stopMetro() {
  _status = 'stopped'
  _error = null
  clearPoller()
  if (metroProcess) {
    try { metroProcess.kill('SIGTERM') } catch {}
    metroProcess = null
  }
  // Best-effort: also kill anything still on the port (handles edge cases)
  killPort8081().catch(() => {})
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Kill whatever process is listening on port 8081.
 * Works on Linux/macOS (lsof) and Windows (netstat + taskkill).
 */
function killPort8081() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr ":8081 "') do @taskkill /F /PID %a`
      : `lsof -ti tcp:8081 2>/dev/null | xargs -r kill -9`
    const killer = spawn(
      process.platform === 'win32' ? 'cmd' : 'sh',
      [process.platform === 'win32' ? '/c' : '-c', cmd],
      { stdio: 'pipe', shell: false }
    )
    killer.on('close', () => resolve())
    killer.on('error', () => resolve())
    setTimeout(resolve, 3000) // hard timeout – don't block startup
  })
}

function checkPort() {
  return new Promise((resolve) => {
    const s = createConnection({ port: 8081, host: '127.0.0.1' })
    s.on('connect', () => { s.destroy(); resolve(true) })
    s.on('error',   () => resolve(false))
    s.setTimeout(600, () => { s.destroy(); resolve(false) })
  })
}

function clearPoller() {
  if (_poller) { clearInterval(_poller); _poller = null }
}

/**
 * In dev  → use the sibling waiter-mobile folder directly (already writable + has node_modules)
 * In prod → copy from resources/waiter-mobile (bundled with node_modules, but read-only in AppImage)
 *           to userData/waiter-mobile (always writable) — only when version changes
 */
async function resolveWaiterDir() {
  if (is.dev) {
    const devDir = join(app.getAppPath(), '..', 'waiter-mobile')
    if (!existsSync(devDir)) {
      _status = 'error'
      _error = 'waiter-mobile directory not found beside POS_App'
      log(_error)
      return null
    }
    log(`dev mode: using ${devDir}`)
    return devDir
  }

  // Production path
  const srcDir = join(process.resourcesPath, 'waiter-mobile')
  const runDir = join(app.getPath('userData'), 'waiter-mobile')

  if (!existsSync(srcDir)) {
    _status = 'error'
    _error = 'waiter-mobile not bundled (rebuild the POS app)'
    log(_error)
    return null
  }

  log(`srcDir=${srcDir}`)
  log(`runDir=${runDir}`)

  // Determine if a copy is needed
  let needsCopy = !existsSync(join(runDir, 'package.json'))
  if (!needsCopy) {
    try {
      const srcVer = JSON.parse(readFileSync(join(srcDir, 'package.json'), 'utf8')).version
      const runVer = JSON.parse(readFileSync(join(runDir, 'package.json'), 'utf8')).version
      log(`srcVer=${srcVer} runVer=${runVer}`)
      needsCopy = srcVer !== runVer
    } catch (e) { log(`version check error: ${e.message}`); needsCopy = true }
  }
  // Also re-copy if node_modules is missing from the run dir
  if (!needsCopy && !existsSync(join(runDir, 'node_modules'))) {
    log('node_modules missing from runDir — will re-copy')
    needsCopy = true
  }

  if (needsCopy) {
    log('Copying waiter-mobile (with node_modules) to userData…')
    _status = 'starting'
    try {
      cpSync(srcDir, runDir, { recursive: true, force: true })
      log(`Copy done → ${runDir}`)
    } catch (err) {
      _status = 'error'
      _error = `Failed to copy waiter-mobile: ${err.message}`
      log(_error)
      return null
    }
  }

  return runDir
}

function spawnMetro(waiterDir) {
  _status = 'starting'
  _error = null
  log(`Starting Expo Metro bundler in: ${waiterDir}`)

  const stderrLines = []

  metroProcess = spawn('npx', ['expo', 'start', '--lan', '--port', '8081'], {
    cwd: waiterDir,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, EXPO_NO_DOTENV: '1', BROWSER: 'none' }
  })

  metroProcess.stdout?.on('data', (data) => {
    const text = data.toString()
    process.stdout.write('[Metro] ' + text)
    // Write to log file so the UI can stream it
    text.split('\n').filter(Boolean).forEach((line) => {
      try { appendFileSync(getLogPath(), `[${new Date().toISOString()}] [stdout] ${line}\n`) } catch {}
    })
    // Some expo versions print "Metro waiting" or "Bundler is running"
    if (/Metro waiting|Bundler is running|Starting Metro|exp:\/\//.test(text)) {
      _status = 'running'
      clearPoller()
    }
  })

  metroProcess.stderr?.on('data', (data) => {
    const text = data.toString()
    process.stderr.write('[Metro] ' + text)
    // Write to log file so the UI can stream it
    text.split('\n').filter(Boolean).forEach((line) => {
      try { appendFileSync(getLogPath(), `[${new Date().toISOString()}] [stderr] ${line}\n`) } catch {}
    })
    // Keep last 8 lines of stderr so we can show the real error in the UI
    stderrLines.push(...text.split('\n').filter(Boolean))
    if (stderrLines.length > 8) stderrLines.splice(0, stderrLines.length - 8)
  })

  metroProcess.on('error', (err) => {
    _status = 'error'
    _error = err.code === 'ENOENT'
      ? 'npx not found — please install Node.js LTS'
      : err.message
    console.error('[Metro] process error:', _error)
    log(`Metro process error: ${_error}`)
  })

  metroProcess.on('close', (code) => {
    clearPoller()
    if (_status !== 'stopped') {
      _status = code === 0 ? 'stopped' : 'error'
      if (!_error && code !== 0) {
        const detail = stderrLines.length
          ? stderrLines.join(' | ').slice(0, 300)
          : `exit code ${code}`
        _error = detail
      }
    }
    metroProcess = null
  })

  // Port polling — reliable fallback if stdout detection misses the ready message
  _poller = setInterval(async () => {
    if (_status !== 'starting') { clearPoller(); return }
    if (await checkPort()) {
      _status = 'running'
      _error = null
      clearPoller()
      console.log('[Metro] Ready ✓')
    }
  }, 2500)

  // Give up polling after 5 minutes
  setTimeout(() => {
    if (_status === 'starting') {
      checkPort().then(up => {
        if (up) { _status = 'running'; _error = null }
        else    { _status = 'error'; _error = 'Metro took too long to start' }
      })
      clearPoller()
    }
  }, 300_000)
}
