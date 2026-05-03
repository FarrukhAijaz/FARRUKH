/**
 * metroService.js
 *
 * Manages the Expo Metro bundler child process so waiters can connect
 * via Expo Go without needing a separate terminal.
 *
 * Flow:
 *  1. On app start → startMetro()
 *  2. In production: source is bundled into resources/waiter-mobile (no node_modules)
 *     → copy to userData on first run (userData is always writable, even on AppImage)
 *     → run `npm install` once
 *  3. Spawn `npx expo start --lan --port 8081`
 *  4. Poll port 8081 to detect when Metro is ready
 *  5. stopMetro() called on app quit
 */

import { spawn } from 'child_process'
import { cpSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createConnection } from 'net'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

let metroProcess = null
let _status = 'stopped'   // 'stopped' | 'installing' | 'starting' | 'running' | 'error'
let _error = null
let _poller = null

// ── Public API ────────────────────────────────────────────────────────────────

export function getMetroStatus() {
  return { status: _status, error: _error }
}

export async function startMetro() {
  if (['running', 'starting', 'installing'].includes(_status)) return

  // Already something on port 8081? (user ran `npm start` manually)
  if (await checkPort()) {
    console.log('[Metro] Port 8081 already in use – marking as running')
    _status = 'running'
    _error = null
    return
  }

  const waiterDir = await resolveWaiterDir()
  if (!waiterDir) return  // error already set inside resolveWaiterDir

  const nodeModulesExist = existsSync(join(waiterDir, 'node_modules'))
  if (nodeModulesExist) {
    spawnMetro(waiterDir)
  } else {
    runNpmInstall(waiterDir)
  }
}

export function stopMetro() {
  _status = 'stopped'
  _error = null
  clearPoller()
  if (metroProcess) {
    try { metroProcess.kill('SIGTERM') } catch {}
    metroProcess = null
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

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
 * In dev  → use the sibling waiter-mobile folder directly (already writable)
 * In prod → copy from resources/waiter-mobile (read-only inside AppImage)
 *           to userData/waiter-mobile (always writable)
 */
async function resolveWaiterDir() {
  if (is.dev) {
    const devDir = join(app.getAppPath(), '..', 'waiter-mobile')
    if (!existsSync(devDir)) {
      _status = 'error'
      _error = 'waiter-mobile directory not found beside POS_App'
      return null
    }
    return devDir
  }

  // Production path
  const srcDir  = join(process.resourcesPath, 'waiter-mobile')
  const runDir  = join(app.getPath('userData'), 'waiter-mobile')

  if (!existsSync(srcDir)) {
    _status = 'error'
    _error = 'waiter-mobile not bundled (rebuild the POS app)'
    return null
  }

  // Check if we need to copy (first install, version bump, or missing required files)
  let needsCopy = !existsSync(join(runDir, 'package.json'))
  if (!needsCopy) {
    try {
      const srcVer = JSON.parse(readFileSync(join(srcDir, 'package.json'), 'utf8')).version
      const runVer = JSON.parse(readFileSync(join(runDir, 'package.json'), 'utf8')).version
      needsCopy = srcVer !== runVer
    } catch { needsCopy = true }
  }
  // Also re-copy if key config files are missing (stale copy from before they were added)
  if (!needsCopy) {
    const requiredFiles = ['metro.config.js', 'global.css', 'tailwind.config.js']
    needsCopy = requiredFiles.some((f) => !existsSync(join(runDir, f)))
    if (needsCopy) console.log('[Metro] Stale userData copy detected — re-copying...')
  }

  if (needsCopy) {
    console.log('[Metro] Copying waiter-mobile to userData...')
    try {
      const keepModules = existsSync(join(runDir, 'node_modules'))
      cpSync(srcDir, runDir, {
        recursive: true,
        force: true,
        filter: (src) => {
          // Don't overwrite existing node_modules if present (saves re-install time)
          if (src.includes('node_modules')) return !keepModules
          return true
        }
      })
      console.log('[Metro] Copy done → ', runDir)
    } catch (err) {
      _status = 'error'
      _error = `Failed to copy waiter-mobile: ${err.message}`
      return null
    }
  }

  return runDir
}

function runNpmInstall(waiterDir) {
  _status = 'installing'
  _error = null
  console.log('[Metro] npm install in:', waiterDir)

  const installer = spawn('npm', ['install', '--legacy-peer-deps'], {
    cwd: waiterDir,
    shell: true,
    stdio: 'pipe'
  })

  installer.stdout?.on('data', (d) => process.stdout.write('[npm] ' + d))
  installer.stderr?.on('data', (d) => process.stderr.write('[npm] ' + d))

  installer.on('error', (err) => {
    _status = 'error'
    _error = err.code === 'ENOENT'
      ? 'Node.js / npm not found — please install Node.js LTS'
      : `npm error: ${err.message}`
    console.error('[Metro]', _error)
  })

  installer.on('close', (code) => {
    if (code !== 0) {
      _status = 'error'
      _error = `npm install failed (exit ${code}). Check your internet connection.`
      return
    }
    spawnMetro(waiterDir)
  })
}

function spawnMetro(waiterDir) {
  _status = 'starting'
  _error = null
  console.log('[Metro] Starting Expo Metro bundler in:', waiterDir)

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
    // Some expo versions print "Metro waiting" or "Bundler is running"
    if (/Metro waiting|Bundler is running|Starting Metro|exp:\/\//.test(text)) {
      _status = 'running'
      clearPoller()
    }
  })

  metroProcess.stderr?.on('data', (data) => {
    const text = data.toString()
    process.stderr.write('[Metro] ' + text)
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
