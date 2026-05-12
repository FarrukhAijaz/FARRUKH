/**
 * after-pack.js — electron-builder afterPack hook
 *
 * electron-builder silently strips node_modules from extraResources.
 * This hook copies waiter-mobile/node_modules into the packed output
 * AFTER electron-builder finishes so it lands in the final .deb / AppImage.
 */

const { cpSync, existsSync } = require('fs')
const { join } = require('path')

exports.default = async function (context) {
  const src = join(__dirname, '..', 'waiter-mobile', 'node_modules')
  const dest = join(context.appOutDir, 'resources', 'waiter-mobile', 'node_modules')

  if (!existsSync(src)) {
    console.warn('[afterPack] waiter-mobile/node_modules not found — skipping copy')
    return
  }

  if (existsSync(dest)) {
    console.log('[afterPack] node_modules already present — skipping copy')
    return
  }

  console.log(`[afterPack] Copying node_modules → ${dest}`)
  cpSync(src, dest, { recursive: true })
  console.log('[afterPack] node_modules copy done ✓')
}
