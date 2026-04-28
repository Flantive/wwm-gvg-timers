import { useCallback, useEffect, useRef, useState } from 'react'

const initialTimers = [
  { id: 1, name: 'GvG Boss Spawn', duration: 300, remaining: 300, isRunning: false },
  { id: 2, name: 'Objective Capture', duration: 180, remaining: 180, isRunning: false },
  { id: 3, name: 'Buff / Buff Cooldown', duration: 90, remaining: 90, isRunning: false },
  { id: 4, name: 'Tower Push Timer', duration: 240, remaining: 240, isRunning: false },
]

function App() {
  const [timers, setTimers] = useState(initialTimers)
  const [serverUrl, setServerUrl] = useState('')
  const [syncError, setSyncError] = useState('')
  const pollingRef = useRef(null)

  const fetchTimers = useCallback(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/timers`, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Failed to fetch timers: ${response.status}`)
    }

    const payload = await response.json()
    if (!payload || !Array.isArray(payload.timers)) {
      throw new Error('Invalid timer payload')
    }

    setTimers(payload.timers)
    setSyncError('')
  }, [])

  useEffect(() => {
    let active = true

    const startPolling = async () => {
      try {
        const url = await window.api?.getServerUrl?.()
        if (!active) {
          return
        }

        if (!url) {
          setSyncError('Syncing error: timer server unavailable.')
          return
        }

        setServerUrl(url)
        await fetchTimers(url)

        pollingRef.current = setInterval(() => {
          fetchTimers(url).catch(() => {
            if (active) {
              setSyncError('Syncing error: failed to refresh timers.')
            }
          })
        }, 2000)
      } catch {
        if (active) {
          setSyncError('Syncing error: unable to connect to timer server.')
        }
      }
    }

    startPolling()

    return () => {
      active = false
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [fetchTimers])

  const restartTimer = useCallback(
    async (id) => {
      if (!serverUrl) {
        setSyncError('Syncing error: timer server unavailable.')
        return
      }

      try {
        const response = await fetch(`${serverUrl}/timers/${id}/reset`, {
          method: 'POST',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Reset failed: ${response.status}`)
        }

        await fetchTimers(serverUrl)
      } catch {
        setSyncError('Syncing error: failed to reset timer.')
      }
    },
    [fetchTimers, serverUrl]
  )

  const resetAllTimers = useCallback(async () => {
    if (!serverUrl) {
      setSyncError('Syncing error: timer server unavailable.')
      return
    }

    try {
      const response = await fetch(`${serverUrl}/timers/reset-all`, {
        method: 'POST',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Reset all failed: ${response.status}`)
      }

      const payload = await response.json()
      if (!payload || !Array.isArray(payload.timers)) {
        throw new Error('Invalid reset-all payload')
      }

      setTimers(payload.timers)
      setSyncError('')
    } catch {
      setSyncError('Syncing error: failed to reset all timers.')
    }
  }, [serverUrl])

  useEffect(() => {
    const removeResetListener = window.api?.onResetAllTimers?.(() => {
      resetAllTimers()
    })

    return () => {
      removeResetListener?.()
    }
  }, [resetAllTimers])

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <div className="w-[380px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-white select-none overflow-hidden">
      <div
        className="px-3 py-2 bg-black/90 flex items-center justify-between border-b border-white/10 cursor-move"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <h1 className="text-sm font-semibold tracking-wide">WWM GvG Timers</h1>
        <button
          onClick={() => window.api?.hideOverlay?.() || window.close()}
          className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          X
        </button>
      </div>

      {syncError ? (
        <div className="px-3 py-1 text-[11px] text-red-300 bg-red-950/30 border-b border-red-500/40">
          {syncError}
        </div>
      ) : null}

      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
        {timers.map((timer) => {
          const isReady =
            !timer.isRunning && (timer.remaining === 0 || timer.remaining === timer.duration)

          return (
            <div
              key={timer.id}
              className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <span className="flex-1 text-sm font-medium truncate">{timer.name}</span>
              <button
                onClick={() => restartTimer(timer.id)}
                className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                aria-label={`Reset and start ${timer.name}`}
                title="Reset and start"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-white/80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 3v4h4" />
                </svg>
              </button>
              <span
                className={`w-[88px] text-right font-mono text-2xl font-bold tabular-nums ${
                  isReady ? 'text-emerald-400' : 'text-sky-400'
                }`}
              >
                {isReady ? 'READY' : formatTime(timer.remaining)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="p-3 border-t border-white/10 flex justify-end" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={resetAllTimers}
          className="px-3 py-1.5 text-xs font-semibold text-red-400 bg-transparent border border-red-500/50 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          Reset All
        </button>
      </div>
    </div>
  )
}

export default App
