import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Wifi, Smartphone, Copy, Check, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import QRCode from 'qrcode'

const EXPO_PORT = 8081

function buildExpoUrl(apiUrl) {
  const ip = apiUrl.replace('http://', '').replace(/:.*$/, '')
  return `exp://${ip}:${EXPO_PORT}`
}

function extractIp(apiUrl) {
  return apiUrl.replace('http://', '').replace(/:.*$/, '')
}

const STATUS_UI = {
  stopped:    { color: 'bg-gray-400',                    label: 'Not started' },
  installing: { color: 'bg-amber-400 animate-pulse',     label: 'Installing dependencies (first run)…' },
  starting:   { color: 'bg-amber-400 animate-pulse',     label: 'Starting Metro bundler…' },
  running:    { color: 'bg-forest-500',                  label: 'Waiter server running ✓' },
  error:      { color: 'bg-red-500',                     label: 'Error' },
}

export default function WaiterConnectModal({ onClose }) {
  const [urls, setUrls] = useState([])
  const [selectedUrl, setSelectedUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metro, setMetro] = useState({ status: 'stopped', error: null })
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState('')
  const [logsCopied, setLogsCopied] = useState(false)
  const logsEndRef = useRef(null)
  const canvasRef = useRef(null)
  const pollRef = useRef(null)

  const drawQr = useCallback((apiUrl) => {
    if (!canvasRef.current || !apiUrl) return
    QRCode.toCanvas(canvasRef.current, buildExpoUrl(apiUrl), {
      width: 220, margin: 2,
      color: { dark: '#1a2e1a', light: '#f5f0e8' }
    }).catch((err) => console.error('[WaiterConnect] QR error:', err))
  }, [])

  const fetchUrls = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.network.getUrls()
      const isLan = (u) => /192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./.test(u)
      const sorted = [...list].sort((a, b) => (isLan(b) ? 1 : isLan(a) ? -1 : 0))
      setUrls(sorted)
      setSelectedUrl(sorted[0] || null)
    } catch (err) {
      console.error('[WaiterConnect] Failed to get URLs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const prevMetroStatus = useRef(null)

  // Poll Metro status every 2s
  useEffect(() => {
    const poll = async () => {
      try {
        const s = await window.api.metro.getStatus()
        setMetro(s)
        // When Metro transitions to running, re-fetch IPs and force QR redraw
        if (s.status === 'running' && prevMetroStatus.current !== 'running') {
          fetchUrls()
        }
        prevMetroStatus.current = s.status
      } catch {}
    }
    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollRef.current)
  }, [fetchUrls])

  // Poll logs every 2s when the panel is open
  useEffect(() => {
    if (!showLogs) return
    const fetchLogs = async () => {
      try {
        const text = await window.api.metro.getLogs()
        setLogs(text || '')
        // Auto-scroll to bottom
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30)
      } catch {}
    }
    fetchLogs()
    const id = setInterval(fetchLogs, 2000)
    return () => clearInterval(id)
  }, [showLogs])

  useEffect(() => { fetchUrls() }, [fetchUrls])

  useEffect(() => {
    if (loading || !selectedUrl || metro.status !== 'running') return
    const t = setTimeout(() => drawQr(selectedUrl), 50)
    return () => clearTimeout(t)
  }, [loading, selectedUrl, metro.status, drawQr])

  const handleCopy = async () => {
    if (!selectedUrl) return
    try {
      await navigator.clipboard.writeText(extractIp(selectedUrl))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* not available */ }
  }

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs)
      setLogsCopied(true)
      setTimeout(() => setLogsCopied(false), 2000)
    } catch {}
  }

  const handleRestart = async () => {
    try { await window.api.metro.restart() } catch {}
  }

  const ip = selectedUrl ? extractIp(selectedUrl) : ''
  const expoUrl = selectedUrl ? buildExpoUrl(selectedUrl) : ''
  const metroUi = STATUS_UI[metro.status] || STATUS_UI.stopped
  const metroReady = metro.status === 'running'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cream-100 rounded-2xl shadow-2xl w-[560px] max-w-[95vw] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-forest-700">
          <div className="flex items-center gap-3">
            <Smartphone size={22} className="text-cream-100" />
            <div>
              <h2 className="text-cream-100 font-bold text-lg leading-none">Waiter App Connect</h2>
              <p className="text-forest-300 text-xs mt-0.5">Connect your phone via Expo Go</p>
            </div>
          </div>
          <button onClick={onClose} className="text-forest-300 hover:text-cream-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Metro status bar */}
        <div className={`flex items-center justify-between px-6 py-2.5 ${
          metroReady ? 'bg-forest-600/15' : metro.status === 'error' ? 'bg-red-50' : 'bg-amber-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${metroUi.color}`} />
            <span className="text-xs font-semibold text-ink-200">{metroUi.label}</span>
            {metro.status === 'error' && metro.error && (
              <span className="text-xs text-red-600 ml-1">— {metro.error}</span>
            )}
          </div>
          {(metro.status === 'error' || metro.status === 'stopped') && (
            <button
              onClick={handleRestart}
              className="flex items-center gap-1 text-xs text-forest-700 font-semibold hover:underline"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-ink-200">
              <RefreshCw size={28} className="animate-spin opacity-40" />
              <p className="text-sm">Detecting network interfaces…</p>
            </div>
          ) : urls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-ink-200">
              <Wifi size={32} className="opacity-30" />
              <p className="text-sm text-center">No network interfaces found.<br/>Make sure this PC is connected to Wi-Fi.</p>
              <button onClick={fetchUrls} className="mt-2 px-4 py-2 rounded-lg bg-forest-600 text-cream-50 text-sm font-semibold hover:bg-forest-700 transition-colors">
                Retry
              </button>
            </div>
          ) : (
            <div className="flex gap-6">

              {/* QR — encodes exp://IP:8081 for Expo Go */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className={`relative p-3 rounded-xl border transition-all ${
                  metroReady ? 'bg-cream-200 border-cream-300' : 'bg-cream-200/50 border-cream-300/50'
                }`}>
                  {!metroReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-100/80 rounded-lg z-10 gap-2">
                      {metro.status === 'error'
                        ? <AlertCircle size={28} className="text-red-400" />
                        : <RefreshCw size={28} className="animate-spin text-amber-500" />
                      }
                      <span className="text-xs text-ink-200 font-medium text-center px-4">
                        {metro.status === 'error' ? 'Server error' : 'Waiting for server…'}
                      </span>
                    </div>
                  )}
                  <canvas ref={canvasRef} className={metroReady ? '' : 'opacity-30'} />
                </div>
                <p className="text-ink-200/50 text-[10px] font-mono text-center break-all max-w-[220px]">
                  {expoUrl}
                </p>
              </div>

              {/* Right panel */}
              <div className="flex-1 flex flex-col gap-4">

                <div className="bg-forest-600/10 border border-forest-600/20 rounded-xl px-4 py-3">
                  <p className="text-forest-700 text-xs font-bold mb-1">Step 1 — Open Expo Go</p>
                  <p className="text-ink-200 text-xs leading-relaxed">
                    Install <strong>Expo Go</strong> from the Play Store, then scan the QR on the left once the server is running.
                  </p>
                </div>

                <div>
                  <p className="text-forest-700 text-xs font-bold mb-2">Step 2 — Enter this IP in the app</p>
                  <div className="flex items-center gap-2 bg-ink-300 rounded-xl px-4 py-3">
                    <span className="text-cream-100 font-mono text-xl font-bold flex-1 select-all">{ip}</span>
                    <button onClick={handleCopy} title="Copy IP" className="shrink-0 text-cream-300 hover:text-cream-100 transition-colors">
                      {copied ? <Check size={18} className="text-forest-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-ink-200/50 text-xs mt-1">Type this on the Connect screen that appears in Expo Go</p>
                </div>

                {urls.length > 1 && (
                  <div>
                    <label className="text-ink-200 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                      Network Interface
                    </label>
                    <div className="flex flex-col gap-1">
                      {urls.map((url) => (
                        <button
                          key={url}
                          onClick={() => setSelectedUrl(url)}
                          className={`text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                            selectedUrl === url
                              ? 'bg-forest-600 text-cream-50 font-bold'
                              : 'bg-cream-200 text-ink-200 hover:bg-cream-300'
                          }`}
                        >
                          {url.replace('http://', '').replace(':3000', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-amber-800 text-xs font-semibold flex items-center gap-1.5 mb-0.5">
                    <Wifi size={11} /> Same Wi-Fi required
                  </p>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    Phone and PC must be on the <strong>same Wi-Fi network</strong>.
                  </p>
                </div>

                <button
                  onClick={fetchUrls}
                  className="flex items-center gap-2 justify-center px-4 py-2 rounded-lg bg-cream-200 text-ink-200 hover:bg-cream-300 transition-colors text-sm font-medium"
                >
                  <RefreshCw size={14} />
                  Refresh IPs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Live Logs panel ─────────────────────────────────────────── */}
        <div className="border-t border-cream-300">
          {/* Toggle header */}
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-3 hover:bg-cream-200/60 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-ink-200">
              <Terminal size={13} />
              Metro Logs
              {metro.status === 'error' && (
                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">ERROR</span>
              )}
            </span>
            {showLogs ? <ChevronUp size={14} className="text-ink-200/60" /> : <ChevronDown size={14} className="text-ink-200/60" />}
          </button>

          {showLogs && (
            <div className="px-4 pb-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-ink-200/50 font-mono">
                  ~/.config/farrukh/metro-debug.log
                </span>
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 text-[10px] text-ink-200 hover:text-ink-300 font-medium transition-colors"
                >
                  {logsCopied ? <Check size={11} className="text-forest-500" /> : <Copy size={11} />}
                  {logsCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Terminal box */}
              <div className="bg-[#0d1117] rounded-lg p-3 h-44 overflow-y-auto font-mono text-[10px] leading-relaxed">
                {logs ? (
                  logs.split('\n').map((line, i) => {
                    const isStderr = line.includes('[stderr]')
                    const isError  = /error|Error|Cannot|failed|Failed/i.test(line) && !line.includes('[stdout]')
                    const color = isError || isStderr
                      ? 'text-amber-400'
                      : line.includes('[Metro]') && /error|Error/i.test(line)
                      ? 'text-red-400'
                      : 'text-gray-300'
                    return (
                      <div key={i} className={color + ' whitespace-pre-wrap break-all'}>
                        {line}
                      </div>
                    )
                  })
                ) : (
                  <span className="text-gray-500">No logs yet — logs appear once Metro starts.</span>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
